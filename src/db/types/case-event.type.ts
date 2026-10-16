import { Document, Types } from "mongoose";
import { CaseEventType } from "@/const/case-event.const";

export interface ICaseEvent {
  caseId: Types.ObjectId;
  eventType: CaseEventType;
  title: string;
  description?: string | null;
  eventDate: Date;
  assetId?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICaseEventDocument extends ICaseEvent, Document<Types.ObjectId> {}
