'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Scanner from '@/components/Scanner';
import type { Lang } from '@/lib/i18n';

export default function ScanClient({ lang }: { lang: Lang }) {
  const t = (uz: string, ru: string) => (lang === 'ru' ? ru : uz);
  const router = useRouter();
  const [code, setCode] = useState('');
  const open = (c: string) => c && router.push('/items/' + encodeURIComponent(c.trim().toUpperCase()));
  return (
    <div className="grid2">
      <div className="panel stack">
        <h2>{t('Камера', 'Камера')}</h2>
        <Scanner onCode={open} labels={{ start: t('Камерани ёқиш', 'Включить камеру'), stop: t('Тўхтатиш', 'Остановить'), denied: t('Камерага рухсат берилмади. Браузер созламаларида рухсат беринг ёки кодни қўлда ёзинг.', 'Нет доступа к камере. Разрешите доступ в настройках браузера или введите код вручную.') }} />
      </div>
      <form className="panel stack" onSubmit={(e) => { e.preventDefault(); open(code); }}>
        <h2>{t('Кодни қўлда ёзиш', 'Ввести код вручную')}</h2>
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="CAM-011" autoCapitalize="characters" />
        <div><button className="btn primary">{t('Очиш', 'Открыть')}</button></div>
        <p className="note">{t('Сканерлангандан кейин ускуна саҳифаси очилади: у ерда бериш, қайтариш, таъмир ва носозлик тугмалари бор.', 'После сканирования открывается страница позиции: там кнопки выдачи, возврата, ремонта и неисправности.')}</p>
      </form>
    </div>
  );
}
