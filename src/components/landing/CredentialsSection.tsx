import {
  GraduationCap,
  Award,
  Landmark,
  Scale,
  ShieldCheck,
  Globe2,
  FileBadge2,
} from "lucide-react";
import { FadeIn, FadeInUp } from "@/components/wrappers/Motion";
import { cn } from "@/lib/utils";
import type { LandingBarRegistrations, LandingProfile } from "@/lib/landing/landing.types";

export interface CredentialsSectionProps {
  barRegistrations?: LandingBarRegistrations;
  profile?: LandingProfile;
}

export default function CredentialsSection({
  barRegistrations,
  profile,
}: CredentialsSectionProps = {}) {
  const fullName = profile?.fullName || "Advocate Aminul Islam Chowdhury Oly";

  const credentials = [
    {
      degree: "LL.M",
      full: "Master of Laws",
      type: "Postgraduate Law Degree",
      description:
        "Advanced specialization in legal jurisprudence, statutory interpretation, appellate advocacy, and constitutional doctrines.",
      icon: GraduationCap,
      badge: "Master's in Law",
    },
    {
      degree: "LL.B",
      full: "Bachelor of Laws",
      type: "Professional Legal Degree",
      description:
        "Comprehensive statutory training across civil procedure, penal code, criminal procedure, contract law, and law of evidence.",
      icon: Scale,
      badge: "Professional Law",
    },
    {
      degree: "M.S.S",
      full: "Master of Social Science",
      type: "Postgraduate Social Science",
      description:
        "Advanced analytical studies in public administration, societal governance, public policy frameworks, and socio-economic dynamics.",
      icon: GraduationCap,
      badge: "Master's Degree",
    },
    {
      degree: "B.S.S (Hon's)",
      full: "Bachelor of Social Science (Honours)",
      type: "Undergraduate Honours Degree",
      description:
        "Rigorous 4-year multidisciplinary training building analytical reasoning, research methodology, and community impact analysis.",
      icon: FileBadge2,
      badge: "Honours Degree",
    },
  ];

  const barMemberships = [
    {
      title: "Sylhet District Bar Association",
      role: barRegistrations?.barAssociationMemberNo
        ? `Member No: ${barRegistrations.barAssociationMemberNo} · Regular Practitioner`
        : "Member Advocate · Regular Practitioner",
      region: "Sylhet, Bangladesh",
      detail:
        "Active enrollment and regular appearances representing litigants before the District and Sessions Judge Court, Sylhet.",
      icon: Landmark,
      membershipNo: barRegistrations?.barAssociationMemberNo || null,
    },
    {
      title: "Sylhet District Taxes Bar Association",
      role: barRegistrations?.taxesBarMemberNo
        ? `Member No: ${barRegistrations.taxesBarMemberNo} · Revenue Practitioner`
        : "Member Advocate · Revenue Practitioner",
      region: "ESTD. 1974",
      detail:
        "Dedicated taxation bar membership covering tax assessment hearings, corporate return scrutiny, and appellate tribunals.",
      icon: Award,
      membershipNo: barRegistrations?.taxesBarMemberNo || null,
    },
    {
      title: "International Bar Association (IBA)",
      role: "Member · Global Legal Standing",
      region: "Global Network",
      detail:
        "Connection to international legal practitioners and adherence to internationally recognized benchmarks of ethical practice and advocacy.",
      icon: Globe2,
      membershipNo: null,
    },
  ];

  return (
    <section
      id="credentials"
      className={cn(
        "py-20 lg:py-28 relative overflow-hidden transition-colors duration-300",
        "bg-gradient-to-b from-[#F8F6F1] via-[#F4F0E8] to-[#EDE8DC] text-slate-900 border-b border-slate-200",
        "dark:bg-gradient-to-b dark:from-[#060C18] dark:via-[#0A1424] dark:to-[#060C18] dark:text-white dark:border-b dark:border-white/10"
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <FadeIn>
            <div
              className={cn(
                "inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm",
                "bg-gold-100 text-gold-900 border border-gold-500/50",
                "dark:bg-gold-400/10 dark:text-gold-200 dark:border-gold-400/35"
              )}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-gold-700 dark:text-gold-400" />
              <span>Verified Qualifications &amp; Enrollments</span>
            </div>
          </FadeIn>

          <FadeInUp delay={0.1}>
            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 dark:text-white leading-[1.15]">
              Academic Pedigree &amp; Bar Memberships
            </h2>
          </FadeInUp>

          <FadeInUp delay={0.2}>
            <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
              Every credential and enrollment presented here is authentic and verified from{" "}
              {fullName}&apos;s official professional records and bar registers
              {barRegistrations?.barCouncilId ? ` (Bar Council Sanad No: ${barRegistrations.barCouncilId})` : ""}.
            </p>
          </FadeInUp>
        </div>

        {/* ──────────── Academic Qualifications ──────────── */}
        <div className="space-y-6 mb-20">
          <div
            className="flex items-center justify-between pb-3 border-b border-slate-300/80 dark:border-white/10"
          >
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
              <GraduationCap className="w-6 h-6 text-gold-700 dark:text-gold-400" />
              <span>Academic Degrees</span>
            </h3>
            <span
              className={cn(
                "text-xs font-mono font-bold uppercase tracking-wider px-3 py-1 rounded-full",
                "bg-gold-100 text-gold-900 border border-gold-500/50",
                "dark:bg-gold-400/10 dark:text-gold-200 dark:border-gold-400/35"
              )}
            >
              Dual Master&apos;s &amp; Honours
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {credentials.map((item, idx) => {
              const Icon = item.icon;
              return (
                <FadeInUp
                  key={item.degree}
                  delay={0.08 * (idx + 1)}
                  className="h-full"
                >
                  <div
                    className={cn(
                      "group relative h-full flex flex-col justify-between p-6 rounded-3xl transition-all duration-300 hover:-translate-y-1.5 overflow-hidden shadow-sm",
                      "bg-white border border-slate-200 text-slate-900 hover:border-gold-400/50 hover:shadow-xl",
                      "dark:bg-[#0E1829]/90 dark:border-white/10 dark:text-white hover:dark:border-gold-500/50 hover:dark:shadow-2xl"
                    )}
                  >
                    {/* Top hover hairline */}
                    <div
                      className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-gold-400 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      aria-hidden="true"
                    />

                    <div>
                      {/* Degree Monogram & Icon Header */}
                      <div className="flex items-center justify-between mb-4">
                        <span className="font-serif text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                          {item.degree}
                        </span>
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-gold-400 transition-transform duration-300 group-hover:scale-105"
                          style={{
                            background: "linear-gradient(135deg, #16294A 0%, #0A1324 100%)",
                            border: "1px solid rgba(216, 184, 112, 0.35)",
                          }}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                      </div>

                      <div className="text-sm font-bold text-slate-900 dark:text-white mb-0.5">
                        {item.full}
                      </div>
                      <div className="text-xs font-semibold text-gold-800 dark:text-gold-400 mb-3">
                        {item.type}
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                        {item.description}
                      </p>
                    </div>

                    <div
                      className="pt-4 mt-5 flex items-center justify-between border-t border-slate-200/80 dark:border-white/10"
                    >
                      <span
                        className={cn(
                          "text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full",
                          "bg-gold-100 text-gold-900 border border-gold-500/50",
                          "dark:bg-gold-400/10 dark:text-gold-200 dark:border-gold-400/35"
                        )}
                      >
                        {item.badge}
                      </span>
                      <ShieldCheck className="w-4 h-4 text-gold-700 dark:text-gold-400" />
                    </div>
                  </div>
                </FadeInUp>
              );
            })}
          </div>
        </div>

        {/* ──────────── Professional Bar Memberships ──────────── */}
        <div className="space-y-6">
          <div
            className="flex items-center justify-between pb-3 border-b border-slate-300/80 dark:border-white/10"
          >
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
              <Landmark className="w-6 h-6 text-gold-700 dark:text-gold-400" />
              <span>Professional Bar Associations</span>
            </h3>
            <span
              className={cn(
                "text-xs font-mono font-bold uppercase tracking-wider px-3 py-1 rounded-full",
                "bg-gold-100 text-gold-900 border border-gold-500/50",
                "dark:bg-gold-400/10 dark:text-gold-200 dark:border-gold-400/35"
              )}
            >
              Official Enrollments
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {barMemberships.map((bar, idx) => {
              const Icon = bar.icon;
              return (
                <FadeInUp
                  key={bar.title}
                  delay={0.12 * (idx + 1)}
                  className="h-full"
                >
                  <div
                    className={cn(
                      "group relative h-full flex flex-col justify-between p-7 rounded-3xl transition-all duration-300 hover:-translate-y-1.5 overflow-hidden shadow-sm",
                      "bg-white border border-slate-200 text-slate-900 hover:border-gold-400/50 hover:shadow-xl",
                      "dark:bg-[#0E1829]/90 dark:border-white/10 dark:text-white hover:dark:border-gold-500/50 hover:dark:shadow-2xl"
                    )}
                  >
                    {/* Top gold hairline on hover */}
                    <div
                      className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-gold-400 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      aria-hidden="true"
                    />

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center text-gold-400 group-hover:scale-105 transition-transform duration-300"
                          style={{
                            background: "linear-gradient(135deg, #16294A 0%, #0A1324 100%)",
                            border: "1px solid rgba(216, 184, 112, 0.4)",
                            boxShadow: "0 4px 12px rgba(16, 28, 51, 0.2)",
                          }}
                        >
                          <Icon className="w-6 h-6" />
                        </div>
                        <span
                          className={cn(
                            "text-xs font-mono font-bold px-3 py-1 rounded-full",
                            "bg-gold-100 text-gold-900 border border-gold-500/50",
                            "dark:bg-gold-400/10 dark:text-gold-200 dark:border-gold-400/35"
                          )}
                        >
                          {bar.region}
                        </span>
                      </div>

                      <div>
                        <h4 className="font-serif text-lg font-bold text-slate-900 dark:text-white group-hover:text-gold-800 dark:group-hover:text-gold-300 transition-colors">
                          {bar.title}
                        </h4>
                        <div className="text-xs text-gold-800 dark:text-gold-400 font-bold mt-1">
                          {bar.role}
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                        {bar.detail}
                      </p>
                    </div>

                    <div
                      className="pt-5 mt-5 flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-200 border-t border-slate-200/80 dark:border-white/10"
                    >
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-gold-700 dark:text-gold-400" />
                        <span>Enrolled &amp; Certified Standing</span>
                      </div>
                      <span className="text-[10px] font-mono text-gold-800 dark:text-gold-400 font-bold uppercase">
                        Active
                      </span>
                    </div>
                  </div>
                </FadeInUp>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
