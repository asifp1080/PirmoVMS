import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { toast } from 'sonner'
import { 
  Download, 
  FileText, 
  Calendar, 
  Filter,
  TrendingUp,
  Users,
  Clock,
  MapPin,
  RefreshCw
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

import { useAuthStore } from '@/stores/auth'
import { ConditionalRender } from '@/components/auth/ProtectedRoute'
import apiClient from '@/lib/api-client'
import type { VisitAnalytics } from '@vms/contracts'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

export default function ReportsPage() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month' | 'year'>('month')
  const [selectedLocation, setSelectedLocation] = useState<string>('')
  const [dateRange, setDateRange] = useState({
    from: startOfMonth(subMonths(new Date(), 2)),
    to: endOfMonth(new Date())
  })

  // Fetch analytics data
  const {
    data: analytics,
    isLoading: isLoadingAnalytics,
    error: analyticsError,
    refetch: refetchAnalytics
  } = useQuery({
    queryKey: ['analytics', user?.org_id, selectedPeriod, selectedLocation, dateRange],
    queryFn: () => apiClient.getVisitAnalytics(user!.org_id, {
      period: selectedPeriod,
      from_date: format(dateRange.from, 'yyyy-MM-dd'),
      to_date: format(dateRange.to, 'yyyy-MM-dd'),
      location_id: selectedLocation || undefined,
    }),
    enabled: !!user?.org_id,
  })

  // Fetch locations for filter
  const { data: locations } = useQuery({
    queryKey: ['locations', user?.org_id],
    queryFn: () => apiClient.getLocations(user!.org_id),
    enabled: !!user?.org_id,
  })

  // Export mutation
  const exportMutation = useMutation({
    mutationFn: async (params: { format: 'csv' | 'pdf' | 'json', dataType: 'visits' | 'visitors' | 'analytics' }) => {
      const blob = await apiClient.exportAnalytics(user!.org_id, {
        format: params.format,
        data_type: params.dataType,
        from_date: format(dateRange.from, 'yyyy-MM-dd'),
        to_date: format(dateRange.to, 'yyyy-MM-dd'),
        filters: {
          location_id: selectedLocation,
          period: selectedPeriod,
        },
      })
      
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${params.dataType}-report-${format(new Date(), 'yyyy-MM-dd')}.${params.format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    },
    onSuccess: () => {
      toast.success('Report exported successfully')
    },
    onError: () => {
      toast.error('Failed to export report')
    },
  })

  const handleExport = (format: 'csv' | 'pdf' | 'json', dataType: 'visits' | 'visitors' | 'analytics') => {
    exportMutation.mutate({ format, dataType })
  }

  if (analyticsError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
          <p className="text-muted-foreground">
            Generate insights and export data from your visitor management system.
          </p>
        </div>
        
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load analytics data. Please try again.
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => refetchAnalytics()}
              className="ml-2"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
          <p className="text-muted-foreground">
            Generate insights and export data from your visitor management system.
          </p>
        </div>
        
        <ConditionalRender requiredPermissions={['report:export']}>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              onClick={() => handleExport('csv', 'analytics')}
              disabled={exportMutation.isPending}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button 
              variant="outline" 
              onClick={() => handleExport('pdf', 'analytics')}
              disabled={exportMutation.isPending}
            >
              <FileText className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </ConditionalRender>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            Customize your analytics view
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Period</label>
              <Select value={selectedPeriod} onValueChange={(value: any) => setSelectedPeriod(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Daily</SelectItem>
                  <SelectItem value="week">Weekly</SelectItem>
                  <SelectItem value="month">Monthly</SelectItem>
                  <SelectItem value="year">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Location</label>
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All locations</SelectItem>
                  {locations?.data?.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Visits"
          value={analytics?.total_visits}
          icon={Users}
          isLoading={isLoadingAnalytics}
        />
        <MetricCard
          title="Unique Visitors"
          value={analytics?.unique_visitors}
          icon={TrendingUp}
          isLoading={isLoadingAnalytics}
        />
        <MetricCard
          title="Avg Duration"
          value={analytics?.average_duration ? `${Math.round(analytics.average_duration)} min` : undefined}
          icon={Clock}
          isLoading={isLoadingAnalytics}
        />
        <MetricCard
          title="Locations"
          value={analytics?.visits_by_location?.length}
          icon={MapPin}
          isLoading={isLoadingAnalytics}
        />
      </div>

      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
          <TabsTrigger value="heatmap">Peak Hours</TabsTrigger>
          <TabsTrigger value="exports">Exports</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Visit Trends</CardTitle>
              <CardDescription>
                {selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)} visit counts over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingAnalytics ? (
                <Skeleton className="h-[400px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={analytics?.daily_counts || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(value) => format(new Date(value), 'MMM dd, yyyy')}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="count" 
                      stroke="#8884d8" 
                      strokeWidth={2}
                      dot={{ fill: '#8884d8' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="breakdown" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Visits by Purpose</CardTitle>
                <CardDescription>
                  Distribution of visit purposes
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingAnalytics ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={analytics?.visits_by_purpose || []}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ purpose, percent }) => `${purpose} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {analytics?.visits_by_purpose?.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Visits by Location</CardTitle>
                <CardDescription>
                  Distribution across locations
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingAnalytics ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analytics?.visits_by_location || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="location_name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#00C49F" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="heatmap" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Peak Hours Heatmap</CardTitle>
              <CardDescription>
                Busiest times of the day for visitor check-ins
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingAnalytics ? (
                <Skeleton className="h-[400px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={analytics?.peak_hours || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="hour" 
                      tickFormatter={(value) => `${value}:00`}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(value) => `${value}:00`}
                    />
                    <Bar dataKey="count" fill="#FFBB28" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exports" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Visitor Data</CardTitle>
                <CardDescription>
                  Export visitor information and history
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  className="w-full" 
                  onClick={() => handleExport('csv', 'visitors')}
                  disabled={exportMutation.isPending}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => handleExport('pdf', 'visitors')}
                  disabled={exportMutation.isPending}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Visit Records</CardTitle>
                <CardDescription>
                  Export visit logs and check-in data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  className="w-full" 
                  onClick={() => handleExport('csv', 'visits')}
                  disabled={exportMutation.isPending}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => handleExport('json', 'visits')}
                  disabled={exportMutation.isPending}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Export JSON
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Analytics Report</CardTitle>
                <CardDescription>
                  Export comprehensive analytics data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  className="w-full" 
                  onClick={() => handleExport('pdf', 'analytics')}
                  disabled={exportMutation.isPending}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Full Report (PDF)
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => handleExport('json', 'analytics')}
                  disabled={exportMutation.isPending}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Raw Data (JSON)
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function MetricCard({ 
  title, 
  value, 
  icon: Icon, 
  isLoading 
}: { 
  title: string
  value?: string | number
  icon: any
  isLoading: boolean 
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <div className="text-2xl font-bold">{value ?? '—'}</div>
        )}
      </CardContent>
    </Card>
  )
}