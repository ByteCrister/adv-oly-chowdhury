import { Document, Types } from "mongoose";
import { ClientType, ClientStatus } from "@/const/client.const";

export interface IClient {
  clientNumber: string; // e.g. "CL-2026-001"
  clientType: ClientType;
  status: ClientStatus;
  name: string;
  organizationName?: string | null;
  fatherOrSpouseName?: string | null;
  motherName?: string | null;
  dateOfBirth?: Date | null;
  nationalId?: string | null;
  phone?: string | null;
  alternatePhone?: string | null;
  email?: string | null;
  address?: string | null;
  permanentAddress?: string | null;
  notes?: string | null;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IClientDocument extends IClient, Document<Types.ObjectId> {}
