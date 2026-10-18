"use client";

import { useState, useCallback } from "react";
import { useMediaUpload } from "@/hooks/media/useMediaUpload";
import { useCreateCaseDocumentMutation } from "./mutations/useCreateCaseDocumentMutation";
import { useCreateUnifiedClientDocumentMutation } from "./mutations/useCreateClientDocumentMutation";
import { useUpdateDocumentMutation } from "./mutations/useUpdateDocumentMutation";
import {
  ASSET_OWNER_TYPES,
  ASSET_PURPOSES,
  AssetPurpose,
} from "@/const/asset-reference.const";
import {
  CASE_DOCUMENT_TYPES,
  CaseDocumentType,
} from "@/const/case-document.const";
import {
  CLIENT_DOCUMENT_TYPES,
  ClientDocumentType,
} from "@/const/client-document.const";
import {
  DOCUMENT_ENTITY_TYPES,
  DocumentEntityType,
  DOCUMENT_MAX_SIZE_BYTES,
} from "@/const/document.const";
import {
  validateDocumentFile,
  compressDocumentFile,
  DocumentCompressionResult,
} from "@/utils/document-compression";
import type { DocumentActionResponse } from "@/types/document.types";

/**
 * Maps Case Document Types to logical AssetPurposes for storage classification.
 */
export function mapCaseDocTypeToPurpose(docType: string): AssetPurpose {
  switch (docType) {
    case CASE_DOCUMENT_TYPES.PLAINT_OR_PETITION:
    case CASE_DOCUMENT_TYPES.WRITTEN_STATEMENT:
    case CASE_DOCUMENT_TYPES.INJUNCTION_APPLICATION:
    case CASE_DOCUMENT_TYPES.BAIL_PETITION:
      return ASSET_PURPOSES.PETITION;
    case CASE_DOCUMENT_TYPES.INTERLOCUTORY_ORDER:
      return ASSET_PURPOSES.ORDER_SHEET;
    case CASE_DOCUMENT_TYPES.FINAL_JUDGMENT:
    case CASE_DOCUMENT_TYPES.DECREE:
      return ASSET_PURPOSES.JUDGMENT;
    case CASE_DOCUMENT_TYPES.DOCUMENTARY_EVIDENCE:
    case CASE_DOCUMENT_TYPES.CERTIFIED_COPY:
    case CASE_DOCUMENT_TYPES.POLICE_FIRST_INFORMATION_REPORT:
    case CASE_DOCUMENT_TYPES.CHARGE_SHEET:
      return ASSET_PURPOSES.EVIDENCE;
    case CASE_DOCUMENT_TYPES.TITLE_DEED_DALIL:
      return ASSET_PURPOSES.DEED_DOCUMENT;
    case CASE_DOCUMENT_TYPES.KHATIAN_OR_MUTATION:
      return ASSET_PURPOSES.KHATIAN_PARCHA;
    case CASE_DOCUMENT_TYPES.VAKALATNAMA_POWER:
      return ASSET_PURPOSES.POWER_OF_ATTORNEY;
    case CASE_DOCUMENT_TYPES.TAX_ASSESSMENT_ORDER:
    case CASE_DOCUMENT_TYPES.TAX_DEMAND_NOTICE:
      return ASSET_PURPOSES.TAX_RETURN_ACKNOWLEDGEMENT;
    case CASE_DOCUMENT_TYPES.CORRESPONDENCE:
    case CASE_DOCUMENT_TYPES.LEGAL_NOTICE:
      return ASSET_PURPOSES.CORRESPONDENCE;
    default:
      return ASSET_PURPOSES.OTHER;
  }
}

/**
 * Maps Client Document Types to logical AssetPurposes.
 */
