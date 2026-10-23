import { createClient } from '@/lib/supabase/server';
import { getTr } from '@/lib/i18n';
import { dm } from '@/lib/format';
import ErrorBox from '@/components/ErrorBox';
import { addClient, updateClient } from './actions';

export default async function Clients({ searchParams }: { searchParams: { err?: string; edit?: string } }) {
  const { lang, t } = getTr();
  const sb = createClient();
  const [{ data: clients }, { data: bookings }] = await Promise.all([
    sb.from('clients').select('*').order('name'),
    sb.from('bookings').select('client_id, state, start_date').neq('state', 'cancelled'),
  ]);
  const stat = new Map<number, { n: number; act: number; last: string }>();
  for (const b of bookings ?? []) {
    const s = stat.get(b.client_id) ?? { n: 0, act: 0, last: '' };
    s.n++; if (b.state === 'reserved' || b.state === 'out') s.act++; if (b.start_date > s.last) s.last = b.start_date;
    stat.set(b.client_id, s);
  }
  const edit = (clients ?? []).find((c: any) => String(c.id) === searchParams.edit);
  return (
    <>
      <h1>{t('Мижозлар', 'Клиенты')}</h1>
      <ErrorBox err={searchParams.err} lang={lang} />
      <div className="grid32">
        <div className="tablebox">
          <table style={{ minWidth: 560 }}>
            <thead><tr><th>{t('Мижоз', 'Клиент')}</th><th>{t('Телефон', 'Телефон')}</th><th>{t('Бронлар', 'Брони')}</th><th>{t('Фаол', 'Активные')}</th><th>{t('Охирги', 'Последняя')}</th></tr></thead>
            <tbody>
              {(clients ?? []).map((c: any) => { const s = stat.get(c.id); return (
                <tr key={c.id}>
                  <td><a href={`/clients?edit=${c.id}`}><b>{c.name}</b></a>{c.note && <div className="note">{c.note}</div>}</td>
                  <td className="num">{c.phone ?? '—'}</td><td className="num">{s?.n ?? 0}</td><td className="num">{s?.act ?? 0}</td><td className="num">{s?.last ? dm(s.last) : '—'}</td>
                </tr>
              ); })}
            </tbody>
          </table>
        </div>
        <form action={edit ? updateClient.bind(null, edit.id) : addClient} className="panel stack" key={edit?.id ?? 'new'}>
          <h2>{edit ? t('Мижозни таҳрирлаш', 'Редактировать клиента') : t('Янги мижоз', 'Новый клиент')}</h2>
          <label className="field"><span>{t('Ном (компания ёки шахс)', 'Название (компания или лицо)')}</span><input name="name" required defaultValue={edit?.name ?? ''} /></label>
          <label className="field"><span>{t('Телефон', 'Телефон')}</span><input name="phone" placeholder="+998 __ ___ __ __" defaultValue={edit?.phone ?? ''} /></label>
          <label className="field"><span>{t('Изоҳ (паспорт, СТИР, реквизитлар)', 'Заметка (паспорт, ИНН, реквизиты)')}</span><textarea name="note" rows={2} defaultValue={edit?.note ?? ''} /></label>
          <div className="row"><button className="btn primary">{edit ? t('Сақлаш', 'Сохранить') : t('Мижозни қўшиш', 'Добавить клиента')}</button>{edit && <a className="btn" href="/clients">{t('Бекор', 'Отмена')}</a>}</div>
        </form>
      </div>
    </>
  );
}
