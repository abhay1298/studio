"use client";

import {
  Sidebar,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarContent
} from "@/components/ui/sidebar";
import { Bot, LayoutDashboard, PlayCircle, BarChart3, FileText, Settings, LifeBuoy, BookOpen } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const menuItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/execution", label: "Execution", icon: PlayCircle },
  { href: "/dashboard/results", label: "Results", icon: BarChart3 },
  { href: "/dashboard/reports", label: "Reports", icon: FileText },
];

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar>
        <SidebarHeader>
            <div className="flex items-center gap-2 p-2">
                <div className="bg-primary rounded-lg p-2 text-primary-foreground">
                    <Bot className="size-6" />
                </div>
                <span className="font-headline text-lg font-semibold">Robot Maestro</span>
            </div>
        </SidebarHeader>
        <SidebarContent className="p-2">
            <SidebarMenu>
                {menuItems.map((item) => (
                    <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                            asChild
                            isActive={pathname === item.href}
                            tooltip={item.label}
                            className="justify-start"
                        >
                            <Link href={item.href}>
                                <item.icon className="size-5" />
                                <span>{item.label}</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                ))}
            </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
             <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton 
                        asChild
                        isActive={pathname === "/dashboard/help"} 
                        className="justify-start" 
                        tooltip="Help & Documentation">
                        <Link href="/dashboard/help">
                            <BookOpen className="size-5" />
                            <span>Help & Docs</span>
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <SidebarMenuButton className="justify-start" tooltip="Settings">
                        <Settings className="size-5" />
                        <span>Settings</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
             </SidebarMenu>
        </SidebarFooter>
    </Sidebar>
  );
}
