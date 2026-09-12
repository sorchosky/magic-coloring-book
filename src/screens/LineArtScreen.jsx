import { useEffect, useRef, useState } from 'react';
import { generateLineArt, lineMaskToImageData } from '../lib/lineArt.js';

const toggleButtonStyle = (active) => ({
  border: 'none',
  borderRadius: 16,
  padding: '10px 18px',
  fontSize: '0.95rem',
  fontWeight: 600,
  background: active ? '#2b2b2b' : '#e6e0d4',
  color: active ? '#fff' : '#2b2b2b',
});

export default function LineArtScreen({ imageData, onStartOver }) {
  const canvasRef = useRef(null);
  const [method, setMethod] = useState('dog');
  const [processing, setProcessing] = useState(true);
  const [elapsedMs, setElapsedMs] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setProcessing(true);

    // Defer to a microtask/frame so the "Converting…" state actually paints
    // before the synchronous pipeline blocks the main thread.
    const raf = requestAnimationFrame(() => {
      const start = performance.now();
      const { lineMask, width, height } = generateLineArt(imageData, { method });
      const duration = performance.now() - start;
      if (cancelled) return;

      const canvas = canvasRef.current;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.putImageData(lineMaskToImageData(lineMask, width, height), 0, 0);

      setElapsedMs(Math.round(duration));
      setProcessing(false);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [imageData, method]);

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: '#fdf6ec',
      }}
    >
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <canvas
          ref={canvasRef}
          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
        />
        {processing && (
          <div style={{ position: 'absolute', fontSize: '1.2rem' }}>Converting…</div>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: 16,
          borderTop: '1px solid #e6e0d4',
        }}
      >
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" style={toggleButtonStyle(method === 'dog')} onClick={() => setMethod('dog')}>
            DoG
          </button>
          <button
            type="button"
            style={toggleButtonStyle(method === 'adaptive')}
            onClick={() => setMethod('adaptive')}
          >
            Adaptive
          </button>
        </div>

        {elapsedMs != null && (
          <span style={{ fontSize: '0.85rem', color: '#888' }}>{elapsedMs}ms</span>
        )}

        <button
          type="button"
          onClick={onStartOver}
          style={{
            border: 'none',
            borderRadius: 16,
            padding: '10px 18px',
            fontSize: '0.95rem',
            fontWeight: 600,
            background: '#ff8a5c',
            color: '#fff',
          }}
        >
          Start Over
        </button>
      </div>
    </div>
  );
}
