// Sends the downscaled photo to /api/stylize (a Vercel serverless function
// backed by OpenAI's image-edit API) and decodes the returned cartoon image
// back into ImageData for the line-art pipeline.
//
// Callers should fall back to the original photo's ImageData if this throws
// — a network hiccup or missing API key shouldn't block the coloring flow.

function imageDataToPngBlob(imageData) {
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  canvas.getContext('2d').putImageData(imageData, 0, 0);
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function base64PngToImageData(base64) {
  const res = await fetch(`data:image/png;base64,${base64}`);
  const blob = await res.blob();
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

/**
 * @param {ImageData} imageData
 * @returns {Promise<ImageData>}
 */
export async function stylizeToCartoon(imageData) {
  const blob = await imageDataToPngBlob(imageData);
  const base64 = arrayBufferToBase64(await blob.arrayBuffer());

  const res = await fetch('/api/stylize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64: base64 }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Stylize request failed (${res.status})`);
  }

  const { imageBase64: resultBase64 } = await res.json();
  return base64PngToImageData(resultBase64);
}
