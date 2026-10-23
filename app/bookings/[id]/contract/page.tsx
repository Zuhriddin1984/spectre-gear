import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getTr } from '@/lib/i18n';
import { loadBooking } from '@/lib/booking';
import { dmy, money } from '@/lib/format';
import { company } from '@/lib/company';
import PrintButton from '@/components/PrintButton';

export default async function Contract({ params }: { params: { id: string } }) {
  const { lang, t } = getTr();
  const b = await loadBooking(createClient(), Number(params.id));
  if (!b) return null;
  const date = b.created_at.slice(0, 10);
  return (
    <>
      <div className="row noprint" style={{ marginBottom: 12 }}>
        <Link className="btn" href={`/bookings/${b.id}`}>← {b.number}</Link>
        <PrintButton label={t('Чоп этиш / PDF', 'Печать / PDF')} />
        <span className="note">{t('PDF учун чоп этиш ойнасида «Save as PDF» ни танланг.', 'Для PDF выберите «Сохранить как PDF» в окне печати.')}</span>
      </div>
      <article className="doc">
        <h3>{t('ИЖАРА ШАРТНОМАСИ', 'ДОГОВОР АРЕНДЫ')} № {b.number}</h3>
        <div className="sub">{company.city || t('Тошкент ш.', 'г. Ташкент')}, {dmy(date)}</div>
        <p><b>{t('Ижарага берувчи', 'Арендодатель')}:</b> {company.name}{company.details ? `, ${company.details}` : ' ______________________________'}<br />
          <b>{t('Ижарачи', 'Арендатор')}:</b> {b.clients.name}{b.clients.phone ? `, ${t('тел.', 'тел.')} ${b.clients.phone}` : ''}{b.clients.note ? `, ${b.clients.note}` : ''}</p>
        <p>1. {t(`Ижарага берувчи қуйидаги ускуналарни ${dmy(b.start_date)} дан ${dmy(b.end_date)} гача (${b.days} кун) вақтинча фойдаланишга беради.`, `Арендодатель передаёт во временное пользование следующее оборудование с ${dmy(b.start_date)} по ${dmy(b.end_date)} (${b.days} дн.).`)}</p>
        <table>
          <thead><tr><th>№</th><th>{t('Ускуна', 'Оборудование')}</th><th>S/N</th><th>{t('Кунлик нарх', 'Цена/день')}</th><th>{t('Жами', 'Итого')}</th></tr></thead>
          <tbody>
            {b.lines.map((l: any, k: number) => (
              <tr key={l.id}><td>{k + 1}</td><td>{l.items.name}</td><td>{l.items.serial ?? ''}</td><td>{l.items.daily_price ? money(l.items.daily_price, lang) : ''}</td><td>{l.items.daily_price ? money(l.items.daily_price * b.days, lang) : ''}</td></tr>
            ))}
            <tr><td colSpan={4} style={{ textAlign: 'right' }}><b>{t('Жами тўлов', 'Итого к оплате')}</b></td><td><b>{b.total ? money(b.total, lang) : ''}</b></td></tr>
          </tbody>
        </table>
        <p>2. {t('Ижарачи ускуналарни бут ва соз ҳолатда қайтаришга, шикастланганда таъмир ёки баланс қийматини тўлашга мажбур.', 'Арендатор обязуется вернуть оборудование в исправном и комплектном состоянии, а при повреждении оплатить ремонт или балансовую стоимость.')}</p>
        <p>3. {t('Қайтариш кечиктирилганда ҳар бир кун учун кунлик нарх ҳисобланади.', 'За каждый день просрочки начисляется дневная стоимость аренды.')}</p>
        <div className="sign">
          <div>{t('Ижарага берувчи', 'Арендодатель')}<br /><br />__________________</div>
          <div>{t('Ижарачи', 'Арендатор')}<br /><br />__________________</div>
        </div>
      </article>
    </>
  );
}
