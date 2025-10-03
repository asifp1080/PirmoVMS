import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Eye,
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'

import { useAuthStore } from '@/stores/auth'
import { ConditionalRender } from '@/components/auth/ProtectedRoute'
import apiClient from '@/lib/api-client'
import type { Visitor } from '@vms/contracts'

const visitorSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().optional(),
  company: z.string().optional(),
  preferred_language: z.string().default('en'),
  marketing_opt_in: z.boolean().default(false),
  notes: z.string().optional(),
})

type VisitorForm = z.infer<typeof visitorSchema>

export default function VisitorsPage() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [companyFilter, setCompanyFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedVisitor, setSelectedVisitor] = useState<Visitor | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  const pageSize = 20

  // Fetch visitors with pagination and filters
  const {
    data: visitorsResponse,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['visitors', user?.org_id, searchQuery, companyFilter, currentPage],
    queryFn: () => apiClient.getVisitors(user!.org_id, {
      search: searchQuery || undefined,
      company: companyFilter || undefined,
      limit: pageSize,
      cursor: currentPage > 1 ? `page_${currentPage}` : undefined,
    }),
    enabled: !!user?.org_id,
  })

  // Fetch companies for filter dropdown
  const { data: companies } = useQuery({
    queryKey: ['visitor-companies', user?.org_id],
    queryFn: async () => {
      const response = await apiClient.getVisitors(user!.org_id, { limit: 1000 })
      const uniqueCompanies = [...new Set(
        response.data
          .map(v => v.company)
          .filter(Boolean)
      )]
      return uniqueCompanies
    },
    enabled: !!user?.org_id,
  })

  const form = useForm<VisitorForm>({
    resolver: zodResolver(visitorSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      company: '',
      preferred_language: 'en',
      marketing_opt_in: false,
      notes: '',
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: VisitorForm) => apiClient.createVisitor(user!.org_id, data),
    onSuccess: () => {
      toast.success('Visitor created successfully')
      setIsCreateDialogOpen(false)
      form.reset()
      queryClient.invalidateQueries({ queryKey: ['visitors'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create visitor')
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: VisitorForm) => 
      apiClient.updateVisitor(user!.org_id, selectedVisitor!.id, data),
    onSuccess: () => {
      toast.success('Visitor updated successfully')
      setIsEditDialogOpen(false)
      setSelectedVisitor(null)
      form.reset()
      queryClient.invalidateQueries({ queryKey: ['visitors'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update visitor')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (visitorId: string) => apiClient.deleteVisitor(user!.org_id, visitorId),
    onSuccess: () => {
      toast.success('Visitor deleted successfully')
      setIsDeleteDialogOpen(false)
      setSelectedVisitor(null)
      queryClient.invalidateQueries({ queryKey: ['visitors'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete visitor')
    },
  })

  const handleCreate = (data: VisitorForm) => {
    createMutation.mutate(data)
  }

  const handleUpdate = (data: VisitorForm) => {
    updateMutation.mutate(data)
  }

  const handleEdit = (visitor: Visitor) => {
    setSelectedVisitor(visitor)
    form.reset({
      first_name: visitor.first_name,
      last_name: visitor.last_name,
      email: visitor.email || '',
      phone: visitor.phone || '',
      company: visitor.company || '',
      preferred_language: visitor.preferred_language,
      marketing_opt_in: visitor.marketing_opt_in,
      notes: visitor.notes || '',
    })
    setIsEditDialogOpen(true)
  }

  const handleDelete = (visitor: Visitor) => {
    setSelectedVisitor(visitor)
    setIsDeleteDialogOpen(true)
  }

  const handleExport = async () => {
    try {
      const blob = await apiClient.exportAnalytics(user!.org_id, {
        format: 'csv',
        data_type: 'visitors',
        filters: {
          search: searchQuery,
          company: companyFilter,
        },
      })
      
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `visitors-${format(new Date(), 'yyyy-MM-dd')}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast.success('Visitors exported successfully')
    } catch (error) {
      toast.error('Failed to export visitors')
    }
  }

  const visitors = visitorsResponse?.data || []
  const totalPages = Math.ceil((visitorsResponse?.meta?.total_count || 0) / pageSize)

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Visitors</h1>
          <p className="text-muted-foreground">
            Manage visitor information and history.
          </p>
        </div>
        
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load visitors. Please try again.
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
          <h1 className="text-3xl font-bold tracking-tight">Visitors</h1>
          <p className="text-muted-foreground">
            Manage visitor information and history.
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <ConditionalRender requiredPermissions={['visitor:export']}>
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </ConditionalRender>
          
          <ConditionalRender requiredPermissions={['visitor:create']}>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Visitor
            </Button>
          </ConditionalRender>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Visitors</CardTitle>
              <CardDescription>
                {visitorsResponse?.meta?.total_count || 0} total visitors
              </CardDescription>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search visitors..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
              
              <Select value={companyFilter} onValueChange={setCompanyFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by company" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All companies</SelectItem>
                  {companies?.map((company) => (
                    <SelectItem key={company} value={company}>
                      {company}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : visitors.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No visitors found</p>
              {(searchQuery || companyFilter) && (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchQuery('')
                    setCompanyFilter('')
                  }}
                  className="mt-2"
                >
                  Clear filters
                </Button>
              )}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Language</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-[70px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visitors.map((visitor) => (
                    <TableRow key={visitor.id}>
                      <TableCell className="font-medium">
                        {visitor.first_name} {visitor.last_name}
                      </TableCell>
                      <TableCell>{visitor.email || '—'}</TableCell>
                      <TableCell>{visitor.phone || '—'}</TableCell>
                      <TableCell>{visitor.company || '—'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {visitor.preferred_language.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(visitor.created_at), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(visitor)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <ConditionalRender requiredPermissions={['visitor:delete']}>
                              <DropdownMenuItem 
                                onClick={() => handleDelete(visitor)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </ConditionalRender>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </p>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create Visitor Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Visitor</DialogTitle>
            <DialogDescription>
              Create a new visitor record in the system.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleCreate)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="first_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="last_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="company"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Creating...' : 'Create Visitor'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Visitor Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Visitor</DialogTitle>
            <DialogDescription>
              Update visitor information.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleUpdate)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="first_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="last_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="company"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? 'Updating...' : 'Update Visitor'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Visitor</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedVisitor?.first_name} {selectedVisitor?.last_name}? 
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex justify-end space-x-2">
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => deleteMutation.mutate(selectedVisitor!.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}