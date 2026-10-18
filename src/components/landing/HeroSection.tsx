import Image from "next/image";
import {
  Scale,
  ShieldCheck,
  MapPin,
  ArrowRight,
  Phone,
  FileCheck,
  Landmark,
  Award,
} from "lucide-react";
import { ADVOCATE_INFO } from "@/const/advocate";
import {
  FadeIn,
  FadeInUp,
  FadeInRight,
} from "@/components/wrappers/Motion";
import { cn } from "@/lib/utils";
import type { LandingProfile } from "@/lib/landing/landing.types";

export interface HeroSectionProps {
  profile?: LandingProfile;
}

export default function HeroSection({ profile }: HeroSectionProps = {}) {
  const fullName = profile?.fullName || ADVOCATE_INFO.fullName;
  const preferredName = profile?.preferredName || ADVOCATE_INFO.preferredName;
  const subtitle = profile?.subtitle || ADVOCATE_INFO.subtitle;
  const tagline = profile?.tagline || ADVOCATE_INFO.tagline;
  const avatarUrl = profile?.avatarUrl || ADVOCATE_INFO.images.headshot;
  const phone = profile?.phone || ADVOCATE_INFO.contact.phone;
  const phoneInternational = profile?.phoneInternational || ADVOCATE_INFO.contact.phoneInternational;
  const chamber = profile?.chamber || ADVOCATE_INFO.chamber;

  // Split name for visual gradient styling
  const nameParts = fullName.split(" ");
  const firstPart = nameParts.length > 2 ? nameParts.slice(0, 2).join(" ") : nameParts[0] || fullName;
  const highlightPart = nameParts.length > 2 ? nameParts.slice(2).join(" ") : nameParts.slice(1).join(" ") || preferredName;

  return (
    <section
      className={cn(
        "relative overflow-hidden pt-12 pb-20 md:pt-16 md:pb-28 transition-colors duration-300",
        "bg-gradient-to-br from-[#FCFBF8] via-[#F8F6F1] to-[#EDE8DC] text-slate-900 border-b border-slate-200",
        "dark:bg-gradient-to-br dark:from-[#0B1630] dark:via-[#091228] dark:to-[#060B1A] dark:text-white dark:border-b dark:border-white/10"
      )}
    >
      {/* ── Ambient gold glow top-right ── */}
      <div
        className="absolute -top-40 -right-20 w-[600px] h-[600px] rounded-full pointer-events-none opacity-30 dark:opacity-20 blur-3xl"
        style={{
          background: "radial-gradient(circle, rgba(192,154,78,0.5) 0%, transparent 65%)",
        }}
        aria-hidden="true"
      />
      {/* ── Ambient sapphire glow bottom-left ── */}
      <div
        className="absolute -bottom-40 -left-20 w-[500px] h-[500px] rounded-full pointer-events-none opacity-20 dark:opacity-25 blur-3xl"
        style={{
          background: "radial-gradient(circle, rgba(44,81,144,0.6) 0%, transparent 65%)",
        }}
        aria-hidden="true"
      />

      {/* ── Fine grid texture ── */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.035] dark:opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)",
          backgroundSize: "52px 52px",
        }}
        aria-hidden="true"
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">

          {/* ──────────── Left: Hero Content ──────────── */}
          <div className="lg:col-span-7 space-y-7 text-center lg:text-left">

            {/* Eyebrow Pill */}
            <FadeIn delay={0.05}>
              <div
                className={cn(
                  "inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-colors shadow-sm",
                  "bg-gold-100 text-gold-900 border border-gold-500/50",
                  "dark:bg-[#16254A]/90 dark:text-gold-200 dark:border-gold-500/40"
                )}
              >
                <Scale className="w-3.5 h-3.5 text-gold-700 dark:text-gold-400" />
                <span>{subtitle || `${profile?.title || "Advocate"} · ${chamber.court}, ${chamber.city}`}</span>
              </div>
            </FadeIn>

            {/* Headline */}
            <FadeInUp delay={0.12} className="space-y-4">
              <h1 className="font-serif text-4xl sm:text-5xl xl:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.12]">
                {firstPart}<br className="hidden sm:inline" />{" "}
                <span className="hero-name-gradient">
                  {highlightPart}
                </span>
              </h1>

              {/* Verified Degree Badges */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 pt-1">
                {[
                  { label: "LL.M (Master of Laws)", isGold: true },
                  { label: "LL.B", isGold: true },
                  { label: "M.S.S", isGold: false },
                  { label: "B.S.S (Hon's)", isGold: false },
                ].map(({ label, isGold }) => (
                  <span
                    key={label}
                    className={cn(
                      "text-xs font-mono font-bold px-3 py-1 rounded-md transition-colors shadow-sm",
                      isGold
                        ? "bg-gold-100 text-gold-900 border border-gold-400/50 dark:bg-gold-500/20 dark:text-gold-200 dark:border-gold-500/40"
                        : "bg-white text-slate-700 border border-slate-300 dark:bg-white/10 dark:text-slate-200 dark:border-white/15"
                    )}
                  >
                    {label}
                  </span>
                ))}
              </div>
            </FadeInUp>

            {/* Tagline */}
            <FadeInUp delay={0.22}>
              <p className="text-base sm:text-lg text-slate-700 dark:text-slate-200 leading-relaxed max-w-xl mx-auto lg:mx-0 font-normal">
                {tagline}. Dedicated civil litigation, criminal defense,
                and specialist revenue &amp; taxation advocacy before the District Courts
                and Tax Tribunals of Sylhet.
              </p>
            </FadeInUp>

            {/* CTA Buttons */}
            <FadeInUp
              delay={0.30}
              className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-1"
            >
              {/* Primary Gold Gloss CTA with Golden Shading Effect */}
              <a
                href="#contact"
                className="btn-gold-gloss w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl text-xs font-extrabold uppercase tracking-wider"
              >
                <span>Consult with Advocate</span>
                <ArrowRight className="w-4 h-4" />
              </a>

              {/* Secondary Ghost CTA */}
              <a
                href="#practice"
                className={cn(
                  "w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 shadow-sm",
                  "bg-white text-slate-800 border border-slate-300 hover:bg-slate-50 hover:text-slate-950 hover:border-gold-400/60 hover:shadow-md",
                  "dark:bg-white/8 dark:text-slate-100 dark:border-white/20 dark:hover:bg-white/14 dark:hover:text-white dark:hover:border-gold-400/50"
                )}
              >
                <span>Explore Practice Areas</span>
              </a>
            </FadeInUp>

            {/* Trust Metrics Bar */}
            <FadeInUp delay={0.40}>
              <div
                className="pt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-slate-300/80 dark:border-white/10"
              >
                {[
                  { Icon: Landmark, title: "District Bar", sub: "Sylhet Bar Association" },
                  { Icon: FileCheck, title: "Taxes Bar (ESTD. 1974)", sub: "Sylhet Taxes Bar Assc." },
                  { Icon: Award, title: "International Bar", sub: "Member, IBA" },
                ].map(({ Icon, title, sub }) => (
                  <div
                    key={title}
                    className={cn(
                      "flex items-start gap-3 p-3.5 rounded-xl transition-all shadow-sm hover:-translate-y-0.5 duration-200",
                      "bg-white border border-slate-200 text-slate-900 hover:border-gold-400/50 hover:shadow-md",
                      "dark:bg-[#0E1829]/90 dark:border-white/10 dark:text-white hover:dark:border-gold-500/40"
                    )}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 bg-gold-100 border border-gold-400/40 text-gold-800 dark:bg-gold-500/15 dark:border-gold-500/30 dark:text-gold-300"
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">{title}</div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">{sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </FadeInUp>
          </div>

          {/* ──────────── Right: Portrait Card ──────────── */}
          <div className="lg:col-span-5 flex justify-center">
            <FadeInRight delay={0.25} className="relative w-full max-w-md sm:max-w-lg">
              {/* Outer Glow Halo */}
              <div
                className="absolute -inset-2 rounded-3xl pointer-events-none opacity-40 blur-xl"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(192,154,78,0.4), transparent 50%, rgba(44,81,144,0.3))",
                }}
                aria-hidden="true"
              />

              {/* Main Card Container */}
              <div
                className={cn(
                  "relative rounded-3xl overflow-hidden p-2 transition-all shadow-2xl",
                  "bg-white border-2 border-gold-500/40",
                  "dark:bg-[#0A1324] dark:border-gold-500/40"
                )}
              >
                {/* Portrait Image Container */}
                <div className="relative w-full aspect-[4/5] rounded-2xl overflow-hidden bg-slate-950">
                  <Image
                    src={avatarUrl}
                    alt={fullName}
                    fill
                    priority
                    loading="eager"
                    fetchPriority="high"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 45vw, 480px"
                    className="object-cover object-top transition-transform duration-700 hover:scale-[1.02]"
                  />

                  {/* Bottom Vignette */}
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background:
                        "linear-gradient(180deg, transparent 60%, rgba(6,11,22,0.9) 95%, #060B16 100%)",
                    }}
                    aria-hidden="true"
                  />

                  {/* Top Floating Badge */}
                  <div
                    className="absolute top-4 left-4 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-gold-300 shadow-md"
                    style={{
                      background: "rgba(6, 11, 22, 0.88)",
                      backdropFilter: "blur(12px)",
                      border: "1px solid rgba(216, 184, 112, 0.4)",
                    }}
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-gold-400" />
                    <span>Enrolled Advocate</span>
                  </div>

                  {/* Bottom Chamber Location Bar */}
                  <div
                    className="absolute bottom-4 inset-x-4 z-10 p-3.5 rounded-xl flex items-center justify-between shadow-xl"
                    style={{
                      background: "rgba(6, 11, 22, 0.92)",
                      backdropFilter: "blur(14px)",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center bg-gold-500/20 border border-gold-500/40 text-gold-300"
                      >
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">
                          {chamber.room} · {chamber.barHall}
                        </div>
                        <div className="text-[11px] text-slate-300">
                          {chamber.court}, {chamber.city}
                        </div>
                      </div>
                    </div>
                    <a
                      href={`tel:${phoneInternational}`}
                      className="btn-gold-gloss p-2.5 rounded-xl flex items-center justify-center shrink-0"
                      title="Direct call to Advocate"
                      aria-label="Direct call to Advocate"
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                  </div>
                </div>

                {/* Sub-card Footer */}
                <div
                  className="px-4 py-3 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)] animate-pulse" />
                    <span>Available for Consultations</span>
                  </div>
                  <span className="font-mono text-gold-800 dark:text-gold-400 font-bold">
                    {phone}
                  </span>
                </div>
              </div>
            </FadeInRight>
          </div>
        </div>
      </div>
    </section>
  );
}
