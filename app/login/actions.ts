'use server';
import { redirect } from 'next/navigation';
import { createClient, missingEnv } from '@/lib/supabase/server';

// Where to go after signing in: the page the person opened (e.g. a scanned QR), same site only.
const target = (form: FormData) => {
  const next = String(form.get('next') ?? '');
  // browsers read "/\evil.com" like "//evil.com", so backslashes are refused too
  return next.startsWith('/') && !next.startsWith('//') && !next.includes('\\') ? next : '/';
};

const fail = (code: string, form: FormData) => {
  const next = target(form);
  redirect('/login?err=' + encodeURIComponent(code) + (next !== '/' ? '&next=' + encodeURIComponent(next) : ''));
};

// The database checks the PIN and returns a fresh one-time password for the chosen
// person (see 0003_db_login.sql); signing in with it puts the session into the cookies.
async function signInWith(rpc: { data: any; error: { message: string } | null }, form: FormData) {
  if (rpc.error) fail(rpc.error.message, form);
  const res = rpc.data as { email?: string; password?: string; error?: string } | null;
  if (!res?.email || !res.password) fail(res?.error ?? 'NO_USER', form);
  const { error } = await createClient().auth.signInWithPassword({ email: res!.email!, password: res!.password! });
  if (error) fail(error.message, form);
}

export async function pinSignIn(form: FormData) {
  if (missingEnv().length) fail('NO_KEYS', form);
  const staff = String(form.get('staff') ?? '');
  const pin = String(form.get('pin') ?? '').trim();
  await signInWith(await createClient().rpc('pin_sign_in', { p_user: staff, p_pin: pin }), form);
  redirect(target(form));
}

// Only possible while no staff exist yet: creates the first admin.
export async function createFirstAdmin(form: FormData) {
  if (missingEnv().length) fail('NO_KEYS', form);
  const name = String(form.get('name') ?? '').trim();
  const pin = String(form.get('pin') ?? '').trim();
  await signInWith(await createClient().rpc('create_first_admin', { p_name: name, p_pin: pin }), form);
  redirect('/');
}
