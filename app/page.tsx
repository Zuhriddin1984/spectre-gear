import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getTr } from '@/lib/i18n';
import { bookingMap, getCategories, overdue, type Item } from '@/lib/data';
import { daysBetween, dm, money, statusLabel, today } from '@/lib/format';
import Status from '@/components/Status';

const PAGE = 50;

export default async function Inventory({ searchParams }: { searchParams: { q?: string; cat?: string; st?: string; n?: string } }) {
  const { lang, t } = getTr();
  const sb = createClient();
  const q = (searchParams.q ?? '').trim();
  const limit = Math.min(Number(searchParams.n) || PAGE, 400);

  let query = sb.from('item_status').select('*', { count: 'exact' }).order('code');
  if (q) {
    const s = q.replace(/[%,()]/g, ' ');
    query = query.or(`name.ilike.%${s}%,code.ilike.%${s}%,serial.ilike.%${s}%`);
  }
  if (searchParams.cat) query = query.eq('category', searchParams.cat);
  if (searchParams.st) query = query.eq('status', searchParams.st);
  const [{ data, count }, cats, all, late] = await Promise.all([
    query.range(0, limit - 1),
    getCategories(sb),
    sb.from('item_status').select('status'),
    overdue(sb),
  ]);
  const items = (data ?? []) as Item[];
  const bmap = await bookingMap(sb, items.map((i) => i.booking_id));
  const counts: Record<string, number> = {};
  for (const r of all.data ?? []) counts[r.status] = (counts[r.status] ?? 0) + 1;
  const catName = (s: string) => {
    const c = cats.find((x) => x.slug === s);
    return c ? (lang === 'ru' ? c.name_ru : c.name_uz) : s;
  };
  const total = (all.data ?? []).length;
  const keep = (extra: Record<string, string>) => {
    const p = new URLSearchParams({ ...(q && { q }), ...(searchParams.cat && { cat: searchParams.cat }), ...(searchParams.st && { st: searchParams.st }), ...extra });
    return '/?' + p.toString();
  };

  return (
    <>
      {late.length > 0 && (
        <section className="alert">
          <h2>{t('Қайтариш муддати ўтган', 'Просрочен возврат')}: {late.length}</h2>
          <ul>
            {late.map((b) => (
              <li key={b.id}>
                <Link href={`/bookings/${b.id}`}><b>{b.number}</b></Link> · {b.client} · {b.items.length} {t('та ускуна', 'поз.')} · {t('кечикиш', 'опоздание')} {daysBetween(b.end, today())} {t('кун', 'дн.')} {b.phone && `· ${b.phone}`}
              </li>
            ))}
          </ul>
        </section>
      )}
      <div className="stats">
        <Link className="stat" href="/"><b>{total}</b><span>{t('Жами ускуна', 'Всего единиц')}</span></Link>
        <Link className="stat" href="/?st=out"><b>{(counts.out ?? 0) + (counts.late ?? 0)}</b><span>{t('Ҳозир ижарада', 'Сейчас в аренде')}</span></Link>
        <Link className="stat" href="/?st=reserved"><b>{counts.reserved ?? 0}</b><span>{t('Бронланган', 'Забронировано')}</span></Link>
        <Link className="stat" href="/?st=repair"><b>{counts.repair ?? 0}</b><span>{t('Таъмирда', 'В ремонте')}</span></Link>
      </div>
      <form className="toolbar" action="/">
        <input type="search" name="q" defaultValue={q} placeholder={t('Қидириш: Sony, Aputure, C-Stand, сериал…', 'Поиск: Sony, Aputure, C-Stand, серийный…')} />
        <select name="cat" defaultValue={searchParams.cat ?? ''}>
          <option value="">{t('Барча тоифалар', 'Все категории')}</option>
          {cats.map((c) => <option key={c.slug} value={c.slug}>{lang === 'ru' ? c.name_ru : c.name_uz}</option>)}
        </select>
        <select name="st" defaultValue={searchParams.st ?? ''}>
          <option value="">{t('Барча ҳолатлар', 'Все статусы')}</option>
          {['available', 'reserved', 'out', 'late', 'repair'].map((s) => <option key={s} value={s}>{statusLabel(s, lang)}</option>)}
        </select>
        <button className="btn">{t('Излаш', 'Найти')}</button>
      </form>
      <div className="tablebox">
        <table>
          <thead>
            <tr><th>{t('Код', 'Код')}</th><th>{t('Ускуна', 'Оборудование')}</th><th>{t('Тоифа', 'Категория')}</th><th>{t('Кунлик нарх', 'Цена/день')}</th><th>{t('Ҳолат', 'Статус')}</th><th>{t('Кимда / қачон қайтади', 'У кого / когда вернут')}</th></tr>
          </thead>
          <tbody>
            {items.map((i) => {
              const b = i.booking_id ? bmap.get(i.booking_id) : null;
              return (
                <tr key={i.id}>
                  <td className="code">{i.code}</td>
                  <td><Link href={`/items/${i.code}`}><b>{i.name}</b></Link>{i.issue && <span className="flag" title={i.issue}> ⚠</span>}</td>
                  <td>{catName(i.category)}</td>
                  <td className="num">{i.daily_price ? money(i.daily_price, lang) : <span className="note">—</span>}</td>
                  <td><Status s={i.status} lang={lang} /></td>
                  <td className="note">{i.status === 'repair' ? t('Устахона', 'Мастерская') : b ? `${b.client} · ${i.status === 'reserved' ? dm(i.booking_start!) + '–' : ''}${dm(i.booking_end!)}` : '—'}</td>
                </tr>
              );
            })}
            {!items.length && <tr><td colSpan={6} className="note">{t('Ҳеч нарса топилмади. Қидирувни ўзгартиринг.', 'Ничего не найдено. Измените поиск.')}</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="more">
        <span>{t(`${count ?? 0} тадан ${items.length} таси`, `${items.length} из ${count ?? 0}`)}</span>
        {items.length < (count ?? 0) && <Link className="btn" href={keep({ n: String(limit + PAGE) })}>{t('Яна 50 та', 'Ещё 50')}</Link>}
      </div>
    </>
  );
}
