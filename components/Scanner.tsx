'use client';
import { useEffect, useRef, useState } from 'react';

// Camera QR reader. Calls onCode with the item code ("https://…/items/CAM-011" or "spectre:CAM-011" → "CAM-011").
export default function Scanner({ onCode, labels }: { onCode: (code: string) => void; labels: { start: string; stop: string; denied: string } }) {
  const [on, setOn] = useState(false);
  const [err, setErr] = useState('');
  const ref = useRef<any>(null);
  const cb = useRef(onCode);
  cb.current = onCode;
  const last = useRef({ code: '', at: 0 });

  useEffect(() => {
    if (!on) return;
    let stopped = false;
    (async () => {
      const { Html5Qrcode } = await import('html5-qrcode');
      if (stopped) return;
      const s = new Html5Qrcode('reader');
      ref.current = s;
      try {
        await s.start({ facingMode: 'environment' }, { fps: 10, qrbox: 220 }, (text: string) => {
          const m = text.match(/\/items\/([^/?#]+)/);
          const code = (m ? decodeURIComponent(m[1]) : text.replace(/^spectre:/i, '')).trim().toUpperCase();
          const now = Date.now();
          if (code === last.current.code && now - last.current.at < 2500) return;
          last.current = { code, at: now };
          cb.current(code);
        }, () => {});
        // stopped while the camera was still starting (e.g. permission prompt): turn it off now
        if (stopped) s.stop().catch(() => {}).finally(() => s.clear?.());
      } catch {
        if (stopped) return;
        setErr(labels.denied);
        setOn(false);
      }
    })();
    return () => {
      stopped = true;
      const s = ref.current;
      ref.current = null;
      if (s) s.stop().catch(() => {}).finally(() => s.clear?.());
    };
  }, [on, labels.denied]);

  return (
    <div className="stack">
      <div id="reader" />
      {err && <div className="warnbox">{err}</div>}
      <div><button type="button" className={on ? 'btn' : 'btn primary'} onClick={() => { setErr(''); setOn(!on); }}>{on ? labels.stop : labels.start}</button></div>
    </div>
  );
}
