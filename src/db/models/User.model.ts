import mongoose, { Schema, Model } from "mongoose";
import { COLLECTIONS, MODELS } from "@/const/collection.const";
import { USER_STATUS_LIST, USER_STATUSES } from "@/const/user.const";
import { IUserDocument } from "@/types/db/user.type";

const chamberSchema = new Schema(
  {
    room: {
      type: String,
      trim: true,
      default: "Chamber No. 323 (3rd Floor)",
    },
    barHall: {
      type: String,
      trim: true,
      default: "Bar Hall No: 02",
    },
    court: {
      type: String,
      trim: true,
      default: "Judge's Court",
    },
    city: {
      type: String,
      trim: true,
      default: "Sylhet",
    },
    district: {
      type: String,
      trim: true,
      default: "Sylhet",
    },
    fullAddress: {
      type: String,
      trim: true,
      default: "Chamber No. 323 (3rd Floor), Bar Hall No: 02, Judge's Court, Sylhet, Bangladesh",
    },
    consultationHours: {
      type: String,
      trim: true,
      default: "Saturday – Thursday (Court & Chamber Hours)",
    },
  },
  { _id: false }
);

const homeAddressSchema = new Schema(
  {
    presentAddress: {
      type: String,
      trim: true,
      default: null,
    },
    permanentAddress: {
      type: String,
      trim: true,
      default: null,
    },
    city: {
      type: String,
      trim: true,
      default: "Sylhet",
    },
    postalCode: {
      type: String,
      trim: true,
      default: null,
    },
  },
  { _id: false }
);

const userSchema = new Schema<IUserDocument>(
  {
    // Identity & Display
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [150, "Name cannot exceed 150 characters"],
    },
    preferredName: {
      type: String,
      trim: true,
      default: "Advocate Oly Chowdhury",
    },
    title: {
      type: String,
      trim: true,
      default: "Advocate",
    },
    subtitle: {
      type: String,
      trim: true,
      default: "Advocate • Judge's Court, Sylhet",
    },
    tagline: {
      type: String,
      trim: true,
      default: null,
    },

    // Authentication & Security (Single-User Architecture)
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
    },
    passwordHash: {
      type: String,
      default: null,
      select: false, // Hidden by default from standard queries
    },
    passwordChangedAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: {
        values: USER_STATUS_LIST,
        message: "{VALUE} is not a valid user status",
      },
      default: USER_STATUSES.ACTIVE,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },

    // Professional Bar Registrations
    barCouncilId: {
      type: String,
      trim: true,
      default: null,
    },
    barAssociationMemberNo: {
      type: String,
      trim: true,
      default: null,
    },
    taxesBarMemberNo: {
      type: String,
      trim: true,
      default: null,
    },

    // Contact Numbers
    phone: {
      type: String,
      trim: true,
      default: "01712-459840",
      index: true,
    },
    alternatePhone: {
      type: String,
      trim: true,
      default: null,
    },
    whatsappNumber: {
      type: String,
      trim: true,
      default: "+8801712459840",
    },

    // Dynamic Chamber & Residential Addresses
    chamber: {
      type: chamberSchema,
      default: () => ({}),
    },
    homeAddress: {
      type: homeAddressSchema,
      default: () => ({}),
    },

    // Cloudinary Assets
    profileAssetReferenceId: {
      type: Schema.Types.ObjectId,
      ref: MODELS.ASSET_REFERENCE,
      default: null,
    },
    signatureAssetId: {
      type: Schema.Types.ObjectId,
      ref: MODELS.ASSET,
      default: null,
    },
    signatureAssetReferenceId: {
      type: Schema.Types.ObjectId,
      ref: MODELS.ASSET_REFERENCE,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: COLLECTIONS.USERS,
  }
);

// Compound query indexes
userSchema.index({ isActive: 1, status: 1 });

export const User: Model<IUserDocument> =
  (mongoose.models[MODELS.USER] as Model<IUserDocument>) ||
  mongoose.model<IUserDocument>(MODELS.USER, userSchema, COLLECTIONS.USERS);

export default User;
