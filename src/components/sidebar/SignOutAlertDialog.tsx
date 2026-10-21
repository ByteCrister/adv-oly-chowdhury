"use client";

import * as React from "react";
import Image from "next/image";
import { LogOut, ShieldAlert, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

export interface SignOutAlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmSignOut: () => void;
  isSigningOut?: boolean;
  displayName?: string;
  displayEmail?: string;
  avatarSrc?: string;
}

export function SignOutAlertDialog({
  open,
  onOpenChange,
  onConfirmSignOut,
  isSigningOut = false,
  displayName = "Advocate Oly Chowdhury",
  displayEmail = "advocateaico@gmail.com",
  avatarSrc = "/images/profile/img-1.png",
}: SignOutAlertDialogProps) {
  const [failedAvatarSrc, setFailedAvatarSrc] = React.useState<string | null>(null);
  const imageError = Boolean(avatarSrc && failedAvatarSrc === avatarSrc);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-[460px] p-6 overflow-hidden border border-border/80 dark:border-white/15 bg-white/95 dark:bg-[#080E1C]/95 shadow-2xl rounded-2xl">
        {/* Specular Top Ambient Hairline */}
        <div
          className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-gold-400/50 to-transparent pointer-events-none"
          aria-hidden="true"
        />

        <AlertDialogHeader className="space-y-3">
          {/* Header Icon & Shield Badge */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500/15 via-rose-500/10 to-transparent border border-rose-500/30 text-rose-600 dark:text-rose-400 shadow-sm shrink-0">
              <LogOut className="w-5 h-5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.15)]" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-60" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500 border border-background" />
              </span>
            </div>

            <div className="flex flex-col text-left">
              <AlertDialogTitle className="text-base sm:text-lg font-serif font-bold text-foreground tracking-tight">
                Sign Out of Chamber Portal
              </AlertDialogTitle>
              <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-gold-500 shrink-0" />
                Sylhet District Judiciary & Chamber Management
              </span>
            </div>
          </div>

          <AlertDialogDescription className="text-xs sm:text-[13px] text-muted-foreground leading-relaxed pt-1">
            Are you sure you want to end your active session? You will be signed out of the chamber portal and redirected to the login gateway.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* User Identity Preview Card */}
        <div className="sidebar-user-glass p-3 rounded-xl flex items-center gap-3 my-1">
          <div className="relative shrink-0 p-0.5 rounded-full bg-gradient-to-tr from-gold-600 via-gold-400 to-amber-200">
            <div className="relative w-8 h-8 rounded-full bg-midnight-950 overflow-hidden flex items-center justify-center">
              {!imageError && avatarSrc ? (
                <Image
                  src={avatarSrc}
                  alt={displayName}
                  fill
                  sizes="32px"
                  className="object-cover object-center"
                  onError={() => setFailedAvatarSrc(avatarSrc)}
                />
              ) : (
                <span className="text-[10px] font-bold text-gold-400">OC</span>
              )}
            </div>
          </div>

          <div className="flex flex-col min-w-0 text-left">
            <span className="text-xs font-semibold text-foreground truncate">
              {displayName}
            </span>
            <span className="text-[11px] text-muted-foreground truncate font-sans">
              {displayEmail}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <AlertDialogFooter className="gap-2 sm:gap-2">
          <AlertDialogCancel
            disabled={isSigningOut}
            className="h-9 px-4 rounded-xl text-xs font-medium border border-border/80 dark:border-white/10 hover:bg-muted/70 transition-all"
          >
            Stay Signed In
          </AlertDialogCancel>

          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirmSignOut();
            }}
            disabled={isSigningOut}
            className="h-9 px-4 rounded-xl text-xs font-semibold bg-gradient-to-r from-rose-600 via-rose-500 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white shadow-md shadow-rose-500/25 active:scale-[0.98] border border-rose-400/40 transition-all flex items-center gap-1.5"
          >
            {isSigningOut ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Signing out...</span>
              </>
            ) : (
              <>
                <LogOut className="w-3.5 h-3.5" />
                <span>Confirm Sign Out</span>
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default SignOutAlertDialog;
