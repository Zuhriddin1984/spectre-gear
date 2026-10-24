import QRCode from 'qrcode';
import { createClient } from '@/lib/supabase/server';
import { getTr } from '@/lib/i18n';
import { getCategories } from '@/lib/data';
import PrintButton from '@/components/PrintButton';
import { itemUrl } from '@/lib/qr';

export default async function Labels({ searchParams }: { searchParams: { cat?: string; codes?: string } }) {
  const { lang, t } = getTr();
  const sb = createClient();
  const cats = await getCategories(sb);
  const cat = searchParams.cat ?? cats[0]?.slug;
  const codes = (searchParams.codes ?? '').toUpperCase().split(/[\s,;]+/).filter(Boolean);
  let q = sb.from('items').select('code, name').eq('active', true).order('code');
  q = codes.length ? q.in('code', codes) : q.eq('category', cat);
  const { data } = await q;
  const labels = await Promise.all((data ?? []).map(async (i) => ({ ...i, svg: await QRCode.toString(itemUrl(i.code), { type: 'svg', margin: 0 }) })));
  return (
    <>
      <div className="noprint">
        <h1>{t('QR-ёрлиқлар', 'QR-этикетки')}</h1>
        <form className="toolbar" action="/labels">
          <select name="cat" defaultValue={cat}>{cats.map((c) => <option key={c.slug} value={c.slug}>{lang === 'ru' ? c.name_ru : c.name_uz}</option>)}</select>
          <input name="codes" defaultValue={searchParams.codes ?? ''} placeholder={t('ёки аниқ кодлар: CAM-011, LNS-012', 'или конкретные коды: CAM-011, LNS-012')} style={{ flex: '1 1 220px' }} />
          <button className="btn">{t('Кўрсатиш', 'Показать')}</button>
          <PrintButton label={t('Чоп этиш', 'Печать')} />
        </form>
        <p className="note">{t(`${labels.length} та ёрлиқ. A4 қоғозга 3 устунда чиқади; ёрлиқ принтери учун ўлчамни чоп этиш ойнасида танланг.`, `${labels.length} этикеток. На A4 печатается в 3 колонки; для принтера этикеток выберите размер в окне печати.`)}</p>
      </div>
      <div className="labels">
        {labels.map((l) => (
          <div className="lab" key={l.code}>
            <div dangerouslySetInnerHTML={{ __html: l.svg }} />
            <div><small>Spectrerental</small><b style={{ display: 'block' }}>{l.code}</b><span>{l.name}</span></div>
          </div>
        ))}
      </div>
    </>
  );
}
