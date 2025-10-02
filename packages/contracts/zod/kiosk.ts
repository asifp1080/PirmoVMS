import { z } from 'zod';

// Kiosk device schemas
export const KioskDeviceSchema = z.object({
  id: z.string().cuid(),
  org_id: z.string().cuid(),
  location_id: z.string().cuid(),
  name: z.string().min(1).max(255),
  device_identifier: z.string().min(1).max(255),
  app_version: z.string().max(50).nullable(),
  last_seen_at: z.string().datetime().nullable(),
  settings: z.record(z.any()).nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Kiosk session schemas
export const KioskSessionRequestSchema = z.object({
  device_identifier: z.string().min(1).max(255),
  location_id: z.string().cuid(),
  app_version: z.string().max(50).optional(),
});

export const KioskSessionResponseSchema = z.object({
  session_token: z.string(),
  device: z.object({
    id: z.string().cuid(),
    name: z.string(),
    settings: z.record(z.any()).nullable(),
  }),
  location: z.object({
    id: z.string().cuid(),
    name: z.string(),
    time_zone: z.string(),
    settings: z.record(z.any()).nullable(),
  }),
  agreements: z.array(z.object({
    id: z.string().cuid(),
    name: z.string(),
    content_md: z.string(),
    is_required: z.boolean(),
    type: z.enum(['NDA', 'SAFETY', 'PRIVACY']),
  })),
});

// Kiosk visitor check-in flow schemas
export const KioskVisitorInputSchema = z.object({
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  email: z.string().email().max(255).optional(),
  phone: z.string().max(20).optional(),
  company: z.string().max(255).optional(),
  purpose: z.enum(['MEETING', 'INTERVIEW', 'DELIVERY', 'GUEST', 'OTHER']),
  host_employee_id: z.string().cuid().optional(),
  preferred_language: z.string().min(2).max(5).default('en'),
  marketing_opt_in: z.boolean().default(false),
  photo_capture: z.object({
    photo_url: z.string().url(),
    capture_timestamp: z.string().datetime(),
  }).optional(),
});

export const KioskAgreementSignatureSchema = z.object({
  agreement_id: z.string().cuid(),
  signer_name: z.string().min(1).max(200),
  signer_email: z.string().email().max(255),
  signature_blob_url: z.string().url().optional(),
  signed_at: z.string().datetime(),
});

export const KioskCheckInRequestSchema = z.object({
  visitor_data: KioskVisitorInputSchema,
  agreements: z.array(KioskAgreementSignatureSchema).default([]),
  metadata: z.object({
    kiosk_session_id: z.string().optional(),
    user_agent: z.string().optional(),
    ip_address: z.string().ip().optional(),
  }).optional(),
});

export const KioskCheckInResponseSchema = z.object({
  visit: z.object({
    id: z.string().cuid(),
    visitor: z.object({
      id: z.string().cuid(),
      first_name: z.string(),
      last_name: z.string(),
      company: z.string().nullable(),
      photo_url: z.string().url().nullable(),
    }),
    badge_number: z.string().nullable(),
    qr_code: z.string().nullable(),
    check_in_time: z.string().datetime(),
    host_employee: z.object({
      id: z.string().cuid(),
      first_name: z.string(),
      last_name: z.string(),
      email: z.string().email(),
    }).nullable(),
  }),
  badge_print_data: z.object({
    visitor_name: z.string(),
    company: z.string().nullable(),
    badge_number: z.string().nullable(),
    qr_code: z.string().nullable(),
    valid_until: z.string().datetime(),
    location_name: z.string(),
    photo_url: z.string().url().nullable(),
  }).optional(),
  notifications_sent: z.array(z.object({
    type: z.enum(['HOST_ALERT', 'VISITOR_CONFIRMATION']),
    recipient: z.string(),
    status: z.enum(['SENT', 'FAILED', 'PENDING']),
  })).default([]),
});

// Kiosk check-out schemas
export const KioskCheckOutRequestSchema = z.object({
  visit_id: z.string().cuid().optional(),
  visitor_identifier: z.object({
    email: z.string().email(),
    phone: z.string(),
  }).partial().refine(
    (data) => data.email || data.phone,
    { message: "Either email or phone must be provided" }
  ).optional(),
  badge_number: z.string().optional(),
  qr_code: z.string().optional(),
}).refine(
  (data) => data.visit_id || data.visitor_identifier || data.badge_number || data.qr_code,
  { message: "At least one identifier must be provided" }
);

export const KioskCheckOutResponseSchema = z.object({
  visit: z.object({
    id: z.string().cuid(),
    visitor: z.object({
      first_name: z.string(),
      last_name: z.string(),
      company: z.string().nullable(),
    }),
    check_out_time: z.string().datetime(),
    duration_minutes: z.number().int().positive(),
  }),
  receipt: z.object({
    visit_summary: z.string(),
    check_in_time: z.string().datetime(),
    check_out_time: z.string().datetime(),
    duration: z.string(),
    location_name: z.string(),
  }).optional(),
});

// Kiosk configuration schemas
export const KioskSettingsSchema = z.object({
  ui: z.object({
    theme: z.enum(['light', 'dark', 'auto']).default('light'),
    logo_url: z.string().url().optional(),
    welcome_message: z.string().max(500).optional(),
    language_options: z.array(z.string().min(2).max(5)).default(['en']),
    show_company_field: z.boolean().default(true),
    show_phone_field: z.boolean().default(true),
    require_photo: z.boolean().default(true),
    require_signature: z.boolean().default(false),
  }),
  hardware: z.object({
    camera_enabled: z.boolean().default(true),
    printer_enabled: z.boolean().default(false),
    printer_config: z.object({
      printer_type: z.enum(['thermal', 'inkjet', 'laser']).optional(),
      paper_size: z.enum(['4x6', '2x3', 'letter']).optional(),
      print_logo: z.boolean().default(true),
    }).optional(),
    scanner_enabled: z.boolean().default(false),
  }),
  security: z.object({
    session_timeout_minutes: z.number().int().min(1).max(60).default(30),
    max_failed_attempts: z.number().int().min(1).max(10).default(3),
    require_host_approval: z.boolean().default(false),
    allowed_purposes: z.array(z.enum(['MEETING', 'INTERVIEW', 'DELIVERY', 'GUEST', 'OTHER'])).default(['MEETING', 'INTERVIEW', 'DELIVERY', 'GUEST', 'OTHER']),
  }),
  notifications: z.object({
    host_notification_enabled: z.boolean().default(true),
    visitor_confirmation_enabled: z.boolean().default(true),
    notification_delay_seconds: z.number().int().min(0).max(300).default(0),
  }),
});

// Kiosk heartbeat and status schemas
export const KioskHeartbeatSchema = z.object({
  device_identifier: z.string(),
  app_version: z.string().optional(),
  status: z.enum(['online', 'offline', 'maintenance']),
  last_activity: z.string().datetime(),
  system_info: z.object({
    os_version: z.string().optional(),
    memory_usage: z.number().min(0).max(100).optional(),
    storage_usage: z.number().min(0).max(100).optional(),
    network_status: z.enum(['connected', 'disconnected', 'limited']).optional(),
  }).optional(),
});

// Type exports
export type KioskDevice = z.infer<typeof KioskDeviceSchema>;
export type KioskSessionRequest = z.infer<typeof KioskSessionRequestSchema>;
export type KioskSessionResponse = z.infer<typeof KioskSessionResponseSchema>;
export type KioskVisitorInput = z.infer<typeof KioskVisitorInputSchema>;
export type KioskAgreementSignature = z.infer<typeof KioskAgreementSignatureSchema>;
export type KioskCheckInRequest = z.infer<typeof KioskCheckInRequestSchema>;
export type KioskCheckInResponse = z.infer<typeof KioskCheckInResponseSchema>;
export type KioskCheckOutRequest = z.infer<typeof KioskCheckOutRequestSchema>;
export type KioskCheckOutResponse = z.infer<typeof KioskCheckOutResponseSchema>;
export type KioskSettings = z.infer<typeof KioskSettingsSchema>;
export type KioskHeartbeat = z.infer<typeof KioskHeartbeatSchema>;