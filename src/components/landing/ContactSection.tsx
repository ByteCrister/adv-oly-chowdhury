"use client";

import * as React from "react";
import {
  Phone,
  Mail,
  ExternalLink,
  Copy,
  Check,
  ShieldCheck,
  MessageSquare,
} from "lucide-react";
import { ADVOCATE_INFO } from "@/const/advocate";
import { useToast } from "@/components/shared/use-toast";
import { FadeIn, FadeInUp } from "@/components/wrappers/Motion";

export default function ContactSection() {
  const { toast } = useToast();
  const [copiedPhone, setCopiedPhone] = React.useState(false);
  const [copiedEmail, setCopiedEmail] = React.useState(false);

  const handleCopyPhone = async () => {
    try {
      await navigator.clipboard.writeText(ADVOCATE_INFO.contact.phone);
      setCopiedPhone(true);
      toast({
        title: "Phone Number Copied",
        description: ADVOCATE_INFO.contact.phone,
        variant: "gold",
        duration: 3500,
      });
      setTimeout(() => setCopiedPhone(false), 2500);
    } catch {
      toast({
        title: "Could not copy",
        description: "Please dial 01712-459840 directly.",
        variant: "warning",
      });
    }
  };

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(ADVOCATE_INFO.contact.email);
      setCopiedEmail(true);
      toast({
        title: "Email Address Copied",
        description: ADVOCATE_INFO.contact.email,
        variant: "gold",
        duration: 3500,
      });
      setTimeout(() => setCopiedEmail(false), 2500);
    } catch {
      toast({
        title: "Could not copy",
        description: "Please email advocateaico@gmail.com directly.",
        variant: "warning",
      });
    }
  };

  return (
    <section
      id="contact"
      className="py-20 lg:py-28 relative overflow-hidden transition-colors duration-300 bg-gradient-to-b from-[#FAF8F5] via-[#F3EFE6] to-[#ECE5D8] text-slate-900 border-t border-slate-300/80 dark:bg-gradient-to-b dark:from-[#060D20] dark:via-[#0B1733] dark:to-[#060B16] dark:text-white dark:border-t dark:border-white/10"
    >
      {/* Background Radial Glow */}
      <div
        className="absolute -top-32 right-0 w-[600px] h-[600px] rounded-full pointer-events-none opacity-30 dark:opacity-25 blur-3xl"
        style={{
          background: "radial-gradient(circle, rgba(230,196,119,0.7) 0%, transparent 65%)",
        }}
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-32 left-0 w-[500px] h-[500px] rounded-full pointer-events-none opacity-20 dark:opacity-25 blur-3xl"
        style={{
          background: "radial-gradient(circle, rgba(44,81,144,0.4) 0%, transparent 70%)",
        }}
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <FadeIn>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider font-mono transition-colors bg-gold-50/90 text-gold-900 border border-gold-300/80 shadow-sm dark:bg-[#060D20]/90 dark:text-gold-300 dark:border-gold-500/40 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md">
              <Phone className="w-3.5 h-3.5 text-gold-600 dark:text-gold-400" />
              <span>Direct Legal Consultation</span>
            </div>
          </FadeIn>

          <FadeInUp delay={0.1}>
            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 dark:text-white leading-[1.15]">
              Connect Directly with the Advocate
            </h2>
          </FadeInUp>

          <FadeInUp delay={0.2}>
            <p className="text-base text-slate-700 dark:text-slate-300 leading-relaxed max-w-2xl mx-auto font-normal">
              For urgent court representation, civil or criminal litigation, or
              specialist tax advisory before the revenue authorities, reach out
              through the verified contact channels below.
            </p>
          </FadeInUp>
        </div>

        {/* Contact Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-7 mb-14">
          {/* Card 1: Direct Telephone */}
          <FadeInUp delay={0.1} className="h-full">
            <div className="group relative h-full flex flex-col justify-between p-7 rounded-2xl transition-all duration-300 hover:-translate-y-1.5 bg-white/95 border border-slate-200/90 shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:border-gold-400 hover:shadow-[0_16px_40px_rgba(194,154,68,0.15)] dark:bg-gradient-to-b dark:from-[#101C33]/90 dark:to-[#060D20]/95 dark:border-gold-500/30 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_28px_rgba(0,0,0,0.35)] dark:hover:border-gold-400/60 dark:hover:shadow-[0_16px_40px_rgba(0,0,0,0.5)] backdrop-blur-md">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-105 bg-gradient-to-br from-gold-100 to-gold-200/70 border border-gold-300 text-gold-900 shadow-sm dark:bg-gradient-to-br dark:from-[#16294A] dark:to-[#0A1324] dark:border-gold-400/40 dark:text-gold-300 dark:shadow-md">
                  <Phone className="w-6 h-6" />
                </div>

                <div>
                  <span className="text-[11px] font-mono font-bold text-gold-800 dark:text-gold-300 uppercase tracking-wider block">
                    Direct Telephone
                  </span>
                  <h3 className="font-serif text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1">
                    {ADVOCATE_INFO.contact.phone}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed font-normal">
                    Direct mobile line for urgent litigation queries, bail hearings, and court chamber bookings.
                  </p>
                </div>
              </div>

              <div className="pt-6 mt-6 flex items-center gap-2 border-t border-slate-200 dark:border-white/10">
                <a
                  href={`tel:${ADVOCATE_INFO.contact.phoneInternational}`}
                  className="btn-gold-gloss flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-extrabold uppercase tracking-wider"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Call Now</span>
                </a>

                <button
                  type="button"
                  onClick={handleCopyPhone}
                  className="p-3 rounded-xl transition-colors bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 hover:text-slate-950 dark:bg-white/5 dark:hover:bg-white/10 dark:border-white/15 dark:text-slate-300 dark:hover:text-white"
                  title="Copy Phone Number"
                  aria-label="Copy Phone Number"
                >
                  {copiedPhone ? (
                    <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-gold-700 dark:text-gold-400" />
                  )}
                </button>
              </div>
            </div>
          </FadeInUp>

          {/* Card 2: Official Email */}
          <FadeInUp delay={0.2} className="h-full">
            <div className="group relative h-full flex flex-col justify-between p-7 rounded-2xl transition-all duration-300 hover:-translate-y-1.5 bg-white/95 border border-slate-200/90 shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:border-gold-400 hover:shadow-[0_16px_40px_rgba(194,154,68,0.15)] dark:bg-gradient-to-b dark:from-[#101C33]/90 dark:to-[#060D20]/95 dark:border-gold-500/30 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_28px_rgba(0,0,0,0.35)] dark:hover:border-gold-400/60 dark:hover:shadow-[0_16px_40px_rgba(0,0,0,0.5)] backdrop-blur-md">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-105 bg-gradient-to-br from-gold-100 to-gold-200/70 border border-gold-300 text-gold-900 shadow-sm dark:bg-gradient-to-br dark:from-[#16294A] dark:to-[#0A1324] dark:border-gold-400/40 dark:text-gold-300 dark:shadow-md">
                  <Mail className="w-6 h-6" />
                </div>

                <div>
                  <span className="text-[11px] font-mono font-bold text-gold-800 dark:text-gold-300 uppercase tracking-wider block">
                    Electronic Mail
                  </span>
                  <h3 className="font-serif text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-1 break-all">
                    {ADVOCATE_INFO.contact.email}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed font-normal">
                    Send case summaries, certified deed scans, court notices, or formal retainer inquiries.
                  </p>
                </div>
              </div>

              <div className="pt-6 mt-6 flex items-center gap-2 border-t border-slate-200 dark:border-white/10">
                <a
                  href={`mailto:${ADVOCATE_INFO.contact.email}`}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold transition-all bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-300 dark:bg-white/10 dark:hover:bg-white/15 dark:border-white/20 dark:text-white shadow-xs"
                >
                  <Mail className="w-3.5 h-3.5 text-gold-700 dark:text-gold-400" />
                  <span>Send Email</span>
                </a>

                <button
                  type="button"
                  onClick={handleCopyEmail}
                  className="p-3 rounded-xl transition-colors bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 hover:text-slate-950 dark:bg-white/5 dark:hover:bg-white/10 dark:border-white/15 dark:text-slate-300 dark:hover:text-white"
                  title="Copy Email Address"
                  aria-label="Copy Email Address"
                >
                  {copiedEmail ? (
                    <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-gold-700 dark:text-gold-400" />
                  )}
                </button>
              </div>
            </div>
          </FadeInUp>

          {/* Card 3: WhatsApp Direct */}
          <FadeInUp delay={0.3} className="h-full">
            <div className="group relative h-full flex flex-col justify-between p-7 rounded-2xl transition-all duration-300 hover:-translate-y-1.5 bg-white/95 border border-slate-200/90 shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:border-gold-400 hover:shadow-[0_16px_40px_rgba(194,154,68,0.15)] dark:bg-gradient-to-b dark:from-[#101C33]/90 dark:to-[#060D20]/95 dark:border-gold-500/30 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_28px_rgba(0,0,0,0.35)] dark:hover:border-gold-400/60 dark:hover:shadow-[0_16px_40px_rgba(0,0,0,0.5)] backdrop-blur-md">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-105 bg-gradient-to-br from-emerald-100 to-emerald-200/80 border border-emerald-300 text-emerald-800 shadow-sm dark:bg-gradient-to-br dark:from-[#16294A] dark:to-[#0A1324] dark:border-emerald-400/40 dark:text-emerald-400 dark:shadow-md">
                  <MessageSquare className="w-6 h-6" />
                </div>

                <div>
                  <span className="text-[11px] font-mono font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider block">
                    Instant Messaging
                  </span>
                  <h3 className="font-serif text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1">
                    WhatsApp Chat
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed font-normal">
                    Direct messaging for prompt replies, court hearing date inquiries, and consultation confirmations.
                  </p>
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-200 dark:border-white/10">
                <a
                  href={ADVOCATE_INFO.contact.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-xs font-extrabold uppercase tracking-wider text-white transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 dark:border dark:border-emerald-400/30"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Open WhatsApp Consultation</span>
                  <ExternalLink className="w-3 h-3 ml-0.5 opacity-90" />
                </a>
              </div>
            </div>
          </FadeInUp>
        </div>

        {/* ──────────── Bottom CTA Band (Judge's Court Chamber Consultations) ──────────── */}
        <FadeInUp delay={0.35}>
          <div
            className="rounded-3xl p-8 sm:p-12 text-white relative overflow-hidden shadow-2xl transition-all"
            style={{
              background: "linear-gradient(155deg, rgba(16, 28, 51, 0.96) 0%, rgba(10, 19, 36, 0.98) 55%, #060B16 100%)",
              border: "1px solid rgba(216, 184, 112, 0.38)",
              boxShadow: "0 28px 70px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255, 255, 255, 0.12)",
            }}
          >
            <div className="flex flex-col lg:flex-row items-center justify-between gap-8 text-center lg:text-left">
              <div className="space-y-3 max-w-2xl">
                <div className="flex items-center justify-center lg:justify-start gap-2 text-xs font-mono font-bold text-gold-300 uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4 text-gold-400" />
                  <span>Judge&apos;s Court Chamber Consultations</span>
                </div>
                <h3 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-snug">
                  Schedule Your In-Person Chamber Session
                </h3>
                <p className="text-sm sm:text-base text-slate-200 leading-relaxed font-normal">
                  Meet Advocate Aminul Islam Chowdhury Oly at Chamber 323, Bar Hall No: 02,
                  Judge&apos;s Court, Sylhet. Bring relevant case documentation, certified title deeds,
                  or tax assessment notices for a comprehensive, confidential briefing.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4 shrink-0 w-full sm:w-auto">
                {/* Exactly 1 bottom-gold-gloss CTA per DESIGN.md */}
                <a
                  href={`tel:${ADVOCATE_INFO.contact.phoneInternational}`}
                  className="btn-gold-gloss w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl text-xs font-extrabold uppercase tracking-wider"
                >
                  <Phone className="w-4 h-4" />
                  <span>Call 01712-459840</span>
                </a>

                <a
                  href={`mailto:${ADVOCATE_INFO.contact.email}?subject=Legal%20Consultation%20Inquiry%20-%20Advocate%20Oly%20Chowdhury`}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-200 hover:text-white transition-all bg-white/10 hover:bg-white/20 border border-white/20"
                >
                  <Mail className="w-4 h-4 text-gold-400" />
                  <span>Email Brief</span>
                </a>
              </div>
            </div>
          </div>
        </FadeInUp>
      </div>
    </section>
  );
}
