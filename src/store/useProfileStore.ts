import { create } from "zustand";
import { ProfileTab } from "@/types/profile.ui.type";

interface ProfileState {
  activeTab: ProfileTab;
  isDirty: boolean;
  previewMode: boolean;
  setActiveTab: (tab: ProfileTab) => void;
  setIsDirty: (isDirty: boolean) => void;
  setPreviewMode: (previewMode: boolean) => void;
  reset: () => void;
}

const initialState = {
  activeTab: "general" as ProfileTab,
  isDirty: false,
  previewMode: false,
};

export const useProfileStore = create<ProfileState>((set) => ({
  ...initialState,
  setActiveTab: (activeTab) => set({ activeTab }),
  setIsDirty: (isDirty) => set({ isDirty }),
  setPreviewMode: (previewMode) => set({ previewMode }),
  reset: () => set(initialState),
}));

export default useProfileStore;
