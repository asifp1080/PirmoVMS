import { INotifierProvider, NotificationMessage, NotificationResult, NotificationProviderType } from '../types';
import * as sgMail from '@sendgrid/mail';

export interface SendGridConfig {
  apiKey: string;
  from: string;
  fromName?: string;
}

export class SendGridEmailProvider implements INotifierProvider {
  readonly name = 'sendgrid';
  readonly type = NotificationProviderType.EMAIL;
  
  constructor(private config: SendGridConfig) {
    sgMail.setApiKey(config.apiKey);
  }

  validateConfig(): boolean {
    return !!(
      this.config.apiKey &&
      this.config.from
    );
  }

  async send(message: NotificationMessage): Promise<NotificationResult> {
    try {
      if (!this.validateConfig()) {
        throw new Error('Invalid SendGrid configuration');
      }

      const msg = {
        to: message.to,
        from: {
          email: this.config.from,
          name: this.config.fromName || 'VMS Notifications',
        },
        subject: message.subject || 'Notification',
        text: message.text,
        html: message.html || message.text,
      };

      const result = await sgMail.send(msg);
      const messageId = result[0]?.headers?.['x-message-id'] || 'unknown';

      return {
        success: true,
        messageId,
        provider: this.name,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: this.name,
        timestamp: new Date(),
      };
    }
  }
}