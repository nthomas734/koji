import type { Metadata, Viewport } from 'next';
// Fraunces, Manrope and Geist Mono, served by koji itself: fetched from Google
// at build by scripts/fetch-fonts.mjs (gitignored output). Not a <link> to
// fonts.googleapis.com, which blocked first paint on two extra connections.
import './fonts/google.css';
import './globals.css';
import { UpdateBanner } from '@/components/UpdateBanner';
import { SWRegister } from '@/components/SWRegister';
import { ICON_180 } from './icon-data';
import { HOLD_SCRIPT } from '@/lib/hold';

export const metadata: Metadata = {
  title: 'koji',
  description: 'trip itineraries',
  // Shared by link only: keep every page out of search results.
  robots: { index: false, follow: false },
  manifest: '/manifest.json?v=3',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [{ url: ICON_180, sizes: '180x180', type: 'image/png' }],
  },
  appleWebApp: {
    capable: true,
    title: 'koji',
    statusBarStyle: 'default',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // viewport-fit=cover is what makes env(safe-area-inset-*) non-zero on iOS;
  // the glass top bar and floating tab capsule in TripView depend on it.
  viewportFit: 'cover',
  themeColor: '#F5F0E8',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: the script below sets a style on <html> before React loads
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Before the first paint: hold the space the weather pill and the
            alerts note took on this trip page last time, so the itinerary
            doesn't jump when they appear. See lib/hold.ts. */}
        <script dangerouslySetInnerHTML={{ __html: HOLD_SCRIPT }} />
      </head>
      <body>
        {/* Client-only deploy detector — renders nothing until a new Vercel
            deploy lands, so it cannot affect ISR/static rendering. Mounted in
            the root layout so both the public trip pages and /admin get it. */}
        <UpdateBanner />
        {/* Offline support — caches visited pages so installed PWAs work
            without signal (Tube, rural dead zones). See public/sw.js. */}
        <SWRegister />
        {children}
      </body>
    </html>
  );
}
