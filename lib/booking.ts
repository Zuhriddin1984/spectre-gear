import type { SupabaseClient } from '@supabase/supabase-js';
import { daysBetween } from './format';

export async function loadBooking(sb: SupabaseClient, id: number) {
  const { data } = await sb
    .from('bookings')
    .select('*, clients(*), booking_items(id, item_id, start_date, end_date, active, out_at, returned_at, return_note, items(code, name, serial, daily_price, issue))')
    .eq('id', id)
    .single();
  if (!data) return null;
  const b: any = data;
  b.days = daysBetween(b.start_date, b.end_date) + 1;
  b.lines = (b.booking_items as any[]).sort((x, y) => x.items.code.localeCompare(y.items.code));
  b.total = b.lines.reduce((a: number, l: any) => a + (l.items.daily_price || 0) * b.days, 0);
  return b;
}
