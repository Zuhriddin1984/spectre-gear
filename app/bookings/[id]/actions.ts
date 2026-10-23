'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

function done(id: number, error?: { message: string } | null) {
  revalidatePath('/', 'layout');
  redirect(`/bookings/${id}${error ? '?err=' + encodeURIComponent(error.message) : ''}`);
}

export async function giveAll(id: number) {
  const { error } = await createClient().rpc('checkout_booking', { p_booking: id });
  done(id, error);
}

export async function cancel(id: number) {
  const { error } = await createClient().rpc('cancel_booking', { p_booking: id });
  done(id, error);
}

export async function returnItem(id: number, itemId: number, form: FormData) {
  const { error } = await createClient().rpc('return_item', { p_booking: id, p_item: itemId, p_issue: String(form.get('issue') ?? '').trim() || null });
  done(id, error);
}

export async function returnAll(id: number) {
  const sb = createClient();
  const { data } = await sb.from('booking_items').select('item_id').eq('booking_id', id).eq('active', true).not('out_at', 'is', null);
  for (const r of data ?? []) {
    const { error } = await sb.rpc('return_item', { p_booking: id, p_item: r.item_id, p_issue: null });
    if (error) done(id, error);
  }
  done(id);
}

export async function extend(id: number, form: FormData) {
  const end = String(form.get('end'));
  const sb = createClient();
  const { error } = await sb.from('booking_items').update({ end_date: end }).eq('booking_id', id).eq('active', true);
  if (!error) await sb.from('bookings').update({ end_date: end }).eq('id', id);
  done(id, error);
}
