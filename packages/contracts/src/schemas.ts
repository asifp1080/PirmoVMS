import { z } from 'zod'

// Enums
export const EmployeeRole = z.enum(['ADMIN', 'RECEPTIONIST', 'SECURITY', 'MANAGER'])
export const EmployeeStatus = z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED'])
export const VisitPurpose = z.enum(['MEETING', 'INTERVIEW', 'DELIVERY', 'GUEST', 'OTHER'])
export const VisitStatus = z.enum(['PENDING', 'CHECKED_IN', 'CHECKED_OUT', 'NO_SHOW'])
export const SubscriptionTier = z.enum(['BASIC', 'PROFESSIONAL', 'ENTERPRISE'])
export const SubscriptionStatus = z.enum(['ACTIVE', 'SUSPENDED', 'CANCELLED'])
export const NotificationType = z.enum(['EMAIL', 'SMS', 'SLACK', 'TEAMS'])
export const NotificationStatus = z.enum(['PENDING', 'SENT', 'FAILED', 'CANCELLED'])
export const AuditAction = z.enum(['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT'])
export const PIIAction = z.enum(['VIEW', 'CREATE', 'UPDATE', 'DELETE', 'EXPORT', 'SEARCH', 'DECRYPT'])
export const GDPRRequestType = z.enum(['EXPORT', 'DELETE', 'RECTIFICATION', 'PORTABILITY'])
export const GDPRRequestStatus = z.enum(['PENDING_VERIFICATION', 'VERIFIED', 'IN_PROGRESS', 'COMPLETED', 'REJECTED', 'EXPIRED'])

// Base schemas
export const BaseEntity = z.object({
  id: z.string(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  deleted_at: z.string().datetime().nullable().optional(),
})

// Organization
export const OrganizationSchema = BaseEntity.extend({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  domain: z.string().nullable().optional(),
  logo_url: z.string().url().nullable().optional(),
  website: z.string().url().nullable().optional(),
  industry: z.string().nullable().optional(),
  employee_count: z.number().int().positive().nullable().optional(),
  time_zone: z.string().default('UTC'),
  settings: z.record(z.any()).default({}),
  subscription_tier: SubscriptionTier.default('BASIC'),
  subscription_status: SubscriptionStatus.default('ACTIVE'),
  trial_ends_at: z.string().datetime().nullable().optional(),
})

export const CreateOrganizationSchema = OrganizationSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
  deleted_at: true,
})

export const UpdateOrganizationSchema = CreateOrganizationSchema.partial()

// Location
export const LocationSchema = BaseEntity.extend({
  org_id: z.string(),
  name: z.string().min(1).max(255),
  address: z.string().min(1),
  city: z.string().min(1),
  state: z.string().nullable().optional(),
  postal_code: z.string().nullable().optional(),
  country: z.string().default('US'),
  time_zone: z.string(),
  phone: z.string().nullable().optional(),
  capacity: z.number().int().positive().nullable().optional(),
  is_active: z.boolean().default(true),
  settings: z.record(z.any()).default({}),
})

export const CreateLocationSchema = LocationSchema.omit({
  id: true,
  org_id: true,
  created_at: true,
  updated_at: true,
  deleted_at: true,
})

export const UpdateLocationSchema = CreateLocationSchema.partial()

// Employee
export const EmployeeSchema = BaseEntity.extend({
  org_id: z.string(),
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  email: z.string().email(),
  role: EmployeeRole.default('RECEPTIONIST'),
  is_host: z.boolean().default(false),
  department: z.string().nullable().optional(),
  job_title: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  avatar_url: z.string().url().nullable().optional(),
  status: EmployeeStatus.default('ACTIVE'),
  last_login_at: z.string().datetime().nullable().optional(),
  location_id: z.string().nullable().optional(),
})

export const CreateEmployeeSchema = EmployeeSchema.omit({
  id: true,
  org_id: true,
  created_at: true,
  updated_at: true,
  deleted_at: true,
  last_login_at: true,
}).extend({
  password: z.string().min(8).optional(),
})

export const UpdateEmployeeSchema = CreateEmployeeSchema.partial()

// Visitor
export const VisitorSchema = BaseEntity.extend({
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  company: z.string().nullable().optional(),
  photo_url: z.string().url().nullable().optional(),
  preferred_language: z.string().default('en'),
  marketing_opt_in: z.boolean().default(false),
  notes: z.string().nullable().optional(),
})

