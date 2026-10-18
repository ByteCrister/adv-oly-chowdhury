"use client";

import * as React from "react";
import {
  Calendar,
  Paperclip,
  Edit2,
  Trash2,
  ExternalLink,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { CaseEventItemDto } from "@/types/case-event.types";

export interface CaseEventsTimelineProps {
  events: CaseEventItemDto[];
  isLoading?: boolean;
  onEdit: (ev: CaseEventItemDto) => void;
  onDelete: (ev: CaseEventItemDto) => void;
  onAddNew: () => void;
  onResetFilters?: () => void;
  isFiltered?: boolean;
}

export function CaseEventsTimeline({
  events,
  isLoading = false,
  onEdit,
  onDelete,
  onAddNew,
  onResetFilters,
  isFiltered = false,
}: CaseEventsTimelineProps) {
  if (!isLoading && events.length === 0) {
    return (
      <div className="p-10 rounded-2xl border border-dashed border-border/80 bg-card/40 text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-sapphire-500/10 text-sapphire-600 dark:text-sapphire-400 flex items-center justify-center">
          <Calendar className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h3 className="font-serif text-lg font-bold text-foreground">
            {isFiltered ? "No Matching Events Found" : "No Milestones Recorded"}
          </h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            {isFiltered
              ? "We couldn't locate any case events matching your active search query or type filters. Try clearing your filters."
              : "Record procedural milestones, stay orders, certified copy requests, and interlocutory actions to build a chronological timeline for this case."}
          </p>
        </div>
        <div className="pt-2 flex items-center justify-center gap-3">
          {isFiltered && onResetFilters ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onResetFilters}
              className="rounded-xl text-xs"
            >
              Clear Active Filters
            </Button>
          ) : (
            <Button
              type="button"
              variant="gold"
              size="sm"
              onClick={onAddNew}
              className="rounded-xl text-xs font-semibold gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record First Event</span>
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/70 dark:border-white/10 bg-card p-5 sm:p-6 shadow-sm">
      <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-2.5 sm:before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-border/60">
        {events.map((ev) => {
          const evDate = new Date(ev.eventDate);
          const dayStr = evDate.toLocaleDateString("en-GB", { day: "2-digit" });
          const monthYearStr = evDate.toLocaleDateString("en-GB", {
            month: "short",
            year: "numeric",
          });

          return (
            <div key={ev.id} className="relative group">
              {/* Timeline Bullet Dot */}
              <div className="absolute -left-6 sm:-left-8 top-3 w-3 h-3 rounded-full bg-gold-500 border-2 border-background shadow-xs group-hover:scale-125 transition-transform" />

              {/* Event Card */}
              <div className="p-4 sm:p-5 rounded-2xl border border-border/70 dark:border-white/10 bg-background hover:border-gold-500/40 hover:bg-card/90 transition-all flex flex-col md:flex-row md:items-start justify-between gap-4 shadow-xs">
                {/* Date & Core Event Content */}
                <div className="flex items-start gap-3.5 min-w-0">
                  {/* Date Badge */}
                  <div className="w-12 h-12 rounded-xl bg-gold-500/10 border border-gold-500/25 flex flex-col items-center justify-center shrink-0 text-center shadow-2xs">
                    <span className="font-serif text-base font-bold text-gold-600 dark:text-gold-400 leading-none">
                      {dayStr}
                    </span>
                    <span className="text-[9px] font-semibold tracking-wider text-muted-foreground uppercase mt-0.5 leading-none">
                      {monthYearStr}
                    </span>
                  </div>

                  {/* Narrative & Details */}
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-serif text-sm sm:text-base font-bold text-foreground">
                        {ev.title}
                      </h3>
                      <Badge variant="secondary">{ev.eventTypeLabel}</Badge>
                    </div>

                    {ev.description && (
                      <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                        {ev.description}
                      </p>
                    )}

                    {/* Attachment Link if present */}
                    {ev.attachment && (
                      <div className="pt-1.5">
                        <a
                          href={ev.attachment.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gold-500/10 text-gold-700 dark:text-gold-300 border border-gold-500/25 text-[11px] font-medium hover:bg-gold-500/20 transition-colors"
                        >
                          <Paperclip className="w-3 h-3 text-gold-500 shrink-0" />
                          <span className="truncate max-w-[200px] sm:max-w-xs">
                            {ev.attachment.originalFileName}
                          </span>
                          <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0 self-end md:self-start">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(ev)}
                    className="rounded-xl text-xs gap-1 border-border/70 text-muted-foreground hover:text-foreground"
                    title="Edit milestone"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Edit</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onDelete(ev)}
                    className="rounded-xl text-xs gap-1 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                    title="Delete milestone"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Delete</span>
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default CaseEventsTimeline;
