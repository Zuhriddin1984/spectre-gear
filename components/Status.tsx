import { statusLabel } from '@/lib/format';
import type { Lang } from '@/lib/i18n';

export default function Status({ s, lang }: { s: string; lang: Lang }) {
  return <span className={`chip s-${s}`}>{statusLabel(s, lang)}</span>;
}
