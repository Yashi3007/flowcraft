import { create } from 'zustand';
import { folderService } from '../services/folderService';

export const useFolderStore = create((set, get) => ({
  folders: [],
  currentFolderId: null,
  loading: false,
  error: null,

  setCurrentFolderId: (id) => set({ currentFolderId: id }),

  fetchFolders: async () => {
    set({ loading: true, error: null });
    try {
      const folders = await folderService.getFolders();
      set({ folders, loading: false });
    } catch (err) {
      set({ error: err.message || 'Failed to fetch folders', loading: false });
    }
  },

  createFolder: async (name, parentId = null) => {
    set({ loading: true, error: null });
    try {
      const newFolder = await folderService.createFolder(name, parentId);
      set((state) => ({
        folders: [...state.folders, newFolder],
        loading: false
      }));
      return newFolder;
    } catch (err) {
      set({ error: err.message || 'Failed to create folder', loading: false });
      throw err;
    }
  },

  renameFolder: async (id, newName) => {
    set({ loading: true, error: null });
    try {
      const updatedFolder = await folderService.renameFolder(id, newName);
      set((state) => ({
        folders: state.folders.map((f) => (f.id === id ? updatedFolder : f)),
        loading: false
      }));
    } catch (err) {
      set({ error: err.message || 'Failed to rename folder', loading: false });
      throw err;
    }
  },

  deleteFolder: async (id) => {
    set({ loading: true, error: null });
    try {
      await folderService.deleteFolder(id);
      
      // Delete the folder and all its child folders recursively from the state
      const getAllChildFolderIds = (folderId, allFolders) => {
        const children = allFolders.filter((f) => f.parentId === folderId);
        let ids = [folderId];
        children.forEach((child) => {
          ids = [...ids, ...getAllChildFolderIds(child.id, allFolders)];
        });
        return ids;
      };

      const idsToRemove = getAllChildFolderIds(id, get().folders);

      set((state) => ({
        folders: state.folders.filter((f) => !idsToRemove.includes(f.id)),
        // If current folder was inside the deleted folders, reset to root
        currentFolderId: idsToRemove.includes(state.currentFolderId) ? null : state.currentFolderId,
        loading: false
      }));
    } catch (err) {
      set({ error: err.message || 'Failed to delete folder', loading: false });
      throw err;
    }
  },

  toggleFavoriteFolder: async (id) => {
    set({ loading: true, error: null });
    try {
      const folder = get().folders.find((f) => f.id === id);
      if (!folder) return;
      const updatedFolder = await folderService.updateFolder(id, { favorite: !folder.favorite });
      set((state) => ({
        folders: state.folders.map((f) => (f.id === id ? updatedFolder : f)),
        loading: false
      }));
    } catch (err) {
      set({ error: err.message || 'Failed to favorite folder', loading: false });
      throw err;
    }
  }
}));
