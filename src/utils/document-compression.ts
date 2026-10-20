/**
 * Legal & Client Document Compression and Validation Utility
 *
 * Exclusively supports:
 * 1. PDF documents (.pdf, application/pdf)
 * 2. High-resolution raster images (.jpg, .jpeg, .png, .webp)
 *
 * Provides:
 * - Strict pre-upload file validation (Max 2MB, PDF & Images only)
 * - Lossless / high-fidelity client-side compression:
 *   • For Images: Uses the enhanced `compressImage` utility (Web Worker, WebP, EXIF normalization, text sharpness)
 *   • For PDFs: Uses `pdf-lib` object-stream compaction and orphaned-object elimination for lossless size reduction
 */

import { PDFDocument } from "pdf-lib";
import {
  DOCUMENT_MAX_SIZE_BYTES,
  DOCUMENT_ALLOWED_MIME_TYPES,
  DOCUMENT_ALLOWED_EXTENSIONS,
} from "@/const/document.const";
import {
  compressImage,
  CompressImageOptions,
} from "@/utils/image-compression";

export interface CompressDocumentOptions extends CompressImageOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  targetMimeType?: "image/webp" | "image/jpeg" | "image/png";
}

export interface DocumentCompressionResult {
  file: File;
  originalSizeBytes: number;
  compressedSizeBytes: number;
  compressionRatio: number;
  didCompress: boolean;
  type: "image" | "pdf";
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
 * Checks whether a given file matches allowed document extensions (.pdf, .jpg, .jpeg, .png, .webp).
 */
export function hasAllowedExtension(fileName: string): boolean {
  const lowerName = fileName.toLowerCase();
  return (DOCUMENT_ALLOWED_EXTENSIONS as readonly string[]).some((ext) =>
    lowerName.endsWith(ext)
  );
}

/**
 * Determines logical document category for processing: 'image', 'pdf', or 'unsupported'.
 */
export function getDocumentCategory(file: File): "image" | "pdf" | "unsupported" {
  if (!file) return "unsupported";
  const mime = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();

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

  return "unsupported";
}

/**
 * Validates a document file against strict size (Max 2MB) and format rules (PDF and Image only).
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

  // 2. MIME / Extension Format Check (PDF and Image only)
  const isMimeAllowed = (DOCUMENT_ALLOWED_MIME_TYPES as readonly string[]).includes(
    file.type
  );
  const isExtAllowed = hasAllowedExtension(file.name);

  if (!isMimeAllowed && !isExtAllowed) {
    throw new Error(
      `File "${file.name}" is not supported. Only PDF documents and image files (JPEG, PNG, WebP) are allowed.`
    );
  }
}

/**
 * Compresses an image document using the newly updated `compressImage` helper.
 * Maintains higher resolution (up to 2048x2048) and quality (0.88) to preserve
 * legal seal details, signatures, and fine text while shrinking byte size significantly.
 */
async function compressImageDocument(
  file: File,
  options?: CompressDocumentOptions
): Promise<DocumentCompressionResult> {
  const originalSizeBytes = file.size;

  try {
    const result = await compressImage(file, {
      maxWidth: options?.maxWidth ?? 2048,
      maxHeight: options?.maxHeight ?? 2048,
      quality: options?.quality ?? 0.88,
      maxSizeBytes: options?.maxSizeBytes ?? 1.5 * 1024 * 1024,
      targetMimeType: options?.targetMimeType ?? "image/webp",
      useWebWorker: options?.useWebWorker ?? true,
      signal: options?.signal,
    });

    return {
      file: result.file,
      originalSizeBytes: result.originalSizeBytes,
      compressedSizeBytes: result.compressedSizeBytes,
      compressionRatio: result.compressionRatio,
      didCompress: result.didCompress,
      type: "image",
    };
  } catch (err) {
    console.warn("[document-compression] Image compression fallback to original:", err);
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
 * Losslessly optimizes a PDF document using `pdf-lib`.
 * - Groups loose objects into compressed object streams (PDF 1.5+ standard).
 * - Eliminates unreferenced revisions and duplicate catalog metadata.
 * - Leaves text, vector paths, embedded fonts, and layout 100% bit-exact and unaltered.
 */
export async function compressPdfDocument(
  file: File
): Promise<DocumentCompressionResult> {
  const originalSizeBytes = file.size;

  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer, {
      ignoreEncryption: true,
      updateMetadata: false,
    });

    // Save with object streams to group and compress PDF objects losslessly
    const compressedBytes = await pdfDoc.save({
      useObjectStreams: true,
      addDefaultPage: false,
    });

    // Only adopt compressed output if it is actually smaller
    if (compressedBytes.byteLength < originalSizeBytes) {
      const pdfBlob = new Blob([compressedBytes.buffer as ArrayBuffer], {
        type: "application/pdf",
      });
      const compressedFile = new File([pdfBlob], file.name, {
        type: "application/pdf",
        lastModified: Date.now(),
      });
      const compressionRatio = Math.max(
        0,
        (originalSizeBytes - compressedBytes.byteLength) / originalSizeBytes
      );

      return {
        file: compressedFile,
        originalSizeBytes,
        compressedSizeBytes: compressedBytes.byteLength,
        compressionRatio,
        didCompress: true,
        type: "pdf",
      };
    }

    return {
      file,
      originalSizeBytes,
      compressedSizeBytes: originalSizeBytes,
      compressionRatio: 0,
      didCompress: false,
      type: "pdf",
    };
  } catch (err) {
    console.warn("[document-compression] PDF lossless compression fallback to original:", err);
    return {
      file,
      originalSizeBytes,
      compressedSizeBytes: originalSizeBytes,
      compressionRatio: 0,
      didCompress: false,
      type: "pdf",
    };
  }
}

/**
 * Universal document optimization function.
 * - Strictly validates format (PDF and Image only) and 2MB maximum size.
 * - For raster images (JPEG, PNG, WebP): compresses via `compressImage` using Web Workers.
 * - For PDF documents: compresses losslessly via `pdf-lib` object stream packing.
 */
export async function compressDocumentFile(
  file: File,
  options?: CompressDocumentOptions
): Promise<DocumentCompressionResult> {
  // 1. Validate constraints first
  validateDocumentFile(file);

  const category = getDocumentCategory(file);

  if (category === "image") {
    return await compressImageDocument(file, options);
  }

  if (category === "pdf") {
    return await compressPdfDocument(file);
  }

  throw new Error(
    `Unsupported document format for "${file.name}". Only PDF and image files (JPEG, PNG, WebP) are allowed.`
  );
}

export default compressDocumentFile;
