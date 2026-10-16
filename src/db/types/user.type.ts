import { Document, Types } from "mongoose";
import { UserRole, UserStatus } from "@/const/user.const";

export interface IUser {
  name: string;
  email: string;
  passwordHash?: string | null;
  phone?: string | null;
  barCouncilId?: string | null;
  role: UserRole;
  status: UserStatus;
  profileAssetId?: Types.ObjectId | null;
  isActive: boolean;
  lastLoginAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserDocument extends IUser, Document<Types.ObjectId> {}
