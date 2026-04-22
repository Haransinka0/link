'use client'

import { Toaster } from 'sonner'

export default function ToasterProvider() {
  return (
    <Toaster
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        style: {
          fontFamily:
            'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
        },
      }}
    />
  )
}

