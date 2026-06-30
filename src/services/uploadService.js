export const uploadService = {
  uploadAvatar: async () => {
    throw new Error('Avatar uploads are unavailable without a backend.');
  },

  uploadThumbnail: async (diagramId, canvasDataUrl) => ({
    url: canvasDataUrl,
    success: true
  })
};
