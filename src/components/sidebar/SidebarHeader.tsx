"use client";

import * as React from "react";
import Link from "next/link";
import { Scale, ChevronLeft, ChevronRight, X } from "lucide-react";

interface SidebarHeaderProps {
  isCollapsed: boolean;
  onToggleCollapse?: () => void;
  onCloseMobile?: () => void;
  isMobile?: boolean;
}

export function SidebarHeader({
  isCollapsed,
  onToggleCollapse,
  onCloseMobile,
  isMobile = false,
}: SidebarHeaderProps) {
  return (
    <div className="relative flex items-center justify-between px-4 py-4 border-b border-border/70 dark:border-white/10 min-h-[72px]">
      {/* Specular Top Accent Hairline */}
      <div
        className="absolute top-0 inset-x-4 h-[1px] bg-gradient-to-r from-transparent via-gold-400/40 to-transparent pointer-events-none"
        aria-hidden="true"
      />

      <Link
        href="/dashboard"
        className={`flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 rounded-xl p-1 -m-1 transition-all ${
          isCollapsed ? "justify-center w-full" : "min-w-0"
        }`}
        title="Advocate Oly Chowdhury - Chamber Dashboard"
      >
        {/* Scales of Justice Gloss Medallion */}
        <div className="sidebar-emblem-gloss relative flex items-center justify-center w-10 h-10 rounded-xl text-gold-600 dark:text-gold-400 shrink-0 group-hover:scale-105 transition-transform duration-300">
          <Scale className="w-5 h-5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.15)] transition-transform duration-300 group-hover:rotate-[-6deg]" />
          
          {/* Active Chamber Status Pulsing Dot */}
          <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 ring-2 ring-background" />
          </span>
        </div>

        {/* Brand Text when Expanded */}
        {!isCollapsed && (
          <div className="flex flex-col min-w-0 transition-opacity duration-200">
            <span className="font-serif text-sm font-bold tracking-tight text-foreground group-hover:text-gold-600 dark:group-hover:text-gold-300 transition-colors truncate">
              Advocate Oly Chowdhury
            </span>
            <span className="text-[11px] font-medium text-muted-foreground truncate flex items-center gap-1.5 mt-0.5">
              <span>Judge&apos;s Court, Sylhet</span>
              <span className="sidebar-badge-gold text-[9px] px-1.5 py-0.2 rounded font-semibold tracking-wide">
                Ch. 323
              </span>
            </span>
          </div>
        )}
      </Link>

      {/* Collapse / Close Controls */}
      <div className="flex items-center shrink-0 ml-2">
        {isMobile ? (
          <button
            type="button"
            onClick={onCloseMobile}
            className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 border border-transparent hover:border-border/60 transition-all"
            aria-label="Close sidebar navigation"
          >
            <X className="w-5 h-5" />
          </button>
        ) : (
          onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className={`hidden lg:flex items-center justify-center w-7 h-7 rounded-lg text-muted-foreground hover:text-gold-600 dark:hover:text-gold-300 bg-white/40 dark:bg-white/[0.04] border border-border/60 hover:border-gold-500/40 hover:shadow-sm transition-all duration-200 ${
                isCollapsed ? "mx-auto mt-1" : ""
              }`}
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              ) : (
                <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
              )}
            </button>
          )
        )}
      </div>
    </div>
  );
}

export default SidebarHeader;
