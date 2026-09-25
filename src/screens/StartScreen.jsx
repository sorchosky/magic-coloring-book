import { useRef, useState } from 'react';
import { loadDownscaledImage } from '../lib/imageLoad.js';
import { stylizeToCartoon } from '../lib/stylize.js';

const buttonStyle = {
  flex: 1,
  border: 'none',
  borderRadius: 28,
  fontSize: '1.5rem',
  fontWeight: 700,
  color: '#fff',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 12,
  minHeight: 220,
};

export default function StartScreen({ onPhotoReady }) {
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(null); // 'loading' | 'stylizing' | null
  const cameraInputRef = useRef(null);
  const libraryInputRef = useRef(null);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    setStage('loading');
    try {
      const { imageData } = await loadDownscaledImage(file);

      setStage('stylizing');
      let cartoonImageData = imageData;
      let stylizeError = null;
      try {
        cartoonImageData = await stylizeToCartoon(imageData);
      } catch (err) {
        // No API key configured, offline, quota hit, etc. — fall back to
        // the raw photo rather than blocking the coloring flow, but surface
        // it so a silent fallback isn't mistaken for a working cartoon step.
        stylizeError = err instanceof Error ? err.message : String(err);
        console.warn('Cartoon stylize failed, using original photo:', err);
      }

      onPhotoReady(cartoonImageData, stylizeError);
    } finally {
      setBusy(false);
      setStage(null);
    }
  }

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 24,
        padding: 24,
      }}
    >
      <div style={{ display: 'flex', gap: 20, height: '60%' }}>
        <button
          type="button"
          style={{ ...buttonStyle, background: '#ff8a5c' }}
          onClick={() => cameraInputRef.current?.click()}
          disabled={busy}
        >
          <span style={{ fontSize: '3.5rem' }} aria-hidden>
            📷
          </span>
          Take a Photo
        </button>
        <button
          type="button"
          style={{ ...buttonStyle, background: '#5c9eff' }}
          onClick={() => libraryInputRef.current?.click()}
          disabled={busy}
        >
          <span style={{ fontSize: '3.5rem' }} aria-hidden>
            🖼️
          </span>
          Choose a Photo
        </button>
      </div>

      {busy && (
        <div style={{ textAlign: 'center', fontSize: '1.2rem' }}>
          {stage === 'stylizing' ? 'Cartoonifying…' : 'Loading photo…'}
        </div>
      )}

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFile}
        style={{ display: 'none' }}
      />
      <input
        ref={libraryInputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        style={{ display: 'none' }}
      />
    </div>
  );
}
