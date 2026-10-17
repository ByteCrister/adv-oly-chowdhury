import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { withErrorHandler } from "@/lib/helpers/withErrorHandler";
import { sanitizeSearchParam, buildSearchRegex } from "@/lib/helpers/search.helper";
import { AssetReference } from "@/db/models/AssetReference.model";
import { Asset } from "@/db/models/Asset.model";
import { MediaItemDto, MediaPaginationResponse } from "@/types/media.types";
import { IAsset } from "@/types/db/asset.type";
import { AssetType } from "@/const/asset.const";
import { AssetPurpose } from "@/const/asset-reference.const";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);

  const search = sanitizeSearchParam(searchParams.get("search"));
  const assetType = searchParams.get("assetType");
  const ownerType = searchParams.get("ownerType");
  const ownerId = searchParams.get("ownerId");
  const purpose = searchParams.get("purpose");
  const includeDeleted = searchParams.get("includeDeleted") === "true";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
  const sortParam = searchParams.get("sort") || "newest";

  // Build Filter Query
  const filter: Record<string, unknown> = {};

  if (!includeDeleted) {
    filter.deletedAt = null;
  }

  if (ownerType) {
    filter.ownerType = ownerType;
  }

  if (ownerId && mongoose.Types.ObjectId.isValid(ownerId)) {
    filter.ownerId = new mongoose.Types.ObjectId(ownerId);
  }

  if (purpose) {
    filter.purpose = purpose;
  }

  if (search) {
    const searchRegex = buildSearchRegex(search);
    if (searchRegex) {
      filter.$or = [
        { originalFileName: searchRegex },
        { description: searchRegex },
        { caption: searchRegex },
      ];
    }
  }

  // Determine Sorting
  let sortOption: Record<string, 1 | -1> = { createdAt: -1 };
  if (sortParam === "oldest") sortOption = { createdAt: 1 };
  if (sortParam === "name") sortOption = { originalFileName: 1 };

  // If assetType filter is specified, we also filter matching Asset IDs
  if (assetType) {
    const matchingAssets = (await Asset.find({
      assetType: assetType as AssetType,
    })
      .select("_id")
      .lean()) as unknown as { _id: mongoose.Types.ObjectId }[];

    const matchingAssetIds = matchingAssets.map((a) => a._id);
    filter.assetId = { $in: matchingAssetIds };
  }

  const skip = (page - 1) * limit;

  const [total, references] = await Promise.all([
    AssetReference.countDocuments(filter),
    AssetReference.find(filter)
      .sort(sortOption)
      .skip(skip)
      .limit(limit)
      .populate<{ assetId: IAsset }>("assetId")
      .populate<{ uploadedBy: { _id: mongoose.Types.ObjectId; name: string; email: string } }>(
        "uploadedBy",
        "name email"
      )
      .lean(),
  ]);

  const items: MediaItemDto[] = references.map((ref) => {
    const asset = ref.assetId as unknown as IAsset;
    return {
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
  });

  const response: MediaPaginationResponse = {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    hasMore: page * limit < total,
  };

  return NextResponse.json(response);
});
