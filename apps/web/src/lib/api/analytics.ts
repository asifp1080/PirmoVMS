import { apiClient } from './client'

export interface AnalyticsFilters {
  locationIds?: string[]
  hostIds?: string[]
  purposes?: string[]
  fromDate?: string
  toDate?: string
}

export interface VisitMetrics {
  totalVisits: number
  checkedInVisits: number
  checkedOutVisits: number
  noShowVisits: number
  averageWaitTime: number
  averageVisitDuration: number
  peakHour: number
  peakDay: string
}

export interface LocationMetrics {
  locationId: string
  locationName: string
  totalVisits: number
  averageDuration: number
  peakHour: number
}

export interface HostMetrics {
  hostId: string
  hostName: string
  totalVisits: number
  averageWaitTime: number
  averageDuration: number
}

export interface PurposeMetrics {
  purpose: string
  totalVisits: number
  percentage: number
  averageDuration: number
}

export interface HeatmapData {
  hour: number
  day: string
  visits: number
}

export interface VisitorRetentionData {
  period: string
  newVisitors: number
  returningVisitors: number
  totalVisitors: number
  retentionRate: number
}

export interface AnalyticsOverview {
  visitMetrics: VisitMetrics
  locationMetrics: LocationMetrics[]
  hostMetrics: HostMetrics[]
  purposeMetrics: PurposeMetrics[]
  visitorRetention: VisitorRetentionData[]
}

