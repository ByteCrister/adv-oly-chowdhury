"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Plus, Calendar } from "lucide-react";
import DashboardSidebar from "@/components/sidebar/DashboardSidebar";

export interface DashboardLayoutWrapperProps {
  children: React.ReactNode;
}

function getPageTitle(pathname: string): { title: string; subtitle: string } {
  if (pathname === "/dashboard") {
    return {
      title: "Chamber Overview",
      subtitle: "Advocate Aminul Islam Chowdhury Oly • Judge's Court, Sylhet",
    };
  }
  if (pathname.startsWith("/dashboard/cases")) {
    return {
      title: "Cases & Case Files",
      subtitle: "Civil, criminal, writ, and revenue litigation dossiers",
    };
  }
  if (pathname.startsWith("/dashboard/hearings")) {
    return {
      title: "Daily Cause List & Hearings",
      subtitle: "Court appearance schedule & judicial cause lists",
    };
  }
  if (pathname.startsWith("/dashboard/clients")) {
    return {
      title: "Clients Directory",
      subtitle: "Client profiles, KYC records, and matter histories",
    };
  }
  if (pathname.startsWith("/dashboard/tasks")) {
    return {
      title: "Chamber Tasks & To-Dos",
      subtitle: "Court filings, certified copy deadlines & drafting items",
    };
  }
  if (pathname.startsWith("/dashboard/documents")) {
    return {
      title: "Legal Document Vault",
      subtitle: "Cloudinary-backed evidence, petitions, and court orders",
    };
  }
  if (pathname.startsWith("/dashboard/courts")) {
    return {
      title: "Courts & Benches",
      subtitle: "Sylhet district judiciary and revenue tribunal registry",
    };
  }
  if (pathname.startsWith("/dashboard/financials")) {
    return {
      title: "Fees & Accounts",
      subtitle: "Professional fees, money receipts & case disbursements",
    };
  }
  if (pathname.startsWith("/dashboard/profile")) {
    return {
      title: "Advocate Profile & Credentials",
      subtitle: "Bar registrations, chamber address & academic credentials",
    };
  }
  if (pathname.startsWith("/dashboard/settings")) {
    return {
      title: "Chamber Settings",
      subtitle: "Security, login credentials & preferences",
    };
  }
  return {
    title: "Chamber Portal",
    subtitle: "Advocate Aminul Islam Chowdhury Oly",
  };
}

export function DashboardLayoutWrapper({ children }: DashboardLayoutWrapperProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);

  const { title, subtitle } = getPageTitle(pathname);

  function handleToggleCollapse() {
    setIsCollapsed((prev) => !prev);
  }

  return (
    <div className="min-h-screen flex bg-background text-foreground selection:bg-gold-300 selection:text-midnight-950">
      {/* 1. Dashboard Sidebar (Desktop Sticky + Mobile Slide-out) */}
      <DashboardSidebar
        isCollapsed={isCollapsed}
        onToggleCollapse={handleToggleCollapse}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      {/* 2. Main Content Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top Navbar Header with Glass & Hairline */}
        <header className="sticky top-0 z-20 flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8 bg-card/75 dark:bg-[#070D1A]/80 border-b border-border/70 dark:border-white/10 backdrop-blur-2xl transition-all shadow-[0_4px_20px_-4px_rgba(16,28,51,0.03)] dark:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.4)]">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile Sidebar Hamburger Toggle */}
            <button
              type="button"
              onClick={() => setIsMobileOpen(true)}
              className="lg:hidden p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 border border-border/60 transition-colors"
              aria-label="Open mobile navigation"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Current Route Title & Subtitle */}
            <div className="flex flex-col min-w-0">
              <h1 className="text-sm sm:text-base font-bold font-serif text-foreground truncate">
                {title}
              </h1>
              <p className="text-[11px] text-muted-foreground truncate hidden sm:block">
                {subtitle}
              </p>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Judicial Session Pill */}
            <div className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full sidebar-badge-gold text-[11px] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Court Hours Active</span>
            </div>

            {/* Quick Action: New Case Button */}
            <Link
              href="/dashboard/cases/new"
              className="btn-gold-gloss inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-midnight-950 text-xs font-semibold shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Case</span>
              <span className="sm:hidden">New</span>
            </Link>

            {/* Quick Link to Hearings / Cause List */}
            <Link
              href="/dashboard/hearings"
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 border border-border/60 hover:border-gold-500/30 transition-colors"
              title="View Daily Cause List"
              aria-label="Cause list"
            >
              <Calendar className="w-4 h-4 text-gold-500 dark:text-gold-400" />
            </Link>
          </div>
        </header>

        {/* 3. Main Page Content Viewport */}
        <main className="flex-1 w-full p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto flex flex-col">
          {children}
        </main>
      </div>
    </div>
  );
}

export default DashboardLayoutWrapper;
