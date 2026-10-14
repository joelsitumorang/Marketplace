import Footer from "@/components/Footer";

import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Katalog MBG",
  manifest: "/lelang/manifest-lelang.webmanifest",
  themeColor: "#ea580c",
  appleWebApp: {
    capable: true,
    title: "Katalog MBG",
    statusBarStyle: "default",
  },
  icons: {
    apple: "/logo.png",
  },
};

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-slate-50 min-h-screen flex flex-col font-sans text-slate-900">
      <main className="flex-grow flex flex-col relative">
        {children}
      </main>
      <Footer />
    </div>
  );
}
