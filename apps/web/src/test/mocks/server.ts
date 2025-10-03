import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

// Mock data
const mockUser = {
  id: 'user-1',
  org_id: 'org-1',
  first_name: 'John',
  last_name: 'Admin',
  email: 'john@example.com',
  role: 'ADMIN',
  is_host: true,
  created_at: '2024-01-01T10:00:00Z',
  updated_at: '2024-01-01T10:00:00Z',
}

const mockVisitors = [
  {
    id: 'visitor-1',
    first_name: 'Jane',
    last_name: 'Doe',
    email: 'jane@example.com',
    phone: '+1-555-0123',
    company: 'Acme Corp',
    preferred_language: 'en',
    marketing_opt_in: false,
    created_at: '2024-01-01T10:00:00Z',
    updated_at: '2024-01-01T10:00:00Z',
  },
  {
    id: 'visitor-2',
    first_name: 'Bob',
    last_name: 'Smith',
    email: 'bob@techcorp.com',
    phone: '+1-555-0456',
    company: 'Tech Corp',
    preferred_language: 'en',
    marketing_opt_in: true,
    created_at: '2024-01-02T11:00:00Z',
    updated_at: '2024-01-02T11:00:00Z',
  },
]

const mockAnalytics = {
  total_visits: 150,
  unique_visitors: 120,
  average_duration: 45,
  peak_hours: [
    { hour: 9, count: 25 },
    { hour: 10, count: 30 },
    { hour: 11, count: 35 },
  ],
  visits_by_purpose: [
    { purpose: 'MEETING', count: 80 },
    { purpose: 'INTERVIEW', count: 40 },
    { purpose: 'DELIVERY', count: 30 },
  ],
  visits_by_location: [
    { location_id: 'loc-1', location_name: 'Main Office', count: 100 },
    { location_id: 'loc-2', location_name: 'Branch Office', count: 50 },
  ],
  daily_counts: [
    { date: '2024-01-01', count: 10 },
    { date: '2024-01-02', count: 15 },
    { date: '2024-01-03', count: 12 },
  ],
}

