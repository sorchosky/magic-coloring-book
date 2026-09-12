// Loads a File from <input type="file">, downscales it so the longest edge
// is MAX_DIMENSION px, and returns the raw pixel data for the conversion
// pipeline plus a same-size canvas for on-screen preview.

export const MAX_DIMENSION = 1024;

/**
 * @param {File} file
 * @returns {Promise<{ imageData: ImageData, width: number, height: number }>}
 */
export async function loadDownscaledImage(file) {
  // imageOrientation: 'from-image' applies EXIF rotation so photos taken
  // in portrait on iOS aren't sideways.
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });

  const longestEdge = Math.max(bitmap.width, bitmap.height);
  const scale = Math.min(1, MAX_DIMENSION / longestEdge);
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const imageData = ctx.getImageData(0, 0, width, height);
  return { imageData, width, height };
}
