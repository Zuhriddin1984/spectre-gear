import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getTr } from '@/lib/i18n';
import Status from '@/components/Status';
import ErrorBox from '@/components/ErrorBox';
import { createKit, deleteKit } from './actions';

export default async function Kits({ searchParams }: { searchParams: { err?: string } }) {
  const { lang, t } = getTr();
  const sb = createClient();
  const [{ data: kits }, { data: st }] = await Promise.all([
    sb.from('kits').select('id, name, kit_items(item_id, items(code, name))').order('name'),
    sb.from('item_status').select('id, status'),
  ]);
  const status = new Map((st ?? []).map((r: any) => [r.id, r.status]));
  return (
    <>
      <h1>{t('Комплектлар', 'Комплекты')}</h1>
      <p className="note">{t('Комплект бир нечта ускунани битта ном остида бирлаштиради. Брон қилганда ҳаммаси бирга қўшилади ва ҳар бири текширилади.', 'Комплект объединяет несколько позиций под одним названием. При брони добавляются все сразу, и каждая проверяется на занятость.')}</p>
      <ErrorBox err={searchParams.err} lang={lang} />
      <div className="cards">
        {(kits ?? []).map((k: any) => {
          const free = k.kit_items.every((x: any) => status.get(x.item_id) === 'available');
          return (
            <div className="card" key={k.id}>
              <b>{k.name}</b>
              <ul>{k.kit_items.map((x: any) => <li key={x.item_id}><Link href={`/items/${x.items.code}`}>{x.items.name}</Link><Status s={status.get(x.item_id) ?? 'available'} lang={lang} /></li>)}</ul>
              <div className={free ? 'okbox' : 'warnbox'}>{free ? t('Ҳозир тўлиқ бўш', 'Сейчас полностью свободен') : t('Бир қисми банд. Брон қилганда саналар текширилади.', 'Часть занята. При брони даты проверяются.')}</div>
              <div className="row">
                <Link className="btn primary" href={`/bookings/new?kit=${k.id}`}>{t('Бронлаш', 'Забронировать')}</Link>
                <form action={deleteKit.bind(null, k.id)}><button className="btn danger">{t('Ўчириш', 'Удалить')}</button></form>
              </div>
            </div>
          );
        })}
        <form action={createKit} className="card">
          <b>{t('Янги комплект', 'Новый комплект')}</b>
          <label className="field"><span>{t('Номи', 'Название')}</span><input name="name" required placeholder="Sony FX6 кит" /></label>
          <label className="field"><span>{t('Ускуна кодлари (вергул ёки янги қатор билан)', 'Коды позиций (через запятую или с новой строки)')}</span><textarea name="codes" rows={4} required placeholder="CAM-011, LNS-012, LNS-016, VID-003" /></label>
          <div><button className="btn primary">{t('Яратиш', 'Создать')}</button></div>
        </form>
      </div>
    </>
  );
}
