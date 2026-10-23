'use client';

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  return (
    <html>
      <body style={{ font: '15px system-ui', padding: 24, maxWidth: 640 }}>
        <h2>Spectre Gear: хатолик / ошибка</h2>
        <p>Саҳифани янгиланг. Хато такрорланса, скриншот юборинг. / Обновите страницу. Если ошибка повторится, пришлите скриншот.</p>
        <pre style={{ whiteSpace: 'pre-wrap', background: '#f3f4f6', padding: 12 }}>{error.digest ? `Digest: ${error.digest}` : error.message}</pre>
        <a href="/login">/login</a>
      </body>
    </html>
  );
}
