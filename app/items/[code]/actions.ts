'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient, getProfile } from '@/lib/supabase/server';

const back = (code: string, q = '') => redirect(`/items/${code}${q}`);
const fail = (code: string, msg: string) => back(code, '?err=' + encodeURIComponent(msg));

async function itemByCode(code: string) {
  const sb = createClient();
  const { data } = await sb.from('items').select('*').eq('code', code).single();
  if (!data) redirect('/');
  return { sb, item: data };
}

export async function saveItem(code: string, form: FormData) {
  const { sb, item } = await itemByCode(code);
  const me = await getProfile();
  const patch: Record<string, unknown> = {
    serial: String(form.get('serial') ?? '').trim() || null,
    notes: String(form.get('notes') ?? '').trim() || null,
    value: Math.max(0, Number(form.get('value')) || 0),
  };
  if (me?.role === 'admin') patch.daily_price = Math.max(0, Number(form.get('daily_price')) || 0);
  const { error } = await sb.from('items').update(patch).eq('id', item.id);
  if (error) fail(code, error.message);
  revalidatePath('/', 'layout');
  back(code, '?ok=1');
}

export async function uploadPhoto(code: string, form: FormData) {
  const { sb, item } = await itemByCode(code);
  const file = form.get('photo') as File | null;
  if (!file || !file.size) back(code);
  const ext = (file!.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
  const path = `${code}-${Date.now()}.${ext}`;
  const { error } = await sb.storage.from('photos').upload(path, file!, { contentType: file!.type, upsert: true });
  if (error) fail(code, error.message);
  const url = sb.storage.from('photos').getPublicUrl(path).data.publicUrl;
  await sb.from('items').update({ photo_url: url }).eq('id', item.id);
  revalidatePath(`/items/${code}`);
  back(code);
}

export async function setIssue(code: string, form: FormData) {
  const { sb, item } = await itemByCode(code);
  const text = String(form.get('issue') ?? '').trim();
  if (!text) back(code);
  await sb.from('items').update({ issue: text }).eq('id', item.id);
  await sb.from('item_events').insert({ item_id: item.id, kind: 'issue', text });
  revalidatePath('/', 'layout');
  back(code);
}

export async function clearIssue(code: string) {
  const { sb, item } = await itemByCode(code);
  await sb.from('items').update({ issue: null }).eq('id', item.id);
  await sb.from('item_events').insert({ item_id: item.id, kind: 'issue_fixed', text: item.issue });
  revalidatePath('/', 'layout');
  back(code);
}

export async function toggleRepair(code: string, form: FormData) {
  const { sb, item } = await itemByCode(code);
  const on = !item.in_repair;
  const text = String(form.get('text') ?? '').trim() || null;
  await sb.from('items').update({ in_repair: on }).eq('id', item.id);
  await sb.from('item_events').insert({ item_id: item.id, kind: on ? 'repair_out' : 'repair_back', text });
  revalidatePath('/', 'layout');
  back(code);
}

export async function quickGive(code: string, form: FormData) {
  const { sb, item } = await itemByCode(code);
  const { data, error } = await sb.rpc('quick_checkout', {
    p_client: Number(form.get('client')),
    p_item: item.id,
    p_end: String(form.get('end')),
  });
  if (error) fail(code, error.message);
  revalidatePath('/', 'layout');
  redirect(`/bookings/${data}`);
}

export async function returnOne(code: string, bookingId: number, form: FormData) {
  const { sb, item } = await itemByCode(code);
  const { error } = await sb.rpc('return_item', { p_booking: bookingId, p_item: item.id, p_issue: String(form.get('issue') ?? '').trim() || null });
  if (error) fail(code, error.message);
  revalidatePath('/', 'layout');
  back(code, '?ok=returned');
}

export async function giveBooking(code: string, bookingId: number) {
  const sb = createClient();
  const { error } = await sb.rpc('checkout_booking', { p_booking: bookingId });
  if (error) fail(code, error.message);
  revalidatePath('/', 'layout');
  redirect(`/bookings/${bookingId}`);
}
