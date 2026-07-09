import { Component, type ReactNode } from 'react'
import { getLocale } from '@/lib/i18n'
import en from '@/messages/en.json'
import es from '@/messages/es.json'
import fr from '@/messages/fr.json'
import de from '@/messages/de.json'
import ru from '@/messages/ru.json'
import zh from '@/messages/zh.json'
import ja from '@/messages/ja.json'
import ko from '@/messages/ko.json'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

type Messages = Record<string, string>

const messagesByLocale: Record<string, Messages> = {
  en: en as Messages,
  es: es as Messages,
  fr: fr as Messages,
  de: de as Messages,
  ru: ru as Messages,
  zh: zh as Messages,
  ja: ja as Messages,
  ko: ko as Messages,
}

function t(key: string): string {
  const locale = getLocale()
  const messages = messagesByLocale[locale] ?? messagesByLocale.en
  return messages[key] ?? messagesByLocale.en[key] ?? key
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Surface to the console for operators; no user-facing log spam.
    console.error('ErrorBoundary caught:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            fontFamily: 'Inter, system-ui, sans-serif',
            padding: '2rem',
          }}
        >
          <div style={{ textAlign: 'center', maxWidth: '480px' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              {t('errorBoundary.title')}
            </h1>
            <p style={{ opacity: 0.7, marginBottom: '1rem', fontSize: '0.875rem' }}>
              {this.state.error?.message ?? t('errorBoundary.fallback')}
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.75rem',
                border: '1px solid hsl(132, 50%, 45%)',
                background: 'transparent',
                color: 'hsl(132, 50%, 45%)',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: 500,
              }}
            >
              {t('errorBoundary.reload')}
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
