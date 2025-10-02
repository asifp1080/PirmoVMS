import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  LayoutDashboard,
  Users,
  UserCheck,
  UserPlus,
  FileText,
  MapPin,
  Monitor,
  Settings,
  BarChart3,
  Shield,
  Building2,
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Visitors', href: '/visitors', icon: Users },
  { name: 'Visits', href: '/visits', icon: UserCheck },
  { name: 'Employees', href: '/employees', icon: UserPlus },
  { name: 'Agreements', href: '/agreements', icon: FileText },
  { name: 'Locations', href: '/locations', icon: MapPin },
  { name: 'Kiosks', href: '/kiosks', icon: Monitor },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Audit', href: '/audit', icon: Shield },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export function Sidebar() {
  const location = useLocation()

  return (
    <div className="flex flex-col w-64 bg-card border-r">
      <div className="flex items-center h-16 px-6 border-b">
        <div className="flex items-center">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <Building2 className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="ml-3 text-xl font-semibold">VMS</span>
        </div>
      </div>
      
      <nav className="flex-1 px-4 py-6 space-y-1">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href
          return (
            <Link key={item.name} to={item.href}>
              <Button
                variant={isActive ? 'secondary' : 'ghost'}
                className={cn(
                  'w-full justify-start',
                  isActive && 'bg-secondary text-secondary-foreground'
                )}
              >
                <item.icon className="mr-3 h-4 w-4" />
                {item.name}
              </Button>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}