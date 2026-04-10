import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark')

  return (
    <Sonner
      theme={isDark ? 'dark' : 'light'}
      className="toaster group"
      style={{
        "--normal-bg": "hsl(var(--popover))",
        "--normal-text": "hsl(var(--popover-foreground))",
        "--normal-border": "hsl(var(--border))",
        "--success-bg": "hsl(var(--primary))",
        "--success-text": "hsl(var(--primary-foreground))",
        "--success-border": "hsl(var(--primary))",
        "--error-bg": "hsl(var(--destructive))",
        "--error-text": "hsl(var(--destructive-foreground))",
        "--error-border": "hsl(var(--destructive))",
        "--border-radius": "var(--radius)",
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
