"use client";

import { useState, useCallback } from "react";
import { useMediaUpload } from "@/hooks/media/useMediaUpload";
import { useCreateClientDocumentMutation } from "./mutations/useCreateClientDocumentMutation";
import { useUpdateClientDocumentMutation } from "./mutations/useUpdateClientDocumentMutation";
import { ASSET_OWNER_TYPES, ASSET_PURPOSES, AssetPurpose } from "@/const/asset-reference.const";
import {
  CLIENT_DOCUMENT_MAX_SIZE_BYTES,
  ClientDocumentType,
  CLIENT_DOCUMENT_TYPES,
} from "@/const/client-document.const";
import {
  validateDocumentFile,
  compressDocumentFile,
  DocumentCompressionResult,
} from "@/utils/document-compression";
import type {
  ClientDocumentActionResponse,
} from "@/types/client-document.types";

/**
 * Maps a ClientDocumentType to a corresponding AssetPurpose.
 */
export function mapDocumentTypeToPurpose(docType: ClientDocumentType): AssetPurpose {
  switch (docType) {
    case CLIENT_DOCUMENT_TYPES.NATIONAL_ID:
      return ASSET_PURPOSES.NATIONAL_ID;
    case CLIENT_DOCUMENT_TYPES.PASSPORT:
      return ASSET_PURPOSES.PASSPORT;
    case CLIENT_DOCUMENT_TYPES.TRADE_LICENSE:
      return ASSET_PURPOSES.TRADE_LICENSE;
    case CLIENT_DOCUMENT_TYPES.TIN_CERTIFICATE:
      return ASSET_PURPOSES.TIN_CERTIFICATE;
    case CLIENT_DOCUMENT_TYPES.TAX_RETURN_ACKNOWLEDGEMENT:
      return ASSET_PURPOSES.TAX_RETURN_ACKNOWLEDGEMENT;
    case CLIENT_DOCUMENT_TYPES.POWER_OF_ATTORNEY:
      return ASSET_PURPOSES.POWER_OF_ATTORNEY;
    case CLIENT_DOCUMENT_TYPES.CLIENT_PHOTOGRAPH:
      return ASSET_PURPOSES.PROFILE_IMAGE;
    default:
      return ASSET_PURPOSES.OTHER;
  }
}

export interface UploadAndCreateDocumentInput {
  clientId: string;
  file: File;
  title: string;
  documentType: ClientDocumentType;
  documentDate?: string | null;
  expiryDate?: string | null;
  notes?: string | null;
}

export interface UploadAndReplaceDocumentInput {
  clientId: string;
  docId: string;
  file: File;
  title?: string;
  documentType?: ClientDocumentType;
  documentDate?: string | null;
  expiryDate?: string | null;
  notes?: string | null;
}

/**
 * Composite hook that orchestrates file validation, SHA-256 deduplication,
 * Cloudinary direct upload, asset-reference binding, and ClientDocument creation or replacement.
 */
export function useUploadClientDocument() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [lastCompressionResult, setLastCompressionResult] =
    useState<DocumentCompressionResult | null>(null);

  const { uploadFiles, overallProgress, queue } = useMediaUpload();
  const createDocMutation = useCreateClientDocumentMutation();
  const updateDocMutation = useUpdateClientDocumentMutation();

  /**
   * Validate file size and format according to client document domain rules.
   */
  const validateFile = useCallback((file: File) => {
    validateDocumentFile(file, CLIENT_DOCUMENT_MAX_SIZE_BYTES);
  }, []);

  /**
   * Upload file to Cloudinary / reuse existing via hash deduplication, then create a ClientDocument.
   * Compresses raster images to lightweight KB sizes before hashing and uploading.
   */
  const uploadAndCreateDocument = useCallback(
    async ({
      clientId,
      file,
      title,
      documentType,
      documentDate,
      expiryDate,
      notes,
    }: UploadAndCreateDocumentInput): Promise<ClientDocumentActionResponse> => {
      setIsProcessing(true);
      setError(null);

      try {
        validateFile(file);

        // 1. Client-side document compression (scales & compresses raster scans to lightweight KB size)
        const compResult = await compressDocumentFile(file);
        setLastCompressionResult(compResult);
        const fileToUpload = compResult.file;

        const purpose = mapDocumentTypeToPurpose(documentType);

        // 2. Upload or deduplicate via Cloudinary media workflow
        const [uploadResult] = await uploadFiles([fileToUpload], {
          ownerType: ASSET_OWNER_TYPES.CLIENT,
          ownerId: clientId,
          purpose,
          description: notes || title,
        });

        if (!uploadResult?.fileId) {
          throw new Error("Failed to secure an asset reference for the uploaded file.");
        }

        // 3. Persist ClientDocument record linked to the asset reference
        const docResponse = await createDocMutation.mutateAsync({
          clientId,
          data: {
            assetReferenceId: uploadResult.fileId,
            documentType,
            title: title.trim(),
            documentDate,
            expiryDate,
            notes,
          },
        });

        return docResponse;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Document upload failed.";
        setError(msg);
        throw err;
      } finally {
        setIsProcessing(false);
      }
    },
    [createDocMutation, uploadFiles, validateFile]
  );

  /**
   * Upload replacement file and update ClientDocument with safe previous reference soft-delete.
   */
  const uploadAndReplaceDocument = useCallback(
    async ({
      clientId,
      docId,
      file,
      title,
      documentType,
      documentDate,
      expiryDate,
      notes,
    }: UploadAndReplaceDocumentInput): Promise<ClientDocumentActionResponse> => {
      setIsProcessing(true);
      setError(null);

      try {
        validateFile(file);

        // 1. Client-side document compression
        const compResult = await compressDocumentFile(file);
        setLastCompressionResult(compResult);
        const fileToUpload = compResult.file;

        const purpose = documentType
          ? mapDocumentTypeToPurpose(documentType)
          : ASSET_PURPOSES.OTHER;

        // 2. Upload or deduplicate replacement file
        const [uploadResult] = await uploadFiles([fileToUpload], {
          ownerType: ASSET_OWNER_TYPES.CLIENT,
          ownerId: clientId,
          purpose,
          description: notes || title,
        });

        if (!uploadResult?.fileId) {
          throw new Error("Failed to secure an asset reference for the replacement file.");
        }

        // 3. Update ClientDocument pointing to new assetReferenceId (server soft-deletes previous reference)
        const docResponse = await updateDocMutation.mutateAsync({
          clientId,
          docId,
          data: {
            assetReferenceId: uploadResult.fileId,
            ...(title ? { title: title.trim() } : {}),
            ...(documentType ? { documentType } : {}),
            ...(documentDate !== undefined ? { documentDate } : {}),
            ...(expiryDate !== undefined ? { expiryDate } : {}),
            ...(notes !== undefined ? { notes } : {}),
          },
        });

        return docResponse;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Document replacement failed.";
        setError(msg);
        throw err;
      } finally {
        setIsProcessing(false);
      }
    },
    [updateDocMutation, uploadFiles, validateFile]
  );

  return {
    uploadAndCreateDocument,
    uploadAndReplaceDocument,
    lastCompressionResult,
    isProcessing,
    overallProgress,
    queue,
    error,
  };
}

export default useUploadClientDocument;
