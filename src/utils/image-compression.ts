/**
 * Client-Side Image Compression & Optimization Utility
 *
 * Designed for advocate profile headshots and legal media attachments.
 * Uses native HTML5 Canvas and Blob APIs to optimize image resolution
 * and byte weight substantially while preserving crisp sharpness and visual quality.
 */

export interface CompressImageOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.0 to 1.0 (recommended: 0.82 - 0.88 for headshots)
  maxSizeBytes?: number;
  targetMimeType?: "image/jpeg" | "image/webp" | "image/png";
}

export interface CompressionResult {
  file: File;
  originalSizeBytes: number;
  compressedSizeBytes: number;
  compressionRatio: number; // e.g. 0.75 for 75% size reduction
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  didCompress: boolean;
}

/**
 * Checks if a given file is a compressable raster image format.
 * SVGs and animated GIFs are bypassed to prevent losing vectors/frames.
 */
export function isCompressableImage(file: File): boolean {
  const mime = file.type.toLowerCase();
  return (
    mime === "image/jpeg" ||
    mime === "image/jpg" ||
    mime === "image/png" ||
    mime === "image/webp"
  );
}

/**
 * Calculates responsive bounding dimensions preserving original aspect ratio.
 */
export function calculateAspectRatioFit(
  srcWidth: number,
  srcHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  const ratio = Math.min(1, maxWidth / srcWidth, maxHeight / srcHeight);
  return {
    width: Math.max(1, Math.round(srcWidth * ratio)),
    height: Math.max(1, Math.round(srcHeight * ratio)),
  };
}

/**
 * Loads a File into an HTMLImageElement asynchronously.
 */
function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load image file into browser element"));
    };

    img.src = objectUrl;
  });
}

/**
 * Compresses an image file substantially using HTML5 Canvas rendering.
 *
 * - Resizes large camera photos (e.g. 4000x3000) to optimal avatar dimensions (e.g. 1024x1024)
 * - Applies bicubic image smoothing for portrait clarity
 * - Encodes with fine-tuned quality compression
 * - Preserves original MIME type (or converts PNG with alpha or WebP)
 * - Reverts to original file if compression does not yield smaller size
 */
export async function compressImage(
  file: File,
  options: CompressImageOptions = {}
): Promise<CompressionResult> {
  const {
    maxWidth = 1024,
    maxHeight = 1024,
    quality = 0.85,
    maxSizeBytes = 300 * 1024, // 300 KB target threshold
    targetMimeType,
  } = options;

  const originalSizeBytes = file.size;

  // Bypass non-compressable images (SVG, GIF, non-images)
  if (!isCompressableImage(file)) {
    return {
      file,
      originalSizeBytes,
      compressedSizeBytes: originalSizeBytes,
      compressionRatio: 0,
      width: 0,
      height: 0,
      originalWidth: 0,
      originalHeight: 0,
      didCompress: false,
    };
  }

  // If file is already smaller than target threshold and dimensions are small, avoid unnecessary re-encoding
  const img = await loadImageFromFile(file);
  const originalWidth = img.naturalWidth || img.width;
  const originalHeight = img.naturalHeight || img.height;

  const targetDim = calculateAspectRatioFit(
    originalWidth,
    originalHeight,
    maxWidth,
    maxHeight
  );

  // If image is already smaller than max dimensions and size is below 250KB, keep as is
  if (
    originalWidth <= maxWidth &&
    originalHeight <= maxHeight &&
    originalSizeBytes <= maxSizeBytes
  ) {
    return {
      file,
      originalSizeBytes,
      compressedSizeBytes: originalSizeBytes,
      compressionRatio: 0,
      width: originalWidth,
      height: originalHeight,
      originalWidth,
      originalHeight,
      didCompress: false,
    };
  }

  // Render on offscreen canvas with high-quality smoothing
  const canvas = document.createElement("canvas");
  canvas.width = targetDim.width;
  canvas.height = targetDim.height;

  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) {
    throw new Error("Unable to obtain 2D canvas context for image compression");
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // Draw image scaled
  ctx.drawImage(img, 0, 0, targetDim.width, targetDim.height);

  // Determine output MIME type
  const outMimeType = targetMimeType || file.type || "image/jpeg";

  // Convert canvas to blob
  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error("Canvas blob generation failed"));
      },
      outMimeType,
      quality
    );
  });

  // If the compressed output is not smaller, keep original file
  if (blob.size >= originalSizeBytes && originalWidth <= maxWidth && originalHeight <= maxHeight) {
    return {
      file,
      originalSizeBytes,
      compressedSizeBytes: originalSizeBytes,
      compressionRatio: 0,
      width: originalWidth,
      height: originalHeight,
      originalWidth,
      originalHeight,
      didCompress: false,
    };
  }

  // Construct new File with original name and last modified
  const compressedFile = new File([blob], file.name, {
    type: outMimeType,
    lastModified: Date.now(),
  });

  const compressionRatio = Math.max(
    0,
    (originalSizeBytes - compressedFile.size) / originalSizeBytes
  );

  return {
    file: compressedFile,
    originalSizeBytes,
    compressedSizeBytes: compressedFile.size,
    compressionRatio,
    width: targetDim.width,
    height: targetDim.height,
    originalWidth,
    originalHeight,
    didCompress: true,
  };
}

/**
 * Human-readable byte size formatter (e.g. "1.8 MB", "145 KB")
 */
export function formatByteSize(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const unit = units[i] || "B";
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${unit}`;
}
