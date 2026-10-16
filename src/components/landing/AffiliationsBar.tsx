"use client";

import * as React from "react";
import { Scale, Award, Globe2, Landmark } from "lucide-react";
import { FadeInUp } from "@/components/wrappers/Motion";
import { cn } from "@/lib/utils";

export default function AffiliationsBar() {
  const affiliations = [
    {
      title: "Sylhet District Bar Association",
      subtitle: "Member Advocate · Regular Practitioner",
      meta: "District Judiciary",
      icon: Scale,
    },
    {
      title: "Sylhet District Taxes Bar Association",
      subtitle: "Member Advocate · ESTD. 1974",
      meta: "Taxation & Revenue Specialist",
      icon: Landmark,
    },
    {
      title: "International Bar Association (IBA)",
      subtitle: "Member · Global Legal Network",
      meta: "International Standing",
      icon: Globe2,
    },
    {
      title: "Judge's Court, Sylhet",
      subtitle: "Chamber 323, Bar Hall No: 02",
      meta: "Permanent Chamber",
      icon: Award,
    },
  ];

  return (
    <section
      id="affiliations"
      className={cn(
        "relative py-10 overflow-hidden transition-colors duration-300",
        "bg-gradient-to-b from-[#EDE8DC] via-[#F4F0E8] to-[#F8F6F1] text-slate-900 border-b border-slate-200",
        "dark:bg-gradient-to-b dark:from-[#060B16] dark:via-[#0A1424] dark:to-[#060B16] dark:text-white dark:border-b dark:border-white/10"
      )}
    >
      {/* Top Gold Hairline Divider */}
      <div
        className="absolute top-0 inset-x-0 h-px opacity-80"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(216,184,112,0.4) 30%, rgba(216,184,112,0.85) 50%, rgba(216,184,112,0.4) 70%, transparent 100%)",
        }}
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {affiliations.map((item, idx) => {
            const Icon = item.icon;
            return (
              <FadeInUp key={item.title} delay={0.08 * (idx + 1)}>
                <div
                  className={cn(
                    "group relative h-full p-4 rounded-2xl transition-all duration-300 flex items-start gap-3.5 hover:-translate-y-1 shadow-sm",
                    "bg-white border border-slate-200 hover:border-gold-400/50 hover:shadow-lg",
                    "dark:bg-[#0E1829]/90 dark:border-white/10 hover:dark:border-gold-500/45 hover:dark:shadow-xl"
                  )}
                >
                  {/* Icon Container */}
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105"
                    style={{
                      background: "linear-gradient(135deg, #16294A 0%, #0A1324 100%)",
                      border: "1px solid rgba(216, 184, 112, 0.4)",
                      boxShadow: "0 4px 12px rgba(16, 28, 51, 0.2)",
                    }}
                  >
                    <Icon className="w-5 h-5 text-gold-400" />
                  </div>

                  {/* Text Details */}
                  <div className="space-y-1 min-w-0">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gold-800 dark:text-gold-300 block">
                      {item.meta}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight group-hover:text-gold-800 dark:group-hover:text-gold-200 transition-colors">
                      {item.title}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-snug font-normal">
                      {item.subtitle}
                    </p>
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
