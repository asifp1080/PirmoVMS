import { z } from 'zod';

// Notification channel schemas
export const NotificationChannelSchema = z.object({
  id: z.string().cuid(),
  org_id: z.string().cuid(),
  type: z.enum(['SMS', 'EMAIL', 'SLACK', 'TEAMS']),
  provider_config: z.record(z.any()),
  is_default: z.boolean().default(false),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Provider-specific configuration schemas
export const SMSProviderConfigSchema = z.object({
  provider: z.enum(['twilio', 'aws_sns']),
  account_sid: z.string().optional(), // Twilio
  auth_token: z.string().optional(), // Twilio
  from_number: z.string(),
  region: z.string().optional(), // AWS SNS
});

export const EmailProviderConfigSchema = z.object({
  provider: z.enum(['sendgrid', 'aws_ses', 'smtp']),
  api_key: z.string().optional(), // SendGrid
  from_email: z.string().email(),
  from_name: z.string().optional(),
  region: z.string().optional(), // AWS SES
  smtp_host: z.string().optional(), // SMTP
  smtp_port: z.number().int().optional(), // SMTP
  smtp_username: z.string().optional(), // SMTP
  smtp_password: z.string().optional(), // SMTP
  smtp_secure: z.boolean().optional(), // SMTP
});

export const SlackProviderConfigSchema = z.object({
  webhook_url: z.string().url(),
  channel: z.string().optional(),
  username: z.string().optional(),
  icon_emoji: z.string().optional(),
});

export const TeamsProviderConfigSchema = z.object({
  webhook_url: z.string().url(),
  theme_color: z.string().optional(),
});

// Notification event schemas
export const NotificationEventSchema = z.object({
  id: z.string().cuid(),
  org_id: z.string().cuid(),
  visit_id: z.string().cuid().nullable(),
  type: z.enum(['HOST_ALERT', 'VISITOR_CONFIRMATION', 'CHECKOUT_ALERT']),
  channel_id: z.string().cuid(),
  payload: z.record(z.any()),
  status: z.enum(['SENT', 'FAILED', 'PENDING']),
  sent_at: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
});

// Notification payload schemas for different event types
export const HostAlertPayloadSchema = z.object({
  visitor: z.object({
    first_name: z.string(),
    last_name: z.string(),
    company: z.string().nullable(),
    email: z.string().email().nullable(),
    phone: z.string().nullable(),
    photo_url: z.string().url().nullable(),
  }),
  visit: z.object({
    id: z.string().cuid(),
    purpose: z.enum(['MEETING', 'INTERVIEW', 'DELIVERY', 'GUEST', 'OTHER']),
    check_in_time: z.string().datetime(),
    badge_number: z.string().nullable(),
    location_name: z.string(),
  }),
  host: z.object({
    first_name: z.string(),
    last_name: z.string(),
    email: z.string().email(),
    phone: z.string().nullable(),
  }),
});

export const VisitorConfirmationPayloadSchema = z.object({
  visitor: z.object({
    first_name: z.string(),
    last_name: z.string(),
    email: z.string().email().nullable(),
    phone: z.string().nullable(),
  }),
  visit: z.object({
    id: z.string().cuid(),
    purpose: z.enum(['MEETING', 'INTERVIEW', 'DELIVERY', 'GUEST', 'OTHER']),
    scheduled_start: z.string().datetime().nullable(),
    qr_code: z.string().nullable(),
    location_name: z.string(),
    location_address: z.record(z.any()).nullable(),
  }),
  host: z.object({
    first_name: z.string(),
    last_name: z.string(),
    email: z.string().email(),
  }).nullable(),
  organization: z.object({
    name: z.string(),
  }),
});

export const CheckoutAlertPayloadSchema = z.object({
  visitor: z.object({
    first_name: z.string(),
    last_name: z.string(),
    company: z.string().nullable(),
  }),
  visit: z.object({
    id: z.string().cuid(),
    check_in_time: z.string().datetime(),
    check_out_time: z.string().datetime(),
    duration_minutes: z.number().int(),
    location_name: z.string(),
  }),
  host: z.object({
    first_name: z.string(),
    last_name: z.string(),
    email: z.string().email(),
  }).nullable(),
});

// Request schemas for creating/updating notification channels
export const CreateNotificationChannelRequestSchema = z.object({
  type: z.enum(['SMS', 'EMAIL', 'SLACK', 'TEAMS']),
  provider_config: z.union([
    SMSProviderConfigSchema,
    EmailProviderConfigSchema,
    SlackProviderConfigSchema,
    TeamsProviderConfigSchema,
  ]),
  is_default: z.boolean().default(false),
});

export const UpdateNotificationChannelRequestSchema = CreateNotificationChannelRequestSchema.partial();

// Test notification request schema
export const TestNotificationRequestSchema = z.object({
  channel_id: z.string().cuid(),
  test_type: z.enum(['HOST_ALERT', 'VISITOR_CONFIRMATION', 'CHECKOUT_ALERT']),
  recipient: z.string(), // email, phone, or channel identifier
});

// Notification template schemas
export const NotificationTemplateSchema = z.object({
  id: z.string().cuid(),
  org_id: z.string().cuid(),
  type: z.enum(['HOST_ALERT', 'VISITOR_CONFIRMATION', 'CHECKOUT_ALERT']),
  channel_type: z.enum(['SMS', 'EMAIL', 'SLACK', 'TEAMS']),
  name: z.string().min(1).max(255),
  subject: z.string().max(255).optional(), // For email
  template: z.string().min(1),
  variables: z.array(z.string()).default([]),
  is_default: z.boolean().default(false),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const CreateNotificationTemplateRequestSchema = z.object({
  type: z.enum(['HOST_ALERT', 'VISITOR_CONFIRMATION', 'CHECKOUT_ALERT']),
  channel_type: z.enum(['SMS', 'EMAIL', 'SLACK', 'TEAMS']),
  name: z.string().min(1).max(255),
  subject: z.string().max(255).optional(),
  template: z.string().min(1),
  variables: z.array(z.string()).default([]),
  is_default: z.boolean().default(false),
});

// Notification preferences schema
export const NotificationPreferencesSchema = z.object({
  id: z.string().cuid(),
  org_id: z.string().cuid(),
  employee_id: z.string().cuid().nullable(),
  host_alerts: z.object({
    enabled: z.boolean().default(true),
    channels: z.array(z.enum(['SMS', 'EMAIL', 'SLACK', 'TEAMS'])).default(['EMAIL']),
    delay_minutes: z.number().int().min(0).max(60).default(0),
  }),
  visitor_confirmations: z.object({
    enabled: z.boolean().default(true),
    send_qr_code: z.boolean().default(true),
    send_directions: z.boolean().default(true),
  }),
  checkout_alerts: z.object({
    enabled: z.boolean().default(false),
    channels: z.array(z.enum(['SMS', 'EMAIL', 'SLACK', 'TEAMS'])).default(['EMAIL']),
  }),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Bulk notification request schema
export const BulkNotificationRequestSchema = z.object({
  type: z.enum(['HOST_ALERT', 'VISITOR_CONFIRMATION', 'CHECKOUT_ALERT']),
  recipients: z.array(z.object({
    channel_type: z.enum(['SMS', 'EMAIL', 'SLACK', 'TEAMS']),
    recipient: z.string(),
    payload: z.record(z.any()),
  })).min(1).max(100),
  scheduled_at: z.string().datetime().optional(),
});

// Type exports
export type NotificationChannel = z.infer<typeof NotificationChannelSchema>;
export type SMSProviderConfig = z.infer<typeof SMSProviderConfigSchema>;
export type EmailProviderConfig = z.infer<typeof EmailProviderConfigSchema>;
export type SlackProviderConfig = z.infer<typeof SlackProviderConfigSchema>;
export type TeamsProviderConfig = z.infer<typeof TeamsProviderConfigSchema>;
export type NotificationEvent = z.infer<typeof NotificationEventSchema>;
export type HostAlertPayload = z.infer<typeof HostAlertPayloadSchema>;
export type VisitorConfirmationPayload = z.infer<typeof VisitorConfirmationPayloadSchema>;
export type CheckoutAlertPayload = z.infer<typeof CheckoutAlertPayloadSchema>;
export type CreateNotificationChannelRequest = z.infer<typeof CreateNotificationChannelRequestSchema>;
export type UpdateNotificationChannelRequest = z.infer<typeof UpdateNotificationChannelRequestSchema>;
export type TestNotificationRequest = z.infer<typeof TestNotificationRequestSchema>;
export type NotificationTemplate = z.infer<typeof NotificationTemplateSchema>;
export type CreateNotificationTemplateRequest = z.infer<typeof CreateNotificationTemplateRequestSchema>;
export type NotificationPreferences = z.infer<typeof NotificationPreferencesSchema>;
export type BulkNotificationRequest = z.infer<typeof BulkNotificationRequestSchema>;