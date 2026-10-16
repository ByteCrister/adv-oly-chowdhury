import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import mongoose from "mongoose";
import { withErrorHandler } from "@/lib/helpers/withErrorHandler";
import { Asset } from "@/db/models/Asset.model";
import { AssetReference } from "@/db/models/AssetReference.model";
import { generateSignature } from "@/lib/services/cloudinary.service";
import {
  ASSET_TYPES,
  ASSET_TYPE_LIST,
  AssetType,
  MAX_MEDIA_SIZE_BYTES,
} from "@/const/asset.const";
import {
  ASSET_OWNER_TYPES,
  ASSET_OWNER_TYPE_LIST,
  AssetOwnerType,
  ASSET_PURPOSE_LIST,
  AssetPurpose,
} from "@/const/asset-reference.const";
import { env } from "@/config/env";
import { PrepareResultItem } from "@/types/media.types";
import { IAsset } from "@/types/db/asset.type";

const prepareItemSchema = z.object({
  id: z.string().min(1, "Item ID is required"),
  fileHash: z
    .string()
    .length(64, "fileHash must be a valid 64-character SHA-256 hex string"),
  assetType: z.enum(ASSET_TYPE_LIST as [string, ...string[]]),
  originalFileName: z.string().min(1, "Original file name is required"),
  mimeType: z.string().min(1, "MIME type is required"),
  sizeBytes: z
    .number()
    .int()
    .positive("Size must be positive")
    .max(MAX_MEDIA_SIZE_BYTES, `File size exceeds the limit of ${MAX_MEDIA_SIZE_BYTES / (1024 * 1024)}MB`),
  description: z.string().optional(),
  ownerType: z.enum(ASSET_OWNER_TYPE_LIST as [string, ...string[]]).optional(),
  ownerId: z.string().optional(),
  purpose: z.enum(ASSET_PURPOSE_LIST as [string, ...string[]]).optional(),
  caption: z.string().optional(),
});

const prepareSchema = z.object({
  items: z
    .array(prepareItemSchema)
    .min(1, "At least one item is required")
    .max(20, "Cannot process more than 20 items in a single batch"),
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const body = await req.json();
  const { items } = prepareSchema.parse(body);

  const userIdHeader = req.headers.get("x-user-id");
  const userId =
    userIdHeader && mongoose.Types.ObjectId.isValid(userIdHeader)
      ? new mongoose.Types.ObjectId(userIdHeader)
      : null;

  const results: PrepareResultItem[] = [];

  for (const item of items) {
    // 1. Zero-byte Deduplication Query: Search for existing Asset by SHA-256 hash & assetType
    const existingAsset = (await Asset.findOne({
      fileHash: item.fileHash,
      assetType: item.assetType as AssetType,
    }).lean()) as IAsset | null;

    if (existingAsset) {
      // 2. Instant Deduplication Hit: Physical asset already exists in Cloudinary!
      const newReference = await AssetReference.create({
        assetId: existingAsset._id,
        uploadedBy: userId,
        originalFileName: item.originalFileName,
        description: item.description || null,
        ownerType: (item.ownerType as AssetOwnerType) || ASSET_OWNER_TYPES.OTHER,
        ownerId:
          item.ownerId && mongoose.Types.ObjectId.isValid(item.ownerId)
            ? new mongoose.Types.ObjectId(item.ownerId)
            : null,
        purpose: (item.purpose as AssetPurpose) || null,
        caption: item.caption || null,
      });

      results.push({
        id: item.id,
        status: "EXISTS",
        fileId: newReference._id.toString(),
        url: existingAsset.secureUrl,
        assetId: existingAsset._id.toString(),
        deduplicated: true,
      });
    } else {
      // 3. New Physical Asset: Generate signed parameters for direct browser upload
      const folder = `${env.CLOUDINARY_FOLDER_NAME}/${item.assetType}`;
      const resourceType =
        item.assetType === ASSET_TYPES.VIDEO
          ? "video"
          : item.assetType === ASSET_TYPES.IMAGE
          ? "image"
          : "auto";

      const uploadParams = generateSignature(
        folder,
        item.originalFileName,
        resourceType
      );

      results.push({
        id: item.id,
        status: "UPLOAD_REQUIRED",
        uploadParams,
        deduplicated: false,
      });
    }
  }

  return NextResponse.json({
    success: true,
    results,
  });
});
