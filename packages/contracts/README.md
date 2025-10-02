# Visitor Management System - Contracts Package

This package contains the shared contracts, schemas, and database models for the Visitor Management System.

## Structure

```
packages/contracts/
├── prisma/
│   └── schema.prisma          # Database schema with multi-tenancy
├── openapi/
│   └── openapi.yaml          # OpenAPI 3.1 specification
├── zod/
│   ├── common.ts             # Core entity schemas
│   ├── auth.ts               # Authentication schemas
│   ├── kiosk.ts              # Kiosk-specific schemas
│   ├── notifications.ts      # Notification schemas
│   └── index.ts              # Barrel exports
├── seed/
│   └── seed.ts               # Database seed script
└── package.json
```

## Features

### Database Schema
- **Multi-tenant**: All tables include `org_id` for tenant isolation
- **Soft delete**: `deleted_at` timestamp for soft deletion
- **Audit trail**: `created_by`, `updated_by`, and dedicated `audit_logs` table
- **Encrypted PII**: Email and phone fields use column-level encryption
- **Comprehensive indexing**: Optimized for common query patterns

### API Contracts
- **OpenAPI 3.1**: Complete API specification with examples
- **Zod validation**: Type-safe request/response validation
- **Cursor pagination**: Efficient pagination for large datasets
- **Error handling**: Standardized error responses

### Security Features
- **Row-level security**: Org-based data isolation
- **PII encryption**: Sensitive data encrypted at rest
- **JWT authentication**: Access and refresh token support
- **SSO ready**: SAML/OIDC placeholder schemas

## Usage

### Install Dependencies
```bash
cd packages/contracts
npm install
```

### Generate Prisma Client
```bash
npm run generate
```

### Seed Database
```bash
npm run db:seed
```

### Build Package
```bash
npm run build
```

## Database Schema Highlights

### Core Entities
- **Organization**: Multi-tenant root entity
- **Location**: Physical locations within organizations
- **Employee**: Staff members with role-based access
- **Visitor**: Guest information with encrypted PII
- **Visit**: Check-in/check-out records with full lifecycle
- **Agreement**: Digital contracts (NDA, Safety, etc.)
- **KioskDevice**: Self-service kiosk management

### Security & Compliance
- **AuditLog**: Complete audit trail for compliance
- **Encrypted fields**: `email_encrypted`, `phone_encrypted`
- **Soft delete**: All entities support soft deletion
- **Multi-tenancy**: Org-level data isolation

### Notification System
- **NotificationChannel**: SMS, Email, Slack, Teams support
- **NotificationEvent**: Event-driven notification tracking
- **Templates**: Customizable notification templates

## Example Usage

### Zod Validation
```typescript
import { CreateVisitRequestSchema, type CreateVisitRequest } from '@vms/contracts';

const validateVisitRequest = (data: unknown): CreateVisitRequest => {
  return CreateVisitRequestSchema.parse(data);
};
```

### Prisma Client
```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Multi-tenant query
const visits = await prisma.visit.findMany({
  where: {
    org_id: 'org_123',
    deleted_at: null,
  },
  include: {
    visitor: true,
    host_employee: true,
  },
});
```

## Encryption Example

The seed script demonstrates PII encryption:

```typescript
// Encrypt sensitive data (placeholder - use proper KMS in production)
const encryptPII = (data: string): string => {
  return Buffer.from(data).toString('base64');
};

// Store encrypted
const visitor = await prisma.visitor.create({
  data: {
    email_encrypted: encryptPII('user@example.com'),
    phone_encrypted: encryptPII('+1-555-0123'),
    // ... other fields
  },
});

// Decrypt when needed
const decryptedEmail = Buffer.from(visitor.email_encrypted, 'base64').toString();
```

## Production Considerations

1. **KMS Integration**: Replace placeholder encryption with AWS KMS, Azure Key Vault, etc.
2. **Connection Pooling**: Configure Prisma connection pooling for production
3. **Monitoring**: Add database performance monitoring
4. **Backup Strategy**: Implement automated backups with encryption
5. **Compliance**: Ensure GDPR/HIPAA compliance with proper data handling

## API Documentation

The OpenAPI specification includes:
- Complete endpoint documentation
- Request/response schemas
- Authentication flows
- Error handling patterns
- Pagination examples

View the API docs by serving the OpenAPI file with any OpenAPI viewer or importing into Postman/Insomnia.