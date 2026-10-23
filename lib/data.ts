import type { SupabaseClient } from '@supabase/supabase-js';
import { today } from './format';

export type Item = {
  id: number; code: string; name: string; category: string; serial: string | null;
  daily_price: number; value: number; in_repair: boolean; issue: string | null;
  photo_url: string | null; notes: string | null; status: string;
  booking_id: number | null; booking_start: string | null; booking_end: string | null;
};

export async function getCategories(sb: SupabaseClient) {
  const { data } = await sb.from('categories').select('*').order('sort');
  return (data ?? []) as { slug: string; name_uz: string; name_ru: string }[];
}

// bookings referenced by a set of items, keyed by id, with client name
export async function bookingMap(sb: SupabaseClient, ids: (number | null)[]) {
  const uniq = [...new Set(ids.filter((x): x is number => !!x))];
  if (!uniq.length) return new Map<number, { number: string; client: string }>();
  const { data } = await sb.from('bookings').select('id, number, clients(name)').in('id', uniq);
  return new Map((data ?? []).map((b: any) => [b.id, { number: b.number, client: b.clients?.name ?? '' }]));
}

export async function overdue(sb: SupabaseClient) {
  const { data } = await sb
    .from('booking_items')
    .select('end_date, items(code, name), bookings(id, number, clients(name, phone))')
    .eq('active', true)
    .not('out_at', 'is', null)
    .lt('end_date', today());
  const by = new Map<number, { id: number; number: string; client: string; phone: string; end: string; items: string[] }>();
  for (const r of (data ?? []) as any[]) {
    const b = r.bookings;
    const e = by.get(b.id) ?? { id: b.id, number: b.number, client: b.clients?.name ?? '', phone: b.clients?.phone ?? '', end: r.end_date, items: [] as string[] };
    e.items.push(r.items?.name ?? '');
    by.set(b.id, e);
  }
  return [...by.values()].sort((a, b) => a.end.localeCompare(b.end));
}