export const analyticsApi = {
  async getOverview(filters: AnalyticsFilters): Promise<AnalyticsOverview> {
    const params = new URLSearchParams()
    
    if (filters.locationIds?.length) {
      params.append('locationIds', filters.locationIds.join(','))
    }
    if (filters.hostIds?.length) {
      params.append('hostIds', filters.hostIds.join(','))
    }
    if (filters.purposes?.length) {
      params.append('purposes', filters.purposes.join(','))
    }
    if (filters.fromDate) {
      params.append('fromDate', filters.fromDate)
    }
    if (filters.toDate) {
      params.append('toDate', filters.toDate)
    }

    const response = await apiClient.get(`/analytics/overview?${params.toString()}`)
    return response.data
  },

  async getDailyVisits(filters: AnalyticsFilters): Promise<{ date: string; visits: number }[]> {
    const params = new URLSearchParams()
    
    if (filters.locationIds?.length) {
      params.append('locationIds', filters.locationIds.join(','))
    }
    if (filters.hostIds?.length) {
      params.append('hostIds', filters.hostIds.join(','))
    }
    if (filters.purposes?.length) {
      params.append('purposes', filters.purposes.join(','))
    }
    if (filters.fromDate) {
      params.append('fromDate', filters.fromDate)
    }
    if (filters.toDate) {
      params.append('toDate', filters.toDate)
    }

    const response = await apiClient.get(`/analytics/visits/daily?${params.toString()}`)
    return response.data
  },

  async getWeeklyVisits(filters: AnalyticsFilters): Promise<{ week: string; visits: number }[]> {
    const params = new URLSearchParams()
    
    if (filters.locationIds?.length) {
      params.append('locationIds', filters.locationIds.join(','))
    }
    if (filters.hostIds?.length) {
      params.append('hostIds', filters.hostIds.join(','))
    }
    if (filters.purposes?.length) {
      params.append('purposes', filters.purposes.join(','))
    }
    if (filters.fromDate) {
      params.append('fromDate', filters.fromDate)
    }
    if (filters.toDate) {
      params.append('toDate', filters.toDate)
    }

    const response = await apiClient.get(`/analytics/visits/weekly?${params.toString()}`)
    return response.data
  },

  async getMonthlyVisits(filters: AnalyticsFilters): Promise<{ month: string; visits: number }[]> {
    const params = new URLSearchParams()
    
    if (filters.locationIds?.length) {
      params.append('locationIds', filters.locationIds.join(','))
    }
    if (filters.hostIds?.length) {
      params.append('hostIds', filters.hostIds.join(','))
    }
    if (filters.purposes?.length) {
      params.append('purposes', filters.purposes.join(','))
    }
    if (filters.fromDate) {
      params.append('fromDate', filters.fromDate)
    }
    if (filters.toDate) {
      params.append('toDate', filters.toDate)
    }

    const response = await apiClient.get(`/analytics/visits/monthly?${params.toString()}`)
    return response.data
  },

  async getHeatmapData(filters: AnalyticsFilters): Promise<HeatmapData[]> {
    const params = new URLSearchParams()
    
    if (filters.locationIds?.length) {
      params.append('locationIds', filters.locationIds.join(','))
    }
    if (filters.hostIds?.length) {
      params.append('hostIds', filters.hostIds.join(','))
    }
    if (filters.purposes?.length) {
      params.append('purposes', filters.purposes.join(','))
    }
    if (filters.fromDate) {
      params.append('fromDate', filters.fromDate)
    }
    if (filters.toDate) {
      params.append('toDate', filters.toDate)
    }

    const response = await apiClient.get(`/analytics/heatmap?${params.toString()}`)
    return response.data
  },

  async getLocationMetrics(filters: AnalyticsFilters): Promise<LocationMetrics[]> {
    const params = new URLSearchParams()
    
    if (filters.locationIds?.length) {
      params.append('locationIds', filters.locationIds.join(','))
    }
    if (filters.fromDate) {
      params.append('fromDate', filters.fromDate)
    }
    if (filters.toDate) {
      params.append('toDate', filters.toDate)
    }

    const response = await apiClient.get(`/analytics/locations?${params.toString()}`)
    return response.data
  },

  async getHostMetrics(filters: AnalyticsFilters): Promise<HostMetrics[]> {
    const params = new URLSearchParams()
    
    if (filters.hostIds?.length) {
      params.append('hostIds', filters.hostIds.join(','))
    }
    if (filters.fromDate) {
      params.append('fromDate', filters.fromDate)
    }
    if (filters.toDate) {
      params.append('toDate', filters.toDate)
    }

    const response = await apiClient.get(`/analytics/hosts?${params.toString()}`)
    return response.data
  },

  async getPurposeMetrics(filters: AnalyticsFilters): Promise<PurposeMetrics[]> {
    const params = new URLSearchParams()
    
    if (filters.purposes?.length) {
      params.append('purposes', filters.purposes.join(','))
    }
    if (filters.fromDate) {
      params.append('fromDate', filters.fromDate)
    }
    if (filters.toDate) {
      params.append('toDate', filters.toDate)
    }

    const response = await apiClient.get(`/analytics/purposes?${params.toString()}`)
    return response.data
  },

  async getRetentionData(filters: AnalyticsFilters): Promise<VisitorRetentionData[]> {
    const params = new URLSearchParams()
    
    if (filters.fromDate) {
      params.append('fromDate', filters.fromDate)
    }
    if (filters.toDate) {
      params.append('toDate', filters.toDate)
    }

    const response = await apiClient.get(`/analytics/retention?${params.toString()}`)
    return response.data
  },

  async exportReport(
    format: 'csv' | 'pdf',
    type: string,
    filters: AnalyticsFilters
  ): Promise<Blob> {
    const params = new URLSearchParams()
    params.append('type', type)
    
    if (filters.locationIds?.length) {
      params.append('locationIds', filters.locationIds.join(','))
    }
    if (filters.hostIds?.length) {
      params.append('hostIds', filters.hostIds.join(','))
    }
    if (filters.purposes?.length) {
      params.append('purposes', filters.purposes.join(','))
    }
    if (filters.fromDate) {
      params.append('fromDate', filters.fromDate)
    }
    if (filters.toDate) {
      params.append('toDate', filters.toDate)
    }

    const response = await apiClient.get(`/analytics/export/${format}?${params.toString()}`, {
      responseType: 'blob',
    })
    
    return response.data
  },
}