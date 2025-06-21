import { ReactNode, Suspense } from "react";
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AuthGuard } from "@/components/auth-guard";
import { TopLoader } from "@/components/top-loader";
import { NavigationEvents } from "@/components/navigation-events";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <Suspense fallback={null}>
        <TopLoader />
        <NavigationEvents />
      </Suspense>
      <SidebarProvider style={{ "--sidebar-width": "calc(var(--spacing) * 72)", "--header-height": "calc(var(--spacing) * 12)" } as React.CSSProperties} >
        <AppSidebar variant="inset" />
        <SidebarInset>
          <SiteHeader />
          <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2">
              {children}
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </AuthGuard>
  )
}
