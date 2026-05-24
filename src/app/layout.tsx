import './globals.css';
import type { Metadata } from 'next';
import { Space_Grotesk } from 'next/font/google';
import { Inter } from 'next/font/google';
import { cn } from "@/lib/utils"; // Assuming you have this utility

// Optimized font loading with fallbacks and preload
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

// Load Space Grotesk font with fallbacks
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-space-grotesk',
  weight: ['300', '400', '500', '600', '700'],
  fallback: ['Monaco', 'Consolas', 'Courier New', 'monospace'],
  preload: true,
  adjustFontFallback: true
});

export const metadata: Metadata = {
  title: 'Claudio - Deep Design for AWS Architecture',
  description: 'Design Cloud architectures faster with AI-powered tools from Claudio',
  icons: {
    icon: [
      { url: '/claudio-logo.png', sizes: '32x32', type: 'image/png' },
      { url: '/claudio-logo.png', sizes: '16x16', type: 'image/png' }
    ],
    apple: [
      { url: '/claudio-logo.png', sizes: '180x180', type: 'image/png' }
    ],
    shortcut: [
      { url: '/claudio-logo.png', type: 'image/png' }
    ]
  },
  manifest: '/manifest.json'
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`h-full ${inter.variable} ${spaceGrotesk.variable}`}>
      <head>
        {/* Preconnect to Google Fonts for faster loading */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Favicon fallback */}
        <link rel="icon" href="/claudio-logo.png" type="image/png" />
        <link rel="shortcut icon" href="/claudio-logo.png" type="image/png" />
      </head>
      <body className={cn("h-full font-sans antialiased bg-white text-black", inter.className)}>
        <main className="min-h-screen">{children}</main>
      </body>
    </html>
  );
}
