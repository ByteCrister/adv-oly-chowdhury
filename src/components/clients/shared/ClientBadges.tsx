"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import {
  CLIENT_STATUSES,
  CLIENT_STATUS_LABELS,
  CLIENT_TYPES,
  CLIENT_TYPE_LABELS,
  ClientStatus,
  ClientType,
} from "@/const/client.const";
import {
  CLIENT_DOCUMENT_TYPE_LABELS,
  ClientDocumentType,
} from "@/const/client-document.const";
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_TYPE_LABELS,
  PAYMENT_METHODS,
  PaymentMethod,
  PaymentType,
} from "@/const/client-payment.const";
import {
  User,
  Building2,
  CheckCircle2,
  AlertCircle,
  Archive,
  CreditCard,
  Banknote,
  Smartphone,
  FileText,
} from "lucide-react";

export function ClientStatusBadge({ status }: { status: ClientStatus }) {
  switch (status) {
    case CLIENT_STATUSES.ACTIVE:
      return (
        <Badge variant="emerald" className="gap-1">
          <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
          <span>{CLIENT_STATUS_LABELS[status] || status}</span>
        </Badge>
      );
    case CLIENT_STATUSES.INACTIVE:
      return (
        <Badge variant="secondary" className="gap-1">
          <AlertCircle className="w-3 h-3 text-muted-foreground" />
          <span>{CLIENT_STATUS_LABELS[status] || status}</span>
        </Badge>
      );
    case CLIENT_STATUSES.ARCHIVED:
      return (
        <Badge variant="amber" className="gap-1">
          <Archive className="w-3 h-3 text-amber-600 dark:text-amber-400" />
          <span>{CLIENT_STATUS_LABELS[status] || status}</span>
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export function ClientTypeBadge({ type }: { type: ClientType }) {
  if (type === CLIENT_TYPES.ORGANIZATION) {
    return (
      <Badge variant="gold" className="gap-1">
        <Building2 className="w-3 h-3 text-gold-600 dark:text-gold-400" />
        <span>{CLIENT_TYPE_LABELS[type] || "Corporate"}</span>
      </Badge>
    );
  }

  return (
    <Badge variant="sapphire" className="gap-1">
      <User className="w-3 h-3 text-sapphire-600 dark:text-sapphire-400" />
      <span>{CLIENT_TYPE_LABELS[type] || "Individual"}</span>
    </Badge>
  );
}

export function ClientDocumentTypeBadge({ type }: { type: ClientDocumentType }) {
  return (
    <Badge variant="outline" className="gap-1 text-[11px] font-medium bg-muted/30">
      <FileText className="w-3 h-3 text-gold-500 shrink-0" />
      <span className="truncate max-w-[170px]">{CLIENT_DOCUMENT_TYPE_LABELS[type] || type}</span>
    </Badge>
  );
}

export function PaymentMethodBadge({ method }: { method: PaymentMethod }) {
  const label = PAYMENT_METHOD_LABELS[method] || method;

  switch (method) {
    case PAYMENT_METHODS.CASH:
      return (
        <Badge variant="emerald" className="gap-1 text-[11px]">
          <Banknote className="w-3 h-3" />
          <span>{label}</span>
        </Badge>
      );
    case PAYMENT_METHODS.BKASH:
    case PAYMENT_METHODS.NAGAD:
    case PAYMENT_METHODS.ROCKET:
      return (
        <Badge variant="amber" className="gap-1 text-[11px]">
          <Smartphone className="w-3 h-3" />
          <span>{label}</span>
        </Badge>
      );
    case PAYMENT_METHODS.BANK_TRANSFER:
    case PAYMENT_METHODS.CHEQUE:
    case PAYMENT_METHODS.ONLINE_GATEWAY:
      return (
        <Badge variant="sapphire" className="gap-1 text-[11px]">
          <CreditCard className="w-3 h-3" />
          <span>{label}</span>
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary" className="gap-1 text-[11px]">
          <span>{label}</span>
        </Badge>
      );
  }
}

export function PaymentTypeBadge({ type }: { type: PaymentType }) {
  const label = PAYMENT_TYPE_LABELS[type] || type;
  return (
    <Badge variant="gold" className="text-[11px] font-medium">
      {label}
    </Badge>
  );
}
