import type { Metadata } from 'next'
import './globals.css'
import ToasterProvider from '@/components/ToasterProvider'

export const metadata: Metadata = {
  title: 'LinkedPost — Enterprise Content Platform',
  description: 'Create, approve and schedule LinkedIn posts for your team with AI-powered content generation and smart workflows.',
  keywords: 'LinkedIn, content scheduling, team collaboration, AI writing, approval workflow',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <ToasterProvider />
      </body>
    </html>
  )
}