export function mapClientDocTypeToPurpose(docType: string): AssetPurpose {
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

export interface UploadAndCreateCaseDocumentInput {
  caseId: string;
  file: File;
  title: string;
  documentType: CaseDocumentType;
  documentDate?: string | null;
  description?: string | null;
  exhibitNumber?: string | null;
  isConfidential?: boolean;
}

export interface UploadAndCreateClientDocumentInput {
  clientId: string;
  file: File;
  title: string;
  documentType: ClientDocumentType;
  documentDate?: string | null;
  expiryDate?: string | null;
  notes?: string | null;
}

export interface UploadAndReplaceUnifiedDocumentInput {
  docId: string;
  entityType: DocumentEntityType;
  file: File;
  title?: string;
  documentType?: string;
  documentDate?: string | null;
  ownerId?: string; // caseId or clientId
  // Case fields
  description?: string | null;
  exhibitNumber?: string | null;
  isConfidential?: boolean;
  // Client fields
  expiryDate?: string | null;
  notes?: string | null;
}

export type UploadAndReplaceDocumentInput = UploadAndReplaceUnifiedDocumentInput;

export function useUploadDocument() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastCompressionResult, setLastCompressionResult] =
    useState<DocumentCompressionResult | null>(null);

  const { uploadFiles, overallProgress, queue } = useMediaUpload();
  const createCaseDocMutation = useCreateCaseDocumentMutation();
  const createClientDocMutation = useCreateUnifiedClientDocumentMutation();
  const updateDocMutation = useUpdateDocumentMutation();

  const validateFile = useCallback((file: File) => {
    validateDocumentFile(file, DOCUMENT_MAX_SIZE_BYTES);
  }, []);

  /**
   * Upload file and create a new CaseDocument.
   * Compresses raster images to lightweight KB sizes and deduplicates via SHA-256 before Cloudinary upload.
   */
  const uploadAndCreateCaseDocument = useCallback(
    async ({
      caseId,
      file,
      title,
      documentType,
      documentDate,
      description,
      exhibitNumber,
      isConfidential,
    }: UploadAndCreateCaseDocumentInput): Promise<DocumentActionResponse> => {
      setIsProcessing(true);
      setError(null);

      try {
        validateFile(file);

        // 1. Client-side Document Compression (optimizes raster scans/photos to tolerable KB sizes)
        const compResult = await compressDocumentFile(file);
        setLastCompressionResult(compResult);
        const fileToUpload = compResult.file;

        const purpose = mapCaseDocTypeToPurpose(documentType);

        // 2. Upload or Deduplicate via Cloudinary media workflow
        const [uploadResult] = await uploadFiles([fileToUpload], {
          ownerType: ASSET_OWNER_TYPES.CASE,
          ownerId: caseId,
          purpose,
          description: description || title,
        });

        if (!uploadResult?.fileId) {
          throw new Error("Failed to secure an asset reference for the uploaded file.");
        }

        // 3. Persist CaseDocument record
        const docResponse = await createCaseDocMutation.mutateAsync({
          data: {
            caseId,
            assetReferenceId: uploadResult.fileId,
            documentType,
            title: title.trim(),
            documentDate,
            description,
            exhibitNumber,
            isConfidential,
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
    [createCaseDocMutation, uploadFiles, validateFile]
  );

  /**
   * Upload file and create a new ClientDocument.
   * Compresses raster images to lightweight KB sizes and deduplicates via SHA-256 before Cloudinary upload.
   */
  const uploadAndCreateClientDocument = useCallback(
    async ({
      clientId,
      file,
      title,
      documentType,
      documentDate,
      expiryDate,
      notes,
    }: UploadAndCreateClientDocumentInput): Promise<DocumentActionResponse> => {
      setIsProcessing(true);
      setError(null);

      try {
        validateFile(file);

        // 1. Client-side Document Compression (optimizes raster scans/photos to tolerable KB sizes)
        const compResult = await compressDocumentFile(file);
        setLastCompressionResult(compResult);
        const fileToUpload = compResult.file;

        const purpose = mapClientDocTypeToPurpose(documentType);

        // 2. Upload or Deduplicate via Cloudinary media workflow
        const [uploadResult] = await uploadFiles([fileToUpload], {
          ownerType: ASSET_OWNER_TYPES.CLIENT,
          ownerId: clientId,
          purpose,
          description: notes || title,
        });

        if (!uploadResult?.fileId) {
          throw new Error("Failed to secure an asset reference for the uploaded file.");
        }

        // 3. Persist ClientDocument record
        const docResponse = await createClientDocMutation.mutateAsync({
          data: {
            clientId,
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
    [createClientDocMutation, uploadFiles, validateFile]
  );

  /**
   * Upload replacement file and safely update document with old reference soft-deletion
   */
  const uploadAndReplaceDocument = useCallback(
    async ({
      docId,
      entityType,
      file,
      title,
      documentType,
      documentDate,
      ownerId,
      description,
      exhibitNumber,
      isConfidential,
      expiryDate,
      notes,
    }: UploadAndReplaceDocumentInput): Promise<DocumentActionResponse> => {
      setIsProcessing(true);
      setError(null);

      try {
        validateFile(file);

        // 1. Client-side Document Compression
        const compResult = await compressDocumentFile(file);
        setLastCompressionResult(compResult);
        const fileToUpload = compResult.file;

        const purpose =
          entityType === DOCUMENT_ENTITY_TYPES.CASE
            ? mapCaseDocTypeToPurpose(documentType || "")
            : mapClientDocTypeToPurpose(documentType || "");

        const ownerType =
          entityType === DOCUMENT_ENTITY_TYPES.CASE
            ? ASSET_OWNER_TYPES.CASE
            : ASSET_OWNER_TYPES.CLIENT;

        // 2. Upload or deduplicate replacement file
        const [uploadResult] = await uploadFiles([fileToUpload], {
          ownerType,
          ownerId,
          purpose,
          description: description || notes || title,
        });

        if (!uploadResult?.fileId) {
          throw new Error("Failed to secure an asset reference for the replacement file.");
        }

        // 3. Update document with new assetReferenceId (server soft-deletes previous reference)
        const docResponse = await updateDocMutation.mutateAsync({
          id: docId,
          data: {
            entityType,
            assetReferenceId: uploadResult.fileId,
            ...(title ? { title: title.trim() } : {}),
            ...(documentType ? { documentType } : {}),
            ...(documentDate !== undefined ? { documentDate } : {}),
            ...(description !== undefined ? { description } : {}),
            ...(exhibitNumber !== undefined ? { exhibitNumber } : {}),
            ...(isConfidential !== undefined ? { isConfidential } : {}),
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
    uploadAndCreateCaseDocument,
    uploadAndCreateClientDocument,
    uploadAndReplaceDocument,
    lastCompressionResult,
    isProcessing,
    overallProgress,
    queue,
    error,
  };
}

export default useUploadDocument;
