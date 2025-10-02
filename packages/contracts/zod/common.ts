import { z } from 'zod';

// Base schemas
export const PaginationMetaSchema = z.object({
  has_next: z.boolean(),
  next_cursor: z.string().nullable(),
  total_count: z.number().int().nullable(),
});

export const ErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.any()).optional(),
  }),
});

// Enums
export const EmployeeRoleSchema = z.enum(['ADMIN', 'RECEPTIONIST', 'SECURITY', 'MANAGER']);
export const EmployeeStatusSchema = z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']);
export const VisitPurposeSchema = z.enum(['MEETING', 'INTERVIEW', 'DELIVERY', 'GUEST', 'OTHER']);
export const VisitStatusSchema = z.enum(['PRE_REGISTERED', 'CHECKED_IN', 'CHECKED_OUT', 'NO_SHOW']);
export const AgreementTypeSchema = z.enum(['NDA', 'SAFETY', 'PRIVACY']);
export const OrganizationPlanSchema = z.enum(['STARTER', 'PROFESSIONAL', 'ENTERPRISE']);

// Core entity schemas
export const OrganizationSchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  plan: OrganizationPlanSchema,
  settings: z.record(z.any()).nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const LocationSchema = z.object({
  id: z.string().cuid(),
  org_id: z.string().cuid(),
  name: z.string().min(1).max(255),
  time_zone: z.string().min(1),
  address: z.record(z.any()).nullable(),
  settings: z.record(z.any()).nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const EmployeeSchema = z.object({
  id: z.string().cuid(),
  org_id: z.string().cuid(),
  location_id: z.string().cuid().nullable(),
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  email: z.string().email().max(255),
  phone: z.string().max(20).nullable(),
  role: EmployeeRoleSchema,
  is_host: z.boolean(),
  status: EmployeeStatusSchema,
  avatar_url: z.string().url().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const VisitorSchema = z.object({
  id: z.string().cuid(),
  org_id: z.string().cuid(),
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  email: z.string().email().max(255).nullable(),
  phone: z.string().max(20).nullable(),
  company: z.string().max(255).nullable(),
  photo_url: z.string().url().nullable(),
  preferred_language: z.string().min(2).max(5).default('en'),
  notes: z.string().max(1000).nullable(),
  marketing_opt_in: z.boolean().default(false),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const VisitSchema = z.object({
  id: z.string().cuid(),
  org_id: z.string().cuid(),
  location_id: z.string().cuid(),
  visitor_id: z.string().cuid(),
  host_employee_id: z.string().cuid().nullable(),
  purpose: VisitPurposeSchema,
  pre_registered: z.boolean().default(false),
  scheduled_start: z.string().datetime().nullable(),
  check_in_time: z.string().datetime().nullable(),
  check_out_time: z.string().datetime().nullable(),
  status: VisitStatusSchema,
  badge_number: z.string().max(50).nullable(),
  qr_code: z.string().max(255).nullable(),
  metadata: z.record(z.any()).nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  // Relations
  visitor: VisitorSchema.optional(),
  host_employee: EmployeeSchema.nullable().optional(),
  location: LocationSchema.optional(),
});

export const AgreementSchema = z.object({
  id: z.string().cuid(),
  org_id: z.string().cuid(),
  name: z.string().min(1).max(255),
  version: z.string().min(1).max(20).default('1.0'),
  content_md: z.string().min(1),
  is_required: z.boolean().default(true),
  type: AgreementTypeSchema,
  locales: z.record(z.any()).nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Request schemas
export const CreateLocationRequestSchema = z.object({
  name: z.string().min(1).max(255),
  time_zone: z.string().min(1).default('UTC'),
  address: z.record(z.any()).optional(),
  settings: z.record(z.any()).optional(),
});

export const UpdateLocationRequestSchema = CreateLocationRequestSchema.partial();

export const CreateEmployeeRequestSchema = z.object({
  location_id: z.string().cuid().nullable(),
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  email: z.string().email().max(255),
  phone: z.string().max(20).nullable(),
  role: EmployeeRoleSchema.default('RECEPTIONIST'),
  is_host: z.boolean().default(false),
  avatar_url: z.string().url().nullable(),
});

export const UpdateEmployeeRequestSchema = CreateEmployeeRequestSchema.partial();

export const CreateVisitorRequestSchema = z.object({
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  email: z.string().email().max(255).nullable(),
  phone: z.string().max(20).nullable(),
  company: z.string().max(255).nullable(),
  preferred_language: z.string().min(2).max(5).default('en'),
  notes: z.string().max(1000).nullable(),
  marketing_opt_in: z.boolean().default(false),
});

export const UpdateVisitorRequestSchema = CreateVisitorRequestSchema.partial();

export const CreateVisitRequestSchema = z.object({
  location_id: z.string().cuid(),
  visitor_id: z.string().cuid(),
  host_employee_id: z.string().cuid().nullable(),
  purpose: VisitPurposeSchema.default('MEETING'),
  pre_registered: z.boolean().default(false),
  scheduled_start: z.string().datetime().nullable(),
  metadata: z.record(z.any()).optional(),
});

export const UpdateVisitRequestSchema = CreateVisitRequestSchema.partial();

export const CheckInRequestSchema = z.object({
  kiosk_device_id: z.string().cuid().nullable(),
  badge_number: z.string().max(50).nullable(),
  photo_url: z.string().url().nullable(),
  agreements: z.array(z.object({
    agreement_id: z.string().cuid(),
    signature_blob_url: z.string().url().nullable(),
  })).default([]),
});

export const CheckOutRequestSchema = z.object({
  notes: z.string().max(1000).nullable(),
});

// Response schemas
export const LocationListResponseSchema = z.object({
  data: z.array(LocationSchema),
  meta: PaginationMetaSchema,
});

export const EmployeeListResponseSchema = z.object({
  data: z.array(EmployeeSchema),
  meta: PaginationMetaSchema,
});

export const VisitorListResponseSchema = z.object({
  data: z.array(VisitorSchema),
  meta: PaginationMetaSchema,
});

export const VisitListResponseSchema = z.object({
  data: z.array(VisitSchema),
  meta: PaginationMetaSchema,
});

// Query parameter schemas
export const PaginationQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const EmployeeQuerySchema = PaginationQuerySchema.extend({
  role: EmployeeRoleSchema.optional(),
  is_host: z.coerce.boolean().optional(),
  location_id: z.string().cuid().optional(),
});

export const VisitorQuerySchema = PaginationQuerySchema.extend({
  search: z.string().max(255).optional(),
});

export const VisitQuerySchema = PaginationQuerySchema.extend({
  status: VisitStatusSchema.optional(),
  location_id: z.string().cuid().optional(),
  visitor_id: z.string().cuid().optional(),
  host_employee_id: z.string().cuid().optional(),
  from_date: z.string().datetime().optional(),
  to_date: z.string().datetime().optional(),
});

// Type exports
export type Organization = z.infer<typeof OrganizationSchema>;
export type Location = z.infer<typeof LocationSchema>;
export type Employee = z.infer<typeof EmployeeSchema>;
export type Visitor = z.infer<typeof VisitorSchema>;
export type Visit = z.infer<typeof VisitSchema>;
export type Agreement = z.infer<typeof AgreementSchema>;

export type CreateLocationRequest = z.infer<typeof CreateLocationRequestSchema>;
export type UpdateLocationRequest = z.infer<typeof UpdateLocationRequestSchema>;
export type CreateEmployeeRequest = z.infer<typeof CreateEmployeeRequestSchema>;
export type UpdateEmployeeRequest = z.infer<typeof UpdateEmployeeRequestSchema>;
export type CreateVisitorRequest = z.infer<typeof CreateVisitorRequestSchema>;
export type UpdateVisitorRequest = z.infer<typeof UpdateVisitorRequestSchema>;
export type CreateVisitRequest = z.infer<typeof CreateVisitRequestSchema>;
export type UpdateVisitRequest = z.infer<typeof UpdateVisitRequestSchema>;
export type CheckInRequest = z.infer<typeof CheckInRequestSchema>;
export type CheckOutRequest = z.infer<typeof CheckOutRequestSchema>;

export type LocationListResponse = z.infer<typeof LocationListResponseSchema>;
export type EmployeeListResponse = z.infer<typeof EmployeeListResponseSchema>;
export type VisitorListResponse = z.infer<typeof VisitorListResponseSchema>;
export type VisitListResponse = z.infer<typeof VisitListResponseSchema>;

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;
export type EmployeeQuery = z.infer<typeof EmployeeQuerySchema>;
export type VisitorQuery = z.infer<typeof VisitorQuerySchema>;
export type VisitQuery = z.infer<typeof VisitQuerySchema>;

export type EmployeeRole = z.infer<typeof EmployeeRoleSchema>;
export type EmployeeStatus = z.infer<typeof EmployeeStatusSchema>;
export type VisitPurpose = z.infer<typeof VisitPurposeSchema>;
export type VisitStatus = z.infer<typeof VisitStatusSchema>;
export type AgreementType = z.infer<typeof AgreementTypeSchema>;
export type OrganizationPlan = z.infer<typeof OrganizationPlanSchema>;