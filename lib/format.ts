import type { Lang } from './i18n';

export type ItemStatus = 'available' | 'reserved' | 'out' | 'late' | 'repair';

const STATUS: Record<string, [string, string]> = {
  available: ['Омборда', 'На складе'],
  reserved: ['Бронланган', 'Забронировано'],
  out: ['Ижарада', 'В аренде'],
  late: ['Муддати ўтган', 'Просрочено'],
  repair: ['Таъмирда', 'В ремонте'],
  closed: ['Ёпилган', 'Закрыта'],
  cancelled: ['Бекор қилинган', 'Отменена'],
};

export const statusLabel = (s: string, lang: Lang) => (STATUS[s] ?? [s, s])[lang === 'ru' ? 1 : 0];

export const ROLES: Record<string, [string, string]> = {
  admin: ['Администратор', 'Администратор'],
  store: ['Омбор мудири', 'Заведующий складом'],
  manager: ['Менежер', 'Менеджер'],
  tech: ['Техник', 'Техник'],
};
export const roleLabel = (r: string, lang: Lang) => (ROLES[r] ?? [r, r])[lang === 'ru' ? 1 : 0];

export function money(n: number, lang: Lang) {
  return n.toLocaleString('ru-RU').replace(/ /g, ' ') + (lang === 'ru' ? ' сум' : ' сўм');
}

// Dates are handled as YYYY-MM-DD strings in Tashkent time.
export function today(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tashkent' }).format(new Date());
}
export function addDays(d: string, n: number): string {
  const x = new Date(d + 'T00:00:00Z');
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
}
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 864e5);
}
export const dm = (d: string) => `${d.slice(8, 10)}.${d.slice(5, 7)}`;
export const dmy = (d: string) => `${d.slice(8, 10)}.${d.slice(5, 7)}.${d.slice(0, 4)}`;
export function weekday(d: string, lang: Lang) {
  const k = new Date(d + 'T00:00:00Z').getUTCDay();
  return (lang === 'ru' ? ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'] : ['Як', 'Ду', 'Се', 'Чо', 'Па', 'Жу', 'Ша'])[k];
}

export function errText(message: string | undefined, lang: Lang): string {
  if (!message) return '';
  const t = (uz: string, ru: string) => (lang === 'ru' ? ru : uz);
  if (message.startsWith('CONFLICT')) return t('Бу ускуналар бу саналарда банд: ', 'Эти позиции заняты на эти даты: ') + message.replace(/^CONFLICT:\s*/, '');
  if (message.includes('no_double_booking')) return t('Ускуна бу саналарда банд.', 'Позиция занята на эти даты.');
  if (message === 'NO_ITEMS') return t('Камида битта ускуна қўшинг.', 'Добавьте хотя бы одну позицию.');
  if (message === 'NOT_RESERVED') return t('Бу брон бериш ёки бекор қилиш ҳолатида эмас.', 'Эту бронь нельзя выдать или отменить.');
  if (message === 'NOT_OUT') return t('Бу ускуна ижарада эмас.', 'Эта позиция не в аренде.');
  if (message === 'ONLY_ADMIN_CHANGES_ROLES') return t('Ролни фақат администратор ўзгартира олади.', 'Роль может менять только администратор.');
  return message;
}
