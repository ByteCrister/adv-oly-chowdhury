import { Document, Types } from "mongoose";
import { PaymentMethod, PaymentType } from "@/const/client-payment.const";

export interface IClientPayment {
  clientId: Types.ObjectId;
  caseId?: Types.ObjectId | null;
  paymentDate: Date;
  amount: number; // in BDT
  currency: string; // default "BDT"
  paymentMethod: PaymentMethod;
  paymentType: PaymentType;
  referenceNumber?: string | null; // e.g. bank cheque number, bKash TrxID
  receiptAssetId?: Types.ObjectId | null;
  moneyReceiptNumber?: string | null; // Manual money receipt booklet number
  notes?: string | null;
  receivedBy?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IClientPaymentDocument extends IClientPayment, Document<Types.ObjectId> {}
