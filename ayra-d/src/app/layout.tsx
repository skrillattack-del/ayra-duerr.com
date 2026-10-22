import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ToastProvider } from '@/providers/ToastProvider'
import { ThemeProvider } from '@/providers/ThemeProvider'
import { getThemeInlineScript } from '@/lib/themes'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Pendo the Poodle | Walk, play, rest together',
  description: 'Pendo the Poodle — your fluffy fitness companion for daily walks, play, and recovery.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: getThemeInlineScript() }} />
      </head>
      <body className={inter.className}>
        <ThemeProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
