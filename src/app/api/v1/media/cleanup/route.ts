import { NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/helpers/withErrorHandler";
import { Asset } from "@/db/models/Asset.model";
import { AssetReference } from "@/db/models/AssetReference.model";
import { User } from "@/db/models/User.model";
import { CaseDocument } from "@/db/models/CaseDocument.model";
import { ClientDocument } from "@/db/models/ClientDocument.model";
import { CaseExpense } from "@/db/models/CaseExpense.model";
import { ClientPayment } from "@/db/models/ClientPayment.model";
import { CaseEvent } from "@/db/models/CaseEvent.model";
import { deleteFromCloudinary } from "@/lib/services/cloudinary.service";
import { ASSET_STATUSES } from "@/const/asset.const";
import { CleanupApiResponse } from "@/types/media.types";

export const POST = withErrorHandler(async () => {
  // 1. Scan all physical assets marked as ready
  const assets = await Asset.find({ status: ASSET_STATUSES.READY });
  let deletedCount = 0;
  const scannedCount = assets.length;

  for (const asset of assets) {
    // 2. Count active (non-soft-deleted) AssetReference records
    const activeRefCounts = await AssetReference.countDocuments({
      assetId: asset._id,
      deletedAt: null,
    });

    if (activeRefCounts > 0) {
      continue;
    }

    // 3. Safety Check: Verify no other system model has a direct reference
    const [
      userRef,
      caseDocRef,
      clientDocRef,
      expenseRef,
      paymentRef,
      eventRef,
    ] = await Promise.all([
      User.exists({
        $or: [{ profileAssetId: asset._id }, { signatureAssetId: asset._id }],
      }),
      CaseDocument.exists({ assetId: asset._id }),
      ClientDocument.exists({ assetId: asset._id }),
      CaseExpense.exists({ receiptAssetId: asset._id }),
      ClientPayment.exists({ receiptAssetId: asset._id }),
      CaseEvent.exists({ attachmentAssetId: asset._id }),
    ]);

    const hasAnyDirectEntityRef = Boolean(
      userRef ||
        caseDocRef ||
        clientDocRef ||
        expenseRef ||
        paymentRef ||
        eventRef
    );

    if (hasAnyDirectEntityRef) {
      continue;
    }

    // 4. Zero references exist: Destroy from Cloudinary and mark as deleted
    try {
      await deleteFromCloudinary(
        asset.publicId,
        asset.resourceType as "image" | "video" | "raw" | "auto"
      );
      asset.status = ASSET_STATUSES.DELETED;
      await asset.save();
      deletedCount++;
    } catch (err: unknown) {
      console.error(
        `Failed to delete Cloudinary asset ${asset.publicId} during cleanup:`,
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
