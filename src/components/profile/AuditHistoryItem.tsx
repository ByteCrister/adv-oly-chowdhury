"use client";

import * as React from "react";
import {
  PlusCircle,
  Edit3,
  Trash2,
  Archive,
  RotateCcw,
  LogIn,
  LogOut,
  Eye,
  Download,
  Activity,
  Globe,
  Laptop,
  ChevronDown,
  ChevronUp,
  Hash,
  Clock,
  Layers,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AUDIT_ACTIONS, AuditAction } from "@/const/audit-log.const";
import type { AuditLogItemDto } from "@/types/audit-history.types";
import { cn } from "@/lib/utils";

export interface AuditHistoryItemProps {
  item: AuditLogItemDto;
  className?: string;
}

const ACTION_CONFIG: Record<
  AuditAction,
  {
    variant: "emerald" | "sapphire" | "destructive" | "gold" | "amber" | "outline";
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  [AUDIT_ACTIONS.CREATE]: { variant: "emerald", icon: PlusCircle },
  [AUDIT_ACTIONS.UPDATE]: { variant: "sapphire", icon: Edit3 },
  [AUDIT_ACTIONS.DELETE]: { variant: "destructive", icon: Trash2 },
  [AUDIT_ACTIONS.SOFT_DELETE]: { variant: "destructive", icon: Archive },
  [AUDIT_ACTIONS.RESTORE]: { variant: "emerald", icon: RotateCcw },
  [AUDIT_ACTIONS.LOGIN]: { variant: "gold", icon: LogIn },
  [AUDIT_ACTIONS.LOGOUT]: { variant: "gold", icon: LogOut },
  [AUDIT_ACTIONS.VIEW_CONFIDENTIAL]: { variant: "amber", icon: Eye },
  [AUDIT_ACTIONS.DOWNLOAD_DOCUMENT]: { variant: "amber", icon: Download },
  [AUDIT_ACTIONS.STATUS_CHANGE]: { variant: "sapphire", icon: Activity },
};

