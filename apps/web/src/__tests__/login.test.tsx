import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'sonner'
import LoginPage from '@/pages/login'
import { useAuthStore } from '@/stores/auth'
import apiClient from '@/lib/api-client'

// Mock the auth store
vi.mock('@/stores/auth')
const mockUseAuthStore = vi.mocked(useAuthStore)

// Mock the API client
vi.mock('@/lib/api-client')
const mockApiClient = vi.mocked(apiClient)

// Mock react-router-dom navigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ state: null }),
  }
})

const mockLoginResponse = {
  access_token: 'mock-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 900,
  user: {
    id: 'user-1',
    org_id: 'org-1',
    first_name: 'John',
    last_name: 'Admin',
    email: 'john@example.com',
    role: 'ADMIN',
    is_host: true,
    created_at: '2024-01-01T10:00:00Z',
    updated_at: '2024-01-01T10:00:00Z',
  },
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

describe('LoginPage', () => {
  const mockLogin = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    
    mockUseAuthStore.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: mockLogin,
      setLoading: vi.fn(),
    } as any)

    mockApiClient.login.mockResolvedValue(mockLoginResponse)
  })

  it('renders login form', () => {
    renderWithProviders(<LoginPage />)

    expect(screen.getByText('Welcome to VMS')).toBeInTheDocument()
    expect(screen.getByText('Sign in to your account')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument()
  })

  it('validates required fields', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />)

    // Try to submit without filling fields
    await user.click(screen.getByRole('button', { name: 'Sign In' }))

    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeInTheDocument()
      expect(screen.getByText('Password is required')).toBeInTheDocument()
    })
  })

  it('validates email format', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />)

    await user.type(screen.getByLabelText('Email'), 'invalid-email')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Sign In' }))

    await waitFor(() => {
      expect(screen.getByText('Invalid email address')).toBeInTheDocument()
    })
  })

  it('submits login form successfully', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />)

    await user.type(screen.getByLabelText('Email'), 'john@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Sign In' }))

    await waitFor(() => {
      expect(mockApiClient.login).toHaveBeenCalledWith('john@example.com', 'password123', undefined)
      expect(mockLogin).toHaveBeenCalledWith(mockLoginResponse.user, mockLoginResponse.access_token)
      expect(mockNavigate).toHaveBeenCalledWith('/')
    })
  })

  it('submits login with organization slug', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />)

    await user.type(screen.getByLabelText('Email'), 'john@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    
    // Find and fill organization field if it exists
    const orgField = screen.queryByLabelText('Organization')
    if (orgField) {
      await user.type(orgField, 'test-org')
    }
    
    await user.click(screen.getByRole('button', { name: 'Sign In' }))

    await waitFor(() => {
      expect(mockApiClient.login).toHaveBeenCalled()
    })
  })

  it('handles login errors', async () => {
    const user = userEvent.setup()
    mockApiClient.login.mockRejectedValue({
      response: {
        data: { message: 'Invalid credentials' }
      }
    })

    renderWithProviders(<LoginPage />)

    await user.type(screen.getByLabelText('Email'), 'john@example.com')
    await user.type(screen.getByLabelText('Password'), 'wrongpassword')
    await user.click(screen.getByRole('button', { name: 'Sign In' }))

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
    })
  })

  it('shows loading state during login', async () => {
    const user = userEvent.setup()
    
    // Mock a delayed response
    mockApiClient.login.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve(mockLoginResponse), 1000))
    )

    renderWithProviders(<LoginPage />)

    await user.type(screen.getByLabelText('Email'), 'john@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Sign In' }))

    // Should show loading state
    expect(screen.getByText('Signing in...')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Signing in...' })).toBeDisabled()
  })

  it('redirects authenticated users', () => {
    mockUseAuthStore.mockReturnValue({
      user: mockLoginResponse.user,
      isAuthenticated: true,
      isLoading: false,
      login: mockLogin,
      setLoading: vi.fn(),
    } as any)

    renderWithProviders(<LoginPage />)

    expect(mockNavigate).toHaveBeenCalledWith('/')
  })

  it('handles network errors', async () => {
    const user = userEvent.setup()
    mockApiClient.login.mockRejectedValue(new Error('Network error'))

    renderWithProviders(<LoginPage />)

    await user.type(screen.getByLabelText('Email'), 'john@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Sign In' }))

    await waitFor(() => {
      expect(screen.getByText('Network error. Please try again.')).toBeInTheDocument()
    })
  })
})