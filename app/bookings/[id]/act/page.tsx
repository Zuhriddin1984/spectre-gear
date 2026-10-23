import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getTr } from '@/lib/i18n';
import { loadBooking } from '@/lib/booking';
import { dmy, today } from '@/lib/format';
import { company } from '@/lib/company';
import PrintButton from '@/components/PrintButton';

export default async function Act({ params, searchParams }: { params: { id: string }; searchParams: { back?: string } }) {
  const { t } = getTr();
  const b = await loadBooking(createClient(), Number(params.id));
  if (!b) return null;
  const back = searchParams.back === '1';
  return (
    <>
      <div className="row noprint" style={{ marginBottom: 12 }}>
        <Link className="btn" href={`/bookings/${b.id}`}>← {b.number}</Link>
        <div className="seg">
          <Link href={`/bookings/${b.id}/act`} className={back ? '' : 'on'}>{t('Бериш', 'Выдача')}</Link>
          <Link href={`/bookings/${b.id}/act?back=1`} className={back ? 'on' : ''}>{t('Қайтариш', 'Возврат')}</Link>
        </div>
        <PrintButton label={t('Чоп этиш / PDF', 'Печать / PDF')} />
      </div>
      <article className="doc">
        <h3>{t('ҚАБУЛ-ТОПШИРИШ АКТИ', 'АКТ ПРИЁМА-ПЕРЕДАЧИ')}</h3>
        <div className="sub">{t('Шартнома', 'к договору')} № {b.number} · {dmy(today())}</div>
        <p>{back
          ? t(`${company.name} ижарачи ${b.clients.name} дан қуйидаги ускуналарни қабул қилиб олди:`, `${company.name} принял от арендатора ${b.clients.name} следующее оборудование:`)
          : t(`${company.name} ижарачи ${b.clients.name} га қуйидаги ускуналарни бут ва соз ҳолатда топширди:`, `${company.name} передал арендатору ${b.clients.name} следующее оборудование в комплектном и исправном состоянии:`)}</p>
        <table>
          <thead><tr><th>№</th><th>{t('Ускуна', 'Оборудование')}</th><th>{t('Код', 'Код')}</th><th>S/N</th><th>{t('Ҳолати', 'Состояние')}</th></tr></thead>
          <tbody>
            {b.lines.map((l: any, k: number) => (
              <tr key={l.id}><td>{k + 1}</td><td>{l.items.name}</td><td>{l.items.code}</td><td>{l.items.serial ?? ''}</td><td>{(back ? l.return_note : l.items.issue) || t('Соз', 'Исправно')}</td></tr>
            ))}
          </tbody>
        </table>
        <div className="sign">
          <div>{t('Топширди', 'Передал')}<br /><br />__________________</div>
          <div>{t('Қабул қилди', 'Принял')}<br /><br />__________________</div>
        </div>
      </article>
    </>
  );
}
