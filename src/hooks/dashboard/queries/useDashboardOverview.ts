"use client";

import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import axios from "axios";
import { DashboardApiResponse } from "@/types/dashboard.ui.type";
import { DASHBOARD_QUERY_KEYS, DASHBOARD_DEFAULTS } from "@/const/dashboard.const";

export const dashboardKeys = DASHBOARD_QUERY_KEYS;

export async function fetchDashboardOverview(): Promise<DashboardApiResponse> {
  const response = await axios.get<DashboardApiResponse>("/api/v1/dashboard/overview");
  return response.data;
}

export function useDashboardOverview(
  options?: Omit<
    UseQueryOptions<
      DashboardApiResponse,
      Error,
      DashboardApiResponse,
      ReturnType<typeof dashboardKeys.overview>
    >,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: dashboardKeys.overview(),
    queryFn: fetchDashboardOverview,
    staleTime: DASHBOARD_DEFAULTS.refreshInterval,
    ...options,
  });
}

export default useDashboardOverview;
