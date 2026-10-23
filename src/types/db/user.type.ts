import { Document, Types } from "mongoose";
import { UserStatus } from "@/const/user.const";

export interface IChamberAddress {
  room?: string | null; // e.g. "Chamber No. 323 (3rd Floor)"
  barHall?: string | null; // e.g. "Bar Hall No: 02"
  court?: string | null; // e.g. "Judge's Court"
  city?: string | null; // e.g. "Sylhet"
  district?: string | null; // e.g. "Sylhet"
  fullAddress?: string | null; // e.g. "Chamber No. 323 (3rd Floor), Bar Hall No: 02, Judge's Court, Sylhet"
  consultationHours?: string | null; // e.g. "Saturday – Thursday (Court & Chamber Hours)"
}

export interface IHomeAddress {
  presentAddress?: string | null; // Residential address
  permanentAddress?: string | null; // Permanent/ancestral home address
  city?: string | null;
  postalCode?: string | null;
}

export interface IUser {
  // Identity & Display
  name: string;
  preferredName?: string | null; // e.g. "Advocate Oly Chowdhury"
  title?: string | null; // e.g. "Advocate"
  subtitle?: string | null; // e.g. "Advocate • Judge's Court, Sylhet"
  tagline?: string | null;

  // Authentication & Status (Single-User Dashboard)
  email: string;
  passwordHash?: string | null;
  passwordChangedAt?: Date | null;
  status: UserStatus;
  isActive: boolean;
  lastLoginAt?: Date | null;

  // Professional Bar Identification
  barCouncilId?: string | null; // Bangladesh Bar Council enrollment/sanad number
  barAssociationMemberNo?: string | null; // Sylhet District Bar membership number
  taxesBarMemberNo?: string | null; // Sylhet District Taxes Bar membership number

  // Contact Numbers
  phone?: string | null; // Primary direct mobile
  alternatePhone?: string | null; // Secondary contact
  whatsappNumber?: string | null; // WhatsApp communication number

  // Dynamic Addresses
  chamber?: IChamberAddress;
  homeAddress?: IHomeAddress;

  // Cloudinary Assets
  profileAssetReferenceId?: Types.ObjectId | null; // Headshot / profile photo
  signatureAssetId?: Types.ObjectId | null; // Digital signature scan for court briefs & receipts (direct Asset ref)
  signatureAssetReferenceId?: Types.ObjectId | null; // Digital signature scan (AssetReference ref)

  createdAt: Date;
  updatedAt: Date;
}

export interface IUserDocument extends IUser, Document<Types.ObjectId> {}
