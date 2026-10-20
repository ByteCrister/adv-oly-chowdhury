"use client";

import { useState, useCallback } from "react";
import { useMediaUpload } from "@/hooks/media/useMediaUpload";
import { deleteMediaReference } from "@/hooks/media/mutations/useDeleteMediaMutation";
import { ASSET_OWNER_TYPES, ASSET_PURPOSES } from "@/const/asset-reference.const";
import { CASE_EXPENSE_RECEIPT_MAX_SIZE_BYTES } from "@/const/case-expense.const";
import {
  validateDocumentFile,
  compressDocumentFile,
  DocumentCompressionResult,
} from "@/utils/document-compression";
import type { UploadResult } from "@/types/media.types";

export interface UploadExpenseReceiptOptions {
  caseId: string;
  memo?: string | null;
}

/**
 * Dedicated hook managing case expense receipt validation, compression,
 * upload, and failure-cleanup lifecycle.
 */
export function useUploadCaseExpenseReceipt() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [stage, setStage] = useState<"idle" | "optimizing" | "uploading" | "completed">("idle");
  const [error, setError] = useState<string | null>(null);
  const [compressionResult, setCompressionResult] = useState<DocumentCompressionResult | null>(null);

  const { uploadFiles, overallProgress, queue } = useMediaUpload();

  /**
   * Validate receipt file size and format against chamber document constraints (max 2MB, PDF or JPEG/PNG/WebP).
   */
  const validateReceipt = useCallback((file: File) => {
    validateDocumentFile(file, CASE_EXPENSE_RECEIPT_MAX_SIZE_BYTES);
  }, []);

  /**
   * Compress and upload a receipt voucher to Cloudinary or deduplicate via SHA-256.
   */
  const uploadReceipt = useCallback(
    async (file: File, options: UploadExpenseReceiptOptions): Promise<UploadResult> => {
      setIsProcessing(true);
      setError(null);
      setStage("optimizing");

      try {
        validateReceipt(file);

        // 1. Client-side compression (WebP for images, lossless stream compaction for PDF)
        const comp = await compressDocumentFile(file);
        setCompressionResult(comp);
        const fileToUpload = comp.file;

        // 2. Upload via Media Service to Cloudinary with SHA-256 deduplication
        setStage("uploading");
        const [uploadResult] = await uploadFiles([fileToUpload], {
          ownerType: ASSET_OWNER_TYPES.CASE_EXPENSE,
          ownerId: options.caseId,
          purpose: ASSET_PURPOSES.EXPENSE_RECEIPT,
          description: options.memo || "Case expense receipt voucher",
        });

        if (!uploadResult?.fileId) {
          throw new Error("Failed to acquire an asset reference for receipt voucher.");
        }

        setStage("completed");
        return uploadResult;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Receipt upload failed.";
        setError(msg);
        setStage("idle");
        throw err;
      } finally {
        setIsProcessing(false);
      }
    },
    [uploadFiles, validateReceipt]
  );

  /**
   * Safely soft-deletes a newly created reference if subsequent expense record creation/update fails.
   */
  const cleanupUploadedReceipt = useCallback(async (referenceId: string) => {
    try {
      await deleteMediaReference(referenceId);
    } catch (cleanupErr) {
      console.warn(
        "[useUploadCaseExpenseReceipt] Failed to clean up abandoned receipt reference:",
        cleanupErr
      );
    }
  }, []);

  return {
    uploadReceipt,
    validateReceipt,
    cleanupUploadedReceipt,
    isProcessing,
    stage,
    overallProgress,
    compressionResult,
    queue,
    error,
  };
}

export default useUploadCaseExpenseReceipt;
