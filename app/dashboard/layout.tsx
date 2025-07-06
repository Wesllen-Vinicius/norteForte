'use client';

import { ReactNode, Suspense, useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AuthGuard } from "@/components/auth-guard";
import { TopLoader } from "@/components/top-loader";
import { NavigationEvents } from "@/components/navigation-events";
import { DataProvider } from "@/components/data-provider";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNavigationStore } from "@/store/navigation.store";
import { Sheet, SheetContent } from "@/components/ui/sheet";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile();
  const { isMobileMenuOpen, toggleMobileMenu } = useNavigationStore();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (isMobile) {
    return (
      <AuthGuard>
        <DataProvider>
          <Suspense fallback={null}>
            <TopLoader />
            <NavigationEvents />
          </Suspense>
          <div className="flex min-h-screen flex-col">
            <SiteHeader />
            <main className="flex-1">{children}</main>
          </div>
          <Sheet open={isMobileMenuOpen} onOpenChange={toggleMobileMenu}>
            <SheetContent side="left" className="w-72 p-0 border-r-0">
              <AppSidebar />
            </SheetContent>
          </Sheet>
        </DataProvider>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <DataProvider>
        <Suspense fallback={null}>
          <TopLoader />
          <NavigationEvents />
        </Suspense>
        <SidebarProvider
          open={sidebarOpen}
          onOpenChange={setSidebarOpen}
          style={{ "--sidebar-width": "calc(var(--spacing) * 64)", "--header-height": "calc(var(--spacing) * 14)" } as React.CSSProperties}
        >
          <AppSidebar variant="inset" collapsible="icon"/>
          <SidebarInset>
            <SiteHeader />
            <main className="flex flex-1 flex-col">
              <div className="@container/main flex flex-1 flex-col gap-2 p-4 lg:p-6">
                {children}
              </div>
            </main>
          </SidebarInset>
        </SidebarProvider>
      </DataProvider>
    </AuthGuard>
  );
}
