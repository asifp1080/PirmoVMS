import { INotifierProvider, NotificationMessage, NotificationResult, NotificationProviderType } from '../types';
import axios from 'axios';

export interface SlackConfig {
  webhookUrl: string;
  channel?: string;
  username?: string;
  iconEmoji?: string;
}

export class SlackChatProvider implements INotifierProvider {
  readonly name = 'slack';
  readonly type = NotificationProviderType.CHAT;
  
  constructor(private config: SlackConfig) {}

  validateConfig(): boolean {
    return !!(this.config.webhookUrl);
  }

  async send(message: NotificationMessage): Promise<NotificationResult> {
    try {
      if (!this.validateConfig()) {
        throw new Error('Invalid Slack configuration');
      }

      const payload = {
        text: message.text,
        channel: this.config.channel,
        username: this.config.username || 'VMS Bot',
        icon_emoji: this.config.iconEmoji || ':office:',
        attachments: message.html ? [{
          color: 'good',
          text: message.html,
          mrkdwn_in: ['text'],
        }] : undefined,
      };

      const response = await axios.post(this.config.webhookUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });

      return {
        success: response.status === 200,
        messageId: `slack_${Date.now()}`,
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

export interface TeamsConfig {
  webhookUrl: string;
  themeColor?: string;
}

export class TeamsChatProvider implements INotifierProvider {
  readonly name = 'teams';
  readonly type = NotificationProviderType.CHAT;
  
  constructor(private config: TeamsConfig) {}

  validateConfig(): boolean {
    return !!(this.config.webhookUrl);
  }

  async send(message: NotificationMessage): Promise<NotificationResult> {
    try {
      if (!this.validateConfig()) {
        throw new Error('Invalid Teams configuration');
      }

      const payload = {
        '@type': 'MessageCard',
        '@context': 'http://schema.org/extensions',
        themeColor: this.config.themeColor || '0076D7',
        summary: message.subject || 'VMS Notification',
        sections: [{
          activityTitle: message.subject || 'VMS Notification',
          activitySubtitle: 'Visitor Management System',
          text: message.text,
          markdown: true,
        }],
      };

      const response = await axios.post(this.config.webhookUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });

      return {
        success: response.status === 200,
        messageId: `teams_${Date.now()}`,
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