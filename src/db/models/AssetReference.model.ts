import mongoose, { Schema, Model } from "mongoose";
import { COLLECTIONS, MODELS } from "@/const/collection.const";
import {
  ASSET_OWNER_TYPE_LIST,
  ASSET_OWNER_TYPES,
  ASSET_PURPOSE_LIST,
} from "@/const/asset-reference.const";
import { IAssetReferenceDocument } from "@/types/db/asset-reference.type";

const assetReferenceSchema = new Schema<IAssetReferenceDocument>(
  {
    assetId: {
      type: Schema.Types.ObjectId,
      ref: MODELS.ASSET,
      required: [true, "Asset ID is required"],
      index: true,
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: MODELS.USER,
      default: null,
      index: true,
    },
    originalFileName: {
      type: String,
      trim: true,
      default: null,
    },
    description: {
      type: String,
      trim: true,
      default: null,
    },
    ownerType: {
      type: String,
      enum: {
        values: ASSET_OWNER_TYPE_LIST,
        message: "{VALUE} is not a valid asset owner type",
      },
      default: ASSET_OWNER_TYPES.OTHER,
      required: true,
      index: true,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      default: null,
      index: true,
    },
    purpose: {
      type: String,
      enum: {
        values: ASSET_PURPOSE_LIST,
        message: "{VALUE} is not a valid asset purpose",
      },
      default: null,
      index: true,
    },
    caption: {
      type: String,
      trim: true,
      default: null,
    },
    deletedAt: {
      type: Date,
      default: null,
      index: true, // Speeds up queries filtering out soft-deleted items
    },
  },
  {
    timestamps: true,
    collection: COLLECTIONS.ASSET_REFERENCES,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound polymorphic index for instant lookup
assetReferenceSchema.index({ ownerType: 1, ownerId: 1, purpose: 1 });
assetReferenceSchema.index({ assetId: 1, ownerType: 1 });
// Compound index to quickly find active files for a specific asset (needed for garbage cleanup)
assetReferenceSchema.index({ assetId: 1, deletedAt: 1 });
assetReferenceSchema.index({ uploadedBy: 1, deletedAt: 1 });

export const AssetReference: Model<IAssetReferenceDocument> =
  (mongoose.models[MODELS.ASSET_REFERENCE] as Model<IAssetReferenceDocument>) ||
  mongoose.model<IAssetReferenceDocument>(
    MODELS.ASSET_REFERENCE,
    assetReferenceSchema,
    COLLECTIONS.ASSET_REFERENCES
  );

// Backward & blueprint alias
export const FileRecord = AssetReference;

export default AssetReference;

