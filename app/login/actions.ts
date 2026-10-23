'use server';
import { redirect } from 'next/navigation';
import { createClient, missingEnv } from '@/lib/supabase/server';

const fail = (code: string) => redirect('/login?err=' + encodeURIComponent(code));

// The database checks the PIN and returns a fresh one-time password for the chosen
// person (see 0003_db_login.sql); signing in with it puts the session into the cookies.
async function signInWith(rpc: { data: any; error: { message: string } | null }) {
  if (rpc.error) fail(rpc.error.message);
  const res = rpc.data as { email?: string; password?: string; error?: string } | null;
  if (!res?.email || !res.password) fail(res?.error ?? 'NO_USER');
  const { error } = await createClient().auth.signInWithPassword({ email: res!.email!, password: res!.password! });
  if (error) fail(error.message);
}

export async function pinSignIn(form: FormData) {
  if (missingEnv().length) fail('NO_KEYS');
  const staff = String(form.get('staff') ?? '');
  const pin = String(form.get('pin') ?? '').trim();
  await signInWith(await createClient().rpc('pin_sign_in', { p_user: staff, p_pin: pin }));
  redirect('/');
}

// Only possible while no staff exist yet: creates the first admin.
export async function createFirstAdmin(form: FormData) {
  if (missingEnv().length) fail('NO_KEYS');
  const name = String(form.get('name') ?? '').trim();
  const pin = String(form.get('pin') ?? '').trim();
  await signInWith(await createClient().rpc('create_first_admin', { p_name: name, p_pin: pin }));
  redirect('/');
}
