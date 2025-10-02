import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { NotificationJob } from '../types';
import { NotificationService } from '../services/notification.service';

@Processor('notifications')
export class NotificationProcessor {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(private notificationService: NotificationService) {}

  @Process('send-notification')
  async handleSendNotification(job: Job<NotificationJob>) {
    this.logger.log(`Processing notification job ${job.data.id}`);
    
    try {
      const result = await this.notificationService.processNotificationJob(job.data);
      
      if (result.success) {
        this.logger.log(`Notification job ${job.data.id} completed successfully`);
        return result;
      } else {
        throw new Error(`Notification failed: ${result.error}`);
      }
    } catch (error) {
      this.logger.error(`Notification job ${job.data.id} failed:`, error);
      throw error; // This will trigger Bull's retry mechanism
    }
  }

  @Process('webhook-notification')
  async handleWebhookNotification(job: Job<any>) {
    this.logger.log(`Processing webhook notification job ${job.id}`);
    
    try {
      // Webhook processing logic would go here
      // This is handled by WebhookService
      return { success: true };
    } catch (error) {
      this.logger.error(`Webhook notification job ${job.id} failed:`, error);
      throw error;
    }
  }
}