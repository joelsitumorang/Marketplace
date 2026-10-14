import type { Metadata } from "next";
import { Inter } from 'next/font/google';
import "./globals.css";

const inter = Inter({ 
  subsets: ['latin'], 
  display: 'swap',
  variable: '--font-sans' 
});

export const metadata: Metadata = {
  title: "Katalog MBG – Barang Preloved & Second | PT MBG Pasuruan",
  description:
    "Katalog barang preloved dan second pilihan dari gadai tidak tertebus PT MBG Cabang Pasuruan. Cek, pilih, bawa pulang. Chat langsung via WhatsApp.",
  keywords: [
    "barang bekas",
    "preloved",
    "second",
    "pawnshop",
    "gadai",
    "PT MBG",
    "katalog online",
    "Katalog MBG",
  ],
  openGraph: {
    title: "Katalog MBG – Barang Preloved & Second | PT MBG Pasuruan",
    description:
      "Katalog barang preloved dan second pilihan dari gadai tidak tertebus PT MBG Cabang Pasuruan. Cek, pilih, bawa pulang. Chat langsung via WhatsApp.",
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

                // Register Service Worker for PWA
                if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
                  window.addEventListener('load', function() {
                    navigator.serviceWorker.register('/lelang/sw.js').then(function(reg) {
                      console.log('SW registered successfully:', reg.scope);
                    }).catch(function(err) {
                      console.log('SW registration failed:', err);
                    });
                  });
                }
              })();
            `
          }}
        />
      </head>
      <body className="flex flex-col min-h-screen">
        {children}
      </body>
    </html>
  );
}
