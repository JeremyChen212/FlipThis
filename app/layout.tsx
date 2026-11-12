import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FlipThis',
  description: 'Flip the same sample, vote blind, then finish each other’s beats.',
};
export const viewport: Viewport = { themeColor: '#EDEBF2' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap" />
      </head>
      {/* Extensions such as Grammarly inject body attributes before hydration.
          Limit suppression to this element so app content still reports mismatches. */}
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
