'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function saveStaff(id: string, form: FormData) {
  const patch: Record<string, string> = { full_name: String(form.get('full_name') ?? '').trim() };
  const role = String(form.get('role') ?? '');
  if (role) patch.role = role;
  const { error } = await createClient().from('profiles').update(patch).eq('id', id);
  revalidatePath('/', 'layout');
  redirect('/staff' + (error ? '?err=' + encodeURIComponent(error.message) : ''));
}
