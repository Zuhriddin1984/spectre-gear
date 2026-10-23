'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient, createServiceClient, getProfile } from '@/lib/supabase/server';
import { createStaffUser } from '@/lib/pin';

export async function saveStaff(id: string, form: FormData) {
  const patch: Record<string, string> = { full_name: String(form.get('full_name') ?? '').trim() };
  const role = String(form.get('role') ?? '');
  if (role) patch.role = role;
  const { error } = await createClient().from('profiles').update(patch).eq('id', id);
  revalidatePath('/', 'layout');
  redirect('/staff' + (error ? '?err=' + encodeURIComponent(error.message) : ''));
}

export async function addStaff(form: FormData) {
  const me = await getProfile();
  if (me?.role !== 'admin') redirect('/staff?err=ONLY_ADMIN_CHANGES_ROLES');
  const name = String(form.get('full_name') ?? '').trim();
  const role = String(form.get('role') ?? 'tech');
  if (!name) redirect('/staff');
  let err = '';
  try {
    const user = await createStaffUser(name);
    // the signup trigger made a 'tech' profile; set the chosen role with the server key
    const { error } = await createServiceClient().from('profiles').update({ full_name: name, role }).eq('id', user.id);
    err = error?.message ?? '';
  } catch (e) {
    err = (e as Error).message;
  }
  revalidatePath('/', 'layout');
  redirect('/staff' + (err ? '?err=' + encodeURIComponent(err) : ''));
}
