import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Users, 
  UserCheck, 
  Clock, 
  TrendingUp, 
  MapPin, 
  Calendar,
  Download,
  RefreshCw
} from 'lucide-react'
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'
import { useAuthStore } from '@/stores/auth'
import { ConditionalRender } from '@/components/auth/ProtectedRoute'
import apiClient from '@/lib/api-client'
import type { VisitAnalytics } from '@vms/contracts'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

export default function DashboardPage() {
  const { user } = useAuthStore()
  const [dateRange, setDateRange] = useState({
    from: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd')
  })

  const {
    data: analytics,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['analytics', user?.org_id, dateRange],
    queryFn: () => apiClient.getVisitAnalytics(user!.org_id, {
      period: 'day',
      from_date: dateRange.from,
      to_date: dateRange.to
    }),
    enabled: !!user?.org_id,
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  })

  const {
    data: recentVisits,
    isLoading: isLoadingVisits
  } = useQuery({
    queryKey: ['recent-visits', user?.org_id],
    queryFn: () => apiClient.getVisits(user!.org_id, {
      limit: 10,
      status: 'CHECKED_IN'
    }),
    enabled: !!user?.org_id,
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
  })

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's what's happening with your visitors.
          </p>
        </div>
        
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load dashboard data. Please try again.
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => refetch()}
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
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's what's happening with your visitors.
          </p>
        </div>
        
        <ConditionalRender requiredPermissions={['report:export']}>
          <Button onClick={() => handleExport('dashboard')}>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </ConditionalRender>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Visits"
          value={analytics?.total_visits}
          icon={Users}
          isLoading={isLoading}
        />
        <MetricCard
          title="Unique Visitors"
          value={analytics?.unique_visitors}
          icon={UserCheck}
          isLoading={isLoading}
        />
        <MetricCard
          title="Avg Duration"
          value={analytics?.average_duration ? `${Math.round(analytics.average_duration)} min` : undefined}
          icon={Clock}
          isLoading={isLoading}
        />
        <MetricCard
          title="Currently Checked In"
          value={recentVisits?.data?.length}
          icon={TrendingUp}
          isLoading={isLoadingVisits}
        />
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="locations">Locations</TabsTrigger>
          <TabsTrigger value="recent">Recent Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Visit Trends</CardTitle>
                <CardDescription>Daily visit counts over the selected period</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
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

            <Card>
              <CardHeader>
                <CardTitle>Visit Purposes</CardTitle>
                <CardDescription>Breakdown of visit purposes</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
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
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Peak Hours</CardTitle>
                <CardDescription>Busiest times of the day</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
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
                      <Bar dataKey="count" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Visits by Location</CardTitle>
                <CardDescription>Distribution across locations</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
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

        <TabsContent value="locations" className="space-y-4">
          <LocationOverview />
        </TabsContent>

        <TabsContent value="recent" className="space-y-4">
          <RecentActivity visits={recentVisits?.data || []} isLoading={isLoadingVisits} />
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

function LocationOverview() {
  const { user } = useAuthStore()
  
  const { data: locations, isLoading } = useQuery({
    queryKey: ['locations', user?.org_id],
    queryFn: () => apiClient.getLocations(user!.org_id),
    enabled: !!user?.org_id,
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {locations?.data?.map((location) => (
        <Card key={location.id}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <div>
                  <h3 className="font-semibold">{location.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {location.city}, {location.state}
                  </p>
                </div>
              </div>
              <Badge variant={location.is_active ? "default" : "secondary"}>
                {location.is_active ? "Active" : "Inactive"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function RecentActivity({ visits, isLoading }: { visits: any[], isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (visits.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">No recent activity</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {visits.map((visit) => (
        <Card key={visit.id}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">
                    {visit.visitor?.first_name} {visit.visitor?.last_name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {visit.visitor?.company} • {visit.purpose}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <Badge variant="outline">
                  {visit.status}
                </Badge>
                <p className="text-xs text-muted-foreground mt-1">
                  {visit.check_in_time && format(new Date(visit.check_in_time), 'HH:mm')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

async function handleExport(type: string) {
  // Implementation for exporting dashboard data
  console.log('Exporting:', type)
}