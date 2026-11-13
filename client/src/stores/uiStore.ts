import { create } from 'zustand';

interface UiState {
  activeTab: 'map' | 'video';
  mapEngine: 'tactical' | 'cesium';
  showPfd: boolean;
  setActiveTab: (tab: 'map' | 'video') => void;
  setMapEngine: (engine: 'tactical' | 'cesium') => void;
  togglePfd: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  activeTab: 'map',
  mapEngine: 'tactical',
  showPfd: true,
  setActiveTab: (activeTab) => set({ activeTab }),
  setMapEngine: (mapEngine) => set({ mapEngine }),
  togglePfd: () => set((state) => ({ showPfd: !state.showPfd })),
}));
