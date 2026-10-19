import mongoose, { Schema, Model } from "mongoose";
import { COLLECTIONS, MODELS } from "@/const/collection.const";
import { COURT_TYPE_LIST, COURT_TYPES } from "@/const/court.const";
import { ICourtDocument } from "@/types/db/court.type";

const courtSchema = new Schema<ICourtDocument>(
  {
    name: {
      type: String,
      required: [true, "Court name is required"],
      trim: true,
      maxlength: [200, "Court name cannot exceed 200 characters"],
      index: true,
    },
    courtType: {
      type: String,
      enum: {
        values: COURT_TYPE_LIST,
        message: "{VALUE} is not a valid court type",
      },
      default: COURT_TYPES.DISTRICT_JUDGE_COURT,
      required: true,
      index: true,
    },
    district: {
      type: String,
      required: [true, "District is required"],
      trim: true,
      default: "Sylhet",
      index: true,
    },
    division: {
      type: String,
      trim: true,
      default: "Sylhet",
    },
    roomOrHall: {
      type: String,
      trim: true,
      default: null,
    },
    address: {
      type: String,
      trim: true,
      default: null,
    },
    presidingJudgeTitle: {
      type: String,
      trim: true,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: COLLECTIONS.COURTS,
  }
);

// Compound indexes supporting high-frequency query and sort patterns
courtSchema.index({ deletedAt: 1, createdAt: -1 });
courtSchema.index({ deletedAt: 1, isActive: 1, createdAt: -1 });
courtSchema.index({ deletedAt: 1, isActive: 1, name: 1 });
courtSchema.index({ deletedAt: 1, courtType: 1, createdAt: -1 });
courtSchema.index({ deletedAt: 1, district: 1, courtType: 1 });
courtSchema.index({ deletedAt: 1, name: 1, district: 1 });

export const Court: Model<ICourtDocument> =
  (mongoose.models[MODELS.COURT] as Model<ICourtDocument>) ||
  mongoose.model<ICourtDocument>(MODELS.COURT, courtSchema, COLLECTIONS.COURTS);

export default Court;
