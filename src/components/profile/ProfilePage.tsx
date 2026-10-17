"use client";

import * as React from "react";
import { AlertCircle, RefreshCw, Sparkles } from "lucide-react";
import { useProfile } from "@/hooks/profile/queries/useProfile";
import { DashboardBreadcrumb } from "@/components/shared/DashboardBreadcrumb";
import { FadeIn, FadeInUp } from "@/components/wrappers/Motion";
import { Button } from "@/components/ui/button";
import { ProfileTab } from "@/types/profile.ui.type";
import { ProfileSkeleton } from "./ProfileSkeleton";
import { ProfileHeader } from "./ProfileHeader";
import { ProfileTabsNav } from "./ProfileTabsNav";
import { ProfileInfoView } from "./ProfileInfoView";
import { ProfileEditForm } from "./ProfileEditForm";
import { ProfileAvatarDialog } from "./ProfileAvatarDialog";

export function ProfilePage() {
  const { data: profileResponse, isLoading, isError, error, refetch, isRefetching } =
    useProfile();

  const [activeTab, setActiveTab] = React.useState<ProfileTab>("general");
  const [isEditing, setIsEditing] = React.useState(false);
  const [avatarDialogOpen, setAvatarDialogOpen] = React.useState(false);

  const user = profileResponse?.data;

  // Reset edit mode when changing tabs
  const handleTabChange = React.useCallback((newTab: ProfileTab) => {
    setActiveTab(newTab);
  }, []);

  const handleToggleEdit = React.useCallback(() => {
    setIsEditing((prev) => !prev);
  }, []);

  const handleOpenAvatarDialog = React.useCallback(() => {
    setAvatarDialogOpen(true);
  }, []);

  // ── Loading Skeleton ──────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <ProfileSkeleton />
      </div>
    );
  }

  // ── Error State ───────────────────────────────────────────────
  if (isError || !user) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <DashboardBreadcrumb variant="glass" />
        <div className="p-8 sm:p-12 rounded-3xl bg-card/60 backdrop-blur-xl border border-destructive/30 text-center space-y-4 max-w-xl mx-auto shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive mx-auto">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h2 className="font-serif text-2xl font-bold text-foreground">
              Unable to Load Advocate Profile
            </h2>
            <p className="text-xs text-muted-foreground">
              {error?.message ||
                "Failed to retrieve advocate records from database. Please check your network connection and session."}
            </p>
          </div>
          <div className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="rounded-xl gap-2 text-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Loading Profile</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main Profile View ─────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* 1. Breadcrumb with Glass container */}
      <FadeIn duration={0.3}>
        <DashboardBreadcrumb
          variant="glass"
          actions={
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
                <Sparkles className="w-3.5 h-3.5 text-gold-500" />
                <span>Bar Council Sanad Enrolled</span>
              </span>
            </div>
          }
        />
      </FadeIn>

      {/* 2. Hero Profile Header */}
      <FadeInUp duration={0.4} delay={0.05}>
        <ProfileHeader
          user={user}
          isEditing={isEditing}
          onToggleEdit={handleToggleEdit}
          onOpenAvatarDialog={handleOpenAvatarDialog}
          isRefetching={isRefetching}
        />
      </FadeInUp>

      {/* 3. Section Navigation Tabs */}
      <FadeInUp duration={0.4} delay={0.1}>
        <ProfileTabsNav
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />
      </FadeInUp>

      {/* 4. Tab Content: Form (if editing) or View (if viewing) */}
      <FadeInUp duration={0.45} delay={0.15}>
        {isEditing ? (
          <ProfileEditForm
            user={user}
            activeTab={activeTab}
            onCancel={() => setIsEditing(false)}
            onSaved={() => setIsEditing(false)}
          />
        ) : (
          <ProfileInfoView
            user={user}
            activeTab={activeTab}
            onEditClick={() => setIsEditing(true)}
            onOpenAvatarDialog={handleOpenAvatarDialog}
          />
        )}
      </FadeInUp>

      {/* 5. Avatar Management Dialog */}
      <ProfileAvatarDialog
        open={avatarDialogOpen}
        onOpenChange={setAvatarDialogOpen}
        user={user}
      />
    </div>
  );
}

export default ProfilePage;
