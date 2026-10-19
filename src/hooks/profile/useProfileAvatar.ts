"use client";

import { useState, useCallback, useEffect } from "react";
import axios from "axios";
import { useQueryClient } from "@tanstack/react-query";
import { useMediaUpload, computeFileHash } from "@/hooks/media/useMediaUpload";
import { usePrepareUploadMutation } from "@/hooks/media/mutations/usePrepareUploadMutation";
import { useUpdateProfileMutation } from "./mutations/useUpdateProfileMutation";
import { profileKeys } from "./queries/useProfile";
import { DASHBOARD_QUERY_KEYS } from "@/const/dashboard.const";
import { AUDIT_QUERY_KEYS } from "@/const/audit-log.const";
import { ProfileApiResponse, ProfileUpdateDto } from "@/types/profile.ui.type";
import {
  compressImage,
  CompressionResult,
} from "@/utils/image-compression";
import { ASSET_TYPES } from "@/const/asset.const";
import { ASSET_OWNER_TYPES, ASSET_PURPOSES } from "@/const/asset-reference.const";

export const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB limit
export const ALLOWED_AVATAR_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
] as const;

export type AvatarUploadStage =
  | "idle"
  | "validating"
  | "checking"
  | "compressing"
  | "uploading"
  | "saving"
  | "complete"
  | "error";

export interface UseProfileAvatarOptions {
  user?: ProfileApiResponse["data"] | null;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function useProfileAvatar({
  user,
  onSuccess,
  onError,
}: UseProfileAvatarOptions = {}) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [compressionStats, setCompressionStats] =
    useState<CompressionResult | null>(null);
  const [stage, setStage] = useState<AvatarUploadStage>("idle");
  const [stageMessage, setStageMessage] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const prepareMutation = usePrepareUploadMutation();
  const { uploadFiles, overallProgress } = useMediaUpload();
  const updateProfileMutation = useUpdateProfileMutation();

