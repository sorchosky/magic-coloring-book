// Vercel serverless function: proxies a photo to OpenAI's image-edit API to
// redraw it as a flat-color cartoon, suitable input for our own line-art
// extraction. The API key lives only here (server-side env var) — never in
// the client bundle.
//
// Requires OPENAI_API_KEY set in Vercel project env vars (and .env.local for
// local dev via `vercel dev`).

const OPENAI_IMAGES_EDIT_URL = 'https://api.openai.com/v1/images/edits';

const STYLE_PROMPT =
  'Redraw this photo as a simple, flat-color cartoon illustration suitable ' +
  'as the basis for a children’s coloring book: bold clean shapes, smooth ' +
  'flat areas of color, minimal fine texture or detail, clear simple outlines. ' +
  'Keep the same subject, pose, and composition. No text or watermarks.';

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
    form.append('quality', 'low');
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
