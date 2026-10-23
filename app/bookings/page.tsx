import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getTr } from '@/lib/i18n';
import { addDays, dm, today, weekday } from '@/lib/format';
import Status from '@/components/Status';

const SPAN = 14;

export default async function Bookings({ searchParams }: { searchParams: { from?: string; all?: string } }) {
  const { lang, t } = getTr();
  const sb = createClient();
  const now = today();
  const from = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.from ?? '') ? searchParams.from! : addDays(now, -3);
  const to = addDays(from, SPAN - 1);
  const days = [...Array(SPAN)].map((_, k) => addDays(from, k));

  let list = sb.from('bookings').select('id, number, state, start_date, end_date, clients(name), booking_items(active, out_at, end_date)').order('start_date', { ascending: !searchParams.all });
  list = searchParams.all ? list.limit(200) : list.in('state', ['reserved', 'out']);
  const [{ data: rows }, { data: bookings }] = await Promise.all([
    sb.from('booking_items').select('start_date, end_date, out_at, items(code, name), bookings!inner(id, number, state)').eq('active', true).lte('start_date', to),
    list,
  ]);
  const cal = ((rows ?? []) as any[])
    .map((r) => ({ ...r, last: r.out_at && r.end_date < now ? now : r.end_date, late: !!r.out_at && r.end_date < now }))
    .filter((r) => r.last >= from)
    .sort((a, b) => a.start_date.localeCompare(b.start_date) || a.items.code.localeCompare(b.items.code));

  const bState = (b: any) => (b.state === 'out' && b.booking_items.some((x: any) => x.active && x.end_date < now) ? 'late' : b.state);

  return (
    <>
      <div className="row between">
        <h1>{t('Бронлар', 'Брони')}</h1>
        <Link className="btn primary" href="/bookings/new">+ {t('Янги брон', 'Новая бронь')}</Link>
      </div>
      <div className="row between" style={{ marginBottom: 8 }}>
        <h2 style={{ margin: 0 }}>{t('Тақвим', 'Календарь')}</h2>
        <div className="row">
          <Link className="btn" href={`/bookings?from=${addDays(from, -7)}`}>←</Link>
          <span className="note">{dm(from)} – {dm(to)}</span>
          <Link className="btn" href={`/bookings?from=${addDays(from, 7)}`}>→</Link>
        </div>
      </div>
      <div className="cal">
        <table>
          <thead><tr><th style={{ textAlign: 'left', paddingLeft: 12 }}>{t('Ускуна', 'Позиция')}</th>{days.map((d) => <th key={d} className={d === now ? 'today' : ''}>{weekday(d, lang)}<br />{d.slice(8)}</th>)}</tr></thead>
          <tbody>
            {cal.map((r, k) => {
              const cls = r.late ? 'late' : r.out_at ? 'out' : 'reserved';
              const first = r.start_date > from ? r.start_date : from;
              return (
                <tr key={k}>
                  <td title={r.items.name}><span className="code">{r.items.code}</span> {r.items.name}</td>
                  {days.map((d) => <td key={d}>{d >= r.start_date && d <= r.last ? <Link href={`/bookings/${r.bookings.id}`} className={`bar ${cls}`}>{d === first ? r.bookings.number.slice(2) : ''}</Link> : null}</td>)}
                </tr>
              );
            })}
            {!cal.length && <tr><td colSpan={SPAN + 1} className="note">{t('Бу оралиқда брон йўқ', 'В этом периоде броней нет')}</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="note">{t('Сариқ = бронланган, қизил = ижарада, йўл-йўл = қайтариш муддати ўтган.', 'Жёлтый = бронь, красный = в аренде, полосы = просрочен возврат.')}</p>

      <div className="row between" style={{ margin: '20px 0 8px' }}>
        <h2 style={{ margin: 0 }}>{searchParams.all ? t('Барча бронлар', 'Все брони') : t('Фаол бронлар', 'Активные брони')}</h2>
        <Link className="btn" href={searchParams.all ? '/bookings' : '/bookings?all=1'}>{searchParams.all ? t('Фақат фаоллар', 'Только активные') : t('Ҳаммасини кўрсатиш', 'Показать все')}</Link>
      </div>
      <div className="tablebox">
        <table>
          <thead><tr><th>№</th><th>{t('Мижоз', 'Клиент')}</th><th>{t('Саналар', 'Даты')}</th><th>{t('Ускуналар', 'Позиции')}</th><th>{t('Ҳолат', 'Статус')}</th></tr></thead>
          <tbody>
            {((bookings ?? []) as any[]).map((b) => (
              <tr key={b.id}>
                <td><Link href={`/bookings/${b.id}`}><b className="num">{b.number}</b></Link></td>
                <td>{b.clients?.name}</td>
                <td className="num">{dm(b.start_date)} – {dm(b.end_date)}</td>
                <td className="num">{b.booking_items.length}</td>
                <td><Status s={bState(b)} lang={lang} /></td>
              </tr>
            ))}
            {!bookings?.length && <tr><td colSpan={5} className="note">{t('Бронлар йўқ', 'Броней нет')}</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
