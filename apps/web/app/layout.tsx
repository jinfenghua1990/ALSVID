import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ALSVID',
  description: 'ALSVID enterprise bicycle operations platform',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