export const CreateVisitorSchema = VisitorSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
  deleted_at: true,
})

export const UpdateVisitorSchema = CreateVisitorSchema.partial()

// Visit
export const VisitSchema = BaseEntity.extend({
  org_id: z.string(),
  location_id: z.string(),
  visitor_id: z.string(),
  host_id: z.string().nullable().optional(),
  purpose: VisitPurpose,
  status: VisitStatus.default('PENDING'),
  scheduled_start: z.string().datetime(),
  scheduled_end: z.string().datetime().nullable().optional(),
  check_in_time: z.string().datetime().nullable().optional(),
  check_out_time: z.string().datetime().nullable().optional(),
  badge_number: z.string().nullable().optional(),
  qr_code: z.string().nullable().optional(),
  photo_url: z.string().url().nullable().optional(),
  signature_url: z.string().url().nullable().optional(),
  notes: z.string().nullable().optional(),
  metadata: z.record(z.any()).default({}),
  created_by: z.string().nullable().optional(),
})

export const CreateVisitSchema = VisitSchema.omit({
  id: true,
  org_id: true,
  created_at: true,
  updated_at: true,
  deleted_at: true,
  status: true,
  check_in_time: true,
  check_out_time: true,
  badge_number: true,
  qr_code: true,
  photo_url: true,
  signature_url: true,
  created_by: true,
})

export const UpdateVisitSchema = CreateVisitSchema.partial()

// Agreement
export const AgreementSchema = BaseEntity.extend({
  org_id: z.string(),
  name: z.string().min(1).max(255),
  type: z.string(), // NDA, SAFETY, PRIVACY, CUSTOM
  content: z.string(),
  version: z.string().default('1.0'),
  is_required: z.boolean().default(false),
  is_active: z.boolean().default(true),
})

export const CreateAgreementSchema = AgreementSchema.omit({
  id: true,
  org_id: true,
  created_at: true,
  updated_at: true,
  deleted_at: true,
})

// Kiosk
export const KioskSchema = BaseEntity.extend({
  org_id: z.string(),
  location_id: z.string(),
  name: z.string().min(1).max(255),
  device_id: z.string(),
  status: z.string().default('OFFLINE'), // ONLINE, OFFLINE, MAINTENANCE
  version: z.string().nullable().optional(),
  last_heartbeat: z.string().datetime().nullable().optional(),
  settings: z.record(z.any()).default({}),
})

export const CreateKioskSchema = KioskSchema.omit({
  id: true,
  org_id: true,
  created_at: true,
  updated_at: true,
  deleted_at: true,
  last_heartbeat: true,
})

// Webhook
export const WebhookSchema = BaseEntity.extend({
  org_id: z.string(),
  url: z.string().url(),
  events: z.array(z.string()),
  secret: z.string(),
  is_active: z.boolean().default(true),
  last_success: z.string().datetime().nullable().optional(),
  last_failure: z.string().datetime().nullable().optional(),
  failure_count: z.number().int().min(0).default(0),
})

export const CreateWebhookSchema = WebhookSchema.omit({
  id: true,
  org_id: true,
  created_at: true,
  updated_at: true,
  deleted_at: true,
  secret: true,
  last_success: true,
  last_failure: true,
  failure_count: true,
})

// Authentication
export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  org_slug: z.string().optional(),
})

export const RefreshTokenSchema = z.object({
  refresh_token: z.string(),
})

export const LoginResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.number(),
  user: EmployeeSchema,
})

// Check-in/Check-out
export const CheckInSchema = z.object({
  photo_url: z.string().url().optional(),
  signature_url: z.string().url().optional(),
  agreements_signed: z.array(z.string()).optional(),
})

export const CheckOutSchema = z.object({
  notes: z.string().optional(),
})

// Analytics
export const AnalyticsQuerySchema = z.object({
  period: z.enum(['day', 'week', 'month', 'year']).default('month'),
  from_date: z.string().date().optional(),
  to_date: z.string().date().optional(),
  location_id: z.string().optional(),
})

