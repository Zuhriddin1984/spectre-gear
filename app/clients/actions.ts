'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

const val = (f: FormData, k: string) => String(f.get(k) ?? '').trim() || null;

export async function addClient(form: FormData) {
  const name = val(form, 'name');
  if (!name) redirect('/clients');
  const { error } = await createClient().from('clients').insert({ name, phone: val(form, 'phone'), note: val(form, 'note') });
  revalidatePath('/', 'layout');
  redirect('/clients' + (error ? '?err=' + encodeURIComponent(error.message) : ''));
}

export async function updateClient(id: number, form: FormData) {
  const { error } = await createClient().from('clients').update({ name: val(form, 'name'), phone: val(form, 'phone'), note: val(form, 'note') }).eq('id', id);
  revalidatePath('/', 'layout');
  redirect('/clients' + (error ? '?err=' + encodeURIComponent(error.message) : ''));
}
