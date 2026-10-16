import mongoose, { Schema, Model } from "mongoose";
import { COLLECTIONS, MODELS } from "@/const/collection.const";
import {
  ASSET_RESOURCE_TYPE_LIST,
  ASSET_RESOURCE_TYPES,
  ASSET_DELIVERY_TYPE_LIST,
  ASSET_DELIVERY_TYPES,
} from "@/const/asset.const";
import { IAssetDocument } from "@/db/types/asset.type";

const assetSchema = new Schema<IAssetDocument>(
  {
    cloudinaryAssetId: {
      type: String,
      required: [true, "Cloudinary asset ID is required"],
      unique: true,
      trim: true,
      index: true,
    },
    publicId: {
      type: String,
      required: [true, "Cloudinary public ID is required"],
      trim: true,
      index: true,
    },
    resourceType: {
      type: String,
      enum: {
        values: ASSET_RESOURCE_TYPE_LIST,
        message: "{VALUE} is not a valid resource type",
      },
      default: ASSET_RESOURCE_TYPES.RAW,
      required: true,
      index: true,
    },
    deliveryType: {
      type: String,
      enum: {
        values: ASSET_DELIVERY_TYPE_LIST,
        message: "{VALUE} is not a valid delivery type",
      },
      default: ASSET_DELIVERY_TYPES.UPLOAD,
      required: true,
    },
    format: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
    },
    originalFilename: {
      type: String,
      trim: true,
      default: null,
    },
    displayName: {
      type: String,
      trim: true,
      default: null,
    },
    secureUrl: {
      type: String,
      required: [true, "Secure URL is required"],
      trim: true,
    },
    version: {
      type: Number,
      default: null,
    },
    bytes: {
      type: Number,
      required: [true, "File size in bytes is required"],
    },
    width: {
      type: Number,
      default: null,
    },
    height: {
      type: Number,
      default: null,
    },
    pages: {
      type: Number,
      default: null,
    },
    etag: {
      type: String,
      default: null,
    },
    assetFolder: {
      type: String,
      trim: true,
      default: null,
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: MODELS.USER,
      default: null,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: COLLECTIONS.ASSETS,
  }
);

// Indexes
assetSchema.index({ cloudinaryAssetId: 1 }, { unique: true });
assetSchema.index({ publicId: 1 });
assetSchema.index({ uploadedBy: 1, createdAt: -1 });

export const Asset: Model<IAssetDocument> =
  (mongoose.models[MODELS.ASSET] as Model<IAssetDocument>) ||
  mongoose.model<IAssetDocument>(MODELS.ASSET, assetSchema, COLLECTIONS.ASSETS);

export default Asset;
