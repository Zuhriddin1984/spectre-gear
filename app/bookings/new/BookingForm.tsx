'use client';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Lang } from '@/lib/i18n';
import { daysBetween, dm, errText, money, statusLabel } from '@/lib/format';
import { checkConflicts, createBooking, type Conflict } from './actions';

type It = { id: number; code: string; name: string; status: string; daily_price: number };

export default function BookingForm(p: {
  lang: Lang; clients: { id: number; name: string }[]; items: It[]; kits: { id: number; name: string; ids: number[] }[];
  initial: number[]; start: string; end: string; min: string;
}) {
  const t = (uz: string, ru: string) => (p.lang === 'ru' ? ru : uz);
  const router = useRouter();
  const [client, setClient] = useState(p.clients[0]?.id ?? 0);
  const [start, setStart] = useState(p.start);
  const [end, setEnd] = useState(p.end);
  const [ids, setIds] = useState<number[]>([...new Set(p.initial)]);
  const [q, setQ] = useState('');
  const [note, setNote] = useState('');
  const [conf, setConf] = useState<Conflict[]>([]);
  const [error, setError] = useState('');
  const [pending, go] = useTransition();
  const byId = useMemo(() => new Map(p.items.map((i) => [i.id, i])), [p.items]);

  useEffect(() => {
    let live = true;
    checkConflicts(ids, start, end < start ? start : end).then((c) => live && setConf(c));
    return () => { live = false; };
  }, [ids, start, end]);

  const bad = new Set(conf.map((c) => c.item_id));
  const found = q.trim() ? p.items.filter((i) => !ids.includes(i.id) && (i.code + ' ' + i.name).toLowerCase().includes(q.trim().toLowerCase())).slice(0, 12) : [];
  const days = Math.max(1, daysBetween(start, end) + 1);
  const sum = ids.reduce((a, id) => a + (byId.get(id)?.daily_price ?? 0) * days, 0);
  const reason = (c: Conflict) => c.reason === 'repair' ? t('таъмирда', 'в ремонте') : `${c.booking_number}, ${c.client_name}, ${dm(c.start_date!)}–${dm(c.end_date!)}`;

  function save() {
    setError('');
    go(async () => {
      const r = await createBooking({ client, start, end, ids, note });
      if (r.error) setError(errText(r.error, p.lang));
      else router.push(`/bookings/${r.id}`);
    });
  }

  if (!p.clients.length) return <div className="warnbox">{t('Аввал «Мижозлар» бўлимида мижоз қўшинг.', 'Сначала добавьте клиента в разделе «Клиенты».')}</div>;

  return (
    <div className="grid32">
      <div className="panel stack">
        <label className="field"><span>{t('Ускуна қўшиш (код ёки ном)', 'Добавить позицию (код или название)')}</span>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="FX6, CAM-011, C-Stand…" autoFocus /></label>
        {found.length > 0 && (
          <div className="results">
            {found.map((i) => (
              <button key={i.id} type="button" onClick={() => { setIds([...ids, i.id]); setQ(''); }}>
                <span><span className="code">{i.code}</span> {i.name}</span><span className={`chip s-${i.status}`}>{statusLabel(i.status, p.lang)}</span>
              </button>
            ))}
          </div>
        )}
        {p.kits.length > 0 && (
          <label className="field"><span>{t('Комплект қўшиш', 'Добавить комплект')}</span>
            <select value="" onChange={(e) => { const k = p.kits.find((x) => String(x.id) === e.target.value); if (k) setIds([...new Set([...ids, ...k.ids])]); }}>
              <option value="">{t('— танланг —', '— выберите —')}</option>
              {p.kits.map((k) => <option key={k.id} value={k.id}>{k.name} ({k.ids.length})</option>)}
            </select></label>
        )}
        <div className="picked">
          {ids.map((id) => { const i = byId.get(id); return i ? (
            <span key={id} className={`pick ${bad.has(id) ? 'bad' : ''}`}><span className="code">{i.code}</span> {i.name}<button type="button" onClick={() => setIds(ids.filter((x) => x !== id))} aria-label="remove">×</button></span>
          ) : null; })}
          {!ids.length && <span className="note">{t('Ҳали ускуна қўшилмаган.', 'Позиции ещё не добавлены.')}</span>}
        </div>
      </div>

      <div className="panel stack">
        <label className="field"><span>{t('Мижоз', 'Клиент')}</span>
          <select value={client} onChange={(e) => setClient(Number(e.target.value))}>{p.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <div className="f2">
          <label className="field"><span>{t('Олиш санаси', 'Дата выдачи')}</span><input type="date" value={start} min={p.min} onChange={(e) => { setStart(e.target.value); if (end < e.target.value) setEnd(e.target.value); }} /></label>
          <label className="field"><span>{t('Қайтариш санаси', 'Дата возврата')}</span><input type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} /></label>
        </div>
        <label className="field"><span>{t('Изоҳ (лойиҳа, манзил)', 'Заметка (проект, адрес)')}</span><input value={note} onChange={(e) => setNote(e.target.value)} /></label>
        {ids.length > 0 && (conf.length
          ? <div className="warnbox"><b>{t('Бандлик бор, брон сақланмайди:', 'Есть пересечения, бронь не сохранится:')}</b>{conf.map((c, k) => <div key={k}>{c.code} — {reason(c)}</div>)}</div>
          : <div className="okbox">{t('Ҳаммаси бўш', 'Всё свободно')} · {ids.length} {t('та', 'поз.')} · {days} {t('кун', 'дн.')}{sum ? ' · ' + money(sum, p.lang) : ''}</div>)}
        {error && <div className="warnbox">{error}</div>}
        <button className="btn primary" disabled={!ids.length || conf.length > 0 || pending} onClick={save}>{pending ? '…' : t('Бронни сақлаш', 'Сохранить бронь')}</button>
      </div>
    </div>
  );
}
