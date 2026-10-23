import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  try {
    return await session(request);
  } catch (e) {
    // Show the cause instead of Vercel's generic MIDDLEWARE_INVOCATION_FAILED page
    const msg = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    console.error('middleware failed', e);
    return new NextResponse(
      `<!doctype html><meta charset="utf-8"><body style="font:15px system-ui;padding:24px;max-width:640px">` +
        `<h2>Spectre Gear: тизим хатоси / системная ошибка</h2><p>Шу саҳифанинг скриншотини юборинг. / Пришлите скриншот этой страницы.</p>` +
        `<pre style="white-space:pre-wrap;background:#f3f4f6;padding:12px;border-radius:6px">${msg.replace(/[<&]/g, '')}\n` +
        `url: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).host : 'missing'}\n` +
        `key: ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.slice(0, 12) + '…' : 'missing'}\n` +
        `cookies: ${request.cookies.getAll().map((c) => c.name + '(' + c.value.length + ')').join(', ')}</pre>` +
        `<p><a href="/login">← /login</a></p></body>`,
      { status: 500, headers: { 'content-type': 'text/html; charset=utf-8' } },
    );
  }
}

async function session(request: NextRequest) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    // not configured yet: the login page explains which settings are missing
    if (request.nextUrl.pathname.startsWith('/login')) return NextResponse.next({ request });
    return NextResponse.redirect(new URL('/login', request.url));
  }
  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(list) {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user && !request.nextUrl.pathname.startsWith('/login')) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/cron).*)'],
};
