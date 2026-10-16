import { Document, Types } from "mongoose";
import { AssetResourceType, AssetDeliveryType } from "@/const/asset.const";

export interface IAsset {
  cloudinaryAssetId: string; // Immutable Cloudinary asset ID
  publicId: string; // Cloudinary public_id used for delivery URLs
  resourceType: AssetResourceType;
  deliveryType: AssetDeliveryType | string;
  format?: string | null; // e.g. "pdf", "jpg", "docx"
  originalFilename?: string | null;
  displayName?: string | null;
  secureUrl: string;
  version?: number | null;
  bytes: number; // File size in bytes
  width?: number | null;
  height?: number | null;
  pages?: number | null; // Document page count if available
  etag?: string | null;
  assetFolder?: string | null;
  uploadedBy?: Types.ObjectId | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAssetDocument extends IAsset, Document<Types.ObjectId> {}
