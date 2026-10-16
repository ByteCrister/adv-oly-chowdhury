export const DASHBOARD_QUERY_KEYS = {
  all: ["dashboard"] as const,
  overview: () => [...DASHBOARD_QUERY_KEYS.all, "overview"] as const,
  stats: () => [...DASHBOARD_QUERY_KEYS.all, "stats"] as const,
  causeList: () => [...DASHBOARD_QUERY_KEYS.all, "cause-list"] as const,
  tasks: () => [...DASHBOARD_QUERY_KEYS.all, "tasks"] as const,
  recentCases: () => [...DASHBOARD_QUERY_KEYS.all, "recent-cases"] as const,
};

export const DASHBOARD_DEFAULTS = {
  refreshInterval: 60 * 1000, // 1 minute stale time
  maxRecentCases: 5,
  maxTodayHearings: 6,
  maxChamberTasks: 5,
};
