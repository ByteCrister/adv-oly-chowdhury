"use client";

import * as React from "react";
import { useSession, signOut } from "next-auth/react";
import { LogOut, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { useProfile } from "@/hooks/profile";
import { SignOutAlertDialog } from "./SignOutAlertDialog";

interface SidebarUserProps {
  isCollapsed?: boolean;
}

export function SidebarUser({ isCollapsed = false }: SidebarUserProps) {
  const { data: session } = useSession();
  const { data: profileResponse } = useProfile();
  const [isSigningOut, setIsSigningOut] = React.useState(false);
  const [isSignOutDialogOpen, setIsSignOutDialogOpen] = React.useState(false);

  async function handleSignOut() {
    try {
      setIsSigningOut(true);
      await signOut({ callbackUrl: "/signin" });
    } catch (error) {
      console.error("Sign out error:", error);
      setIsSigningOut(false);
    }
  }

  const profile = profileResponse?.data;
  const displayName = profile?.preferredName || profile?.name || session?.user?.name || "Advocate Oly Chowdhury";
  const displayEmail = profile?.email || session?.user?.email || "advocateaico@gmail.com";
  const avatarSrc = profile?.avatarUrl || "/images/profile/Polished Corporate Headshot.png";

  return (
    <>
      <div className="relative p-3 border-t border-border/70 dark:border-white/10">
        {/* Specular Top Hairline */}
        <div
          className="absolute top-0 inset-x-4 h-[1px] bg-gradient-to-r from-transparent via-gold-400/40 to-transparent pointer-events-none"
          aria-hidden="true"
        />

        <div
          className={`sidebar-user-glass relative flex items-center gap-3 p-2.5 rounded-2xl transition-all duration-200 ${
            isCollapsed ? "justify-center" : "justify-between"
          }`}
        >
          {/* User Identity */}
          {isCollapsed ? (
            <button
              type="button"
              onClick={() => setIsSignOutDialogOpen(true)}
              className="group relative focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 rounded-full"
              title="Click to sign out"
              aria-label="User profile, click to sign out"
            >
              <div className="relative shrink-0 p-0.5 rounded-full bg-gradient-to-tr from-gold-600 via-gold-400 to-amber-200 shadow-sm transition-transform group-hover:scale-105">
                <div className="relative w-9 h-9 rounded-full bg-midnight-950 flex items-center justify-center overflow-hidden">
                  <Image
                    src={avatarSrc}
                    alt={displayName}
                    width={36}
                    height={36}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.currentTarget as HTMLElement;
                      target.style.display = "none";
                    }}
                  />
                  <span className="text-[11px] font-bold text-gold-400 select-none">
                    OC
                  </span>
                </div>

                {/* Glowing Live Presence Dot */}
                <span
                  className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-background shadow-[0_0_8px_rgba(16,185,129,0.7)]"
                  title="Chamber Portal Active"
                />
              </div>

              {/* Hover Tooltip when Collapsed */}
              <div className="absolute left-full ml-3 px-3 py-2 bg-card/95 dark:bg-midnight-950/95 backdrop-blur-2xl text-card-foreground text-xs rounded-xl shadow-2xl border border-rose-500/30 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 whitespace-nowrap z-50 flex items-center gap-2">
                <LogOut className="w-3.5 h-3.5 text-rose-500" />
                <span className="font-semibold text-rose-500">Sign Out</span>
              </div>
            </button>
          ) : (
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Avatar with Double Gold Halo Rim */}
              <div className="relative shrink-0 p-0.5 rounded-full bg-gradient-to-tr from-gold-600 via-gold-400 to-amber-200 shadow-sm">
                <div className="relative w-9 h-9 rounded-full bg-midnight-950 flex items-center justify-center overflow-hidden">
                  <Image
                    src={avatarSrc}
                    alt={displayName}
                    width={36}
                    height={36}
                    className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
                    onError={(e) => {
                      const target = e.currentTarget as HTMLElement;
                      target.style.display = "none";
                    }}
                  />
                  <span className="text-[11px] font-bold text-gold-400 select-none">
                    OC
                  </span>
                </div>

                {/* Glowing Live Presence Dot */}
                <span
                  className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-background shadow-[0_0_8px_rgba(16,185,129,0.7)]"
                  title="Chamber Portal Active"
                />
              </div>

              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-foreground truncate flex items-center gap-1.5">
                  <span className="truncate">{displayName}</span>
                  <span
                    title="Verified Advocate • Judge's Court, Sylhet"
                    className="inline-flex shrink-0"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-gold-500 drop-shadow-[0_1px_2px_rgba(216,184,112,0.3)]" />
                  </span>
                </span>
                <span className="text-[10px] text-muted-foreground truncate font-sans">
                  {displayEmail}
                </span>
              </div>
            </div>
          )}

          {/* Quick Sign Out Action Button */}
          {!isCollapsed && (
            <button
              type="button"
              onClick={() => setIsSignOutDialogOpen(true)}
              disabled={isSigningOut}
              className="p-1.5 rounded-xl text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30 hover:shadow-[0_0_12px_rgba(244,63,94,0.25)] transition-all duration-200 disabled:opacity-50 shrink-0 cursor-pointer"
              title="Sign out of chamber portal"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Confirmation Alert Dialog */}
      <SignOutAlertDialog
        open={isSignOutDialogOpen}
        onOpenChange={setIsSignOutDialogOpen}
        onConfirmSignOut={handleSignOut}
        isSigningOut={isSigningOut}
        displayName={displayName}
        displayEmail={displayEmail}
        avatarSrc={avatarSrc}
      />
    </>
  );
}

export default SidebarUser;
