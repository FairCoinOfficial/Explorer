'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';

export function HeroSearch() {
  const t = useTranslations('common');

  return (
    <section className="text-center space-y-4 py-4 md:py-6">
      <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">{t('exploreFairCoin')}</h1>
      <p className="text-muted-foreground text-sm md:text-base">{t('searchPlaceholder')}</p>
      <form action="/search" className="mx-auto grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 max-w-2xl">
        <Input name="q" placeholder="e.g. 123456 or 000000... or txid" />
        <Button type="submit">{t('search')}</Button>
      </form>
    </section>
  );
}

