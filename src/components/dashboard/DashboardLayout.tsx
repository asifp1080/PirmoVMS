"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  Users,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  UserCircle,
} from "lucide-react";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout = ({
  children = <div>Content goes here</div>,
}: DashboardLayoutProps) => {
  const pathname = usePathname();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Visitor Management", href: "/visitors", icon: Users },
    { name: "Employee Directory", href: "/employees", icon: UserCircle },
    { name: "Document Management", href: "/documents", icon: FileText },
    { name: "Analytics", href: "/analytics", icon: BarChart3 },
  ];

  const isActive = (path: string) => {
    return pathname === path;
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r bg-card">
        <div className="p-6">
          <div className="flex items-center">
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold">VM</span>
            </div>
            <span className="ml-3 text-xl font-semibold">VisitorMate</span>
          </div>
        </div>
        <nav className="flex-1 px-4 pb-4 space-y-1">
          {navigation.map((item) => {
            const isItemActive = isActive(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center px-4 py-3 text-sm font-medium rounded-md",
                  isItemActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <item.icon
                  className={cn(
                    "mr-3 h-5 w-5",
                    isItemActive ? "text-primary" : "text-muted-foreground",
                  )}
                />
                {item.name}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 mt-auto">
          <Separator className="my-4" />
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Avatar>
                <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=admin" />
                <AvatarFallback>AD</AvatarFallback>
              </Avatar>
              <div className="ml-3">
                <p className="text-sm font-medium">Admin User</p>
                <p className="text-xs text-muted-foreground">
                  admin@visitormate.com
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon">
              <Settings className="h-5 w-5" />
            </Button>
          </div>
          <Button variant="outline" className="w-full mt-4">
            <LogOut className="mr-2 h-4 w-4" /> Sign Out
          </Button>
        </div>
      </aside>

      {/* Mobile Navigation and Main Content */}
      <Sheet open={isMobileNavOpen} onOpenChange={setIsMobileNavOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <div className="p-6">
            <div className="flex items-center">
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold">VM</span>
              </div>
              <span className="ml-3 text-xl font-semibold">VisitorMate</span>
            </div>
          </div>
          <nav className="flex-1 px-4 pb-4 space-y-1">
            {navigation.map((item) => {
              const isItemActive = isActive(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMobileNavOpen(false)}
                  className={cn(
                    "flex items-center px-4 py-3 text-sm font-medium rounded-md",
                    isItemActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <item.icon
                    className={cn(
                      "mr-3 h-5 w-5",
                      isItemActive ? "text-primary" : "text-muted-foreground",
                    )}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>
          <div className="p-4 mt-auto">
            <Separator className="my-4" />
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Avatar>
                  <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=admin" />
                  <AvatarFallback>AD</AvatarFallback>
                </Avatar>
                <div className="ml-3">
                  <p className="text-sm font-medium">Admin User</p>
                  <p className="text-xs text-muted-foreground">
                    admin@visitormate.com
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon">
                <Settings className="h-5 w-5" />
              </Button>
            </div>
            <Button variant="outline" className="w-full mt-4">
              <LogOut className="mr-2 h-4 w-4" /> Sign Out
            </Button>
          </div>
        </SheetContent>

        {/* Main Content */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Header */}
          <header className="bg-card border-b">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center md:hidden">
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                  >
                    <Menu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
                <span className="ml-3 text-lg font-semibold">VisitorMate</span>
              </div>
              <div className="hidden md:block">
                <h1 className="text-xl font-semibold">
                  {navigation.find((item) => isActive(item.href))?.name ||
                    "Dashboard"}
                </h1>
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm">
                  Help
                </Button>
                <Avatar className="md:hidden">
                  <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=admin" />
                  <AvatarFallback>AD</AvatarFallback>
                </Avatar>
              </div>
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 overflow-auto p-4 md:p-6 bg-background">
            {children}
          </main>
        </div>
      </Sheet>
    </div>
  );
};

export default DashboardLayout;