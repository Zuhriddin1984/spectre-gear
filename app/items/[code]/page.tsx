import Link from 'next/link';
import QRCode from 'qrcode';
import { createClient, getProfile } from '@/lib/supabase/server';
import { getTr } from '@/lib/i18n';
import { getCategories, type Item } from '@/lib/data';
import { addDays, dm, dmy, localDate, today } from '@/lib/format';
import { itemUrl } from '@/lib/qr';
import Status from '@/components/Status';
import ErrorBox from '@/components/ErrorBox';
import PhotoInput from '@/components/PhotoInput';
import { clearIssue, giveBooking, quickGive, returnOne, saveItem, setIssue, toggleRepair, uploadPhoto } from './actions';

const EVENT: Record<string, [string, string]> = {
  issue: ['⚠ Носозлик', '⚠ Неисправность'],
  issue_fixed: ['✓ Носозлик тузатилди', '✓ Неисправность устранена'],
  repair_out: ['🔧 Таъмирга юборилди', '🔧 Отправлено в ремонт'],
  repair_back: ['🔧 Таъмирдан қайтди', '🔧 Вернулось из ремонта'],
  checkout: ['→ Ижарага берилди', '→ Выдано в аренду'],
  return: ['← Қайтиб келди', '← Возвращено'],
  note: ['Изоҳ', 'Заметка'],
};

