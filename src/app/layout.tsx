import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/Navbar';
import { StoreInitializer } from '@/components/StoreInitializer';
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Workflow Builder',
  description: 'Drag and drop workflow automation',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <StoreInitializer />
        <Toaster position="top-right" richColors />
        <div className="flex min-h-screen bg-slate-50 text-slate-900">
          <Navbar />
          <main className="flex-1 overflow-auto">
             {children}
          </main>
        </div>
      </body>
    </html>
  );
}
