import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { 
  Shield, 
  Key, 
  Clock, 
  Download, 
  Trash2, 
  Eye, 
  EyeOff,
  AlertTriangle,
  CheckCircle,
  Settings,
  Users,
  FileText,
  Database,
  RefreshCw
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'

import { useAuthStore } from '@/stores/auth'
import { ConditionalRender } from '@/components/auth/ProtectedRoute'
import apiClient from '@/lib/api-client'

const dataRetentionSchema = z.object({
  visitorRetentionDays: z.number().min(30).max(3650),
  visitRetentionDays: z.number().min(30).max(3650),
  auditLogRetentionDays: z.number().min(365).max(3650),
  autoDeleteEnabled: z.boolean(),
})

const gdprRequestSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().optional(),
  requestType: z.enum(['EXPORT', 'DELETE']),
})

type DataRetentionForm = z.infer<typeof dataRetentionSchema>
type GDPRRequestForm = z.infer<typeof gdprRequestSchema>

export default function PrivacySettingsPage() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [showEncryptionKeys, setShowEncryptionKeys] = useState(false)

  // Fetch privacy settings
  const { data: privacySettings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ['privacy-settings', user?.org_id],
    queryFn: async () => {
      // Mock data for now - replace with actual API call
      return {
        encryptionEnabled: true,
        piiMaskingEnabled: true,
        auditLoggingEnabled: true,
        dataRetentionPolicy: {
          visitorRetentionDays: 1095, // 3 years
          visitRetentionDays: 730,    // 2 years
          auditLogRetentionDays: 2555, // 7 years
          autoDeleteEnabled: true,
        },
        encryptionStatus: {
          kmsKeyId: 'arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012',
          lastRotated: '2024-01-15T10:30:00Z',
          nextRotation: '2025-01-15T10:30:00Z',
          status: 'ACTIVE',
        },
      }
    },
    enabled: !!user?.org_id,
  })

  // Fetch PII access stats
  const { data: piiAccessStats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['pii-access-stats', user?.org_id],
    queryFn: async () => {
      const logs = await apiClient.getPIIAccessLogs(user!.org_id, {
        fromDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        toDate: new Date().toISOString(),
      })
      
      // Process logs to get stats
      const totalAccesses = logs.length
      const uniqueUsers = new Set(logs.map(log => log.user_id)).size
      const lastAccess = logs.length > 0 ? logs[0].timestamp : null
      
      // Get top accessors
      const userCounts = logs.reduce((acc, log) => {
        acc[log.user_id] = (acc[log.user_id] || 0) + 1
        return acc
      }, {} as Record<string, number>)
      
      const topAccessors = Object.entries(userCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([userId, count]) => ({
          name: `User ${userId}`, // Replace with actual user name lookup
          role: 'ADMIN', // Replace with actual role lookup
          accesses: count
        }))

      return {
        totalAccesses,
        uniqueUsers,
        lastAccess,
        topAccessors,
      }
    },
    enabled: !!user?.org_id,
  })

  // Fetch GDPR requests
  const { data: gdprRequests, isLoading: isLoadingGDPR } = useQuery({
    queryKey: ['gdpr-requests', user?.org_id],
    queryFn: () => apiClient.getGDPRRequests(user!.org_id),
    enabled: !!user?.org_id,
  })

  // Fetch audit logs
  const { data: auditLogs, isLoading: isLoadingAudit } = useQuery({
    queryKey: ['audit-logs', user?.org_id],
    queryFn: () => apiClient.getPIIAccessLogs(user!.org_id),
    enabled: !!user?.org_id,
  })

  const retentionForm = useForm<DataRetentionForm>({
    resolver: zodResolver(dataRetentionSchema),
    defaultValues: privacySettings?.dataRetentionPolicy,
  })

  const gdprForm = useForm<GDPRRequestForm>({
    resolver: zodResolver(gdprRequestSchema),
  })

  const updateRetentionMutation = useMutation({
    mutationFn: async (data: DataRetentionForm) => {
      await apiClient.updateDataRetentionPolicy(user!.org_id, {
        resourceType: 'VISITOR',
        retentionPeriodDays: data.visitorRetentionDays,
        autoDeleteEnabled: data.autoDeleteEnabled,
        legalHoldExemption: false,
      })
    },
    onSuccess: () => {
      toast.success('Data retention policy updated successfully')
      queryClient.invalidateQueries({ queryKey: ['privacy-settings'] })
    },
    onError: () => {
      toast.error('Failed to update data retention policy')
    },
  })

  const createGDPRRequestMutation = useMutation({
    mutationFn: async (data: GDPRRequestForm) => {
      if (data.requestType === 'EXPORT') {
        return apiClient.createGDPRExportRequest(user!.org_id, {
          email: data.email,
          phone: data.phone,
        })
      } else {
        return apiClient.createGDPRDeletionRequest(user!.org_id, {
          email: data.email,
          phone: data.phone,
        })
      }
    },
    onSuccess: () => {
      toast.success('GDPR request created successfully')
      gdprForm.reset()
      queryClient.invalidateQueries({ queryKey: ['gdpr-requests'] })
    },
    onError: () => {
      toast.error('Failed to create GDPR request')
    },
  })

  const rotateEncryptionKeyMutation = useMutation({
    mutationFn: async () => {
      // Mock implementation - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 2000))
    },
    onSuccess: () => {
      toast.success('Encryption key rotation initiated')
      queryClient.invalidateQueries({ queryKey: ['privacy-settings'] })
    },
    onError: () => {
      toast.error('Failed to rotate encryption key')
    },
  })

  const onRetentionSubmit = (data: DataRetentionForm) => {
    updateRetentionMutation.mutate(data)
  }

  const onGDPRSubmit = (data: GDPRRequestForm) => {
    createGDPRRequestMutation.mutate(data)
  }

  if (isLoadingSettings) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-6 w-32 mb-4" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Privacy & Security Settings</h1>
        <p className="text-muted-foreground">
          Manage data protection, encryption, and compliance settings for your organization.
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="encryption">Encryption</TabsTrigger>
          <TabsTrigger value="retention">Data Retention</TabsTrigger>
          <TabsTrigger value="gdpr">GDPR Requests</TabsTrigger>
          <TabsTrigger value="audit">Audit Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Encryption Status</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium">Active</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  All PII data is encrypted at rest
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">PII Access (30 days)</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoadingStats ? (
                  <Skeleton className="h-6 w-16" />
                ) : (
                  <>
                    <div className="text-2xl font-bold">{piiAccessStats?.totalAccesses || 0}</div>
                    <p className="text-xs text-muted-foreground">
                      By {piiAccessStats?.uniqueUsers || 0} unique users
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">GDPR Requests</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoadingGDPR ? (
                  <Skeleton className="h-6 w-16" />
                ) : (
                  <>
                    <div className="text-2xl font-bold">{gdprRequests?.length || 0}</div>
                    <p className="text-xs text-muted-foreground">
                      {gdprRequests?.filter(r => r.status === 'COMPLETED').length || 0} completed
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Privacy Controls</CardTitle>
              <CardDescription>
                Configure privacy and data protection settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-sm font-medium">PII Encryption</div>
                  <div className="text-sm text-muted-foreground">
                    Encrypt email addresses and phone numbers at rest
                  </div>
                </div>
                <Switch checked={privacySettings?.encryptionEnabled} disabled />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-sm font-medium">PII Masking</div>
                  <div className="text-sm text-muted-foreground">
                    Mask PII data in logs and error messages
                  </div>
                </div>
                <Switch checked={privacySettings?.piiMaskingEnabled} />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-sm font-medium">Audit Logging</div>
                  <div className="text-sm text-muted-foreground">
                    Log all access to personally identifiable information
                  </div>
                </div>
                <Switch checked={privacySettings?.auditLoggingEnabled} disabled />
              </div>
            </CardContent>
          </Card>

          {piiAccessStats?.topAccessors && piiAccessStats.topAccessors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Top PII Accessors (30 days)</CardTitle>
                <CardDescription>
                  Users who have accessed PII data most frequently
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {piiAccessStats.topAccessors.map((accessor, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                          <Users className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-sm font-medium">{accessor.name}</div>
                          <div className="text-xs text-muted-foreground">{accessor.role}</div>
                        </div>
                      </div>
                      <Badge variant="secondary">{accessor.accesses} accesses</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="encryption" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Encryption Configuration</CardTitle>
              <CardDescription>
                Manage encryption keys and settings for PII data protection
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  All PII data is encrypted using AWS KMS with automatic key rotation enabled.
                </AlertDescription>
              </Alert>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">KMS Key ID</label>
                  <div className="flex items-center space-x-2">
                    <Input
                      value={showEncryptionKeys ? privacySettings?.encryptionStatus.kmsKeyId : '••••••••-••••-••••-••••-••••••••••••'}
                      readOnly
                      className="font-mono text-xs"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setShowEncryptionKeys(!showEncryptionKeys)}
                    >
                      {showEncryptionKeys ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Key Status</label>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      {privacySettings?.encryptionStatus.status}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Last Rotated</label>
                  <Input
                    value={new Date(privacySettings?.encryptionStatus.lastRotated || '').toLocaleDateString()}
                    readOnly
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Next Rotation</label>
                  <Input
                    value={new Date(privacySettings?.encryptionStatus.nextRotation || '').toLocaleDateString()}
                    readOnly
                  />
                </div>
              </div>

              <Separator />

              <ConditionalRender requiredPermissions={['data:retention']}>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium">Manual Key Rotation</h4>
                    <p className="text-sm text-muted-foreground">
                      Rotate the encryption key immediately. This will re-encrypt all PII data.
                    </p>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <Key className="mr-2 h-4 w-4" />
                        Rotate Key
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Rotate Encryption Key</DialogTitle>
                        <DialogDescription>
                          This will create a new encryption key and re-encrypt all PII data. 
                          This process may take several minutes to complete.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline">Cancel</Button>
                        <Button 
                          onClick={() => rotateEncryptionKeyMutation.mutate()}
                          disabled={rotateEncryptionKeyMutation.isPending}
                        >
                          {rotateEncryptionKeyMutation.isPending ? (
                            <>
                              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                              Rotating...
                            </>
                          ) : (
                            'Rotate Key'
                          )}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </ConditionalRender>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="retention" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Data Retention Policy</CardTitle>
              <CardDescription>
                Configure how long different types of data are retained before automatic deletion
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...retentionForm}>
                <form onSubmit={retentionForm.handleSubmit(onRetentionSubmit)} className="space-y-6">
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Changes to retention policies will affect future data only. 
                      Existing data will follow the previous policy until it expires.
                    </AlertDescription>
                  </Alert>

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={retentionForm.control}
                      name="visitorRetentionDays"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Visitor Data Retention (days)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} onChange={e => field.onChange(+e.target.value)} />
                          </FormControl>
                          <FormMessage />
                          <p className="text-xs text-muted-foreground">
                            How long to keep visitor personal information
                          </p>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={retentionForm.control}
                      name="visitRetentionDays"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Visit Data Retention (days)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} onChange={e => field.onChange(+e.target.value)} />
                          </FormControl>
                          <FormMessage />
                          <p className="text-xs text-muted-foreground">
                            How long to keep visit records and history
                          </p>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={retentionForm.control}
                      name="auditLogRetentionDays"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Audit Log Retention (days)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} onChange={e => field.onChange(+e.target.value)} />
                          </FormControl>
                          <FormMessage />
                          <p className="text-xs text-muted-foreground">
                            How long to keep audit and access logs
                          </p>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={retentionForm.control}
                      name="autoDeleteEnabled"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Automatic Deletion</FormLabel>
                          <FormControl>
                            <div className="flex items-center space-x-2">
                              <Switch 
                                checked={field.value} 
                                onCheckedChange={field.onChange}
                              />
                              <span className="text-sm">Enable automatic deletion</span>
                            </div>
                          </FormControl>
                          <p className="text-xs text-muted-foreground">
                            Automatically delete data when retention period expires
                          </p>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button 
                      type="submit" 
                      disabled={updateRetentionMutation.isPending}
                    >
                      {updateRetentionMutation.isPending ? 'Updating...' : 'Update Policy'}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gdpr" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Create GDPR Request</CardTitle>
                <CardDescription>
                  Process data export or deletion requests for visitors
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...gdprForm}>
                  <form onSubmit={gdprForm.handleSubmit(onGDPRSubmit)} className="space-y-4">
                    <FormField
                      control={gdprForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input placeholder="visitor@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={gdprForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number (optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="+1-555-0123" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={gdprForm.control}
                      name="requestType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Request Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select request type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="EXPORT">Data Export</SelectItem>
                              <SelectItem value="DELETE">Data Deletion</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />

                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={createGDPRRequestMutation.isPending}
                    >
                      {createGDPRRequestMutation.isPending ? 'Creating...' : 'Create Request'}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>GDPR Request Process</CardTitle>
                <CardDescription>
                  How GDPR requests are processed
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-sm font-medium text-blue-600">1</span>
                    </div>
                    <div>
                      <div className="text-sm font-medium">Verification Email</div>
                      <div className="text-xs text-muted-foreground">
                        Visitor receives verification email
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-sm font-medium text-blue-600">2</span>
                    </div>
                    <div>
                      <div className="text-sm font-medium">Identity Verification</div>
                      <div className="text-xs text-muted-foreground">
                        Visitor confirms their identity
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-sm font-medium text-blue-600">3</span>
                    </div>
                    <div>
                      <div className="text-sm font-medium">Processing</div>
                      <div className="text-xs text-muted-foreground">
                        Request is processed automatically
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">Completion</div>
                      <div className="text-xs text-muted-foreground">
                        Visitor receives confirmation
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent GDPR Requests</CardTitle>
              <CardDescription>
                Track the status of data export and deletion requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingGDPR ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Requested</TableHead>
                      <TableHead>Completed</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gdprRequests?.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium">{request.subject_email}</TableCell>
                        <TableCell>
                          <Badge variant={request.request_type === 'EXPORT' ? 'default' : 'destructive'}>
                            {request.request_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              request.status === 'COMPLETED' ? 'default' : 
                              request.status === 'IN_PROGRESS' ? 'secondary' : 'outline'
                            }
                          >
                            {request.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(request.requested_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {request.completed_at ? new Date(request.completed_at).toLocaleDateString() : '—'}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>PII Access Audit Logs</CardTitle>
              <CardDescription>
                Monitor and track all access to personally identifiable information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Input placeholder="Search logs..." className="w-64" />
                    <Select>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Action" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="VIEW">View</SelectItem>
                        <SelectItem value="CREATE">Create</SelectItem>
                        <SelectItem value="UPDATE">Update</SelectItem>
                        <SelectItem value="DELETE">Delete</SelectItem>
                        <SelectItem value="EXPORT">Export</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Export Logs
                  </Button>
                </div>

                {isLoadingAudit ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Resource</TableHead>
                        <TableHead>PII Fields</TableHead>
                        <TableHead>IP Address</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditLogs?.slice(0, 10).map((log, index) => (
                        <TableRow key={index}>
                          <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                          <TableCell>{log.user?.name || 'Unknown User'}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{log.action}</Badge>
                          </TableCell>
                          <TableCell>{log.resource_type} #{log.resource_id}</TableCell>
                          <TableCell>{log.pii_fields?.join(', ') || '—'}</TableCell>
                          <TableCell>{log.ip_address}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}