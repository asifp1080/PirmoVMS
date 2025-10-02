import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store';
import DashboardPage from '@/pages/dashboard';

// Mock the auth store
vi.mock('@/stores/auth-store');

// Mock API calls
vi.mock('@/lib/api/client', () => ({
  visitsApi: {
    list: vi.fn(() => Promise.resolve({
      data: [
        {
          id: '1',
          visitor: { first_name: 'John', last_name: 'Doe', company: 'Acme Corp' },
          host: { first_name: 'Jane', last_name: 'Smith' },
          status: 'CHECKED_IN',
          check_in_time: new Date().toISOString(),
          badge_number: 'BADGE-001',
          purpose: 'MEETING',
        },
        {
          id: '2',
          visitor: { first_name: 'Alice', last_name: 'Johnson', company: 'Beta Inc' },
          host: { first_name: 'Bob', last_name: 'Wilson' },
          status: 'CHECKED_IN',
          check_in_time: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          badge_number: 'BADGE-002',
          purpose: 'INTERVIEW',
        },
      ],
      meta: { has_next: false, total_count: 2 },
    })),
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

describe('DashboardPage', () => {
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

  it('renders dashboard with welcome message', async () => {
    render(<DashboardPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText(/Welcome back, Admin/)).toBeInTheDocument();
  });

  it('displays current visitor statistics', async () => {
    render(<DashboardPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Currently In')).toBeInTheDocument();
      expect(screen.getByText('24')).toBeInTheDocument(); // Mock stat
    });

    expect(screen.getByText("Today's Arrivals")).toBeInTheDocument();
    expect(screen.getByText('67')).toBeInTheDocument(); // Mock stat
  });

  it('shows currently checked-in visitors list', async () => {
    render(<DashboardPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Currently In Building')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    });

    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByText('Beta Inc')).toBeInTheDocument();
  });

  it('displays action buttons', () => {
    render(<DashboardPage />, { wrapper: createWrapper() });

    expect(screen.getByRole('button', { name: /register visitor/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /print badge/i })).toBeInTheDocument();
  });

  it('shows online/offline status indicator', () => {
    render(<DashboardPage />, { wrapper: createWrapper() });

    expect(screen.getByText('ONLINE')).toBeInTheDocument();
  });

  it('handles loading state', () => {
    // Mock loading state
    vi.mock('@/lib/api/client', () => ({
      visitsApi: {
        list: vi.fn(() => new Promise(() => {})), // Never resolves
      },
    }));

    render(<DashboardPage />, { wrapper: createWrapper() });

    // Should show skeleton loaders
    expect(document.querySelectorAll('.animate-pulse')).toHaveLength.greaterThan(0);
  });

  it('handles error state gracefully', async () => {
    // Mock API error
    vi.mock('@/lib/api/client', () => ({
      visitsApi: {
        list: vi.fn(() => Promise.reject(new Error('API Error'))),
      },
    }));

    render(<DashboardPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      // Should still render the page structure
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
  });
});