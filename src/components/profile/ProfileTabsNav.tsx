"use client";

import * as React from "react";
import { User, Award, Building2, MapPin, Shield } from "lucide-react";
import { PROFILE_TABS, ProfileTabConfig } from "@/const/profile.const";
import { ProfileTab } from "@/types/profile.ui.type";
import { StaggerContainer, StaggerItem } from "@/components/wrappers/Motion";
import { cn } from "@/lib/utils";

export interface ProfileTabsNavProps {
  activeTab: ProfileTab;
  onTabChange: (tab: ProfileTab) => void;
  className?: string;
}

const TAB_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  User,
  Award,
  Building2,
  MapPin,
  Shield,
};

export function ProfileTabsNav({
  activeTab,
  onTabChange,
  className,
}: ProfileTabsNavProps) {
  return (
    <StaggerContainer
      delay={0.05}
      staggerDelay={0.04}
      viewport={{ once: true, margin: "0px" }}
      className={cn(
        "flex items-center gap-1.5 p-1.5 rounded-2xl bg-card/60 dark:bg-card/30 backdrop-blur-md border border-border/70 dark:border-white/10 overflow-x-auto scrollbar-none",
        className
      )}
    >
      {PROFILE_TABS.map((tab: ProfileTabConfig) => {
        const Icon = TAB_ICONS[tab.iconName] || User;
        const isActive = activeTab === tab.id;

        return (
          <StaggerItem key={tab.id} yOffset={6} className="shrink-0">
            <button
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer select-none",
                isActive
                  ? "bg-gold-500/15 text-gold-600 dark:text-gold-400 border border-gold-500/35 shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60 border border-transparent"
              )}
            >
              <Icon
                className={cn(
                  "w-4 h-4 transition-colors",
                  isActive ? "text-gold-500" : "text-muted-foreground"
                )}
              />
              <span>{tab.label}</span>
            </button>
          </StaggerItem>
        );
      })}
    </StaggerContainer>
  );
}

export default ProfileTabsNav;
