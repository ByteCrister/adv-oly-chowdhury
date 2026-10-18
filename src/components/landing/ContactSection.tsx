import {
  Phone,
  Mail,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { ADVOCATE_INFO } from "@/const/advocate";
import { WhatsAppIcon } from "@/components/shared";
import { FadeIn, FadeInUp } from "@/components/wrappers/Motion";
import { CopyContactButton } from "./client/CopyContactButton";
import type { LandingProfile } from "@/lib/landing/landing.types";

export interface ContactSectionProps {
  profile?: LandingProfile;
}

export default function ContactSection({ profile }: ContactSectionProps = {}) {
  const fullName = profile?.fullName || ADVOCATE_INFO.fullName;
  const phone = profile?.phone || ADVOCATE_INFO.contact.phone;
  const phoneInternational = profile?.phoneInternational || ADVOCATE_INFO.contact.phoneInternational;
  const email = profile?.email || ADVOCATE_INFO.contact.email;
  const whatsappUrl = profile?.whatsappUrl || ADVOCATE_INFO.contact.whatsappUrl;
  const chamber = profile?.chamber || ADVOCATE_INFO.chamber;

  return (
    <section
      id="contact"
      className="py-20 lg:py-28 relative overflow-hidden transition-colors duration-300 bg-gradient-to-b from-[#F4F0E8] via-[#EDE8DC] to-[#E5DFC8] text-slate-900 dark:bg-gradient-to-b dark:from-[#081022] dark:via-[#060B18] dark:to-[#03060E] dark:text-white"
    >
      {/* Decorative Gold Ambient Background Glow */}
      <div
        className="absolute bottom-0 right-0 w-[550px] h-[550px] rounded-full pointer-events-none opacity-25 dark:opacity-20 blur-3xl"
        style={{
          background: "radial-gradient(circle, rgba(192, 154, 78, 0.4) 0%, transparent 70%)",
        }}
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <FadeIn>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-gold-500/15 text-gold-900 border border-gold-600/35 dark:bg-gold-400/10 dark:text-gold-300 dark:border-gold-400/30 shadow-sm">
              <Phone className="w-3.5 h-3.5 text-gold-700 dark:text-gold-400" />
              <span>Direct Professional Access</span>
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
                    {phone}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed font-normal">
                    Direct mobile line for urgent litigation queries, bail hearings, and court chamber bookings.
                  </p>
                </div>
              </div>

              <div className="pt-6 mt-6 flex items-center gap-2 border-t border-slate-200 dark:border-white/10">
                <a
                  href={`tel:${phoneInternational}`}
                  className="btn-gold-gloss flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-extrabold uppercase tracking-wider"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Call Now</span>
                </a>

                <CopyContactButton
                  value={phone}
                  type="phone"
                  label="Copy Phone Number"
                />
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
                    {email}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed font-normal">
                    Send case summaries, certified deed scans, court notices, or formal retainer inquiries.
                  </p>
                </div>
              </div>

              <div className="pt-6 mt-6 flex items-center gap-2 border-t border-slate-200 dark:border-white/10">
                <a
                  href={`mailto:${email}`}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold transition-all bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-300 dark:bg-white/10 dark:hover:bg-white/15 dark:border-white/20 dark:text-white shadow-xs"
                >
                  <Mail className="w-3.5 h-3.5 text-gold-700 dark:text-gold-400" />
                  <span>Send Email</span>
                </a>

                <CopyContactButton
                  value={email}
                  type="email"
                  label="Copy Email Address"
                />
              </div>
            </div>
          </FadeInUp>

          {/* Card 3: WhatsApp Direct */}
          <FadeInUp delay={0.3} className="h-full">
            <div className="group relative h-full flex flex-col justify-between p-7 rounded-2xl transition-all duration-300 hover:-translate-y-1.5 bg-white/95 border border-slate-200/90 shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:border-emerald-500/40 hover:shadow-[0_16px_40px_rgba(16,185,129,0.12)] dark:bg-gradient-to-b dark:from-[#101C33]/90 dark:to-[#060D20]/95 dark:border-emerald-500/30 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_28px_rgba(0,0,0,0.35)] dark:hover:border-emerald-400/50 dark:hover:shadow-[0_16px_40px_rgba(0,0,0,0.5)] backdrop-blur-md">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-105 bg-gradient-to-br from-emerald-50 via-emerald-100/70 to-emerald-200/60 border border-emerald-300/80 text-emerald-900 shadow-sm dark:bg-gradient-to-br dark:from-emerald-950/70 dark:via-[#0E2820] dark:to-[#060D20] dark:border-emerald-400/40 dark:text-emerald-300 dark:shadow-md">
                  <WhatsAppIcon className="w-6 h-6" />
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
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-whatsapp-gloss w-full inline-flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-xl text-xs font-extrabold uppercase tracking-wider text-white shadow-md"
                >
                  <WhatsAppIcon className="w-4 h-4 shrink-0" />
                  <span>Open WhatsApp Consultation</span>
                  <ExternalLink className="w-3.5 h-3.5 ml-0.5 opacity-90 shrink-0" />
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
                  Meet {fullName} at {chamber.room}, {chamber.barHall},{" "}
                  {chamber.court}, {chamber.city}. Bring relevant case documentation, certified title deeds,
                  or tax assessment notices for a comprehensive, confidential briefing.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4 shrink-0 w-full sm:w-auto">
                <a
                  href={`tel:${phoneInternational}`}
                  className="btn-gold-gloss w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl text-xs font-extrabold uppercase tracking-wider"
                >
                  <Phone className="w-4 h-4" />
                  <span>Call {phone}</span>
                </a>

                <a
                  href={`mailto:${email}?subject=Legal%20Consultation%20Inquiry%20-%20Advocate%20Oly%20Chowdhury`}
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
