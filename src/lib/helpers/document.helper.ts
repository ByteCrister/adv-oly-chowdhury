import mongoose from "mongoose";
import { DOCUMENT_ENTITY_TYPES } from "@/const/document.const";
import {
  CASE_DOCUMENT_TYPE_LABELS,
  CASE_DOCUMENT_TYPES,
  CaseDocumentType,
} from "@/const/case-document.const";
import {
  CLIENT_DOCUMENT_TYPE_LABELS,
  CLIENT_DOCUMENT_TYPES,
  ClientDocumentType,
} from "@/const/client-document.const";
import type { UnifiedDocumentItemDto } from "@/types/document.types";
import type { IAsset } from "@/types/db/asset.type";
import type { IAssetReferenceDocument } from "@/types/db/asset-reference.type";

/**
 * Standard projection fields for CaseDocument queries
 */
export const CASE_DOCUMENT_SELECT =
  "_id caseId assetReferenceId documentType title documentDate description exhibitNumber isConfidential createdAt updatedAt";

/**
 * Standard projection fields for ClientDocument queries
 */
export const CLIENT_DOCUMENT_SELECT =
  "_id clientId assetReferenceId documentType title documentDate expiryDate notes createdAt updatedAt";

/**
 * Standard projection fields for Case population
 */
export const CASE_POPULATE_SELECT = "_id title caseNumber internalReference caseStatus";

/**
 * Standard projection fields for Client population
 */
export const CLIENT_POPULATE_SELECT = "_id name clientNumber organizationName phone";

/**
 * Standard projection fields for AssetReference population
 */
export const ASSET_REF_POPULATE_SELECT = "_id originalFileName assetId";

/**
 * Standard projection fields for Asset population
 */
export const ASSET_POPULATE_SELECT =
  "_id secureUrl publicId mimeType bytes format width height pages originalFilename";

/**
 * Safely extracts a string ID from an ObjectId, populated object, or string.
 * Never throws on null/undefined.
 */
export function extractObjectIdString(val: unknown): string {
  if (!val) return "";
  if (typeof val === "string") return val;
  if (val instanceof mongoose.Types.ObjectId) return val.toString();
  if (typeof val === "object" && "_id" in (val as Record<string, unknown>)) {
    const inner = (val as Record<string, unknown>)._id;
    return inner ? String(inner) : "";
  }
  return String(val);
}

/**
 * Safely formats a date or date string into an ISO string.
 * Never throws RangeError on invalid date values.
 */
