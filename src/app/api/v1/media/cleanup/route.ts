import { NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/helpers/withErrorHandler";
import { Asset } from "@/db/models/Asset.model";
import { AssetReference } from "@/db/models/AssetReference.model";
import { User } from "@/db/models/User.model";
import { deleteFromCloudinary } from "@/lib/services/cloudinary.service";
import { ASSET_STATUSES } from "@/const/asset.const";
import { CleanupApiResponse } from "@/types/media.types";
import { getOneMonthRetentionCutoff } from "@/lib/helpers/cron.helper";

export const POST = withErrorHandler(async () => {
  const cutoffDate = getOneMonthRetentionCutoff();

  // Scan physical assets that have completed the 1-month retention period
  const assets = await Asset.find({
    status: ASSET_STATUSES.READY,
    createdAt: { $lte: cutoffDate },
  }).limit(50);

  let deletedCount = 0;
  const scannedCount = assets.length;

  for (const asset of assets) {
    // 1. Check whether any AssetReference records exist (active or within retention window)
    const refCount = await AssetReference.countDocuments({ assetId: asset._id });
    if (refCount > 0) {
      continue;
    }

    // 2. Check direct model references
    const userRef = await User.exists({ signatureAssetId: asset._id });
    if (userRef) {
      continue;
    }

    // 3. Atomically transition status to DELETED
    const claimed = await Asset.findOneAndUpdate(
      {
        _id: asset._id,
        status: ASSET_STATUSES.READY,
        createdAt: { $lte: cutoffDate },
      },
      { $set: { status: ASSET_STATUSES.DELETED } },
      { new: true }
    );

    if (!claimed) {
      continue;
    }

    // Recheck references inside claimed state
    const postClaimRefCount = await AssetReference.countDocuments({
      assetId: claimed._id,
    });
    if (postClaimRefCount > 0) {
      await Asset.updateOne(
        { _id: claimed._id },
        { $set: { status: ASSET_STATUSES.READY } }
      );
      continue;
    }

    // 4. Destroy on Cloudinary
    try {
      const cloudRes = await deleteFromCloudinary(
        claimed.publicId,
        claimed.resourceType as "image" | "video" | "raw" | "auto"
      );

      if (cloudRes.result === "ok" || cloudRes.result === "not found") {
        await Asset.deleteOne({
          _id: claimed._id,
          status: ASSET_STATUSES.DELETED,
        });
        deletedCount++;
      }
    } catch (err: unknown) {
      console.error(
        `Failed to delete Cloudinary asset ${claimed.publicId} during cleanup:`,
        err
      );
    }
  }

  const response: CleanupApiResponse = {
    success: true,
    deletedCount,
    scannedCount,
    message: `Cleanup completed. ${deletedCount} unreferenced assets purged from Cloudinary.`,
  };

  return NextResponse.json(response);
});
