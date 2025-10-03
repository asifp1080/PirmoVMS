import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'sonner'
import DashboardPage from '@/pages/dashboard'
import { useAuthStore } from '@/stores/auth'
import apiClient from '@/lib/api-client'

// Mock the auth store
vi.mock('@/stores/auth')
const mockUseAuthStore = vi.mocked(useAuthStore)

// Mock the API client
vi.mock('@/lib/api-client')
const mockApiClient = vi.mocked(apiClient)

// Mock recharts to avoid canvas issues in tests
vi.mock('recharts', () => ({
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  AreaChart: ({ children }: any) => <div data-testid="area-chart">{children}</div>,
  Area: () => <div data-testid="area" />,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
}))

const mockUser = {
  id: 'user-1',
  org_id: 'org-1',
  first_name: 'John',
  last_name: 'Admin',
  email: 'john@example.com',
  role: 'ADMIN',
  permissions: ['report:export', 'visitor:read'],
}

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

const mockRecentVisits = {
  data: [
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
      status: 'CHECKED_IN',
      purpose: 'INTERVIEW',
      check_in_time: '2024-01-01T11:00:00Z',
      visitor: {
        first_name: 'Bob',
        last_name: 'Smith',
        company: 'Tech Inc',
      },
    },
  ],
  meta: { total_count: 2 },
}

function renderWithProviders(component: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {component}
        <Toaster />
      </BrowserRouter>
    </QueryClientProvider>
  )
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    mockUseAuthStore.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      hasPermission: vi.fn((permission: string) => mockUser.permissions.includes(permission)),
      hasAnyPermission: vi.fn((permissions: string[]) => 
        permissions.some(p => mockUser.permissions.includes(p))
      ),
      hasRole: vi.fn((role: string) => mockUser.role === role),
    } as any)

    mockApiClient.getVisitAnalytics.mockResolvedValue(mockAnalytics)
    mockApiClient.getVisits.mockResolvedValue(mockRecentVisits)
    mockApiClient.getLocations.mockResolvedValue({
      data: [
        {
          id: 'loc-1',
          name: 'Main Office',
          city: 'New York',
          state: 'NY',
          is_active: true,
        },
      ],
      meta: { total_count: 1 },
    })
  })

  it('renders dashboard with key metrics', async () => {
    renderWithProviders(<DashboardPage />)

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Welcome back! Here\'s what\'s happening with your visitors.')).toBeInTheDocument()

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('150')).toBeInTheDocument() // Total visits
      expect(screen.getByText('120')).toBeInTheDocument() // Unique visitors
      expect(screen.getByText('45 min')).toBeInTheDocument() // Average duration
    })
  })

  it('shows export button for users with export permissions', async () => {
    renderWithProviders(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByText('Export Report')).toBeInTheDocument()
    })
  })

  it('displays charts when data is loaded', async () => {
    renderWithProviders(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByTestId('line-chart')).toBeInTheDocument()
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument()
    })
  })

  it('shows recent activity', async () => {
    renderWithProviders(<DashboardPage />)

    // Click on Recent Activity tab
    fireEvent.click(screen.getByText('Recent Activity'))

    await waitFor(() => {
      expect(screen.getByText('Jane Doe')).toBeInTheDocument()
      expect(screen.getByText('Bob Smith')).toBeInTheDocument()
      expect(screen.getByText('Acme Corp • MEETING')).toBeInTheDocument()
    })
  })

  it('handles API errors gracefully', async () => {
    mockApiClient.getVisitAnalytics.mockRejectedValue(new Error('API Error'))

    renderWithProviders(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByText('Failed to load dashboard data. Please try again.')).toBeInTheDocument()
      expect(screen.getByText('Retry')).toBeInTheDocument()
    })
  })

  it('shows loading state initially', () => {
    renderWithProviders(<DashboardPage />)

    // Should show skeleton loaders
    expect(document.querySelectorAll('[data-testid="skeleton"]')).toBeTruthy()
  })

  it('switches between tabs correctly', async () => {
    renderWithProviders(<DashboardPage />)

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('150')).toBeInTheDocument()
    })

    // Click Analytics tab
    fireEvent.click(screen.getByText('Analytics'))
    expect(screen.getByText('Peak Hours')).toBeInTheDocument()
    expect(screen.getByText('Visits by Location')).toBeInTheDocument()

    // Click Locations tab
    fireEvent.click(screen.getByText('Locations'))
    await waitFor(() => {
      expect(screen.getByText('Main Office')).toBeInTheDocument()
      expect(screen.getByText('New York, NY')).toBeInTheDocument()
    })
  })

  it('refreshes data when retry button is clicked', async () => {
    mockApiClient.getVisitAnalytics.mockRejectedValueOnce(new Error('API Error'))
    mockApiClient.getVisitAnalytics.mockResolvedValueOnce(mockAnalytics)

    renderWithProviders(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByText('Failed to load dashboard data. Please try again.')).toBeInTheDocument()
    })

    // Click retry button
    fireEvent.click(screen.getByText('Retry'))

    await waitFor(() => {
      expect(screen.getByText('150')).toBeInTheDocument()
    })
  })
})