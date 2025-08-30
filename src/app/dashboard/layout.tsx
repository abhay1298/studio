
import { DashboardHeader } from '@/components/dashboard/header';
import { DashboardSidebar } from '@/components/dashboard/sidebar';
import { SharedStateProvider } from '@/components/providers/shared-state-provider';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SharedStateProvider>
        <SidebarProvider>
        <DashboardSidebar />
        <SidebarInset>
            <DashboardHeader />
            <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-background">
            {children}
            </main>
        </SidebarInset>
        </SidebarProvider>
    </SharedStateProvider>
  );
}