export default async function ItemPage({ params, searchParams }: { params: { code: string }; searchParams: { err?: string; ok?: string } }) {
  const { lang, t } = getTr();
  const sb = createClient();
  const code = decodeURIComponent(params.code).toUpperCase();
  const { data } = await sb.from('item_status').select('*').eq('code', code).maybeSingle();
  if (!data) {
    return <div className="panel"><p>{t('Бундай кодли ускуна топилмади', 'Позиция с таким кодом не найдена')}: <b>{code}</b></p><Link className="btn" href="/scan">{t('Қайта сканерлаш', 'Сканировать снова')}</Link></div>;
  }
  const item = data as Item;
  const [me, cats, events, history, clients, booking] = await Promise.all([
    getProfile(),
    getCategories(sb),
    sb.from('item_events').select('kind, text, created_at, bookings(number)').eq('item_id', item.id).order('created_at', { ascending: false }).limit(30),
    sb.from('booking_items').select('start_date, end_date, returned_at, bookings(id, number, state, clients(name))').eq('item_id', item.id).order('start_date', { ascending: false }).limit(10),
    sb.from('clients').select('id, name').order('name'),
    item.booking_id ? sb.from('bookings').select('id, number, state, start_date, end_date, clients(name, phone)').eq('id', item.booking_id).single() : Promise.resolve({ data: null }),
  ]);
  const b: any = booking.data;
  const qr = await QRCode.toDataURL(itemUrl(item.code), { margin: 1, width: 220 });
  const cat = cats.find((c) => c.slug === item.category);
  const isAdmin = me?.role === 'admin';
  const save = saveItem.bind(null, item.code);

  return (
    <>
      <div className="row between">
        <div>
          <span className="code">{item.code} · {cat ? (lang === 'ru' ? cat.name_ru : cat.name_uz) : item.category}</span>
          <h1 style={{ margin: '4px 0 6px' }}>{item.name}</h1>
          <div className="row"><Status s={item.status} lang={lang} />{b && <span className="note">{b.number} · {b.clients?.name} · {dm(b.start_date)}–{dm(b.end_date)}</span>}</div>
        </div>
        <Link className="btn" href="/scan">{t('Кейинги скан', 'Следующий скан')}</Link>
      </div>
      <div style={{ height: 14 }} />
      <ErrorBox err={searchParams.err} ok={searchParams.ok === 'returned' ? t('Қабул қилинди', 'Принято') : searchParams.ok ? t('Сақланди', 'Сохранено') : undefined} lang={lang} />

      {/* Main action for the current state */}
      <section className="panel stack" style={{ marginBottom: 16, background: 'var(--sunk)' }}>
        {item.status === 'repair' && (
          <form action={toggleRepair.bind(null, item.code)} className="row">
            <span>{t('Ускуна таъмирда.', 'Позиция в ремонте.')}</span>
            <input name="text" placeholder={t('Нима қилинди (ихтиёрий)', 'Что сделано (необязательно)')} />
            <button className="btn primary">{t('Таъмирдан қайтди', 'Вернулось из ремонта')}</button>
          </form>
        )}
        {(item.status === 'out' || item.status === 'late') && b && (
          <form action={returnOne.bind(null, item.code, b.id)} className="stack">
            <label className="field"><span>{t('Қайтаришда носозлик бўлса ёзинг (бўш қолса — соз)', 'Если есть неисправность — опишите (пусто = исправно)')}</span><input name="issue" /></label>
            <div><button className="btn primary">{t('Қайтариб олиш', 'Принять возврат')} · {b.number}</button></div>
          </form>
        )}
        {item.status === 'reserved' && b && (
          <div className="row">
            <span>{t('Брон', 'Бронь')} <Link href={`/bookings/${b.id}`}><b>{b.number}</b></Link> · {b.clients?.name} · {dm(b.start_date)}–{dm(b.end_date)}</span>
            <form action={giveBooking.bind(null, item.code, b.id)}><button className="btn primary">{t('Брон бўйича ҳаммасини бериш', 'Выдать всю бронь')}</button></form>
          </div>
        )}
        {item.status === 'available' && (
          <form action={quickGive.bind(null, item.code)} className="row">
            <strong>{t('Тез бериш', 'Быстрая выдача')}:</strong>
            <select name="client" required>{(clients.data ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            <label className="row note">{t('қайтариш', 'возврат')} <input type="date" name="end" defaultValue={addDays(today(), 1)} min={today()} required /></label>
            <button className="btn primary">{t('Ижарага бериш', 'Выдать')}</button>
            <Link className="btn" href={`/bookings/new?item=${item.code}`}>{t('Олдиндан бронлаш', 'Забронировать')}</Link>
          </form>
        )}
      </section>

      <div className="grid2">
        <div className="stack">
          <div className="photo">{item.photo_url ? <img src={item.photo_url} alt={item.name} /> : t('Расм йўқ', 'Нет фото')}</div>
          <form action={uploadPhoto.bind(null, item.code)} className="row">
            <PhotoInput />
            <button className="btn">{t('Расм юклаш', 'Загрузить фото')}</button>
          </form>
          <div className="row">
            <div className="qrbox"><img src={qr} alt={'QR ' + item.code} /></div>
            <div className="note" style={{ flex: '1 1 160px' }}>{t('Шу QR ускунага ёпиштирилади. Сканерланганда шу саҳифа очилади.', 'Этот QR клеится на оборудование. При сканировании открывается эта страница.')} <Link href={`/labels?cat=${item.category}`}>{t('Ёрлиқларни чоп этиш', 'Печать этикеток')}</Link></div>
          </div>
        </div>

        <div className="stack">
          <form action={save} className="panel stack">
            <div className="f2">
              <label className="field"><span>{t('Сериал рақам', 'Серийный номер')}</span><input name="serial" defaultValue={item.serial ?? ''} /></label>
              <label className="field"><span>{t('Кунлик нарх, сўм', 'Цена/день, сум')}</span><input name="daily_price" type="number" min={0} step={1000} defaultValue={item.daily_price || ''} disabled={!isAdmin} title={isAdmin ? '' : t('Нархни фақат администратор ўзгартиради', 'Цену меняет только администратор')} /></label>
            </div>
            <label className="field"><span>{t('Баланс қиймати, сўм', 'Балансовая стоимость, сум')}</span><input name="value" type="number" min={0} step={10000} defaultValue={item.value || ''} /></label>
            <label className="field"><span>{t('Изоҳ (комплектация, жойи)', 'Заметка (комплектация, место)')}</span><textarea name="notes" rows={2} defaultValue={item.notes ?? ''} /></label>
            <div><button className="btn primary">{t('Сақлаш', 'Сохранить')}</button></div>
          </form>

          <div className="panel stack">
            {item.issue ? (
              <div className="row between"><div className="warnbox" style={{ flex: '1 1 200px' }}>⚠ {item.issue}</div>
                <form action={clearIssue.bind(null, item.code)}><button className="btn">{t('Носозлик тузатилди', 'Неисправность устранена')}</button></form></div>
            ) : <div className="okbox">{t('Носозлик белгиланмаган', 'Неисправностей не отмечено')}</div>}
            <form action={setIssue.bind(null, item.code)} className="row">
              <input name="issue" required style={{ flex: '1 1 180px' }} placeholder={t('Носозлик тавсифи…', 'Описание неисправности…')} />
              <button className="btn">{t('Носоз деб белгилаш', 'Отметить неисправность')}</button>
            </form>
            {item.status === 'available' || item.status === 'reserved' ? (
              <form action={toggleRepair.bind(null, item.code)} className="row">
                <input name="text" style={{ flex: '1 1 180px' }} placeholder={t('Қаерга, нима учун', 'Куда, по какой причине')} />
                <button className="btn danger">{t('Таъмирга юбориш', 'Отправить в ремонт')}</button>
              </form>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid2" style={{ marginTop: 16 }}>
        <section className="panel">
          <h2>{t('Таъмир ва ҳаракатлар тарихи', 'История ремонтов и действий')}</h2>
          <ul className="timeline">
            {(events.data ?? []).map((e: any, k: number) => (
              <li key={k}><span className="code">{dmy(localDate(e.created_at))}</span><span>{(EVENT[e.kind] ?? [e.kind, e.kind])[lang === 'ru' ? 1 : 0]}{e.bookings?.number ? ` · ${e.bookings.number}` : ''}{e.text ? ` — ${e.text}` : ''}</span></li>
            ))}
            {!events.data?.length && <li className="note">{t('Ҳали ҳаракат йўқ', 'Пока нет событий')}</li>}
          </ul>
        </section>
        <section className="panel">
          <h2>{t('Охирги бронлар', 'Последние брони')}</h2>
          <ul className="timeline">
            {(history.data ?? []).map((h: any, k: number) => (
              <li key={k}><span className="code">{dm(h.start_date)}–{dm(h.end_date)}</span><span><Link href={`/bookings/${h.bookings?.id}`}>{h.bookings?.number}</Link> · {h.bookings?.clients?.name}</span></li>
            ))}
            {!history.data?.length && <li className="note">{t('Ҳали брон бўлмаган', 'Броней ещё не было')}</li>}
          </ul>
        </section>
      </div>
    </>
  );
}
