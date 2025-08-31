'use client';

import { useTranslations } from 'next-intl';

export function useT(namespace?: string) {
  return useTranslations(namespace);
}

// Common translation hooks
export function useCommonT() {
  return useTranslations('common');
}

export function useNavigationT() {
  return useTranslations('navigation');
}

export function useBlocksT() {
  return useTranslations('blocks');
}

export function useTransactionsT() {
  return useTranslations('transactions');
}

export function useNetworkT() {
  return useTranslations('network');
}

export function useToolsT() {
  return useTranslations('tools');
}
