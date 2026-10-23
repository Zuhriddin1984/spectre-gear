import { getTr } from '@/lib/i18n';
import ScanClient from './ScanClient';

export default function Scan() {
  const { lang, t } = getTr();
  return (<><h1>{t('QR сканерлаш', 'Сканирование QR')}</h1><ScanClient lang={lang} /></>);
}
