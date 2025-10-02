import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth-store'
import { ThemeProvider } from '@/components/theme-provider'

// Auth pages
import LoginPage from '@/pages/auth/login'
import ForgotPasswordPage from '@/pages/auth/forgot-password'

// Protected pages
import DashboardLayout from '@/components/layouts/dashboard-layout'
import DashboardPage from '@/pages/dashboard'
import VisitorsPage from '@/pages/visitors'
import VisitsPage from '@/pages/visits'
import EmployeesPage from '@/pages/employees'
import AgreementsPage from '@/pages/agreements'
import LocationsPage from '@/pages/locations'
import KiosksPage from '@/pages/kiosks'
import SettingsPage from '@/pages/settings'
import AuditPage from '@/pages/audit'
import ReportsPage from '@/pages/reports'

function App() {
  const { isAuthenticated } = useAuthStore()

  if (!isAuthenticated) {
    return (
      <ThemeProvider defaultTheme="light" storageKey="vms-ui-theme">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider defaultTheme="light" storageKey="vms-ui-theme">
      <Routes>
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="visitors" element={<VisitorsPage />} />
          <Route path="visits" element={<VisitsPage />} />
          <Route path="employees" element={<EmployeesPage />} />
          <Route path="agreements" element={<AgreementsPage />} />
          <Route path="locations" element={<LocationsPage />} />
          <Route path="kiosks" element={<KiosksPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="audit" element={<AuditPage />} />
          <Route path="reports" element={<ReportsPage />} />
        </Route>
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ThemeProvider>
  )
}

export default App