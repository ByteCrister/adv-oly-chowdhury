"use client";

import * as React from "react";
import Link from "next/link";
import { AlertCircle, ArrowLeft, RefreshCw, Search, X, ChevronLeft, ChevronRight } from "lucide-react";
import { FadeInUp } from "@/components/wrappers/Motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCaseDetail, useCaseParties } from "@/hooks/cases";
import { useDebounce } from "@/hooks/ui";
import { CasePartiesHeader } from "./CasePartiesHeader";
import { CasePartiesGrid } from "./CasePartiesGrid";
import { CasePartyFormDialog } from "./CasePartyFormDialog";
import { CasePartyDeleteDialog } from "./CasePartyDeleteDialog";
import { CasePartiesSkeleton } from "./CasePartiesSkeleton";
import type { CasePartyItemDto } from "@/types/case-party.types";
import {
  PARTY_ROLE_LIST,
  PARTY_ROLE_LABELS,
  PARTY_TYPE_LIST,
  PARTY_TYPE_LABELS,
  CASE_PARTY_PAGE_LIMITS,
  PartyRole,
  PartyType,
  CasePartySortOption,
  CasePartyPageLimit,
} from "@/const/case-party.const";

export interface CasePartiesPageProps {
  caseId: string;
}

export function CasePartiesPage({ caseId }: CasePartiesPageProps) {
  // Filter & Pagination State
  const [search, setSearch] = React.useState("");
  const debouncedSearch = useDebounce(search, 350);
  const [role, setRole] = React.useState<PartyRole | "ALL">("ALL");
  const [partyType, setPartyType] = React.useState<PartyType | "ALL">("ALL");
  const [sort, setSort] = React.useState<CasePartySortOption>("name_asc");
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState<CasePartyPageLimit>(20);

  // Reset page when filters change
  const filterKey = `${debouncedSearch}-${role}-${partyType}-${sort}`;
  const [prevFilterKey, setPrevFilterKey] = React.useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setPage(1);
  }

  const filterParams = React.useMemo(
    () => ({
      page,
      limit,
      sort,
      search: debouncedSearch.trim() || undefined,
      role: role !== "ALL" ? role : undefined,
      partyType: partyType !== "ALL" ? partyType : undefined,
    }),
    [page, limit, sort, debouncedSearch, role, partyType]
  );

  // Queries
  const {
    data: caseData,
    isLoading: isCaseLoading,
    isError: isCaseError,
    error: caseError,
  } = useCaseDetail(caseId);

  const {
    data: partiesData,
    isLoading: isPartiesLoading,
    isError: isPartiesError,
    error: partiesError,
    refetch,
    isFetching,
  } = useCaseParties(caseId, filterParams);

  // Dialog State
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingParty, setEditingParty] = React.useState<CasePartyItemDto | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [deletingParty, setDeletingParty] = React.useState<CasePartyItemDto | null>(null);

  const isFiltered = Boolean(search.trim() || role !== "ALL" || partyType !== "ALL");

  const handleResetFilters = () => {
    setSearch("");
    setRole("ALL");
    setPartyType("ALL");
    setSort("name_asc");
    setPage(1);
  };

  if (isCaseLoading) {
    return <CasePartiesSkeleton />;
  }

  if (isCaseError || !caseData) {
    return (
      <div className="py-12 px-4 max-w-lg mx-auto text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h2 className="font-serif text-2xl font-bold text-foreground">
          Case Dossier Not Found
        </h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {(caseError as Error)?.message ||
            `The requested legal case (${caseId}) could not be located in the repository.`}
        </p>
        <Link href="/dashboard/cases">
          <Button type="button" variant="gold" size="sm" className="rounded-xl text-xs gap-1.5 font-semibold">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Cases</span>
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* 1. Header with Stats & Actions */}
      <FadeInUp delay={0.05}>
        <CasePartiesHeader
          caseData={caseData}
          stats={partiesData?.stats}
          isLoadingStats={isPartiesLoading}
          onAddPartyClick={() => {
            setEditingParty(null);
            setIsFormOpen(true);
          }}
          onRefresh={() => refetch()}
          isFetching={isFetching}
        />
      </FadeInUp>

      {/* 2. Filter Bar */}
      <FadeInUp delay={0.1}>
        <div className="rounded-2xl border border-border/70 dark:border-white/10 bg-card p-3 sm:p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center gap-2.5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search litigants by name, phone, or address..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-8 h-9 rounded-xl text-xs bg-background/50 border-border/70"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="w-full md:w-52">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as PartyRole | "ALL")}
              className="w-full h-9 rounded-xl text-xs bg-background/50 border border-border/70 px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            >
              <option value="ALL">All Litigant Roles</option>
              {PARTY_ROLE_LIST.map((r) => (
                <option key={r} value={r}>
                  {PARTY_ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </div>

          <div className="w-full md:w-44">
            <select
              value={partyType}
              onChange={(e) => setPartyType(e.target.value as PartyType | "ALL")}
              className="w-full h-9 rounded-xl text-xs bg-background/50 border border-border/70 px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            >
              <option value="ALL">All Entity Types</option>
              {PARTY_TYPE_LIST.map((t) => (
                <option key={t} value={t}>
                  {PARTY_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>

          <div className="w-full md:w-40">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as CasePartySortOption)}
              className="w-full h-9 rounded-xl text-xs bg-background/50 border border-border/70 px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            >
              <option value="name_asc">Name (A-Z)</option>
              <option value="name_desc">Name (Z-A)</option>
              <option value="role_asc">Role (A-Z)</option>
              <option value="newest">Recently Added</option>
            </select>
          </div>

          <div className="w-full md:w-28">
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value) as CasePartyPageLimit)}
              className="w-full h-9 rounded-xl text-xs bg-background/50 border border-border/70 px-2 text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            >
              {CASE_PARTY_PAGE_LIMITS.map((size) => (
                <option key={size} value={size}>
                  {size} / page
                </option>
              ))}
            </select>
          </div>
        </div>
      </FadeInUp>

      {/* 3. Main Litigants Grid */}
      {isPartiesLoading ? (
        <CasePartiesSkeleton />
      ) : isPartiesError ? (
        <FadeInUp delay={0.15}>
          <div className="p-8 rounded-2xl border border-destructive/30 bg-destructive/5 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-lg font-bold text-foreground">
              Unable to Load Case Litigants
            </h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              {(partiesError as Error)?.message || "Failed to retrieve litigants for this case."}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="rounded-xl text-xs gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Query</span>
            </Button>
          </div>
        </FadeInUp>
      ) : (
        <FadeInUp delay={0.15} className="space-y-4">
          <CasePartiesGrid
            parties={partiesData?.items || []}
            isLoading={isFetching}
            onEdit={(p) => {
              setEditingParty(p);
              setIsFormOpen(true);
            }}
            onDelete={(p) => {
              setDeletingParty(p);
              setIsDeleteOpen(true);
            }}
            onAddNew={() => {
              setEditingParty(null);
              setIsFormOpen(true);
            }}
            onResetFilters={handleResetFilters}
            isFiltered={isFiltered}
          />

          {/* Pagination */}
          {partiesData && partiesData.total > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border/40 text-xs text-muted-foreground">
              <span>
                Showing {(page - 1) * limit + 1} to{" "}
                {Math.min(page * limit, partiesData.total)} of{" "}
                <span className="font-semibold text-foreground">{partiesData.total}</span> litigants
              </span>

              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || isFetching}
                  className="h-8 w-8 rounded-lg"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </Button>
                <span className="px-2 font-medium text-foreground">
                  {page} / {partiesData.totalPages}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setPage((p) => Math.min(partiesData.totalPages, p + 1))}
                  disabled={page >= partiesData.totalPages || isFetching}
                  className="h-8 w-8 rounded-lg"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </FadeInUp>
      )}

      {/* Record / Edit Dialog */}
      <CasePartyFormDialog
        caseId={caseId}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingParty(null);
        }}
        partyItem={editingParty}
        onSuccess={() => refetch()}
      />

      {/* Delete Dialog */}
      <CasePartyDeleteDialog
        caseId={caseId}
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false);
          setDeletingParty(null);
        }}
        partyItem={deletingParty}
        onSuccess={() => refetch()}
      />
    </div>
  );
}

export default CasePartiesPage;
