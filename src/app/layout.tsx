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
  title: "Awurudu 2026 — SLIIT City University",
  description: "Register for the SLIIT City University Sri Lankan New Year (Awurudu) celebration on 8th May 2026 at BMICH Kamatha, Colombo.",
  openGraph: {
    title: "Awurudu 2026 — SLIIT City University",
    description: "Sri Lankan New Year Celebration — 8th May 2026, BMICH Kamatha, Colombo",
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
        {children}
      </body>
    </html>
  )
}
