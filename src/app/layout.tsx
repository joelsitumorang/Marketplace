import type { Metadata } from "next";
import { Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import "./globals.css";

const inter = Inter({ 
  subsets: ['latin'], 
  display: 'swap',
  variable: '--font-sans' 
});

export const metadata: Metadata = {
  title: "PT MBG - Katalog Barang Lelang & Bekas",
  description:
    "Platform katalog online barang bekas dan lelang PT MBG. Lihat koleksi barang berkualitas dari berbagai cabang — beli langsung di toko terdekat.",
  keywords: [
    "barang bekas",
    "lelang",
    "pawnshop",
    "gadai",
    "PT MBG",
    "katalog online",
    "barang preloved",
  ],
  openGraph: {
    title: "PT MBG - Katalog Barang Lelang & Bekas",
    description:
      "Temukan barang bekas berkualitas dengan harga terjangkau. Lihat online, beli di toko.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={inter.variable}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (typeof window !== 'undefined' && !window.fetch.__patched) {
                  const originalFetch = window.fetch;
                  window.fetch = function(input, init) {
                    if (typeof input === 'string' && input.startsWith('/api/')) {
                      input = '/lelang' + input;
                    }
                    return originalFetch(input, init);
                  };
                  window.fetch.__patched = true;
                }
              })();
            `
          }}
        />
      </head>
      <body className="flex flex-col min-h-screen">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
