import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getTr } from '@/lib/i18n';
import { loadBooking } from '@/lib/booking';
import { dm, dmy, money, today } from '@/lib/format';
import Status from '@/components/Status';
import ErrorBox from '@/components/ErrorBox';
import { cancel, extend, giveAll, returnAll, returnItem } from './actions';

export default async function BookingPage({ params, searchParams }: { params: { id: string }; searchParams: { err?: string } }) {
  const { lang, t } = getTr();
  const b = await loadBooking(createClient(), Number(params.id));
  if (!b) return <p>{t('Брон топилмади', 'Бронь не найдена')}</p>;
  const now = today();
  const late = b.state === 'out' && b.lines.some((l: any) => l.active && l.end_date < now);
  const st = late ? 'late' : b.state;
  const lineState = (l: any) => (l.returned_at ? 'closed' : !l.active ? 'cancelled' : l.out_at ? (l.end_date < now ? 'late' : 'out') : 'reserved');

  return (
    <>
      <div className="row between">
        <div>
          <span className="code">{t('Брон', 'Бронь')}</span>
          <h1 style={{ margin: '2px 0 6px' }}>{b.number} · {b.clients?.name}</h1>
          <div className="row"><Status s={st} lang={lang} /><span className="num">{dmy(b.start_date)} – {dmy(b.end_date)} · {b.days} {t('кун', 'дн.')}</span>{b.total > 0 && <b className="num">{money(b.total, lang)}</b>}</div>
          {b.clients?.phone && <div className="note">📞 {b.clients.phone}</div>}
          {b.note && <div className="note">{b.note}</div>}
        </div>
        <div className="row">
          <Link className="btn" href={`/bookings/${b.id}/contract`}>{t('Шартнома', 'Договор')}</Link>
          <Link className="btn" href={`/bookings/${b.id}/act`}>{t('Қабул-топшириш акти', 'Акт приёма-передачи')}</Link>
        </div>
      </div>
      <div style={{ height: 14 }} />
      <ErrorBox err={searchParams.err} lang={lang} />

      <div className="row" style={{ marginBottom: 14 }}>
        {b.state === 'reserved' && <form action={giveAll.bind(null, b.id)}><button className="btn primary">{t('Ҳаммасини ижарага бериш', 'Выдать всё')}</button></form>}
        {b.state === 'reserved' && <form action={cancel.bind(null, b.id)}><button className="btn danger">{t('Бронни бекор қилиш', 'Отменить бронь')}</button></form>}
        {b.state === 'out' && <form action={returnAll.bind(null, b.id)}><button className="btn primary">{t('Ҳаммасини соз ҳолатда қабул қилиш', 'Принять всё без замечаний')}</button></form>}
        {(b.state === 'out' || b.state === 'reserved') && (
          <form action={extend.bind(null, b.id)} className="row">
            <input type="date" name="end" defaultValue={b.end_date} min={b.start_date} required />
            <button className="btn">{t('Муддатни ўзгартириш', 'Изменить срок')}</button>
          </form>
        )}
      </div>

      <div className="tablebox">
        <table>
          <thead><tr><th>{t('Код', 'Код')}</th><th>{t('Ускуна', 'Оборудование')}</th><th>S/N</th><th>{t('Ҳолат', 'Статус')}</th><th></th></tr></thead>
          <tbody>
            {b.lines.map((l: any) => (
              <tr key={l.id}>
                <td className="code">{l.items.code}</td>
                <td><Link href={`/items/${l.items.code}`}><b>{l.items.name}</b></Link>{l.items.issue && <span className="flag" title={l.items.issue}> ⚠</span>}{l.return_note && <div className="note">⚠ {l.return_note}</div>}</td>
                <td className="code">{l.items.serial ?? '—'}</td>
                <td><Status s={lineState(l)} lang={lang} />{l.returned_at && <span className="note"> {dm(l.returned_at.slice(0, 10))}</span>}</td>
                <td>
                  {l.active && l.out_at && (
                    <form action={returnItem.bind(null, b.id, l.item_id)} className="row" style={{ flexWrap: 'nowrap' }}>
                      <input name="issue" placeholder={t('Носозлик (бўлса)', 'Неисправность (если есть)')} />
                      <button className="btn">{t('Қабул қилиш', 'Принять')}</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
