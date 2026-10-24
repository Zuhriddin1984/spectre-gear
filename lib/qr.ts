import { headers } from 'next/headers';

// QR labels hold the item's web address, so any phone camera opens the item page;
// the in-app scanner reads both this and the older "spectre:CODE" form.
export function itemUrl(code: string) {
  const h = headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}/items/${encodeURIComponent(code)}`;
}
