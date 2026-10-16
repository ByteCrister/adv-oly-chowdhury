import { Document, Types } from "mongoose";
import { CaseExpenseCategory } from "@/const/case-expense.const";

export interface ICaseExpense {
  caseId: Types.ObjectId;
  expenseDate: Date;
  category: CaseExpenseCategory;
  description?: string | null;
  amount: number; // in BDT
  currency: string; // default "BDT"
  receiptAssetReferenceId?: Types.ObjectId | null;
  recordedBy?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICaseExpenseDocument extends ICaseExpense, Document<Types.ObjectId> {}
