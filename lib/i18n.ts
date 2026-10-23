import { cookies } from 'next/headers';

export type Lang = 'uz' | 'ru';
export type Tr = (uz: string, ru: string) => string;

export function getLang(): Lang {
  return cookies().get('lang')?.value === 'ru' ? 'ru' : 'uz';
}

export function makeTr(lang: Lang): Tr {
  return (uz, ru) => (lang === 'ru' ? ru : uz);
}

export function getTr() {
  const lang = getLang();
  return { lang, t: makeTr(lang) };
}
