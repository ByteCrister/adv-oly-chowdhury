"use client";

import { useState, useCallback } from "react";
import axios from "axios";
import {
  AssetType,
  UploadResult,
  FinalizeItemInput,
  PrepareItemInput,
} from "@/types/media.types";
import {
  ASSET_TYPES,
  MAX_MEDIA_SIZE_BYTES,
} from "@/const/asset.const";
import { AssetOwnerType, AssetPurpose } from "@/const/asset-reference.const";
import { useMediaStore } from "@/store/useMediaStore";
import { usePrepareUploadMutation } from "./mutations/usePrepareUploadMutation";
import { useFinalizeUploadMutation } from "./mutations/useFinalizeUploadMutation";

/**
 * Maps a MIME type to our standardized logical AssetType
 */
export function determineAssetType(mimeType: string): AssetType {
  if (mimeType.startsWith("image/")) return ASSET_TYPES.IMAGE;
  if (mimeType.startsWith("video/")) return ASSET_TYPES.VIDEO;
  if (mimeType === "application/pdf") return ASSET_TYPES.PDF;
  if (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "application/msword"
  ) {
    return ASSET_TYPES.DOCX;
  }
  return ASSET_TYPES.OTHER;
}

/**
 * Calculates a deterministic SHA-256 hex string using the browser's native Web Crypto API.
 * Avoids any heavy third-party hashing library.
 */
export async function computeFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export interface UploadFilesOptions {
  ownerType?: AssetOwnerType;
  ownerId?: string;
  purpose?: AssetPurpose;
  caption?: string;
  description?: string;
}

