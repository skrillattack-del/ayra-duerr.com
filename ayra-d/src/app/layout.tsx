import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ToastProvider } from '@/providers/ToastProvider'
import { ThemeProvider } from '@/providers/ThemeProvider'
import { getThemeInlineScript } from '@/lib/themes'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'GongaFit | Walk, play, rest with Pendo',
  description: 'GongaFit fitness command center with Pendo the doodle — daily walks, play, and recovery.',
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
