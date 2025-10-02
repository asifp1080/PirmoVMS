export interface NotificationMessage {
  to: string;
  subject?: string;
  text: string;
  html?: string;
  metadata?: Record<string, any>;
}

export interface NotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider: string;
  timestamp: Date;
}

export interface INotifierProvider {
  readonly name: string;
  readonly type: NotificationProviderType;
  send(message: NotificationMessage): Promise<NotificationResult>;
  validateConfig(): boolean;
}

export enum NotificationProviderType {
  SMS = 'SMS',
  EMAIL = 'EMAIL',
  CHAT = 'CHAT',
}

export enum NotificationEventType {
  HOST_ALERT = 'HOST_ALERT',
  VISITOR_CONFIRMATION = 'VISITOR_CONFIRMATION',
  CHECKOUT_ALERT = 'CHECKOUT_ALERT',
}

export interface NotificationTemplate {
  id: string;
  name: string;
  type: NotificationEventType;
  providerType: NotificationProviderType;
  subject?: string;
  textTemplate: string;
  htmlTemplate?: string;
  variables: string[];
  isDefault: boolean;
}

export interface NotificationConfig {
  providers: {
    sms?: {
      twilio?: {
        accountSid: string;
        authToken: string;
        from: string;
      };
    };
    email?: {
      sendgrid?: {
        apiKey: string;
        from: string;
        fromName?: string;
      };
    };
    chat?: {
      slack?: {
        webhookUrl: string;
        channel?: string;
        username?: string;
      };
      teams?: {
        webhookUrl: string;
        themeColor?: string;
      };
    };
  };
  fallbackChains: {
    [key in NotificationEventType]: NotificationProviderType[];
  };
  rateLimits: {
    perVisitor: {
      maxPerHour: number;
      maxPerDay: number;
    };
    perVisit: {
      maxPerVisit: number;
    };
  };
  retryConfig: {
    maxRetries: number;
    backoffMultiplier: number;
    initialDelayMs: number;
  };
}

export interface NotificationJob {
  id: string;
  type: NotificationEventType;
  message: NotificationMessage;
  templateData: Record<string, any>;
  fallbackChain: NotificationProviderType[];
  currentProviderIndex: number;
  retryCount: number;
  maxRetries: number;
  orgId: string;
  visitId?: string;
  visitorId?: string;
  createdAt: Date;
  scheduledAt?: Date;
}

export interface WebhookPayload {
  event: string;
  data: Record<string, any>;
  timestamp: string;
  orgId: string;
  nonce: string;
}

export interface WebhookConfig {
  url: string;
  secret: string;
  events: string[];
  isActive: boolean;
  retryConfig: {
    maxRetries: number;
    backoffMultiplier: number;
    initialDelayMs: number;
  };
}