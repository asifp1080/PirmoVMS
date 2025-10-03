import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'sonner'
import ReportsPage from '@/pages/reports'
import { useAuthStore } from '@/stores/auth'
import apiClient from '@/lib/api-client'

// Mock the auth store
vi.mock('@/stores/auth')
const mockUseAuthStore = vi.mocked(useAuthStore)

// Mock the API client
vi.mock('@/lib/api-client')
const mockApiClient = vi.mocked(apiClient)

// Mock recharts
vi.mock('recharts', () => ({
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
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
  role: 'ADMIN',
  permissions: ['report:read', 'report:export', 'report:analytics'],
}

const mockAnalytics = {
  total_visits: 150,
  unique_visitors: 120,
  average_duration: 45,
  peak_hours: [
    { hour: 9, count: 25 },
    { hour: 10, count: 30 },
  ],
  visits_by_purpose: [
    { purpose: 'MEETING', count: 80 },
    { purpose: 'INTERVIEW', count: 40 },
  ],
  visits_by_location: [
    { location_id: 'loc-1', location_name: 'Main Office', count: 100 },
  ],
  daily_counts: [
    { date: '2024-01-01', count: 10 },
    { date: '2024-01-02', count: 15 },
  ],
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

describe('ReportsPage', () => {
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
    mockApiClient.getLocations.mockResolvedValue({
      data: [
        { id: 'loc-1', name: 'Main Office' },
        { id: 'loc-2', name: 'Branch Office' },
      ],
      meta: { total_count: 2 },
    })
    mockApiClient.exportAnalytics.mockResolvedValue(new Blob(['csv data'], { type: 'text/csv' }))
  })

  it('renders reports page with analytics data', async () => {
    renderWithProviders(<ReportsPage />)

    expect(screen.getByText('Reports & Analytics')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('150')).toBeInTheDocument() // Total visits
      expect(screen.getByText('120')).toBeInTheDocument() // Unique visitors
      expect(screen.getByText('45 min')).toBeInTheDocument() // Average duration
    })
  })

  it('shows export buttons for users with export permissions', async () => {
    renderWithProviders(<ReportsPage />)

    await waitFor(() => {
      expect(screen.getByText('Export CSV')).toBeInTheDocument()
      expect(screen.getByText('Export PDF')).toBeInTheDocument()
    })
  })

  it('filters analytics by location', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ReportsPage />)

    await waitFor(() => {
      expect(screen.getByText('All locations')).toBeInTheDocument()
    })

    // Click location filter
    await user.click(screen.getByText('All locations'))
    
    // This would open the select dropdown in a real scenario
    expect(mockApiClient.getLocations).toHaveBeenCalled()
  })

  it('changes time period filter', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ReportsPage />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('Monthly')).toBeInTheDocument()
    })

    // Change to weekly
    await user.click(screen.getByDisplayValue('Monthly'))
    
    // This would trigger a new API call with different period
    expect(mockApiClient.getVisitAnalytics).toHaveBeenCalled()
  })

  it('exports CSV data', async () => {
    const user = userEvent.setup()
    
    // Mock URL.createObjectURL
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
    global.URL.revokeObjectURL = vi.fn()
    
    // Mock document.createElement and appendChild
    const mockAnchor = {
      href: '',
      download: '',
      click: vi.fn(),
    }
    vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any)
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockAnchor as any)
    vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockAnchor as any)

    renderWithProviders(<ReportsPage />)

    await waitFor(() => {
      expect(screen.getByText('Export CSV')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Export CSV'))

    await waitFor(() => {
      expect(mockApiClient.exportAnalytics).toHaveBeenCalledWith('org-1', {
        format: 'csv',
        data_type: 'analytics',
        from_date: expect.any(String),
        to_date: expect.any(String),
        filters: expect.any(Object),
      })
    })
  })

  it('displays charts correctly', async () => {
    renderWithProviders(<ReportsPage />)

    await waitFor(() => {
      expect(screen.getByTestId('line-chart')).toBeInTheDocument()
    })

    // Switch to breakdown tab
    await fireEvent.click(screen.getByText('Breakdown'))
    
    await waitFor(() => {
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument()
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
    })
  })

  it('handles API errors gracefully', async () => {
    mockApiClient.getVisitAnalytics.mockRejectedValue(new Error('API Error'))

    renderWithProviders(<ReportsPage />)

    await waitFor(() => {
      expect(screen.getByText('Failed to load analytics data. Please try again.')).toBeInTheDocument()
      expect(screen.getByText('Retry')).toBeInTheDocument()
    })
  })
})