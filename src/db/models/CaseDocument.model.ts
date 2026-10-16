import mongoose, { Schema, Model } from "mongoose";
import { COLLECTIONS, MODELS } from "@/const/collection.const";
import {
  CASE_DOCUMENT_TYPE_LIST,
  CASE_DOCUMENT_TYPES,
} from "@/const/case-document.const";
import { ICaseDocumentRecord } from "@/types/db/case-document.type";

const caseDocumentSchema = new Schema<ICaseDocumentRecord>(
  {
    caseId: {
      type: Schema.Types.ObjectId,
      ref: MODELS.CASE,
      required: [true, "Case ID is required"],
      index: true,
    },
    assetReferenceId: {
      type: Schema.Types.ObjectId,
      ref: MODELS.ASSET_REFERENCE,
      required: [true, "Asset ID is required"],
      index: true,
    },
    documentType: {
      type: String,
      enum: {
        values: CASE_DOCUMENT_TYPE_LIST,
        message: "{VALUE} is not a valid case document type",
      },
      default: CASE_DOCUMENT_TYPES.OTHER,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, "Document title is required"],
      trim: true,
      maxlength: [200, "Document title cannot exceed 200 characters"],
    },
    documentDate: {
      type: Date,
      default: null,
    },
    description: {
      type: String,
      default: null,
    },
    exhibitNumber: {
      type: String,
      trim: true,
      default: null,
    },
    isConfidential: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: COLLECTIONS.CASE_DOCUMENTS,
  }
);

caseDocumentSchema.index({ caseId: 1, createdAt: -1 });
caseDocumentSchema.index({ caseId: 1, documentType: 1 });
caseDocumentSchema.index({ caseId: 1, assetId: 1 });

export const CaseDocument: Model<ICaseDocumentRecord> =
  (mongoose.models[MODELS.CASE_DOCUMENT] as Model<ICaseDocumentRecord>) ||
  mongoose.model<ICaseDocumentRecord>(
    MODELS.CASE_DOCUMENT,
    caseDocumentSchema,
    COLLECTIONS.CASE_DOCUMENTS
  );

export default CaseDocument;
