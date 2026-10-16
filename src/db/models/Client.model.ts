import mongoose, { Schema, Model } from "mongoose";
import { COLLECTIONS, MODELS } from "@/const/collection.const";
import {
  CLIENT_TYPE_LIST,
  CLIENT_TYPES,
  CLIENT_STATUS_LIST,
  CLIENT_STATUSES,
} from "@/const/client.const";
import { IClientDocument } from "@/types/db/client.type";

const clientSchema = new Schema<IClientDocument>(
  {
    clientNumber: {
      type: String,
      required: [true, "Client number is required"],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    clientType: {
      type: String,
      enum: {
        values: CLIENT_TYPE_LIST,
        message: "{VALUE} is not a valid client type",
      },
      default: CLIENT_TYPES.INDIVIDUAL,
      required: true,
    },
    status: {
      type: String,
      enum: {
        values: CLIENT_STATUS_LIST,
        message: "{VALUE} is not a valid client status",
      },
      default: CLIENT_STATUSES.ACTIVE,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Client name is required"],
      trim: true,
      maxlength: [200, "Name cannot exceed 200 characters"],
      index: true,
    },
    organizationName: {
      type: String,
      trim: true,
      default: null,
    },
    fatherOrSpouseName: {
      type: String,
      trim: true,
      default: null,
    },
    motherName: {
      type: String,
      trim: true,
      default: null,
    },
    dateOfBirth: {
      type: Date,
      default: null,
    },
    nationalId: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },
    phone: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },
    alternatePhone: {
      type: String,
      trim: true,
      default: null,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
    },
    address: {
      type: String,
      trim: true,
      default: null,
    },
    permanentAddress: {
      type: String,
      trim: true,
      default: null,
    },
    notes: {
      type: String,
      default: null,
    },
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: COLLECTIONS.CLIENTS,
  }
);

// Compound & text search indexes
clientSchema.index({ name: "text", organizationName: "text", clientNumber: "text" });
clientSchema.index({ status: 1, deletedAt: 1 });

export const Client: Model<IClientDocument> =
  (mongoose.models[MODELS.CLIENT] as Model<IClientDocument>) ||
  mongoose.model<IClientDocument>(MODELS.CLIENT, clientSchema, COLLECTIONS.CLIENTS);

export default Client;
