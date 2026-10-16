import mongoose, { Schema, Model } from "mongoose";
import { COLLECTIONS, MODELS } from "@/const/collection.const";
import {
  CASE_EXPENSE_CATEGORY_LIST,
  CASE_EXPENSE_CATEGORIES,
  DEFAULT_CURRENCY,
} from "@/const/case-expense.const";
import { ICaseExpenseDocument } from "@/db/types/case-expense.type";

const caseExpenseSchema = new Schema<ICaseExpenseDocument>(
  {
    caseId: {
      type: Schema.Types.ObjectId,
      ref: MODELS.CASE,
      required: [true, "Case ID is required"],
      index: true,
    },
    expenseDate: {
      type: Date,
      required: [true, "Expense date is required"],
      index: true,
    },
    category: {
      type: String,
      enum: {
        values: CASE_EXPENSE_CATEGORY_LIST,
        message: "{VALUE} is not a valid expense category",
      },
      default: CASE_EXPENSE_CATEGORIES.COURT_FEES,
      required: true,
      index: true,
    },
    description: {
      type: String,
      default: null,
    },
    amount: {
      type: Number,
      required: [true, "Expense amount is required"],
      min: [0, "Amount cannot be negative"],
    },
    currency: {
      type: String,
      default: DEFAULT_CURRENCY,
      trim: true,
      uppercase: true,
    },
    receiptAssetId: {
      type: Schema.Types.ObjectId,
      ref: MODELS.ASSET,
      default: null,
      index: true,
    },
    recordedBy: {
      type: Schema.Types.ObjectId,
      ref: MODELS.USER,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: COLLECTIONS.CASE_EXPENSES,
  }
);

caseExpenseSchema.index({ caseId: 1, expenseDate: -1 });

export const CaseExpense: Model<ICaseExpenseDocument> =
  (mongoose.models[MODELS.CASE_EXPENSE] as Model<ICaseExpenseDocument>) ||
  mongoose.model<ICaseExpenseDocument>(
    MODELS.CASE_EXPENSE,
    caseExpenseSchema,
    COLLECTIONS.CASE_EXPENSES
  );

export default CaseExpense;
