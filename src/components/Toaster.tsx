import { useEffect } from 'react'
import { useStore } from '@/store'
import { cn } from '@/lib/utils'

const AUTO_DISMISS_MS = 3000

export function Toaster() {
  const toasts = useStore((s) => s.toasts)
  const removeToast = useStore((s) => s.removeToast)

  useEffect(() => {
    if (toasts.length === 0) return
    const latest = toasts[toasts.length - 1]
    const timer = setTimeout(() => removeToast(latest.id), AUTO_DISMISS_MS)
    return () => clearTimeout(timer)
  }, [toasts])

  if (toasts.length === 0) return null

  return (
    <div className="pointer-events-none fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'pointer-events-auto flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm shadow-lg',
            toast.type === 'error'
              ? 'bg-destructive/10 border-destructive/30 text-destructive'
              : toast.type === 'success'
              ? 'bg-card border-border text-foreground'
              : 'bg-card border-border text-foreground',
          )}
          onClick={() => removeToast(toast.id)}
        >
          {toast.message}
        </div>
      ))}
    </div>
  )
}
