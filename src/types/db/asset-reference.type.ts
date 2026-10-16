import { Document, Types } from "mongoose";
import { AssetOwnerType, AssetPurpose } from "@/const/asset-reference.const";
import { IAsset } from "./asset.type";

export interface IAssetReference {
  _id: Types.ObjectId;
  assetId: Types.ObjectId | IAsset;
  uploadedBy?: Types.ObjectId | null;
  originalFileName?: string | null;
  description?: string | null;
  ownerType: AssetOwnerType;
  ownerId?: Types.ObjectId | null;
  purpose?: AssetPurpose | string | null;
  caption?: string | null;
  deletedAt?: Date | null; // Soft-delete marker: null = active, Date = deleted
  createdAt: Date;
  updatedAt: Date;
}

export interface IAssetReferenceDocument extends IAssetReference, Document<Types.ObjectId> {}
