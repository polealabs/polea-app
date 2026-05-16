'use client'

import { useEffect } from 'react'

type Props = {
  open: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
  maxWidth?: string
}

export function FormModal({ open, title, onClose, children, maxWidth = 'max-w-2xl' }: Props) {
  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div
        className={`w-full ${maxWidth} max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl`}
        style={{ background: 'var(--color-surface)' }}
      >
        <div
          className="sticky top-0 flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
        >
          <h2 className="text-base font-semibold" style={{ color: 'var(--color-text)' }}>
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-xl leading-none px-1"
            style={{ color: 'var(--color-text-soft)' }}
          >
            ✕
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}
