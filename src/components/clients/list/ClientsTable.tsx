"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  MoreVertical,
  Eye,
  Edit2,
  Trash2,
  Phone,
  Mail,
  Briefcase,
  FileText,
  CreditCard,
  Users,
  Building2,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClientStatusBadge, ClientTypeBadge } from "@/components/clients/shared/ClientBadges";
import type { ClientListItemDto } from "@/types/client.types";

export interface ClientsTableProps {
  clients: ClientListItemDto[];
  isLoading?: boolean;
  onEditClient: (client: ClientListItemDto) => void;
  onDeleteClient: (client: ClientListItemDto) => void;
  onAddNew: () => void;
  onResetFilters: () => void;
}

export function ClientsTable({
  clients,
  isLoading,
  onEditClient,
  onDeleteClient,
  onAddNew,
  onResetFilters,
}: ClientsTableProps) {
  const router = useRouter();
  const [activeMenuId, setActiveMenuId] = React.useState<string | null>(null);

  // Close popup menu on outside click
  React.useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest(".client-action-menu-container")) {
        setActiveMenuId(null);
      }
    };
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, []);

  const handleRowClick = (client: ClientListItemDto) => {
    router.push(`/dashboard/clients/${client.id}`);
  };

  // Empty state display
  if (!isLoading && clients.length === 0) {
    return (
      <div className="p-12 text-center rounded-3xl border border-dashed border-border/70 dark:border-white/10 bg-card/40 space-y-4 my-6">
        <div className="w-14 h-14 rounded-2xl bg-gold-500/10 text-gold-600 dark:text-gold-400 flex items-center justify-center mx-auto border border-gold-500/20">
          <Users className="w-7 h-7" />
        </div>
        <div className="space-y-1.5 max-w-sm mx-auto">
          <h3 className="font-serif text-lg font-bold text-foreground">
            No Client Records Found
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            No clients match your search query or filter criteria. Try adjusting your filters or register a new client profile.
          </p>
        </div>
        <div className="flex items-center justify-center gap-2.5 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onResetFilters}
            className="rounded-xl text-xs"
          >
            Reset Filters
          </Button>
          <Button
            type="button"
            variant="gold"
            size="sm"
            onClick={onAddNew}
            className="rounded-xl text-xs font-semibold gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add New Client</span>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Desktop & Tablet Table View ────────────────────────────── */}
      <div className="hidden md:block overflow-hidden rounded-2xl border border-border/70 dark:border-white/10 bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/70 bg-muted/40 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                <th className="py-3 px-4">Client #</th>
                <th className="py-3 px-4">Client Name & Entity</th>
                <th className="py-3 px-3">Type & Status</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4 text-center">Cases</th>
                <th className="py-3 px-4 text-center">Docs</th>
                <th className="py-3 px-4 text-right">Paid (BDT)</th>
                <th className="py-3 px-4 text-right w-16">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 text-xs">
              {clients.map((client) => {
                const isMenuOpen = activeMenuId === client.id;

                return (
                  <tr
                    key={client.id}
                    onClick={() => handleRowClick(client)}
                    className="group hover:bg-muted/30 dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
                  >
                    {/* Client # */}
                    <td className="py-3.5 px-4 font-mono font-bold text-foreground text-xs whitespace-nowrap">
                      <span className="group-hover:text-gold-500 transition-colors">
                        {client.clientNumber}
                      </span>
                    </td>

                    {/* Name & Org */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5 min-w-[180px]">
                        <div className="w-8 h-8 rounded-full bg-gold-500/10 text-gold-600 dark:text-gold-400 font-serif font-bold text-xs flex items-center justify-center shrink-0 border border-gold-500/20">
                          {client.organizationName ? (
                            <Building2 className="w-4 h-4" />
                          ) : (
                            client.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="truncate">
                          <p className="font-semibold text-foreground group-hover:text-gold-600 dark:group-hover:text-gold-400 transition-colors truncate">
                            {client.name}
                          </p>
                          {client.organizationName && (
                            <p className="text-[11px] text-muted-foreground truncate">
                              {client.organizationName}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Type & Status */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <div className="flex flex-col gap-1 items-start">
                        <ClientTypeBadge type={client.clientType} />
                        <ClientStatusBadge status={client.status} />
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-muted-foreground text-[11px]">
                      {client.phone ? (
                        <div className="flex items-center gap-1.5 text-foreground">
                          <Phone className="w-3 h-3 text-gold-500 shrink-0" />
                          <span>{client.phone}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground/60 italic">No phone</span>
                      )}
                      {client.email && (
                        <div className="flex items-center gap-1.5 text-muted-foreground/80 mt-0.5">
                          <Mail className="w-3 h-3 shrink-0" />
                          <span className="truncate max-w-[140px]">{client.email}</span>
                        </div>
                      )}
                    </td>

                    {/* Cases Count */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/60 text-foreground font-semibold">
                        <Briefcase className="w-3 h-3 text-gold-500" />
                        <span>{client.totalCases}</span>
                      </div>
                    </td>

                    {/* Docs Count */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/60 text-foreground font-semibold">
                        <FileText className="w-3 h-3 text-sapphire-500" />
                        <span>{client.totalDocuments}</span>
                      </div>
                    </td>

                    {/* Paid (BDT) */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                      {client.totalPaidAmount > 0
                        ? `৳ ${client.totalPaidAmount.toLocaleString("en-BD")}`
                        : "৳ 0"}
                    </td>

                    {/* Actions Menu */}
                    <td
                      className="py-3.5 px-4 text-right relative client-action-menu-container"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => setActiveMenuId(isMenuOpen ? null : client.id)}
                        className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                        aria-label={`Actions for ${client.name}`}
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {isMenuOpen && (
                        <div className="absolute right-4 top-10 w-44 rounded-xl border border-border/80 dark:border-white/10 bg-card/95 backdrop-blur-xl shadow-lg py-1 z-30 animate-in fade-in zoom-in-95 text-xs text-left">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuId(null);
                              router.push(`/dashboard/clients/${client.id}`);
                            }}
                            className="w-full px-3 py-2 flex items-center gap-2 text-foreground hover:bg-muted/70 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5 text-gold-500" />
                            <span>View Profile</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuId(null);
                              router.push(`/dashboard/clients/${client.id}/documents`);
                            }}
                            className="w-full px-3 py-2 flex items-center gap-2 text-foreground hover:bg-muted/70 transition-colors"
                          >
                            <FileText className="w-3.5 h-3.5 text-sapphire-500" />
                            <span>Documents ({client.totalDocuments})</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuId(null);
                              router.push(`/dashboard/clients/${client.id}/payments`);
                            }}
                            className="w-full px-3 py-2 flex items-center gap-2 text-foreground hover:bg-muted/70 transition-colors"
                          >
                            <CreditCard className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Payments ({client.totalPayments})</span>
                          </button>
                          <div className="my-1 border-t border-border/50" />
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuId(null);
                              onEditClient(client);
                            }}
                            className="w-full px-3 py-2 flex items-center gap-2 text-foreground hover:bg-muted/70 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-amber-500" />
                            <span>Edit Client</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuId(null);
                              onDeleteClient(client);
                            }}
                            className="w-full px-3 py-2 flex items-center gap-2 text-destructive hover:bg-destructive/10 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete Client</span>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Mobile Compact Cards View ──────────────────────────────── */}
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {clients.map((client) => (
          <div
            key={client.id}
            onClick={() => handleRowClick(client)}
            className="p-4 rounded-2xl border border-border/70 dark:border-white/10 bg-card shadow-sm space-y-3 cursor-pointer hover:border-gold-500/40 transition-all"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-0.5">
                <span className="font-mono text-xs font-bold text-gold-600 dark:text-gold-400">
                  {client.clientNumber}
                </span>
                <h4 className="font-semibold text-sm text-foreground">
                  {client.name}
                </h4>
                {client.organizationName && (
                  <p className="text-xs text-muted-foreground">
                    {client.organizationName}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1">
                <ClientStatusBadge status={client.status} />
                <ClientTypeBadge type={client.clientType} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/40 text-center text-[11px]">
              <div className="bg-muted/40 p-1.5 rounded-lg">
                <span className="text-muted-foreground block text-[10px]">Cases</span>
                <span className="font-bold text-foreground">{client.totalCases}</span>
              </div>
              <div className="bg-muted/40 p-1.5 rounded-lg">
                <span className="text-muted-foreground block text-[10px]">Docs</span>
                <span className="font-bold text-foreground">{client.totalDocuments}</span>
              </div>
              <div className="bg-muted/40 p-1.5 rounded-lg">
                <span className="text-muted-foreground block text-[10px]">Paid</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                  ৳{client.totalPaidAmount.toLocaleString("en-BD")}
                </span>
              </div>
            </div>

            {/* Row actions */}
            <div
              className="flex items-center justify-between pt-1 text-xs"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="text-muted-foreground text-[11px]">
                {client.phone || "No phone"}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onEditClient(client)}
                  className="h-7 px-2 text-xs rounded-lg"
                >
                  <Edit2 className="w-3 h-3 mr-1 text-amber-500" />
                  <span>Edit</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onDeleteClient(client)}
                  className="h-7 px-2 text-xs rounded-lg text-destructive border-destructive/20 hover:bg-destructive/10"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ClientsTable;
