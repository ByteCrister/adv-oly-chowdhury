"use client";

import * as React from "react";
import {
  MapPin,
  Building2,
  Clock,
  Phone,
  Copy,
  Check,
  Calendar,
  Scale,
} from "lucide-react";
import { ADVOCATE_INFO } from "@/const/advocate";
import { useToast } from "@/components/shared/use-toast";
import { FadeIn, FadeInRight } from "@/components/wrappers/Motion";
import { cn } from "@/lib/utils";

export default function ChamberSection() {
  const { toast } = useToast();
  const [copied, setCopied] = React.useState(false);

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(ADVOCATE_INFO.chamber.fullAddress);
      setCopied(true);
      toast({
        title: "Chamber Address Copied",
        description: ADVOCATE_INFO.chamber.fullAddress,
        variant: "gold",
        duration: 4000,
      });
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast({
        title: "Could not copy",
        description: "Please copy the address manually.",
        variant: "warning",
      });
    }
  };

  return (
    <section
      id="chamber"
      className={cn(
        "py-20 lg:py-28 relative overflow-hidden transition-colors duration-300",
        "bg-gradient-to-b from-[#F8F6F1] via-[#F4F0E8] to-[#EDE8DC] text-slate-900 border-b border-slate-200",
        "dark:bg-gradient-to-b dark:from-[#0A1424] dark:via-[#0E1829] dark:to-[#060C18] dark:text-white dark:border-b dark:border-white/10"
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">

          {/* ──────────── Left: Chamber Overview ──────────── */}
          <div className="lg:col-span-6 space-y-6">
            <FadeIn>
              <div
                className={cn(
                  "inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm",
                  "bg-gold-500/15 text-gold-900 border border-gold-600/35",
                  "dark:bg-gold-400/10 dark:text-gold-300 dark:border-gold-400/30"
                )}
              >
                <Building2 className="w-3.5 h-3.5 text-gold-700 dark:text-gold-400" />
                <span>Court Chambers &amp; Consultations</span>
              </div>
            </FadeIn>

            <FadeIn delay={0.1} className="space-y-4">
              <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 dark:text-white leading-[1.15]">
                Chamber Location &amp; Court Consultations
              </h2>
              <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                Advocate Aminul Islam Chowdhury Oly conducts his primary litigation practice
                directly inside the historic Judge&apos;s Court premises in Sylhet. Clients, corporate
                representatives, and instructing counsel can meet in person for case evaluations,
                brief reviews, and pre-hearing conferences.
              </p>
            </FadeIn>

            {/* Chamber Specifications Cards */}
            <div className="space-y-4 pt-2">
              {/* Chamber Address Card */}
              <div
                className={cn(
                  "p-5 rounded-2xl flex items-start gap-4 transition-all duration-300 shadow-sm",
                  "bg-white border border-slate-200/90 text-slate-900 hover:shadow-md",
                  "dark:bg-[#0E1829] dark:border-white/10 dark:text-white"
                )}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-gold-400 shrink-0"
                  style={{
                    background: "linear-gradient(135deg, #16294A 0%, #0A1324 100%)",
                    border: "1px solid rgba(216, 184, 112, 0.4)",
                    boxShadow: "0 4px 12px rgba(16, 28, 51, 0.2)",
                  }}
                >
                  <MapPin className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-mono font-bold text-gold-800 dark:text-gold-400 uppercase tracking-wider">
                    Official Chamber Unit
                  </div>
                  <div className="text-base font-serif font-bold text-slate-900 dark:text-white">
                    {ADVOCATE_INFO.chamber.room}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 font-normal">
                    {ADVOCATE_INFO.chamber.barHall}, {ADVOCATE_INFO.chamber.court},{" "}
                    {ADVOCATE_INFO.chamber.city}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCopyAddress}
                  className={cn(
                    "px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 shadow-xs",
                    "bg-slate-100 hover:bg-slate-200 text-slate-800 hover:text-slate-950 border border-slate-300",
                    "dark:bg-white/10 dark:hover:bg-white/15 dark:text-slate-100 dark:hover:text-white dark:border-white/20"
                  )}
                  title="Copy full address"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-gold-700 dark:text-gold-400" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              {/* Consultation Hours Card */}
              <div
                className={cn(
                  "p-5 rounded-2xl flex items-start gap-4 transition-all duration-300 shadow-sm",
                  "bg-white border border-slate-200/90 text-slate-900 hover:shadow-md",
                  "dark:bg-[#0E1829] dark:border-white/10 dark:text-white"
                )}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-gold-400 shrink-0"
                  style={{
                    background: "linear-gradient(135deg, #16294A 0%, #0A1324 100%)",
                    border: "1px solid rgba(216, 184, 112, 0.4)",
                    boxShadow: "0 4px 12px rgba(16, 28, 51, 0.2)",
                  }}
                >
                  <Clock className="w-5 h-5" />
                </div>

                <div>
                  <div className="text-[11px] font-mono font-bold text-gold-800 dark:text-gold-400 uppercase tracking-wider">
                    Chamber Schedule &amp; Court Routine
                  </div>
                  <div className="text-base font-serif font-bold text-slate-900 dark:text-white">
                    {ADVOCATE_INFO.chamber.consultationHours}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 font-normal">
                    Morning court proceedings · Afternoon &amp; evening chamber conferences
                  </div>
                </div>
              </div>
            </div>

            {/* Practical Advice Protocol */}
            <div
              className={cn(
                "p-4 rounded-xl text-xs space-y-1.5 shadow-sm",
                "bg-gold-500/12 border border-gold-600/35 text-slate-800",
                "dark:bg-gold-400/10 dark:border-gold-400/25 dark:text-slate-200"
              )}
            >
              <div className="font-bold text-gold-900 dark:text-gold-300 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                <Calendar className="w-3.5 h-3.5 text-gold-700 dark:text-gold-400" />
                <span>Prior Appointment Protocol</span>
              </div>
              <p className="leading-relaxed font-normal">
                Due to ongoing trial appearances and appellate hearings at the Judge&apos;s Court, clients are
                requested to call or message ahead to confirm chamber availability and ensure unhurried
                attention for their legal brief.
              </p>
            </div>
          </div>

          {/* ──────────── Right: Midnight Sapphire Chamber Card ──────────── */}
          <div className="lg:col-span-6">
            <FadeInRight delay={0.2} className="relative">
              {/* Outer ambient glow */}
              <div
                className="absolute -inset-2 rounded-3xl pointer-events-none opacity-40 blur-2xl"
                style={{
                  background:
                    "radial-gradient(circle, rgba(192, 154, 78, 0.4) 0%, rgba(44, 81, 144, 0.3) 60%, transparent 80%)",
                }}
                aria-hidden="true"
              />

              <div
                className="relative rounded-3xl p-8 sm:p-9 text-white overflow-hidden shadow-2xl"
                style={{
                  background: "linear-gradient(155deg, #101C33 0%, #0A1324 60%, #060B16 100%)",
                  border: "1px solid rgba(216, 184, 112, 0.4)",
                  boxShadow: "0 24px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255, 255, 255, 0.12)",
                }}
              >
                {/* Header */}
                <div
                  className="flex items-center justify-between pb-6 border-b border-white/10"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-gold-400"
                      style={{
                        background: "rgba(255, 255, 255, 0.06)",
                        border: "1px solid rgba(216, 184, 112, 0.3)",
                      }}
                    >
                      <Scale className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-serif text-xl font-bold text-white tracking-tight">
                        Judge&apos;s Court, Sylhet
                      </h3>
                      <p className="text-xs text-gold-300">
                        Sylhet District Judiciary Complex
                      </p>
                    </div>
                  </div>
                  <span
                    className="text-xs font-mono font-bold px-3 py-1 rounded-full text-slate-950"
                    style={{
                      background: "linear-gradient(180deg,#F6E3AE,#D8B870)",
                    }}
                  >
                    Bar Hall 02
                  </span>
                </div>

                {/* Details Breakdown */}
                <div className="space-y-3.5 py-6">
                  {[
                    { label: "Judicial District", val: "Sylhet, Bangladesh" },
                    { label: "Court Complex", val: "Judge's Court, Sylhet" },
                    { label: "Bar Hall / Section", val: "Bar Hall No: 02" },
                    { label: "Chamber Unit", val: "Chamber No. 323 (3rd Floor)" },
                  ].map(({ label, val }) => (
                    <div
                      key={label}
                      className="flex items-center justify-between text-xs py-2 border-b border-white/8"
                    >
                      <span className="text-slate-400">{label}:</span>
                      <span className="font-semibold text-white">{val}</span>
                    </div>
                  ))}

                  <div
                    className="flex items-center justify-between text-xs py-2 border-b border-white/8"
                  >
                    <span className="text-slate-400">Direct Chamber Mobile:</span>
                    <a
                      href={`tel:${ADVOCATE_INFO.contact.phoneInternational}`}
                      className="font-mono font-bold text-gold-300 hover:text-white transition-colors"
                    >
                      {ADVOCATE_INFO.contact.phone}
                    </a>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="pt-2 flex flex-col sm:flex-row gap-3">
                  <a
                    href={`tel:${ADVOCATE_INFO.contact.phoneInternational}`}
                    className="btn-gold-gloss flex-1 inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl text-xs font-extrabold uppercase tracking-wider"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call for Chamber Appointment</span>
                  </a>

                  <button
                    type="button"
                    onClick={handleCopyAddress}
                    className="inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl text-xs font-semibold text-slate-100 hover:text-white transition-all hover:scale-[1.02] bg-white/10 hover:bg-white/20 border border-white/20"
                  >
                    <Copy className="w-3.5 h-3.5 text-gold-300" />
                    <span>Copy Address</span>
                  </button>
                </div>
              </div>
            </FadeInRight>
          </div>

        </div>
      </div>
    </section>
  );
}
