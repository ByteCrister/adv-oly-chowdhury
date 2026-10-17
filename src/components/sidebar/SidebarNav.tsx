"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Briefcase,
  Gavel,
  Users,
  CheckSquare,
  FileText,
  Building2,
  Receipt,
  UserCheck,
  ExternalLink,
} from "lucide-react";
import type { NavSection, NavItem } from "../../types/sidebar.types";

interface SidebarNavProps {
  isCollapsed?: boolean;
  onNavigate?: () => void;
}

export const DASHBOARD_NAV_SECTIONS: NavSection[] = [
  {
    title: "Core Practice",
    items: [
      {
        title: "Overview",
        href: "/dashboard",
        icon: LayoutDashboard,
        exact: true,
        description: "Chamber analytics, cause list alerts, and case metrics",
      },
      {
        title: "Cases & Files",
        href: "/dashboard/cases",
        icon: Briefcase,
        description: "Civil, criminal, writ & taxation case dossiers",
      },
      {
        title: "Daily Cause List",
        href: "/dashboard/hearings",
        icon: Gavel,
        badge: "Sylhet Courts",
        badgeVariant: "gold",
        description: "Court hearings schedule & bench cause lists",
      },
      {
        title: "Clients Directory",
        href: "/dashboard/clients",
        icon: Users,
        description: "Client directory, KYC documents, and ledgers",
      },
    ],
  },
  {
    title: "Chamber Operations",
    items: [
      {
        title: "Chamber Tasks",
        href: "/dashboard/tasks",
        icon: CheckSquare,
        description: "Court filing deadlines & chamber action items",
      },
      {
        title: "Legal Documents",
        href: "/dashboard/documents",
        icon: FileText,
        description: "Petitions, orders, vakalatnama & digital exhibits",
      },
      {
        title: "Courts & Benches",
        href: "/dashboard/courts",
        icon: Building2,
        description: "Sylhet District Judiciary & revenue tribunal registry",
      },
    ],
  },
  {
    title: "Practice & Profile",
    items: [
      {
        title: "Fees & Accounts",
        href: "/dashboard/financials",
        icon: Receipt,
        description: "Client fee receipts, case expenses & retainers",
      },
      {
        title: "Advocate Profile",
        href: "/dashboard/profile",
        icon: UserCheck,
        description: "Bar council numbers, credentials & chamber details",
      },
    ],
  },
];

export function SidebarNav({ isCollapsed = false, onNavigate }: SidebarNavProps) {
  const pathname = usePathname();

  function isItemActive(item: NavItem): boolean {
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }

  return (
    <nav className="flex-1 overflow-y-auto px-3.5 py-4 space-y-6 sidebar-scrollbar">
      {DASHBOARD_NAV_SECTIONS.map((section, sectionIdx) => (
        <div key={section.title || sectionIdx} className="space-y-1.5">
          {/* Section Header with Subtle Hairline */}
          {!isCollapsed && section.title && (
            <div className="flex items-center gap-2 px-3 pt-1 pb-0.5 select-none">
              <span className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground/75">
                {section.title}
              </span>
              <div
                className="h-px flex-1 bg-gradient-to-r from-border/60 via-border/30 to-transparent"
                aria-hidden="true"
              />
            </div>
          )}

          {/* Nav Items List */}
          <div className="space-y-1">
            {section.items.map((item) => {
              const active = isItemActive(item);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  title={isCollapsed ? item.title : undefined}
                  className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 select-none ${
                    active
                      ? "sidebar-nav-active shadow-sm"
                      : "sidebar-nav-item text-muted-foreground hover:text-foreground"
                  } ${isCollapsed ? "justify-center px-2 py-3" : ""}`}
                >
                  {/* Active Neon Gold Indicator Bar */}
                  {active && <span aria-hidden="true" className="sidebar-active-glow-bar" />}

                  {/* Specular Upper Sheen Highlight */}
                  {active && <span aria-hidden="true" className="sidebar-nav-sheen" />}

                  {/* Nav Item Icon with Micro-Interactions */}
                  <Icon
                    className={`shrink-0 transition-transform duration-200 ${
                      isCollapsed ? "w-5 h-5" : "w-4 h-4"
                    } ${
                      active
                        ? "text-gold-600 dark:text-gold-300 scale-105 drop-shadow-[0_1px_3px_rgba(216,184,112,0.3)]"
                        : "text-muted-foreground group-hover:text-foreground group-hover:scale-110"
                    }`}
                  />

                  {/* Nav Item Label and Badges */}
                  {!isCollapsed && (
                    <div className="flex-1 flex items-center justify-between min-w-0">
                      <span className="truncate tracking-tight">{item.title}</span>

                      {/* Badge */}
                      {item.badge && (
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-md font-semibold tracking-wide uppercase shrink-0 transition-colors ${
                            item.badgeVariant === "gold"
                              ? "sidebar-badge-gold"
                              : item.badgeVariant === "urgent"
                              ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/25 shadow-sm"
                              : "bg-muted/80 text-muted-foreground border border-border/50"
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Collapsed Tooltip with Glassmorphic Floating Panel */}
                  {isCollapsed && (
                    <div className="absolute left-full ml-3 px-3 py-2 bg-card/95 dark:bg-midnight-950/95 backdrop-blur-2xl text-card-foreground text-xs rounded-xl shadow-2xl border border-gold-500/30 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 whitespace-nowrap z-50">
                      <div className="flex items-center gap-2 font-semibold">
                        <span>{item.title}</span>
                        {item.badge && (
                          <span className="sidebar-badge-gold text-[9px] px-1.5 py-0.2 rounded font-medium">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-[10px] text-muted-foreground mt-0.5 max-w-[200px] truncate">
                          {item.description}
                        </p>
                      )}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}

      {/* Quick link to Public Landing Page */}
      <div className="pt-2 border-t border-border/60 dark:border-white/10">
        <Link
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          title={isCollapsed ? "View Public Portfolio" : undefined}
          className={`sidebar-nav-item group flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground transition-all duration-200 ${
            isCollapsed ? "justify-center px-2 py-3" : ""
          }`}
        >
          <ExternalLink className="w-4 h-4 shrink-0 text-muted-foreground group-hover:text-gold-500 transition-colors" />
          {!isCollapsed && (
            <span className="truncate flex items-center justify-between flex-1">
              <span>Public Portfolio</span>
              <span className="text-[10px] text-muted-foreground/70 font-sans tracking-wide">
                Live ↗
              </span>
            </span>
          )}
        </Link>
      </div>
    </nav>
  );
}

export default SidebarNav;
