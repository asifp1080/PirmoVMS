import React from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import InteractiveDashboard from "@/components/dashboard/InteractiveDashboard";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <DashboardLayout>
        <InteractiveDashboard />
      </DashboardLayout>
    </div>
  );
}
