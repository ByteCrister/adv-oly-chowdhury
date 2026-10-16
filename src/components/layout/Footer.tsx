"use client";

import * as React from "react";
import {
  Scale,
  MapPin,
  Phone,
  Mail,
  Shield,
  ArrowUp,
  MessageSquare,
  ExternalLink,
} from "lucide-react";
import { ADVOCATE_INFO } from "@/const/advocate";
import { cn } from "@/lib/utils";

export default function Footer() {
  return (
    <footer
      className={cn(
        "relative transition-colors duration-300",
        "bg-gradient-to-b from-[#FAF8F5] via-[#F4F0E8] to-[#ECE5D8] text-slate-800 border-t border-slate-300/80",
        "dark:bg-gradient-to-b dark:from-[#0A1324] dark:via-[#070E1E] dark:to-[#040812] dark:text-slate-200 dark:border-t dark:border-white/10"
      )}
    >
      {/* Shimmering Gold Hairline Top Border */}
      <div
        className="w-full h-px opacity-80"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(192,154,68,0.5) 25%, rgba(230,196,119,0.95) 50%, rgba(192,154,68,0.5) 75%, transparent 100%)",
        }}
        aria-hidden="true"
      />

      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8 mb-14">

          {/* Col 1: Identity & Credentials (5 cols on lg) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="flex items-center gap-3.5">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
                style={{
                  background: "linear-gradient(145deg, #16294A 0%, #0A1324 100%)",
                  border: "1px solid rgba(216, 184, 112, 0.45)",
                }}
              >
                <Scale className="w-5 h-5 text-gold-400" />
              </div>
              <div>
                <h3 className="font-serif text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                  {ADVOCATE_INFO.fullName}
                </h3>
                <p className="text-xs text-gold-800 dark:text-gold-400 font-bold uppercase tracking-wider mt-0.5">
                  {ADVOCATE_INFO.subtitle}
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed max-w-sm font-normal">
              Enrolled Advocate — Sylhet District Bar Association &amp; Sylhet District
              Taxes Bar Association (ESTD. 1974). Member, International Bar Association (IBA).
              Dedicated to principled courtroom advocacy and specialist revenue jurisprudence.
            </p>

            {/* Degree Badges */}
            <div className="flex flex-wrap gap-2 pt-1">
              {ADVOCATE_INFO.credentials.map((cred) => (
                <span
                  key={cred.degree}
                  className={cn(
                    "text-xs px-3 py-1 rounded-md font-mono font-bold transition-colors",
                    "bg-gold-500/15 text-gold-900 border border-gold-600/35",
                    "dark:bg-gold-400/10 dark:text-gold-300 dark:border-gold-400/30"
                  )}
                >
                  {cred.degree}
                </span>
              ))}
            </div>
          </div>

          {/* Col 2: Navigation Links (2 cols on lg) */}
          <div className="lg:col-span-2 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-gold-800 dark:text-gold-400">
              Navigation
            </h4>
            <ul className="space-y-2.5">
              {ADVOCATE_INFO.navLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-sm font-semibold text-slate-700 hover:text-gold-800 dark:text-slate-300 dark:hover:text-gold-300 transition-colors inline-block py-0.5"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: Practice Focus (2 cols on lg) */}
          <div className="lg:col-span-2 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-gold-800 dark:text-gold-400">
              Practice Focus
            </h4>
            <ul className="space-y-2.5">
              {[
                "Taxation & Revenue",
                "Civil Litigation",
                "Criminal Defense",
                "Land & Conveyancing",
                "Commercial Advisory",
              ].map((item) => (
                <li key={item}>
                  <a
                    href="#practice"
                    className="text-sm font-semibold text-slate-700 hover:text-gold-800 dark:text-slate-300 dark:hover:text-gold-300 transition-colors inline-block py-0.5"
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4: Chamber & Inquiries (3 cols on lg) */}
          <div className="lg:col-span-3 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-gold-800 dark:text-gold-400">
              Chamber &amp; Inquiries
            </h4>
            <div className="space-y-3.5 text-xs text-slate-700 dark:text-slate-300">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-gold-700 dark:text-gold-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">
                  {ADVOCATE_INFO.chamber.room}, {ADVOCATE_INFO.chamber.barHall}
                  <br />
                  {ADVOCATE_INFO.chamber.court}, {ADVOCATE_INFO.chamber.city}
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-gold-700 dark:text-gold-400 shrink-0" />
                <a
                  href={`tel:${ADVOCATE_INFO.contact.phoneInternational}`}
                  className="font-bold text-slate-900 hover:text-gold-800 dark:text-white dark:hover:text-gold-300 transition-colors text-xs"
                >
                  {ADVOCATE_INFO.contact.phoneDisplay}
                </a>
              </div>

              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-gold-700 dark:text-gold-400 shrink-0" />
                <a
                  href={`mailto:${ADVOCATE_INFO.contact.email}`}
                  className="font-semibold text-slate-800 hover:text-gold-800 dark:text-slate-200 dark:hover:text-gold-300 transition-colors break-all text-xs"
                >
                  {ADVOCATE_INFO.contact.email}
                </a>
              </div>
            </div>

            {/* Clear, Eye-pleasing WhatsApp Link Button */}
            <div className="pt-2">
              <a
                href={ADVOCATE_INFO.contact.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-md",
                  "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/15",
                  "dark:bg-emerald-600 dark:hover:bg-emerald-500 dark:text-white dark:border dark:border-emerald-400/30"
                )}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>WhatsApp Consultation</span>
                <ExternalLink className="w-3 h-3 ml-0.5 opacity-90" />
              </a>
            </div>
          </div>
        </div>

        {/* Legal Disclaimer Box */}
        <div
          className={cn(
            "rounded-2xl p-5 text-xs leading-relaxed mb-10 transition-colors",
            "bg-white/90 border border-slate-300/80 text-slate-700 shadow-sm",
            "dark:bg-white/5 dark:border-white/10 dark:text-slate-300 dark:shadow-none"
          )}
        >
          <div className="flex items-start gap-3">
            <Shield className="w-4 h-4 text-gold-700 dark:text-gold-400 shrink-0 mt-0.5" />
            <p>
              <strong className="text-slate-900 dark:text-white font-semibold">
                Professional Notice:
              </strong>{" "}
              This portfolio is presented solely for verified informational and
              professional profiling in accordance with the Canons of Professional
              Conduct and Etiquette of the Bangladesh Bar Council. Viewing this
              page or communicating via electronic channels does not
              automatically establish an advocate-client relationship until
              formally retained and authorized in writing.
            </p>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Back to Top Link Button */}
        <div
          className={cn(
            "pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-medium transition-colors",
            "border-t border-slate-300/80 dark:border-white/10 text-slate-600 dark:text-slate-400"
          )}
        >
          <p>© 2026 Advocate Aminul Islam Chowdhury Oly. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span>Sylhet, Bangladesh</span>
            <a
              href="#"
              className={cn(
                "inline-flex items-center gap-1.5 font-bold transition-all py-1.5 px-3 rounded-lg shadow-2xs",
                "text-slate-700 hover:text-slate-950 hover:bg-slate-200/70 border border-slate-300/70",
                "dark:text-slate-200 dark:hover:text-white dark:hover:bg-white/10 dark:border-white/10"
              )}
              aria-label="Back to top"
            >
              <span>Back to Top</span>
              <ArrowUp className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
