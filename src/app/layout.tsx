import type { Metadata } from 'next'
import { Yatra_One, DM_Sans } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/Navbar'

const yatraOne = Yatra_One({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-yatra-one',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: "Awurudu 2026 — SCU",
  description: "Register for the SCU Sri Lankan New Year (Awurudu) celebration on 8th May 2026 at BMICH Hidden Escape, Colombo.",
  openGraph: {
    title: "Awurudu 2026 — SCU",
    description: "Sri Lankan New Year Celebration — 8th May 2026, BMICH Hidden Escape, Colombo",
    type: "website",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${yatraOne.variable} ${dmSans.variable}`}>
      <body className="font-sans antialiased">
        <div className="rangoli-border" />
        <Navbar />
        <div className="min-h-[calc(100vh-70px)]">
          {children}
        </div>
        <footer className="border-t border-[#E8D7B4] bg-[rgba(250,243,224,0.92)] px-4 py-3 text-center">
          <p className="text-[11px] tracking-[0.16em] text-[#9C7D5A] uppercase">Developed by Harith</p>
        </footer>
      </body>
    </html>
  )
}
