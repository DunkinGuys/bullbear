import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Header } from '@/components/layout/Header';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://bullbear.lol';

export const metadata: Metadata = {
  title: {
    default: 'BullBear - Service Closed',
    template: '%s | BullBear',
  },
  description:
    'BullBear has ended. The live service, API activity, and trading flows are closed.',
  metadataBase: new URL(APP_URL),
  openGraph: {
    title: 'BullBear - Service Closed',
    description:
      'BullBear has ended. The live service, API activity, and trading flows are closed.',
    siteName: 'BullBear',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'BullBear - Service Closed',
    description:
      'BullBear has ended. The live service, API activity, and trading flows are closed.',
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-950 text-white min-h-screen`}
      >
        <Header />
        {children}
      </body>
    </html>
  );
}
