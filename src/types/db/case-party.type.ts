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

export interface IPopulatedCasePartyClient {
  _id: Types.ObjectId | string;
  name: string;
  clientNumber?: string;
  organizationName?: string | null;
  clientType?: string;
  phone?: string | null;
  email?: string | null;
}

export interface IPopulatedCasePartyDoc {
  _id: Types.ObjectId | string;
  caseId: Types.ObjectId | string;
  clientId?: IPopulatedCasePartyClient | Types.ObjectId | string | null;
  name: string;
  partyType: PartyType;
  role: PartyRole;
  address?: string | null;
  phone?: string | null;
  notes?: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}
