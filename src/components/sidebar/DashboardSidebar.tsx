"use client";

import * as React from "react";
import SidebarHeader from "./SidebarHeader";
import SidebarNav from "./SidebarNav";
import SidebarUser from "./SidebarUser";
import type { SidebarProps } from "../../types/sidebar.types";

export function DashboardSidebar({
  isCollapsed = false,
  onToggleCollapse,
  isMobileOpen = false,
  onCloseMobile,
  className = "",
}: SidebarProps) {
  // Close mobile drawer on escape key
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isMobileOpen && onCloseMobile) {
        onCloseMobile();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMobileOpen, onCloseMobile]);

  // Lock body scroll on mobile when drawer is open
  React.useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileOpen]);

  return (
    <>
      {/* ──────────────── Desktop Sidebar ──────────────── */}
      <aside
        aria-label="Chamber Navigation"
        className={`hidden lg:flex flex-col shrink-0 h-screen sticky top-0 sidebar-gloss-surface transition-[width] duration-300 ease-in-out z-30 select-none ${
          isCollapsed ? "w-20" : "w-72"
        } ${className}`}
      >
        <SidebarHeader
          isCollapsed={isCollapsed}
          onToggleCollapse={onToggleCollapse}
        />
        <SidebarNav isCollapsed={isCollapsed} />
        <SidebarUser isCollapsed={isCollapsed} />
      </aside>

      {/* ──────────────── Mobile Overlay & Slide-Over Drawer ──────────────── */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop Blur Overlay with Midnight Sapphire Tint */}
          <div
            className="fixed inset-0 bg-midnight-950/75 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
            onClick={onCloseMobile}
            aria-hidden="true"
          />

          {/* Slide-out Drawer with Premium Gloss Surface */}
          <div
            className="relative flex flex-col w-76 max-w-[85vw] h-full sidebar-gloss-surface shadow-2xl z-10 animate-in slide-in-from-left duration-300 ease-out"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile Navigation Menu"
          >
            <SidebarHeader
              isCollapsed={false}
              onCloseMobile={onCloseMobile}
              isMobile={true}
            />
            <SidebarNav isCollapsed={false} onNavigate={onCloseMobile} />
            <SidebarUser isCollapsed={false} />
          </div>
        </div>
      )}
    </>
  );
}

export default DashboardSidebar;