export function safeToIsoString(dateVal: unknown): string | null {
  if (!dateVal) return null;
  const d = dateVal instanceof Date ? dateVal : new Date(dateVal as string | number);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * Format a CaseDocument record into UnifiedDocumentItemDto.
 * Fully defensive against null pointers, invalid dates, and unpopulated references.
 */
export function formatCaseDocumentItem(
  doc: Record<string, unknown>,
  assetRef?: (IAssetReferenceDocument & { assetId?: IAsset }) | null,
  caseInfo?: Record<string, unknown> | null
): UnifiedDocumentItemDto {
  const resolvedAssetRef =
    assetRef !== undefined
      ? assetRef
      : doc.assetReferenceId && typeof doc.assetReferenceId === "object"
      ? (doc.assetReferenceId as unknown as IAssetReferenceDocument & { assetId?: IAsset })
      : null;

  const asset =
    resolvedAssetRef?.assetId && typeof resolvedAssetRef.assetId === "object"
      ? resolvedAssetRef.assetId
      : null;

  const resolvedCaseInfo =
    caseInfo !== undefined
      ? caseInfo
      : doc.caseId && typeof doc.caseId === "object"
      ? (doc.caseId as unknown as Record<string, unknown>)
      : null;

  const rawDocType = doc.documentType as string;
  const docType = (rawDocType as CaseDocumentType) || CASE_DOCUMENT_TYPES.OTHER;

  const rawDocId = extractObjectIdString(doc._id);
  const rawAssetRefId = extractObjectIdString(resolvedAssetRef?._id || doc.assetReferenceId);
  const rawAssetId = extractObjectIdString(asset?._id);

  const createdAtIso = safeToIsoString(doc.createdAt) || new Date().toISOString();
  const updatedAtIso = safeToIsoString(doc.updatedAt) || createdAtIso;

  return {
    id: rawDocId,
    entityType: DOCUMENT_ENTITY_TYPES.CASE,
    assetReferenceId: rawAssetRefId,
    assetId: rawAssetId,
    documentType: docType,
    documentTypeLabel: CASE_DOCUMENT_TYPE_LABELS[docType] || rawDocType || "Document",
    title: (doc.title as string) || "Untitled Document",
    documentDate: safeToIsoString(doc.documentDate),
    createdAt: createdAtIso,
    updatedAt: updatedAtIso,
    originalFileName:
      resolvedAssetRef?.originalFileName ||
      asset?.originalFilename ||
      (doc.title as string) ||
      "document",
    fileUrl: asset?.secureUrl || "",
    publicId: asset?.publicId || "",
    mimeType: asset?.mimeType || "application/octet-stream",
    sizeBytes: typeof asset?.bytes === "number" ? asset.bytes : 0,
    format: asset?.format || null,
    width: typeof asset?.width === "number" ? asset.width : null,
    height: typeof asset?.height === "number" ? asset.height : null,
    pages: typeof asset?.pages === "number" ? asset.pages : null,
    // Case-specific fields
    caseId: resolvedCaseInfo?._id
      ? extractObjectIdString(resolvedCaseInfo._id)
      : doc.caseId
      ? extractObjectIdString(doc.caseId)
      : null,
    caseDetails: resolvedCaseInfo
      ? {
          id: extractObjectIdString(resolvedCaseInfo._id),
          title: (resolvedCaseInfo.title as string) || "Untitled Case",
          caseNumber: (resolvedCaseInfo.caseNumber as string) || "",
          internalReference: (resolvedCaseInfo.internalReference as string) || "",
          caseStatus: (resolvedCaseInfo.caseStatus as string) || undefined,
        }
      : null,
    description: (doc.description as string) || null,
    exhibitNumber: (doc.exhibitNumber as string) || null,
    isConfidential: Boolean(doc.isConfidential),
  };
}

/**
 * Format a ClientDocument record into UnifiedDocumentItemDto.
 * Fully defensive against null pointers, invalid dates, and unpopulated references.
 */
export function formatClientDocumentItem(
  doc: Record<string, unknown>,
  assetRef?: (IAssetReferenceDocument & { assetId?: IAsset }) | null,
  clientInfo?: Record<string, unknown> | null
): UnifiedDocumentItemDto {
  const resolvedAssetRef =
    assetRef !== undefined
      ? assetRef
      : doc.assetReferenceId && typeof doc.assetReferenceId === "object"
      ? (doc.assetReferenceId as unknown as IAssetReferenceDocument & { assetId?: IAsset })
      : null;

  const asset =
    resolvedAssetRef?.assetId && typeof resolvedAssetRef.assetId === "object"
      ? resolvedAssetRef.assetId
      : null;

  const resolvedClientInfo =
    clientInfo !== undefined
      ? clientInfo
      : doc.clientId && typeof doc.clientId === "object"
      ? (doc.clientId as unknown as Record<string, unknown>)
      : null;

  const rawDocType = doc.documentType as string;
  const docType = (rawDocType as ClientDocumentType) || CLIENT_DOCUMENT_TYPES.OTHER;

  const rawDocId = extractObjectIdString(doc._id);
  const rawAssetRefId = extractObjectIdString(resolvedAssetRef?._id || doc.assetReferenceId);
  const rawAssetId = extractObjectIdString(asset?._id);

  const createdAtIso = safeToIsoString(doc.createdAt) || new Date().toISOString();
  const updatedAtIso = safeToIsoString(doc.updatedAt) || createdAtIso;

  return {
    id: rawDocId,
    entityType: DOCUMENT_ENTITY_TYPES.CLIENT,
    assetReferenceId: rawAssetRefId,
    assetId: rawAssetId,
    documentType: docType,
    documentTypeLabel: CLIENT_DOCUMENT_TYPE_LABELS[docType] || rawDocType || "Document",
    title: (doc.title as string) || "Untitled Document",
    documentDate: safeToIsoString(doc.documentDate),
    createdAt: createdAtIso,
    updatedAt: updatedAtIso,
    originalFileName:
      resolvedAssetRef?.originalFileName ||
      asset?.originalFilename ||
      (doc.title as string) ||
      "document",
    fileUrl: asset?.secureUrl || "",
    publicId: asset?.publicId || "",
    mimeType: asset?.mimeType || "application/octet-stream",
    sizeBytes: typeof asset?.bytes === "number" ? asset.bytes : 0,
    format: asset?.format || null,
    width: typeof asset?.width === "number" ? asset.width : null,
    height: typeof asset?.height === "number" ? asset.height : null,
    pages: typeof asset?.pages === "number" ? asset.pages : null,
    // Client-specific fields
    clientId: resolvedClientInfo?._id
      ? extractObjectIdString(resolvedClientInfo._id)
      : doc.clientId
      ? extractObjectIdString(doc.clientId)
      : null,
    clientDetails: resolvedClientInfo
      ? {
          id: extractObjectIdString(resolvedClientInfo._id),
          name: (resolvedClientInfo.name as string) || "Unnamed Client",
          clientNumber: (resolvedClientInfo.clientNumber as string) || "",
          organizationName: (resolvedClientInfo.organizationName as string) || null,
          phone: (resolvedClientInfo.phone as string) || null,
        }
      : null,
    expiryDate: safeToIsoString(doc.expiryDate),
    notes: (doc.notes as string) || null,
  };
}