  // Clean up object URLs when previewUrl changes or component unmounts
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  /**
   * Validate candidate avatar file format and size constraint (<= 2MB)
   */
  const validateAvatarFile = useCallback((file: File): void => {
    if (!file) {
      throw new Error("No file selected.");
    }

    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      throw new Error(
        `Selected image (${sizeMb} MB) exceeds the maximum allowed limit of 2 MB. Please select a smaller photo.`
      );
    }

    const mime = file.type.toLowerCase();
    const isAllowed = ALLOWED_AVATAR_MIME_TYPES.some((allowed) => allowed === mime);
    if (!isAllowed && file.type) {
      throw new Error(
        `File format "${file.type}" is not supported. Please upload a JPEG, PNG, or WebP headshot.`
      );
    }
  }, []);

  /**
   * Select a candidate file from input or dropzone, validate it, and generate an immediate preview.
   */
  const selectAvatarFile = useCallback(
    (file: File) => {
      try {
        setError(null);
        validateAvatarFile(file);

        if (previewUrl && previewUrl.startsWith("blob:")) {
          URL.revokeObjectURL(previewUrl);
        }

        const objectUrl = URL.createObjectURL(file);
        setSelectedFile(file);
        setPreviewUrl(objectUrl);
        setCompressionStats(null);
        setStage("idle");
        setStageMessage("");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to select image";
        setError(msg);
        setSelectedFile(null);
        if (previewUrl && previewUrl.startsWith("blob:")) {
          URL.revokeObjectURL(previewUrl);
        }
        setPreviewUrl(null);
      }
    },
    [previewUrl, validateAvatarFile]
  );

  /**
   * Clear pending selection and preview
   */
  const clearSelection = useCallback(() => {
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setCompressionStats(null);
    setError(null);
    setStage("idle");
    setStageMessage("");
  }, [previewUrl]);

  /**
   * Helper to build safe full profile update payload from existing user record
   */
  const buildProfilePayload = useCallback(
    (newAssetReferenceId: string | null): ProfileUpdateDto => {
      if (!user) {
        throw new Error("User profile data not loaded yet.");
      }

      return {
        name: user.name || "Advocate Oly Chowdhury",
        preferredName: user.preferredName || "Advocate Oly Chowdhury",
        title: user.title || "Advocate",
        subtitle: user.subtitle || "Advocate • Judge's Court, Sylhet",
        tagline: user.tagline || null,
        phone: user.phone || "01712-459840",
        alternatePhone: user.alternatePhone || null,
        whatsappNumber: user.whatsappNumber || "+8801712459840",
        barCouncilId: user.barCouncilId || null,
        barAssociationMemberNo: user.barAssociationMemberNo || null,
        taxesBarMemberNo: user.taxesBarMemberNo || null,
        chamber: {
          room: user.chamber?.room || "Chamber No. 323 (3rd Floor)",
          barHall: user.chamber?.barHall || "Bar Hall No: 02",
          court: user.chamber?.court || "Judge's Court",
          city: user.chamber?.city || "Sylhet",
          district: user.chamber?.district || "Sylhet",
          fullAddress:
            user.chamber?.fullAddress ||
            "Chamber No. 323 (3rd Floor), Bar Hall No: 02, Judge's Court, Sylhet, Bangladesh",
          consultationHours:
            user.chamber?.consultationHours ||
            "Saturday – Thursday (Court & Chamber Hours)",
        },
        homeAddress: {
          presentAddress: user.homeAddress?.presentAddress || null,
          permanentAddress: user.homeAddress?.permanentAddress || null,
          city: user.homeAddress?.city || "Sylhet",
          postalCode: user.homeAddress?.postalCode || null,
        },
        profileAssetReferenceId: newAssetReferenceId,
      };
    },
    [user]
  );

  /**
   * Execute the end-to-end avatar processing & upload workflow:
   * 1. Validate
   * 2. Hash & check deduplication via /api/v1/media/prepare
   * 3. Compress if new asset needed
   * 4. Upload to Cloudinary & finalize asset reference
   * 5. Update user profile record
   */
  const saveAvatar = useCallback(async () => {
    if (!selectedFile) {
      setError("Please select an image file first.");
      return;
    }

    setError(null);

    try {
      // Step 1: Validate
      setStage("validating");
      setStageMessage("Validating image format and size...");
      validateAvatarFile(selectedFile);

      const userId = user?._id ? String(user._id) : undefined;

      // Step 2: Compute SHA-256 hash & check deduplication
      setStage("checking");
      setStageMessage("Calculating cryptographic hash and verifying asset reuse...");
      const fileHash = await computeFileHash(selectedFile);

      const prepareBatchId = `avatar_prep_${Date.now()}`;
      const prepareResponse = await prepareMutation.mutateAsync({
        items: [
          {
            id: prepareBatchId,
            fileHash,
            assetType: ASSET_TYPES.IMAGE,
            originalFileName: selectedFile.name,
            mimeType: selectedFile.type || "image/jpeg",
            sizeBytes: selectedFile.size,
            ownerType: ASSET_OWNER_TYPES.USER,
            ownerId: userId,
            purpose: ASSET_PURPOSES.PROFILE_IMAGE,
            caption: "Advocate Profile Headshot",
          },
        ],
      });

      const prepResult = prepareResponse.results[0];
      let finalAssetReferenceId: string;

      if (prepResult && prepResult.status === "EXISTS") {
        // Zero-byte Deduplication hit: Instant asset reference obtained!
        setStageMessage("Asset already indexed! Reusing existing reference without upload...");
        finalAssetReferenceId = prepResult.fileId;
      } else {
        // Step 3: Compress image to optimize quality and upload size
        setStage("compressing");
        setStageMessage("Optimizing image resolution and compressing headshot...");
        const compResult = await compressImage(selectedFile, {
          maxWidth: 1024,
          maxHeight: 1024,
          quality: 0.85,
        });
        setCompressionStats(compResult);

        // Step 4: Upload to Cloudinary via established media workflow
        setStage("uploading");
        setStageMessage("Uploading to Cloudinary CDN...");
        const [uploadResult] = await uploadFiles([compResult.file], {
          ownerType: ASSET_OWNER_TYPES.USER,
          ownerId: userId,
          purpose: ASSET_PURPOSES.PROFILE_IMAGE,
          caption: "Advocate Profile Headshot",
        });

        if (!uploadResult?.fileId) {
          throw new Error("Failed to obtain a valid asset reference for the uploaded avatar.");
        }

        finalAssetReferenceId = uploadResult.fileId;
      }

      // Step 5: Update user profile with the asset reference ID
      setStage("saving");
      setStageMessage("Linking new avatar to advocate profile...");
      const payload = buildProfilePayload(finalAssetReferenceId);
      await updateProfileMutation.mutateAsync(payload);

      // Refresh profile, dashboard, and audit history cache everywhere
      await queryClient.invalidateQueries({ queryKey: profileKeys.all });
      await queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEYS.all });
      await queryClient.invalidateQueries({ queryKey: AUDIT_QUERY_KEYS.all });

      setStage("complete");
      setStageMessage("Profile avatar updated successfully!");
      clearSelection();
      onSuccess?.();
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "An unexpected error occurred during avatar update.";
      setError(msg);
      setStage("error");
      setStageMessage("");
      if (err instanceof Error) {
        onError?.(err);
      }
    }
  }, [
    buildProfilePayload,
    clearSelection,
    onError,
    onSuccess,
    prepareMutation,
    queryClient,
    selectedFile,
    updateProfileMutation,
    uploadFiles,
    user,
    validateAvatarFile,
  ]);

  /**
   * Remove existing profile avatar (sets profileAssetReferenceId to null)
   */
  const removeAvatar = useCallback(async () => {
    setError(null);
    try {
      setStage("saving");
      setStageMessage("Removing avatar and soft-deleting media reference...");

      // Call dedicated DELETE endpoint to unlink avatar and soft-delete the AssetReference
      await axios.delete("/api/v1/users/me/avatar");

      await queryClient.invalidateQueries({ queryKey: profileKeys.all });
      await queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEYS.all });
      await queryClient.invalidateQueries({ queryKey: AUDIT_QUERY_KEYS.all });
      clearSelection();
      setStage("complete");
      setStageMessage("Profile avatar removed.");
      onSuccess?.();
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to remove profile avatar.";
      setError(msg);
      setStage("error");
      setStageMessage("");
      if (err instanceof Error) {
        onError?.(err);
      }
    }
  }, [
    clearSelection,
    onError,
    onSuccess,
    queryClient,
  ]);

  const isProcessing =
    stage === "validating" ||
    stage === "checking" ||
    stage === "compressing" ||
    stage === "uploading" ||
    stage === "saving";

  return {
    selectedFile,
    previewUrl,
    compressionStats,
    stage,
    stageMessage,
    uploadProgress: overallProgress,
    error,
    isProcessing,
    selectAvatarFile,
    clearSelection,
    saveAvatar,
    removeAvatar,
  };
}

export default useProfileAvatar;
