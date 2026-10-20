import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import mongoose from "mongoose";
import { withErrorHandler } from "@/lib/helpers/withErrorHandler";
import { Asset } from "@/db/models/Asset.model";
import { AssetReference } from "@/db/models/AssetReference.model";
import {
  ASSET_STATUSES,
  ASSET_TYPE_LIST,
  AssetType,
  ASSET_RESOURCE_TYPES,
  AssetResourceType,
  ASSET_DELIVERY_TYPES,
} from "@/const/asset.const";

import {
  ASSET_OWNER_TYPES,
  ASSET_OWNER_TYPE_LIST,
  AssetOwnerType,
  ASSET_PURPOSE_LIST,
  AssetPurpose,
} from "@/const/asset-reference.const";
import { FinalizeResultItem } from "@/types/media.types";
import { IAsset } from "@/types/db/asset.type";

const finalizeItemSchema = z.object({
  id: z.string().min(1, "Item ID is required"),
  fileHash: z
    .string()
    .length(64, "fileHash must be a valid 64-character SHA-256 hex string"),
  assetType: z.enum(ASSET_TYPE_LIST as [string, ...string[]]),
  originalFileName: z.string().min(1, "Original file name is required"),
  mimeType: z.string().min(1, "MIME type is required"),
  sizeBytes: z.number().int().positive("Size must be positive"),
  description: z.string().optional(),
  ownerType: z.enum(ASSET_OWNER_TYPE_LIST as [string, ...string[]]).optional(),
  ownerId: z.string().optional(),
  purpose: z.enum(ASSET_PURPOSE_LIST as [string, ...string[]]).optional(),
  caption: z.string().optional(),
  cloudinaryPublicId: z.string().min(1, "Cloudinary public ID is required"),
  cloudinaryUrl: z.string().url("Valid secure URL is required"),
  cloudinaryAssetId: z.string().optional(),
  cloudinaryResourceType: z.string().optional(),
  cloudinaryFormat: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  pages: z.number().optional(),
  etag: z.string().optional(),
  version: z.number().optional(),
});

const finalizeSchema = z.object({
  items: z
    .array(finalizeItemSchema)
    .min(1, "At least one item is required")
    .max(20, "Cannot finalize more than 20 items in a single batch"),
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const body = await req.json();
  const { items } = finalizeSchema.parse(body);

  const userIdHeader = req.headers.get("x-user-id");
  const userId =
    userIdHeader && mongoose.Types.ObjectId.isValid(userIdHeader)
      ? new mongoose.Types.ObjectId(userIdHeader)
      : null;

  const results: FinalizeResultItem[] = [];

  for (const item of items) {
    let targetAssetId: mongoose.Types.ObjectId;
    let targetSecureUrl: string = item.cloudinaryUrl;
    let targetPublicId: string = item.cloudinaryPublicId;

    // 1. Concurrency Check: Check if a concurrent request already created the physical Asset
    const existingAsset = (await Asset.findOne({
      fileHash: item.fileHash,
      assetType: item.assetType as AssetType,
      status: ASSET_STATUSES.READY,
    }).lean()) as IAsset | null;

    if (existingAsset) {
      targetAssetId = existingAsset._id;
      targetSecureUrl = existingAsset.secureUrl;
      targetPublicId = existingAsset.publicId;
    } else {
      // 2. Create the physical Asset record with race-condition error trapping
      try {
        const createdAsset = (await Asset.create({
          fileHash: item.fileHash,
          assetType: item.assetType as AssetType,
          mimeType: item.mimeType,
          status: ASSET_STATUSES.READY,
          cloudinaryAssetId:
            item.cloudinaryAssetId ||
            item.cloudinaryPublicId ||
            `asset_${item.fileHash.substring(0, 20)}`,
          publicId: item.cloudinaryPublicId,
          resourceType:
            (item.cloudinaryResourceType as AssetResourceType) ||
            ASSET_RESOURCE_TYPES.RAW,
          deliveryType: ASSET_DELIVERY_TYPES.UPLOAD,
          format: item.cloudinaryFormat || null,
          originalFilename: item.originalFileName,
          displayName: item.originalFileName,
          secureUrl: item.cloudinaryUrl,
          version: item.version || null,
          bytes: item.sizeBytes,
          width: item.width || null,
          height: item.height || null,
          pages: item.pages || null,
          etag: item.etag || null,
          uploadedBy: userId,
        })) as unknown as IAsset;

        targetAssetId = createdAsset._id;
      } catch (err: unknown) {
        // Handle race-condition MongoDB duplicate key (E11000)
        if (
          typeof err === "object" &&
          err !== null &&
          "code" in err &&
          (err as { code?: number }).code === 11000
        ) {
          const fallbackAsset = (await Asset.findOne({
            fileHash: item.fileHash,
            assetType: item.assetType as AssetType,
            status: ASSET_STATUSES.READY,
          }).lean()) as IAsset | null;

          if (!fallbackAsset) {
            throw err;
          }

          targetAssetId = fallbackAsset._id;
          targetSecureUrl = fallbackAsset.secureUrl;
          targetPublicId = fallbackAsset.publicId;
        } else {
          throw err;
        }
      }
    }

    // 3. Create the logical AssetReference document
    const reference = await AssetReference.create({
      assetId: targetAssetId,
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
      fileId: reference._id.toString(),
      url: targetSecureUrl,
      assetId: targetAssetId.toString(),
      publicId: targetPublicId,
    });
  }

  return NextResponse.json({
    success: true,
    results,
  });
});
