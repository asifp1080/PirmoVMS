import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Users, 
  UserCheck, 
  Clock, 
  TrendingUp, 
  Plus,
  Printer,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import { formatDate, formatDuration, getInitials } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'
import { visitsApi } from '@/lib/api/client'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts'

// Mock data for charts
const weeklyData = [
  { day: 'Mon', visits: 24 },
  { day: 'Tue', visits: 32 },
  { day: 'Wed', visits: 28 },
  { day: 'Thu', visits: 45 },
  { day: 'Fri', visits: 38 },
  { day: 'Sat', visits: 12 },
  { day: 'Sun', visits: 8 },
]

const hourlyData = [
  { hour: '8AM', visits: 5 },
  { hour: '9AM', visits: 12 },
  { hour: '10AM', visits: 18 },
  { hour: '11AM', visits: 22 },
  { hour: '12PM', visits: 15 },
  { hour: '1PM', visits: 8 },
  { hour: '2PM', visits: 25 },
  { hour: '3PM', visits: 28 },
  { hour: '4PM', visits: 20 },
  { hour: '5PM', visits: 10 },
]

export default function DashboardPage() {
  const { user } = useAuthStore()

  // Fetch current visits
  const { data: currentVisits, isLoading } = useQuery({
    queryKey: ['visits', 'current'],
    queryFn: () => visitsApi.list(user!.org_id, { 
      status: 'CHECKED_IN',
      limit: 10 
    }),
    enabled: !!user?.org_id,
  })

  // Mock stats - in real app, these would come from API
  const stats = {
    currentlyIn: 24,
    todayArrivals: 67,
    avgDuration: 125, // minutes
    weeklyGrowth: 12.5,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.first_name}. Here's what's happening today.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Register Visitor
          </Button>
          <Button variant="outline">
            <Printer className="mr-2 h-4 w-4" />
            Print Badge
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Currently In</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.currentlyIn}</div>
            <p className="text-xs text-muted-foreground">
              Active visitors on-site
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Arrivals</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayArrivals}</div>
            <p className="text-xs text-muted-foreground">
              +{stats.weeklyGrowth}% from last week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(stats.avgDuration)}</div>
            <p className="text-xs text-muted-foreground">
              Average visit length
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Weekly Growth</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{stats.weeklyGrowth}%</div>
            <p className="text-xs text-muted-foreground">
              <ArrowUpRight className="inline h-3 w-3 text-green-500" />
              Compared to last week
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Currently In List */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Currently In Building</CardTitle>
            <CardDescription>
              Visitors who are currently checked in
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-muted rounded animate-pulse" />
                      <div className="h-3 bg-muted rounded w-2/3 animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {currentVisits?.data?.slice(0, 5).map((visit: any) => (
                  <div key={visit.id} className="flex items-center space-x-4">
                    <Avatar>
                      <AvatarImage src={visit.visitor.photo_url} />
                      <AvatarFallback>
                        {getInitials(visit.visitor.first_name, visit.visitor.last_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {visit.visitor.first_name} {visit.visitor.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {visit.visitor.company} • {visit.purpose}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary">{visit.badge_number}</Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(visit.check_in_time, 'time')}
                      </p>
                    </div>
                  </div>
                ))}
                {(!currentVisits?.data || currentVisits.data.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    No visitors currently checked in
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Weekly Trend Chart */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Weekly Visits</CardTitle>
            <CardDescription>
              Visitor traffic over the past week
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="visits" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Hourly Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Today's Hourly Distribution</CardTitle>
          <CardDescription>
            Visitor check-ins by hour of the day
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="visits" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}