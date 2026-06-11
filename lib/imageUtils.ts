/**
 * Compresses a base64 image string by resizing it and lowering the quality.
 * @param base64Str Target base64 image string.
 * @param maxWidth Maximum width of the image.
 * @param maxHeight Maximum height of the image.
 * @param quality Quality of the output JPEG (0 to 1).
 * @returns Promise resolving to the compressed base64 string.
 */
export const compressImage = async (
  base64Str: string,
  maxWidth: number = 800,
  maxHeight: number = 800,
  quality: number = 0.7
): Promise<string> => {
  if (!base64Str || !base64Str.startsWith('data:image/')) return base64Str;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Calculate new dimensions
      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      // We use image/jpeg for better compression
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = (err) => reject(err);
    img.src = base64Str;
  });
};
