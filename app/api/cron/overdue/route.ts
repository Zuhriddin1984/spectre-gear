import { NextResponse } from 'next/server';
import { createAnonClient } from '@/lib/supabase/server';
import { daysBetween, dm, today } from '@/lib/format';

export const dynamic = 'force-dynamic';

// Runs daily (vercel.json) and sends one Telegram message listing overdue returns.
export async function GET(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return NextResponse.json({ skipped: 'telegram not configured' });

  // the database only answers when the same secret is stored there (app_secrets.cron_secret)
  const { data, error } = await createAnonClient().rpc('overdue_report', { p_secret: process.env.CRON_SECRET });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const late = (data ?? []) as { number: string; client: string; phone: string; end_date: string; items: string[] }[];
  if (!late.length) return NextResponse.json({ sent: 0 });
  const now = today();
  const text = ['🔔 Қайтариш муддати ўтган / Просрочен возврат', '']
    .concat(late.map((b) => `• ${b.number} — ${b.client}${b.phone ? ' ' + b.phone : ''}\n  ${b.items.join(', ')}\n  ${dm(b.end_date)} (${daysBetween(b.end_date, now)} кун/дн.)`))
    .join('\n');
  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chat, text }),
  });
  return NextResponse.json({ sent: late.length, ok: r.ok });
}
