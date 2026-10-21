"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronRight, ArrowLeft, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface CaseBreadcrumbHeaderProps {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  crumbs?: { label: string; href?: string }[];
  actions?: React.ReactNode;
}

export function CaseBreadcrumbHeader({
  title,
  subtitle,
  badge,
  backHref,
  backLabel = "Back to Cases",
  crumbs,
  actions,
}: CaseBreadcrumbHeaderProps) {
  return (
    <div className="space-y-4">
      {/* Top Breadcrumbs / Back Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          {backHref && (
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-7 px-2.5 rounded-lg text-xs gap-1.5 border-border/70 text-muted-foreground hover:text-foreground"
            >
              <Link href={backHref}>
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{backLabel}</span>
              </Link>
            </Button>
          )}

          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 font-medium">
            <Link
              href="/dashboard/cases"
              className="flex items-center gap-1 hover:text-gold-500 transition-colors"
            >
              <Briefcase className="w-3.5 h-3.5 text-gold-500" />
              <span>Cases &amp; Files</span>
            </Link>

            {crumbs?.map((crumb, idx) => (
              <React.Fragment key={`${crumb.label}-${idx}`}>
                <ChevronRight className="w-3 h-3 text-muted-foreground/40 shrink-0" />
                {crumb.href ? (
                  <Link href={crumb.href} className="hover:text-gold-500 transition-colors">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-foreground font-semibold truncate max-w-[200px]">
                    {crumb.label}
                  </span>
                )}
              </React.Fragment>
            ))}
          </nav>
        </div>

        {actions && <div className="flex items-center gap-2.5">{actions}</div>}
      </div>

      {/* Main Title & Subtitle Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/40">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {title}
            </h1>
            {badge}
          </div>
          {subtitle && (
            <p className="text-xs sm:text-sm text-muted-foreground font-normal">
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default CaseBreadcrumbHeader;
