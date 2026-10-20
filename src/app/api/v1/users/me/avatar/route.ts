import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { UploadApiResponse } from "cloudinary";
import { getUserId } from "@/lib/auth/auth.helper";
import { withErrorHandler, ApiError } from "@/lib/helpers/withErrorHandler";
import User from "@/db/models/User.model";
import { Asset } from "@/db/models/Asset.model";
import { AssetReference } from "@/db/models/AssetReference.model";
import { cloudinary } from "@/lib/services/cloudinary.service";
import { env } from "@/config/env";
import {
  ASSET_TYPES,
  ASSET_STATUSES,
  ASSET_RESOURCE_TYPES,
  ASSET_DELIVERY_TYPES,
} from "@/const/asset.const";
import {
  ASSET_OWNER_TYPES,
  ASSET_PURPOSES,
} from "@/const/asset-reference.const";
import { formatUserResponse, RawUserRecord } from "../route";
import { revalidateLandingCache } from "@/lib/landing";
import {
  recordAuditLog,
  AUDIT_ACTIONS,
  AUDIT_ENTITY_TYPES,
} from "@/lib/helpers/audit.helper";

const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

/**
 * POST /api/v1/users/me/avatar
 * Server-side multipart endpoint for uploading advocate headshot.
 * Enforces 2 MB limit, computes SHA-256 deduplication, uploads to Cloudinary,
 * creates Asset & AssetReference, and binds to User.profileAssetReferenceId.
 */
export const POST = withErrorHandler(async (req: NextRequest) => {
  const userId = await getUserId();

  const formData = await req.formData();
  const file = (formData.get("file") || formData.get("avatar")) as File | null;

  if (!file) {
    throw ApiError.badRequest("No image file provided in form-data payload.");
  }

  // 1. File size validation (<= 2 MB)
  if (file.size > MAX_AVATAR_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    throw ApiError.badRequest(
      `Image size (${sizeMb} MB) exceeds maximum permitted limit of 2 MB.`
    );
  }

  // 2. MIME type validation
  const mimeType = file.type.toLowerCase();
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw ApiError.badRequest(
      `File format "${file.type}" is not supported. Please upload a JPEG, PNG, or WebP photo.`
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // 3. Compute SHA-256 hash for deduplication
  const fileHash = crypto.createHash("sha256").update(buffer).digest("hex");

  let targetAssetId;

  // 4. Check for existing physical asset in database (Zero-byte Deduplication)
  const existingAsset = await Asset.findOne({
    fileHash,
    assetType: ASSET_TYPES.IMAGE,
    status: ASSET_STATUSES.READY,
  });

  if (existingAsset) {
    targetAssetId = existingAsset._id;
  } else {
    // 5. Upload buffer to Cloudinary CDN
    const folder = `${env.CLOUDINARY_FOLDER_NAME}/image`;
    const uploadResult = await new Promise<UploadApiResponse>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: "image",
        },
        (error, result) => {
          if (error || !result) {
            reject(error || new Error("Failed to upload avatar to Cloudinary"));
          } else {
            resolve(result);
          }
        }
      );
      uploadStream.end(buffer);
    });

    // 6. Create physical Asset record
    const createdAsset = await Asset.create({
      fileHash,
      assetType: ASSET_TYPES.IMAGE,
      mimeType,
      status: ASSET_STATUSES.READY,
      cloudinaryAssetId: uploadResult.public_id,
      publicId: uploadResult.public_id,
      resourceType: ASSET_RESOURCE_TYPES.IMAGE,
      deliveryType: ASSET_DELIVERY_TYPES.UPLOAD,
      format: uploadResult.format || null,
      originalFilename: file.name,
      displayName: file.name,
      secureUrl: uploadResult.secure_url,
      version: uploadResult.version || null,
      bytes: uploadResult.bytes || file.size,
      width: uploadResult.width || null,
      height: uploadResult.height || null,
      uploadedBy: userId,
    });

    targetAssetId = createdAsset._id;
  }

  // 7. Create logical AssetReference document
  const assetReference = await AssetReference.create({
    assetId: targetAssetId,
    uploadedBy: userId,
    originalFileName: file.name,
    ownerType: ASSET_OWNER_TYPES.USER,
    ownerId: userId,
    purpose: ASSET_PURPOSES.PROFILE_IMAGE,
    caption: "Advocate Profile Headshot",
  });

  // 8. Soft-delete previous AssetReference if replacing an existing avatar
  const existingUser = await User.findById(userId).select("profileAssetReferenceId");
  if (
    existingUser?.profileAssetReferenceId &&
    String(existingUser.profileAssetReferenceId) !== String(assetReference._id)
  ) {
    await AssetReference.findByIdAndUpdate(existingUser.profileAssetReferenceId, {
      deletedAt: new Date(),
    });
  }

  // 9. Bind AssetReference ID to User profile
  const updatedUser = (await User.findByIdAndUpdate(
    userId,
    { $set: { profileAssetReferenceId: assetReference._id } },
    { new: true }
  )
    .populate({
      path: "profileAssetReferenceId",
      populate: {
        path: "assetId",
      },
    })
    .populate({
      path: "signatureAssetReferenceId",
      populate: {
        path: "assetId",
      },
    })
    .populate("signatureAssetId")
    .lean()) as RawUserRecord | null;

  if (!updatedUser) {
    throw ApiError.notFound("User account not found.");
  }

  // Invalidate landing page cache and prerendered route following avatar upload
  revalidateLandingCache();

  await recordAuditLog({
    req,
    userId,
    action: AUDIT_ACTIONS.UPDATE,
    entityType: AUDIT_ENTITY_TYPES.USER,
    entityId: userId,
    oldValues: { profileAssetReferenceId: existingUser?.profileAssetReferenceId || null },
    newValues: { profileAssetReferenceId: assetReference._id },
    description: "Uploaded and linked new profile avatar",
  });

  const formattedData = formatUserResponse(updatedUser);

  return NextResponse.json(
    {
      success: true,
      message: "Profile avatar uploaded and linked successfully.",
      data: formattedData,
    },
    { status: 200 }
  );
});

/**
 * DELETE /api/v1/users/me/avatar
 * Removes the advocate profile headshot by unlinking profileAssetReferenceId
 * and soft-deletes the previous AssetReference.
 */
export const DELETE = withErrorHandler(async (req: NextRequest) => {
  const userId = await getUserId();

  // Find existing profile asset reference and soft-delete it
  const existingUser = await User.findById(userId).select("profileAssetReferenceId");
  const prevProfileRefId = existingUser?.profileAssetReferenceId || null;
  if (prevProfileRefId) {
    await AssetReference.findByIdAndUpdate(prevProfileRefId, {
      deletedAt: new Date(),
    });
  }

  await User.findByIdAndUpdate(userId, {
    $set: { profileAssetReferenceId: null },
  });

  await recordAuditLog({
    req,
    userId,
    action: AUDIT_ACTIONS.UPDATE,
    entityType: AUDIT_ENTITY_TYPES.USER,
    entityId: userId,
    oldValues: { profileAssetReferenceId: prevProfileRefId },
    newValues: { profileAssetReferenceId: null },
    description: "Removed profile avatar and unlinked asset reference",
  });

  // Invalidate landing page cache and prerendered route following avatar deletion
  revalidateLandingCache();

  return NextResponse.json(
    {
      success: true,
      message: "Profile avatar removed and asset reference soft-deleted successfully.",
      data: null,
    },
    { status: 200 }
  );
});
