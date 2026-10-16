import { Document, Types } from "mongoose";
import { CourtType, BangladeshDivision } from "@/const/court.const";

export interface ICourt {
  name: string;
  courtType: CourtType;
  district: string;
  division?: BangladeshDivision | string | null;
  roomOrHall?: string | null;
  address?: string | null;
  presidingJudgeTitle?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICourtDocument extends ICourt, Document<Types.ObjectId> {}
