import { create } from 'zustand';

interface UiState {
  activeTab: 'map' | 'video';
  showPfd: boolean;
  setActiveTab: (tab: 'map' | 'video') => void;
  togglePfd: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  activeTab: 'map',
  showPfd: true,
  setActiveTab: (activeTab) => set({ activeTab }),
  togglePfd: () => set((state) => ({ showPfd: !state.showPfd })),
}));
