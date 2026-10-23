import { createClient } from '@/lib/supabase/server';
import { getTr } from '@/lib/i18n';
import { addDays, today } from '@/lib/format';
import BookingForm from './BookingForm';

export default async function NewBooking({ searchParams }: { searchParams: { kit?: string; item?: string } }) {
  const { lang, t } = getTr();
  const sb = createClient();
  const [{ data: clients }, { data: items }, { data: kits }] = await Promise.all([
    sb.from('clients').select('id, name').order('name'),
    sb.from('item_status').select('id, code, name, status, daily_price').order('code'),
    sb.from('kits').select('id, name, kit_items(item_id)').order('name'),
  ]);
  const kitList = (kits ?? []).map((k: any) => ({ id: k.id, name: k.name, ids: k.kit_items.map((x: any) => x.item_id) }));
  const initial: number[] = [];
  const kit = kitList.find((k) => String(k.id) === searchParams.kit);
  if (kit) initial.push(...kit.ids);
  const one = (items ?? []).find((i: any) => i.code === searchParams.item);
  if (one) initial.push(one.id);
  return (
    <>
      <h1>{t('Янги брон', 'Новая бронь')}</h1>
      <BookingForm lang={lang} clients={clients ?? []} items={(items ?? []) as any} kits={kitList} initial={initial} start={addDays(today(), 1)} end={addDays(today(), 2)} min={today()} />
    </>
  );
}
