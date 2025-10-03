import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Building2, Palette, Globe, Settings } from 'lucide-react'
import { useAuthStore } from '@/stores/auth'
import apiClient from '@/lib/api-client'

interface OrganizationTheme {
  primaryColor: string
  secondaryColor: string
  logoUrl: string
  favicon: string
  customCss?: string
}

interface OrganizationBranding {
  id: string
  name: string
  slug: string
  logoUrl?: string
  theme: OrganizationTheme
  settings: {
    allowMultiTenant: boolean
    defaultLanguage: string
    supportedLanguages: string[]
  }
}

export function OrganizationSwitcher() {
  const { user, login } = useAuthStore()
  const [selectedOrgId, setSelectedOrgId] = useState(user?.org_id)

  // Fetch user's organizations (for multi-tenant users)
  const { data: organizations, isLoading } = useQuery({
    queryKey: ['user-organizations', user?.id],
    queryFn: async () => {
      // Mock multi-tenant organizations
      return [
        {
          id: user?.org_id || 'org-1',
          name: 'Main Organization',
          slug: 'main-org',
          logoUrl: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=200&q=80',
          theme: {
            primaryColor: '#3b82f6',
            secondaryColor: '#64748b',
            logoUrl: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=200&q=80',
            favicon: '/favicon.ico',
          },
          settings: {
            allowMultiTenant: true,
            defaultLanguage: 'en',
            supportedLanguages: ['en', 'es', 'fr'],
          },
        },
      ] as OrganizationBranding[]
    },
    enabled: !!user?.id,
  })

  // Fetch current organization branding
  const { data: currentOrg } = useQuery({
    queryKey: ['organization-branding', selectedOrgId],
    queryFn: () => apiClient.getOrganization(selectedOrgId!),
    enabled: !!selectedOrgId,
  })

  // Apply organization theme
  useEffect(() => {
    if (currentOrg && organizations) {
      const orgBranding = organizations.find(org => org.id === currentOrg.id)
      if (orgBranding) {
        applyOrganizationTheme(orgBranding.theme)
      }
    }
  }, [currentOrg, organizations])

  const handleOrganizationSwitch = async (orgId: string) => {
    try {
      setSelectedOrgId(orgId)
      
      // In a real implementation, you'd need to get a new token for the new org
      // For now, we'll just update the user's org_id
      if (user) {
        const updatedUser = { ...user, org_id: orgId }
        login(updatedUser, user.token || '')
      }
      
      // Refresh the page to load new org data
      window.location.reload()
    } catch (error) {
      console.error('Failed to switch organization:', error)
    }
  }

  if (isLoading) {
    return <Skeleton className="h-10 w-48" />
  }

  if (!organizations || organizations.length <= 1) {
    return null // Don't show switcher for single-tenant users
  }

  return (
    <div className="flex items-center space-x-4">
      <Select value={selectedOrgId} onValueChange={handleOrganizationSwitch}>
        <SelectTrigger className="w-48">
          <div className="flex items-center space-x-2">
            <Building2 className="h-4 w-4" />
            <SelectValue />
          </div>
        </SelectTrigger>
        <SelectContent>
          {organizations.map((org) => (
            <SelectItem key={org.id} value={org.id}>
              <div className="flex items-center space-x-2">
                {org.logoUrl && (
                  <img 
                    src={org.logoUrl} 
                    alt={org.name}
                    className="h-4 w-4 rounded"
                  />
                )}
                <span>{org.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export function OrganizationBrandingSettings() {
  const { user } = useAuthStore()
  const [isUploading, setIsUploading] = useState(false)

  const { data: organization, isLoading } = useQuery({
    queryKey: ['organization', user?.org_id],
    queryFn: () => apiClient.getOrganization(user!.org_id),
    enabled: !!user?.org_id,
  })

  const handleLogoUpload = async (file: File) => {
    try {
      setIsUploading(true)
      const logoUrl = await apiClient.uploadFile(file, 'document')
      
      await apiClient.updateOrganization(user!.org_id, {
        logo_url: logoUrl,
      })
      
      // Refresh organization data
      queryClient.invalidateQueries({ queryKey: ['organization'] })
      
    } catch (error) {
      console.error('Failed to upload logo:', error)
    } finally {
      setIsUploading(false)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-20 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization Branding</CardTitle>
        <CardDescription>
          Customize your organization's appearance and branding
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center space-x-4">
          <div className="h-20 w-20 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
            {organization?.logo_url ? (
              <img 
                src={organization.logo_url} 
                alt="Organization logo"
                className="h-full w-full object-contain rounded-lg"
              />
            ) : (
              <Building2 className="h-8 w-8 text-gray-400" />
            )}
          </div>
          
          <div className="space-y-2">
            <h3 className="font-medium">{organization?.name}</h3>
            <p className="text-sm text-muted-foreground">
              {organization?.domain || 'No domain set'}
            </p>
            <Button 
              variant="outline" 
              size="sm"
              disabled={isUploading}
              onClick={() => {
                const input = document.createElement('input')
                input.type = 'file'
                input.accept = 'image/*'
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0]
                  if (file) handleLogoUpload(file)
                }
                input.click()
              }}
            >
              {isUploading ? 'Uploading...' : 'Change Logo'}
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Industry</label>
            <p className="text-sm text-muted-foreground">
              {organization?.industry || 'Not specified'}
            </p>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Employee Count</label>
            <p className="text-sm text-muted-foreground">
              {organization?.employee_count || 'Not specified'}
            </p>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Time Zone</label>
            <p className="text-sm text-muted-foreground">
              {organization?.time_zone || 'UTC'}
            </p>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Subscription</label>
            <Badge variant="outline">
              {organization?.subscription_tier || 'BASIC'}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function applyOrganizationTheme(theme: OrganizationTheme) {
  // Apply CSS custom properties for theming
  const root = document.documentElement
  
  root.style.setProperty('--primary', theme.primaryColor)
  root.style.setProperty('--secondary', theme.secondaryColor)
  
  // Update favicon
  const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement
  if (favicon && theme.favicon) {
    favicon.href = theme.favicon
  }
  
  // Apply custom CSS if provided
  if (theme.customCss) {
    let styleElement = document.getElementById('org-custom-styles')
    if (!styleElement) {
      styleElement = document.createElement('style')
      styleElement.id = 'org-custom-styles'
      document.head.appendChild(styleElement)
    }
    styleElement.textContent = theme.customCss
  }
}