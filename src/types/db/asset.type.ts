import { Document, Types } from "mongoose";
import {
  AssetResourceType,
  AssetDeliveryType,
  AssetType,
  AssetStatus,
} from "@/const/asset.const";

export interface IAsset {
  _id: Types.ObjectId;
  // Deduplication & Logical Classification
  fileHash: string; // 64-character SHA-256 hex string for zero-byte deduplication
  assetType: AssetType; // 'image' | 'video' | 'pdf' | 'docx' | 'other'
  mimeType: string; // e.g. "image/webp", "application/pdf"
  status: AssetStatus; // 'pending' | 'ready' | 'failed' | 'deleted'

  // Cloudinary Identity & URLs
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

  // Virtual / Alias helpers
  sizeBytes?: number;
  cloudinaryPublicId?: string;
  cloudinaryUrl?: string;
  cloudinaryResourceType?: string;
  cloudinaryFormat?: string;
}

export interface IAssetDocument extends IAsset, Document<Types.ObjectId> {}
