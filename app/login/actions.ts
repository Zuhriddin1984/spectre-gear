'use server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function signIn(form: FormData) {
  const { error } = await createClient().auth.signInWithPassword({
    email: String(form.get('email') ?? ''),
    password: String(form.get('password') ?? ''),
  });
  if (error) redirect('/login?err=' + encodeURIComponent(error.message || error.name || 'error'));
  redirect('/');
}
