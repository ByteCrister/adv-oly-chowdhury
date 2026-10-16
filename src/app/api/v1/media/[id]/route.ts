import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { withErrorHandler, ApiError } from "@/lib/helpers/withErrorHandler";
import { AssetReference } from "@/db/models/AssetReference.model";
import { IAsset } from "@/types/db/asset.type";
import { MediaItemDto } from "@/types/media.types";
import { AssetPurpose } from "@/const/asset-reference.const";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export const GET = withErrorHandler(
  async (req: NextRequest, { params }: RouteParams) => {
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest("Invalid media ID format");
    }

    const ref = await AssetReference.findById(id)
      .populate<{ assetId: IAsset }>("assetId")
      .populate<{ uploadedBy: { _id: mongoose.Types.ObjectId; name: string; email: string } }>(
        "uploadedBy",
        "name email"
      )
      .lean();

    if (!ref) {
      throw ApiError.notFound("Media reference not found");
    }

    const asset = ref.assetId as unknown as IAsset;
    const dto: MediaItemDto = {
      id: ref._id.toString(),
      fileId: ref._id.toString(),
      assetId: asset?._id ? asset._id.toString() : String(ref.assetId),
      url: asset?.secureUrl || "",
      publicId: asset?.publicId || "",
      originalFileName: ref.originalFileName || asset?.originalFilename || "Untitled",
      description: ref.description,
      assetType: asset?.assetType || "other",
      resourceType: asset?.resourceType || "raw",
      mimeType: asset?.mimeType || "application/octet-stream",
      sizeBytes: asset?.bytes || 0,
      width: asset?.width,
      height: asset?.height,
      pages: asset?.pages,
      format: asset?.format,
      ownerType: ref.ownerType,
      ownerId: ref.ownerId ? ref.ownerId.toString() : null,
      purpose: (ref.purpose as AssetPurpose) || null,
      caption: ref.caption,
      uploadedBy: ref.uploadedBy
        ? {
            id: ref.uploadedBy._id.toString(),
            name: ref.uploadedBy.name,
            email: ref.uploadedBy.email,
          }
        : null,
      createdAt: ref.createdAt ? new Date(ref.createdAt).toISOString() : "",
      updatedAt: ref.updatedAt ? new Date(ref.updatedAt).toISOString() : "",
      deletedAt: ref.deletedAt ? new Date(ref.deletedAt).toISOString() : null,
    };

    return NextResponse.json(dto);
  }
);

export const DELETE = withErrorHandler(
  async (req: NextRequest, { params }: RouteParams) => {
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest("Invalid media ID format");
    }

    const ref = await AssetReference.findById(id);
    if (!ref) {
      throw ApiError.notFound("Media reference not found");
    }

    // Soft delete the logical reference
    ref.deletedAt = new Date();
    await ref.save();

    return NextResponse.json({
      success: true,
      message: "Media reference soft deleted successfully",
      id: ref._id.toString(),
      deletedAt: ref.deletedAt.toISOString(),
    });
  }
);
