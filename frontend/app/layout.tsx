import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Nav } from '@/components/nav'
import { Toaster } from '@/components/ui/sonner'
import { Providers } from './providers'
import './globals.css'

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
})

export const metadata: Metadata = {
  title: 'Fu Enerji Scheduler',
  description: 'Otomatik ders programı oluşturma uygulaması',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col bg-background">
        <Providers>
          <Nav />
          <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">{children}</main>
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}
