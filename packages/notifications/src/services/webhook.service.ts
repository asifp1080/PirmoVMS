import { Injectable, Logger } from '@nestjs/common';
import { WebhookConfig, WebhookPayload } from '../types';
import * as crypto from 'crypto';
import axios from 'axios';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);
  private webhooks: Map<string, WebhookConfig> = new Map();
  private nonceStore: Set<string> = new Set();
  private readonly nonceExpiry = 5 * 60 * 1000; // 5 minutes

  constructor() {
    // Cleanup expired nonces periodically
    setInterval(() => this.cleanupNonces(), 60 * 1000); // Every minute
  }

  registerWebhook(id: string, config: WebhookConfig): void {
    this.webhooks.set(id, config);
    this.logger.log(`Registered webhook: ${id} -> ${config.url}`);
  }

  unregisterWebhook(id: string): void {
    this.webhooks.delete(id);
    this.logger.log(`Unregistered webhook: ${id}`);
  }

  async sendWebhook(
    event: string,
    data: Record<string, any>,
    orgId: string,
    webhookIds?: string[],
  ): Promise<void> {
    const targetWebhooks = webhookIds 
      ? Array.from(this.webhooks.entries()).filter(([id]) => webhookIds.includes(id))
      : Array.from(this.webhooks.entries());

    const payload: WebhookPayload = {
      event,
      data,
      timestamp: new Date().toISOString(),
      orgId,
      nonce: this.generateNonce(),
    };

    const promises = targetWebhooks
      .filter(([, config]) => config.isActive && config.events.includes(event))
      .map(([id, config]) => this.sendToWebhook(id, config, payload));

    await Promise.allSettled(promises);
  }

  private async sendToWebhook(
    id: string,
    config: WebhookConfig,
    payload: WebhookPayload,
    attempt: number = 1,
  ): Promise<void> {
    try {
      const signature = this.generateSignature(payload, config.secret);
      
      const response = await axios.post(config.url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-VMS-Signature': signature,
          'X-VMS-Event': payload.event,
          'X-VMS-Timestamp': payload.timestamp,
          'X-VMS-Nonce': payload.nonce,
          'User-Agent': 'VMS-Webhook/1.0',
        },
        timeout: 30000,
        validateStatus: (status) => status >= 200 && status < 300,
      });

      this.logger.log(`Webhook ${id} sent successfully (attempt ${attempt}): ${response.status}`);
    } catch (error) {
      this.logger.error(`Webhook ${id} failed (attempt ${attempt}):`, error);

      // Retry with exponential backoff
      if (attempt <= config.retryConfig.maxRetries) {
        const delay = config.retryConfig.initialDelayMs * Math.pow(config.retryConfig.backoffMultiplier, attempt - 1);
        
        setTimeout(() => {
          this.sendToWebhook(id, config, payload, attempt + 1);
        }, delay);
        
        this.logger.log(`Webhook ${id} will retry in ${delay}ms (attempt ${attempt + 1})`);
      } else {
        this.logger.error(`Webhook ${id} failed after ${config.retryConfig.maxRetries} retries`);
      }
    }
  }

  validateWebhookSignature(
    payload: string,
    signature: string,
    secret: string,
    nonce?: string,
  ): boolean {
    try {
      // Check nonce for replay protection
      if (nonce) {
        if (this.nonceStore.has(nonce)) {
          this.logger.warn(`Webhook replay attempt detected: ${nonce}`);
          return false;
        }
        this.nonceStore.add(nonce);
      }

      const expectedSignature = this.generateSignature(payload, secret);
      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } catch (error) {
      this.logger.error('Webhook signature validation error:', error);
      return false;
    }
  }

  private generateSignature(payload: WebhookPayload | string, secret: string): string {
    const data = typeof payload === 'string' ? payload : JSON.stringify(payload);
    return crypto
      .createHmac('sha256', secret)
      .update(data, 'utf8')
      .digest('hex');
  }

  private generateNonce(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  private cleanupNonces(): void {
    // In a real implementation, you'd track nonce timestamps
    // For simplicity, we'll clear all nonces periodically
    if (this.nonceStore.size > 10000) {
      this.nonceStore.clear();
      this.logger.debug('Cleared nonce store');
    }
  }

  getWebhooks(): Map<string, WebhookConfig> {
    return new Map(this.webhooks);
  }

  testWebhook(id: string): Promise<void> {
    const config = this.webhooks.get(id);
    if (!config) {
      throw new Error(`Webhook not found: ${id}`);
    }

    const testPayload: WebhookPayload = {
      event: 'webhook.test',
      data: {
        message: 'This is a test webhook',
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
      orgId: 'test',
      nonce: this.generateNonce(),
    };

    return this.sendToWebhook(id, config, testPayload);
  }
}