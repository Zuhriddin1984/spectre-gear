import { createClient, getProfile } from '@/lib/supabase/server';
import { getTr } from '@/lib/i18n';
import { ROLES, roleLabel } from '@/lib/format';
import ErrorBox from '@/components/ErrorBox';
import { addStaff, saveStaff, setPin } from './actions';

const RIGHTS: Record<string, [string, string]> = {
  admin: ['Ҳамма нарса, нархларни ўзгартириш, ходим ролларини бериш', 'Всё, изменение цен, назначение ролей'],
  store: ['Бериш, қайтариш, таъмир, инвентаризация', 'Выдача, возврат, ремонт, инвентаризация'],
  manager: ['Бронлар, мижозлар, шартномалар', 'Брони, клиенты, договоры'],
  tech: ['Бериш, қайтариш, носозлик белгилаш', 'Выдача, возврат, отметка неисправностей'],
};

export default async function Staff({ searchParams }: { searchParams: { err?: string; pin?: string } }) {
  const { lang, t } = getTr();
  const sb = createClient();
  const [me, { data: staff }] = await Promise.all([getProfile(), sb.from('profiles').select('*').order('created_at')]);
  const admin = me?.role === 'admin';
  return (
    <>
      <h1>{t('Ходимлар', 'Сотрудники')}</h1>
      <ErrorBox err={searchParams.err} lang={lang} />
      <div className="cards">
        {(staff ?? []).map((s: any) => (
          <form key={s.id} action={saveStaff.bind(null, s.id)} className="card">
            <input name="full_name" defaultValue={s.full_name ?? ''} disabled={!admin && s.id !== me?.id} />
            {admin ? (
              <select name="role" defaultValue={s.role}>{Object.keys(ROLES).map((r) => <option key={r} value={r}>{roleLabel(r, lang)}</option>)}</select>
            ) : <b>{roleLabel(s.role, lang)}</b>}
            <span className="note">{(RIGHTS[s.role] ?? ['', ''])[lang === 'ru' ? 1 : 0]}</span>
            {(admin || s.id === me?.id) && <div><button className="btn">{t('Сақлаш', 'Сохранить')}</button></div>}
          </form>
        ))}
      </div>
      {admin && (
        <form action={addStaff} className="panel stack" style={{ marginTop: 16, maxWidth: 520 }}>
          <h2>{t('Янги ходим қўшиш', 'Добавить сотрудника')}</h2>
          <div className="f2">
            <label className="field"><span>{t('Исми', 'Имя')}</span><input name="full_name" required /></label>
            <label className="field"><span>{t('Роли', 'Роль')}</span><select name="role" defaultValue="tech">{Object.keys(ROLES).map((r) => <option key={r} value={r}>{roleLabel(r, lang)}</option>)}</select></label>
          </div>
          <p className="note" style={{ margin: 0 }}>{t('Ходим кириш саҳифасида ўз исмини танлайди ва умумий PIN-кодни киритади. PIN пастда ўзгартирилади.', 'Сотрудник выбирает своё имя на странице входа и вводит общий PIN-код. PIN меняется ниже.')}</p>
          <div><button className="btn primary">{t('Қўшиш', 'Добавить')}</button></div>
        </form>
      )}
      {admin && (
        <form action={setPin} className="panel stack" style={{ marginTop: 16, maxWidth: 520 }}>
          <h2>{t('Умумий PIN-код', 'Общий PIN-код')}</h2>
          {searchParams.pin === 'ok' && <div className="okbox">{t('PIN ўзгартирилди.', 'PIN изменён.')}</div>}
          <label className="field"><span>{t('Янги PIN', 'Новый PIN')}</span><input name="pin" type="password" inputMode="numeric" minLength={4} required autoComplete="new-password" /></label>
          <div><button className="btn">{t('PIN-ни ўзгартириш', 'Сменить PIN')}</button></div>
        </form>
      )}
    </>
  );
}
