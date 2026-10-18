/**
 * Legal & Client Document Compression and Validation Utility
 *
 * Provides:
 * 1. Strict pre-upload file validation (Max 2MB, allowed MIME types / extensions)
 * 2. Client-side canvas compression for scanned image documents (JPEG, PNG, WebP)
 *    compressing high-resolution multi-megabyte photos/scans into lightweight,
 *    tolerable KB sizes (typically 150KB - 400KB) while preserving crisp text readability.
 * 3. Safe pass-through for binary vector documents (PDF, DOCX).
 */

import {
  DOCUMENT_MAX_SIZE_BYTES,
  DOCUMENT_ALLOWED_MIME_TYPES,
  DOCUMENT_ALLOWED_EXTENSIONS,
} from "@/const/document.const";

export interface CompressDocumentOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.0 to 1.0 (recommended: 0.82 for readable legal docs)
  targetMimeType?: "image/webp" | "image/jpeg";
}

export interface DocumentCompressionResult {
  file: File;
  originalSizeBytes: number;
  compressedSizeBytes: number;
  compressionRatio: number;
  didCompress: boolean;
  type: "image" | "pdf" | "docx" | "other";
}

/**
 * Format bytes into human-readable string (e.g., "350 KB", "1.8 MB")
 */
export function formatByteSize(bytes: number): string {
  if (bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Checks whether a given file matches allowed document extensions.
 */
export function hasAllowedExtension(fileName: string): boolean {
  const lowerName = fileName.toLowerCase();
  return (DOCUMENT_ALLOWED_EXTENSIONS as readonly string[]).some((ext) =>
    lowerName.endsWith(ext)
  );
}

/**
 * Determines logical document category for processing.
 */
export function getDocumentCategory(
  file: File
): "image" | "pdf" | "docx" | "other" {
  const mime = file.type.toLowerCase();
  const name = file.name.toLowerCase();

  if (
    mime.startsWith("image/") ||
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg") ||
    name.endsWith(".png") ||
    name.endsWith(".webp")
  ) {
    return "image";
  }

  if (mime === "application/pdf" || name.endsWith(".pdf")) {
    return "pdf";
  }

  if (
    mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mime === "application/msword" ||
    name.endsWith(".docx") ||
    name.endsWith(".doc")
  ) {
    return "docx";
  }

  return "other";
}

/**
 * Validates a document file against strict size (Max 2MB) and format rules.
 * Throws an Error with a user-friendly message if validation fails.
 */
export function validateDocumentFile(
  file: File,
  maxSizeBytes: number = DOCUMENT_MAX_SIZE_BYTES
): void {
  if (!file) {
    throw new Error("No file provided.");
  }

  // 1. Strict Size Check: Max 2MB
  if (file.size > maxSizeBytes) {
    const maxMb = Math.round(maxSizeBytes / (1024 * 1024));
    throw new Error(
      `File "${file.name}" (${formatByteSize(file.size)}) exceeds the maximum permitted size of ${maxMb}MB.`
    );
  }

  // 2. MIME / Extension Format Check
  const isMimeAllowed = (DOCUMENT_ALLOWED_MIME_TYPES as readonly string[]).includes(
    file.type
  );
  const isExtAllowed = hasAllowedExtension(file.name);

  // Pass if either MIME type or extension matches (guards against browser MIME misreporting)
  if (!isMimeAllowed && !isExtAllowed) {
    throw new Error(
      `File "${file.name}" is not a supported format. Please upload PDF, Word (DOC/DOCX), or image files (JPEG, PNG, WebP).`
    );
  }
}

/**
 * Loads an image File into an HTMLImageElement asynchronously.
 */
function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Failed to decode image from "${file.name}".`));
    };

    img.src = objectUrl;
  });
}

/**
 * Compresses an image document to under a tolerable KB size while preserving text legibility.
 */
async function compressImageDocument(
  file: File,
  options?: CompressDocumentOptions
): Promise<DocumentCompressionResult> {
  const originalSizeBytes = file.size;
  const maxWidth = options?.maxWidth ?? 1920;
  const maxHeight = options?.maxHeight ?? 1920;
  const quality = options?.quality ?? 0.82;
  const targetMimeType = options?.targetMimeType ?? "image/webp";

  // Check if browser environment has canvas
  if (typeof window === "undefined" || typeof document === "undefined") {
    return {
      file,
      originalSizeBytes,
      compressedSizeBytes: originalSizeBytes,
      compressionRatio: 0,
      didCompress: false,
      type: "image",
    };
  }

  try {
    const img = await loadImageElement(file);
    const { naturalWidth: srcWidth, naturalHeight: srcHeight } = img;

    // Calculate aspect ratio fit
    const ratio = Math.min(1, maxWidth / srcWidth, maxHeight / srcHeight);
    const targetWidth = Math.max(1, Math.round(srcWidth * ratio));
    const targetHeight = Math.max(1, Math.round(srcHeight * ratio));

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) {
      return {
        file,
        originalSizeBytes,
        compressedSizeBytes: originalSizeBytes,
        compressionRatio: 0,
        didCompress: false,
        type: "image",
      };
    }

    // High quality downscaling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // Fill white background in case source had transparency
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, targetWidth, targetHeight);
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    // Export compressed blob
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), targetMimeType, quality);
    });

    if (!blob) {
      return {
        file,
        originalSizeBytes,
        compressedSizeBytes: originalSizeBytes,
        compressionRatio: 0,
        didCompress: false,
        type: "image",
      };
    }

    // Only use compressed result if it actually reduced file size
    if (blob.size >= originalSizeBytes) {
      return {
        file,
        originalSizeBytes,
        compressedSizeBytes: originalSizeBytes,
        compressionRatio: 0,
        didCompress: false,
        type: "image",
      };
    }

    // Construct new File preserving name with updated extension if changed
    const baseName = file.name.substring(0, file.name.lastIndexOf(".")) || file.name;
    const extension = targetMimeType === "image/webp" ? ".webp" : ".jpg";
    const compressedFileName = `${baseName}${extension}`;

    const compressedFile = new File([blob], compressedFileName, {
      type: targetMimeType,
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
      didCompress: true,
      type: "image",
    };
  } catch {
    // If canvas fails (e.g. corrupted image), fallback safely to original file
    return {
      file,
      originalSizeBytes,
      compressedSizeBytes: originalSizeBytes,
      compressionRatio: 0,
      didCompress: false,
      type: "image",
    };
  }
}

/**
 * Universal document optimization function.
 * - Validates document format and 2MB maximum size.
 * - For raster scans/photos (JPEG, PNG, WebP), compresses them into a lightweight KB size.
 * - For PDF and Word documents, safely validates constraints and passes through intact.
 */
export async function compressDocumentFile(
  file: File,
  options?: CompressDocumentOptions
): Promise<DocumentCompressionResult> {
  // Validate constraints first
  validateDocumentFile(file);

  const category = getDocumentCategory(file);

  if (category === "image") {
    return await compressImageDocument(file, options);
  }

  // PDF or DOCX: pass-through with metadata
  return {
    file,
    originalSizeBytes: file.size,
    compressedSizeBytes: file.size,
    compressionRatio: 0,
    didCompress: false,
    type: category,
  };
}
