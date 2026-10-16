/**
 * Cloudinary Digital Asset Storage Constants
 */

// Cloudinary physical resource types
export const ASSET_RESOURCE_TYPES = {
  IMAGE: "image",
  RAW: "raw",
  VIDEO: "video",
  AUTO: "auto",
} as const;

export const ASSET_RESOURCE_TYPE_LIST = Object.values(ASSET_RESOURCE_TYPES);
export type AssetResourceType = (typeof ASSET_RESOURCE_TYPES)[keyof typeof ASSET_RESOURCE_TYPES];

// Cloudinary delivery access types
export const ASSET_DELIVERY_TYPES = {
  UPLOAD: "upload",
  PRIVATE: "private",
  AUTHENTICATED: "authenticated",
} as const;

export const ASSET_DELIVERY_TYPE_LIST = Object.values(ASSET_DELIVERY_TYPES);
export type AssetDeliveryType = (typeof ASSET_DELIVERY_TYPES)[keyof typeof ASSET_DELIVERY_TYPES];

// Logical asset classification (for business logic, validation, and deduplication)
export const ASSET_TYPES = {
  IMAGE: "image",
  VIDEO: "video",
  PDF: "pdf",
  DOCX: "docx",
  OTHER: "other",
} as const;

export const ASSET_TYPE_LIST = Object.values(ASSET_TYPES);
export type AssetType = (typeof ASSET_TYPES)[keyof typeof ASSET_TYPES];

// Physical Asset lifecycle status
export const ASSET_STATUSES = {
  PENDING: "pending",
  READY: "ready",
  FAILED: "failed",
  DELETED: "deleted",
} as const;

export const ASSET_STATUS_LIST = Object.values(ASSET_STATUSES);
export type AssetStatus = (typeof ASSET_STATUSES)[keyof typeof ASSET_STATUSES];

// Global Media Limits & Constraints
export const MAX_MEDIA_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB max limit
export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB for images
export const MAX_DOCUMENT_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB for legal briefs, petitions, evidence
export const MAX_BATCH_UPLOAD_COUNT = 20;

// Allowed MIME types mapped by logical AssetType
export const ALLOWED_MIME_TYPES: Record<AssetType, string[]> = {
  image: [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/svg+xml",
    "image/heic",
    "image/tiff",
  ],
  video: [
    "video/mp4",
    "video/webm",
    "video/quicktime",
    "video/x-msvideo",
  ],
  pdf: [
    "application/pdf",
  ],
  docx: [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
  ],
  other: [
    "application/octet-stream",
    "application/zip",
    "application/x-zip-compressed",
    "text/plain",
    "text/csv",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ],
};

