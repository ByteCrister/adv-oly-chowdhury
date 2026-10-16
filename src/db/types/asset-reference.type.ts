import { Document, Types } from "mongoose";
import { AssetOwnerType, AssetPurpose } from "@/const/asset-reference.const";

export interface IAssetReference {
  assetId: Types.ObjectId;
  ownerType: AssetOwnerType;
  ownerId: Types.ObjectId;
  purpose?: AssetPurpose | string | null;
  caption?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAssetReferenceDocument extends IAssetReference, Document<Types.ObjectId> {}
