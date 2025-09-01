import { getRequestConfig } from 'next-intl/server';
import { headers, cookies } from 'next/headers';

export const locales = ['en', 'es', 'fr', 'de', 'zh', 'ja', 'ko', 'ru'] as const;
export type Locale = typeof locales[number];

export const defaultLocale: Locale = 'en';

export const localeNames: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français', 
  de: 'Deutsch',
  zh: '中文',
  ja: '日本語',
  ko: '한국어',
  ru: 'Русский'
};

export default getRequestConfig(async () => {
  // Get locale from cookie or default to 'en'
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get('locale')?.value;
  const locale = localeCookie && locales.includes(localeCookie as Locale) 
    ? (localeCookie as Locale) 
    : defaultLocale;

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
    timeZone: 'UTC',
    now: new Date()
  };
});
