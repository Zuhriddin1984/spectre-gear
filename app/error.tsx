'use client';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="panel stack">
      <h2 style={{ margin: 0 }}>Хатолик юз берди / Произошла ошибка</h2>
      <p className="note">Саҳифани янгиланг. Хато такрорланса, шу экраннинг скриншотини юборинг. / Обновите страницу. Если ошибка повторится, пришлите скриншот.</p>
      <pre className="note" style={{ whiteSpace: 'pre-wrap' }}>{error.digest ? `Digest: ${error.digest}` : error.message}</pre>
      <button className="btn" onClick={reset}>Қайта уриниш / Повторить</button>
    </div>
  );
}
