import { create } from 'zustand';
import { diagramService } from '../services/diagramService';

export const useDiagramStore = create((set, get) => ({
  diagrams: [],
  activeDiagram: null,
  loading: false,
  error: null,
  undoStack: [],
  redoStack: [],

  fetchDiagrams: async () => {
    set({ loading: true, error: null });
    try {
      const diagrams = await diagramService.getDiagrams();
      set({ diagrams, loading: false });
    } catch (err) {
      set({ error: err.message || 'Failed to fetch diagrams', loading: false });
    }
  },

  createDiagram: async (name, folderId = null) => {
    set({ loading: true, error: null });
    try {
      const initialJson = { nodes: [], edges: [] };
      const newDiagram = await diagramService.createDiagram({
        name,
        folderId,
        diagramJson: initialJson,
        thumbnail: '',
        tags: [],
        favorite: false,
        shared: false,
        archived: false,
      });
      set((state) => ({
        diagrams: [newDiagram, ...state.diagrams],
        loading: false
      }));
      return newDiagram;
    } catch (err) {
      set({ error: err.message || 'Failed to create diagram', loading: false });
      throw err;
    }
  },

  saveDiagram: async (id, updates) => {
    // updates can contain name, diagramJson, thumbnail, tags, etc.
    try {
      const updated = await diagramService.updateDiagram(id, updates);
      set((state) => ({
        diagrams: state.diagrams.map((d) => (d.id === id ? updated : d)),
        activeDiagram: state.activeDiagram?.id === id ? updated : state.activeDiagram
      }));
      return updated;
    } catch (err) {
      set({ error: err.message || 'Failed to save diagram' });
      throw err;
    }
  },

  deleteDiagram: async (id) => {
    set({ loading: true, error: null });
    try {
      await diagramService.deleteDiagram(id);
      set((state) => ({
        diagrams: state.diagrams.filter((d) => d.id !== id),
        activeDiagram: state.activeDiagram?.id === id ? null : state.activeDiagram,
        loading: false
      }));
    } catch (err) {
      set({ error: err.message || 'Failed to delete diagram', loading: false });
      throw err;
    }
  },

  duplicateDiagram: async (id) => {
    set({ loading: true, error: null });
    try {
      const target = get().diagrams.find((d) => d.id === id);
      if (!target) throw new Error('Diagram not found');
      
      const newDiagram = await diagramService.createDiagram({
        ...target,
        id: undefined, // Let backend/service generate new ID
        name: `${target.name} (Copy)`,
        createdDate: undefined,
        updatedDate: undefined,
        favorite: false,
      });

      set((state) => ({
        diagrams: [newDiagram, ...state.diagrams],
        loading: false
      }));
      return newDiagram;
    } catch (err) {
      set({ error: err.message || 'Failed to duplicate diagram', loading: false });
      throw err;
    }
  },

  starDiagram: async (id) => {
    try {
      const target = get().diagrams.find((d) => d.id === id);
      if (!target) return;
      const updated = await diagramService.updateDiagram(id, { favorite: !target.favorite });
      set((state) => ({
        diagrams: state.diagrams.map((d) => (d.id === id ? updated : d)),
        activeDiagram: state.activeDiagram?.id === id ? updated : state.activeDiagram
      }));
    } catch (err) {
      set({ error: err.message || 'Failed to star diagram' });
    }
  },

  archiveDiagram: async (id, archived = true) => {
    try {
      const updated = await diagramService.updateDiagram(id, { archived });
      set((state) => ({
        diagrams: state.diagrams.map((d) => (d.id === id ? updated : d)),
        activeDiagram: state.activeDiagram?.id === id ? updated : state.activeDiagram
      }));
    } catch (err) {
      set({ error: err.message || 'Failed to archive diagram' });
    }
  },

  moveDiagram: async (id, folderId) => {
    try {
      const updated = await diagramService.updateDiagram(id, { folderId });
      set((state) => ({
        diagrams: state.diagrams.map((d) => (d.id === id ? updated : d)),
        activeDiagram: state.activeDiagram?.id === id ? updated : state.activeDiagram
      }));
    } catch (err) {
      set({ error: err.message || 'Failed to move diagram' });
    }
  },

  openDiagram: async (id) => {
    set({ loading: true, error: null });
    try {
      const diagram = await diagramService.getDiagramById(id);
      
      // Update last opened time
      const updated = await diagramService.updateDiagram(id, { lastOpened: new Date().toISOString() });

      set((state) => ({
        activeDiagram: updated,
        diagrams: state.diagrams.map((d) => (d.id === id ? updated : d)),
        undoStack: [],
        redoStack: [],
        loading: false
      }));
      return updated;
    } catch (err) {
      set({ error: err.message || 'Failed to open diagram', loading: false });
      throw err;
    }
  },

  closeActiveDiagram: () => {
    set({ activeDiagram: null, undoStack: [], redoStack: [] });
  },

  // Editor specific undo/redo canvas operations
  updateCanvasJson: (newJson, isHistoryAction = false) => {
    const active = get().activeDiagram;
    if (!active) return;

    const currentJson = active.diagramJson;

    set((state) => {
      let nextUndo = state.undoStack;
      if (!isHistoryAction) {
        // Push the previous state to the undo stack
        nextUndo = [...state.undoStack, JSON.parse(JSON.stringify(currentJson))];
        // Cap the undo stack at 30 items
        if (nextUndo.length > 30) {
          nextUndo.shift();
        }
      }

      const updatedActive = {
        ...state.activeDiagram,
        diagramJson: newJson,
        updatedDate: new Date().toISOString()
      };

      return {
        activeDiagram: updatedActive,
        diagrams: state.diagrams.map((d) => (d.id === active.id ? updatedActive : d)),
        undoStack: nextUndo,
        // Clear redo stack on user drawing edit, but keep it on history undo/redo
        redoStack: isHistoryAction ? state.redoStack : []
      };
    });
  },

  undo: () => {
    const { activeDiagram, undoStack, redoStack } = get();
    if (!activeDiagram || undoStack.length === 0) return;

    const previousJson = undoStack[undoStack.length - 1];
    const newUndoStack = undoStack.slice(0, -1);
    const newRedoStack = [...redoStack, JSON.parse(JSON.stringify(activeDiagram.diagramJson))];

    set({ undoStack: newUndoStack, redoStack: newRedoStack });
    get().updateCanvasJson(previousJson, true);
  },

  redo: () => {
    const { activeDiagram, undoStack, redoStack } = get();
    if (!activeDiagram || redoStack.length === 0) return;

    const nextJson = redoStack[redoStack.length - 1];
    const newRedoStack = redoStack.slice(0, -1);
    const newUndoStack = [...undoStack, JSON.parse(JSON.stringify(activeDiagram.diagramJson))];

    set({ undoStack: newUndoStack, redoStack: newRedoStack });
    get().updateCanvasJson(nextJson, true);
  }
}));
