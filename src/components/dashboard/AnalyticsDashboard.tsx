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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Download, Calendar } from "lucide-react";

interface AnalyticsCardProps {
  title: string;
  value: string;
  description?: string;
  icon?: React.ReactNode;
}

const AnalyticsCard = (
  { title, value, description, icon }: AnalyticsCardProps = {
    title: "Analytics Card",
    value: "0",
    description: "No data available",
  },
) => {
  return (
    <Card className="bg-background">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
};

interface ChartContainerProps {
  title: string;
  children: React.ReactNode;
}

const ChartContainer = (
  { title, children }: ChartContainerProps = {
    title: "Chart",
    children: (
      <div className="h-[300px] flex items-center justify-center">
        Chart placeholder
      </div>
    ),
  },
) => {
  return (
    <Card className="bg-background">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
};

const AnalyticsDashboard = () => {
  const [timeRange, setTimeRange] = useState("7d");
  const [activeTab, setActiveTab] = useState("traffic");

  // Placeholder data for charts
  const visitorTrafficChart = (
    <div className="h-[300px] w-full bg-muted/20 rounded-md flex items-center justify-center">
      <p className="text-muted-foreground">Visitor Traffic Chart Placeholder</p>
    </div>
  );

  const hostActivityChart = (
    <div className="h-[300px] w-full bg-muted/20 rounded-md flex items-center justify-center">
      <p className="text-muted-foreground">Host Activity Chart Placeholder</p>
    </div>
  );

  const checkInTimeChart = (
    <div className="h-[300px] w-full bg-muted/20 rounded-md flex items-center justify-center">
      <p className="text-muted-foreground">Check-in Time Chart Placeholder</p>
    </div>
  );

  const documentComplianceChart = (
    <div className="h-[300px] w-full bg-muted/20 rounded-md flex items-center justify-center">
      <p className="text-muted-foreground">
        Document Compliance Chart Placeholder
      </p>
    </div>
  );

  return (
    <div className="space-y-6 p-6 bg-background">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">
          Analytics Dashboard
        </h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">Last 24 hours</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="custom">Custom range</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <AnalyticsCard
          title="Total Visitors"
          value="1,284"
          description="+12.3% from last period"
        />
        <AnalyticsCard
          title="Average Visit Duration"
          value="42 min"
          description="-5.2% from last period"
        />
        <AnalyticsCard
          title="Document Compliance"
          value="94%"
          description="+2.1% from last period"
        />
        <AnalyticsCard
          title="Busiest Location"
          value="HQ Office"
          description="32% of all visits"
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="traffic">Visitor Traffic</TabsTrigger>
          <TabsTrigger value="hosts">Host Activity</TabsTrigger>
          <TabsTrigger value="checkin">Check-in Time</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>
        <TabsContent value="traffic" className="mt-6">
          <ChartContainer title="Visitor Traffic Over Time">
            {visitorTrafficChart}
          </ChartContainer>
          <div className="grid gap-4 md:grid-cols-2 mt-4">
            <Card className="bg-background">
              <CardHeader>
                <CardTitle className="text-lg">Peak Visit Hours</CardTitle>
                <CardDescription>
                  Most active times for visitors
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[200px] bg-muted/20 rounded-md flex items-center justify-center">
                  <p className="text-muted-foreground">
                    Peak Hours Chart Placeholder
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-background">
              <CardHeader>
                <CardTitle className="text-lg">
                  Visit Purpose Distribution
                </CardTitle>
                <CardDescription>Breakdown by visit reason</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[200px] bg-muted/20 rounded-md flex items-center justify-center">
                  <p className="text-muted-foreground">
                    Purpose Distribution Chart Placeholder
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="hosts" className="mt-6">
          <ChartContainer title="Host Activity Analysis">
            {hostActivityChart}
          </ChartContainer>
          <div className="grid gap-4 md:grid-cols-2 mt-4">
            <Card className="bg-background">
              <CardHeader>
                <CardTitle className="text-lg">Most Active Hosts</CardTitle>
                <CardDescription>
                  Top 5 employees receiving visitors
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-muted"></div>
                        <div>
                          <p className="font-medium">Host Name {i}</p>
                          <p className="text-xs text-muted-foreground">
                            Department {i}
                          </p>
                        </div>
                      </div>
                      <div className="text-sm font-medium">
                        {Math.floor(Math.random() * 50) + 10} visitors
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-background">
              <CardHeader>
                <CardTitle className="text-lg">Visitor-to-Host Ratio</CardTitle>
                <CardDescription>Distribution by department</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[200px] bg-muted/20 rounded-md flex items-center justify-center">
                  <p className="text-muted-foreground">
                    Ratio Chart Placeholder
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="checkin" className="mt-6">
          <ChartContainer title="Check-in Time Analysis">
            {checkInTimeChart}
          </ChartContainer>
          <div className="grid gap-4 md:grid-cols-2 mt-4">
            <Card className="bg-background">
              <CardHeader>
                <CardTitle className="text-lg">
                  Average Check-in Duration
                </CardTitle>
                <CardDescription>
                  Time to complete check-in process
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[200px] bg-muted/20 rounded-md flex items-center justify-center">
                  <p className="text-muted-foreground">
                    Duration Chart Placeholder
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-background">
              <CardHeader>
                <CardTitle className="text-lg">
                  Check-in Completion Rate
                </CardTitle>
                <CardDescription>
                  Percentage of completed vs abandoned check-ins
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[200px] bg-muted/20 rounded-md flex items-center justify-center">
                  <p className="text-muted-foreground">
                    Completion Rate Chart Placeholder
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="compliance" className="mt-6">
          <ChartContainer title="Document Compliance Reports">
            {documentComplianceChart}
          </ChartContainer>
          <div className="grid gap-4 md:grid-cols-2 mt-4">
            <Card className="bg-background">
              <CardHeader>
                <CardTitle className="text-lg">
                  Unsigned Document Reports
                </CardTitle>
                <CardDescription>Documents pending signature</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">NDA Document {i}</p>
                        <p className="text-xs text-muted-foreground">
                          {Math.floor(Math.random() * 10) + 1} pending
                          signatures
                        </p>
                      </div>
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-background">
              <CardHeader>
                <CardTitle className="text-lg">Compliance Percentage</CardTitle>
                <CardDescription>By document type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[200px] bg-muted/20 rounded-md flex items-center justify-center">
                  <p className="text-muted-foreground">
                    Compliance Chart Placeholder
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnalyticsDashboard;
