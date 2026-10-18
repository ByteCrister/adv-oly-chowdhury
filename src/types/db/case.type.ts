import { Document, Types } from "mongoose";
import { CaseType, CaseStatus, CasePriority } from "@/const/case.const";

export interface ICase {
  internalReference: string; // e.g. "CASE-2026-001"
  caseNumber?: string | null; // Court assigned number, e.g. "Civil Suit No. 142/2025"
  filingYear?: number | null;
  title: string;
  caseType: CaseType;
  caseCategory?: string | null; // e.g. "Title Suit", "Bail Application", "Income Tax Appeal"
  courtId: Types.ObjectId;
  clientId: Types.ObjectId; // Primary client
  filingDate?: Date | null;
  caseStatus: CaseStatus;
  priority: CasePriority;
  description?: string | null;
  legalIssues?: string | null;
  opposingCounsel?: string | null;
  opposingParties?: string[];
  nextHearingDate?: Date | null;
  closedAt?: Date | null;
  closureReason?: string | null;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICaseDocument extends ICase, Document<Types.ObjectId> {}
