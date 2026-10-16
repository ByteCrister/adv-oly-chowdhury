import { z } from "zod";
import type { IUser } from "@/types/db/user.type";
import {
  chamberAddressSchema,
  homeAddressSchema,
  profileUpdateSchema,
  passwordUpdateSchema,
  DEFAULT_CHAMBER_ADDRESS,
  DEFAULT_HOME_ADDRESS,
} from "@/utils/zod";

// Re-export validation schemas & default constants for backward-compatibility
export {
  chamberAddressSchema,
  homeAddressSchema,
  profileUpdateSchema,
  passwordUpdateSchema,
  DEFAULT_CHAMBER_ADDRESS,
  DEFAULT_HOME_ADDRESS,
};

// Inferred TypeScript Types from Zod Schemas
export type ChamberAddressDto = z.infer<typeof chamberAddressSchema>;
export type HomeAddressDto = z.infer<typeof homeAddressSchema>;
export type ProfileUpdateDto = z.infer<typeof profileUpdateSchema>;
export type PasswordUpdateDto = z.infer<typeof passwordUpdateSchema>;

export type ProfileFormValues = ProfileUpdateDto;

export interface ProfileAvatarDto {
  url: string;
  publicId?: string | null;
  originalFileName?: string | null;
  mimeType?: string | null;
  sizeBytes?: number;
  width?: number | null;
  height?: number | null;
  format?: string | null;
  assetReferenceId?: string | null;
  assetId?: string | null;
}

export interface ProfileSignatureDto {
  url: string;
  publicId?: string | null;
  mimeType?: string | null;
  sizeBytes?: number;
  width?: number | null;
  height?: number | null;
  format?: string | null;
  assetReferenceId?: string | null;
  assetId?: string | null;
}

export interface ProfileApiResponse {
  success: boolean;
  data: IUser & {
    _id: string;
    avatarUrl?: string | null;
    avatar?: ProfileAvatarDto | null;
    signatureUrl?: string | null;
    signature?: ProfileSignatureDto | null;
  };
  message?: string;
}

export type ProfileTab =
  | "general"
  | "credentials"
  | "chamber"
  | "address"
  | "security";
