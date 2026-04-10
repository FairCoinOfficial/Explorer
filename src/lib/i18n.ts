import { useState, useCallback, useSyncExternalStore } from 'react'

import en from '@/messages/en.json'
import es from '@/messages/es.json'
import fr from '@/messages/fr.json'
import de from '@/messages/de.json'
import ru from '@/messages/ru.json'
import zh from '@/messages/zh.json'
import ja from '@/messages/ja.json'
import ko from '@/messages/ko.json'

export type Locale = 'en' | 'es' | 'fr' | 'de' | 'ru' | 'zh' | 'ja' | 'ko'

export interface LocaleConfig {
  code: Locale
  name: string
  nativeName: string
}

export const SUPPORTED_LOCALES: LocaleConfig[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
]

const STORAGE_KEY = 'faircoin-locale'
const DEFAULT_LOCALE: Locale = 'en'

type Messages = Record<string, string>

const messagesByLocale: Record<Locale, Messages> = {
  en: en as Messages,
  es: es as Messages,
  fr: fr as Messages,
  de: de as Messages,
  ru: ru as Messages,
  zh: zh as Messages,
  ja: ja as Messages,
  ko: ko as Messages,
}

// ── External store for locale (allows all components to react to changes) ──

let currentLocale: Locale = (() => {
  if (typeof window === 'undefined') return DEFAULT_LOCALE
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored && stored in messagesByLocale) return stored as Locale
  return DEFAULT_LOCALE
})()

const listeners = new Set<() => void>()

function emitChange() {
  for (const listener of listeners) {
    listener()
  }
}

function subscribeToLocale(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getLocaleSnapshot(): Locale {
  return currentLocale
}

export function setLocale(locale: Locale): void {
  if (locale === currentLocale) return
  currentLocale = locale
  localStorage.setItem(STORAGE_KEY, locale)
  emitChange()
}

export function getLocale(): Locale {
  return currentLocale
}

// ── Hook: useLocale ──

export function useLocale(): Locale {
  return useSyncExternalStore(subscribeToLocale, getLocaleSnapshot, () => DEFAULT_LOCALE)
}

// ── Hook: useTranslations (optionally scoped by namespace) ──

function getNestedValue(messages: Messages, key: string): string | undefined {
  return messages[key]
}

export function useTranslations(namespace?: string): (key: string, params?: Record<string, string | number>) => string {
  const locale = useLocale()

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const fullKey = namespace ? `${namespace}.${key}` : key
      const messages = messagesByLocale[locale]
      const fallback = messagesByLocale[DEFAULT_LOCALE]

      let value = getNestedValue(messages, fullKey) ?? getNestedValue(fallback, fullKey) ?? fullKey

      // Interpolate {param} placeholders
      if (params) {
        for (const [paramKey, paramValue] of Object.entries(params)) {
          value = value.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue))
        }
      }

      return value
    },
    [locale, namespace],
  )

  return t
}
