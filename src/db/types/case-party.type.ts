import { Document, Types } from "mongoose";
import { PartyType, PartyRole } from "@/const/case-party.const";

export interface ICaseParty {
  caseId: Types.ObjectId;
  clientId?: Types.ObjectId | null;
  name: string;
  partyType: PartyType;
  role: PartyRole;
  address?: string | null;
  phone?: string | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICasePartyDocument extends ICaseParty, Document<Types.ObjectId> {}
