import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { overdue } from '@/lib/data';
import { daysBetween, dm, today } from '@/lib/format';

export const dynamic = 'force-dynamic';

// Runs daily (vercel.json) and sends one Telegram message listing overdue returns.
export async function GET(req: Request) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return NextResponse.json({ skipped: 'telegram not configured' });

  const late = await overdue(createServiceClient());
  if (!late.length) return NextResponse.json({ sent: 0 });
  const now = today();
  const text = ['🔔 Қайтариш муддати ўтган / Просрочен возврат', '']
    .concat(late.map((b) => `• ${b.number} — ${b.client}${b.phone ? ' ' + b.phone : ''}\n  ${b.items.join(', ')}\n  ${dm(b.end)} (${daysBetween(b.end, now)} кун/дн.)`))
    .join('\n');
  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chat, text }),
  });
  return NextResponse.json({ sent: late.length, ok: r.ok });
}
