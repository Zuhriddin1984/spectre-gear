import { getTr } from '@/lib/i18n';
import { signIn } from './actions';

export default function Login({ searchParams }: { searchParams: { err?: string } }) {
  const { t } = getTr();
  return (
    <form action={signIn} className="panel stack login">
      <div className="brand"><span className="tally" /><b>Spectre Gear</b></div>
      <p className="note" style={{ margin: 0 }}>{t('Spectrerental ходимлари учун ички тизим', 'Внутренняя система для сотрудников Spectrerental')}</p>
      {searchParams.err && (
        <div className="warnbox">
          {/invalid login/i.test(searchParams.err) ? t('Email ёки парол нотўғри.', 'Неверный email или пароль.')
            : /not confirmed/i.test(searchParams.err) ? t('Email тасдиқланмаган. Supabase → Authentication → Users да фойдаланувчини тасдиқланг.', 'Email не подтверждён. Подтвердите пользователя в Supabase → Authentication → Users.')
            : /api key|fetch|url/i.test(searchParams.err) ? t('Сайт базага уланолмаяпти: Vercel’даги Supabase калитларини текширинг.', 'Сайт не может подключиться к базе: проверьте ключи Supabase в Vercel.')
            : t('Кириш хатоси', 'Ошибка входа')}
          <div className="note">{searchParams.err}</div>
        </div>
      )}
      <label className="field"><span>Email</span><input name="email" type="email" required autoComplete="email" /></label>
      <label className="field"><span>{t('Парол', 'Пароль')}</span><input name="password" type="password" required autoComplete="current-password" /></label>
      <button className="btn primary">{t('Кириш', 'Войти')}</button>
    </form>
  );
}
