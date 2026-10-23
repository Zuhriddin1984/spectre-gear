import { createClient } from '@/lib/supabase/server';
import { getTr } from '@/lib/i18n';
import { getCategories } from '@/lib/data';
import { dmy } from '@/lib/format';
import AuditClient from './AuditClient';

export default async function Audit() {
  const { lang, t } = getTr();
  const sb = createClient();
  const [cats, { data: items }, { data: past }] = await Promise.all([
    getCategories(sb),
    sb.from('item_status').select('code, name, category, status').order('code'),
    sb.from('audits').select('*, profiles:user_id(full_name)').order('created_at', { ascending: false }).limit(20),
  ]);
  const name = (s: string) => { const c = cats.find((x) => x.slug === s); return c ? (lang === 'ru' ? c.name_ru : c.name_uz) : s; };
  return (
    <>
      <h1>{t('Инвентаризация', 'Инвентаризация')}</h1>
      <p className="note">{t('Тоифани танланг ва омбордаги ускуналарнинг QR-кодини сканерланг. Ижарада ва таъмирдагилар рўйхатга кирмайди.', 'Выберите категорию и сканируйте QR позиций на складе. Позиции в аренде и ремонте не учитываются.')}</p>
      <AuditClient lang={lang} cats={cats.map((c) => ({ slug: c.slug, name: lang === 'ru' ? c.name_ru : c.name_uz }))} items={(items ?? []) as any} />
      <section className="panel" style={{ marginTop: 16 }}>
        <h2>{t('Олдинги инвентаризациялар', 'Прошлые инвентаризации')}</h2>
        <ul className="log">
          {(past ?? []).map((a: any) => (
            <li key={a.id}><span className="code">{dmy(a.created_at.slice(0, 10))}</span><span>{name(a.category)}: {a.found}/{a.expected} {a.found < a.expected ? `⚠ ${a.missing_codes.join(', ')}` : '✓'} · {a.profiles?.full_name ?? ''}</span></li>
          ))}
          {!past?.length && <li className="note">{t('Ҳали инвентаризация ўтказилмаган', 'Инвентаризаций ещё не было')}</li>}
        </ul>
      </section>
    </>
  );
}
