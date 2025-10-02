import { Module, DynamicModule } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { NotificationService } from './services/notification.service';
import { WebhookService } from './services/webhook.service';
import { NotificationProcessor } from './processors/notification.processor';
import { TwilioSmsProvider } from './providers/twilio-sms.provider';
import { SendGridEmailProvider } from './providers/sendgrid-email.provider';
import { SlackChatProvider, TeamsChatProvider } from './providers/chat.providers';
import { NotificationConfig } from './types';

export interface NotificationModuleOptions {
  config: NotificationConfig;
  redis?: {
    host: string;
    port: number;
    password?: string;
  };
}

@Module({})
export class NotificationModule {
  static forRoot(options: NotificationModuleOptions): DynamicModule {
    return {
      module: NotificationModule,
      imports: [
        BullModule.forRoot({
          redis: options.redis || {
            host: 'localhost',
            port: 6379,
          },
        }),
        BullModule.registerQueue({
          name: 'notifications',
        }),
      ],
      providers: [
        {
          provide: 'NOTIFICATION_CONFIG',
          useValue: options.config,
        },
        {
          provide: NotificationService,
          useFactory: (config: NotificationConfig) => {
            const service = new NotificationService(null as any, config);
            
            // Register providers based on config
            if (config.providers.sms?.twilio) {
              service.registerProvider(new TwilioSmsProvider(config.providers.sms.twilio));
            }
            
            if (config.providers.email?.sendgrid) {
              service.registerProvider(new SendGridEmailProvider(config.providers.email.sendgrid));
            }
            
            if (config.providers.chat?.slack) {
              service.registerProvider(new SlackChatProvider(config.providers.chat.slack));
            }
            
            if (config.providers.chat?.teams) {
              service.registerProvider(new TeamsChatProvider(config.providers.chat.teams));
            }
            
            return service;
          },
          inject: ['NOTIFICATION_CONFIG'],
        },
        WebhookService,
        NotificationProcessor,
      ],
      exports: [NotificationService, WebhookService],
    };
  }

  static forRootAsync(options: {
    useFactory: (...args: any[]) => Promise<NotificationModuleOptions> | NotificationModuleOptions;
    inject?: any[];
  }): DynamicModule {
    return {
      module: NotificationModule,
      imports: [
        BullModule.forRoot({
          redis: {
            host: 'localhost',
            port: 6379,
          },
        }),
        BullModule.registerQueue({
          name: 'notifications',
        }),
      ],
      providers: [
        {
          provide: 'NOTIFICATION_OPTIONS',
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
        {
          provide: NotificationService,
          useFactory: (moduleOptions: NotificationModuleOptions) => {
            const service = new NotificationService(null as any, moduleOptions.config);
            
            // Register providers based on config
            if (moduleOptions.config.providers.sms?.twilio) {
              service.registerProvider(new TwilioSmsProvider(moduleOptions.config.providers.sms.twilio));
            }
            
            if (moduleOptions.config.providers.email?.sendgrid) {
              service.registerProvider(new SendGridEmailProvider(moduleOptions.config.providers.email.sendgrid));
            }
            
            if (moduleOptions.config.providers.chat?.slack) {
              service.registerProvider(new SlackChatProvider(moduleOptions.config.providers.chat.slack));
            }
            
            if (moduleOptions.config.providers.chat?.teams) {
              service.registerProvider(new TeamsChatProvider(moduleOptions.config.providers.chat.teams));
            }
            
            return service;
          },
          inject: ['NOTIFICATION_OPTIONS'],
        },
        WebhookService,
        NotificationProcessor,
      ],
      exports: [NotificationService, WebhookService],
    };
  }
}