"use client";

import { ReactNode, Suspense } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { TopLoader } from "@/components/top-loader";
import { NavigationEvents } from "@/components/navigation-events";
import { DataProvider } from "@/components/data-provider";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNavigationStore } from "@/store/navigation.store";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile();
  const { isMobileMenuOpen, toggleMobileMenu } = useNavigationStore();

  if (isMobile) {
    return (
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
    );
  }

  return (
    <DataProvider>
      <Suspense fallback={null}>
        <TopLoader />
        <NavigationEvents />
      </Suspense>
      <SidebarProvider
        style={{ "--sidebar-width": "16rem", "--header-height": "56px" } as React.CSSProperties}
      >
        <AppSidebar variant="inset" />
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
  );
}
