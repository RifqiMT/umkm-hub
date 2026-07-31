import type { Metadata, Viewport } from 'next';
import { Manrope } from 'next/font/google';
import { UI_LANGUAGE_BOOTSTRAP_SCRIPT } from '@/lib/ui-language';
import { TranslationProvider } from '@/lib/translation';
import './globals.css';

const sans = Manrope({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'UMKM Hub',
  description: 'Profile, product, customer, and order workspace for UMKM',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0f3d2e',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: UI_LANGUAGE_BOOTSTRAP_SCRIPT }}
        />
      </head>
      <body className={`${sans.variable} antialiased`}>
        <TranslationProvider>{children}</TranslationProvider>
      </body>
    </html>
  );
}
