import mongoose, { Schema, Model } from "mongoose";
import { COLLECTIONS, MODELS } from "@/const/collection.const";
import {
  CLIENT_DOCUMENT_TYPE_LIST,
  CLIENT_DOCUMENT_TYPES,
} from "@/const/client-document.const";
import { IClientDocumentRecord } from "@/db/types/client-document.type";

const clientDocumentSchema = new Schema<IClientDocumentRecord>(
  {
    clientId: {
      type: Schema.Types.ObjectId,
      ref: MODELS.CLIENT,
      required: [true, "Client ID is required"],
      index: true,
    },
    assetId: {
      type: Schema.Types.ObjectId,
      ref: MODELS.ASSET,
      required: [true, "Asset ID is required"],
      index: true,
    },
    documentType: {
      type: String,
      enum: {
        values: CLIENT_DOCUMENT_TYPE_LIST,
        message: "{VALUE} is not a valid client document type",
      },
      default: CLIENT_DOCUMENT_TYPES.OTHER,
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
    expiryDate: {
      type: Date,
      default: null,
      index: true,
    },
    notes: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: COLLECTIONS.CLIENT_DOCUMENTS,
  }
);

clientDocumentSchema.index({ clientId: 1, createdAt: -1 });
clientDocumentSchema.index({ clientId: 1, documentType: 1 });
clientDocumentSchema.index({ clientId: 1, assetId: 1 });

export const ClientDocument: Model<IClientDocumentRecord> =
  (mongoose.models[MODELS.CLIENT_DOCUMENT] as Model<IClientDocumentRecord>) ||
  mongoose.model<IClientDocumentRecord>(
    MODELS.CLIENT_DOCUMENT,
    clientDocumentSchema,
    COLLECTIONS.CLIENT_DOCUMENTS
  );

export default ClientDocument;
