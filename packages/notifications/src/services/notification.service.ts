import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { 
  INotifierProvider, 
  NotificationJob, 
  NotificationConfig, 
  NotificationEventType,
  NotificationProviderType,
  NotificationMessage,
  NotificationResult
} from '../types';
import { TemplateRegistry } from '../templates/template-registry';
import { RateLimiter } from './rate-limiter';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private providers: Map<string, INotifierProvider> = new Map();
  private templateRegistry: TemplateRegistry;
  private rateLimiter: RateLimiter;

  constructor(
    @InjectQueue('notifications') private notificationQueue: Queue,
    private config: NotificationConfig,
  ) {
    this.templateRegistry = new TemplateRegistry();
    this.rateLimiter = new RateLimiter(config.rateLimits);
  }

  registerProvider(provider: INotifierProvider): void {
    if (!provider.validateConfig()) {
      this.logger.warn(`Provider ${provider.name} has invalid configuration`);
      return;
    }
    
    this.providers.set(provider.name, provider);
    this.logger.log(`Registered notification provider: ${provider.name} (${provider.type})`);
  }

  async sendNotification(
    type: NotificationEventType,
    templateData: Record<string, any>,
    orgId: string,
    visitId?: string,
    visitorId?: string,
    scheduledAt?: Date,
  ): Promise<void> {
    // Check rate limits
    const rateLimitKey = visitorId || visitId || orgId;
    if (!await this.rateLimiter.checkLimit(rateLimitKey, type)) {
      this.logger.warn(`Rate limit exceeded for ${rateLimitKey}`);
      return;
    }

    const fallbackChain = this.config.fallbackChains[type] || [];
    if (fallbackChain.length === 0) {
      this.logger.warn(`No fallback chain configured for ${type}`);
      return;
    }

    const job: NotificationJob = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      message: { to: '', text: '' }, // Will be populated by template
      templateData,
      fallbackChain,
      currentProviderIndex: 0,
      retryCount: 0,
      maxRetries: this.config.retryConfig.maxRetries,
      orgId,
      visitId,
      visitorId,
      createdAt: new Date(),
      scheduledAt,
    };

    const delay = scheduledAt ? scheduledAt.getTime() - Date.now() : 0;
    
    await this.notificationQueue.add('send-notification', job, {
      delay: Math.max(0, delay),
      attempts: this.config.retryConfig.maxRetries + 1,
      backoff: {
        type: 'exponential',
        settings: {
          multiplier: this.config.retryConfig.backoffMultiplier,
          initial: this.config.retryConfig.initialDelayMs,
        },
      },
    });

    this.logger.log(`Queued notification job ${job.id} for ${type}`);
  }

  async processNotificationJob(job: NotificationJob): Promise<NotificationResult> {
    const { type, templateData, fallbackChain, currentProviderIndex } = job;

    if (currentProviderIndex >= fallbackChain.length) {
      throw new Error('All providers in fallback chain failed');
    }

    const providerType = fallbackChain[currentProviderIndex];
    const provider = this.findProviderByType(providerType);
    
    if (!provider) {
      this.logger.error(`No provider found for type ${providerType}`);
      // Try next provider in chain
      job.currentProviderIndex++;
      return this.processNotificationJob(job);
    }

    // Get template for this provider type
    const templates = this.templateRegistry.getTemplatesByType(type, providerType);
    const template = templates.find(t => t.isDefault) || templates[0];
    
    if (!template) {
      throw new Error(`No template found for ${type} and ${providerType}`);
    }

    // Render template
    const rendered = this.templateRegistry.renderTemplate(template.id, templateData);
    
    // Extract recipient from template data
    const recipient = this.extractRecipient(templateData, providerType);
    if (!recipient) {
      throw new Error(`No recipient found for ${providerType}`);
    }

    const message: NotificationMessage = {
      to: recipient,
      subject: rendered.subject,
      text: rendered.text,
      html: rendered.html,
      metadata: {
        jobId: job.id,
        type: job.type,
        orgId: job.orgId,
        visitId: job.visitId,
        visitorId: job.visitorId,
      },
    };

    try {
      const result = await provider.send(message);
      
      if (result.success) {
        this.logger.log(`Notification sent successfully via ${provider.name}: ${result.messageId}`);
        return result;
      } else {
        this.logger.warn(`Notification failed via ${provider.name}: ${result.error}`);
        // Try next provider in chain
        job.currentProviderIndex++;
        return this.processNotificationJob(job);
      }
    } catch (error) {
      this.logger.error(`Provider ${provider.name} threw error:`, error);
      // Try next provider in chain
      job.currentProviderIndex++;
      return this.processNotificationJob(job);
    }
  }

  private findProviderByType(type: NotificationProviderType): INotifierProvider | undefined {
    return Array.from(this.providers.values()).find(provider => provider.type === type);
  }

  private extractRecipient(templateData: Record<string, any>, providerType: NotificationProviderType): string | undefined {
    switch (providerType) {
      case NotificationProviderType.SMS:
        return templateData.host?.phone || templateData.visitor?.phone;
      case NotificationProviderType.EMAIL:
        return templateData.host?.email || templateData.visitor?.email;
      case NotificationProviderType.CHAT:
        return templateData.host?.slackId || templateData.host?.teamsId || '#general';
      default:
        return undefined;
    }
  }

  getTemplateRegistry(): TemplateRegistry {
    return this.templateRegistry;
  }

  getProviders(): INotifierProvider[] {
    return Array.from(this.providers.values());
  }
}