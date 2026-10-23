'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function saveAudit(category: string, expected: number, found: number, missing: string[]) {
  const { error } = await createClient().from('audits').insert({ category, expected, found, missing_codes: missing });
  revalidatePath('/audit');
  return error?.message ?? '';
}
