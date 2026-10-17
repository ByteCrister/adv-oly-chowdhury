import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getAuthSession } from "@/lib/auth/auth.helper";
import { withErrorHandler, ApiError } from "@/lib/helpers/withErrorHandler";
import ConnectDB from "@/config/db";
import User from "@/db/models/User.model";
// Ensure models are registered in Mongoose schema cache for nested populate
import "@/db/models/Asset.model";
import { AssetReference } from "@/db/models/AssetReference.model";
import { profileUpdateSchema } from "@/utils/zod";
import type { ProfileAvatarDto, ProfileSignatureDto } from "@/types/profile.ui.type";

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

  return {
    ...user,
    avatarUrl,
    avatar,
    signatureUrl,
    signature,
  };
}

export const GET = withErrorHandler(async () => {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    throw ApiError.unauthorized("Unauthorized");
  }

  await ConnectDB();

  const user = (await User.findById(session.user.id)
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

  if (!user || user.isActive === false) {
    throw ApiError.notFound("User account not found or inactive.");
  }

  const formattedData = formatUserResponse(user);
  return NextResponse.json({ success: true, data: formattedData }, { status: 200 });
});

export const PATCH = withErrorHandler(async (req: NextRequest) => {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    throw ApiError.unauthorized("Unauthorized");
  }

  const body = await req.json();
  const updateData = profileUpdateSchema.parse(body);

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

  await ConnectDB();

  if (profileAssetRefId !== undefined) {
    const targetProfileRef =
      profileAssetRefId && mongoose.Types.ObjectId.isValid(profileAssetRefId)
        ? new mongoose.Types.ObjectId(profileAssetRefId)
        : null;

    // Check if user currently has an existing profileAssetReferenceId
    const existingUser = await User.findById(session.user.id).select("profileAssetReferenceId");
    const prevProfileRefId = existingUser?.profileAssetReferenceId;

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

    const existingUser = await User.findById(session.user.id).select("signatureAssetReferenceId");
    const prevSigRefId = existingUser?.signatureAssetReferenceId;

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
    session.user.id,
    { $set: updateSet },
    { new: true, runValidators: true }
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
