"use client";

import * as React from "react";
import {
  ReceiptText,
  Scale,
  ShieldAlert,
  Briefcase,
  FileCheck2,
  Users2,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { ADVOCATE_INFO } from "@/const/advocate";
import { FadeIn, FadeInUp } from "@/components/wrappers/Motion";
import { cn } from "@/lib/utils";

const ICON_MAP = {
  ReceiptText,
  Scale,
  ShieldAlert,
  Briefcase,
  FileCheck2,
  Users2,
};

export default function PracticeAreasSection() {
  return (
    <section
      id="practice"
      className={cn(
        "py-20 lg:py-28 relative overflow-hidden transition-colors duration-300",
        "bg-gradient-to-b from-[#EDE8DC] via-[#F8F6F1] to-[#F8F6F1] text-slate-900 border-b border-slate-200",
        "dark:bg-gradient-to-b dark:from-[#0A1424] dark:via-[#0E1829] dark:to-[#060C18] dark:text-white dark:border-b dark:border-white/10"
      )}
    >
      {/* Background ambient accents */}
      <div
        className="absolute top-1/2 -right-40 w-[500px] h-[500px] rounded-full pointer-events-none opacity-30 dark:opacity-20 blur-3xl"
        style={{
          background: "radial-gradient(circle, rgba(192, 154, 78, 0.35) 0%, transparent 70%)",
        }}
        aria-hidden="true"
      />

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
              <Scale className="w-3.5 h-3.5 text-gold-700 dark:text-gold-400" />
              <span>Litigation &amp; Legal Practice</span>
            </div>
          </FadeIn>

          <FadeInUp delay={0.1}>
            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 dark:text-white leading-[1.15]">
              Core Practice Areas &amp; Court Services
            </h2>
          </FadeInUp>

          <FadeInUp delay={0.2}>
            <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
              Providing focused, ethical advocacy before the civil courts, criminal sessions,
              and tax tribunals of Sylhet. Every matter receives rigorous statutory analysis,
              evidence examination, and thorough courtroom preparation.
            </p>
          </FadeInUp>
        </div>

        {/* Practice Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {ADVOCATE_INFO.practiceAreas.map((area, idx) => {
            const Icon =
              ICON_MAP[area.icon as keyof typeof ICON_MAP] || Scale;
            return (
              <FadeInUp
                key={area.id}
                delay={0.08 * (idx + 1)}
                className="h-full"
              >
                <div
                  className={cn(
                    "group relative h-full flex flex-col justify-between p-7 rounded-3xl transition-all duration-300 hover:-translate-y-1.5 overflow-hidden shadow-sm",
                    "bg-white border border-slate-200/90 text-slate-900 hover:border-gold-500/50 hover:shadow-xl",
                    "dark:bg-[#0E1829] dark:border-white/10 dark:text-white hover:dark:border-gold-500/50 hover:dark:shadow-2xl"
                  )}
                >
                  {/* Top gold hairline on hover */}
                  <div
                    className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-gold-400 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    aria-hidden="true"
                  />

                  <div>
                    {/* Icon & Category Header */}
                    <div className="flex items-center justify-between mb-5">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-gold-400 transition-all duration-300 group-hover:scale-105"
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
                          "text-[11px] font-mono font-bold px-3 py-1 rounded-full",
                          "bg-gold-100 text-gold-900 border border-gold-500/50",
                          "dark:bg-gold-400/10 dark:text-gold-200 dark:border-gold-400/35"
                        )}
                      >
                        0{idx + 1}
                      </span>
                    </div>

                    {/* Title & Description */}
                    <h3 className="font-serif text-lg font-bold text-slate-900 dark:text-white group-hover:text-gold-800 dark:group-hover:text-gold-300 transition-colors duration-200 mb-2.5">
                      {area.title}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-5 font-normal">
                      {area.description}
                    </p>

                    {/* Specific Service Highlights */}
                    <div
                      className="space-y-2.5 pt-4 border-t border-slate-200/80 dark:border-white/10"
                    >
                      {area.points.map((pt, pIdx) => (
                        <div
                          key={pIdx}
                          className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-200 font-medium"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-gold-700 dark:text-gold-400 shrink-0 mt-0.5" />
                          <span className="leading-snug">{pt}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Consultation footer link */}
                  <div
                    className="pt-5 mt-6 flex items-center justify-between border-t border-slate-200/80 dark:border-white/10"
                  >
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      {area.summary.slice(0, 36)}...
                    </span>
                    <a
                      href="#contact"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 bg-slate-100 hover:bg-gold-500/15 text-slate-800 hover:text-gold-900 border border-slate-200/90 hover:border-gold-500/50 dark:bg-white/5 dark:hover:bg-gold-400/15 dark:text-slate-200 dark:hover:text-gold-300 dark:border-white/10 dark:hover:border-gold-400/40 shadow-xs group/link"
                    >
                      <span>Inquire</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover/link:translate-x-1 transition-transform text-gold-600 dark:text-gold-400" />
                    </a>
                  </div>
                </div>
              </FadeInUp>
            );
          })}
        </div>
      </div>
    </section>
  );
}
