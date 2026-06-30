const FOLDERS_KEY = 'canvascraft_folders';
const DIAGRAMS_KEY = 'canvascraft_diagrams';

const readFolders = () => {
  try {
    return JSON.parse(localStorage.getItem(FOLDERS_KEY)) || [];
  } catch {
    return [];
  }
};

const writeFolders = (folders) => {
  localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders));
};

const readDiagrams = () => {
  try {
    return JSON.parse(localStorage.getItem(DIAGRAMS_KEY)) || [];
  } catch {
    return [];
  }
};

const writeDiagrams = (diagrams) => {
  localStorage.setItem(DIAGRAMS_KEY, JSON.stringify(diagrams));
};

const createId = () => `folder-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const collectChildIds = (folderId, folders) => {
  const children = folders.filter((folder) => folder.parentId === folderId);
  return children.reduce(
    (ids, child) => [...ids, ...collectChildIds(child.id, folders)],
    [folderId]
  );
};

export const folderService = {
  getFolders: async () => readFolders(),

  createFolder: async (name, parentId = null) => {
    const now = new Date().toISOString();
    const folder = {
      id: createId(),
      name,
      parentId,
      favorite: false,
      icon: 'folder',
      createdDate: now,
      updatedDate: now
    };

    writeFolders([...readFolders(), folder]);
    return folder;
  },

  renameFolder: async (id, newName) => folderService.updateFolder(id, { name: newName }),

  updateFolder: async (id, updates) => {
    let updatedFolder = null;
    const folders = readFolders().map((folder) => {
      if (folder.id !== id) return folder;
      updatedFolder = {
        ...folder,
        ...updates,
        updatedDate: new Date().toISOString()
      };
      return updatedFolder;
    });

    if (!updatedFolder) throw new Error('Folder not found');
    writeFolders(folders);
    return updatedFolder;
  },

  deleteFolder: async (id) => {
    const folders = readFolders();
    const idsToDelete = collectChildIds(id, folders);

    writeFolders(folders.filter((folder) => !idsToDelete.includes(folder.id)));
    writeDiagrams(
      readDiagrams().map((diagram) => (
        idsToDelete.includes(diagram.folderId)
          ? { ...diagram, folderId: null, updatedDate: new Date().toISOString() }
          : diagram
      ))
    );

    return { success: true };
  }
};
