"use client";

import * as React from "react";
import Image from "next/image";
import {
  UploadCloud,
  Image as ImageIcon,
  AlertTriangle,
  Trash2,
  RefreshCw,
  X,
  FileCheck,
  Zap,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useProfileAvatar } from "@/hooks/profile/useProfileAvatar";
import { formatByteSize } from "@/utils/image-compression";
import { useToast } from "@/components/shared/use-toast";
import type { ProfileApiResponse } from "@/types/profile.ui.type";

export interface ProfileAvatarDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: ProfileApiResponse["data"] | null | undefined;
}

export function ProfileAvatarDialog({
  open,
  onOpenChange,
  user,
}: ProfileAvatarDialogProps) {
  const { toast } = useToast();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [confirmRemoveOpen, setConfirmRemoveOpen] = React.useState(false);

  const {
    selectedFile,
    previewUrl,
    compressionStats,
    stage,
    stageMessage,
    uploadProgress,
    error,
    isProcessing,
    selectAvatarFile,
    clearSelection,
    saveAvatar,
    removeAvatar,
  } = useProfileAvatar({
    user,
    onSuccess: () => {
      toast({
        title: "Avatar Updated",
        description: "Your advocate profile portrait has been successfully saved.",
        variant: "gold",
      });
      onOpenChange(false);
    },
    onError: (err) => {
      toast({
        title: "Avatar Update Failed",
        description: err.message || "Failed to update profile avatar.",
        variant: "destructive",
      });
    },
  });

  const currentAvatarUrl = user?.avatarUrl || user?.avatar?.url || null;

  // Handle file drop
  const handleDragOver = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = React.useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        selectAvatarFile(files[0]);
      }
    },
    [selectAvatarFile]
  );

  const handleFileInputChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        selectAvatarFile(files[0]);
      }
      // Reset input value so same file can be re-selected if cleared
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [selectAvatarFile]
  );

  const handleClose = React.useCallback(() => {
    if (isProcessing) return;
    clearSelection();
    setConfirmRemoveOpen(false);
    onOpenChange(false);
  }, [clearSelection, isProcessing, onOpenChange]);

  const handleConfirmRemove = React.useCallback(async () => {
    try {
      await removeAvatar();
      setConfirmRemoveOpen(false);
      toast({
        title: "Avatar Removed",
        description: "Your advocate profile avatar was removed.",
        variant: "default",
      });
      onOpenChange(false);
    } catch {
      // Handled by onError in useProfileAvatar
    }
  }, [onOpenChange, removeAvatar, toast]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl p-0 overflow-hidden border border-border/80 dark:border-white/10 shadow-2xl">
        {/* Top Gold Specular Accent */}
        <div className="h-1 w-full bg-gradient-to-r from-transparent via-gold-500 to-transparent" />

        <div className="p-6 space-y-6">
          <DialogHeader className="text-left space-y-1.5">
            <div className="flex items-center justify-between">
              <Badge variant="gold" className="text-[10px] uppercase tracking-wider font-semibold">
                Media Management
              </Badge>
              {currentAvatarUrl && !selectedFile && (
                <span className="text-[11px] text-muted-foreground font-mono">
                  Cloudinary Indexed
                </span>
              )}
            </div>
            <DialogTitle className="font-serif text-2xl font-bold tracking-tight text-foreground">
              Advocate Profile Headshot
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Upload, optimize, or replace the official headshot for Advocate Oly Chowdhury. Maximum allowed file size is 2 MB.
            </DialogDescription>
          </DialogHeader>

          {/* Active Preview & Comparison Area */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 1. Current Active Avatar */}
            <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-muted/30 dark:bg-card/40 border border-border/60 text-center space-y-3">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                Current Active Avatar
              </span>
              <div className="relative w-28 h-28 rounded-2xl overflow-hidden border-2 border-border/80 dark:border-white/15 bg-background shadow-md flex items-center justify-center">
                {currentAvatarUrl ? (
                  <Image
                    src={currentAvatarUrl}
                    alt={user?.name || "Advocate Oly Chowdhury"}
                    fill
                    sizes="112px"
                    className="object-cover"
                    priority
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-gold-600 dark:text-gold-400 font-serif font-bold text-2xl">
                    <span>OC</span>
                    <span className="text-[9px] font-sans font-normal text-muted-foreground uppercase tracking-widest mt-0.5">
                      No Photo
                    </span>
                  </div>
                )}
              </div>
              <div className="text-[11px] text-muted-foreground font-mono truncate max-w-[180px]">
                {user?.avatar?.originalFileName || (currentAvatarUrl ? "Saved Headshot" : "Default Initial Monogram")}
              </div>
            </div>

            {/* 2. New Selection Preview */}
            <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-muted/30 dark:bg-card/40 border border-border/60 text-center space-y-3">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                {previewUrl ? "Selected Preview" : "Pending Selection"}
              </span>
              <div className="relative w-28 h-28 rounded-2xl overflow-hidden border-2 border-dashed border-gold-500/50 bg-background/50 shadow-inner flex items-center justify-center">
                {previewUrl ? (
                  <Image
                    src={previewUrl}
                    alt="New avatar preview"
                    fill
                    sizes="112px"
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-muted-foreground/60 p-2">
                    <ImageIcon className="w-8 h-8 stroke-[1.5] mb-1" />
                    <span className="text-[10px]">No image picked</span>
                  </div>
                )}

                {previewUrl && !isProcessing && (
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="absolute top-1 right-1 p-1 rounded-full bg-midnight-950/80 text-white hover:bg-destructive transition-colors shadow-sm cursor-pointer"
                    title="Remove selected preview"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {selectedFile ? (
                <div className="space-y-0.5 text-center">
                  <p className="text-[11px] font-medium text-foreground truncate max-w-[180px]">
                    {selectedFile.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-mono">
                    {formatByteSize(selectedFile.size)} • {selectedFile.type || "image"}
                  </p>
                </div>
              ) : (
                <span className="text-[11px] text-muted-foreground italic">
                  Select a photo below
                </span>
              )}
            </div>
          </div>

          {/* Drag & Drop Upload Zone */}
          {!selectedFile && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-6 rounded-2xl border-2 border-dashed transition-all duration-200 text-center cursor-pointer flex flex-col items-center justify-center gap-2.5 ${
                isDragging
                  ? "border-gold-500 bg-gold-500/10 scale-[1.01]"
                  : "border-border/80 dark:border-white/10 hover:border-gold-500/50 hover:bg-muted/40 bg-card/40"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/jpg"
                className="hidden"
                onChange={handleFileInputChange}
              />

              <div className="w-12 h-12 rounded-xl bg-gold-500/10 border border-gold-500/20 flex items-center justify-center text-gold-600 dark:text-gold-400 shadow-sm">
                <UploadCloud className="w-6 h-6" />
              </div>

              <div className="space-y-1">
                <p className="text-xs font-semibold text-foreground">
                  <span className="text-gold-600 dark:text-gold-400 hover:underline">
                    Click to browse
                  </span>{" "}
                  or drag & drop headshot photo
                </p>
                <p className="text-[11px] text-muted-foreground">
                  PNG, JPG, or WebP (Maximum 2 MB • Aspect ratio 1:1 recommended)
                </p>
              </div>
            </div>
          )}

          {/* Validation & Compression Feedback Banner */}
          {error && (
            <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/30 flex items-start gap-3 text-destructive animate-in fade-in duration-200">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="space-y-0.5 text-xs">
                <p className="font-semibold">Image Validation Error</p>
                <p className="opacity-90">{error}</p>
              </div>
            </div>
          )}

          {/* Compression Stats Notification */}
          {compressionStats && compressionStats.didCompress && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-300 animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-500" />
                <span>
                  <strong>Compressed:</strong> {formatByteSize(compressionStats.originalSizeBytes)} →{" "}
                  {formatByteSize(compressionStats.compressedSizeBytes)}
                </span>
              </div>
              <Badge variant="emerald" className="font-mono text-[10px]">
                -{Math.round(compressionStats.compressionRatio * 100)}% Saved
              </Badge>
            </div>
          )}

          {/* Upload Progress & Active Stage Display */}
          {isProcessing && (
            <div className="p-4 rounded-xl bg-gold-500/10 border border-gold-500/25 space-y-2.5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-foreground flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 text-gold-500 animate-spin" />
                  {stageMessage || "Processing image..."}
                </span>
                <span className="font-mono text-xs font-semibold text-gold-600 dark:text-gold-400">
                  {stage === "uploading" ? `${uploadProgress}%` : ""}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="h-1.5 w-full rounded-full bg-border/50 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-gold-600 to-gold-400 transition-all duration-300 rounded-full"
                  style={{
                    width:
                      stage === "uploading"
                        ? `${Math.max(5, uploadProgress)}%`
                        : stage === "saving"
                        ? "90%"
                        : "35%",
                  }}
                />
              </div>
            </div>
          )}

          {/* Confirmation to Remove Avatar */}
          {confirmRemoveOpen && (
            <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 space-y-3 animate-in fade-in duration-200">
              <p className="text-xs font-medium text-destructive">
                Are you sure you want to remove your profile avatar? Your profile will revert to displaying default monogram initials.
              </p>
              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmRemoveOpen(false)}
                  disabled={isProcessing}
                  className="h-8 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleConfirmRemove}
                  disabled={isProcessing}
                  className="h-8 text-xs gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Confirm Removal
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Dialog Footer Actions */}
        <DialogFooter className="p-6 bg-muted/20 dark:bg-card/20 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {currentAvatarUrl && !confirmRemoveOpen && !selectedFile && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setConfirmRemoveOpen(true)}
                disabled={isProcessing}
                className="w-full sm:w-auto text-xs text-destructive border-destructive/30 hover:bg-destructive/10 gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Remove Avatar
              </Button>
            )}

            {selectedFile && !isProcessing && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearSelection}
                className="w-full sm:w-auto text-xs"
              >
                Clear Selection
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClose}
              disabled={isProcessing}
              className="w-full sm:w-auto text-xs"
            >
              Cancel
            </Button>

            <Button
              type="button"
              variant="gold"
              size="sm"
              onClick={saveAvatar}
              disabled={!selectedFile || isProcessing}
              className="w-full sm:w-auto text-xs font-semibold gap-1.5 shadow-sm"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <FileCheck className="w-3.5 h-3.5" />
                  <span>Save Avatar</span>
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ProfileAvatarDialog;
