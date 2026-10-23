'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Scanner from '@/components/Scanner';
import type { Lang } from '@/lib/i18n';
import { saveAudit } from './actions';

type It = { code: string; name: string; category: string; status: string };

export default function AuditClient({ lang, cats, items }: { lang: Lang; cats: { slug: string; name: string }[]; items: It[] }) {
  const t = (uz: string, ru: string) => (lang === 'ru' ? ru : uz);
  const router = useRouter();
  const [cat, setCat] = useState(cats[0]?.slug ?? '');
  const [found, setFound] = useState<Set<string>>(new Set());
  const [msg, setMsg] = useState('');
  const [manual, setManual] = useState('');
  const [pending, go] = useTransition();
  const expected = items.filter((i) => i.category === cat && (i.status === 'available' || i.status === 'reserved'));
  const n = expected.filter((i) => found.has(i.code)).length;

  function mark(code: string) {
    const it = items.find((i) => i.code === code);
    if (!it) return setMsg(t('Бундай код йўқ: ', 'Нет такого кода: ') + code);
    if (it.category !== cat) return setMsg(t('Бошқа тоифадаги ускуна: ', 'Позиция из другой категории: ') + code);
    if (!expected.includes(it)) return setMsg(`${code}: ${t('ҳозир омборда бўлмаслиги керак (ижарада ёки таъмирда)', 'сейчас не должно быть на складе (в аренде или ремонте)')}`);
    setMsg('✓ ' + it.name);
    setFound((s) => new Set(s).add(code));
  }
  function finish() {
    const missing = expected.filter((i) => !found.has(i.code)).map((i) => i.code);
    go(async () => {
      const e = await saveAudit(cat, expected.length, n, missing);
      setMsg(e || t('Инвентаризация сақланди', 'Инвентаризация сохранена'));
      setFound(new Set());
      router.refresh();
    });
  }

  return (
    <div className="grid2">
      <div className="panel stack">
        <select value={cat} onChange={(e) => { setCat(e.target.value); setFound(new Set()); setMsg(''); }}>
          {cats.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
        <Scanner onCode={mark} labels={{ start: t('Камера билан санаш', 'Считать камерой'), stop: t('Тўхтатиш', 'Остановить'), denied: t('Камерага рухсат йўқ. Кодларни қўлда ёзинг.', 'Нет доступа к камере. Вводите коды вручную.') }} />
        <form className="row" onSubmit={(e) => { e.preventDefault(); mark(manual.trim().toUpperCase()); setManual(''); }}>
          <input value={manual} onChange={(e) => setManual(e.target.value)} placeholder={t('Код + Enter', 'Код + Enter')} style={{ flex: '1 1 140px' }} />
          <button className="btn">OK</button>
        </form>
        {msg && <div className="note">{msg}</div>}
        <div className={n === expected.length ? 'okbox' : 'warnbox'}>{t('Топилди', 'Найдено')}: <b>{n}</b> / {expected.length}{n < expected.length && ` · ${t('етишмаяпти', 'не хватает')}: ${expected.length - n}`}</div>
        <div><button className="btn primary" disabled={pending} onClick={finish}>{t('Инвентаризацияни якунлаш', 'Завершить инвентаризацию')}</button></div>
      </div>
      <div className="tablebox">
        <table style={{ minWidth: 0 }}>
          <tbody>
            {expected.map((i) => (
              <tr key={i.code} onClick={() => setFound((s) => { const x = new Set(s); x.has(i.code) ? x.delete(i.code) : x.add(i.code); return x; })} style={{ cursor: 'pointer' }}>
                <td className="code">{i.code}</td><td>{i.name}</td>
                <td>{found.has(i.code) ? <span className="chip s-available">✓</span> : <span className="chip s-repair">…</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
