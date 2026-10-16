"use client";

import * as React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { useDashboardOverview } from "@/hooks/dashboard";
import { DashboardBreadcrumb } from "@/components/shared";
import ChamberBanner from "./ChamberBanner";
import DashboardStats from "./DashboardStats";
import TodayCauseList from "./TodayCauseList";
import ChamberTasks from "./ChamberTasks";
import QuickActionsPanel from "./QuickActionsPanel";
import RecentCasesTable from "./RecentCasesTable";
import { DashboardOverviewSkeleton } from "./DashboardSkeleton";

export function DashboardOverview() {
  const { data: response, isLoading, isError, error, refetch } = useDashboardOverview();

  if (isLoading) {
    return <DashboardOverviewSkeleton />;
  }

  if (isError || !response?.data) {
    return (
      <div className="p-8 rounded-3xl bg-card border border-destructive/30 text-center space-y-4 max-w-lg mx-auto my-12">
        <div className="w-12 h-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="font-serif text-lg font-bold text-foreground">
          Unable to Load Chamber Overview
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {error?.message || "A network or database issue occurred while retrieving judicial records."}
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="btn-gold-gloss inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry Connection</span>
        </button>
      </div>
    );
  }

  const { advocate, stats, todayHearings, recentCases, chamberTasks } = response.data;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 0. Top Dashboard Breadcrumb */}
      <DashboardBreadcrumb />

      {/* 1. Chamber Status & Welcome Banner */}
      <ChamberBanner
        advocateName={advocate.preferredName || advocate.name}
        hearingCount={stats.todayHearingsCount}
        urgentTaskCount={stats.urgentTasksCount}
        chamberLocation={advocate.chamberLocation}
      />

      {/* 2. Key Metrics Grid with NumberCounter Animation */}
      <DashboardStats stats={stats} />

      {/* 3. Cause List & Chamber Action Center */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        <div className="lg:col-span-2">
          <TodayCauseList hearings={todayHearings} />
        </div>
        <div className="space-y-6">
          <ChamberTasks tasks={chamberTasks} />
          <QuickActionsPanel />
        </div>
      </div>

      {/* 4. Recent Case Matters Table */}
      <RecentCasesTable cases={recentCases} />
    </div>
  );
}

export default DashboardOverview;
