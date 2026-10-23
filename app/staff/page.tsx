import { createClient, getProfile } from '@/lib/supabase/server';
import { getTr } from '@/lib/i18n';
import { ROLES, roleLabel } from '@/lib/format';
import ErrorBox from '@/components/ErrorBox';
import { saveStaff } from './actions';

const RIGHTS: Record<string, [string, string]> = {
  admin: ['Ҳамма нарса, нархларни ўзгартириш, ходим ролларини бериш', 'Всё, изменение цен, назначение ролей'],
  store: ['Бериш, қайтариш, таъмир, инвентаризация', 'Выдача, возврат, ремонт, инвентаризация'],
  manager: ['Бронлар, мижозлар, шартномалар', 'Брони, клиенты, договоры'],
  tech: ['Бериш, қайтариш, носозлик белгилаш', 'Выдача, возврат, отметка неисправностей'],
};

export default async function Staff({ searchParams }: { searchParams: { err?: string } }) {
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
      <section className="panel" style={{ marginTop: 16 }}>
        <h2>{t('Янги ходим қўшиш', 'Как добавить сотрудника')}</h2>
        <ol className="note" style={{ margin: 0, paddingLeft: 18 }}>
          <li>{t('supabase.com да лойиҳани очинг → Authentication → Users → Add user → Create new user.', 'Откройте проект на supabase.com → Authentication → Users → Add user → Create new user.')}</li>
          <li>{t('Email ва парол ёзинг, «Auto Confirm User» белгисини қўйинг.', 'Введите email и пароль, отметьте «Auto Confirm User».')}</li>
          <li>{t('Ходим шу email ва парол билан киради. Кейин бу ерда унинг исми ва ролини белгиланг.', 'Сотрудник входит с этим email и паролем. Затем здесь укажите имя и роль.')}</li>
        </ol>
      </section>
    </>
  );
}
