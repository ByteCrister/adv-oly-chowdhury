"use client";

import * as React from "react";
import Link from "next/link";
import { AlertCircle, Users, FileText, Receipt, Building2 } from "lucide-react";

export function QuickActionsPanel() {
  const actions = [
    {
      title: "Add Client",
      href: "/dashboard/clients/new",
      icon: Users,
    },
    {
      title: "Upload Doc",
      href: "/dashboard/documents/upload",
      icon: FileText,
    },
    {
      title: "Fee Receipt",
      href: "/dashboard/financials/receipt",
      icon: Receipt,
    },
    {
      title: "Courts Bench",
      href: "/dashboard/courts",
      icon: Building2,
    },
  ];

  return (
    <div className="p-5 rounded-2xl bg-gradient-to-br from-card via-card to-gold-500/5 border border-border/70 dark:border-white/10 space-y-3">
      <h4 className="font-serif font-bold text-sm text-foreground flex items-center gap-2">
        <AlertCircle className="w-4 h-4 text-gold-500" />
        <span>Chamber Quick Actions</span>
      </h4>
      <div className="grid grid-cols-2 gap-2 text-xs">
        {actions.map((act) => {
          const Icon = act.icon;
          return (
            <Link
              key={act.title}
              href={act.href}
              className="p-2.5 rounded-xl bg-muted/60 hover:bg-gold-500/10 hover:text-gold-600 dark:hover:text-gold-400 border border-border/50 transition-colors flex items-center gap-2 font-medium"
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{act.title}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default QuickActionsPanel;
