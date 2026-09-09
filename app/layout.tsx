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
      <body>{children}</body>
    </html>
  );
}
