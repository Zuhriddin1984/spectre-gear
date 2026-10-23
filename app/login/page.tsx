import { getTr } from '@/lib/i18n';
import { createServiceClient } from '@/lib/supabase/server';
import { pinConfigured } from '@/lib/pin';
import { errText, roleLabel } from '@/lib/format';
import { createFirstAdmin, pinSignIn } from './actions';

export const dynamic = 'force-dynamic';

export default async function Login({ searchParams }: { searchParams: { err?: string } }) {
  const { lang, t } = getTr();
  const ready = pinConfigured();
  let staff: { id: string; full_name: string | null; role: string }[] = [];
  let loadError = '';
  if (ready) {
    const { data, error } = await createServiceClient().from('profiles').select('id, full_name, role').order('full_name');
    staff = data ?? [];
    loadError = error?.message ?? '';
  }
  const first = ready && !loadError && staff.length === 0;

  return (
    <form action={first ? createFirstAdmin : pinSignIn} className="panel stack login">
      <div className="brand"><span className="tally" /><b>Spectre Gear</b></div>
      <p className="note" style={{ margin: 0 }}>{t('Spectrerental ходимлари учун ички тизим', 'Внутренняя система для сотрудников Spectrerental')}</p>
      {!ready && <div className="warnbox">{errText('NO_KEYS', lang)}</div>}
      {loadError && <div className="warnbox">{t('Базага уланиб бўлмади', 'Не удалось подключиться к базе')}<div className="note">{loadError}</div></div>}
      {searchParams.err && <div className="warnbox">{errText(searchParams.err, lang)}</div>}
      {first ? (
        <>
          <div className="okbox">{t('Биринчи кириш: администратор яратилади. Исмингизни ёзинг ва PIN-кодни киритинг.', 'Первый вход: будет создан администратор. Введите имя и PIN-код.')}</div>
          <label className="field"><span>{t('Исмингиз', 'Ваше имя')}</span><input name="name" required autoComplete="name" /></label>
        </>
      ) : (
        <label className="field"><span>{t('Ким кирияпти?', 'Кто входит?')}</span>
          <select name="staff" required disabled={!ready}>
            {staff.map((s) => <option key={s.id} value={s.id}>{s.full_name || '—'} · {roleLabel(s.role, lang)}</option>)}
          </select>
        </label>
      )}
      <label className="field"><span>PIN</span><input name="pin" type="password" inputMode="numeric" autoComplete="current-password" required disabled={!ready} /></label>
      <button className="btn primary" disabled={!ready}>{t('Кириш', 'Войти')}</button>
    </form>
  );
}