export const VisitAnalyticsSchema = z.object({
  total_visits: z.number().int(),
  unique_visitors: z.number().int(),
  average_duration: z.number(),
  peak_hours: z.array(z.object({
    hour: z.number().int().min(0).max(23),
    count: z.number().int(),
  })),
  visits_by_purpose: z.array(z.object({
    purpose: VisitPurpose,
    count: z.number().int(),
  })),
  visits_by_location: z.array(z.object({
    location_id: z.string(),
    location_name: z.string(),
    count: z.number().int(),
  })),
  daily_counts: z.array(z.object({
    date: z.string().date(),
    count: z.number().int(),
  })),
})

// Export
export const ExportSchema = z.object({
  format: z.enum(['csv', 'pdf', 'json']),
  data_type: z.enum(['visits', 'visitors', 'analytics']),
  from_date: z.string().date().optional(),
  to_date: z.string().date().optional(),
  filters: z.record(z.any()).optional(),
})

// Pagination
export const PaginationQuerySchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
})

export const PaginationMetaSchema = z.object({
  total_count: z.number().int(),
  has_next: z.boolean(),
  has_previous: z.boolean(),
  next_cursor: z.string().optional(),
  previous_cursor: z.string().optional(),
})

// List responses
export const LocationListResponseSchema = z.object({
  data: z.array(LocationSchema),
  meta: PaginationMetaSchema,
})

export const EmployeeListResponseSchema = z.object({
  data: z.array(EmployeeSchema),
  meta: PaginationMetaSchema,
})

export const VisitorListResponseSchema = z.object({
  data: z.array(VisitorSchema),
  meta: PaginationMetaSchema,
})

export const VisitListResponseSchema = z.object({
  data: z.array(VisitSchema),
  meta: PaginationMetaSchema,
})

export const WebhookListResponseSchema = z.object({
  data: z.array(WebhookSchema),
  meta: PaginationMetaSchema,
})

// Error
export const ErrorSchema = z.object({
  error: z.string(),
  message: z.string(),
  details: z.record(z.any()).optional(),
})

// Type exports
export type Organization = z.infer<typeof OrganizationSchema>
export type CreateOrganization = z.infer<typeof CreateOrganizationSchema>
export type UpdateOrganization = z.infer<typeof UpdateOrganizationSchema>

export type Location = z.infer<typeof LocationSchema>
export type CreateLocation = z.infer<typeof CreateLocationSchema>
export type UpdateLocation = z.infer<typeof UpdateLocationSchema>

export type Employee = z.infer<typeof EmployeeSchema>
export type CreateEmployee = z.infer<typeof CreateEmployeeSchema>
export type UpdateEmployee = z.infer<typeof UpdateEmployeeSchema>

export type Visitor = z.infer<typeof VisitorSchema>
export type CreateVisitor = z.infer<typeof CreateVisitorSchema>
export type UpdateVisitor = z.infer<typeof UpdateVisitorSchema>

export type Visit = z.infer<typeof VisitSchema>
export type CreateVisit = z.infer<typeof CreateVisitSchema>
export type UpdateVisit = z.infer<typeof UpdateVisitSchema>

export type Agreement = z.infer<typeof AgreementSchema>
export type CreateAgreement = z.infer<typeof CreateAgreementSchema>

export type Kiosk = z.infer<typeof KioskSchema>
export type CreateKiosk = z.infer<typeof CreateKioskSchema>

export type Webhook = z.infer<typeof WebhookSchema>
export type CreateWebhook = z.infer<typeof CreateWebhookSchema>

export type Login = z.infer<typeof LoginSchema>
export type RefreshToken = z.infer<typeof RefreshTokenSchema>
export type LoginResponse = z.infer<typeof LoginResponseSchema>

export type CheckIn = z.infer<typeof CheckInSchema>
export type CheckOut = z.infer<typeof CheckOutSchema>

export type AnalyticsQuery = z.infer<typeof AnalyticsQuerySchema>
export type VisitAnalytics = z.infer<typeof VisitAnalyticsSchema>

export type Export = z.infer<typeof ExportSchema>

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>
export type PaginationMeta = z.infer<typeof PaginationMetaSchema>

export type LocationListResponse = z.infer<typeof LocationListResponseSchema>
export type EmployeeListResponse = z.infer<typeof EmployeeListResponseSchema>
export type VisitorListResponse = z.infer<typeof VisitorListResponseSchema>
export type VisitListResponse = z.infer<typeof VisitListResponseSchema>
export type WebhookListResponse = z.infer<typeof WebhookListResponseSchema>

export type ApiError = z.infer<typeof ErrorSchema>