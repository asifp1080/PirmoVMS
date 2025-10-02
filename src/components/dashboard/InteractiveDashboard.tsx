"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, Clock, Calendar, ArrowUpRight } from "lucide-react";

interface Visitor {
  id: string;
  name: string;
  photo: string;
  host: string;
  purpose: string;
  checkInTime: string;
  status: "checked-in" | "expected" | "checked-out";
  company?: string;
  email?: string;
}

const InteractiveDashboard = () => {
  const [activeTab, setActiveTab] = useState("current");
  const [searchQuery, setSearchQuery] = useState("");

  // Mock data for demonstration
  const mockVisitors: Visitor[] = [
    {
      id: "1",
      name: "John Smith",
      photo: "https://api.dicebear.com/7.x/avataaars/svg?seed=john",
      host: "Sarah Johnson",
      purpose: "Interview",
      checkInTime: "09:30 AM",
      status: "checked-in",
      company: "Acme Corp",
      email: "john@example.com",
    },
    {
      id: "2",
      name: "Emily Davis",
      photo: "https://api.dicebear.com/7.x/avataaars/svg?seed=emily",
      host: "Michael Brown",
      purpose: "Meeting",
      checkInTime: "10:15 AM",
      status: "checked-in",
      company: "Tech Solutions",
      email: "emily@example.com",
    },
    {
      id: "3",
      name: "Robert Wilson",
      photo: "https://api.dicebear.com/7.x/avataaars/svg?seed=robert",
      host: "Jennifer Lee",
      purpose: "Delivery",
      checkInTime: "11:00 AM",
      status: "checked-in",
      company: "Fast Logistics",
      email: "robert@example.com",
    },
    {
      id: "4",
      name: "Lisa Anderson",
      photo: "https://api.dicebear.com/7.x/avataaars/svg?seed=lisa",
      host: "David Miller",
      purpose: "Interview",
      checkInTime: "01:30 PM",
      status: "expected",
      company: "Creative Design",
      email: "lisa@example.com",
    },
    {
      id: "5",
      name: "James Taylor",
      photo: "https://api.dicebear.com/7.x/avataaars/svg?seed=james",
      host: "Patricia White",
      purpose: "Meeting",
      checkInTime: "02:45 PM",
      status: "expected",
      company: "Global Finance",
      email: "james@example.com",
    },
    {
      id: "6",
      name: "Maria Garcia",
      photo: "https://api.dicebear.com/7.x/avataaars/svg?seed=maria",
      host: "Thomas Clark",
      purpose: "Guest",
      checkInTime: "09:00 AM",
      status: "checked-out",
      company: "Innovate Inc",
      email: "maria@example.com",
    },
  ];

  const currentVisitors = mockVisitors.filter(
    (visitor) => visitor.status === "checked-in",
  );
  const expectedVisitors = mockVisitors.filter(
    (visitor) => visitor.status === "expected",
  );
  const checkedOutVisitors = mockVisitors.filter(
    (visitor) => visitor.status === "checked-out",
  );

  const filteredVisitors = (visitors: Visitor[]) => {
    if (!searchQuery) return visitors;
    return visitors.filter(
      (visitor) =>
        visitor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        visitor.host.toLowerCase().includes(searchQuery.toLowerCase()) ||
        visitor.purpose.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (visitor.company &&
          visitor.company.toLowerCase().includes(searchQuery.toLowerCase())),
    );
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "checked-in":
        return "bg-green-500 hover:bg-green-600";
      case "expected":
        return "bg-blue-500 hover:bg-blue-600";
      case "checked-out":
        return "bg-gray-500 hover:bg-gray-600";
      default:
        return "";
    }
  };

  return (
    <div className="w-full bg-background p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Interactive Dashboard</h1>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search visitors or hosts..."
              className="pl-10 w-[300px]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button variant="outline" size="sm">
            <Calendar className="h-4 w-4 mr-2" />
            Today
          </Button>
        </div>
      </div>

      <Tabs
        defaultValue="current"
        className="w-full"
        onValueChange={setActiveTab}
      >
        <TabsList className="mb-6">
          <TabsTrigger value="current">
            Current Visitors
            <Badge className="ml-2 bg-green-500 hover:bg-green-500">
              {currentVisitors.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="expected">
            Expected Arrivals
            <Badge className="ml-2 bg-blue-500 hover:bg-blue-500">
              {expectedVisitors.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="checked-out">
            Checked Out
            <Badge className="ml-2 bg-gray-500 hover:bg-gray-500">
              {checkedOutVisitors.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredVisitors(currentVisitors).length > 0 ? (
              filteredVisitors(currentVisitors).map((visitor) => (
                <VisitorCard key={visitor.id} visitor={visitor} />
              ))
            ) : (
              <div className="col-span-3 text-center py-10">
                <p className="text-muted-foreground">
                  No current visitors found
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="expected" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredVisitors(expectedVisitors).length > 0 ? (
              filteredVisitors(expectedVisitors).map((visitor) => (
                <VisitorCard key={visitor.id} visitor={visitor} />
              ))
            ) : (
              <div className="col-span-3 text-center py-10">
                <p className="text-muted-foreground">
                  No expected visitors found
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="checked-out" className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Visitor</TableHead>
                <TableHead>Host</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead>Check-in Time</TableHead>
                <TableHead>Check-out Time</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVisitors(checkedOutVisitors).length > 0 ? (
                filteredVisitors(checkedOutVisitors).map((visitor) => (
                  <TableRow key={visitor.id}>
                    <TableCell className="flex items-center space-x-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={visitor.photo} alt={visitor.name} />
                        <AvatarFallback>
                          {visitor.name.substring(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{visitor.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {visitor.company}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{visitor.host}</TableCell>
                    <TableCell>{visitor.purpose}</TableCell>
                    <TableCell>{visitor.checkInTime}</TableCell>
                    <TableCell>12:45 PM</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        <ArrowUpRight className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10">
                    <p className="text-muted-foreground">
                      No checked-out visitors found
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>
    </div>
  );
};

interface VisitorCardProps {
  visitor: Visitor;
}

const VisitorCard = ({ visitor }: VisitorCardProps) => {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex items-center space-x-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={visitor.photo} alt={visitor.name} />
              <AvatarFallback>{visitor.name.substring(0, 2)}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">{visitor.name}</CardTitle>
              <CardDescription>{visitor.company}</CardDescription>
            </div>
          </div>
          <Badge className={getStatusBadgeColor(visitor.status)}>
            {visitor.status === "checked-in"
              ? "Checked In"
              : visitor.status === "expected"
                ? "Expected"
                : "Checked Out"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Host:</span>
            <span className="font-medium">{visitor.host}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Purpose:</span>
            <span className="font-medium">{visitor.purpose}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {visitor.status === "expected"
                ? "Expected at:"
                : "Checked in at:"}
            </span>
            <span className="font-medium flex items-center">
              <Clock className="h-3 w-3 mr-1" />
              {visitor.checkInTime}
            </span>
          </div>
        </div>
        <div className="mt-4 flex justify-end space-x-2">
          {visitor.status === "checked-in" && (
            <Button size="sm" variant="outline">
              Check Out
            </Button>
          )}
          <Button size="sm" variant="outline">
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

function getStatusBadgeColor(status: string) {
  switch (status) {
    case "checked-in":
      return "bg-green-500 hover:bg-green-500";
    case "expected":
      return "bg-blue-500 hover:bg-blue-500";
    case "checked-out":
      return "bg-gray-500 hover:bg-gray-500";
    default:
      return "";
  }
}

export default InteractiveDashboard;