export function useMediaUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    queue,
    overallProgress,
    addFilesToQueue,
    updateItemProgress,
    setItemStatus,
    setItemCompleted,
    setItemError,
    removeQueueItem,
    clearQueue,
    setGlobalUploading,
  } = useMediaStore();

  const prepareMutation = usePrepareUploadMutation();
  const finalizeMutation = useFinalizeUploadMutation();

  const uploadFiles = useCallback(
    async (
      files: File[],
      options?: UploadFilesOptions
    ): Promise<UploadResult[]> => {
      if (!files.length) return [];

      setIsUploading(true);
      setGlobalUploading(true);
      setError(null);

      // 1. Add all items to Zustand store
      const queueIds = addFilesToQueue(files, options);

      try {
        // 2. Validate file size constraints
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const itemId = queueIds[i];

          if (file.size > MAX_MEDIA_SIZE_BYTES) {
            const sizeMb = Math.round(MAX_MEDIA_SIZE_BYTES / (1024 * 1024));
            const errMsg = `File "${file.name}" exceeds maximum allowed size of ${sizeMb}MB.`;
            setItemError(itemId, errMsg);
            throw new Error(errMsg);
          }
        }

        // 3. Compute SHA-256 hashes concurrently
        const preparedItems: (PrepareItemInput & { file: File })[] = await Promise.all(
          files.map(async (file, idx) => {
            const itemId = queueIds[idx];
            setItemStatus(itemId, "hashing");

            const fileHash = await computeFileHash(file);
            const assetType = determineAssetType(file.type);

            setItemStatus(itemId, "preparing", { fileHash });

            return {
              id: itemId,
              file,
              fileHash,
              assetType,
              originalFileName: file.name,
              mimeType: file.type || "application/octet-stream",
              sizeBytes: file.size,
              ownerType: options?.ownerType,
              ownerId: options?.ownerId,
              purpose: options?.purpose,
              caption: options?.caption,
              description: options?.description,
            };
          })
        );

        // 4. Call /api/media/prepare via TanStack Query mutation
        const prepareResponse = await prepareMutation.mutateAsync({
          items: preparedItems.map(
            ({
              id,
              fileHash,
              assetType,
              originalFileName,
              mimeType,
              sizeBytes,
              ownerType,
              ownerId,
              purpose,
              caption,
              description,
            }) => ({
              id,
              fileHash,
              assetType,
              originalFileName,
              mimeType,
              sizeBytes,
              ownerType,
              ownerId,
              purpose,
              caption,
              description,
            })
          ),
        });

        const prepareResults = prepareResponse.results;
        const finalizedItemsToSubmit: FinalizeItemInput[] = [];
        const existingResults: UploadResult[] = [];
        const uploadPromises: Promise<void>[] = [];

        // 5. Route deduplicated vs physical Cloudinary uploads
        for (const prep of prepareResults) {
          const item = preparedItems.find((i) => i.id === prep.id)!;

          if (prep.status === "EXISTS") {
            // Deduplication Hit: Instant reuse!
            const result: UploadResult = {
              id: prep.id,
              fileId: prep.fileId,
              url: prep.url,
              assetId: prep.assetId,
              publicId: prep.url,
              originalFileName: item.originalFileName,
              sizeBytes: item.sizeBytes,
              assetType: item.assetType,
              mimeType: item.mimeType,
              deduplicated: true,
            };

            existingResults.push(result);
            setItemCompleted(prep.id, result);
          } else if (prep.status === "UPLOAD_REQUIRED") {
            // Direct Upload to Cloudinary with real-time percentage progress
            const { uploadParams } = prep;
            setItemStatus(item.id, "uploading");

            const formData = new FormData();
            formData.append("file", item.file);
            formData.append("api_key", uploadParams.api_key);
            formData.append("timestamp", String(uploadParams.timestamp));
            formData.append("signature", uploadParams.signature);
            formData.append("folder", uploadParams.folder);
            if (uploadParams.public_id) {
              formData.append("public_id", uploadParams.public_id);
            }

            const uploadPromise = axios
              .post(
                `https://api.cloudinary.com/v1_1/${uploadParams.cloud_name}/auto/upload`,
                formData,
                {
                  onUploadProgress: (evt) => {
                    if (evt.total) {
                      const percent = Math.round((evt.loaded * 100) / evt.total);
                      updateItemProgress(item.id, percent);
                    }
                  },
                }
              )
              .then((cloudRes) => {
                const cloudData = cloudRes.data;
                setItemStatus(item.id, "finalizing");

                finalizedItemsToSubmit.push({
                  id: item.id,
                  fileHash: item.fileHash,
                  assetType: item.assetType,
                  originalFileName: item.originalFileName,
                  mimeType: item.mimeType,
                  sizeBytes: item.sizeBytes,
                  description: item.description,
                  ownerType: item.ownerType,
                  ownerId: item.ownerId,
                  purpose: item.purpose,
                  caption: item.caption,
                  cloudinaryPublicId: cloudData.public_id,
                  cloudinaryUrl: cloudData.secure_url,
                  cloudinaryAssetId: cloudData.asset_id,
                  cloudinaryResourceType: cloudData.resource_type,
                  cloudinaryFormat: cloudData.format,
                  width: cloudData.width,
                  height: cloudData.height,
                  pages: cloudData.pages,
                  etag: cloudData.etag,
                  version: cloudData.version,
                });
              })
              .catch((err) => {
                const msg = err.response?.data?.error?.message || err.message || "Cloudinary upload failed";
                setItemError(item.id, msg);
                throw new Error(msg);
              });

            uploadPromises.push(uploadPromise);
          }
        }

        // Wait for all Cloudinary uploads to complete
        await Promise.all(uploadPromises);

        // 6. Call /api/media/finalize for all newly uploaded items
        let newFinalizedResults: UploadResult[] = [];
        if (finalizedItemsToSubmit.length > 0) {
          const finalizeResponse = await finalizeMutation.mutateAsync({
            items: finalizedItemsToSubmit,
          });

          newFinalizedResults = finalizeResponse.results.map((fin) => {
            const item = preparedItems.find((i) => i.id === fin.id)!;
            const res: UploadResult = {
              id: fin.id,
              fileId: fin.fileId,
              url: fin.url,
              assetId: fin.assetId,
              publicId: fin.publicId,
              originalFileName: item.originalFileName,
              sizeBytes: item.sizeBytes,
              assetType: item.assetType,
              mimeType: item.mimeType,
              deduplicated: false,
            };
            setItemCompleted(fin.id, res);
            return res;
          });
        }

        // 7. Combine results preserving original input order
        const allResults: UploadResult[] = preparedItems.map((item) => {
          const existing = existingResults.find((r) => r.id === item.id);
          if (existing) return existing;
          const fresh = newFinalizedResults.find((r) => r.id === item.id);
          if (fresh) return fresh;
          throw new Error(`Upload resolution missing for item: ${item.originalFileName}`);
        });

        return allResults;
      } catch (err: unknown) {
        const errorMsg =
          err instanceof Error
            ? err.message
            : "An unexpected error occurred during media upload";
        setError(errorMsg);
        throw err;
      } finally {
        setIsUploading(false);
        setGlobalUploading(false);
      }
    },
    [
      addFilesToQueue,
      finalizeMutation,
      prepareMutation,
      setGlobalUploading,
      setItemCompleted,
      setItemError,
      setItemStatus,
      updateItemProgress,
    ]
  );

  return {
    uploadFiles,
    isUploading,
    queue,
    overallProgress,
    error,
    clearQueue,
    removeQueueItem,
  };
}
