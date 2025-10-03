import axios, { AxiosInstance, AxiosResponse } from 'axios'
import { toast } from 'sonner'
import type {
  Organization,
  Location,
  Employee,
  Visitor,
  Visit,
  LoginResponse,
  VisitAnalytics,
  PaginationMeta,
  ApiError,
} from '@vms/contracts'

export interface ApiResponse<T> {
  data: T
  meta?: PaginationMeta
}

export interface PaginationParams {
  limit?: number
  cursor?: string
}

export interface VisitorFilters extends PaginationParams {
  search?: string
  company?: string
}

export interface VisitFilters extends PaginationParams {
  status?: string
  purpose?: string
  location_id?: string
  host_id?: string
  from_date?: string
  to_date?: string
}

export interface AnalyticsParams {
  period?: 'day' | 'week' | 'month' | 'year'
  from_date?: string
  to_date?: string
  location_id?: string
}

export interface ExportParams {
  format: 'csv' | 'pdf' | 'json'
  data_type: 'visits' | 'visitors' | 'analytics'
  from_date?: string
  to_date?: string
  filters?: Record<string, any>
}

class ApiClient {
  private client: AxiosInstance
  private token: string | null = null

  constructor() {
    this.client = axios.create({
      baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`
        }
        return config
      },
      (error) => Promise.reject(error)
    )

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          this.clearToken()
          window.location.href = '/login'
        } else if (error.response?.status >= 500) {
          toast.error('Server error. Please try again later.')
        }
        return Promise.reject(error)
      }
    )

    // Load token from localStorage
    this.loadToken()
  }

  private loadToken() {
    const stored = localStorage.getItem('vms_token')
    if (stored) {
      this.token = stored
    }
  }

  setToken(token: string) {
    this.token = token
    localStorage.setItem('vms_token', token)
  }

  clearToken() {
    this.token = null
    localStorage.removeItem('vms_token')
    localStorage.removeItem('vms_user')
  }

  // Auth endpoints
  async login(email: string, password: string, orgSlug?: string): Promise<LoginResponse> {
    const response = await this.client.post<LoginResponse>('/auth/login', {
      email,
      password,
      org_slug: orgSlug,
    })
    
    this.setToken(response.data.access_token)
    localStorage.setItem('vms_user', JSON.stringify(response.data.user))
    
    return response.data
  }

  async refreshToken(refreshToken: string): Promise<LoginResponse> {
    const response = await this.client.post<LoginResponse>('/auth/refresh', {
      refresh_token: refreshToken,
    })
    
    this.setToken(response.data.access_token)
    localStorage.setItem('vms_user', JSON.stringify(response.data.user))
    
    return response.data
  }

  async logout(): Promise<void> {
    try {
      await this.client.post('/auth/logout')
    } finally {
      this.clearToken()
    }
  }

  // Organization endpoints
  async getOrganization(orgId: string): Promise<Organization> {
    const response = await this.client.get<Organization>(`/organizations/${orgId}`)
    return response.data
  }

  async updateOrganization(orgId: string, data: Partial<Organization>): Promise<Organization> {
    const response = await this.client.put<Organization>(`/organizations/${orgId}`, data)
    return response.data
  }

  // Location endpoints
  async getLocations(orgId: string, params?: PaginationParams): Promise<ApiResponse<Location[]>> {
    const response = await this.client.get<ApiResponse<Location[]>>(`/organizations/${orgId}/locations`, {
      params,
    })
    return response.data
  }

  async createLocation(orgId: string, data: Omit<Location, 'id' | 'org_id' | 'created_at' | 'updated_at'>): Promise<Location> {
    const response = await this.client.post<Location>(`/organizations/${orgId}/locations`, data)
    return response.data
  }

  async updateLocation(orgId: string, locationId: string, data: Partial<Location>): Promise<Location> {
    const response = await this.client.put<Location>(`/organizations/${orgId}/locations/${locationId}`, data)
    return response.data
  }

  async deleteLocation(orgId: string, locationId: string): Promise<void> {
    await this.client.delete(`/organizations/${orgId}/locations/${locationId}`)
  }

  // Employee endpoints
  async getEmployees(orgId: string, params?: PaginationParams & { role?: string; status?: string }): Promise<ApiResponse<Employee[]>> {
    const response = await this.client.get<ApiResponse<Employee[]>>(`/organizations/${orgId}/employees`, {
      params,
    })
    return response.data
  }

  async createEmployee(orgId: string, data: Omit<Employee, 'id' | 'org_id' | 'created_at' | 'updated_at'>): Promise<Employee> {
    const response = await this.client.post<Employee>(`/organizations/${orgId}/employees`, data)
    return response.data
  }

  async updateEmployee(orgId: string, employeeId: string, data: Partial<Employee>): Promise<Employee> {
    const response = await this.client.put<Employee>(`/organizations/${orgId}/employees/${employeeId}`, data)
    return response.data
  }

  // Visitor endpoints
  async getVisitors(orgId: string, params?: VisitorFilters): Promise<ApiResponse<Visitor[]>> {
    const response = await this.client.get<ApiResponse<Visitor[]>>(`/organizations/${orgId}/visitors`, {
      params,
    })
    return response.data
  }

  async getVisitor(orgId: string, visitorId: string): Promise<Visitor> {
    const response = await this.client.get<Visitor>(`/organizations/${orgId}/visitors/${visitorId}`)
    return response.data
  }

  async createVisitor(orgId: string, data: Omit<Visitor, 'id' | 'created_at' | 'updated_at'>): Promise<Visitor> {
    const response = await this.client.post<Visitor>(`/organizations/${orgId}/visitors`, data)
    return response.data
  }

  async updateVisitor(orgId: string, visitorId: string, data: Partial<Visitor>): Promise<Visitor> {
    const response = await this.client.put<Visitor>(`/organizations/${orgId}/visitors/${visitorId}`, data)
    return response.data
  }

  async deleteVisitor(orgId: string, visitorId: string): Promise<void> {
    await this.client.delete(`/organizations/${orgId}/visitors/${visitorId}`)
  }

  // Visit endpoints
  async getVisits(orgId: string, params?: VisitFilters): Promise<ApiResponse<Visit[]>> {
    const response = await this.client.get<ApiResponse<Visit[]>>(`/organizations/${orgId}/visits`, {
      params,
    })
    return response.data
  }

  async getVisit(orgId: string, visitId: string): Promise<Visit> {
    const response = await this.client.get<Visit>(`/organizations/${orgId}/visits/${visitId}`)
    return response.data
  }

  async createVisit(orgId: string, data: Omit<Visit, 'id' | 'org_id' | 'created_at' | 'updated_at'>): Promise<Visit> {
    const response = await this.client.post<Visit>(`/organizations/${orgId}/visits`, data)
    return response.data
  }

  async updateVisit(orgId: string, visitId: string, data: Partial<Visit>): Promise<Visit> {
    const response = await this.client.put<Visit>(`/organizations/${orgId}/visits/${visitId}`, data)
    return response.data
  }

  async checkInVisit(orgId: string, visitId: string, data: { photo_url?: string; signature_url?: string; agreements_signed?: string[] }): Promise<Visit> {
    const response = await this.client.post<Visit>(`/organizations/${orgId}/visits/${visitId}/check-in`, data)
    return response.data
  }

  async checkOutVisit(orgId: string, visitId: string, data?: { notes?: string }): Promise<Visit> {
    const response = await this.client.post<Visit>(`/organizations/${orgId}/visits/${visitId}/check-out`, data)
    return response.data
  }

  // Analytics endpoints
  async getVisitAnalytics(orgId: string, params?: AnalyticsParams): Promise<VisitAnalytics> {
    const response = await this.client.get<VisitAnalytics>(`/organizations/${orgId}/analytics/visits`, {
      params,
    })
    return response.data
  }

  async exportAnalytics(orgId: string, params: ExportParams): Promise<Blob> {
    const response = await this.client.post(`/organizations/${orgId}/analytics/export`, params, {
      responseType: 'blob',
    })
    return response.data
  }

  // Privacy & Security endpoints
  async getPIIAccessLogs(orgId: string, params?: {
    resourceType?: string
    resourceId?: string
    fromDate?: string
    toDate?: string
  }): Promise<any[]> {
    const response = await this.client.get(`/organizations/${orgId}/privacy/pii-access-logs`, {
      params,
    })
    return response.data
  }

  async createGDPRExportRequest(orgId: string, data: { email: string; phone?: string }): Promise<any> {
    const response = await this.client.post(`/organizations/${orgId}/privacy/gdpr-requests/export`, data)
    return response.data
  }

  async createGDPRDeletionRequest(orgId: string, data: { email: string; phone?: string }): Promise<any> {
    const response = await this.client.post(`/organizations/${orgId}/privacy/gdpr-requests/delete`, data)
    return response.data
  }

  async getGDPRRequests(orgId: string): Promise<any[]> {
    const response = await this.client.get(`/organizations/${orgId}/privacy/gdpr-requests`)
    return response.data
  }

  async updateDataRetentionPolicy(orgId: string, policy: {
    resourceType: string
    retentionPeriodDays: number
    autoDeleteEnabled: boolean
    legalHoldExemption: boolean
  }): Promise<void> {
    await this.client.put(`/organizations/${orgId}/privacy/data-retention`, policy)
  }

  async runDataRetentionCleanup(orgId: string): Promise<void> {
    await this.client.post(`/organizations/${orgId}/privacy/data-retention/cleanup`)
  }

  // Webhook endpoints
  async getWebhooks(orgId: string): Promise<any[]> {
    const response = await this.client.get(`/organizations/${orgId}/webhooks`)
    return response.data
  }

  async createWebhook(orgId: string, data: { url: string; events: string[]; is_active?: boolean }): Promise<any> {
    const response = await this.client.post(`/organizations/${orgId}/webhooks`, data)
    return response.data
  }

  // File upload helper
  async uploadFile(file: File, type: 'photo' | 'signature' | 'document'): Promise<string> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', type)

    const response = await this.client.post<{ url: string }>('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })

    return response.data.url
  }
}

export const apiClient = new ApiClient()
export default apiClient