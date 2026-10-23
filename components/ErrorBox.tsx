import { errText } from '@/lib/format';
import type { Lang } from '@/lib/i18n';

export default function ErrorBox({ err, ok, lang }: { err?: string; ok?: string; lang: Lang }) {
  if (err) return <div className="warnbox" style={{ marginBottom: 12 }}>{errText(err, lang)}</div>;
  if (ok) return <div className="okbox" style={{ marginBottom: 12 }}>{ok}</div>;
  return null;
}
