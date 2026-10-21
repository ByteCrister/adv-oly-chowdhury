"use client";

import * as React from "react";
import { FadeInUp } from "@/components/wrappers/Motion";
import { ClientBreadcrumbHeader } from "@/components/clients/shared/ClientBreadcrumbHeader";
import { ClientForm } from "@/components/clients/shared/ClientForm";
import {
  Sparkles,
  ShieldCheck,
  FileCheck2,
  Building2,
  UserCheck,
  Briefcase,
  Lock,
} from "lucide-react";

export function CreateClientPage() {
  return (
    <div className="space-y-6 pb-12">
      {/* ── Breadcrumb & Top Header ─────────────────────────────────── */}
      <FadeInUp delay={0.05}>
        <ClientBreadcrumbHeader
          title="Create New Client"
          subtitle="Enroll a new individual citizen or corporate entity into Advocate Oly Chowdhury's chamber management system."
          backHref="/dashboard/clients"
          backLabel="Return to Clients Directory"
          crumbs={[{ label: "New Client" }]}
          badge={
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gold-500/10 text-gold-600 dark:text-gold-400 border border-gold-500/25 shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-gold-500" />
              <span>Chamber Dossier</span>
            </span>
          }
        />
      </FadeInUp>

      {/* ── Main Layout: Form (2 cols) + Chamber Guide (1 col) ─────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Client Creation Form */}
        <div className="lg:col-span-2">
          <FadeInUp delay={0.1}>
            <ClientForm isDialog={false} />
          </FadeInUp>
        </div>

        {/* Right Column: Registry Assistance & Chamber Policies */}
        <div className="space-y-6">
          {/* Card 1: Registration Standards */}
          <FadeInUp delay={0.15}>
            <div className="relative overflow-hidden rounded-2xl border border-border/80 dark:border-white/10 bg-card/90 p-5 shadow-sm space-y-4">
              <div
                className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-gold-400/40 to-transparent pointer-events-none"
                aria-hidden="true"
              />

              <div className="flex items-center gap-2.5 pb-3 border-b border-border/40">
                <div className="w-8 h-8 rounded-xl bg-gold-500/10 text-gold-600 dark:text-gold-400 flex items-center justify-center border border-gold-500/20">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-serif text-sm font-bold text-foreground">
                    Chamber Registry Standards
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    Advocate-Client Privilege & Due Diligence
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-xs text-muted-foreground leading-relaxed">
                <div className="flex items-start gap-2.5">
                  <FileCheck2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <p>
                    <strong className="text-foreground font-semibold">Unique Client Number:</strong> A unique chamber reference (e.g. <span className="font-mono text-gold-600 dark:text-gold-400">CL-2026-XXXX</span>) is automatically generated upon submission.
                  </p>
                </div>

                <div className="flex items-start gap-2.5">
                  <Building2 className="w-4 h-4 text-gold-500 shrink-0 mt-0.5" />
                  <p>
                    <strong className="text-foreground font-semibold">Corporate Registrations:</strong> For corporate clientele, provide the company name along with the authorized director or legal officer.
                  </p>
                </div>

                <div className="flex items-start gap-2.5">
                  <Lock className="w-4 h-4 text-sapphire-500 shrink-0 mt-0.5" />
                  <p>
                    <strong className="text-foreground font-semibold">Privileged Legal Notes:</strong> Any fee structures, background notes, and case memos are encrypted and restricted to authorized chamber counsel.
                  </p>
                </div>
              </div>
            </div>
          </FadeInUp>

          {/* Card 2: Chamber Practice Information */}
          <FadeInUp delay={0.2}>
            <div className="relative overflow-hidden rounded-2xl border border-border/80 dark:border-white/10 bg-card/60 p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Briefcase className="w-4 h-4 text-gold-500" />
                <span className="text-xs font-semibold text-foreground">
                  Chamber Practice & Jurisdiction
                </span>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                Advocate Aminul Islam Chowdhury Oly
                <br />
                Judge&apos;s Court, Sylhet District Judiciary
                <br />
                Civil &amp; Criminal Litigation Specialization
              </p>

              <div className="pt-2 border-t border-border/40 flex items-center gap-2 text-[11px] text-muted-foreground">
                <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Immediate case association enabled after enrollment</span>
              </div>
            </div>
          </FadeInUp>
        </div>
      </div>
    </div>
  );
}

export default CreateClientPage;
