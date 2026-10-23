import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getTr } from '@/lib/i18n';
import { getCategories } from '@/lib/data';
import { addDays, daysBetween, dm, money, today } from '@/lib/format';

export default async function Reports({ searchParams }: { searchParams: { d?: string } }) {
  const { lang, t } = getTr();
  const sb = createClient();
  const span = [30, 60, 90, 365].includes(Number(searchParams.d)) ? Number(searchParams.d) : 60;
  const to = today();
  const from = addDays(to, -span + 1);
  const [cats, { data: items }, { data: rows }] = await Promise.all([
    getCategories(sb),
    sb.from('items').select('id, code, name, category, daily_price').eq('active', true),
    sb.from('booking_items').select('item_id, start_date, end_date, out_at, returned_at, bookings!inner(state)').lte('start_date', to).gte('end_date', from).neq('bookings.state', 'cancelled'),
  ]);
  const byId = new Map((items ?? []).map((i: any) => [i.id, i]));
  const days = new Map<number, number>();
  for (const r of (rows ?? []) as any[]) {
    if (!r.out_at) continue; // only equipment that actually went out
    const a = r.start_date > from ? r.start_date : from;
    // still-out items count up to today
    const endReal = r.returned_at ? r.returned_at.slice(0, 10) : to;
    const z = endReal > to ? to : endReal;
    if (z < a) continue;
    days.set(r.item_id, (days.get(r.item_id) ?? 0) + daysBetween(a, z) + 1);
  }
  const top = [...days.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  const catDays = new Map<string, number>();
  for (const [id, n] of days) { const c = byId.get(id)?.category; if (c) catDays.set(c, (catDays.get(c) ?? 0) + n); }
  const cs = [...catDays.entries()].sort((a, b) => b[1] - a[1]);
  const priced = (items ?? []).filter((i: any) => i.daily_price > 0).length;
  const revenue = [...days.entries()].reduce((a, [id, n]) => a + n * (byId.get(id)?.daily_price ?? 0), 0);
  const idle = (items ?? []).filter((i: any) => !days.has(i.id));
  const catName = (s: string) => { const c = cats.find((x) => x.slug === s); return c ? (lang === 'ru' ? c.name_ru : c.name_uz) : s; };
  const bars = (arr: [string, number][], max: number) => arr.map(([k, v]) => (
    <div className="brow" key={k}><span className="lbl" title={k}>{k}</span><span className="track"><i style={{ width: `${Math.round((v / max) * 100)}%` }} /></span><span className="num">{v}</span></div>
  ));

  return (
    <>
      <div className="row between">
        <h1>{t('Ҳисоботлар', 'Отчёты')}</h1>
        <div className="seg">{[30, 60, 90, 365].map((d) => <Link key={d} href={`/reports?d=${d}`} className={d === span ? 'on' : ''}>{d} {t('кун', 'дн.')}</Link>)}</div>
      </div>
      <p className="note">{dm(from)} – {dm(to)}. {t('Ҳисоблар ҳақиқатда берилган ижаралар бўйича (ижара кунлари).', 'Расчёт по фактическим выдачам (дни аренды).')}</p>
      <div className="grid2">
        <section className="panel"><h2>{t('Энг кўп ижарага кетганлар (кун)', 'Чаще всего в аренде (дни)')}</h2><div className="bars">{top.length ? bars(top.map(([id, n]) => [byId.get(id)?.name ?? '', n]), top[0][1]) : <span className="note">{t('Ҳали маълумот йўқ', 'Пока нет данных')}</span>}</div></section>
        <section className="panel"><h2>{t('Тоифалар бўйича ижара кунлари', 'Дни аренды по категориям')}</h2><div className="bars">{cs.length ? bars(cs.map(([c, n]) => [catName(c), n]), cs[0][1]) : <span className="note">{t('Ҳали маълумот йўқ', 'Пока нет данных')}</span>}</div></section>
        <section className="panel">
          <h2>{t('Ҳисобланган тушум', 'Расчётная выручка')}</h2>
          <div className="stat" style={{ border: 0, padding: 0 }}><b>{money(revenue, lang)}</b></div>
          <p className="note">{priced < (items ?? []).length ? t(`${(items ?? []).length} тадан ${priced} та ускунага нарх киритилган. Нархсизлари ҳисобга кирмайди.`, `Цены указаны для ${priced} из ${(items ?? []).length} позиций. Без цены не учитываются.`) : t('Барча ускуналарга нарх киритилган.', 'Цены указаны для всех позиций.')}</p>
        </section>
        <section className="panel">
          <h2>{t('Бекор турган ускуналар', 'Простаивающее оборудование')}</h2>
          <p style={{ margin: '0 0 6px' }}><b className="num">{idle.length}</b> {t('та ускуна шу даврда бирор марта ҳам ижарага кетмаган.', 'позиций ни разу не сдавались за этот период.')}</p>
          <ul className="log">{idle.slice(0, 12).map((i: any) => <li key={i.id}><span className="code">{i.code}</span><Link href={`/items/${i.code}`}>{i.name}</Link></li>)}</ul>
          {idle.length > 12 && <p className="note">{t('ва яна', 'и ещё')} {idle.length - 12}…</p>}
        </section>
      </div>
    </>
  );
}
