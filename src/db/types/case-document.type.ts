import { Document, Types } from "mongoose";
import { CaseDocumentType } from "@/const/case-document.const";

export interface ICaseDocumentEntity {
  caseId: Types.ObjectId;
  assetId: Types.ObjectId;
  documentType: CaseDocumentType;
  title: string;
  documentDate?: Date | null;
  description?: string | null;
  exhibitNumber?: string | null; // e.g. "Ext. 1", "Mark A" in court evidence
  isConfidential: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICaseDocumentRecord extends ICaseDocumentEntity, Document<Types.ObjectId> {}
