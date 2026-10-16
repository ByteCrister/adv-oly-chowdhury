import { create } from "zustand";
import { UploadResult } from "@/types/media.types";
import { AssetOwnerType, AssetPurpose } from "@/const/asset-reference.const";

export type MediaItemStatus =
  | "idle"
  | "hashing"
  | "preparing"
  | "uploading"
  | "finalizing"
  | "completed"
  | "error";

export interface MediaQueueItem {
  id: string;
  file: File;
  fileHash?: string;
  previewUrl: string;
  progress: number;
  status: MediaItemStatus;
  result?: UploadResult;
  error?: string;
  ownerType?: AssetOwnerType;
  ownerId?: string;
  purpose?: AssetPurpose;
  caption?: string;
  description?: string;
}

interface MediaState {
  queue: MediaQueueItem[];
  isGlobalUploading: boolean;
  overallProgress: number;

  // Actions
  addFilesToQueue: (
    files: File[],
    defaultMeta?: {
      ownerType?: AssetOwnerType;
      ownerId?: string;
      purpose?: AssetPurpose;
      caption?: string;
      description?: string;
    }
  ) => string[]; // returns generated item IDs
  updateItemProgress: (id: string, progress: number) => void;
  setItemStatus: (
    id: string,
    status: MediaItemStatus,
    extra?: Partial<MediaQueueItem>
  ) => void;
  setItemCompleted: (id: string, result: UploadResult) => void;
  setItemError: (id: string, error: string) => void;
  removeQueueItem: (id: string) => void;
  clearQueue: () => void;
  setGlobalUploading: (isUploading: boolean) => void;
}

export const useMediaStore = create<MediaState>((set, get) => ({
  queue: [],
  isGlobalUploading: false,
  overallProgress: 0,

  addFilesToQueue: (files, defaultMeta) => {
    const generatedIds: string[] = [];

    const newItems: MediaQueueItem[] = files.map((file, idx) => {
      const id = `upload_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 7)}`;
      generatedIds.push(id);

      const isImage = file.type.startsWith("image/");
      const previewUrl = isImage ? URL.createObjectURL(file) : "";

      return {
        id,
        file,
        previewUrl,
        progress: 0,
        status: "idle",
        ownerType: defaultMeta?.ownerType,
        ownerId: defaultMeta?.ownerId,
        purpose: defaultMeta?.purpose,
        caption: defaultMeta?.caption,
        description: defaultMeta?.description,
      };
    });

    set((state) => ({
      queue: [...state.queue, ...newItems],
    }));

    return generatedIds;
  },

  updateItemProgress: (id, progress) => {
    set((state) => {
      const updatedQueue = state.queue.map((item) =>
        item.id === id ? { ...item, progress, status: "uploading" as MediaItemStatus } : item
      );

      const totalProgress =
        updatedQueue.reduce((acc, curr) => acc + curr.progress, 0) /
        (updatedQueue.length || 1);

      return {
        queue: updatedQueue,
        overallProgress: Math.round(totalProgress),
      };
    });
  },

  setItemStatus: (id, status, extra) => {
    set((state) => ({
      queue: state.queue.map((item) =>
        item.id === id ? { ...item, status, ...extra } : item
      ),
    }));
  },

  setItemCompleted: (id, result) => {
    set((state) => {
      const updatedQueue = state.queue.map((item) =>
        item.id === id
          ? {
              ...item,
              progress: 100,
              status: "completed" as MediaItemStatus,
              result,
            }
          : item
      );

      const totalProgress =
        updatedQueue.reduce((acc, curr) => acc + curr.progress, 0) /
        (updatedQueue.length || 1);

      return {
        queue: updatedQueue,
        overallProgress: Math.round(totalProgress),
      };
    });
  },

  setItemError: (id, error) => {
    set((state) => ({
      queue: state.queue.map((item) =>
        item.id === id
          ? {
              ...item,
              status: "error" as MediaItemStatus,
              error,
            }
          : item
      ),
    }));
  },

  removeQueueItem: (id) => {
    const item = get().queue.find((i) => i.id === id);
    if (item?.previewUrl) {
      URL.revokeObjectURL(item.previewUrl);
    }

    set((state) => {
      const updatedQueue = state.queue.filter((i) => i.id !== id);
      const totalProgress = updatedQueue.length
        ? updatedQueue.reduce((acc, curr) => acc + curr.progress, 0) /
          updatedQueue.length
        : 0;

      return {
        queue: updatedQueue,
        overallProgress: Math.round(totalProgress),
      };
    });
  },

  clearQueue: () => {
    get().queue.forEach((item) => {
      if (item.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
    });

    set({
      queue: [],
      overallProgress: 0,
      isGlobalUploading: false,
    });
  },

  setGlobalUploading: (isGlobalUploading) => {
    set({ isGlobalUploading });
  },
}));
