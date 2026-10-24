import { createServerClient } from '@supabase/ssr';
import { createClient as createPlainClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { cache } from 'react';

export function createClient() {
  const store = cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return store.getAll();
      },
      setAll(list) {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // called from a Server Component; middleware refreshes the session instead
        }
      },
    },
  });
}

// Client without a user session, for background jobs (they call secret-checked database functions).
export function createAnonClient() {
  return createPlainClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  });
}

// Names of required settings that are not set in the hosting environment.
export function missingEnv() {
  return ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'].filter((k) => !process.env[k]);
}

// The signed-in person's id, read from the session token in the cookies (no network call).
function tokenSub(token: string) {
  try {
    return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()).sub as string;
  } catch {
    return null;
  }
}

// Once per request (cache), shared by the layout, the page and server actions.
// Checking the session with the auth server on every request took ~300 ms, so the token is
// only decoded here; the database verifies its signature on the profile query (row level
// security), so a forged token gets no row and counts as signed out.
export const getProfile = cache(async () => {
  // Before the site is configured there is no session to read; the login page explains what is missing.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return null;
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const id = session ? tokenSub(session.access_token) : null;
    if (!id) return null;
    const { data } = await supabase.from('profiles').select('full_name, role').eq('id', id).maybeSingle();
    if (!data) return null;
    return { id, name: data.full_name ?? '', role: data.role as Role };
  } catch (e) {
    console.error('getProfile failed', e);
    return null;
  }
});

export type Role = 'admin' | 'store' | 'manager' | 'tech';
