"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CLIENT_TYPES } from "@/const/client.const";
import type { ClientListItemDto, ClientDetailDto } from "@/types/client.types";
import { User, Building2 } from "lucide-react";
import { ClientForm } from "@/components/clients/shared/ClientForm";

export interface ClientFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  client?: ClientListItemDto | ClientDetailDto | null;
  onSuccess?: (clientId: string) => void;
}

export function ClientFormDialog({
  isOpen,
  onClose,
  client,
  onSuccess,
}: ClientFormDialogProps) {
  const isEditMode = Boolean(client);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-3 border-b border-border/50">
          <div className="flex items-center gap-2 text-gold-500 text-xs font-semibold uppercase tracking-wider">
            {client?.clientType === CLIENT_TYPES.ORGANIZATION ? (
              <Building2 className="w-4 h-4" />
            ) : (
              <User className="w-4 h-4" />
            )}
            <span>{isEditMode ? "Modify Client Record" : "Enroll New Client"}</span>
          </div>
          <DialogTitle className="text-xl sm:text-2xl mt-1">
            {isEditMode ? `Edit ${client?.name}` : "Create Legal Client Dossier"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {isEditMode
              ? "Update identity details, case association settings, or contact points."
              : "Register an individual citizen or corporate entity into Advocate Oly Chowdhury's chamber management."}
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 pt-4">
          <ClientForm
            client={client}
            isDialog={true}
            onCancel={onClose}
            onSuccess={(clientId) => {
              onSuccess?.(clientId);
              onClose();
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ClientFormDialog;
