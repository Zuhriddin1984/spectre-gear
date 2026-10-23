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

export async function addStaff(form: FormData) {
  const name = String(form.get('full_name') ?? '').trim();
  const role = String(form.get('role') ?? 'tech');
  if (!name) redirect('/staff');
  const { error } = await createClient().rpc('add_staff', { p_name: name, p_role: role });
  revalidatePath('/', 'layout');
  redirect('/staff' + (error ? '?err=' + encodeURIComponent(error.message) : ''));
}

export async function setPin(form: FormData) {
  const { error } = await createClient().rpc('set_access_pin', { p_pin: String(form.get('pin') ?? '') });
  redirect('/staff?' + (error ? 'err=' + encodeURIComponent(error.message) : 'pin=ok'));
}
