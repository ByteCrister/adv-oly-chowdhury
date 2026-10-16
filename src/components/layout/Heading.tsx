"use client";

import * as React from "react";
import Link from "next/link";
import {
  Scale,
  Phone,
  Mail,
  Menu,
  X,
  MapPin,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { ADVOCATE_INFO } from "@/const/advocate";
import { cn } from "@/lib/utils";

export default function Heading() {
  const [isScrolled, setIsScrolled] = React.useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 16);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  React.useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) setMobileMenuOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  React.useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-50 w-full transition-all duration-300",
          isScrolled
            ? "bg-white/95 dark:bg-[#070E1E]/95 shadow-md backdrop-blur-md border-b border-slate-200/90 dark:border-white/10"
            : "bg-white/90 dark:bg-[#060B16]/90 backdrop-blur-sm border-b border-slate-200/70 dark:border-white/8"
        )}
      >
        {/* ── Top Utility Bar (Desktop only) ── */}
        <div
          className={cn(
            "hidden lg:block text-xs font-medium py-1.5 transition-colors duration-200",
            "bg-slate-100/95 dark:bg-[#040812]/95 border-b border-slate-200/80 dark:border-white/6"
          )}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
            <div className="flex items-center gap-5 text-slate-700 dark:text-slate-200">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-gold-700 dark:text-gold-400 shrink-0" />
                <span>Chamber 323, Bar Hall 02 · Judge&apos;s Court, Sylhet</span>
              </span>
              <span className="w-px h-3 bg-slate-300 dark:bg-white/15 inline-block" />
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-gold-700 dark:text-gold-400 shrink-0" />
                <span>Sylhet Bar &amp; Taxes Bar Association · IBA Member</span>
              </span>
            </div>

            <div className="flex items-center gap-5 text-slate-700 dark:text-slate-200">
              <a
                href={`mailto:${ADVOCATE_INFO.contact.email}`}
                className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200 hover:text-gold-800 dark:hover:text-gold-300 transition-colors font-medium hover:underline"
                title="Send email inquiry"
              >
                <Mail className="w-3.5 h-3.5 text-gold-700 dark:text-gold-400 shrink-0" />
                <span>{ADVOCATE_INFO.contact.email}</span>
              </a>
              <span className="w-px h-3 bg-slate-300 dark:bg-white/15 inline-block" />
              <a
                href={`tel:${ADVOCATE_INFO.contact.phoneInternational}`}
                className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white hover:text-gold-800 dark:hover:text-gold-300 transition-colors"
                title="Direct chamber telephone"
              >
                <Phone className="w-3.5 h-3.5 text-gold-700 dark:text-gold-400 shrink-0" />
                <span>{ADVOCATE_INFO.contact.phoneDisplay}</span>
              </a>
            </div>
          </div>
        </div>

        {/* ── Main Navigation Bar ── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-[72px]">
            {/* Identity / Brand Monogram */}
            <Link
              href="/"
              className="flex items-center gap-3.5 group focus-visible:outline-none"
              aria-label="Advocate Aminul Islam Chowdhury Oly – Home"
            >
              {/* Crest Monogram */}
              <div
                className="relative w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105"
                style={{
                  background: "linear-gradient(145deg, #16294A 0%, #0A1324 100%)",
                  border: "1px solid rgba(216, 184, 112, 0.45)",
                  boxShadow: "0 4px 12px rgba(16, 28, 51, 0.2)",
                }}
              >
                <Scale className="w-5 h-5 text-gold-400" />
                <span
                  className="absolute -bottom-1 -right-1 text-[8px] font-mono font-bold px-1 leading-tight rounded text-slate-950"
                  style={{
                    background: "linear-gradient(180deg, #F6E3AE, #C09A4E)",
                  }}
                >
                  ADV
                </span>
              </div>

              {/* Advocate Name & Titles */}
              <div className="flex flex-col leading-tight">
                <span className="font-serif text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight group-hover:text-gold-800 dark:group-hover:text-gold-300 transition-colors">
                  Aminul Islam Chowdhury Oly
                </span>
                <span className="text-[11px] font-medium flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                  <span className="text-gold-800 dark:text-gold-400 font-bold uppercase tracking-wider text-[10px]">
                    Advocate
                  </span>
                  <span className="text-slate-300 dark:text-white/20">·</span>
                  <span>LL.M · LL.B · M.S.S · B.S.S</span>
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav
              className="hidden lg:flex items-center gap-1"
              aria-label="Main Navigation"
            >
              {ADVOCATE_INFO.navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="relative px-4 py-2 text-sm font-semibold text-slate-800 dark:text-slate-200 hover:text-gold-800 dark:hover:text-gold-300 rounded-lg hover:bg-slate-100/80 dark:hover:bg-white/6 transition-colors duration-200 group"
                >
                  <span className="relative z-10">{link.label}</span>
                  {/* Gold underline on hover */}
                  <span
                    className="absolute bottom-1 left-4 right-4 h-0.5 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left rounded-full"
                    style={{
                      background: "linear-gradient(90deg, #C09A4E, #E8D09A)",
                    }}
                  />
                </a>
              ))}
            </nav>

            {/* Right Actions: Direct Call & Consultation CTA */}
            <div className="flex items-center gap-2.5 sm:gap-3">
              {/* Glossy Gold Consultation CTA Button with Golden Shading Effect */}
              <a
                href="#contact"
                className="btn-gold-gloss hidden sm:inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider"
              >
                <span>Consult Now</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>

              {/* Direct Phone Call Button (Mobile & Tablet) */}
              <a
                href={`tel:${ADVOCATE_INFO.contact.phoneInternational}`}
                className="sm:hidden w-10 h-10 rounded-xl flex items-center justify-center text-slate-800 dark:text-gold-300 border border-gold-500/40 bg-gold-500/10 dark:bg-white/5 hover:bg-gold-500/20 transition-all hover:scale-105 shadow-xs"
                aria-label="Direct call to Advocate"
              >
                <Phone className="w-4 h-4" />
              </a>

              {/* Mobile Menu Hamburger */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden w-10 h-10 rounded-xl flex items-center justify-center text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/8 transition-colors"
                aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Shimmering Gold Hairline Bottom Accent */}
        <div
          className="w-full h-px opacity-70"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(216,184,112,0.4) 30%, rgba(216,184,112,0.85) 50%, rgba(216,184,112,0.4) 70%, transparent 100%)",
          }}
          aria-hidden="true"
        />
      </header>

      {/* ── Mobile Drawer Navigation Menu ── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 dark:bg-black/75 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <div
            className={cn(
              "fixed inset-y-0 right-0 w-full max-w-[320px] flex flex-col justify-between overflow-y-auto p-6 shadow-2xl transition-all",
              "bg-white dark:bg-[#070E1E] text-slate-900 dark:text-white border-l border-slate-200 dark:border-white/10"
            )}
          >
            <div>
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-6 border-b border-slate-200 dark:border-white/10">
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{
                      background: "linear-gradient(135deg, #16294A 0%, #0A1324 100%)",
                      border: "1px solid rgba(216, 184, 112, 0.4)",
                    }}
                  >
                    <Scale className="w-4 h-4 text-gold-400" />
                  </div>
                  <div>
                    <div className="text-sm font-serif font-bold text-slate-900 dark:text-white">
                      Advocate Oly Chowdhury
                    </div>
                    <div className="text-[11px] text-gold-800 dark:text-gold-400 font-bold">
                      Judge&apos;s Court, Sylhet
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Links */}
              <nav
                className="py-6 flex flex-col gap-1"
                aria-label="Mobile Navigation"
              >
                {ADVOCATE_INFO.navLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-200 hover:text-gold-800 dark:hover:text-gold-300 hover:bg-slate-100 dark:hover:bg-white/6 transition-all group"
                  >
                    <span>{link.label}</span>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-gold-700 dark:group-hover:text-gold-400 transition-colors" />
                  </a>
                ))}
              </nav>

              {/* Chamber Address Card */}
              <div
                className="p-4 rounded-xl text-xs space-y-1.5 bg-slate-100/80 dark:bg-white/5 border border-slate-200 dark:border-white/10"
              >
                <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] text-gold-800 dark:text-gold-400">
                  <MapPin className="w-3.5 h-3.5 text-gold-700 dark:text-gold-400" />
                  <span>Chamber Location</span>
                </div>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
                  {ADVOCATE_INFO.chamber.room}, {ADVOCATE_INFO.chamber.barHall}
                  <br />
                  {ADVOCATE_INFO.chamber.court}, {ADVOCATE_INFO.chamber.city}
                </p>
              </div>
            </div>

            {/* Bottom Actions: Call + Email */}
            <div className="pt-6 border-t border-slate-200 dark:border-white/10 flex flex-col gap-3">
              <a
                href={`tel:${ADVOCATE_INFO.contact.phoneInternational}`}
                className="btn-gold-gloss w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-xs font-extrabold uppercase tracking-wider"
              >
                <Phone className="w-4 h-4" />
                <span>Call {ADVOCATE_INFO.contact.phone}</span>
              </a>

              <a
                href={`mailto:${ADVOCATE_INFO.contact.email}`}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 hover:text-gold-800 dark:hover:text-gold-300 border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/8 transition-colors"
              >
                <Mail className="w-3.5 h-3.5 text-gold-700 dark:text-gold-400" />
                <span>{ADVOCATE_INFO.contact.email}</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
