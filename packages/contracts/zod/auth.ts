import { z } from 'zod';

// Authentication schemas
export const LoginRequestSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(255),
  org_slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/).optional(),
});

export const RefreshTokenRequestSchema = z.object({
  refresh_token: z.string().min(1),
});

export const AuthResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.number().int().positive(),
  user: z.object({
    id: z.string().cuid(),
    org_id: z.string().cuid(),
    first_name: z.string(),
    last_name: z.string(),
    email: z.string().email(),
    role: z.enum(['ADMIN', 'RECEPTIONIST', 'SECURITY', 'MANAGER']),
    is_host: z.boolean(),
    avatar_url: z.string().url().nullable(),
  }),
});

// SSO schemas (placeholder for future implementation)
export const SAMLConfigSchema = z.object({
  entity_id: z.string().url(),
  sso_url: z.string().url(),
  certificate: z.string(),
  attribute_mapping: z.object({
    email: z.string().default('email'),
    first_name: z.string().default('firstName'),
    last_name: z.string().default('lastName'),
    role: z.string().default('role'),
  }),
});

export const OIDCConfigSchema = z.object({
  issuer: z.string().url(),
  client_id: z.string(),
  client_secret: z.string(),
  redirect_uri: z.string().url(),
  scopes: z.array(z.string()).default(['openid', 'email', 'profile']),
});

// JWT payload schema
export const JWTPayloadSchema = z.object({
  sub: z.string().cuid(), // user id
  org_id: z.string().cuid(),
  role: z.enum(['ADMIN', 'RECEPTIONIST', 'SECURITY', 'MANAGER']),
  is_host: z.boolean(),
  iat: z.number().int(),
  exp: z.number().int(),
  type: z.enum(['access', 'refresh']),
});

// Password reset schemas
export const ForgotPasswordRequestSchema = z.object({
  email: z.string().email().max(255),
  org_slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/).optional(),
});

export const ResetPasswordRequestSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(255),
  confirm_password: z.string().min(8).max(255),
}).refine((data) => data.password === data.confirm_password, {
  message: "Passwords don't match",
  path: ["confirm_password"],
});

// Change password schema
export const ChangePasswordRequestSchema = z.object({
  current_password: z.string().min(1),
  new_password: z.string().min(8).max(255),
  confirm_password: z.string().min(8).max(255),
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Passwords don't match",
  path: ["confirm_password"],
});

// Type exports
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type RefreshTokenRequest = z.infer<typeof RefreshTokenRequestSchema>;
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
export type SAMLConfig = z.infer<typeof SAMLConfigSchema>;
export type OIDCConfig = z.infer<typeof OIDCConfigSchema>;
export type JWTPayload = z.infer<typeof JWTPayloadSchema>;
export type ForgotPasswordRequest = z.infer<typeof ForgotPasswordRequestSchema>;
export type ResetPasswordRequest = z.infer<typeof ResetPasswordRequestSchema>;
export type ChangePasswordRequest = z.infer<typeof ChangePasswordRequestSchema>;