const STORAGE_KEY = 'canvascraft_diagrams';

const readDiagrams = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
};

const writeDiagrams = (diagrams) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(diagrams));
};

const createId = () => `diagram-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const diagramService = {
  getDiagrams: async () => readDiagrams(),

  getDiagramById: async (id) => {
    const diagram = readDiagrams().find((item) => item.id === id);
    if (!diagram) throw new Error('Diagram not found');
    return diagram;
  },

  createDiagram: async (diagramData) => {
    const now = new Date().toISOString();
    const newDiagram = {
      id: createId(),
      name: diagramData.name || 'Untitled Diagram',
      folderId: diagramData.folderId ?? null,
      diagramJson: diagramData.diagramJson || { nodes: [], edges: [] },
      thumbnail: diagramData.thumbnail || '',
      tags: diagramData.tags || [],
      favorite: !!diagramData.favorite,
      shared: !!diagramData.shared,
      archived: !!diagramData.archived,
      createdDate: now,
      updatedDate: now,
      lastOpened: now
    };

    const diagrams = [newDiagram, ...readDiagrams()];
    writeDiagrams(diagrams);
    return newDiagram;
  },

  updateDiagram: async (id, updates) => {
    let updatedDiagram = null;
    const diagrams = readDiagrams().map((diagram) => {
      if (diagram.id !== id) return diagram;
      updatedDiagram = {
        ...diagram,
        ...updates,
        updatedDate: new Date().toISOString()
      };
      return updatedDiagram;
    });

    if (!updatedDiagram) throw new Error('Diagram not found');
    writeDiagrams(diagrams);
    return updatedDiagram;
  },

  deleteDiagram: async (id) => {
    writeDiagrams(readDiagrams().filter((diagram) => diagram.id !== id));
    return { success: true };
  }
};
