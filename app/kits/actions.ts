'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function createKit(form: FormData) {
  const sb = createClient();
  const name = String(form.get('name') ?? '').trim();
  const codes = String(form.get('codes') ?? '').toUpperCase().split(/[\s,;]+/).filter(Boolean);
  const { data: items } = await sb.from('items').select('id, code').in('code', codes);
  const missing = codes.filter((c) => !(items ?? []).some((i) => i.code === c));
  if (!name || !items?.length || missing.length) {
    redirect('/kits?err=' + encodeURIComponent(missing.length ? 'Топилмади / не найдено: ' + missing.join(', ') : 'Ном ва кодлар керак / нужны название и коды'));
  }
  const { data: kit, error } = await sb.from('kits').insert({ name }).select('id').single();
  if (error) redirect('/kits?err=' + encodeURIComponent(error.message));
  await sb.from('kit_items').insert(items!.map((i) => ({ kit_id: kit!.id, item_id: i.id })));
  revalidatePath('/kits');
  redirect('/kits');
}

export async function deleteKit(id: number) {
  await createClient().from('kits').delete().eq('id', id);
  revalidatePath('/kits');
  redirect('/kits');
}
