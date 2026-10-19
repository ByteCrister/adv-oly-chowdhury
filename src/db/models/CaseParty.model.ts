import mongoose, { Schema, Model } from "mongoose";
import { COLLECTIONS, MODELS } from "@/const/collection.const";
import {
  PARTY_TYPE_LIST,
  PARTY_TYPES,
  PARTY_ROLE_LIST,
  PARTY_ROLES,
} from "@/const/case-party.const";
import { ICasePartyDocument } from "@/types/db/case-party.type";

const casePartySchema = new Schema<ICasePartyDocument>(
  {
    caseId: {
      type: Schema.Types.ObjectId,
      ref: MODELS.CASE,
      required: [true, "Case ID is required"],
      index: true,
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: MODELS.CLIENT,
      default: null,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Party name is required"],
      trim: true,
      maxlength: [200, "Party name cannot exceed 200 characters"],
      index: true,
    },
    partyType: {
      type: String,
      enum: {
        values: PARTY_TYPE_LIST,
        message: "{VALUE} is not a valid party type",
      },
      default: PARTY_TYPES.INDIVIDUAL,
      required: true,
    },
    role: {
      type: String,
      enum: {
        values: PARTY_ROLE_LIST,
        message: "{VALUE} is not a valid party role",
      },
      default: PARTY_ROLES.PLAINTIFF,
      required: true,
      index: true,
    },
    address: {
      type: String,
      trim: true,
      default: null,
    },
    phone: {
      type: String,
      trim: true,
      default: null,
    },
    notes: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: COLLECTIONS.CASE_PARTIES,
  }
);

casePartySchema.index({ caseId: 1, role: 1 });
casePartySchema.index({ caseId: 1, name: 1 });
casePartySchema.index({ caseId: 1, createdAt: -1 });
casePartySchema.index({ caseId: 1, role: 1, name: 1 });

export const CaseParty: Model<ICasePartyDocument> =
  (mongoose.models[MODELS.CASE_PARTY] as Model<ICasePartyDocument>) ||
  mongoose.model<ICasePartyDocument>(MODELS.CASE_PARTY, casePartySchema, COLLECTIONS.CASE_PARTIES);

export default CaseParty;
