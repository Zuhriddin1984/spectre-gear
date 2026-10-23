'use server';
import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { clearFailures, createStaffUser, lockedOut, pinConfigured, pinMatches, recordFailure } from '@/lib/pin';

const fail = (code: string) => redirect('/login?err=' + encodeURIComponent(code));

// Turns a staff member into a signed-in Supabase session without a password:
// the server issues a one-time login token and redeems it into the cookies.
async function startSession(userId: string) {
  const admin = createServiceClient();
  const { data: u, error: e1 } = await admin.auth.admin.getUserById(userId);
  if (e1 || !u.user?.email) fail(e1?.message ?? 'NO_USER');
  const { data: link, error: e2 } = await admin.auth.admin.generateLink({ type: 'magiclink', email: u.user!.email! });
  if (e2) fail(e2.message);
  const { error: e3 } = await createClient().auth.verifyOtp({ type: 'magiclink', token_hash: link.properties!.hashed_token });
  if (e3) fail(e3.message);
}

export async function pinSignIn(form: FormData) {
  if (!pinConfigured()) fail('NO_KEYS');
  if (await lockedOut()) fail('LOCKED');
  const staff = String(form.get('staff') ?? '');
  if (!pinMatches(String(form.get('pin') ?? '').trim())) {
    await recordFailure();
    fail('BAD_PIN');
  }
  await clearFailures();
  await startSession(staff);
  redirect('/');
}

// Only possible while no staff exist yet: creates the first admin.
export async function createFirstAdmin(form: FormData) {
  if (!pinConfigured()) fail('NO_KEYS');
  if (await lockedOut()) fail('LOCKED');
  const { count } = await createServiceClient().from('profiles').select('id', { count: 'exact', head: true });
  if ((count ?? 0) > 0) fail('ALREADY_SET_UP');
  if (!pinMatches(String(form.get('pin') ?? '').trim())) {
    await recordFailure();
    fail('BAD_PIN');
  }
  const name = String(form.get('name') ?? '').trim() || 'Admin';
  let id = '';
  try {
    id = (await createStaffUser(name)).id;
  } catch (e) {
    fail((e as Error).message);
  }
  await startSession(id);
  redirect('/');
}