function formatTimestamp(isoString: string): { formattedDate: string; formattedTime: string; relative: string } {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  let relative = "just now";
  if (diffSec >= 60 && diffMin < 60) {
    relative = `${diffMin}m ago`;
  } else if (diffHours >= 1 && diffHours < 24) {
    relative = `${diffHours}h ago`;
  } else if (diffDays >= 1 && diffDays < 7) {
    relative = `${diffDays}d ago`;
  } else if (diffDays >= 7) {
    relative = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  const formattedDate = date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const formattedTime = date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  return { formattedDate, formattedTime, relative };
}

/**
 * Simplifies complex user agents for clean, human-readable display.
 */
function parseUserAgent(ua?: string | null): string | null {
  if (!ua) return null;
  if (ua.includes("Chrome") && !ua.includes("Edg")) return "Google Chrome";
  if (ua.includes("Edg")) return "Microsoft Edge";
  if (ua.includes("Firefox")) return "Mozilla Firefox";
  if (ua.includes("Safari") && !ua.includes("Chrome")) return "Apple Safari";
  if (ua.includes("Postman")) return "Postman Runtime";
  if (ua.includes("curl")) return "cURL Client";
  return ua.length > 30 ? `${ua.slice(0, 27)}...` : ua;
}

export function AuditHistoryItem({ item, className }: AuditHistoryItemProps) {
  const [expanded, setExpanded] = React.useState(false);

  const actionCfg = ACTION_CONFIG[item.action] || {
    variant: "outline",
    icon: Activity,
  };
  const ActionIcon = actionCfg.icon;

  const { formattedDate, formattedTime, relative } = formatTimestamp(item.createdAt);
  const friendlyBrowser = parseUserAgent(item.userAgent);

  const hasDiff = Boolean(
    (item.oldValues && Object.keys(item.oldValues).length > 0) ||
      (item.newValues && Object.keys(item.newValues).length > 0)
  );

  return (
    <div
      className={cn(
        "p-4 rounded-2xl bg-card/70 dark:bg-card/40 backdrop-blur-md border border-border/70 dark:border-white/10 hover:border-gold-500/30 transition-all duration-200 space-y-3 shadow-xs",
        className
      )}
    >
      {/* Top row: Badges & Timestamp */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* Action Badge */}
          <Badge variant={actionCfg.variant} className="gap-1.5 py-1 px-2.5">
            <ActionIcon className="w-3.5 h-3.5" />
            <span>{item.actionLabel || item.action}</span>
          </Badge>

          {/* Entity Type Badge */}
          <Badge variant="outline" className="gap-1.5 py-1 px-2.5 bg-muted/20">
            <Layers className="w-3 h-3 text-muted-foreground" />
            <span>{item.entityTypeLabel || item.entityType}</span>
          </Badge>
        </div>

        {/* Timestamp */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="w-3.5 h-3.5 text-muted-foreground/70" />
          <span className="font-medium text-foreground">{formattedDate}</span>
          <span className="text-muted-foreground/70">• {formattedTime}</span>
          <span className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-muted/40 text-[10px] font-mono">
            {relative}
          </span>
        </div>
      </div>

      {/* Description */}
      <div className="text-xs sm:text-sm font-medium text-foreground leading-relaxed">
        {item.description || `Executed ${item.action.toLowerCase()} on ${item.entityType.toLowerCase()}`}
      </div>

      {/* Metadata Pills: IP, Device, Entity ID, and Diff toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/40 text-[11px] text-muted-foreground">
        <div className="flex flex-wrap items-center gap-3">
          {/* Entity ID */}
          <span
            className="inline-flex items-center gap-1 font-mono hover:text-foreground transition-colors"
            title={`Target ID: ${item.entityId}`}
          >
            <Hash className="w-3 h-3 text-muted-foreground/60" />
            <span>{item.entityId.slice(0, 8)}...</span>
          </span>

          {/* IP Address */}
          {item.ipAddress && (
            <span
              className="inline-flex items-center gap-1 font-mono hover:text-foreground transition-colors"
              title={`Source IP: ${item.ipAddress}`}
            >
              <Globe className="w-3 h-3 text-muted-foreground/60" />
              <span>{item.ipAddress}</span>
            </span>
          )}

          {/* User Agent / Client */}
          {friendlyBrowser && (
            <span
              className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
              title={item.userAgent || undefined}
            >
              <Laptop className="w-3 h-3 text-muted-foreground/60" />
              <span>{friendlyBrowser}</span>
            </span>
          )}
        </div>

        {/* Diff Expansion Toggle (if changes recorded) */}
        {hasDiff && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="h-7 px-2 text-[11px] text-gold-600 dark:text-gold-400 hover:text-gold-500 hover:bg-gold-500/10 gap-1 rounded-lg"
          >
            <span>{expanded ? "Hide Details" : "View Changes"}</span>
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </Button>
        )}
      </div>

      {/* Expanded Diff Viewer */}
      {expanded && hasDiff && (
        <div className="pt-2 border-t border-border/60 space-y-2 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Old Values */}
            {item.oldValues && Object.keys(item.oldValues).length > 0 && (
              <div className="p-3 rounded-xl bg-destructive/5 border border-destructive/20 space-y-1.5">
                <div className="text-[11px] font-semibold text-destructive uppercase tracking-wider flex items-center gap-1">
                  <span>Previous State</span>
                </div>
                <pre className="text-[11px] font-mono text-muted-foreground overflow-x-auto p-2 rounded-lg bg-background/60 dark:bg-card/80 border border-border/40 whitespace-pre-wrap break-all max-h-48 overflow-y-auto">
                  {JSON.stringify(item.oldValues, null, 2)}
                </pre>
              </div>
            )}

            {/* New Values */}
            {item.newValues && Object.keys(item.newValues).length > 0 && (
              <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-1.5">
                <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                  <span>Modified / New State</span>
                </div>
                <pre className="text-[11px] font-mono text-muted-foreground overflow-x-auto p-2 rounded-lg bg-background/60 dark:bg-card/80 border border-border/40 whitespace-pre-wrap break-all max-h-48 overflow-y-auto">
                  {JSON.stringify(item.newValues, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AuditHistoryItem;
