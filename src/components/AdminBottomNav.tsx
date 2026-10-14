"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, ScanLine, PackageSearch, BarChart3, ScanBarcode, X, Loader2, AlertCircle } from "lucide-react";

type CartItem = {
  id: number;
  sku: string;
  title: string;
  branchName: string;
  category: string;
  kondisi: string;
  price: number;
  discount: number;
  discountDisplay: string;
  images: string[];
};

const CART_STORAGE_KEY = "mbg_pos_cart";

export default function AdminBottomNav({ badgeSlot }: { badgeSlot?: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [scanCooldown, setScanCooldown] = useState(false);
  const scannerRef = useRef<any>(null);
  const cooldownRef = useRef<NodeJS.Timeout | null>(null);

  const tabs = [
    { name: "Dashboard", href: "/mbg-internal-portal", icon: LayoutDashboard },
    { name: "Semua Barang", href: "/mbg-internal-portal/items", icon: PackageSearch },
    { name: "Scan POS", isFab: true },
    { name: "POS Kasir", href: "/mbg-internal-portal/kasir", icon: ScanLine },
    { name: "Laporan", href: "/mbg-internal-portal/reports", icon: BarChart3 },
  ];

  const startCamera = useCallback(async () => {
    setError("");
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      
      const scanner = new Html5Qrcode("global-quick-scan");
      scannerRef.current = scanner;
      
      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 280, height: 120 },
          aspectRatio: 1.5,
        },
        (decodedText: string) => {
          handleDecodedScan(decodedText);
        },
        () => {} // ignore normal scan failures
      );
    } catch (err: any) {
      console.error("Camera error:", err);
      setError("Gagal mengakses kamera. Pastikan izin telah diberikan.");
    }
  }, []);

  const stopCamera = useCallback(async () => {
    try {
      if (scannerRef.current) {
        const state = scannerRef.current.getState();
        if (state === 2) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
        scannerRef.current = null;
      }
    } catch (err) {
      console.error("Stop camera error:", err);
    }
  }, []);

  const handleDecodedScan = useCallback((sku: string) => {
    if (scanCooldown || loading) return;
    setScanCooldown(true);
    cooldownRef.current = setTimeout(() => setScanCooldown(false), 2000);
    lookupAndAddToCart(sku.trim());
  }, [scanCooldown, loading]);

  const playBeep = (isSuccess: boolean) => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      if (isSuccess) {
        osc.type = "sine";
        osc.frequency.setValueAtTime(1000, ctx.currentTime);
        gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      } else {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      }
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {
      console.error("Audio beep not supported", e);
    }
  };

  const lookupAndAddToCart = async (sku: string) => {
    if (!sku) return;
    
    // Read current cart
    let currentCart: CartItem[] = [];
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (stored) currentCart = JSON.parse(stored);
    } catch {}

    // Check if already in cart
    if (currentCart.some((item) => item.sku === sku)) {
      setError(`Barang ${sku} sudah ada di keranjang POS.`);
      playBeep(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/kasir/scan?sku=${encodeURIComponent(sku)}`);
      const data = await res.json();

      if (res.ok && data.success) {
        const newItem: CartItem = {
          id: data.data.id,
          sku: data.data.sku,
          title: data.data.title,
          branchName: data.data.branchName,
          category: data.data.category,
          kondisi: data.data.kondisi,
          price: Number(data.data.price),
          discount: 0,
          discountDisplay: "",
          images: data.data.images || [],
        };
        
        currentCart.push(newItem);
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(currentCart));
        
        playBeep(true);
        
        // Close modal and redirect
        stopCamera();
        setIsScannerOpen(false);
        router.push("/mbg-internal-portal/kasir");
        
      } else {
        setError(data.message || "Barang tidak ditemukan.");
        playBeep(false);
      }
    } catch (err) {
      setError("Kesalahan jaringan saat mencari barang.");
      playBeep(false);
    } finally {
      setLoading(false);
    }
  };

  // Cleanup on unmount or modal close
  useEffect(() => {
    if (isScannerOpen) {
      startCamera();
    } else {
      stopCamera();
      setError("");
    }
    
    return () => {
      stopCamera();
      if (cooldownRef.current) clearTimeout(cooldownRef.current);
    };
  }, [isScannerOpen, startCamera, stopCamera]);

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 grid grid-cols-5 h-16 md:hidden px-1 shadow-[0_-4px_10px_-4px_rgba(0,0,0,0.05)] print:!hidden">
        {tabs.map((tab, index) => {
          if (tab.isFab) {
            return (
              <div key={index} className="relative w-full h-full flex flex-col items-center justify-center">
                <button
                  onClick={() => setIsScannerOpen(true)}
                  className="absolute -top-4 w-14 h-14 bg-blue-600 hover:bg-blue-500 active:scale-95 transition-all text-white rounded-full flex flex-col items-center justify-center shadow-[0_8px_16px_rgba(37,99,235,0.4)] border-4 border-white"
                >
                  <ScanBarcode className="w-6 h-6" />
                </button>
              </div>
            );
          }

          if (!tab.href) return null;

          let isActive = false;
          if (tab.href === "/mbg-internal-portal" || tab.href === "/mbg-internal-portal/items") {
            isActive = pathname === tab.href;
          } else {
            isActive = pathname.startsWith(tab.href);
          }

          const Icon = tab.icon as any;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              prefetch={true}
              className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
                isActive ? "text-brand-600" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? "text-brand-600" : ""}`} />
                {tab.href === "/mbg-internal-portal" && badgeSlot && (
                  <div className="absolute -top-1.5 -right-2 scale-75 origin-top-right">
                    {badgeSlot}
                  </div>
                )}
              </div>
              <span className={`text-[9px] sm:text-[10px] font-bold ${isActive ? "text-brand-600" : ""}`}>
                {tab.name}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Global Scanner Overlay Modal */}
      {isScannerOpen && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col animate-in fade-in zoom-in-95 duration-200 md:hidden">
          {/* Header */}
          <div className="h-16 flex items-center justify-between px-4 bg-slate-900 text-white flex-shrink-0">
            <div className="flex items-center gap-2">
              <ScanBarcode className="w-5 h-5 text-blue-400" />
              <h3 className="font-bold">Quick Scan ke POS</h3>
            </div>
            <button
              onClick={() => setIsScannerOpen(false)}
              className="p-2 rounded-full hover:bg-slate-800 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Scanner Viewport */}
          <div className="flex-1 relative bg-black flex flex-col items-center justify-center overflow-hidden">
            {loading && (
              <div className="absolute inset-0 z-10 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                <p className="text-white font-semibold text-sm">Menambahkan ke keranjang...</p>
              </div>
            )}
            
            <div id="global-quick-scan" className="w-full h-full" />
            
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-[5]">
              <div className="w-64 h-32 border-2 border-blue-500 rounded-xl relative opacity-80">
                <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-blue-500 rounded-tl-xl" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-blue-500 rounded-tr-xl" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-blue-500 rounded-bl-xl" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-blue-500 rounded-br-xl" />
                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-blue-500/50 shadow-[0_0_8px_rgba(59,130,246,0.8)] animate-[scan_2s_ease-in-out_infinite]" />
              </div>
            </div>

            {error && (
              <div className="absolute bottom-8 left-4 right-4 z-20 bg-red-600/90 backdrop-blur-sm text-white rounded-xl p-4 flex items-start gap-3 shadow-xl animate-in slide-in-from-bottom-5">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-bold leading-tight">{error}</p>
                </div>
                <button onClick={() => setError("")}><X className="w-4 h-4 opacity-70" /></button>
              </div>
            )}
          </div>
          
          <style dangerouslySetInnerHTML={{
            __html: `
            @keyframes scan {
              0% { top: 0; opacity: 0; }
              10% { opacity: 1; }
              90% { opacity: 1; }
              100% { top: 100%; opacity: 0; }
            }
          `}} />
        </div>
      )}
    </>
  );
}
