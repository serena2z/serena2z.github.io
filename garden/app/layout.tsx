import type { Metadata } from 'next';
import './landscape.css';
export const metadata: Metadata = {
  title: 'Serena — A place to wander',
  description:
    'Walk through a landscape inspired by Chinese period dramas. Cross the bridge, explore the estate, and discover Serena’s work, writing, research, creative work, and inspirations inside its rooms.',
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link
          rel="preload"
          as="image"
          crossOrigin="anonymous"
          type="image/webp"
          href="/materials/grass/color.webp"
        />
        <link
          rel="preload"
          as="image"
          crossOrigin="anonymous"
          type="image/webp"
          href="/materials/palace/painted-frieze.webp"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