// Define request handlers
export const handlers = [
  // Auth endpoints
  http.post('/api/v1/auth/login', async ({ request }) => {
    const body = await request.json() as any
    
    if (body.email === 'john@example.com' && body.password === 'password123') {
      return HttpResponse.json({
        access_token: 'mock-token',
        refresh_token: 'mock-refresh-token',
        expires_in: 900,
        user: mockUser,
      })
    }
    
    return HttpResponse.json(
      { error: 'Invalid credentials', message: 'Invalid credentials' },
      { status: 401 }
    )
  }),

  http.post('/api/v1/auth/refresh', () => {
    return HttpResponse.json({
      access_token: 'new-mock-token',
      refresh_token: 'new-mock-refresh-token',
      expires_in: 900,
      user: mockUser,
    })
  }),

  http.post('/api/v1/auth/logout', () => {
    return HttpResponse.json({ message: 'Logout successful' })
  }),

  // Analytics endpoints
  http.get('/api/v1/organizations/:orgId/analytics/visits', () => {
    return HttpResponse.json(mockAnalytics)
  }),

  http.post('/api/v1/organizations/:orgId/analytics/export', () => {
    return HttpResponse.text('csv,data,here', {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="export.csv"',
      },
    })
  }),

  // Visitor endpoints
  http.get('/api/v1/organizations/:orgId/visitors', ({ request }) => {
    const url = new URL(request.url)
    const search = url.searchParams.get('search')
    const company = url.searchParams.get('company')
    
    let filteredVisitors = mockVisitors
    
    if (search) {
      filteredVisitors = mockVisitors.filter(v => 
        v.first_name.toLowerCase().includes(search.toLowerCase()) ||
        v.last_name.toLowerCase().includes(search.toLowerCase()) ||
        v.email.toLowerCase().includes(search.toLowerCase())
      )
    }
    
    if (company) {
      filteredVisitors = filteredVisitors.filter(v => v.company === company)
    }

    return HttpResponse.json({
      data: filteredVisitors,
      meta: { total_count: filteredVisitors.length },
    })
  }),

  http.post('/api/v1/organizations/:orgId/visitors', async ({ request }) => {
    const body = await request.json() as any
    const newVisitor = {
      id: `visitor-${Date.now()}`,
      ...body,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    return HttpResponse.json(newVisitor, { status: 201 })
  }),

  http.put('/api/v1/organizations/:orgId/visitors/:visitorId', async ({ request, params }) => {
    const body = await request.json() as any
    const visitor = mockVisitors.find(v => v.id === params.visitorId)
    
    if (!visitor) {
      return HttpResponse.json(
        { error: 'Not found', message: 'Visitor not found' },
        { status: 404 }
      )
    }

    const updatedVisitor = {
      ...visitor,
      ...body,
      updated_at: new Date().toISOString(),
    }
    
    return HttpResponse.json(updatedVisitor)
  }),

  http.delete('/api/v1/organizations/:orgId/visitors/:visitorId', ({ params }) => {
    const visitor = mockVisitors.find(v => v.id === params.visitorId)
    
    if (!visitor) {
      return HttpResponse.json(
        { error: 'Not found', message: 'Visitor not found' },
        { status: 404 }
      )
    }

    return HttpResponse.json(null, { status: 204 })
  }),

  // Visit endpoints
  http.get('/api/v1/organizations/:orgId/visits', ({ request }) => {
    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    
    const mockVisits = [
      {
        id: 'visit-1',
        status: 'CHECKED_IN',
        purpose: 'MEETING',
        check_in_time: '2024-01-01T10:00:00Z',
        visitor: {
          first_name: 'Jane',
          last_name: 'Doe',
          company: 'Acme Corp',
        },
      },
      {
        id: 'visit-2',
        status: 'CHECKED_OUT',
        purpose: 'INTERVIEW',
        check_in_time: '2024-01-01T11:00:00Z',
        check_out_time: '2024-01-01T12:00:00Z',
        visitor: {
          first_name: 'Bob',
          last_name: 'Smith',
          company: 'Tech Inc',
        },
      },
    ]

    let filteredVisits = mockVisits
    if (status) {
      filteredVisits = mockVisits.filter(v => v.status === status)
    }

    return HttpResponse.json({
      data: filteredVisits,
      meta: { total_count: filteredVisits.length },
    })
  }),

  // Location endpoints
  http.get('/api/v1/organizations/:orgId/locations', () => {
    return HttpResponse.json({
      data: [
        {
          id: 'loc-1',
          name: 'Main Office',
          city: 'New York',
          state: 'NY',
          is_active: true,
        },
        {
          id: 'loc-2',
          name: 'Branch Office',
          city: 'Los Angeles',
          state: 'CA',
          is_active: true,
        },
      ],
      meta: { total_count: 2 },
    })
  }),

  // Privacy endpoints
  http.get('/api/v1/organizations/:orgId/privacy/pii-access-logs', () => {
    return HttpResponse.json([
      {
        id: 'log-1',
        user_id: 'user-1',
        action: 'VIEW',
        resource_type: 'VISITOR',
        resource_id: 'visitor-1',
        pii_fields: ['email', 'phone'],
        timestamp: '2024-01-01T10:00:00Z',
        ip_address: '192.168.1.100',
        user: { name: 'John Admin' },
      },
    ])
  }),

  http.get('/api/v1/organizations/:orgId/privacy/gdpr-requests', () => {
    return HttpResponse.json([
      {
        id: 'gdpr-1',
        request_type: 'EXPORT',
        subject_email: 'jane@example.com',
        status: 'COMPLETED',
        requested_at: '2024-01-01T10:00:00Z',
        completed_at: '2024-01-01T11:00:00Z',
      },
    ])
  }),

  // Error simulation endpoints
  http.get('/api/v1/error', () => {
    return HttpResponse.json(
      { error: 'Internal Server Error', message: 'Something went wrong' },
      { status: 500 }
    )
  }),
]

// Setup server
export const server = setupServer(...handlers)