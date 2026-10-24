import './globals.css';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getProfile } from '@/lib/supabase/server';
import { getTr } from '@/lib/i18n';
import { roleLabel } from '@/lib/format';
import { setLang, signOut } from './actions';
import NavLinks from '@/components/NavLinks';
import { IBM_Plex_Mono, Manrope, Unbounded } from 'next/font/google';

// Fonts are bundled with the site at build time instead of loading from Google on every visit.
const display = Unbounded({ subsets: ['latin', 'cyrillic'], weight: ['500', '700'], variable: '--font-display' });
const body = Manrope({ subsets: ['latin', 'cyrillic'], weight: ['400', '600', '700'], variable: '--font-body' });
const mono = IBM_Plex_Mono({ subsets: ['latin', 'cyrillic'], weight: ['400', '600'], variable: '--font-mono' });

export const metadata: Metadata = { title: 'Spectre Gear', description: 'Spectrerental equipment management' };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { lang, t } = getTr();
  const me = await getProfile();
  const links: [string, string][] = [
    ['/', t('Ускуналар', 'Оборудование')],
    ['/bookings', t('Бронлар', 'Брони')],
    ['/scan', t('Скан', 'Скан')],
    ['/kits', t('Комплектлар', 'Комплекты')],
    ['/audit', t('Инвентаризация', 'Инвентаризация')],
    ['/clients', t('Мижозлар', 'Клиенты')],
    ['/reports', t('Ҳисоботлар', 'Отчёты')],
    ['/labels', t('QR-ёрлиқлар', 'QR-этикетки')],
    ['/staff', t('Ходимлар', 'Сотрудники')],
  ];
  return (
    <html lang={lang === 'ru' ? 'ru' : 'uz-Cyrl'} className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        {me && (
          <header className="app">
            <div className="topbar">
              <Link href="/" className="brand"><span className="tally" /><b>Spectre Gear</b></Link>
              <div className="right">
                <span>{me.name} · {roleLabel(me.role, lang)}</span>
                <form action={setLang} className="seg">
                  <button name="lang" value="uz" className={lang === 'uz' ? 'on' : ''}>Ўзб</button>
                  <button name="lang" value="ru" className={lang === 'ru' ? 'on' : ''}>Рус</button>
                </form>
                <form action={signOut}><button className="btn">{t('Чиқиш', 'Выйти')}</button></form>
              </div>
            </div>
            <NavLinks links={links} />
          </header>
        )}
        <main className="wrap">{children}</main>
      </body>
    </html>
  );
}
