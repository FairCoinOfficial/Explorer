import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark')

  return (
    <Sonner
      theme={isDark ? 'dark' : 'light'}
      className="toaster group"
      style={{
        "--normal-bg": "hsl(var(--card))",
        "--normal-text": "hsl(var(--card-foreground))",
        "--normal-border": "hsl(var(--border))",
        "--success-bg": isDark ? "hsl(90 40% 15%)" : "hsl(90 40% 95%)",
        "--success-text": isDark ? "hsl(90 80% 70%)" : "hsl(90 80% 30%)",
        "--success-border": isDark ? "hsl(90 40% 25%)" : "hsl(90 30% 80%)",
        "--error-bg": isDark ? "hsl(0 40% 15%)" : "hsl(0 40% 95%)",
        "--error-text": isDark ? "hsl(0 80% 70%)" : "hsl(0 80% 40%)",
        "--error-border": isDark ? "hsl(0 40% 25%)" : "hsl(0 30% 80%)",
        "--border-radius": "0.75rem",
      } as React.CSSProperties}
      toastOptions={{
        classNames: {
          toast: "shadow-lg",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
