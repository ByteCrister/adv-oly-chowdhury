/**
 * Cloudinary Digital Asset Storage Constants
 */

export const ASSET_RESOURCE_TYPES = {
  IMAGE: "image",
  RAW: "raw",
  VIDEO: "video",
} as const;

export const ASSET_RESOURCE_TYPE_LIST = Object.values(ASSET_RESOURCE_TYPES);
export type AssetResourceType = (typeof ASSET_RESOURCE_TYPES)[keyof typeof ASSET_RESOURCE_TYPES];

export const ASSET_DELIVERY_TYPES = {
  UPLOAD: "upload",
  PRIVATE: "private",
  AUTHENTICATED: "authenticated",
} as const;

export const ASSET_DELIVERY_TYPE_LIST = Object.values(ASSET_DELIVERY_TYPES);
export type AssetDeliveryType = (typeof ASSET_DELIVERY_TYPES)[keyof typeof ASSET_DELIVERY_TYPES];
