import mongoose, { Schema, Model } from "mongoose";
import { COLLECTIONS, MODELS } from "@/const/collection.const";
import { USER_ROLE_LIST, USER_ROLES, USER_STATUS_LIST, USER_STATUSES } from "@/const/user.const";
import { IUserDocument } from "@/db/types/user.type";

const userSchema = new Schema<IUserDocument>(
  {
    name: {
      type: String,
      required: [true, "User name is required"],
      trim: true,
      maxlength: [150, "Name cannot exceed 150 characters"],
    },
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
      select: false, // Do not expose passwordHash by default in queries
    },
    phone: {
      type: String,
      trim: true,
      default: null,
    },
    barCouncilId: {
      type: String,
      trim: true,
      default: null,
    },
    role: {
      type: String,
      enum: {
        values: USER_ROLE_LIST,
        message: "{VALUE} is not a valid user role",
      },
      default: USER_ROLES.ADVOCATE,
    },
    status: {
      type: String,
      enum: {
        values: USER_STATUS_LIST,
        message: "{VALUE} is not a valid user status",
      },
      default: USER_STATUSES.ACTIVE,
    },
    profileAssetId: {
      type: Schema.Types.ObjectId,
      ref: MODELS.ASSET,
      default: null,
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
  },
  {
    timestamps: true,
    collection: COLLECTIONS.USERS,
  }
);

// Indexes
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1, isActive: 1 });

export const User: Model<IUserDocument> =
  (mongoose.models[MODELS.USER] as Model<IUserDocument>) ||
  mongoose.model<IUserDocument>(MODELS.USER, userSchema, COLLECTIONS.USERS);

export default User;
