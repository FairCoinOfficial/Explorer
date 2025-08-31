import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { locales, defaultLocale, type Locale } from '../lib/i18n-config';

export default getRequestConfig(async () => {
  // Get locale from cookie or default to English
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get('locale')?.value;
  const locale = localeCookie && locales.includes(localeCookie as Locale) 
    ? (localeCookie as Locale) 
    : defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
    timeZone: 'UTC',
    now: new Date()
  };
});
