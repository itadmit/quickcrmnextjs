import type { Metadata } from 'next'
import { Noto_Sans_Hebrew, Pacifico } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import { AuthProvider } from '@/components/providers/AuthProvider'

const notoSansHebrew = Noto_Sans_Hebrew({
  subsets: ['hebrew'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-noto-sans-hebrew',
  display: 'swap',
})

const pacifico = Pacifico({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-pacifico',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'QuickCRM - מערכת ניהול לקוחות',
  description: 'מערכת CRM מתקדמת לניהול לידים, לקוחות, פרויקטים ומשימות',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="he" dir="rtl">
      <body className={`${notoSansHebrew.variable} ${pacifico.variable}`}>
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  )
}

