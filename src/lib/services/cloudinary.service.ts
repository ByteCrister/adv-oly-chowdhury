import crypto from "crypto";
import { cloudinary } from "@/config/cloudinary";
import { env } from "@/config/env";
import { CloudinarySignedParams } from "@/types/media.types";

export { cloudinary };

/**
 * Generates a cryptographically signed upload payload for direct-to-Cloudinary browser uploads.
 * Ensures the API secret is never exposed to the client.
 *
 * @param folder - Cloudinary folder path (e.g., 'adv-oly-chowdhury/pdf')
 * @param originalFileName - Optional original filename to generate a readable, unique public_id
 * @param resourceType - Optional resource type (e.g. 'auto', 'image', 'raw')
 */
export function generateSignature(
  folder: string,
  originalFileName?: string,
  resourceType: string = "auto"
): CloudinarySignedParams {
  const timestamp = Math.round(new Date().getTime() / 1000);

  const params: Record<string, string | number> = {
    folder,
    timestamp,
  };

  // Generate clean, deterministic, unique public_id
  if (originalFileName) {
    const dotIndex = originalFileName.lastIndexOf(".");
    const nameWithoutExt =
      dotIndex > 0 ? originalFileName.substring(0, dotIndex) : originalFileName;
    const sanitized = nameWithoutExt
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "_")
      .replace(/_+/g, "_")
      .substring(0, 50);
    const randomSuffix = crypto.randomBytes(4).toString("hex");
    params.public_id = `${sanitized}_${randomSuffix}`;
  } else {
    params.public_id = `asset_${crypto.randomBytes(8).toString("hex")}`;
  }

  // Cloudinary signature computation
  const signature = cloudinary.utils.api_sign_request(
    params,
    env.CLOUDINARY_API_SECRET
  );

  return {
    signature,
    timestamp,
    public_id: params.public_id as string,
    api_key: env.CLOUDINARY_API_KEY,
    folder,
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    resource_type: resourceType,
  };
}

/**
 * Permanently removes an asset from Cloudinary CDN storage.
 *
 * @param publicId - Cloudinary public identifier
 * @param resourceType - 'image' | 'video' | 'raw' | 'auto'
 */
export async function deleteFromCloudinary(
  publicId: string,
  resourceType: "image" | "video" | "raw" | "auto" = "auto"
): Promise<{ result: string }> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(
      publicId,
      { resource_type: resourceType, invalidate: true },
      (error, result) => {
        if (error) {
          return reject(error);
        }
        resolve(result as { result: string });
      }
    );
  });
}

/**
 * Generates an optimized, secure Cloudinary delivery URL with transformation presets.
 */
export function getOptimizedUrl(
  publicId: string,
  options?: {
    width?: number;
    height?: number;
    crop?: string;
    quality?: string | number;
    format?: string;
  }
): string {
  return cloudinary.url(publicId, {
    secure: true,
    quality: options?.quality || "auto",
    fetch_format: options?.format || "auto",
    width: options?.width,
    height: options?.height,
    crop: options?.crop || "limit",
  });
}
