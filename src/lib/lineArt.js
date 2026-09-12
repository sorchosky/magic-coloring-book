// Converts a photo's ImageData into a black-and-white line-art coloring page.
//
// Pipeline: grayscale -> median smoothing -> edge detection (DoG or adaptive
// threshold, switchable for comparison) -> morphological closing (seals gaps
// so flood fill can't leak) -> speckle removal -> boolean line mask.
//
// Tune these against real photos of people, pets, and toys.
export const LINE_ART_PARAMS = {
  // Median filter radius (in px) applied to grayscale before edge detection.
  // This is the #1 defense against photo noise / skin texture producing
  // garbage edges. Raise it if skin/fur still shows up as scribbles.
  MEDIAN_RADIUS: 2,

  // Difference-of-Gaussians edge detector: blur at two scales, subtract,
  // threshold the absolute difference. sigma2 should be roughly 2x sigma1.
  DOG_SIGMA_1: 1.0,
  DOG_SIGMA_2: 2.0,
  DOG_THRESHOLD: 4,

  // Adaptive threshold (local-mean) edge detector: flag a pixel as an edge
  // when it deviates from its local neighborhood average by more than C.
  ADAPTIVE_BLOCK_RADIUS: 7,
  ADAPTIVE_C: 6,

  // Morphological closing (dilate then erode) on the edge mask, to seal
  // small gaps in outlines. CRITICAL: open contours leak flood fill across
  // the whole image. Raise these if lines still have visible breaks.
  MORPH_DILATE_RADIUS: 1,
  MORPH_ERODE_RADIUS: 1,

  // Connected components of edge pixels smaller than this (in px) are
  // dropped as speckle noise.
  MIN_SPECKLE_AREA: 8,
};

function toGrayscale(imageData) {
  const { data, width, height } = imageData;
  const gray = new Float32Array(width * height);
  for (let i = 0, p = 0; p < gray.length; i += 4, p++) {
    // Rec. 601 luma weights.
    gray[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  return gray;
}

function clampIndex(v, max) {
  if (v < 0) return 0;
  if (v > max) return max;
  return v;
}

// Median filter via a reusable scratch buffer + insertion sort — the window
// is small (radius 2 = 25 samples) so this beats Array.sort() allocation
// churn across a million pixels.
function medianFilter(src, width, height, radius) {
  if (radius <= 0) return src;
  const size = (radius * 2 + 1) ** 2;
  const window = new Float32Array(size);
  const out = new Float32Array(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let count = 0;
      for (let dy = -radius; dy <= radius; dy++) {
        const sy = clampIndex(y + dy, height - 1);
        for (let dx = -radius; dx <= radius; dx++) {
          const sx = clampIndex(x + dx, width - 1);
          window[count++] = src[sy * width + sx];
        }
      }
      // Insertion sort in place (fast for small, mostly-similar windows).
      for (let i = 1; i < count; i++) {
        const v = window[i];
        let j = i - 1;
        while (j >= 0 && window[j] > v) {
          window[j + 1] = window[j];
          j--;
        }
        window[j + 1] = v;
      }
      out[y * width + x] = window[count >> 1];
    }
  }
  return out;
}

function gaussianKernel1D(sigma, radius) {
  const size = radius * 2 + 1;
  const kernel = new Float32Array(size);
  let sum = 0;
  for (let i = -radius; i <= radius; i++) {
    const v = Math.exp(-(i * i) / (2 * sigma * sigma));
    kernel[i + radius] = v;
    sum += v;
  }
  for (let i = 0; i < size; i++) kernel[i] /= sum;
  return kernel;
}

// Separable convolution with clamped (edge-replicated) borders.
function convolveSeparable(src, width, height, kernel) {
  const radius = (kernel.length - 1) / 2;
  const tmp = new Float32Array(width * height);
  const out = new Float32Array(width * height);

  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      let sum = 0;
      for (let k = -radius; k <= radius; k++) {
        const sx = clampIndex(x + k, width - 1);
        sum += src[row + sx] * kernel[k + radius];
      }
      tmp[row + x] = sum;
    }
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      for (let k = -radius; k <= radius; k++) {
        const sy = clampIndex(y + k, height - 1);
        sum += tmp[sy * width + x] * kernel[k + radius];
      }
      out[y * width + x] = sum;
    }
  }
  return out;
}

function gaussianBlur(src, width, height, sigma) {
  const radius = Math.max(1, Math.ceil(sigma * 3));
  const kernel = gaussianKernel1D(sigma, radius);
  return convolveSeparable(src, width, height, kernel);
}

// Uniform box blur, used as the "local mean" for adaptive thresholding.
function boxBlur(src, width, height, radius) {
  const size = radius * 2 + 1;
  const kernel = new Float32Array(size).fill(1 / size);
  return convolveSeparable(src, width, height, kernel);
}

function dogEdges(gray, width, height, { sigma1, sigma2, threshold }) {
  const blurred1 = gaussianBlur(gray, width, height, sigma1);
  const blurred2 = gaussianBlur(gray, width, height, sigma2);
  const mask = new Uint8Array(width * height);
  for (let i = 0; i < mask.length; i++) {
    mask[i] = Math.abs(blurred1[i] - blurred2[i]) > threshold ? 1 : 0;
  }
  return mask;
}

