import { Document, Types } from "mongoose";
import { HearingStatus } from "@/const/hearing.const";

export interface IHearing {
  caseId: Types.ObjectId;
  courtId?: Types.ObjectId | null; // Defaults to case.courtId if null
  hearingDate: Date;
  startTime?: string | null;
  hearingType?: string | null;
  purpose?: string | null;
  outcome?: string | null;
  nextDate?: Date | null;
  status: HearingStatus;
  adjournmentReason?: string | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IHearingDocument extends IHearing, Document<Types.ObjectId> {}
