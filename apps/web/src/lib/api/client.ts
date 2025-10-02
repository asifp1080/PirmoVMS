import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import { useAuthStore } from '@/stores/auth-store'

class ApiClient {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: import.meta.env.VITE_API_URL || '/api/v1',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.setupInterceptors()
  }

  private setupInterceptors() {
    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = useAuthStore.getState().token
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      (error) => Promise.reject(error)
    )

    // Response interceptor to handle token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true

          try {
            const refreshToken = useAuthStore.getState().refreshToken
            if (refreshToken) {
              const response = await this.client.post('/auth/refresh', {
                refresh_token: refreshToken,
              })

              const { access_token, refresh_token: newRefreshToken, user } = response.data
              useAuthStore.getState().login(user, access_token, newRefreshToken)

              originalRequest.headers.Authorization = `Bearer ${access_token}`
              return this.client(originalRequest)
            }
          } catch (refreshError) {
            useAuthStore.getState().logout()
            window.location.href = '/login'
          }
        }

        return Promise.reject(error)
      }
    )
  }

  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.get(url, config)
    return response.data
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.post(url, data, config)
    return response.data
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.put(url, data, config)
    return response.data
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.patch(url, data, config)
    return response.data
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.delete(url, config)
    return response.data
  }
}

export const apiClient = new ApiClient()

// Auth API
export const authApi = {
  login: (data: { email: string; password: string; org_slug?: string }) =>
    apiClient.post('/auth/login', data),
  
  register: (data: {
    first_name: string
    last_name: string
    email: string
    password: string
    org_slug: string
  }) => apiClient.post('/auth/register', data),
  
  refresh: (refresh_token: string) =>
    apiClient.post('/auth/refresh', { refresh_token }),
  
  logout: () => apiClient.post('/auth/logout'),
}

// Organizations API
export const organizationsApi = {
  list: (params?: { cursor?: string; limit?: number }) =>
    apiClient.get('/organizations', { params }),
  
  get: (orgId: string) => apiClient.get(`/organizations/${orgId}`),
}

// Locations API
export const locationsApi = {
  list: (orgId: string, params?: { cursor?: string; limit?: number }) =>
    apiClient.get(`/organizations/${orgId}/locations`, { params }),
  
  create: (orgId: string, data: any) =>
    apiClient.post(`/organizations/${orgId}/locations`, data),
  
  update: (orgId: string, locationId: string, data: any) =>
    apiClient.put(`/organizations/${orgId}/locations/${locationId}`, data),
  
  delete: (orgId: string, locationId: string) =>
    apiClient.delete(`/organizations/${orgId}/locations/${locationId}`),
}

// Employees API
export const employeesApi = {
  list: (orgId: string, params?: {
    cursor?: string
    limit?: number
    role?: string
    is_host?: boolean
    location_id?: string
  }) => apiClient.get(`/organizations/${orgId}/employees`, { params }),
  
  create: (orgId: string, data: any) =>
    apiClient.post(`/organizations/${orgId}/employees`, data),
  
  update: (orgId: string, employeeId: string, data: any) =>
    apiClient.put(`/organizations/${orgId}/employees/${employeeId}`, data),
  
  delete: (orgId: string, employeeId: string) =>
    apiClient.delete(`/organizations/${orgId}/employees/${employeeId}`),
}

// Visitors API
export const visitorsApi = {
  list: (orgId: string, params?: {
    cursor?: string
    limit?: number
    search?: string
  }) => apiClient.get(`/organizations/${orgId}/visitors`, { params }),
  
  create: (orgId: string, data: any) =>
    apiClient.post(`/organizations/${orgId}/visitors`, data),
  
  update: (orgId: string, visitorId: string, data: any) =>
    apiClient.put(`/organizations/${orgId}/visitors/${visitorId}`, data),
  
  delete: (orgId: string, visitorId: string) =>
    apiClient.delete(`/organizations/${orgId}/visitors/${visitorId}`),
}

// Visits API
export const visitsApi = {
  list: (orgId: string, params?: {
    cursor?: string
    limit?: number
    status?: string
    location_id?: string
    from_date?: string
    to_date?: string
  }) => apiClient.get(`/organizations/${orgId}/visits`, { params }),
  
  create: (orgId: string, data: any) =>
    apiClient.post(`/organizations/${orgId}/visits`, data),
  
  checkIn: (orgId: string, visitId: string, data: any) =>
    apiClient.post(`/organizations/${orgId}/visits/${visitId}/check-in`, data),
  
  checkOut: (orgId: string, visitId: string) =>
    apiClient.post(`/organizations/${orgId}/visits/${visitId}/check-out`),
}

// Kiosk API
export const kioskApi = {
  session: (data: {
    device_identifier: string
    location_id: string
    app_version?: string
  }) => apiClient.post('/kiosk/session', data),
}