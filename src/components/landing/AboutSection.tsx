import Image from "next/image";
import {
  GraduationCap,
  Scale,
  ShieldCheck,
  FileSpreadsheet,
  Award,
} from "lucide-react";
import { ADVOCATE_INFO } from "@/const/advocate";
import { FadeIn, FadeInLeft } from "@/components/wrappers/Motion";
import { cn } from "@/lib/utils";
import type { LandingProfile } from "@/lib/landing/landing.types";

export interface AboutSectionProps {
  profile?: LandingProfile;
}

export default function AboutSection({ profile }: AboutSectionProps = {}) {
  const fullName = profile?.fullName || ADVOCATE_INFO.fullName;
  const preferredName = profile?.preferredName || ADVOCATE_INFO.preferredName;
  const courtroomImage = ADVOCATE_INFO.images.courtroom;
  const chamber = profile?.chamber || ADVOCATE_INFO.chamber;

  const pillars = [
    {
      title: "Dual Master's Academic Pedigree",
      description:
        "Equipped with both LL.M (Master of Laws) and M.S.S (Master of Social Science), bringing advanced jurisprudence and deep socio-legal perspective to every brief.",
      icon: GraduationCap,
    },
    {
      title: "Specialist Taxation Acumen",
      description:
        "Active member of the Sylhet District Taxes Bar Association (ESTD. 1974), counseling corporate and individual clients on income tax assessments, returns, and tribunal appeals.",
      icon: FileSpreadsheet,
    },
    {
      title: "Ethical Courtroom Advocacy",
      description:
        "Vigorous representation before the Judge's Court, Sylhet, with unyielding dedication to trial preparation, cross-examination, and judicial integrity.",
      icon: Scale,
    },
    {
      title: "International Legal Affiliation",
      description:
        "Membership with the International Bar Association (IBA) connects local court practice with global standards of legal ethics, human rights, and professional modernism.",
      icon: Award,
    },
  ];

  return (
    <section
      id="about"
      className={cn(
        "py-20 lg:py-28 relative overflow-hidden transition-colors duration-300",
        "bg-gradient-to-b from-[#F8F6F1] via-[#F8F6F1] to-[#EDE8DC] text-slate-900 border-b border-slate-200",
        "dark:bg-gradient-to-b dark:from-[#060C18] dark:via-[#0A1424] dark:to-[#060C18] dark:text-white dark:border-b dark:border-white/10"
      )}
    >
      {/* Decorative ambient gold glow in background */}
      <div
        className="absolute top-1/4 -left-32 w-96 h-96 rounded-full pointer-events-none opacity-30 dark:opacity-20 blur-3xl"
        style={{
          background: "radial-gradient(circle, rgba(216, 184, 112, 0.4) 0%, transparent 70%)",
        }}
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">

          {/* ──────────── Left: Authentic Courtroom Photo ──────────── */}
          <div className="lg:col-span-5">
            <FadeInLeft delay={0.15} className="relative">
              {/* Outer Luxury Card Frame */}
              <div
                className={cn(
                  "relative rounded-3xl overflow-hidden p-3 transition-transform duration-300 shadow-xl",
                  "bg-white border-2 border-gold-500/35",
                  "dark:bg-[#0E1829] dark:border-gold-500/35"
                )}
              >
                {/* Courtroom Photo Container */}
                <div className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-slate-950">
                  <Image
                    src={courtroomImage}
                    alt={`${fullName} in Court Robes`}
                    fill
                    sizes="(max-width: 768px) 100vw, 440px"
                    className="object-cover object-center transition-transform duration-700 hover:scale-[1.03]"
                  />

                  {/* Gradient vignette on bottom of photo */}
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background:
                        "linear-gradient(180deg, transparent 65%, rgba(6,11,22,0.85) 92%, #060B16 100%)",
                    }}
                    aria-hidden="true"
                  />

                  {/* Robed Advocate Tag */}
                  <div
                    className="absolute bottom-4 left-4 right-4 z-10 p-3.5 rounded-xl text-white flex items-center justify-between shadow-xl"
                    style={{
                      background: "rgba(6, 11, 22, 0.88)",
                      backdropFilter: "blur(12px)",
                      border: "1px solid rgba(216, 184, 112, 0.35)",
                    }}
                  >
                    <div>
                      <div className="text-xs font-bold text-gold-300">
                        Courtroom Robes · {chamber.court}, {chamber.city}
                      </div>
                      <div className="text-[11px] text-slate-300">
                        District Judiciary Premises
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-extrabold px-2 py-0.5 rounded bg-gradient-to-r from-gold-400 to-gold-500 text-slate-950 shadow-xs">
                      ESTD. CHAMBER
                    </span>
                  </div>
                </div>

                {/* Subtitle Card */}
                <div className="pt-4 px-2 pb-1 flex items-center justify-between">
                  <div>
                    <span className="text-base font-serif font-bold text-slate-900 dark:text-white block">
                      {fullName}
                    </span>
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                      B.S.S (Hon&apos;s) · M.S.S · LL.B · LL.M
                    </span>
                  </div>
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm bg-gradient-to-br from-gold-100 to-gold-200 text-gold-800 dark:bg-gradient-to-br dark:from-[#16294A] dark:to-[#0A1324] dark:text-gold-300 border border-gold-400/40"
                  >
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Decorative Corner Gold Accents */}
              <div
                className="absolute -top-3 -left-3 w-14 h-14 border-t-2 border-l-2 rounded-tl-2xl pointer-events-none"
                style={{ borderColor: "rgba(192, 154, 78, 0.55)" }}
                aria-hidden="true"
              />
              <div
                className="absolute -bottom-3 -right-3 w-14 h-14 border-b-2 border-r-2 rounded-br-2xl pointer-events-none"
                style={{ borderColor: "rgba(192, 154, 78, 0.55)" }}
                aria-hidden="true"
              />
            </FadeInLeft>
          </div>

          {/* ──────────── Right: Narrative & Practice Pillars ──────────── */}
          <div className="lg:col-span-7 space-y-7">
            {/* Eyebrow Pill */}
            <FadeIn delay={0.08}>
              <div
                className={cn(
                  "inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm",
                  "bg-gold-100 text-gold-900 border border-gold-500/50",
                  "dark:bg-gold-400/10 dark:text-gold-200 dark:border-gold-400/35"
                )}
              >
                <Scale className="w-3.5 h-3.5 text-gold-700 dark:text-gold-400" />
                <span>Professional Profile &amp; Background</span>
              </div>
            </FadeIn>

            {/* Headline */}
            <FadeIn delay={0.16} className="space-y-4">
              <h2 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white leading-[1.2]">
                Dedicated Legal Counsel Built Upon{" "}
                <span className="about-heading-gradient">
                  Academic Precision
                </span>{" "}
                and Courtroom Resolve
              </h2>

              <p className="text-base text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
                <strong className="text-slate-900 dark:text-white font-semibold">
                  {(preferredName || fullName).startsWith("Advocate")
                    ? (preferredName || fullName)
                    : `Advocate ${preferredName || fullName}`}
                </strong>{" "}
                is an enrolled legal practitioner operating from his permanent chamber at
                the {chamber.court} in {chamber.city}. With advanced postgraduate qualifications in both
                law (LL.M) and the social sciences (M.S.S), he combines comprehensive statutory analysis
                with deep socio-legal insight into civil, commercial, and property disputes.
              </p>

              <p className="text-sm sm:text-[15px] text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                His practice covers substantive civil suits, complex criminal defense trials,
                and specialized taxation advisory before revenue authorities. Holding active
                memberships across the Sylhet District Bar Association, the historic Sylhet District
                Taxes Bar Association (ESTD. 1974), and the International Bar Association (IBA), he ensures
                his clients receive meticulous, confidential, and principled advocacy.
              </p>
            </FadeIn>

            {/* Core Practice Pillars Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {pillars.map((pillar, idx) => {
                const Icon = pillar.icon;
                return (
                  <div
                    key={idx}
                    className={cn(
                      "group relative p-5 rounded-2xl transition-all duration-300 hover:-translate-y-1 shadow-sm",
                      "bg-white border border-slate-200 text-slate-900 hover:border-gold-400/50 hover:shadow-xl",
                      "dark:bg-[#0E1829]/90 dark:border-white/10 dark:text-white hover:dark:border-gold-500/50 hover:dark:shadow-2xl"
                    )}
                  >
                    {/* Top hover hairline */}
                    <div
                      className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-gold-400 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-t-2xl"
                      aria-hidden="true"
                    />

                    {/* Icon Container */}
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center mb-3.5 transition-transform duration-300 group-hover:scale-105 bg-gradient-to-br from-gold-100 to-gold-200 text-gold-800 dark:from-white/10 dark:to-white/5 dark:text-gold-300 border border-gold-400/40 shadow-sm"
                    >
                      <Icon className="w-5 h-5" />
                    </div>

                    <h4 className="text-sm font-serif font-bold text-slate-900 dark:text-white mb-1.5 group-hover:text-gold-800 dark:group-hover:text-gold-300 transition-colors">
                      {pillar.title}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                      {pillar.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
