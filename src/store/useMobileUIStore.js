import { create } from 'zustand';

export const useMobileUIStore = create((set, get) => ({
  // Mobile-specific UI state
  showShapeLibrary: false,
  showPropertiesPanel: false,
  showLayersPanel: false,
  activeToolCategory: 'shapes',
  isMobile: typeof window !== 'undefined' && window.innerWidth < 768,
  isTablet: typeof window !== 'undefined' && window.innerWidth >= 768 && window.innerWidth < 1024,

  toggleShapeLibrary: () => {
    set((state) => ({
      showShapeLibrary: !state.showShapeLibrary,
      showPropertiesPanel: false,
      showLayersPanel: false,
    }));
  },

  togglePropertiesPanel: () => {
    set((state) => ({
      showPropertiesPanel: !state.showPropertiesPanel,
      showShapeLibrary: false,
      showLayersPanel: false,
    }));
  },

  toggleLayersPanel: () => {
    set((state) => ({
      showLayersPanel: !state.showLayersPanel,
      showShapeLibrary: false,
      showPropertiesPanel: false,
    }));
  },

  closeAllPanels: () => {
    set({
      showShapeLibrary: false,
      showPropertiesPanel: false,
      showLayersPanel: false,
    });
  },

  setActiveToolCategory: (category) => {
    set({ activeToolCategory: category });
  },

  updateScreenSize: () => {
    const width = typeof window !== 'undefined' ? window.innerWidth : 0;
    set({
      isMobile: width < 768,
      isTablet: width >= 768 && width < 1024,
    });
  },
}));
