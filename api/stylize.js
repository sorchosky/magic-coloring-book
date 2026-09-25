// Vercel serverless function: proxies a photo to OpenAI's image-edit API to
// redraw it as a finished black-and-white coloring book page (monoline
// strokes, pure white interiors, closed shapes). Our line-art pass then just
// binarizes that, rather than re-deriving lines from a colored image.
// The API key lives only here (server-side env var) — never in the client
// bundle.
//
// Requires OPENAI_API_KEY set in Vercel project env vars (and .env.local for
// local dev via `vercel dev`).

const OPENAI_IMAGES_EDIT_URL = 'https://api.openai.com/v1/images/edits';

const STYLE_PROMPT =
  'Redraw this photo as a finished black-and-white coloring book page for a ' +
  'young child. Output line art only: pure white throughout with solid black ' +
  'outlines — absolutely no color, no gray, no shading, no gradients, no ' +
  'hatching, no stippling, no shadows, and no filled-in dark areas. ' +
  'Draw every outline as a single clean monoline stroke of one consistent, ' +
  'even, medium-bold weight, like a felt-tip marker. Every shape must be a ' +
  'fully closed loop with no gaps or breaks anywhere in any line. ' +
  'Simplify the subject into a small number of large, rounded, friendly ' +
  'shapes with generous open white space inside them for a toddler to color. ' +
  'Keep only the interior lines essential to recognizing the subject, and ' +
  'draw any face with simple dot or oval eyes and a small simple mouth. ' +
  'Merge grass, leaves, fur, feathers, foliage, patterns and any other ' +
  'repeating texture into a few big simple shapes rather than drawing ' +
  'individual blades, strands or details. Place the subject on a plain white ' +
  'background with at most two or three simple background shapes. ' +
  'Keep the same subject, pose and overall composition. ' +
  'No text, no watermark, no signature, no border or frame.';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('stylize: OPENAI_API_KEY is not set for this environment.');
    res.status(500).json({ error: 'Server is missing OPENAI_API_KEY.' });
    return;
  }

  const { imageBase64 } = req.body || {};
  if (!imageBase64) {
    res.status(400).json({ error: 'Missing imageBase64 in request body.' });
    return;
  }

  try {
    const imageBuffer = Buffer.from(imageBase64, 'base64');

    const form = new FormData();
    form.append('model', 'gpt-image-1');
    form.append('image', new Blob([imageBuffer], { type: 'image/png' }), 'photo.png');
    form.append('prompt', STYLE_PROMPT);
    form.append('size', 'auto');
    // 'medium' rather than 'low': wobbly or broken strokes at low quality
    // mean unclosed contours, and unclosed contours leak flood fill across
    // the whole image — the app's main failure mode. Still inside the
    // approved ~$0.02-0.07/image budget (see docs/DECISIONS.md).
    form.append('quality', 'medium');
    form.append('n', '1');

    const openaiRes = await fetch(OPENAI_IMAGES_EDIT_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      console.error(`stylize: OpenAI request failed (${openaiRes.status}): ${errText}`);
      res.status(502).json({ error: `OpenAI request failed: ${errText}` });
      return;
    }

    const data = await openaiRes.json();
    const resultBase64 = data?.data?.[0]?.b64_json;
    if (!resultBase64) {
      console.error('stylize: OpenAI response missing b64_json:', JSON.stringify(data));
      res.status(502).json({ error: 'OpenAI response did not include image data.' });
      return;
    }

    res.status(200).json({ imageBase64: resultBase64 });
  } catch (err) {
    console.error('stylize: unhandled error', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown server error.' });
  }
}
