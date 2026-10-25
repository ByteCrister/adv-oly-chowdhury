"use client";

import * as React from "react";
import {
  Save,
  X,
  RefreshCw,
  Eye,
  EyeOff,
  AlertTriangle,
  ShieldCheck,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/shared/use-toast";
import {
  FadeIn,
  StaggerContainer,
  StaggerItem,
} from "@/components/wrappers/Motion";
import { useUpdateProfileMutation } from "@/hooks/profile/mutations/useUpdateProfileMutation";
import { PasswordChangeOtpDialog } from "./PasswordChangeOtpDialog";
import {
  ProfileApiResponse,
  ProfileUpdateDto,
  PasswordUpdateDto,
  ProfileTab,
} from "@/types/profile.ui.type";
import {
  DEFAULT_CHAMBER_ADDRESS,
  DEFAULT_HOME_ADDRESS,
} from "@/utils/zod/profile.validation";

export interface ProfileEditFormProps {
  user: ProfileApiResponse["data"];
  activeTab: ProfileTab;
  onCancel: () => void;
  onSaved: () => void;
}

export function ProfileEditForm({
  user,
  activeTab,
  onCancel,
  onSaved,
}: ProfileEditFormProps) {
  const { toast } = useToast();
  const updateProfileMutation = useUpdateProfileMutation();

  // Profile Form State initialized from user
  const [formData, setFormData] = React.useState<ProfileUpdateDto>({
    name: user.name || "",
    preferredName: user.preferredName || "",
    title: user.title || "",
    subtitle: user.subtitle || "",
    tagline: user.tagline || "",
    phone: user.phone || "",
    alternatePhone: user.alternatePhone || "",
    whatsappNumber: user.whatsappNumber || "",
    barCouncilId: user.barCouncilId || "",
    barAssociationMemberNo: user.barAssociationMemberNo || "",
    taxesBarMemberNo: user.taxesBarMemberNo || "",
    chamber: {
      room: user.chamber?.room || DEFAULT_CHAMBER_ADDRESS.room,
      barHall: user.chamber?.barHall || DEFAULT_CHAMBER_ADDRESS.barHall,
      court: user.chamber?.court || DEFAULT_CHAMBER_ADDRESS.court,
      city: user.chamber?.city || DEFAULT_CHAMBER_ADDRESS.city,
      district: user.chamber?.district || DEFAULT_CHAMBER_ADDRESS.district,
      fullAddress: user.chamber?.fullAddress || DEFAULT_CHAMBER_ADDRESS.fullAddress,
      consultationHours:
        user.chamber?.consultationHours ||
        DEFAULT_CHAMBER_ADDRESS.consultationHours,
    },
    homeAddress: {
      presentAddress: user.homeAddress?.presentAddress || "",
      permanentAddress: user.homeAddress?.permanentAddress || "",
      city: user.homeAddress?.city || DEFAULT_HOME_ADDRESS.city,
      postalCode: user.homeAddress?.postalCode || "",
    },
    profileAssetReferenceId: user.avatar?.assetReferenceId || undefined,
  });

  // Password Update Form State
  const [passwordData, setPasswordData] = React.useState<PasswordUpdateDto>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showCurrentPassword, setShowCurrentPassword] = React.useState(false);
  const [showNewPassword, setShowNewPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  // Password OTP Verification States
  const [isRequestingOtp, setIsRequestingOtp] = React.useState(false);
  const [otpDialogOpen, setOtpDialogOpen] = React.useState(false);
  const [otpRequestId, setOtpRequestId] = React.useState("");
  const [userEmail, setUserEmail] = React.useState(user.email || "");

  // Form error states
  const [formError, setFormError] = React.useState<string | null>(null);
  const [passwordError, setPasswordError] = React.useState<string | null>(null);

  // General field handlers
  const handleTextChange = React.useCallback(
    (field: keyof ProfileUpdateDto, value: string) => {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));
    },
    []
  );

  const handleChamberChange = React.useCallback(
    (field: keyof ProfileUpdateDto["chamber"], value: string) => {
      setFormData((prev) => ({
        ...prev,
        chamber: {
          ...prev.chamber,
          [field]: value,
        },
      }));
    },
    []
  );

  const handleAddressChange = React.useCallback(
    (field: keyof NonNullable<ProfileUpdateDto["homeAddress"]>, value: string) => {
      setFormData((prev) => ({
        ...prev,
        homeAddress: {
          ...prev.homeAddress,
          [field]: value,
        },
      }));
    },
    []
  );

  // Save full profile
  const handleSaveProfile = React.useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setFormError(null);

      if (!formData.name || formData.name.trim().length < 2) {
        setFormError("Legal Name must be at least 2 characters long.");
        return;
      }

      try {
        const payload: ProfileUpdateDto = {
          ...formData,
          name: formData.name.trim(),
          preferredName: formData.preferredName?.trim() || "Advocate Oly Chowdhury",
          title: formData.title?.trim() || "Advocate",
          subtitle: formData.subtitle?.trim() || "Advocate • Judge's Court, Sylhet",
          tagline: formData.tagline?.trim() || null,
          phone: formData.phone?.trim() || "01712-459840",
          alternatePhone: formData.alternatePhone?.trim() || null,
          whatsappNumber: formData.whatsappNumber?.trim() || "+8801712459840",
          barCouncilId: formData.barCouncilId?.trim() || null,
          barAssociationMemberNo: formData.barAssociationMemberNo?.trim() || null,
          taxesBarMemberNo: formData.taxesBarMemberNo?.trim() || null,
          chamber: {
            room: formData.chamber.room?.trim() || DEFAULT_CHAMBER_ADDRESS.room,
            barHall: formData.chamber.barHall?.trim() || DEFAULT_CHAMBER_ADDRESS.barHall,
            court: formData.chamber.court?.trim() || DEFAULT_CHAMBER_ADDRESS.court,
            city: formData.chamber.city?.trim() || DEFAULT_CHAMBER_ADDRESS.city,
            district: formData.chamber.district?.trim() || DEFAULT_CHAMBER_ADDRESS.district,
            fullAddress: formData.chamber.fullAddress?.trim() || DEFAULT_CHAMBER_ADDRESS.fullAddress,
            consultationHours:
              formData.chamber.consultationHours?.trim() ||
              DEFAULT_CHAMBER_ADDRESS.consultationHours,
          },
          homeAddress: {
            presentAddress: formData.homeAddress?.presentAddress?.trim() || null,
            permanentAddress: formData.homeAddress?.permanentAddress?.trim() || null,
            city: formData.homeAddress?.city?.trim() || DEFAULT_HOME_ADDRESS.city,
            postalCode: formData.homeAddress?.postalCode?.trim() || null,
          },
        };

        await updateProfileMutation.mutateAsync(payload);

        toast({
          title: "Profile Updated",
          description: "Advocate profile changes have been successfully saved.",
          variant: "gold",
        });

        onSaved();
      } catch (err: unknown) {
        const msg =
          err instanceof Error
            ? err.message
            : "Failed to update profile information.";
        setFormError(msg);
        toast({
          title: "Update Failed",
          description: msg,
          variant: "destructive",
        });
      }
    },
    [formData, onSaved, toast, updateProfileMutation]
  );

  // Save password update via OTP verification flow
  const handleSavePassword = React.useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setPasswordError(null);

      if (!passwordData.currentPassword) {
        setPasswordError("Current password is required.");
        return;
      }
      if (passwordData.newPassword.length < 8) {
        setPasswordError("New password must be at least 8 characters.");
        return;
      }
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        setPasswordError("New passwords do not match.");
        return;
      }
      if (passwordData.currentPassword === passwordData.newPassword) {
        setPasswordError("New password must be different from your current password.");
        return;
      }

      setIsRequestingOtp(true);

      try {
        const response = await axios.post(
          "/api/v1/users/me/password/request-otp",
          {
            currentPassword: passwordData.currentPassword,
          }
        );

        const data = response.data?.data;
        setOtpRequestId(data?.requestId || "");
        if (data?.email) {
          setUserEmail(data.email);
        }

        setOtpDialogOpen(true);

        toast({
          title: "Verification Code Dispatched",
          description:
            "A 6-digit one-time code was sent to your chamber email. Please verify to update your password.",
          variant: "gold",
        });
      } catch (err: unknown) {
        let msg =
          "Failed to initiate password change. Please verify your current password.";
        if (axios.isAxiosError(err)) {
          msg = err.response?.data?.message || err.message || msg;
        } else if (err instanceof Error) {
          msg = err.message;
        }
        setPasswordError(msg);
        toast({
          title: "Verification Request Failed",
          description: msg,
          variant: "destructive",
        });
      } finally {
        setIsRequestingOtp(false);
      }
    },
    [passwordData, toast]
  );

  const handlePasswordSuccess = React.useCallback(() => {
    setPasswordData({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setPasswordError(null);
    onSaved();
  }, [onSaved]);

  const isSaving = updateProfileMutation.isPending || isRequestingOtp;

  return (
    <div className="p-6 sm:p-8 rounded-2xl bg-card/85 dark:bg-card/50 backdrop-blur-2xl border border-border/80 dark:border-white/10 shadow-xl space-y-8">
      {/* Top Header & Discard Warning */}
      <FadeIn duration={0.3} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="gold" className="text-[10px] uppercase font-semibold">
              Edit Mode
            </Badge>
            <span className="text-xs text-muted-foreground">
              Editing: {activeTab.toUpperCase()} Section
            </span>
          </div>
          <h2 className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-foreground pt-1">
            Modify Profile Information
          </h2>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={isSaving}
            className="rounded-xl text-xs"
          >
            <X className="w-3.5 h-3.5 mr-1" />
            <span>Cancel</span>
          </Button>

          {activeTab !== "security" && (
            <Button
              type="button"
              variant="gold"
              size="sm"
              onClick={handleSaveProfile}
              disabled={isSaving}
              className="rounded-xl text-xs font-semibold gap-1.5 shadow-sm"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </>
              )}
            </Button>
          )}
        </div>
      </FadeIn>

      {/* Error alert banner */}
      {formError && (
        <FadeIn duration={0.2} className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 flex items-start gap-3 text-destructive">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="text-xs space-y-0.5">
            <p className="font-semibold">Unable to Save Profile</p>
            <p className="opacity-90">{formError}</p>
          </div>
        </FadeIn>
      )}

      {/* ── Active Tab Form Fields ──────────────────────────── */}
      {activeTab === "general" && (
        <FadeIn duration={0.3} key="general">
          <form onSubmit={handleSaveProfile} className="space-y-6">
            <StaggerContainer
              delay={0.05}
              staggerDelay={0.03}
              viewport={{ once: true, margin: "0px" }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-5"
            >
              {/* Legal Name */}
              <StaggerItem yOffset={8}>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                    <span>Full Legal Name</span>
                    <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleTextChange("name", e.target.value)}
                    placeholder="Aminul Islam Chowdhury Oly"
                    required
                    disabled={isSaving}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    As registered with the Bangladesh Bar Council and court records.
                  </p>
                </div>
              </StaggerItem>

              {/* Preferred Name */}
              <StaggerItem yOffset={8}>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Preferred Honorific / Display Name
                  </label>
                  <Input
                    type="text"
                    value={formData.preferredName || ""}
                    onChange={(e) => handleTextChange("preferredName", e.target.value)}
                    placeholder="Advocate Oly Chowdhury"
                    disabled={isSaving}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Commonly known title displayed in headers and client communications.
                  </p>
                </div>
              </StaggerItem>

              {/* Title */}
              <StaggerItem yOffset={8}>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Professional Title
                  </label>
                  <Input
                    type="text"
                    value={formData.title || ""}
                    onChange={(e) => handleTextChange("title", e.target.value)}
                    placeholder="Advocate"
                    disabled={isSaving}
                  />
                </div>
              </StaggerItem>

              {/* Subtitle */}
              <StaggerItem yOffset={8}>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Jurisdiction Subtitle
                  </label>
                  <Input
                    type="text"
                    value={formData.subtitle || ""}
                    onChange={(e) => handleTextChange("subtitle", e.target.value)}
                    placeholder="Advocate • Judge's Court, Sylhet"
                    disabled={isSaving}
                  />
                </div>
              </StaggerItem>

              {/* Tagline */}
              <StaggerItem yOffset={8} className="sm:col-span-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Chamber Tagline / Philosophy
                  </label>
                  <Input
                    type="text"
                    value={formData.tagline || ""}
                    onChange={(e) => handleTextChange("tagline", e.target.value)}
                    placeholder="Dedicated Legal Advocacy with Integrity & Precision"
                    disabled={isSaving}
                  />
                </div>
              </StaggerItem>

              {/* Phone */}
              <StaggerItem yOffset={8}>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Primary Phone Number
                  </label>
                  <Input
                    type="text"
                    value={formData.phone || ""}
                    onChange={(e) => handleTextChange("phone", e.target.value)}
                    placeholder="01712-459840"
                    disabled={isSaving}
                  />
                </div>
              </StaggerItem>

              {/* Alternate Phone */}
              <StaggerItem yOffset={8}>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Alternate Mobile Number
                  </label>
                  <Input
                    type="text"
                    value={formData.alternatePhone || ""}
                    onChange={(e) => handleTextChange("alternatePhone", e.target.value)}
                    placeholder="01812-XXXXXX (Optional)"
                    disabled={isSaving}
                  />
                </div>
              </StaggerItem>

              {/* WhatsApp */}
              <StaggerItem yOffset={8} className="sm:col-span-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    WhatsApp Direct Number
                  </label>
                  <Input
                    type="text"
                    value={formData.whatsappNumber || ""}
                    onChange={(e) => handleTextChange("whatsappNumber", e.target.value)}
                    placeholder="+8801712459840"
                    disabled={isSaving}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Include country code for direct WhatsApp click-to-chat links.
                  </p>
                </div>
              </StaggerItem>
            </StaggerContainer>
          </form>
        </FadeIn>
      )}

      {/* ── Tab 2: Credentials (Bar Registrations) ────────────── */}
      {activeTab === "credentials" && (
        <FadeIn duration={0.3} key="credentials">
          <form onSubmit={handleSaveProfile} className="space-y-6">
            <StaggerContainer
              delay={0.05}
              staggerDelay={0.04}
              viewport={{ once: true, margin: "0px" }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-5"
            >
              {/* Bar Council ID */}
              <StaggerItem yOffset={8}>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Bangladesh Bar Council Sanad / ID
                  </label>
                  <Input
                    type="text"
                    value={formData.barCouncilId || ""}
                    onChange={(e) => handleTextChange("barCouncilId", e.target.value)}
                    placeholder="e.g. 10423/2012"
                    disabled={isSaving}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Official Sanad enrollment certificate identifier.
                  </p>
                </div>
              </StaggerItem>

              {/* Sylhet District Bar Association No */}
              <StaggerItem yOffset={8}>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Sylhet District Bar Association Member No
                  </label>
                  <Input
                    type="text"
                    value={formData.barAssociationMemberNo || ""}
                    onChange={(e) =>
                      handleTextChange("barAssociationMemberNo", e.target.value)
                    }
                    placeholder="e.g. SYL-452"
                    disabled={isSaving}
                  />
                </div>
              </StaggerItem>

              {/* Taxes Bar Association No */}
              <StaggerItem yOffset={8} className="sm:col-span-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Sylhet Taxes Bar Association Member No
                  </label>
                  <Input
                    type="text"
                    value={formData.taxesBarMemberNo || ""}
                    onChange={(e) => handleTextChange("taxesBarMemberNo", e.target.value)}
                    placeholder="e.g. TAX-188"
                    disabled={isSaving}
                  />
                </div>
              </StaggerItem>
            </StaggerContainer>
          </form>
        </FadeIn>
      )}

      {/* ── Tab 3: Chamber (Chamber & Court) ────────────────── */}
      {activeTab === "chamber" && (
        <FadeIn duration={0.3} key="chamber">
          <form onSubmit={handleSaveProfile} className="space-y-6">
            <StaggerContainer
              delay={0.05}
              staggerDelay={0.03}
              viewport={{ once: true, margin: "0px" }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-5"
            >
              {/* Room */}
              <StaggerItem yOffset={8}>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Chamber Room & Floor
                  </label>
                  <Input
                    type="text"
                    value={formData.chamber.room || ""}
                    onChange={(e) => handleChamberChange("room", e.target.value)}
                    placeholder="Chamber No. 323 (3rd Floor)"
                    disabled={isSaving}
                  />
                </div>
              </StaggerItem>

              {/* Bar Hall */}
              <StaggerItem yOffset={8}>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Bar Hall Assignment
                  </label>
                  <Input
                    type="text"
                    value={formData.chamber.barHall || ""}
                    onChange={(e) => handleChamberChange("barHall", e.target.value)}
                    placeholder="Bar Hall No: 02"
                    disabled={isSaving}
                  />
                </div>
              </StaggerItem>

              {/* Court */}
              <StaggerItem yOffset={8}>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Court Title
                  </label>
                  <Input
                    type="text"
                    value={formData.chamber.court || ""}
                    onChange={(e) => handleChamberChange("court", e.target.value)}
                    placeholder="Judge's Court"
                    disabled={isSaving}
                  />
                </div>
              </StaggerItem>

              {/* City & District */}
              <StaggerItem yOffset={8}>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">City</label>
                    <Input
                      type="text"
                      value={formData.chamber.city || ""}
                      onChange={(e) => handleChamberChange("city", e.target.value)}
                      placeholder="Sylhet"
                      disabled={isSaving}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">District</label>
                    <Input
                      type="text"
                      value={formData.chamber.district || ""}
                      onChange={(e) => handleChamberChange("district", e.target.value)}
                      placeholder="Sylhet"
                      disabled={isSaving}
                    />
                  </div>
                </div>
              </StaggerItem>

              {/* Full Address */}
              <StaggerItem yOffset={8} className="sm:col-span-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Full Physical Chamber Address
                  </label>
                  <Input
                    type="text"
                    value={formData.chamber.fullAddress || ""}
                    onChange={(e) => handleChamberChange("fullAddress", e.target.value)}
                    placeholder="Chamber No. 323 (3rd Floor), Bar Hall No: 02, Judge's Court, Sylhet, Bangladesh"
                    disabled={isSaving}
                  />
                </div>
              </StaggerItem>

              {/* Consultation Hours */}
              <StaggerItem yOffset={8} className="sm:col-span-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Client Consultation Hours
                  </label>
                  <Input
                    type="text"
                    value={formData.chamber.consultationHours || ""}
                    onChange={(e) =>
                      handleChamberChange("consultationHours", e.target.value)
                    }
                    placeholder="Saturday – Thursday (Court & Chamber Hours)"
                    disabled={isSaving}
                  />
                </div>
              </StaggerItem>
            </StaggerContainer>
          </form>
        </FadeIn>
      )}

      {/* ── Tab 4: Address (Residential Address) ─────────────── */}
      {activeTab === "address" && (
        <FadeIn duration={0.3} key="address">
          <form onSubmit={handleSaveProfile} className="space-y-6">
            <StaggerContainer
              delay={0.05}
              staggerDelay={0.04}
              viewport={{ once: true, margin: "0px" }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-5"
            >
              {/* Present Address */}
              <StaggerItem yOffset={8} className="sm:col-span-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Present Residence Address
                  </label>
                  <Input
                    type="text"
                    value={formData.homeAddress?.presentAddress || ""}
                    onChange={(e) => handleAddressChange("presentAddress", e.target.value)}
                    placeholder="Present address in Sylhet"
                    disabled={isSaving}
                  />
                </div>
              </StaggerItem>

              {/* Permanent Address */}
              <StaggerItem yOffset={8} className="sm:col-span-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Permanent Residence Address
                  </label>
                  <Input
                    type="text"
                    value={formData.homeAddress?.permanentAddress || ""}
                    onChange={(e) =>
                      handleAddressChange("permanentAddress", e.target.value)
                    }
                    placeholder="Permanent residence address"
                    disabled={isSaving}
                  />
                </div>
              </StaggerItem>

              {/* City */}
              <StaggerItem yOffset={8}>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">City</label>
                  <Input
                    type="text"
                    value={formData.homeAddress?.city || ""}
                    onChange={(e) => handleAddressChange("city", e.target.value)}
                    placeholder="Sylhet"
                    disabled={isSaving}
                  />
                </div>
              </StaggerItem>

              {/* Postal Code */}
              <StaggerItem yOffset={8}>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Postal Code</label>
                  <Input
                    type="text"
                    value={formData.homeAddress?.postalCode || ""}
                    onChange={(e) => handleAddressChange("postalCode", e.target.value)}
                    placeholder="3100"
                    disabled={isSaving}
                  />
                </div>
              </StaggerItem>
            </StaggerContainer>
          </form>
        </FadeIn>
      )}

      {/* ── Tab 5: Security (Security & Access - Change Password) ── */}
      {activeTab === "security" && (
        <FadeIn duration={0.3} key="security">
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-gold-500/10 border border-gold-500/25 flex items-start gap-3">
              <ShieldCheck className="w-4 h-4 text-gold-500 mt-0.5 shrink-0" />
              <div className="text-xs space-y-1">
                <p className="font-semibold text-foreground">Update Chamber Admin Password</p>
                <p className="text-muted-foreground">
                  Protect your chamber records. Changing your password requires your current password and authorization via a secure 6-digit one-time code sent to your registered chamber email.
                </p>
              </div>
            </div>

            {passwordError && (
              <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/30 flex items-start gap-2.5 text-destructive animate-in fade-in duration-200">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="text-xs font-medium">{passwordError}</p>
              </div>
            )}

            <form onSubmit={handleSavePassword} className="space-y-5 max-w-lg">
              <StaggerContainer
                delay={0.05}
                staggerDelay={0.04}
                viewport={{ once: true, margin: "0px" }}
                className="space-y-5"
              >
                {/* Current Password */}
                <StaggerItem yOffset={8}>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Current Account Password
                    </label>
                    <div className="relative">
                      <Input
                        type={showCurrentPassword ? "text" : "password"}
                        value={passwordData.currentPassword}
                        onChange={(e) =>
                          setPasswordData((prev) => ({
                            ...prev,
                            currentPassword: e.target.value,
                          }))
                        }
                        placeholder="Enter current password"
                        required
                        disabled={isSaving}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        {showCurrentPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </StaggerItem>

                {/* New Password */}
                <StaggerItem yOffset={8}>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      New Password (minimum 8 characters)
                    </label>
                    <div className="relative">
                      <Input
                        type={showNewPassword ? "text" : "password"}
                        value={passwordData.newPassword}
                        onChange={(e) =>
                          setPasswordData((prev) => ({
                            ...prev,
                            newPassword: e.target.value,
                          }))
                        }
                        placeholder="Enter strong new password"
                        required
                        minLength={8}
                        disabled={isSaving}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        {showNewPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </StaggerItem>

                {/* Confirm Password */}
                <StaggerItem yOffset={8}>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        value={passwordData.confirmPassword}
                        onChange={(e) =>
                          setPasswordData((prev) => ({
                            ...prev,
                            confirmPassword: e.target.value,
                          }))
                        }
                        placeholder="Re-enter new password"
                        required
                        minLength={8}
                        disabled={isSaving}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </StaggerItem>

                <StaggerItem yOffset={8}>
                  <div className="pt-2">
                    <Button
                      type="submit"
                      variant="gold"
                      disabled={isSaving}
                      className="w-full text-xs font-semibold gap-1.5 shadow-sm"
                    >
                      {isRequestingOtp ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Dispatching Verification Code...</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Verify with OTP &amp; Update Password</span>
                        </>
                      )}
                    </Button>
                  </div>
                </StaggerItem>
              </StaggerContainer>
            </form>
          </div>
        </FadeIn>
      )}

      {/* Bottom Action Footer for non-security tabs */}
      {activeTab !== "security" && (
        <div className="pt-5 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Changes will update all public and internal chamber references immediately.
          </p>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCancel}
              disabled={isSaving}
              className="w-full sm:w-auto text-xs"
            >
              Cancel
            </Button>

            <Button
              type="button"
              variant="gold"
              size="sm"
              onClick={handleSaveProfile}
              disabled={isSaving}
              className="w-full sm:w-auto text-xs font-semibold gap-1.5 shadow-sm"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Profile</span>
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* ── Password Change OTP Verification Dialog ── */}
      <PasswordChangeOtpDialog
        open={otpDialogOpen}
        onOpenChange={setOtpDialogOpen}
        email={userEmail}
        requestId={otpRequestId}
        currentPassword={passwordData.currentPassword}
        newPassword={passwordData.newPassword}
        confirmPassword={passwordData.confirmPassword}
        onSuccess={handlePasswordSuccess}
      />
    </div>
  );
}

export default ProfileEditForm;
