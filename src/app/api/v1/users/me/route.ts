import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getUserId } from "@/lib/auth/auth.helper";
import { withErrorHandler, ApiError } from "@/lib/helpers/withErrorHandler";
import User from "@/db/models/User.model";
// Ensure models are registered in Mongoose schema cache for nested populate
import "@/db/models/Asset.model";
import { AssetReference } from "@/db/models/AssetReference.model";
import { profileUpdateSchema } from "@/utils/zod";
import type { ProfileAvatarDto, ProfileSignatureDto } from "@/types/profile.ui.type";
import { revalidateLandingCache } from "@/lib/landing";
import {
  recordAuditLog,
  calculateAuditDiff,
  AUDIT_ACTIONS,
  AUDIT_ENTITY_TYPES,
} from "@/lib/helpers/audit.helper";

interface PopulatedAsset {
  _id?: mongoose.Types.ObjectId | string;
  secureUrl?: string;
  publicId?: string;
  originalFilename?: string | null;
  mimeType?: string;
  bytes?: number;
  width?: number | null;
  height?: number | null;
  format?: string | null;
}

interface PopulatedAssetReference {
  _id?: mongoose.Types.ObjectId | string;
  originalFileName?: string | null;
  caption?: string | null;
  purpose?: string | null;
  assetId?: PopulatedAsset | null;
}

export interface RawUserRecord {
  [key: string]: unknown;
  profileAssetReferenceId?: PopulatedAssetReference | null;
  signatureAssetReferenceId?: PopulatedAssetReference | null;
  signatureAssetId?: PopulatedAsset | null;
}

/**
 * Normalizes populated User document by extracting direct Cloudinary URLs
 * and avatar/signature metadata so the UI can consume them directly without
 * traversing multi-level collection relationships.
 */
export function formatUserResponse(user: RawUserRecord) {
  // 1. Resolve Avatar from two-tier AssetReference -> Asset relationship
  const profileRef = user.profileAssetReferenceId;
  const profileAsset =
    profileRef?.assetId && typeof profileRef.assetId === "object"
      ? profileRef.assetId
      : null;

  const avatarUrl = profileAsset?.secureUrl || null;
  const avatar: ProfileAvatarDto | null = profileAsset && profileAsset.secureUrl
    ? {
        url: profileAsset.secureUrl,
        publicId: profileAsset.publicId || null,
        originalFileName: profileRef?.originalFileName || profileAsset.originalFilename || null,
        mimeType: profileAsset.mimeType || null,
        sizeBytes: profileAsset.bytes || 0,
        width: profileAsset.width || null,
        height: profileAsset.height || null,
        format: profileAsset.format || null,
        assetReferenceId: profileRef?._id ? String(profileRef._id) : null,
        assetId: profileAsset._id ? String(profileAsset._id) : null,
      }
    : null;

  // 2. Resolve Signature (supports either AssetReference or direct Asset)
  const sigRef = user.signatureAssetReferenceId;
  const sigFromRef =
    sigRef?.assetId && typeof sigRef.assetId === "object"
      ? sigRef.assetId
      : null;
  const sigDirect =
    user.signatureAssetId && typeof user.signatureAssetId === "object"
      ? user.signatureAssetId
      : null;
  const signatureAsset = sigFromRef || sigDirect;

  const signatureUrl = signatureAsset?.secureUrl || null;
  const signature: ProfileSignatureDto | null = signatureAsset && signatureAsset.secureUrl
    ? {
        url: signatureAsset.secureUrl,
        publicId: signatureAsset.publicId || null,
        mimeType: signatureAsset.mimeType || null,
        sizeBytes: signatureAsset.bytes || 0,
        width: signatureAsset.width || null,
        height: signatureAsset.height || null,
        format: signatureAsset.format || null,
        assetReferenceId: sigRef?._id ? String(sigRef._id) : null,
        assetId: signatureAsset._id ? String(signatureAsset._id) : null,
      }
    : null;

  const profileAssetRefId = profileRef?._id ? String(profileRef._id) : null;
  const signatureAssetRefId = sigRef?._id ? String(sigRef._id) : null;

  return {
    _id: String(user._id),
    name: (user.name as string) || "",
    preferredName: (user.preferredName as string) || (user.name as string) || "",
    title: (user.title as string) || "Advocate",
    subtitle: (user.subtitle as string) || "Advocate • Judge's Court, Sylhet",
    tagline: (user.tagline as string | null) || null,
    email: (user.email as string) || "",
    phone: (user.phone as string | null) || null,
    alternatePhone: (user.alternatePhone as string | null) || null,
    whatsappNumber: (user.whatsappNumber as string | null) || null,
    barCouncilId: (user.barCouncilId as string | null) || null,
    barAssociationMemberNo: (user.barAssociationMemberNo as string | null) || null,
    taxesBarMemberNo: (user.taxesBarMemberNo as string | null) || null,
    chamber: user.chamber || null,
    homeAddress: user.homeAddress || null,
    status: (user.status as string) || "ACTIVE",
    isActive: user.isActive !== false,
    profileAssetReferenceId: profileAssetRefId,
    signatureAssetReferenceId: signatureAssetRefId,
    avatarUrl,
    avatar,
    signatureUrl,
    signature,
    lastLoginAt: user.lastLoginAt || null,
    createdAt: user.createdAt || null,
    updatedAt: user.updatedAt || null,
  };
}

