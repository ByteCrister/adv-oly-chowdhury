import { Document, Types } from "mongoose";
import { ClientDocumentType } from "@/const/client-document.const";

export interface IClientDocumentEntity {
  clientId: Types.ObjectId;
  assetId: Types.ObjectId;
  documentType: ClientDocumentType;
  title: string;
  documentDate?: Date | null;
  expiryDate?: Date | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IClientDocumentRecord extends IClientDocumentEntity, Document<Types.ObjectId> {}
