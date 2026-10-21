"use client";

import Link from "next/link";
import { Briefcase, Gavel, Users, CheckSquare, ArrowUpRight } from "lucide-react";
import { StaggerContainer, StaggerItem } from "@/components/wrappers/Motion";
import { NumberCounter } from "@/components/shared";
import type { DashboardStatsDto } from "@/types/dashboard.ui.type";

export interface DashboardStatsProps {
  stats?: DashboardStatsDto;
}

export function DashboardStats({ stats }: DashboardStatsProps) {
  const activeCases = stats?.activeCases ?? 0;
  const activeCasesSubtext =
    stats?.activeCasesSubtext ||
    (activeCases === 0 ? "No active litigation matters" : `${activeCases} active matters`);

  const upcomingHearings = stats?.upcomingHearings ?? 0;
  const todayHearingsCount = stats?.todayHearingsCount ?? 0;
  const hearingsSubtext =
    todayHearingsCount > 0
      ? `${todayHearingsCount} scheduled for today`
      : upcomingHearings > 0
      ? "0 today • Scheduled hearings upcoming"
      : "No upcoming hearings";

  const activeClients = stats?.activeClients ?? 0;
  const activeClientsSubtext =
    stats?.activeClientsSubtext ||
    (activeClients === 0 ? "No active clients registered" : `${activeClients} registered clients`);

  const pendingTasks = stats?.pendingTasks ?? 0;
  const urgentTasksCount = stats?.urgentTasksCount ?? 0;
  const tasksSubtext =
    urgentTasksCount > 0
      ? `${urgentTasksCount} urgent filing ${urgentTasksCount === 1 ? "deadline" : "deadlines"}`
      : pendingTasks > 0
      ? "0 urgent • Standard deadlines pending"
      : "All chamber tasks completed";

  const statCards = [
    {
      label: "Active Cases",
      value: activeCases,
      subtext: activeCasesSubtext,
      icon: Briefcase,
      href: "/dashboard/cases",
      delay: 0.1,
    },
    {
      label: "Upcoming Hearings",
      value: upcomingHearings,
      subtext: hearingsSubtext,
      icon: Gavel,
      href: "/dashboard/hearings",
      delay: 0.18,
    },
    {
      label: "Active Clients",
      value: activeClients,
      subtext: activeClientsSubtext,
      icon: Users,
      href: "/dashboard/clients",
      delay: 0.26,
    },
    {
      label: "Pending Chamber Tasks",
      value: pendingTasks,
      subtext: tasksSubtext,
      icon: CheckSquare,
      href: "/dashboard/tasks",
      delay: 0.34,
    },
  ];

  return (
    <StaggerContainer
      delay={0.05}
      staggerDelay={0.08}
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6"
    >
      {statCards.map((stat) => {
        const Icon = stat.icon;
        return (
          <StaggerItem key={stat.label} yOffset={14} className="h-full">
            <Link
              href={stat.href}
              className="group relative flex flex-col justify-between p-5 rounded-2xl bg-card/85 dark:bg-card/60 border border-border/70 dark:border-white/10 hover:border-gold-500/40 shadow-sm hover:shadow-lg hover:shadow-gold-500/5 transition-all duration-200 h-full"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  {stat.label}
                </span>
                <div className="p-2 rounded-xl bg-muted/70 group-hover:bg-gold-500/10 text-muted-foreground group-hover:text-gold-500 transition-colors">
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              <div className="my-3">
                <span className="text-3xl font-serif font-bold text-foreground tracking-tight flex items-baseline gap-0.5">
                  <NumberCounter
                    value={stat.value}
                    delay={stat.delay}
                    stiffness={90}
                    damping={32}
                    className="font-serif font-bold text-foreground"
                  />
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border/50">
                <span className="truncate">{stat.subtext}</span>
                <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all text-gold-500" />
              </div>
            </Link>
          </StaggerItem>
        );
      })}
    </StaggerContainer>
  );
}

export default DashboardStats;