export const GET = withErrorHandler(async () => {
  const userId = await getUserId();

  const user = (await User.findById(userId)
    .select("-passwordHash -__v")
    .populate({
      path: "profileAssetReferenceId",
      select: "_id originalFileName caption purpose assetId",
      populate: {
        path: "assetId",
        select: "_id secureUrl publicId originalFilename mimeType bytes width height format",
      },
    })
    .populate({
      path: "signatureAssetReferenceId",
      select: "_id originalFileName caption purpose assetId",
      populate: {
        path: "assetId",
        select: "_id secureUrl publicId originalFilename mimeType bytes width height format",
      },
    })
    .populate("signatureAssetId", "_id secureUrl publicId originalFilename mimeType bytes width height format")
    .lean()) as RawUserRecord | null;

  if (!user || user.isActive === false) {
    throw ApiError.notFound("User account not found or inactive.");
  }

  const formattedData = formatUserResponse(user);
  return NextResponse.json({ success: true, data: formattedData }, { status: 200 });
});

export const PATCH = withErrorHandler(async (req: NextRequest) => {
  const userId = await getUserId();

  const body = await req.json();
  const updateData = profileUpdateSchema.parse(body);

  const existingUser = (await User.findById(userId).lean()) as RawUserRecord | null;
  if (!existingUser || existingUser.isActive === false) {
    throw ApiError.notFound("User account not found or inactive.");
  }

  // Resolve profile asset reference ID (supports both new profileAssetReferenceId and legacy profileAssetId)
  const profileAssetRefId =
    updateData.profileAssetReferenceId !== undefined
      ? updateData.profileAssetReferenceId
      : updateData.profileAssetId;

  const signatureAssetRefId = updateData.signatureAssetReferenceId;
  const signatureDirectId = updateData.signatureAssetId;

  const updateSet: Record<string, unknown> = {
    name: updateData.name,
    preferredName: updateData.preferredName,
    title: updateData.title,
    subtitle: updateData.subtitle,
    tagline: updateData.tagline,
    phone: updateData.phone,
    alternatePhone: updateData.alternatePhone,
    whatsappNumber: updateData.whatsappNumber,
    barCouncilId: updateData.barCouncilId,
    barAssociationMemberNo: updateData.barAssociationMemberNo,
    taxesBarMemberNo: updateData.taxesBarMemberNo,
    chamber: updateData.chamber,
    homeAddress: updateData.homeAddress,
  };

  if (profileAssetRefId !== undefined) {
    const targetProfileRef =
      profileAssetRefId && mongoose.Types.ObjectId.isValid(profileAssetRefId)
        ? new mongoose.Types.ObjectId(profileAssetRefId)
        : null;

    const prevProfileRefId = existingUser.profileAssetReferenceId as mongoose.Types.ObjectId | null;

    // If changing or removing the avatar, soft-delete the previous AssetReference
    if (
      prevProfileRefId &&
      (!targetProfileRef || String(prevProfileRefId) !== String(targetProfileRef))
    ) {
      await AssetReference.findByIdAndUpdate(prevProfileRefId, {
        deletedAt: new Date(),
      });
    }

    updateSet.profileAssetReferenceId = targetProfileRef;
  }

  if (signatureAssetRefId !== undefined) {
    const targetSigRef =
      signatureAssetRefId && mongoose.Types.ObjectId.isValid(signatureAssetRefId)
        ? new mongoose.Types.ObjectId(signatureAssetRefId)
        : null;

    const prevSigRefId = existingUser.signatureAssetReferenceId as mongoose.Types.ObjectId | null;

    if (
      prevSigRefId &&
      (!targetSigRef || String(prevSigRefId) !== String(targetSigRef))
    ) {
      await AssetReference.findByIdAndUpdate(prevSigRefId, {
        deletedAt: new Date(),
      });
    }

    updateSet.signatureAssetReferenceId = targetSigRef;
  }

  if (signatureDirectId !== undefined) {
    updateSet.signatureAssetId =
      signatureDirectId && mongoose.Types.ObjectId.isValid(signatureDirectId)
        ? new mongoose.Types.ObjectId(signatureDirectId)
        : null;
  }

  const updatedUser = (await User.findByIdAndUpdate(
    userId,
    { $set: updateSet },
    { new: true, runValidators: true }
  )
    .select("-passwordHash -__v")
    .populate({
      path: "profileAssetReferenceId",
      select: "_id originalFileName caption purpose assetId",
      populate: {
        path: "assetId",
        select: "_id secureUrl publicId originalFilename mimeType bytes width height format",
      },
    })
    .populate({
      path: "signatureAssetReferenceId",
      select: "_id originalFileName caption purpose assetId",
      populate: {
        path: "assetId",
        select: "_id secureUrl publicId originalFilename mimeType bytes width height format",
      },
    })
    .populate("signatureAssetId", "_id secureUrl publicId originalFilename mimeType bytes width height format")
    .lean()) as RawUserRecord | null;

  if (!updatedUser) {
    throw ApiError.notFound("User account not found.");
  }

  const diff = calculateAuditDiff(existingUser, updatedUser);
  await recordAuditLog({
    req,
    userId,
    action: AUDIT_ACTIONS.UPDATE,
    entityType: AUDIT_ENTITY_TYPES.USER,
    entityId: userId,
    oldValues: diff.oldValues,
    newValues: diff.newValues,
    description: `Updated profile details for user "${updatedUser.name || updatedUser.email || userId}"`,
  });

  // Invalidate landing page cache and prerendered route following successful profile update
  revalidateLandingCache();

  const formattedData = formatUserResponse(updatedUser);
  return NextResponse.json(
    {
      success: true,
      data: formattedData,
      message: "Profile updated successfully.",
    },
    { status: 200 }
  );
});