function adaptiveEdges(gray, width, height, { blockRadius, c }) {
  const localMean = boxBlur(gray, width, height, blockRadius);
  const mask = new Uint8Array(width * height);
  for (let i = 0; i < mask.length; i++) {
    mask[i] = Math.abs(gray[i] - localMean[i]) > c ? 1 : 0;
  }
  return mask;
}

// Square structuring element dilation/erosion (radius 1 = 3x3 neighborhood).
function dilate(mask, width, height, radius) {
  if (radius <= 0) return mask;
  const out = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let found = 0;
      for (let dy = -radius; dy <= radius && !found; dy++) {
        const sy = y + dy;
        if (sy < 0 || sy >= height) continue;
        for (let dx = -radius; dx <= radius; dx++) {
          const sx = x + dx;
          if (sx < 0 || sx >= width) continue;
          if (mask[sy * width + sx]) {
            found = 1;
            break;
          }
        }
      }
      out[y * width + x] = found;
    }
  }
  return out;
}

function erode(mask, width, height, radius) {
  if (radius <= 0) return mask;
  const out = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let all = 1;
      for (let dy = -radius; dy <= radius && all; dy++) {
        const sy = y + dy;
        for (let dx = -radius; dx <= radius; dx++) {
          const sx = x + dx;
          // Out-of-bounds neighbors count as background, so lines never
          // erode away at the image border.
          if (sy < 0 || sy >= height || sx < 0 || sx >= width || !mask[sy * width + sx]) {
            all = 0;
            break;
          }
        }
      }
      out[y * width + x] = all;
    }
  }
  return out;
}

function morphClose(mask, width, height, dilateRadius, erodeRadius) {
  return erode(dilate(mask, width, height, dilateRadius), width, height, erodeRadius);
}

// Drops connected components of edge/line pixels smaller than minArea —
// isolated noise specks rather than real outlines.
function removeSpeckle(mask, width, height, minArea) {
  const out = mask.slice();
  const visited = new Uint8Array(width * height);
  const stack = new Int32Array(width * height);
  const component = new Int32Array(width * height);

  for (let start = 0; start < out.length; start++) {
    if (!out[start] || visited[start]) continue;

    let stackLen = 0;
    let compLen = 0;
    stack[stackLen++] = start;
    visited[start] = 1;

    while (stackLen > 0) {
      const idx = stack[--stackLen];
      component[compLen++] = idx;
      const x = idx % width;
      const y = (idx - x) / width;

      if (x > 0 && out[idx - 1] && !visited[idx - 1]) {
        visited[idx - 1] = 1;
        stack[stackLen++] = idx - 1;
      }
      if (x < width - 1 && out[idx + 1] && !visited[idx + 1]) {
        visited[idx + 1] = 1;
        stack[stackLen++] = idx + 1;
      }
      if (y > 0 && out[idx - width] && !visited[idx - width]) {
        visited[idx - width] = 1;
        stack[stackLen++] = idx - width;
      }
      if (y < height - 1 && out[idx + width] && !visited[idx + width]) {
        visited[idx + width] = 1;
        stack[stackLen++] = idx + width;
      }
    }

    if (compLen < minArea) {
      for (let i = 0; i < compLen; i++) out[component[i]] = 0;
    }
  }

  return out;
}

/**
 * @param {ImageData} imageData
 * @param {{ method?: 'dog' | 'adaptive', params?: typeof LINE_ART_PARAMS }} options
 * @returns {{ lineMask: Uint8Array, width: number, height: number }}
 */
export function generateLineArt(imageData, { method = 'dog', params = LINE_ART_PARAMS } = {}) {
  const { width, height } = imageData;
  const gray = toGrayscale(imageData);
  const smoothed = medianFilter(gray, width, height, params.MEDIAN_RADIUS);

  const edges =
    method === 'adaptive'
      ? adaptiveEdges(smoothed, width, height, {
          blockRadius: params.ADAPTIVE_BLOCK_RADIUS,
          c: params.ADAPTIVE_C,
        })
      : dogEdges(smoothed, width, height, {
          sigma1: params.DOG_SIGMA_1,
          sigma2: params.DOG_SIGMA_2,
          threshold: params.DOG_THRESHOLD,
        });

  const closed = morphClose(edges, width, height, params.MORPH_DILATE_RADIUS, params.MORPH_ERODE_RADIUS);
  const lineMask = removeSpeckle(closed, width, height, params.MIN_SPECKLE_AREA);

  return { lineMask, width, height };
}

// Black lines on opaque white — used for the Phase 1 preview and as the
// base of the line layer canvas in later phases.
export function lineMaskToImageData(lineMask, width, height) {
  const out = new ImageData(width, height);
  for (let i = 0, p = 0; p < lineMask.length; i += 4, p++) {
    const v = lineMask[p] ? 0 : 255;
    out.data[i] = v;
    out.data[i + 1] = v;
    out.data[i + 2] = v;
    out.data[i + 3] = 255;
  }
  return out;
}
