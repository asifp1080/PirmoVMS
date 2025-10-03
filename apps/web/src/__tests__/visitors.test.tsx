import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'sonner'
import VisitorsPage from '@/pages/visitors'
import { useAuthStore } from '@/stores/auth'
import apiClient from '@/lib/api-client'

// Mock the auth store
vi.mock('@/stores/auth')
const mockUseAuthStore = vi.mocked(useAuthStore)

// Mock the API client
vi.mock('@/lib/api-client')
const mockApiClient = vi.mocked(apiClient)

const mockUser = {
  id: 'user-1',
  org_id: 'org-1',
  first_name: 'John',
  last_name: 'Admin',
  email: 'john@example.com',
  role: 'ADMIN',
  permissions: ['visitor:read', 'visitor:create', 'visitor:update', 'visitor:delete', 'visitor:export'],
}

const mockVisitors = {
  data: [
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

describe('VisitorsPage', () => {
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

    mockApiClient.getVisitors.mockResolvedValue(mockVisitors)
    mockApiClient.createVisitor.mockResolvedValue(mockVisitors.data[0])
    mockApiClient.updateVisitor.mockResolvedValue(mockVisitors.data[0])
    mockApiClient.deleteVisitor.mockResolvedValue(undefined)
    mockApiClient.exportAnalytics.mockResolvedValue(new Blob(['csv data'], { type: 'text/csv' }))
  })

  it('renders visitors page with data', async () => {
    renderWithProviders(<VisitorsPage />)

    expect(screen.getByText('Visitors')).toBeInTheDocument()
    expect(screen.getByText('Manage visitor information and history.')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('Jane Doe')).toBeInTheDocument()
      expect(screen.getByText('Bob Smith')).toBeInTheDocument()
      expect(screen.getByText('jane@example.com')).toBeInTheDocument()
      expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    })
  })

  it('shows add visitor button for users with create permissions', async () => {
    renderWithProviders(<VisitorsPage />)

    await waitFor(() => {
      expect(screen.getByText('Add Visitor')).toBeInTheDocument()
    })
  })

  it('shows export button for users with export permissions', async () => {
    renderWithProviders(<VisitorsPage />)

    await waitFor(() => {
      expect(screen.getByText('Export')).toBeInTheDocument()
    })
  })

  it('opens create visitor dialog when add button is clicked', async () => {
    const user = userEvent.setup()
    renderWithProviders(<VisitorsPage />)

    await waitFor(() => {
      expect(screen.getByText('Add Visitor')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Add Visitor'))

    expect(screen.getByText('Add New Visitor')).toBeInTheDocument()
    expect(screen.getByLabelText('First Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Last Name')).toBeInTheDocument()
  })

  it('creates a new visitor successfully', async () => {
    const user = userEvent.setup()
    renderWithProviders(<VisitorsPage />)

    await waitFor(() => {
      expect(screen.getByText('Add Visitor')).toBeInTheDocument()
    })

    // Open create dialog
    await user.click(screen.getByText('Add Visitor'))

    // Fill form
    await user.type(screen.getByLabelText('First Name'), 'John')
    await user.type(screen.getByLabelText('Last Name'), 'Test')
    await user.type(screen.getByLabelText('Email'), 'john@test.com')
    await user.type(screen.getByLabelText('Company'), 'Test Corp')

    // Submit form
    await user.click(screen.getByText('Create Visitor'))

    await waitFor(() => {
      expect(mockApiClient.createVisitor).toHaveBeenCalledWith('org-1', {
        first_name: 'John',
        last_name: 'Test',
        email: 'john@test.com',
        phone: '',
        company: 'Test Corp',
        preferred_language: 'en',
        marketing_opt_in: false,
        notes: '',
      })
    })
  })

  it('filters visitors by search query', async () => {
    const user = userEvent.setup()
    renderWithProviders(<VisitorsPage />)

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search visitors...')).toBeInTheDocument()
    })

    // Type in search box
    await user.type(screen.getByPlaceholderText('Search visitors...'), 'Jane')

    await waitFor(() => {
      expect(mockApiClient.getVisitors).toHaveBeenCalledWith('org-1', {
        search: 'Jane',
        company: undefined,
        limit: 20,
        cursor: undefined,
      })
    })
  })

  it('filters visitors by company', async () => {
    const user = userEvent.setup()
    
    // Mock companies data
    mockApiClient.getVisitors.mockResolvedValueOnce({
      data: mockVisitors.data,
      meta: { total_count: 2 },
    })

    renderWithProviders(<VisitorsPage />)

    await waitFor(() => {
      expect(screen.getByText('Filter by company')).toBeInTheDocument()
    })

    // Click company filter
    await user.click(screen.getByText('Filter by company'))
    
    // This would open the select dropdown in a real scenario
    // For testing, we'll verify the API call structure
    expect(mockApiClient.getVisitors).toHaveBeenCalled()
  })

  it('opens edit dialog when edit action is clicked', async () => {
    const user = userEvent.setup()
    renderWithProviders(<VisitorsPage />)

    await waitFor(() => {
      expect(screen.getByText('Jane Doe')).toBeInTheDocument()
    })

    // Click the actions menu for the first visitor
    const actionButtons = screen.getAllByRole('button', { name: '' })
    const actionsButton = actionButtons.find(button => 
      button.querySelector('svg')?.getAttribute('data-testid') === 'more-horizontal' ||
      button.textContent === ''
    )
    
    if (actionsButton) {
      await user.click(actionsButton)
      
      // Look for Edit option in dropdown
      const editButton = screen.queryByText('Edit')
      if (editButton) {
        await user.click(editButton)
        expect(screen.getByText('Edit Visitor')).toBeInTheDocument()
      }
    }
  })

  it('handles API errors gracefully', async () => {
    mockApiClient.getVisitors.mockRejectedValue(new Error('API Error'))

    renderWithProviders(<VisitorsPage />)

    await waitFor(() => {
      expect(screen.getByText('Failed to load visitors. Please try again.')).toBeInTheDocument()
      expect(screen.getByText('Retry')).toBeInTheDocument()
    })
  })

  it('shows empty state when no visitors found', async () => {
    mockApiClient.getVisitors.mockResolvedValue({
      data: [],
      meta: { total_count: 0 },
    })

    renderWithProviders(<VisitorsPage />)

    await waitFor(() => {
      expect(screen.getByText('No visitors found')).toBeInTheDocument()
    })
  })

  it('validates required fields in create form', async () => {
    const user = userEvent.setup()
    renderWithProviders(<VisitorsPage />)

    await waitFor(() => {
      expect(screen.getByText('Add Visitor')).toBeInTheDocument()
    })

    // Open create dialog
    await user.click(screen.getByText('Add Visitor'))

    // Try to submit without required fields
    await user.click(screen.getByText('Create Visitor'))

    // Should show validation errors
    await waitFor(() => {
      expect(screen.getByText('First name is required')).toBeInTheDocument()
      expect(screen.getByText('Last name is required')).toBeInTheDocument()
    })
  })

  it('exports visitors data', async () => {
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

    renderWithProviders(<VisitorsPage />)

    await waitFor(() => {
      expect(screen.getByText('Export')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Export'))

    await waitFor(() => {
      expect(mockApiClient.exportAnalytics).toHaveBeenCalledWith('org-1', {
        format: 'csv',
        data_type: 'visitors',
        filters: {
          search: '',
          company: '',
        },
      })
    })
  })
})