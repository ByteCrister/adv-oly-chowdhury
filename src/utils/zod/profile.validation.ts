import { z } from "zod";

/**
 * Default fallback values for Chamber Address in Sylhet
 */
export const DEFAULT_CHAMBER_ADDRESS = {
  room: "Chamber No. 323 (3rd Floor)",
  barHall: "Bar Hall No: 02",
  court: "Judge's Court",
  city: "Sylhet",
  district: "Sylhet",
  fullAddress:
    "Chamber No. 323 (3rd Floor), Bar Hall No: 02, Judge's Court, Sylhet, Bangladesh",
  consultationHours: "Saturday – Thursday (Court & Chamber Hours)",
};

/**
 * Default fallback values for Residential Address in Sylhet
 */
export const DEFAULT_HOME_ADDRESS = {
  presentAddress: null,
  permanentAddress: null,
  city: "Sylhet",
  postalCode: null,
};

/**
 * Zod validation schema for Chamber Address
 */
export const chamberAddressSchema = z.object({
  room: z
    .string()
    .trim()
    .max(150, "Room details cannot exceed 150 characters")
    .default(DEFAULT_CHAMBER_ADDRESS.room),
  barHall: z
    .string()
    .trim()
    .max(100, "Bar hall cannot exceed 100 characters")
    .default(DEFAULT_CHAMBER_ADDRESS.barHall),
  court: z
    .string()
    .trim()
    .max(150, "Court title cannot exceed 150 characters")
    .default(DEFAULT_CHAMBER_ADDRESS.court),
  city: z
    .string()
    .trim()
    .max(100, "City cannot exceed 100 characters")
    .default(DEFAULT_CHAMBER_ADDRESS.city),
  district: z
    .string()
    .trim()
    .max(100, "District cannot exceed 100 characters")
    .default(DEFAULT_CHAMBER_ADDRESS.district),
  fullAddress: z
    .string()
    .trim()
    .max(300, "Address cannot exceed 300 characters")
    .default(DEFAULT_CHAMBER_ADDRESS.fullAddress),
  consultationHours: z
    .string()
    .trim()
    .max(150, "Consultation hours cannot exceed 150 characters")
    .default(DEFAULT_CHAMBER_ADDRESS.consultationHours),
});

/**
 * Zod validation schema for Home Address
 */
export const homeAddressSchema = z.object({
  presentAddress: z
    .string()
    .trim()
    .max(300, "Present address cannot exceed 300 characters")
    .nullable()
    .optional(),
  permanentAddress: z
    .string()
    .trim()
    .max(300, "Permanent address cannot exceed 300 characters")
    .nullable()
    .optional(),
  city: z
    .string()
    .trim()
    .max(100, "City cannot exceed 100 characters")
    .default(DEFAULT_HOME_ADDRESS.city),
  postalCode: z
    .string()
    .trim()
    .max(20, "Postal code cannot exceed 20 characters")
    .nullable()
    .optional(),
});

/**
 * Zod validation schema for updating full Advocate Profile
 */
export const profileUpdateSchema = z.object({
  // Identity & Title
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(150, "Name cannot exceed 150 characters"),
  preferredName: z
    .string()
    .trim()
    .max(150, "Preferred name cannot exceed 150 characters")
    .default("Advocate Oly Chowdhury"),
  title: z
    .string()
    .trim()
    .max(100, "Title cannot exceed 100 characters")
    .default("Advocate"),
  subtitle: z
    .string()
    .trim()
    .max(150, "Subtitle cannot exceed 150 characters")
    .default("Advocate • Judge's Court, Sylhet"),
  tagline: z
    .string()
    .trim()
    .max(250, "Tagline cannot exceed 250 characters")
    .nullable()
    .optional(),

  // Bar Credentials & Registrations
  barCouncilId: z
    .string()
    .trim()
    .max(100, "Bar Council ID cannot exceed 100 characters")
    .nullable()
    .optional(),
  barAssociationMemberNo: z
    .string()
    .trim()
    .max(100, "Bar Association number cannot exceed 100 characters")
    .nullable()
    .optional(),
  taxesBarMemberNo: z
    .string()
    .trim()
    .max(100, "Taxes Bar number cannot exceed 100 characters")
    .nullable()
    .optional(),

  // Contact Numbers
  phone: z
    .string()
    .trim()
    .max(30, "Phone number cannot exceed 30 characters")
    .default("01712-459840"),
  alternatePhone: z
    .string()
    .trim()
    .max(30, "Alternate phone cannot exceed 30 characters")
    .nullable()
    .optional(),
  whatsappNumber: z
    .string()
    .trim()
    .max(30, "WhatsApp number cannot exceed 30 characters")
    .default("+8801712459840"),

  // Chamber & Residential Addresses
  chamber: chamberAddressSchema.default(DEFAULT_CHAMBER_ADDRESS),
  homeAddress: homeAddressSchema.default(DEFAULT_HOME_ADDRESS),

  // Cloudinary Asset References (AssetReference IDs)
  profileAssetReferenceId: z.string().nullable().optional(),
  profileAssetId: z.string().nullable().optional(), // backward compatibility alias
  signatureAssetReferenceId: z.string().nullable().optional(),
  signatureAssetId: z.string().nullable().optional(),
});

/**
 * Zod validation schema for updating account password
 */
export const passwordUpdateSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "New password must be at least 8 characters"),
    confirmPassword: z
      .string()
      .min(8, "Confirm password must be at least 8 characters"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New passwords do not match",
    path: ["confirmPassword"],
  });

/**
 * Zod validation schema for requesting OTP to change account password
 */
export const passwordChangeRequestOtpSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
});

export type PasswordChangeRequestOtpDto = z.infer<
  typeof passwordChangeRequestOtpSchema
>;

