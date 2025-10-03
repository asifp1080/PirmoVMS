import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'sonner'
import PrivacySettingsPage from '@/pages/privacy-settings'
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
  permissions: ['data:retention', 'gdpr:export', 'gdpr:delete', 'audit:read'],
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

describe('PrivacySettingsPage', () => {
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

    // Mock API responses
    mockApiClient.getPIIAccessLogs.mockResolvedValue([
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

    mockApiClient.getGDPRRequests.mockResolvedValue([
      {
        id: 'gdpr-1',
        request_type: 'EXPORT',
        subject_email: 'jane@example.com',
        status: 'COMPLETED',
        requested_at: '2024-01-01T10:00:00Z',
        completed_at: '2024-01-01T11:00:00Z',
      },
    ])

    mockApiClient.updateDataRetentionPolicy.mockResolvedValue(undefined)
    mockApiClient.createGDPRExportRequest.mockResolvedValue({ id: 'gdpr-2' })
    mockApiClient.createGDPRDeletionRequest.mockResolvedValue({ id: 'gdpr-3' })
  })

  it('renders privacy settings page', async () => {
    renderWithProviders(<PrivacySettingsPage />)

    expect(screen.getByText('Privacy & Security Settings')).toBeInTheDocument()
    expect(screen.getByText('Manage data protection, encryption, and compliance settings for your organization.')).toBeInTheDocument()

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Encryption Status')).toBeInTheDocument()
      expect(screen.getByText('PII Access (30 days)')).toBeInTheDocument()
      expect(screen.getByText('GDPR Requests')).toBeInTheDocument()
    })
  })

  it('displays PII access statistics', async () => {
    renderWithProviders(<PrivacySettingsPage />)

    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument() // Total accesses
      expect(screen.getByText('By 1 unique users')).toBeInTheDocument()
    })
  })

  it('shows GDPR requests count', async () => {
    renderWithProviders(<PrivacySettingsPage />)

    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument() // GDPR requests count
      expect(screen.getByText('1 completed')).toBeInTheDocument()
    })
  })

  it('allows updating data retention policy', async () => {
    const user = userEvent.setup()
    renderWithProviders(<PrivacySettingsPage />)

    // Navigate to retention tab
    await waitFor(() => {
      expect(screen.getByText('Data Retention')).toBeInTheDocument()
    })
    
    await user.click(screen.getByText('Data Retention'))

    // Wait for form to load
    await waitFor(() => {
      expect(screen.getByLabelText('Visitor Data Retention (days)')).toBeInTheDocument()
    })

    // Update retention period
    const visitorRetentionInput = screen.getByLabelText('Visitor Data Retention (days)')
    await user.clear(visitorRetentionInput)
    await user.type(visitorRetentionInput, '365')

    // Submit form
    await user.click(screen.getByText('Update Policy'))

    await waitFor(() => {
      expect(mockApiClient.updateDataRetentionPolicy).toHaveBeenCalledWith('org-1', {
        resourceType: 'VISITOR',
        retentionPeriodDays: 365,
        autoDeleteEnabled: expect.any(Boolean),
        legalHoldExemption: false,
      })
    })
  })

  it('allows creating GDPR export request', async () => {
    const user = userEvent.setup()
    renderWithProviders(<PrivacySettingsPage />)

    // Navigate to GDPR tab
    await user.click(screen.getByText('GDPR Requests'))

    // Wait for form to load
    await waitFor(() => {
      expect(screen.getByLabelText('Email Address')).toBeInTheDocument()
    })

    // Fill form
    await user.type(screen.getByLabelText('Email Address'), 'test@example.com')
    await user.click(screen.getByText('Select request type'))
    await user.click(screen.getByText('Data Export'))

    // Submit form
    await user.click(screen.getByText('Create Request'))

    await waitFor(() => {
      expect(mockApiClient.createGDPRExportRequest).toHaveBeenCalledWith('org-1', {
        email: 'test@example.com',
        phone: undefined,
      })
    })
  })

  it('shows audit logs', async () => {
    const user = userEvent.setup()
    renderWithProviders(<PrivacySettingsPage />)

    // Navigate to audit tab
    await user.click(screen.getByText('Audit Logs'))

    await waitFor(() => {
      expect(screen.getByText('PII Access Audit Logs')).toBeInTheDocument()
      expect(screen.getByText('John Admin')).toBeInTheDocument()
      expect(screen.getByText('VIEW')).toBeInTheDocument()
      expect(screen.getByText('VISITOR #visitor-1')).toBeInTheDocument()
    })
  })

  it('handles API errors gracefully', async () => {
    mockApiClient.getPIIAccessLogs.mockRejectedValue(new Error('API Error'))

    renderWithProviders(<PrivacySettingsPage />)

    // Should still render the page structure
    expect(screen.getByText('Privacy & Security Settings')).toBeInTheDocument()
  })

  it('validates GDPR request form', async () => {
    const user = userEvent.setup()
    renderWithProviders(<PrivacySettingsPage />)

    // Navigate to GDPR tab
    await user.click(screen.getByText('GDPR Requests'))

    // Try to submit without email
    await user.click(screen.getByText('Create Request'))

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument()
    })
  })

  it('shows encryption key rotation for admins', async () => {
    renderWithProviders(<PrivacySettingsPage />)

    // Navigate to encryption tab
    await waitFor(() => {
      expect(screen.getByText('Encryption')).toBeInTheDocument()
    })
    
    await fireEvent.click(screen.getByText('Encryption'))

    await waitFor(() => {
      expect(screen.getByText('Manual Key Rotation')).toBeInTheDocument()
      expect(screen.getByText('Rotate Key')).toBeInTheDocument()
    })
  })
})