import { create } from 'zustand';

const getInitialTheme = () => {
  const saved = localStorage.getItem('app_theme');
  if (saved) return saved;
  return 'pastel';
};

const getInitialSettings = () => {
  const saved = localStorage.getItem('app_settings');
  return saved ? JSON.parse(saved) : {
    emailNotifications: true,
    pushNotifications: false,
    autosave: true,
    gridSnapping: true,
    gridSize: 10
  };
};

export const useUIStore = create((set, get) => ({
  theme: getInitialTheme(),
  settings: getInitialSettings(),
  notifications: [],

  setTheme: (theme) => {
    localStorage.setItem('app_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    set({ theme });
  },

  updateSettings: (newSettings) => {
    const updated = { ...get().settings, ...newSettings };
    localStorage.setItem('app_settings', JSON.stringify(updated));
    set({ settings: updated });
  },

  addNotification: (message, type = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    set((state) => ({
      notifications: [...state.notifications, { id, message, type }]
    }));

    // Auto-remove notification after 4 seconds
    setTimeout(() => {
      get().removeNotification(id);
    }, 4000);

    return id;
  },

  removeNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id)
    }));
  }
}));

// Apply initial theme on import/startup
if (typeof window !== 'undefined') {
  const theme = getInitialTheme();
  document.documentElement.setAttribute('data-theme', theme);
}
