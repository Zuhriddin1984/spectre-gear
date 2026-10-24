'use server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function setLang(form: FormData) {
  cookies().set('lang', form.get('lang') === 'ru' ? 'ru' : 'uz', { maxAge: 60 * 60 * 24 * 365, path: '/' });
  revalidatePath('/', 'layout');
}

export async function signOut() {
  // local: signing out on one device keeps the same person signed in on their others
  await createClient().auth.signOut({ scope: 'local' });
  redirect('/login');
}
