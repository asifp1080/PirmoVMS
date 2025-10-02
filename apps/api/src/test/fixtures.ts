import { Organization, Employee, Location, Visitor, Visit } from '@prisma/client';

export const createMockOrganization = (overrides: Partial<Organization> = {}): Omit<Organization, 'id' | 'created_at' | 'updated_at'> => ({
  name: 'Acme Corporation',
  slug: 'acme-corp',
  domain: 'acme.com',
  logo_url: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=200&q=80',
  website: 'https://acme.com',
  industry: 'Technology',
  employee_count: 500,
  time_zone: 'America/New_York',
  settings: {
    require_host_approval: false,
    allow_walk_ins: true,
    visitor_badge_required: true,
    photo_required: true,
    agreement_required: false,
  },
  subscription_tier: 'PROFESSIONAL',
  subscription_status: 'ACTIVE',
  trial_ends_at: null,
  deleted_at: null,
  ...overrides,
});

export const createMockEmployee = (orgId: string, overrides: Partial<Employee> = {}): Omit<Employee, 'id' | 'created_at' | 'updated_at'> => ({
  org_id: orgId,
  first_name: 'John',
  last_name: 'Doe',
  email: 'john.doe@acme.com',
  role: 'RECEPTIONIST',
  is_host: true,
  department: 'Engineering',
  job_title: 'Software Engineer',
  phone: '+1-555-0123',
  avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=john',
  status: 'ACTIVE',
  last_login_at: new Date(),
  created_by: 'system',
  deleted_at: null,
  ...overrides,
});

export const createMockLocation = (orgId: string, overrides: Partial<Location> = {}): Omit<Location, 'id' | 'created_at' | 'updated_at'> => ({
  org_id: orgId,
  name: 'Main Office',
  address: '123 Business Ave, Suite 100',
  city: 'New York',
  state: 'NY',
  postal_code: '10001',
  country: 'US',
  time_zone: 'America/New_York',
  phone: '+1-555-0100',
  capacity: 200,
  is_active: true,
  settings: {
    kiosk_enabled: true,
    badge_printer_enabled: true,
    camera_enabled: true,
    languages: ['en', 'es'],
    theme: 'light',
  },
  deleted_at: null,
  ...overrides,
});

export const createMockVisitor = (overrides: Partial<Visitor> = {}): Omit<Visitor, 'id' | 'created_at' | 'updated_at'> => ({
  first_name: 'Jane',
  last_name: 'Smith',
  email: 'jane.smith@example.com',
  phone: '+1-555-0456',
  company: 'Example Corp',
  photo_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=jane',
  preferred_language: 'en',
  marketing_opt_in: false,
  notes: null,
  deleted_at: null,
  ...overrides,
});

export const createMockVisit = (
  orgId: string,
  locationId: string,
  visitorId: string,
  hostId: string,
  overrides: Partial<Visit> = {}
): Omit<Visit, 'id' | 'created_at' | 'updated_at'> => ({
  org_id: orgId,
  location_id: locationId,
  visitor_id: visitorId,
  host_id: hostId,
  purpose: 'MEETING',
  status: 'PENDING',
  scheduled_start: new Date(),
  scheduled_end: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours later
  check_in_time: null,
  check_out_time: null,
  badge_number: null,
  qr_code: null,
  photo_url: null,
  signature_url: null,
  notes: null,
  metadata: {},
  deleted_at: null,
  ...overrides,
});

export const createMockAuditLog = (
  orgId: string,
  userId: string,
  overrides: any = {}
) => ({
  org_id: orgId,
  user_id: userId,
  action: 'CREATE',
  resource_type: 'VISIT',
  resource_id: 'test-resource-id',
  old_values: null,
  new_values: { status: 'PENDING' },
  ip_address: '127.0.0.1',
  user_agent: 'test-agent',
  ...overrides,
});

// Authentication helpers
export const createAuthHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
});

export const createJwtPayload = (employee: Partial<Employee> & { id: string; org_id: string }) => ({
  sub: employee.id,
  email: employee.email,
  org_id: employee.org_id,
  role: employee.role,
  is_host: employee.is_host,
});

// Date helpers
export const getDateRange = (days: number) => ({
  start: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
  end: new Date(),
});

export const createVisitInTimeRange = (baseVisit: any, hoursAgo: number) => ({
  ...baseVisit,
  scheduled_start: new Date(Date.now() - hoursAgo * 60 * 60 * 1000),
  check_in_time: new Date(Date.now() - hoursAgo * 60 * 60 * 1000),
  check_out_time: hoursAgo > 1 ? new Date(Date.now() - (hoursAgo - 1) * 60 * 60 * 1000) : null,
});

// Multi-language test data
export const multiLanguageVisitors = [
  { first_name: 'María', last_name: 'García', preferred_language: 'es', company: 'Empresa Ejemplo' },
  { first_name: 'Jean', last_name: 'Dupont', preferred_language: 'fr', company: 'Société Exemple' },
  { first_name: 'Hans', last_name: 'Mueller', preferred_language: 'de', company: 'Beispiel GmbH' },
  { first_name: '李', last_name: '明', preferred_language: 'zh', company: '示例公司' },
];

// Visit status variations
export const visitStatusVariations = [
  { status: 'PENDING', check_in_time: null, check_out_time: null },
  { status: 'CHECKED_IN', check_in_time: new Date(), check_out_time: null },
  { status: 'CHECKED_OUT', check_in_time: new Date(Date.now() - 2 * 60 * 60 * 1000), check_out_time: new Date() },
  { status: 'NO_SHOW', check_in_time: null, check_out_time: null },
];

// Purpose variations
export const visitPurposes = ['MEETING', 'INTERVIEW', 'DELIVERY', 'GUEST', 'OTHER'];

export const createBulkVisitData = (count: number, orgId: string, locationId: string, visitorIds: string[], hostIds: string[]) => {
  const visits = [];
  const now = Date.now();
  
  for (let i = 0; i < count; i++) {
    const daysAgo = Math.floor(Math.random() * 90); // Random day in last 90 days
    const hoursOffset = Math.floor(Math.random() * 24); // Random hour of day
    const visitDate = new Date(now - (daysAgo * 24 * 60 * 60 * 1000) + (hoursOffset * 60 * 60 * 1000));
    
    const statusVariation = visitStatusVariations[Math.floor(Math.random() * visitStatusVariations.length)];
    const purpose = visitPurposes[Math.floor(Math.random() * visitPurposes.length)];
    
    visits.push({
      org_id: orgId,
      location_id: locationId,
      visitor_id: visitorIds[Math.floor(Math.random() * visitorIds.length)],
      host_id: hostIds[Math.floor(Math.random() * hostIds.length)],
      purpose,
      scheduled_start: visitDate,
      scheduled_end: new Date(visitDate.getTime() + (1 + Math.random() * 3) * 60 * 60 * 1000), // 1-4 hours
      badge_number: statusVariation.status !== 'PENDING' ? `BADGE-${String(i).padStart(4, '0')}` : null,
      qr_code: `QR-${i}-${Date.now()}`,
      ...statusVariation,
    });
  }
  
  return visits;
};