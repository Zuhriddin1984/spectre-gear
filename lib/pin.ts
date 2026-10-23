import crypto from 'node:crypto';
import { createServiceClient } from '@/lib/supabase/server';

const MAX_FAILS = 10;
const WINDOW_MIN = 15;

export function pinConfigured() {
  return !!process.env.ACCESS_PIN && !!process.env.SUPABASE_SERVICE_ROLE_KEY && !!process.env.NEXT_PUBLIC_SUPABASE_URL;
}

export function pinMatches(pin: string) {
  const want = Buffer.from(process.env.ACCESS_PIN ?? '');
  const got = Buffer.from(pin);
  return want.length > 0 && want.length === got.length && crypto.timingSafeEqual(want, got);
}

export async function lockedOut() {
  const since = new Date(Date.now() - WINDOW_MIN * 60_000).toISOString();
  const { count } = await createServiceClient().from('pin_attempts').select('id', { count: 'exact', head: true }).gte('created_at', since);
  return (count ?? 0) >= MAX_FAILS;
}

export async function recordFailure() {
  await createServiceClient().from('pin_attempts').insert({});
}

export async function clearFailures() {
  await createServiceClient().from('pin_attempts').delete().gte('id', 0);
}

// Staff accounts are created by the app, so nobody has to deal with emails or passwords.
export async function createStaffUser(fullName: string) {
  const admin = createServiceClient();
  const { data, error } = await admin.auth.admin.createUser({
    email: `staff-${crypto.randomUUID()}@spectre-gear.local`,
    password: crypto.randomBytes(24).toString('base64url'),
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error) throw error;
  return data.user!;
}
