"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "./breadcrumb";

export interface BreadcrumbCrumb {
  label: string;
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export interface DashboardBreadcrumbProps {
  /**
   * Custom list of breadcrumb items.
   * If omitted, breadcrumb items are automatically generated from the current pathname.
   */
  items?: BreadcrumbCrumb[];
  /**
   * Optional trailing action or badge elements displayed on the right.
   */
  actions?: React.ReactNode;
  /**
   * Visual variant:
   * - "plain": Inline minimal breadcrumb
   * - "glass": Polished frosted card container with gold specular top hairline
   */
  variant?: "plain" | "glass";
  className?: string;
}

const ROUTE_LABELS: Record<string, string> = {
  dashboard: "Overview",
  cases: "Cases & Files",
  hearings: "Daily Cause List",
  clients: "Clients Directory",
  tasks: "Chamber Tasks",
  documents: "Legal Documents",
  courts: "Courts & Benches",
  financials: "Fees & Accounts",
  profile: "Advocate Profile",
  settings: "Settings",
  new: "New Case",
  edit: "Edit",
};

function formatSegmentLabel(segment: string): string {
  if (ROUTE_LABELS[segment]) {
    return ROUTE_LABELS[segment];
  }
  // Convert kebab-case or snake_case to Title Case
  return segment
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function DashboardBreadcrumb({
  items,
  actions,
  variant = "plain",
  className,
}: DashboardBreadcrumbProps) {
  const pathname = usePathname();

  const breadcrumbs: BreadcrumbCrumb[] = React.useMemo(() => {
    if (items && items.length > 0) {
      return items;
    }

    // Automatically derive from pathname
    const segments = pathname.split("/").filter(Boolean);
    const result: BreadcrumbCrumb[] = [
      {
        label: "Overview",
        href: "/dashboard",
        icon: LayoutDashboard,
      },
    ];

    if (segments.length <= 1 && segments[0] === "dashboard") {
      return result;
    }

    let accumulatedPath = "";
    segments.forEach((segment, index) => {
      accumulatedPath += `/${segment}`;
      if (segment === "dashboard") return;

      const isLast = index === segments.length - 1;
      result.push({
        label: formatSegmentLabel(segment),
        href: isLast ? undefined : accumulatedPath,
      });
    });

    return result;
  }, [items, pathname]);

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3",
        variant === "glass" &&
          "relative sidebar-user-glass px-4 py-2.5 rounded-2xl border border-border/70 dark:border-white/10 shadow-sm",
        className
      )}
    >
      {/* Specular Top Hairline for glass variant */}
      {variant === "glass" && (
        <div
          className="absolute top-0 inset-x-4 h-[1px] bg-gradient-to-r from-transparent via-gold-400/35 to-transparent pointer-events-none"
          aria-hidden="true"
        />
      )}

      <Breadcrumb>
        <BreadcrumbList>
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            const Icon = crumb.icon;

            return (
              <React.Fragment key={`${crumb.label}-${idx}`}>
                <BreadcrumbItem>
                  {isLast || !crumb.href ? (
                    <BreadcrumbPage className="flex items-center gap-1.5">
                      {Icon && <Icon className="w-3.5 h-3.5 text-gold-500 shrink-0" />}
                      <span>{crumb.label}</span>
                    </BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link
                        href={crumb.href}
                        className="flex items-center gap-1.5 text-muted-foreground hover:text-gold-600 dark:hover:text-gold-300 transition-colors"
                      >
                        {Icon && (
                          <Icon className="w-3.5 h-3.5 text-muted-foreground group-hover:text-gold-500 shrink-0" />
                        )}
                        <span>{crumb.label}</span>
                      </Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>

                {!isLast && (
                  <BreadcrumbSeparator>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/45" />
                  </BreadcrumbSeparator>
                )}
              </React.Fragment>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>

      {/* Trailing actions or badges */}
      {actions && (
        <div className="flex items-center gap-2 shrink-0">{actions}</div>
      )}
    </div>
  );
}

export default DashboardBreadcrumb;
