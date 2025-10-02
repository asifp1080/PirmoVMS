import { INotifierProvider, NotificationMessage, NotificationResult, NotificationProviderType } from '../types';
import * as twilio from 'twilio';

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  from: string;
}

export class TwilioSmsProvider implements INotifierProvider {
  readonly name = 'twilio';
  readonly type = NotificationProviderType.SMS;
  
  private client: twilio.Twilio;
  
  constructor(private config: TwilioConfig) {
    this.client = twilio.default(config.accountSid, config.authToken);
  }

  validateConfig(): boolean {
    return !!(
      this.config.accountSid &&
      this.config.authToken &&
      this.config.from
    );
  }

  async send(message: NotificationMessage): Promise<NotificationResult> {
    try {
      if (!this.validateConfig()) {
        throw new Error('Invalid Twilio configuration');
      }

      const result = await this.client.messages.create({
        body: message.text,
        from: this.config.from,
        to: message.to,
      });

      return {
        success: true,
        messageId: result.sid,
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