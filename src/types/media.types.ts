import {
  AssetType,
  AssetStatus,
  AssetResourceType,
} from "@/const/asset.const";
import {
  AssetOwnerType,
  AssetPurpose,
} from "@/const/asset-reference.const";

export type { AssetType, AssetStatus, AssetResourceType };
export type { AssetOwnerType, AssetPurpose };

// ==========================================
// Client Upload Intent & Hashing Types
// ==========================================

export interface UploadIntentItem {
  id: string; // Unique client upload batch item ID (e.g. ULID, nanoid, or upload_timestamp_idx)
  file: File;
  fileHash: string; // SHA-256 hex string (64 characters)
  assetType: AssetType;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  description?: string;
  ownerType?: AssetOwnerType;
  ownerId?: string;
  purpose?: AssetPurpose;
  caption?: string;
}

// ==========================================
// Cloudinary Signature & Preparation Types
// ==========================================

export interface CloudinarySignedParams {
  signature: string;
  timestamp: number;
  public_id: string;
  api_key: string;
  folder: string;
  cloud_name: string;
  resource_type?: string;
}

export interface PrepareItemInput {
  id: string;
  fileHash: string;
  assetType: AssetType;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  description?: string;
  ownerType?: AssetOwnerType;
  ownerId?: string;
  purpose?: AssetPurpose;
  caption?: string;
}

export interface PrepareBatchRequest {
  items: PrepareItemInput[];
}

export type PrepareResultItem =
  | {
      id: string;
      status: "EXISTS";
      fileId: string; // AssetReference._id
      url: string; // Asset.secureUrl
      assetId: string; // Asset._id
      deduplicated: true;
    }
  | {
      id: string;
      status: "UPLOAD_REQUIRED";
      uploadParams: CloudinarySignedParams;
      deduplicated: false;
    };

export interface PrepareApiResponse {
  success: boolean;
  message?: string;
  results: PrepareResultItem[];
}

// ==========================================
// Cloudinary Finalization Types
// ==========================================

export interface FinalizeItemInput {
  id: string;
  fileHash: string;
  assetType: AssetType;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  description?: string;
  ownerType?: AssetOwnerType;
  ownerId?: string;
  purpose?: AssetPurpose;
  caption?: string;
  cloudinaryPublicId: string;
  cloudinaryUrl: string;
  cloudinaryAssetId?: string;
  cloudinaryResourceType?: string;
  cloudinaryFormat?: string;
  width?: number;
  height?: number;
  pages?: number;
  etag?: string;
  version?: number;
}

export interface FinalizeBatchRequest {
  items: FinalizeItemInput[];
}

export interface FinalizeResultItem {
  id: string;
  fileId: string; // AssetReference._id
  url: string; // Asset.secureUrl
  assetId: string; // Asset._id
  publicId: string;
}

export interface FinalizeApiResponse {
  success: boolean;
  message?: string;
  results: FinalizeResultItem[];
}

// Standardized single upload output returned to UI callers
export interface UploadResult {
  id: string;
  fileId: string; // AssetReference._id
  url: string; // CDN URL
  assetId: string; // Asset._id
  publicId: string;
  originalFileName: string;
  sizeBytes: number;
  assetType: AssetType;
  mimeType: string;
  deduplicated?: boolean;
}

// ==========================================
// Media Query, Listing, & DTO Types
// ==========================================

export interface MediaItemDto {
  id: string; // AssetReference._id
  fileId: string;
  assetId: string;
  url: string;
  publicId: string;
  originalFileName: string;
  description?: string | null;
  assetType: AssetType;
  resourceType: AssetResourceType;
  mimeType: string;
  sizeBytes: number;
  width?: number | null;
  height?: number | null;
  pages?: number | null;
  format?: string | null;
  ownerType: AssetOwnerType;
  ownerId?: string | null;
  purpose?: AssetPurpose | null;
  caption?: string | null;
  uploadedBy?: {
    id: string;
    name: string;
    email: string;
  } | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface MediaFilterParams {
  search?: string;
  assetType?: AssetType;
  ownerType?: AssetOwnerType;
  ownerId?: string;
  purpose?: AssetPurpose;
  page?: number;
  limit?: number;
  sort?: "newest" | "oldest" | "name" | "size";
  includeDeleted?: boolean;
}

export interface MediaPaginationResponse {
  items: MediaItemDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

export interface CleanupApiResponse {
  success: boolean;
  deletedCount: number;
  scannedCount: number;
  message?: string;
}
