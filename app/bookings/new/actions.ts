'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type Conflict = { item_id: number; code: string; name: string; reason: string; booking_number: string | null; client_name: string | null; start_date: string | null; end_date: string | null };

export async function checkConflicts(ids: number[], start: string, end: string): Promise<Conflict[]> {
  if (!ids.length || !start || !end) return [];
  const { data } = await createClient().rpc('check_conflicts', { p_item_ids: ids, p_start: start, p_end: end });
  return (data ?? []) as Conflict[];
}

export async function createBooking(input: { client: number; start: string; end: string; ids: number[]; note: string }): Promise<{ id?: number; error?: string }> {
  const { data, error } = await createClient().rpc('create_booking', {
    p_client: input.client, p_start: input.start, p_end: input.end, p_item_ids: input.ids, p_note: input.note || null,
  });
  if (error) return { error: error.message };
  revalidatePath('/', 'layout');
  return { id: data as number };
}
