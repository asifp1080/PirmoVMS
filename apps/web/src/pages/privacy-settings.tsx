import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery } from '@tanstack/react-query'
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
  Database
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
  const [showEncryptionKeys, setShowEncryptionKeys] = useState(false)

  // Mock data - replace with actual API calls
  const privacySettings = {
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
    piiAccessStats: {
      totalAccesses: 1247,
      uniqueUsers: 23,
      lastAccess: '2024-01-20T14:30:00Z',
      topAccessors: [
        { name: 'John Admin', role: 'ADMIN', accesses: 156 },
        { name: 'Jane Receptionist', role: 'RECEPTIONIST', accesses: 89 },
        { name: 'Bob Security', role: 'SECURITY', accesses: 12 },
      ],
    },
  }

  const gdprRequests = [
    {
      id: '1',
      type: 'EXPORT',
      email: 'john.doe@example.com',
      status: 'COMPLETED',
      requestedAt: '2024-01-18T09:00:00Z',
      completedAt: '2024-01-19T15:30:00Z',
    },
    {
      id: '2',
      type: 'DELETE',
      email: 'jane.smith@example.com',
      status: 'IN_PROGRESS',
      requestedAt: '2024-01-20T11:15:00Z',
      completedAt: null,
    },
  ]

  const {
    register: registerRetention,
    handleSubmit: handleRetentionSubmit,
    formState: { errors: retentionErrors },
  } = useForm<DataRetentionForm>({
    resolver: zodResolver(dataRetentionSchema),
    defaultValues: privacySettings.dataRetentionPolicy,
  })

  const {
    register: registerGDPR,
    handleSubmit: handleGDPRSubmit,
    formState: { errors: gdprErrors },
    reset: resetGDPR,
  } = useForm<GDPRRequestForm>({
    resolver: zodResolver(gdprRequestSchema),
  })

  const updateRetentionMutation = useMutation({
    mutationFn: async (data: DataRetentionForm) => {
      // API call to update retention policy
      console.log('Updating retention policy:', data)
    },
    onSuccess: () => {
      toast.success('Data retention policy updated successfully')
    },
    onError: () => {
      toast.error('Failed to update data retention policy')
    },
  })

  const createGDPRRequestMutation = useMutation({
    mutationFn: async (data: GDPRRequestForm) => {
      // API call to create GDPR request
      console.log('Creating GDPR request:', data)
    },
    onSuccess: () => {
      toast.success('GDPR request created successfully')
      resetGDPR()
    },
    onError: () => {
      toast.error('Failed to create GDPR request')
    },
  })

  const rotateEncryptionKeyMutation = useMutation({
    mutationFn: async () => {
      // API call to rotate encryption key
      console.log('Rotating encryption key')
    },
    onSuccess: () => {
      toast.success('Encryption key rotation initiated')
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
                <div className="text-2xl font-bold">{privacySettings.piiAccessStats.totalAccesses}</div>
                <p className="text-xs text-muted-foreground">
                  By {privacySettings.piiAccessStats.uniqueUsers} unique users
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">GDPR Requests</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{gdprRequests.length}</div>
                <p className="text-xs text-muted-foreground">
                  {gdprRequests.filter(r => r.status === 'COMPLETED').length} completed
                </p>
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
                <Switch checked={privacySettings.encryptionEnabled} disabled />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-sm font-medium">PII Masking</div>
                  <div className="text-sm text-muted-foreground">
                    Mask PII data in logs and error messages
                  </div>
                </div>
                <Switch checked={privacySettings.piiMaskingEnabled} />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-sm font-medium">Audit Logging</div>
                  <div className="text-sm text-muted-foreground">
                    Log all access to personally identifiable information
                  </div>
                </div>
                <Switch checked={privacySettings.auditLoggingEnabled} disabled />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top PII Accessors (30 days)</CardTitle>
              <CardDescription>
                Users who have accessed PII data most frequently
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {privacySettings.piiAccessStats.topAccessors.map((accessor, index) => (
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
                      value={showEncryptionKeys ? privacySettings.encryptionStatus.kmsKeyId : '••••••••-••••-••••-••••-••••••••••••'}
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
                      {privacySettings.encryptionStatus.status}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Last Rotated</label>
                  <Input
                    value={new Date(privacySettings.encryptionStatus.lastRotated).toLocaleDateString()}
                    readOnly
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Next Rotation</label>
                  <Input
                    value={new Date(privacySettings.encryptionStatus.nextRotation).toLocaleDateString()}
                    readOnly
                  />
                </div>
              </div>

              <Separator />

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
                        {rotateEncryptionKeyMutation.isPending ? 'Rotating...' : 'Rotate Key'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
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
              <form onSubmit={handleRetentionSubmit(onRetentionSubmit)} className="space-y-6">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Changes to retention policies will affect future data only. 
                    Existing data will follow the previous policy until it expires.
                  </AlertDescription>
                </Alert>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Visitor Data Retention (days)</label>
                    <Input
                      type="number"
                      {...registerRetention('visitorRetentionDays')}
                      className={retentionErrors.visitorRetentionDays ? 'border-red-500' : ''}
                    />
                    {retentionErrors.visitorRetentionDays && (
                      <p className="text-sm text-red-600">{retentionErrors.visitorRetentionDays.message}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      How long to keep visitor personal information
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Visit Data Retention (days)</label>
                    <Input
                      type="number"
                      {...registerRetention('visitRetentionDays')}
                      className={retentionErrors.visitRetentionDays ? 'border-red-500' : ''}
                    />
                    {retentionErrors.visitRetentionDays && (
                      <p className="text-sm text-red-600">{retentionErrors.visitRetentionDays.message}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      How long to keep visit records and history
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Audit Log Retention (days)</label>
                    <Input
                      type="number"
                      {...registerRetention('auditLogRetentionDays')}
                      className={retentionErrors.auditLogRetentionDays ? 'border-red-500' : ''}
                    />
                    {retentionErrors.auditLogRetentionDays && (
                      <p className="text-sm text-red-600">{retentionErrors.auditLogRetentionDays.message}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      How long to keep audit and access logs
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Automatic Deletion</label>
                    <div className="flex items-center space-x-2">
                      <Switch {...registerRetention('autoDeleteEnabled')} />
                      <span className="text-sm">Enable automatic deletion</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Automatically delete data when retention period expires
                    </p>
                  </div>
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
                <form onSubmit={handleGDPRSubmit(onGDPRSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email Address</label>
                    <Input
                      type="email"
                      placeholder="visitor@example.com"
                      {...registerGDPR('email')}
                      className={gdprErrors.email ? 'border-red-500' : ''}
                    />
                    {gdprErrors.email && (
                      <p className="text-sm text-red-600">{gdprErrors.email.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Phone Number (optional)</label>
                    <Input
                      type="tel"
                      placeholder="+1-555-0123"
                      {...registerGDPR('phone')}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Request Type</label>
                    <Select {...registerGDPR('requestType')}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select request type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EXPORT">Data Export</SelectItem>
                        <SelectItem value="DELETE">Data Deletion</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={createGDPRRequestMutation.isPending}
                  >
                    {createGDPRRequestMutation.isPending ? 'Creating...' : 'Create Request'}
                  </Button>
                </form>
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
                  {gdprRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">{request.email}</TableCell>
                      <TableCell>
                        <Badge variant={request.type === 'EXPORT' ? 'default' : 'destructive'}>
                          {request.type}
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
                        {new Date(request.requestedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {request.completedAt ? new Date(request.completedAt).toLocaleDateString() : '-'}
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
                    <TableRow>
                      <TableCell>2024-01-20 14:30:15</TableCell>
                      <TableCell>John Admin</TableCell>
                      <TableCell>
                        <Badge variant="outline">VIEW</Badge>
                      </TableCell>
                      <TableCell>Visitor #1234</TableCell>
                      <TableCell>email, phone</TableCell>
                      <TableCell>192.168.1.100</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>2024-01-20 14:25:42</TableCell>
                      <TableCell>Jane Receptionist</TableCell>
                      <TableCell>
                        <Badge variant="outline">UPDATE</Badge>
                      </TableCell>
                      <TableCell>Visitor #1235</TableCell>
                      <TableCell>phone</TableCell>
                      <TableCell>192.168.1.101</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>2024-01-20 14:20:18</TableCell>
                      <TableCell>Bob Security</TableCell>
                      <TableCell>
                        <Badge variant="outline">VIEW</Badge>
                      </TableCell>
                      <TableCell>Visit #5678</TableCell>
                      <TableCell>-</TableCell>
                      <TableCell>192.168.1.102</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}