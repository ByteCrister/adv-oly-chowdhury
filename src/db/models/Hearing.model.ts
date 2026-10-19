import mongoose, { Schema, Model } from "mongoose";
import { COLLECTIONS, MODELS } from "@/const/collection.const";
import { HEARING_STATUS_LIST, HEARING_STATUSES } from "@/const/hearing.const";
import { IHearingDocument } from "@/types/db/hearing.type";

const hearingSchema = new Schema<IHearingDocument>(
  {
    caseId: {
      type: Schema.Types.ObjectId,
      ref: MODELS.CASE,
      required: [true, "Case ID is required"],
    },
    courtId: {
      type: Schema.Types.ObjectId,
      ref: MODELS.COURT,
      default: null,
    },
    hearingDate: {
      type: Date,
      required: [true, "Hearing date is required"],
    },
    startTime: {
      type: String,
      trim: true,
      default: null,
    },
    hearingType: {
      type: String,
      trim: true,
      default: null,
    },
    purpose: {
      type: String,
      default: null,
    },
    outcome: {
      type: String,
      default: null,
    },
    nextDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: {
        values: HEARING_STATUS_LIST,
        message: "{VALUE} is not a valid hearing status",
      },
      default: HEARING_STATUSES.SCHEDULED,
    },
    adjournmentReason: {
      type: String,
      default: null,
    },
    notes: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: COLLECTIONS.HEARINGS,
  }
);

// High-performance compound query indexes
hearingSchema.index({ caseId: 1, hearingDate: 1 });
hearingSchema.index({ courtId: 1, hearingDate: 1 });
hearingSchema.index({ status: 1, hearingDate: 1 });
hearingSchema.index({ hearingDate: 1, status: 1 });
hearingSchema.index({ createdAt: -1 });

export const Hearing: Model<IHearingDocument> =
  (mongoose.models[MODELS.HEARING] as Model<IHearingDocument>) ||
  mongoose.model<IHearingDocument>(MODELS.HEARING, hearingSchema, COLLECTIONS.HEARINGS);

export default Hearing;
