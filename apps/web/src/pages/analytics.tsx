import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Heatmap,
} from 'recharts'
import {
  Calendar,
  Download,
  Filter,
  TrendingUp,
  Users,
  Clock,
  MapPin,
  Target,
  BarChart3,
  PieChart as PieChartIcon,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DatePickerWithRange } from '@/components/ui/date-range-picker'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { analyticsApi } from '@/lib/api/analytics'

const COLORS = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316']

const PRESET_RANGES = [
  { label: 'Last 7 days', value: 'last7days' },
  { label: 'Last 30 days', value: 'last30days' },
  { label: 'This week', value: 'thisweek' },
  { label: 'This month', value: 'thismonth' },
  { label: 'Last 3 months', value: 'last3months' },
  { label: 'This year', value: 'thisyear' },
]

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30),
    to: new Date(),
  })
  const [selectedLocations, setSelectedLocations] = useState<string[]>([])
  const [selectedHosts, setSelectedHosts] = useState<string[]>([])
  const [selectedPurposes, setSelectedPurposes] = useState<string[]>([])
  const [viewType, setViewType] = useState<'daily' | 'weekly' | 'monthly'>('daily')

  // Mock data for locations, hosts, purposes - replace with actual API calls
  const locations = [
    { id: '1', name: 'Main Office' },
    { id: '2', name: 'Branch Office' },
  ]
  
  const hosts = [
    { id: '1', name: 'John Admin' },
    { id: '2', name: 'Jane Manager' },
  ]
  
  const purposes = ['MEETING', 'INTERVIEW', 'DELIVERY', 'GUEST', 'OTHER']

  const filters = useMemo(() => ({
    locationIds: selectedLocations.length > 0 ? selectedLocations : undefined,
    hostIds: selectedHosts.length > 0 ? selectedHosts : undefined,
    purposes: selectedPurposes.length > 0 ? selectedPurposes : undefined,
    fromDate: dateRange.from?.toISOString(),
    toDate: dateRange.to?.toISOString(),
  }), [dateRange, selectedLocations, selectedHosts, selectedPurposes])

  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['analytics', 'overview', filters],
    queryFn: () => analyticsApi.getOverview(filters),
  })

  const { data: dailyData, isLoading: dailyLoading } = useQuery({
    queryKey: ['analytics', 'daily', filters],
    queryFn: () => analyticsApi.getDailyVisits(filters),
    enabled: viewType === 'daily',
  })

  const { data: weeklyData, isLoading: weeklyLoading } = useQuery({
    queryKey: ['analytics', 'weekly', filters],
    queryFn: () => analyticsApi.getWeeklyVisits(filters),
    enabled: viewType === 'weekly',
  })

  const { data: monthlyData, isLoading: monthlyLoading } = useQuery({
    queryKey: ['analytics', 'monthly', filters],
    queryFn: () => analyticsApi.getMonthlyVisits(filters),
    enabled: viewType === 'monthly',
  })

  const { data: heatmapData, isLoading: heatmapLoading } = useQuery({
    queryKey: ['analytics', 'heatmap', filters],
    queryFn: () => analyticsApi.getHeatmapData(filters),
  })

  const { data: retentionData, isLoading: retentionLoading } = useQuery({
    queryKey: ['analytics', 'retention', filters],
    queryFn: () => analyticsApi.getRetentionData(filters),
  })

  const handlePresetRange = (preset: string) => {
    const now = new Date()
    
    switch (preset) {
      case 'last7days':
        setDateRange({ from: subDays(now, 7), to: now })
        break
      case 'last30days':
        setDateRange({ from: subDays(now, 30), to: now })
        break
      case 'thisweek':
        setDateRange({ from: startOfWeek(now), to: endOfWeek(now) })
        break
      case 'thismonth':
        setDateRange({ from: startOfMonth(now), to: endOfMonth(now) })
        break
      case 'last3months':
        setDateRange({ from: subDays(now, 90), to: now })
        break
      case 'thisyear':
        setDateRange({ from: new Date(now.getFullYear(), 0, 1), to: now })
        break
    }
  }

  const handleExport = async (type: 'csv' | 'pdf', reportType: string) => {
    try {
      const blob = await analyticsApi.exportReport(type, reportType, filters)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${reportType}-analytics-${format(new Date(), 'yyyy-MM-dd')}.${type}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Export failed:', error)
    }
  }

  const chartData = useMemo(() => {
    switch (viewType) {
      case 'daily':
        return dailyData?.map(d => ({ ...d, date: format(new Date(d.date), 'MMM dd') })) || []
      case 'weekly':
        return weeklyData?.map(d => ({ ...d, date: format(new Date(d.week), 'MMM dd') })) || []
      case 'monthly':
        return monthlyData?.map(d => ({ ...d, date: format(new Date(d.month), 'MMM yyyy') })) || []
      default:
        return []
    }
  }, [viewType, dailyData, weeklyData, monthlyData])

  const heatmapChartData = useMemo(() => {
    if (!heatmapData) return []
    
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const hours = Array.from({ length: 24 }, (_, i) => i)
    
    return hours.map(hour => {
      const hourData = { hour: `${hour}:00` }
      days.forEach(day => {
        const dataPoint = heatmapData.find(d => d.hour === hour && d.day.trim() === day)
        hourData[day] = dataPoint?.visits || 0
      })
      return hourData
    })
  }, [heatmapData])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            Comprehensive visitor analytics and insights for your organization.
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => handleExport('csv', 'overview')}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => handleExport('pdf', 'overview')}>
            <Download className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="mr-2 h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Date Range</label>
              <div className="flex space-x-2">
                <DatePickerWithRange
                  date={dateRange}
                  onDateChange={setDateRange}
                />
                <Select onValueChange={handlePresetRange}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Preset" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRESET_RANGES.map(range => (
                      <SelectItem key={range.value} value={range.value}>
                        {range.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Locations</label>
              <Select value={selectedLocations.join(',')} onValueChange={(value) => setSelectedLocations(value ? value.split(',') : [])}>
                <SelectTrigger>
                  <SelectValue placeholder="All locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All locations</SelectItem>
                  {locations.map(location => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Hosts</label>
              <Select value={selectedHosts.join(',')} onValueChange={(value) => setSelectedHosts(value ? value.split(',') : [])}>
                <SelectTrigger>
                  <SelectValue placeholder="All hosts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All hosts</SelectItem>
                  {hosts.map(host => (
                    <SelectItem key={host.id} value={host.id}>
                      {host.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Purposes</label>
              <Select value={selectedPurposes.join(',')} onValueChange={(value) => setSelectedPurposes(value ? value.split(',') : [])}>
                <SelectTrigger>
                  <SelectValue placeholder="All purposes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All purposes</SelectItem>
                  {purposes.map(purpose => (
                    <SelectItem key={purpose} value={purpose}>
                      {purpose}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="heatmap">Peak Hours</TabsTrigger>
          <TabsTrigger value="locations">Locations</TabsTrigger>
          <TabsTrigger value="retention">Retention</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Visits</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {overviewLoading ? '...' : overview?.visitMetrics.totalVisits.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  {overview?.visitMetrics.checkedOutVisits} completed visits
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Wait Time</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {overviewLoading ? '...' : `${overview?.visitMetrics.averageWaitTime.toFixed(1)}m`}
                </div>
                <p className="text-xs text-muted-foreground">
                  From scheduled to check-in
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {overviewLoading ? '...' : `${overview?.visitMetrics.averageVisitDuration.toFixed(1)}m`}
                </div>
                <p className="text-xs text-muted-foreground">
                  Average visit length
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Peak Hour</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {overviewLoading ? '...' : `${overview?.visitMetrics.peakHour}:00`}
                </div>
                <p className="text-xs text-muted-foreground">
                  Busiest time of day
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Purpose Distribution */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Visit Purposes</CardTitle>
                <CardDescription>Distribution of visit purposes</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={overview?.purposeMetrics || []}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ purpose, percentage }) => `${purpose} (${percentage}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="totalVisits"
                    >
                      {overview?.purposeMetrics.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Locations</CardTitle>
                <CardDescription>Most visited locations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {overview?.locationMetrics.slice(0, 5).map((location, index) => (
                    <div key={location.locationId} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                          <MapPin className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-sm font-medium">{location.locationName}</div>
                          <div className="text-xs text-muted-foreground">
                            Peak: {location.peakHour}:00
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{location.totalVisits}</div>
                        <div className="text-xs text-muted-foreground">
                          {location.averageDuration.toFixed(0)}m avg
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Hosts */}
          <Card>
            <CardHeader>
              <CardTitle>Top Hosts</CardTitle>
              <CardDescription>Most active hosts by visit count</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {overview?.hostMetrics.slice(0, 8).map((host, index) => (
                  <div key={host.hostId} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                        <span className="text-sm font-medium">{index + 1}</span>
                      </div>
                      <div>
                        <div className="text-sm font-medium">{host.hostName}</div>
                        <div className="text-xs text-muted-foreground">
                          {host.averageWaitTime.toFixed(1)}m avg wait
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{host.totalVisits} visits</div>
                      <div className="text-xs text-muted-foreground">
                        {host.averageDuration.toFixed(0)}m avg duration
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Visit Trends
                <div className="flex items-center space-x-2">
                  <Select value={viewType} onValueChange={(value: any) => setViewType(value)}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleExport('csv', viewType)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </CardTitle>
              <CardDescription>
                Visit volume over time ({viewType} view)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="visits" 
                    stroke="#2563EB" 
                    strokeWidth={2}
                    dot={{ fill: '#2563EB', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="heatmap" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Peak Hours Heatmap
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleExport('csv', 'heatmap')}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </CardTitle>
              <CardDescription>
                Visitor activity by hour and day of week
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-96 w-full">
                {heatmapLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <div className="grid grid-cols-8 gap-1 h-full">
                    <div className="flex flex-col justify-between text-xs text-muted-foreground">
                      {Array.from({ length: 24 }, (_, i) => (
                        <div key={i} className="h-4 flex items-center">
                          {i}:00
                        </div>
                      ))}
                    </div>
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} className="space-y-1">
                        <div className="text-xs font-medium text-center mb-2">{day}</div>
                        {Array.from({ length: 24 }, (_, hour) => {
                          const visits = heatmapData?.find(d => d.hour === hour && d.day.trim() === day.padEnd(9))?.visits || 0
                          const maxVisits = Math.max(...(heatmapData?.map(d => d.visits) || [1]))
                          const intensity = visits / maxVisits
                          return (
                            <div
                              key={hour}
                              className="h-4 rounded-sm border"
                              style={{
                                backgroundColor: `rgba(37, 99, 235, ${intensity})`,
                              }}
                              title={`${day} ${hour}:00 - ${visits} visits`}
                            />
                          )
                        })}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center justify-center mt-4 space-x-4 text-xs text-muted-foreground">
                <div className="flex items-center space-x-2">
                  <div className="h-3 w-3 rounded-sm bg-blue-100"></div>
                  <span>Low activity</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="h-3 w-3 rounded-sm bg-blue-300"></div>
                  <span>Medium activity</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="h-3 w-3 rounded-sm bg-blue-600"></div>
                  <span>High activity</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="locations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Location Performance
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleExport('csv', 'locations')}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </CardTitle>
              <CardDescription>
                Visit metrics by location
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={overview?.locationMetrics || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="locationName" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="totalVisits" fill="#2563EB" name="Total Visits" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Location Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {overview?.locationMetrics.map((location) => (
                  <div key={location.locationId} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <MapPin className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">{location.locationName}</div>
                        <div className="text-sm text-muted-foreground">
                          Peak hour: {location.peakHour}:00
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{location.totalVisits} visits</div>
                      <div className="text-sm text-muted-foreground">
                        {location.averageDuration.toFixed(0)}m avg duration
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="retention" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Visitor Retention
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleExport('csv', 'retention')}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </CardTitle>
              <CardDescription>
                New vs returning visitors over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={retentionData || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="newVisitors" stackId="a" fill="#10B981" name="New Visitors" />
                  <Bar dataKey="returningVisitors" stackId="a" fill="#2563EB" name="Returning Visitors" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Retention Metrics</CardTitle>
              <CardDescription>
                Weekly retention rates and visitor patterns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {retentionData?.slice(0, 8).map((period) => (
                  <div key={period.period} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">Week of {format(new Date(period.period), 'MMM dd, yyyy')}</div>
                      <div className="text-sm text-muted-foreground">
                        {period.totalVisitors} total visitors
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary">{period.newVisitors} new</Badge>
                        <Badge variant="default">{period.returningVisitors} returning</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {period.retentionRate.toFixed(1)}% retention
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}