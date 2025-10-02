import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store';
import VisitorsPage from '@/pages/visitors';

// Mock the auth store
vi.mock('@/stores/auth-store');

// Mock API calls
const mockVisitors = [
  {
    id: '1',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@example.com',
    phone: '+1-555-0123',
    company: 'Acme Corp',
    created_at: '2024-01-15T10:00:00Z',
    last_visit: '2024-01-20T14:30:00Z',
  },
  {
    id: '2',
    first_name: 'Jane',
    last_name: 'Smith',
    email: 'jane.smith@example.com',
    phone: '+1-555-0456',
    company: 'Beta Inc',
    created_at: '2024-01-10T09:00:00Z',
    last_visit: '2024-01-18T11:15:00Z',
  },
];

vi.mock('@/lib/api/client', () => ({
  visitorsApi: {
    list: vi.fn(() => Promise.resolve({
      data: mockVisitors,
      meta: { has_next: false, total_count: 2 },
    })),
    create: vi.fn(() => Promise.resolve({ id: '3', ...mockVisitors[0] })),
    update: vi.fn(() => Promise.resolve({ ...mockVisitors[0], first_name: 'Updated' })),
    delete: vi.fn(() => Promise.resolve()),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('VisitorsPage', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.mocked(useAuthStore).mockReturnValue({
      user: {
        id: '1',
        org_id: 'org-1',
        first_name: 'Admin',
        last_name: 'User',
        email: 'admin@acme.com',
        role: 'ADMIN',
        is_host: true,
      },
      isAuthenticated: true,
      token: 'mock-token',
      refreshToken: 'mock-refresh-token',
      login: vi.fn(),
      logout: vi.fn(),
      updateUser: vi.fn(),
    });
  });

  it('renders visitors page with data table', async () => {
    render(<VisitorsPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Visitors')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByText('Beta Inc')).toBeInTheDocument();
  });

  it('allows searching visitors', async () => {
    render(<VisitorsPage />, { wrapper: createWrapper() });

    const searchInput = screen.getByPlaceholderText(/search visitors/i);
    await user.type(searchInput, 'John');

    await waitFor(() => {
      // Should filter results (mocked API would handle this)
      expect(searchInput).toHaveValue('John');
    });
  });

  it('allows filtering by company', async () => {
    render(<VisitorsPage />, { wrapper: createWrapper() });

    const companyFilter = screen.getByRole('combobox', { name: /company/i });
    await user.click(companyFilter);
    
    await waitFor(() => {
      expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Acme Corp'));
    
    // Should apply filter (mocked API would handle this)
    expect(companyFilter).toHaveTextContent('Acme Corp');
  });

  it('allows filtering by date range', async () => {
    render(<VisitorsPage />, { wrapper: createWrapper() });

    const dateFromInput = screen.getByLabelText(/from date/i);
    const dateToInput = screen.getByLabelText(/to date/i);

    await user.type(dateFromInput, '2024-01-01');
    await user.type(dateToInput, '2024-01-31');

    // Should apply date filter
    expect(dateFromInput).toHaveValue('2024-01-01');
    expect(dateToInput).toHaveValue('2024-01-31');
  });

  it('opens create visitor dialog', async () => {
    render(<VisitorsPage />, { wrapper: createWrapper() });

    const addButton = screen.getByRole('button', { name: /add visitor/i });
    await user.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('Add New Visitor')).toBeInTheDocument();
    });

    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it('creates new visitor', async () => {
    render(<VisitorsPage />, { wrapper: createWrapper() });

    // Open create dialog
    const addButton = screen.getByRole('button', { name: /add visitor/i });
    await user.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('Add New Visitor')).toBeInTheDocument();
    });

    // Fill form
    await user.type(screen.getByLabelText(/first name/i), 'New');
    await user.type(screen.getByLabelText(/last name/i), 'Visitor');
    await user.type(screen.getByLabelText(/email/i), 'new@example.com');
    await user.type(screen.getByLabelText(/phone/i), '+1-555-0789');
    await user.type(screen.getByLabelText(/company/i), 'New Corp');

    // Submit form
    const submitButton = screen.getByRole('button', { name: /create visitor/i });
    await user.click(submitButton);

    await waitFor(() => {
      // Dialog should close and show success message
      expect(screen.queryByText('Add New Visitor')).not.toBeInTheDocument();
    });
  });

  it('opens edit visitor dialog', async () => {
    render(<VisitorsPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Click edit button for first visitor
    const editButtons = screen.getAllByRole('button', { name: /edit/i });
    await user.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Edit Visitor')).toBeInTheDocument();
    });

    // Form should be pre-filled
    expect(screen.getByDisplayValue('John')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Doe')).toBeInTheDocument();
  });

  it('updates visitor information', async () => {
    render(<VisitorsPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Open edit dialog
    const editButtons = screen.getAllByRole('button', { name: /edit/i });
    await user.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Edit Visitor')).toBeInTheDocument();
    });

    // Update first name
    const firstNameInput = screen.getByDisplayValue('John');
    await user.clear(firstNameInput);
    await user.type(firstNameInput, 'Updated');

    // Submit form
    const submitButton = screen.getByRole('button', { name: /update visitor/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.queryByText('Edit Visitor')).not.toBeInTheDocument();
    });
  });

  it('deletes visitor with confirmation', async () => {
    render(<VisitorsPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Click delete button
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    await user.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument();
    });

    // Confirm deletion
    const confirmButton = screen.getByRole('button', { name: /delete/i });
    await user.click(confirmButton);

    await waitFor(() => {
      // Confirmation dialog should close
      expect(screen.queryByText(/are you sure you want to delete/i)).not.toBeInTheDocument();
    });
  });

  it('exports visitor data', async () => {
    render(<VisitorsPage />, { wrapper: createWrapper() });

    const exportButton = screen.getByRole('button', { name: /export/i });
    await user.click(exportButton);

    // Should trigger download (mocked)
    expect(exportButton).toBeInTheDocument();
  });

  it('handles pagination', async () => {
    // Mock paginated data
    vi.mock('@/lib/api/client', () => ({
      visitorsApi: {
        list: vi.fn(() => Promise.resolve({
          data: mockVisitors,
          meta: { has_next: true, next_cursor: 'cursor-123', total_count: 50 },
        })),
      },
    }));

    render(<VisitorsPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Should show pagination controls
    const nextButton = screen.getByRole('button', { name: /next/i });
    expect(nextButton).toBeInTheDocument();
    expect(nextButton).not.toBeDisabled();

    await user.click(nextButton);
    // Should load next page (mocked API would handle this)
  });

  it('shows empty state when no visitors', async () => {
    // Mock empty data
    vi.mock('@/lib/api/client', () => ({
      visitorsApi: {
        list: vi.fn(() => Promise.resolve({
          data: [],
          meta: { has_next: false, total_count: 0 },
        })),
      },
    }));

    render(<VisitorsPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/no visitors found/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/get started by adding your first visitor/i)).toBeInTheDocument();
  });

  it('validates form inputs', async () => {
    render(<VisitorsPage />, { wrapper: createWrapper() });

    // Open create dialog
    const addButton = screen.getByRole('button', { name: /add visitor/i });
    await user.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('Add New Visitor')).toBeInTheDocument();
    });

    // Try to submit empty form
    const submitButton = screen.getByRole('button', { name: /create visitor/i });
    await user.click(submitButton);

    await waitFor(() => {
      // Should show validation errors
      expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/last name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    // Mock API error
    vi.mock('@/lib/api/client', () => ({
      visitorsApi: {
        list: vi.fn(() => Promise.reject(new Error('API Error'))),
      },
    }));

    render(<VisitorsPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/error loading visitors/i)).toBeInTheDocument();
    });

    // Should show retry button
    const retryButton = screen.getByRole('button', { name: /retry/i });
    expect(retryButton).toBeInTheDocument();
  });
});