import mongoose, { Schema, Model } from "mongoose";
import { COLLECTIONS, MODELS } from "@/const/collection.const";
import {
  CASE_TYPE_LIST,
  CASE_TYPES,
  CASE_STATUS_LIST,
  CASE_STATUSES,
  CASE_PRIORITY_LIST,
  CASE_PRIORITIES,
} from "@/const/case.const";
import { ICaseDocument } from "@/db/types/case.type";

const caseSchema = new Schema<ICaseDocument>(
  {
    internalReference: {
      type: String,
      required: [true, "Internal reference is required"],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    caseNumber: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },
    filingYear: {
      type: Number,
      default: null,
    },
    title: {
      type: String,
      required: [true, "Case title is required"],
      trim: true,
      maxlength: [250, "Title cannot exceed 250 characters"],
      index: true,
    },
    caseType: {
      type: String,
      enum: {
        values: CASE_TYPE_LIST,
        message: "{VALUE} is not a valid case type",
      },
      default: CASE_TYPES.CIVIL,
      required: true,
      index: true,
    },
    caseCategory: {
      type: String,
      trim: true,
      default: null,
    },
    courtId: {
      type: Schema.Types.ObjectId,
      ref: MODELS.COURT,
      required: [true, "Court ID is required"],
      index: true,
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: MODELS.CLIENT,
      required: [true, "Primary Client ID is required"],
      index: true,
    },
    assignedUserId: {
      type: Schema.Types.ObjectId,
      ref: MODELS.USER,
      default: null,
      index: true,
    },
    filingDate: {
      type: Date,
      default: null,
    },
    caseStatus: {
      type: String,
      enum: {
        values: CASE_STATUS_LIST,
        message: "{VALUE} is not a valid case status",
      },
      default: CASE_STATUSES.ACTIVE,
      index: true,
    },
    priority: {
      type: String,
      enum: {
        values: CASE_PRIORITY_LIST,
        message: "{VALUE} is not a valid priority",
      },
      default: CASE_PRIORITIES.NORMAL,
      index: true,
    },
    description: {
      type: String,
      default: null,
    },
    legalIssues: {
      type: String,
      default: null,
    },
    opposingCounsel: {
      type: String,
      trim: true,
      default: null,
    },
    opposingParties: {
      type: [String],
      default: [],
    },
    nextHearingDate: {
      type: Date,
      default: null,
      index: true,
    },
    closedAt: {
      type: Date,
      default: null,
    },
    closureReason: {
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
    collection: COLLECTIONS.CASES,
  }
);

// High-frequency query indexes
caseSchema.index({ caseStatus: 1, nextHearingDate: 1 });
caseSchema.index({ clientId: 1, caseStatus: 1 });
caseSchema.index({ courtId: 1, caseNumber: 1 });
caseSchema.index({ title: "text", caseNumber: "text", internalReference: "text", description: "text" });

export const Case: Model<ICaseDocument> =
  (mongoose.models[MODELS.CASE] as Model<ICaseDocument>) ||
  mongoose.model<ICaseDocument>(MODELS.CASE, caseSchema, COLLECTIONS.CASES);

export default Case;
