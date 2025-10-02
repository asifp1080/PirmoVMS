"use client";

import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import {
  CalendarIcon,
  Download,
  FileText,
  Filter,
  Plus,
  Printer,
  Search,
  Send,
} from "lucide-react";

const VisitorManagement = () => {
  const [activeTab, setActiveTab] = useState("records");
  const [isPreRegisterDialogOpen, setIsPreRegisterDialogOpen] = useState(false);
  const [preRegisterStep, setPreRegisterStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date(),
  );

  // Mock data for visitor records
  const visitorRecords = [
    {
      id: "V001",
      name: "John Smith",
      company: "Acme Corp",
      host: "Sarah Johnson",
      purpose: "Meeting",
      checkIn: "2023-05-15T09:30:00",
      checkOut: "2023-05-15T11:45:00",
      status: "Completed",
    },
    {
      id: "V002",
      name: "Emily Davis",
      company: "Tech Solutions",
      host: "Michael Brown",
      purpose: "Interview",
      checkIn: "2023-05-15T13:15:00",
      checkOut: null,
      status: "Active",
    },
    {
      id: "V003",
      name: "Robert Wilson",
      company: "Global Logistics",
      host: "Jennifer Lee",
      purpose: "Delivery",
      checkIn: "2023-05-15T14:00:00",
      checkOut: "2023-05-15T14:30:00",
      status: "Completed",
    },
    {
      id: "V004",
      name: "Lisa Chen",
      company: "Innovation Labs",
      host: "David Miller",
      purpose: "Meeting",
      checkIn: "2023-05-16T10:00:00",
      checkOut: null,
      status: "Expected",
    },
    {
      id: "V005",
      name: "James Taylor",
      company: "Finance Partners",
      host: "Amanda White",
      purpose: "Interview",
      checkIn: "2023-05-16T11:30:00",
      checkOut: null,
      status: "Expected",
    },
  ];

  // Mock data for badge templates
  const badgeTemplates = [
    {
      id: 1,
      name: "Standard Visitor",
      description: "Default template for all visitors",
    },
    {
      id: 2,
      name: "VIP Guest",
      description: "Special template for VIP visitors",
    },
    {
      id: 3,
      name: "Contractor",
      description: "Template for contractors and vendors",
    },
    {
      id: 4,
      name: "Interview Candidate",
      description: "Template for job candidates",
    },
  ];

  // Mock data for employees/hosts
  const employees = [
    {
      id: 1,
      name: "Sarah Johnson",
      department: "Marketing",
      email: "sarah.j@company.com",
    },
    {
      id: 2,
      name: "Michael Brown",
      department: "Engineering",
      email: "michael.b@company.com",
    },
    {
      id: 3,
      name: "Jennifer Lee",
      department: "Operations",
      email: "jennifer.l@company.com",
    },
    {
      id: 4,
      name: "David Miller",
      department: "Product",
      email: "david.m@company.com",
    },
    {
      id: 5,
      name: "Amanda White",
      department: "HR",
      email: "amanda.w@company.com",
    },
  ];

  const handlePreRegisterNext = () => {
    if (preRegisterStep < 4) {
      setPreRegisterStep(preRegisterStep + 1);
    } else {
      // Submit form and close dialog
      setIsPreRegisterDialogOpen(false);
      setPreRegisterStep(1);
    }
  };

  const handlePreRegisterBack = () => {
    if (preRegisterStep > 1) {
      setPreRegisterStep(preRegisterStep - 1);
    }
  };

  return (
    <div className="w-full h-full bg-background">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Visitor Management</h1>
        <div className="flex gap-2">
          <Button onClick={() => setIsPreRegisterDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Pre-register Visitor
          </Button>
        </div>
      </div>

      <Dialog
        open={isPreRegisterDialogOpen}
        onOpenChange={setIsPreRegisterDialogOpen}
      >
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Pre-register a Visitor</DialogTitle>
            <DialogDescription>
              Enter visitor details to pre-register them for an upcoming
              visit.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {/* Step indicator */}
            <div className="flex justify-between mb-8">
              {[1, 2, 3, 4].map((step) => (
                <div key={step} className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${preRegisterStep >= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                  >
                    {step}
                  </div>
                  <span className="text-xs mt-1">
                    {step === 1 && "Details"}
                    {step === 2 && "Host"}
                    {step === 3 && "Schedule"}
                    {step === 4 && "Invite"}
                  </span>
                </div>
              ))}
            </div>

            {/* Step 1: Visitor Details */}
            {preRegisterStep === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <FormLabel>First Name</FormLabel>
                    <Input placeholder="First name" />
                  </div>
                  <div className="space-y-2">
                    <FormLabel>Last Name</FormLabel>
                    <Input placeholder="Last name" />
                  </div>
                </div>
                <div className="space-y-2">
                  <FormLabel>Email</FormLabel>
                  <Input type="email" placeholder="visitor@example.com" />
                </div>
                <div className="space-y-2">
                  <FormLabel>Phone</FormLabel>
                  <Input placeholder="+1 (555) 123-4567" />
                </div>
                <div className="space-y-2">
                  <FormLabel>Company</FormLabel>
                  <Input placeholder="Company name" />
                </div>
                <div className="space-y-2">
                  <FormLabel>Purpose of Visit</FormLabel>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select purpose" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="meeting">Meeting</SelectItem>
                      <SelectItem value="interview">Interview</SelectItem>
                      <SelectItem value="delivery">Delivery</SelectItem>
                      <SelectItem value="event">Event</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Step 2: Assign Host */}
            {preRegisterStep === 2 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <FormLabel>Search for Host</FormLabel>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or email"
                      className="pl-8"
                    />
                  </div>
                </div>

                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Department</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employees.map((employee) => (
                        <TableRow key={employee.id}>
                          <TableCell>
                            <Checkbox id={`host-${employee.id}`} />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Avatar className="h-8 w-8 mr-2">
                                <AvatarImage
                                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${employee.name}`}
                                />
                                <AvatarFallback>
                                  {employee.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">
                                  {employee.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {employee.email}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{employee.department}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Step 3: Schedule Visit */}
            {preRegisterStep === 3 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <FormLabel>Visit Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate
                          ? format(selectedDate, "PPP")
                          : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <FormLabel>Start Time</FormLabel>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select time" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 24 }).map((_, i) => {
                          const hour = i.toString().padStart(2, "0");
                          return (
                            <React.Fragment key={i}>
                              <SelectItem
                                value={`${hour}:00`}
                              >{`${hour}:00`}</SelectItem>
                              <SelectItem
                                value={`${hour}:30`}
                              >{`${hour}:30`}</SelectItem>
                            </React.Fragment>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <FormLabel>End Time</FormLabel>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select time" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 24 }).map((_, i) => {
                          const hour = i.toString().padStart(2, "0");
                          return (
                            <React.Fragment key={i}>
                              <SelectItem
                                value={`${hour}:00`}
                              >{`${hour}:00`}</SelectItem>
                              <SelectItem
                                value={`${hour}:30`}
                              >{`${hour}:30`}</SelectItem>
                            </React.Fragment>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <FormLabel>Location</FormLabel>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="main-office">
                        Main Office - Floor 5
                      </SelectItem>
                      <SelectItem value="branch-office">
                        Branch Office - Downtown
                      </SelectItem>
                      <SelectItem value="conference-center">
                        Conference Center
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <FormLabel>Notes</FormLabel>
                  <Input placeholder="Any special instructions or notes" />
                </div>
              </div>
            )}

            {/* Step 4: Send Invitation */}
            {preRegisterStep === 4 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <FormLabel>Invitation Method</FormLabel>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="email-invite" defaultChecked />
                      <label
                        htmlFor="email-invite"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Send email invitation
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="sms-invite" />
                      <label
                        htmlFor="sms-invite"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Send SMS notification
                      </label>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <FormLabel>Required Documents</FormLabel>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="nda-doc" />
                      <label
                        htmlFor="nda-doc"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Non-Disclosure Agreement
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="safety-doc" />
                      <label
                        htmlFor="safety-doc"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Safety Guidelines
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="covid-doc" />
                      <label
                        htmlFor="covid-doc"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Health Declaration
                      </label>
                    </div>
                  </div>
                </div>

                <div className="border rounded-md p-4 bg-muted/50">
                  <h4 className="font-medium mb-2">Invitation Preview</h4>
                  <div className="text-sm">
                    <p>
                      Subject: You've been invited to visit Company Name
                    </p>
                    <p className="mt-2">Dear John Smith,</p>
                    <p className="mt-2">
                      You have been invited to visit our office on{" "}
                      {selectedDate
                        ? format(selectedDate, "EEEE, MMMM d, yyyy")
                        : "[Date]"}{" "}
                      at 10:00 AM.
                    </p>
                    <p className="mt-2">Your host will be Sarah Johnson.</p>
                    <p className="mt-2">
                      Please check in at the reception desk upon arrival.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            {preRegisterStep > 1 && (
              <Button variant="outline" onClick={handlePreRegisterBack}>
                Back
              </Button>
            )}
            <Button onClick={handlePreRegisterNext}>
              {preRegisterStep < 4 ? "Next" : "Send Invitation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="records">Visitor Records</TabsTrigger>
          <TabsTrigger value="pre-registration">Pre-registration</TabsTrigger>
          <TabsTrigger value="badges">Badge Generation</TabsTrigger>
        </TabsList>

        {/* Visitor Records Tab */}
        <TabsContent value="records" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Visitor Records</CardTitle>
              <CardDescription>
                View and manage all visitor records. Filter, search, and export
                data as needed.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center mb-4">
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search records"
                      className="pl-8 w-[300px]"
                    />
                  </div>
                  <Button variant="outline" size="icon">
                    <Filter className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <FileText className="mr-2 h-4 w-4" /> Export CSV
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" /> Export PDF
                  </Button>
                </div>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Visitor</TableHead>
                      <TableHead>Host</TableHead>
                      <TableHead>Purpose</TableHead>
                      <TableHead>Check-in</TableHead>
                      <TableHead>Check-out</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visitorRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>{record.id}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{record.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {record.company}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{record.host}</TableCell>
                        <TableCell>{record.purpose}</TableCell>
                        <TableCell>
                          {record.checkIn
                            ? new Date(record.checkIn).toLocaleString()
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {record.checkOut
                            ? new Date(record.checkOut).toLocaleString()
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              record.status === "Active"
                                ? "default"
                                : record.status === "Expected"
                                  ? "outline"
                                  : "secondary"
                            }
                          >
                            {record.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pre-registration Tab */}
        <TabsContent value="pre-registration" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Pre-registered Visitors</CardTitle>
              <CardDescription>
                View and manage upcoming pre-registered visitors.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center mb-4">
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search pre-registrations"
                      className="pl-8 w-[300px]"
                    />
                  </div>
                  <Button variant="outline" size="icon">
                    <Filter className="h-4 w-4" />
                  </Button>
                </div>
                <Button onClick={() => setIsPreRegisterDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" /> New Pre-registration
                </Button>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Visitor</TableHead>
                      <TableHead>Host</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Purpose</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>
                        <div>
                          <div className="font-medium">Lisa Chen</div>
                          <div className="text-sm text-muted-foreground">
                            Innovation Labs
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>David Miller</TableCell>
                      <TableCell>May 16, 2023</TableCell>
                      <TableCell>10:00 AM</TableCell>
                      <TableCell>Meeting</TableCell>
                      <TableCell>
                        <Badge variant="outline">Expected</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm">
                            <Send className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Printer className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>
                        <div>
                          <div className="font-medium">James Taylor</div>
                          <div className="text-sm text-muted-foreground">
                            Finance Partners
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>Amanda White</TableCell>
                      <TableCell>May 16, 2023</TableCell>
                      <TableCell>11:30 AM</TableCell>
                      <TableCell>Interview</TableCell>
                      <TableCell>
                        <Badge variant="outline">Expected</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm">
                            <Send className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Printer className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Badge Generation Tab */}
        <TabsContent value="badges" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Badge Templates</CardTitle>
              <CardDescription>
                Select and customize badge templates for different visitor
                types.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {badgeTemplates.map((template) => (
                  <Card
                    key={template.id}
                    className="cursor-pointer hover:border-primary transition-colors"
                  >
                    <CardContent className="p-4 flex flex-col items-center">
                      <div className="w-full aspect-[3/4] bg-muted rounded-md mb-3 flex items-center justify-center">
                        <div className="w-3/4 h-4/5 bg-background rounded border flex flex-col items-center justify-center p-2">
                          <div className="w-16 h-16 rounded-full bg-muted-foreground/20 mb-2"></div>
                          <div className="w-3/4 h-2 bg-muted-foreground/20 rounded mb-1"></div>
                          <div className="w-1/2 h-2 bg-muted-foreground/20 rounded mb-3"></div>
                          <div className="w-3/4 h-2 bg-muted-foreground/20 rounded mb-1"></div>
                          <div className="w-2/3 h-2 bg-muted-foreground/20 rounded"></div>
                        </div>
                      </div>
                      <h3 className="font-medium text-sm">{template.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {template.description}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="mt-8">
                <h3 className="text-lg font-medium mb-4">
                  Print Visitor Badge
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <FormLabel>Select Template</FormLabel>
                      <Select defaultValue="1">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {badgeTemplates.map((template) => (
                            <SelectItem
                              key={template.id}
                              value={template.id.toString()}
                            >
                              {template.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <FormLabel>Visitor</FormLabel>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select visitor" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="lisa-chen">
                            Lisa Chen (Expected today)
                          </SelectItem>
                          <SelectItem value="james-taylor">
                            James Taylor (Expected today)
                          </SelectItem>
                          <SelectItem value="custom">
                            Enter custom details
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button className="w-full">
                      <Printer className="mr-2 h-4 w-4" /> Print Badge
                    </Button>
                  </div>

                  <div className="border rounded-md p-4 flex items-center justify-center">
                    <div className="w-3/4 aspect-[3/4] bg-background rounded border flex flex-col items-center justify-center p-4 shadow-md">
                      <div className="w-24 h-24 rounded-full bg-muted mb-4 overflow-hidden">
                        <img
                          src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&q=80"
                          alt="Visitor"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <h3 className="text-xl font-bold mb-1">Lisa Chen</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Innovation Labs
                      </p>
                      <p className="text-sm font-medium">
                        Visiting: David Miller
                      </p>
                      <p className="text-sm">Purpose: Meeting</p>
                      <div className="mt-4 pt-4 border-t w-full flex justify-center">
                        <p className="text-xs text-muted-foreground">
                          Valid: May 16, 2023
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default VisitorManagement;