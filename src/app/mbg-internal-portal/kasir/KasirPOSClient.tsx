"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  ScanBarcode,
  UserCircle,
  CheckCircle,
  AlertCircle,
  Trash2,
  ShoppingCart,
  Tag,
  X,
  Minus,
  MapPin,
} from "lucide-react";
import Image from "next/image";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import ConfirmDialog from "@/components/ConfirmDialog";

// ─── Types ────────────────────────────────────────────────────────────────────

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
  hasWarranty: boolean;
};

type LastTx = {
  items: CartItem[];
  cashierName: string;
  branchName: string;
  txDate: string;
  grandTotal: number;
  totalDiscount: number;
  paymentMethod: string;
  amountCash: number;
  amountTransfer: number;
  isDP: boolean;
  dpAmount: number;
};

type Props = {
  cashierName: string;
  branchName: string;
};

// ─── localStorage Persistence ─────────────────────────────────────────────────

const CART_STORAGE_KEY = "mbg_pos_cart";

function loadCartFromStorage(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return [];
}

function saveCartToStorage(items: CartItem[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch {}
}

function clearCartStorage() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(CART_STORAGE_KEY);
  } catch {}
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function KasirPOSClient({ cashierName, branchName }: Props) {
  const formatBranchName = (name: string) => {
    if (name && name.toLowerCase().includes("pasuruan")) {
      return "Cabang Pasuruan - Sangar";
    }
    return name;
  };

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [skuInput, setSkuInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastTx, setLastTx] = useState<LastTx | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [scanCooldown, setScanCooldown] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<any>(null);
  const cooldownRef = useRef<NodeJS.Timeout | null>(null);

  // ─── Load cart from localStorage on mount ─────────────────────────────────
  useEffect(() => {
    const stored = loadCartFromStorage();
    if (stored.length > 0) {
      setCartItems(stored);
    }
  }, []);

  // ─── Persist cart to localStorage on change ───────────────────────────────
  useEffect(() => {
    saveCartToStorage(cartItems);
  }, [cartItems]);

  // ─── Focus input when ready ───────────────────────────────────────────────
  useEffect(() => {
    if (inputRef.current && !cameraActive) {
      inputRef.current.focus();
    }
  }, [cameraActive]);

  // ─── Cleanup camera on unmount ────────────────────────────────────────────
  useEffect(() => {
    return () => {
      stopCamera();
      if (cooldownRef.current) clearTimeout(cooldownRef.current);
    };
  }, []);

  // ─── Supabase Realtime Stock Sync ──────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    const channel = supabase
      .channel('realtime-stock-sync')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'auction_items' },
        (payload) => {
          console.log('Auction item stock updated:', payload.new);
          // If the item just sold, and it's in our cart, warn the cashier
          const updatedItem = payload.new as any;
          if (updatedItem.status === 'Terjual') {
            setCartItems((prev) => {
              if (prev.some(item => item.sku === updatedItem.sku)) {
                toast.error(`Peringatan: Barang ${updatedItem.sku} baru saja terjual di kasir lain!`);
                playBeep(false);
              }
              return prev;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ─── Camera Scanner ───────────────────────────────────────────────────────

  const startCamera = useCallback(async () => {
    toast.error("");
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      
      const scanner = new Html5Qrcode("pos-camera-reader");
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
        () => {}
      );
      
      setCameraActive(true);
    } catch (err: any) {
      console.error("Camera error:", err);
      toast.error("Gagal mengakses kamera. Pastikan izin kamera telah diberikan.");
    }
  }, []);

  const stopCamera = useCallback(async () => {
    try {
      if (scannerRef.current) {
        const state = scannerRef.current.getState();
        // state 2 = scanning
        if (state === 2) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
        scannerRef.current = null;
      }
    } catch (err) {
      console.error("Stop camera error:", err);
    }
    setCameraActive(false);
  }, []);

  const handleDecodedScan = useCallback((sku: string) => {
    if (scanCooldown || isProcessing) return;
    
    setScanCooldown(true);
    cooldownRef.current = setTimeout(() => setScanCooldown(false), 1500);
    
    lookupAndAddToCart(sku.trim());
  }, [scanCooldown, isProcessing]);

  // ─── SKU Lookup ───────────────────────────────────────────────────────────

  const lookupAndAddToCart = async (sku: string) => {
    if (!sku || isProcessing) return;
    setIsProcessing(true);
    
    // Check if already in cart
    if (cartItems.some((item) => item.sku === sku)) {
      toast.error(`Barang ${sku} sudah ada di keranjang.`);
      playBeep(false);
      setTimeout(() => setIsProcessing(false), 1500);
      return;
    }

    setLoading(true);
    toast.error("");
    toast.success("");

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
          hasWarranty: !!data.data.hasWarranty,
        };
        setCartItems((prev) => [...prev, newItem]);
        playBeep(true);
        toast.success(`✓ ${newItem.title} ditambahkan ke keranjang`);
        setTimeout(() => toast.success(""), 3000);
      } else {
        toast.error(data.message || "Barang tidak ditemukan.");
        playBeep(false);
      }
    } catch (err) {
      toast.error("Kesalahan jaringan saat mencari barang.");
      playBeep(false);
    } finally {
      setLoading(false);
      setSkuInput("");
      if (inputRef.current) inputRef.current.focus();
      
      // Force a minimum 1.5-second cooldown delay before resetting the lock
      setTimeout(() => setIsProcessing(false), 1500);
    }
  };

  const handleManualScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!skuInput.trim() || isProcessing) return;
    lookupAndAddToCart(skuInput.trim());
  };

  // ─── Cart Handlers ────────────────────────────────────────────────────────

  const removeFromCart = (sku: string) => {
    setCartItems((prev) => prev.filter((item) => item.sku !== sku));
  };

  const clearCart = () => {
    setCartItems([]);
    clearCartStorage();
  };

  const formatCurrency = (value: string): string => {
    const digits = value.replace(/\D/g, "");
    if (!digits) return "";
    return new Intl.NumberFormat("id-ID").format(Number(digits));
  };

  const handleDiscountChange = (sku: string, rawValue: string) => {
    const digits = rawValue.replace(/\D/g, "");
    const numericDiscount = Number(digits) || 0;
    const formatted = formatCurrency(rawValue);

    setCartItems((prev) =>
      prev.map((item) => {
        if (item.sku !== sku) return item;
        const cappedDiscount = Math.min(numericDiscount, item.price);
        return {
          ...item,
          discount: cappedDiscount,
          discountDisplay: formatted,
        };
      })
    );
  };

  // ─── Calculations ─────────────────────────────────────────────────────────

  const subtotal = cartItems.reduce((sum, item) => sum + item.price, 0);
  const totalDiscount = cartItems.reduce((sum, item) => sum + item.discount, 0);
  const grandTotal = subtotal - totalDiscount;

  // ─── Checkout ─────────────────────────────────────────────────────────────

  const [showConfirmCheckout, setShowConfirmCheckout] = useState(false);

  const handleCheckout = () => {
    if (cartItems.length === 0) return;

    // --- Validasi ---
    const targetAmount = isDP ? (Number(dpAmount) || 0) : grandTotal;

    if (paymentMethod === "SPLIT") {
      const splitTotal = (Number(splitCash) || 0) + (Number(splitTransfer) || 0);
      if (splitTotal !== targetAmount) {
        toast.error(`Total Split (Rp ${splitTotal.toLocaleString('id-ID')}) tidak sama dengan yang harus dibayar (Rp ${targetAmount.toLocaleString('id-ID')}).`);
        return;
      }
    }

    if (isDP) {
      if (targetAmount <= 0 || targetAmount >= grandTotal) {
        toast.error("Nominal DP harus lebih dari 0 dan kurang dari total tagihan.");
        return;
      }
    }

    setShowConfirmCheckout(true);
  };

  const submitCheckout = async () => {
    setShowConfirmCheckout(false);
    setLoading(true);

    try {
      let finalCash = 0;
      let finalTransfer = 0;
      const targetAmount = isDP ? (Number(dpAmount) || 0) : grandTotal;

      if (paymentMethod === "SPLIT") {
        finalCash = Number(splitCash) || 0;
        finalTransfer = Number(splitTransfer) || 0;
      } else if (paymentMethod === "TUNAI") {
        finalCash = targetAmount;
      } else if (paymentMethod === "TRANSFER") {
        finalTransfer = targetAmount;
      }

      const payload = {
        paymentMethod,
        amountCash: finalCash,
        amountTransfer: finalTransfer,
        isDP,
        dpAmount: targetAmount,
        items: cartItems.map((item) => ({
          itemId: item.id,
          sku: item.sku,
          soldPrice: item.price - item.discount,
          branchName: item.branchName,
          cashierName,
        })),
      };

      const res = await fetch("/api/kasir/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        const txDate = new Date().toLocaleString("id-ID", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });

        setLastTx({
          items: [...cartItems],
          cashierName,
          branchName,
          txDate,
          grandTotal,
          totalDiscount,
          paymentMethod,
          amountCash: finalCash,
          amountTransfer: finalTransfer,
          isDP,
          dpAmount: targetAmount,
        });

        toast.success(`Transaksi Berhasil! ${cartItems.length} barang telah terjual.`);
        setCartItems([]);
        setIsDP(false);
        setDpAmount("");
        setSplitCash("");
        setSplitTransfer("");
        clearCartStorage();

        setTimeout(() => {
          window.print();
        }, 500);
      } else {
        toast.error(data.message || "Gagal memproses transaksi.");
      }
    } catch (err) {
      toast.error("Kesalahan jaringan saat proses transaksi.");
    } finally {
      setLoading(false);
    }
  };

  // ─── Audio Beep ───────────────────────────────────────────────────────────

  const playBeep = (isSuccess: boolean) => {
    try {
      const AudioContextClass =
        window.AudioContext || (window as any).webkitAudioContext;
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

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <div className="max-w-7xl mx-auto space-y-6 pb-12 print:hidden">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <ScanBarcode className="w-8 h-8 text-brand-600" /> Modul POS Kasir
          </h1>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* ═══ LEFT COLUMN: Scanner & Profile ═══ */}
          <div className="lg:col-span-1 space-y-5">
            {/* Cashier Profile Lock */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand-50 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
              <div className="flex items-center gap-3 relative z-10">
                <div className="w-11 h-11 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0 border-2 border-brand-200">
                  <UserCircle className="w-6 h-6 text-brand-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-0.5">
                    Petugas Kasir
                  </p>
                  <p className="font-bold text-slate-900 text-sm truncate">
                    {cashierName}
                  </p>
                  <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3" />
                    {formatBranchName(branchName)}
                  </p>
                </div>
              </div>
            </div>

            {/* Manual SKU Fallback System */}
            <div className="bg-white rounded-2xl border border-gray-150 p-4 shadow-sm">
              <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                Input Manual SKU
              </label>
              <form onSubmit={handleManualScan} className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={skuInput}
                  onChange={(e) => setSkuInput(e.target.value)}
                  disabled={loading}
                  placeholder="Ketik SKU lalu Enter..."
                  className="flex-1 bg-white border-2 border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 text-sm font-mono tracking-widest focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all shadow-sm disabled:opacity-50"
                  autoComplete="off"
                />
                <button
                  type="submit"
                  disabled={loading || !skuInput.trim()}
                  className="px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-40 shadow-sm"
                >
                  +
                </button>
              </form>
            </div>
          </div>

          {/* ═══ RIGHT COLUMN: Cart & Checkout ═══ */}
          <div className="lg:col-span-2">
            {cartItems.length > 0 ? (
              <div className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-md flex flex-col">
                {/* Cart Header */}
                <div className="p-5 bg-brand-50 border-b border-brand-100 flex justify-between items-center">
                  <h2 className="text-lg font-bold text-brand-700 flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5" />
                    Keranjang ({cartItems.length} barang)
                  </h2>
                  <button
                    onClick={clearCart}
                    className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50 font-semibold border border-transparent hover:border-red-200"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Kosongkan
                  </button>
                </div>

                {/* Cart Items */}
                <div className="divide-y divide-slate-100 max-h-[460px] overflow-y-auto">
                  {cartItems.map((item, idx) => (
                    <div
                      key={item.sku}
                      className="p-4 flex gap-4 items-start hover:bg-slate-50/50 transition-colors animate-in fade-in slide-in-from-right-2"
                    >
                      {/* Thumbnail */}
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex-shrink-0 relative">
                        {item.images[0] ? (
                          <Image
                            src={item.images[0]}
                            alt={item.title}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400 text-[8px] font-medium">
                            N/A
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-mono text-brand-600 font-bold tracking-wider">
                              {item.sku}
                            </p>
                            <h4 className="text-sm font-bold text-slate-900 truncate mt-0.5">
                              {item.title}
                            </h4>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              {item.category} • {item.kondisi === "Baru" ? "✨ Baru" : "♻️ Bekas"}
                            </p>
                          </div>
                          <button
                            onClick={() => removeFromCart(item.sku)}
                            className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded-lg hover:bg-red-50 flex-shrink-0"
                            title="Hapus dari keranjang"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Price & Discount Row */}
                        <div className="flex items-center gap-3 mt-2.5">
                          <div className="text-sm font-bold text-slate-900">
                            {formatIDR(item.price)}
                          </div>

                          {/* Discount Input */}
                          <div className="flex items-center gap-1.5">
                            <Minus className="w-3 h-3 text-orange-500 flex-shrink-0" />
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-orange-500 font-bold">
                                Rp
                              </span>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={item.discountDisplay}
                                onChange={(e) =>
                                  handleDiscountChange(item.sku, e.target.value)
                                }
                                placeholder="0"
                                className="w-28 bg-orange-50 border border-orange-200 rounded-lg pl-7 pr-2 py-1.5 text-xs font-mono text-orange-800 focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-300/30 transition-all placeholder:text-orange-300"
                              />
                            </div>
                          </div>

                          {/* Final Price */}
                          {item.discount > 0 && (
                            <div className="text-sm font-black text-green-600 ml-auto">
                              = {formatIDR(item.price - item.discount)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Totals & Checkout */}
                <div className="border-t border-slate-200 bg-slate-50 p-5 space-y-3">
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>Subtotal ({cartItems.length} barang)</span>
                    <span className="font-semibold">{formatIDR(subtotal)}</span>
                  </div>
                  {totalDiscount > 0 && (
                    <div className="flex justify-between text-sm text-orange-600">
                      <span className="flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5" /> Total Diskon
                      </span>
                      <span className="font-semibold">- {formatIDR(totalDiscount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xl pt-2 border-t border-slate-200">
                    <span className="font-bold text-slate-700">Grand Total</span>
                    <span className="font-black text-slate-900">
                      {formatIDR(grandTotal)}
                    </span>
                  </div>

                  {/* Payment Method Selection */}
                  <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm mt-3">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Metode Pembayaran</p>
                    <div className="grid grid-cols-3 gap-2">
                      {(["TUNAI", "TRANSFER", "SPLIT"] as const).map((m) => (
                        <button
                          key={m}
                          onClick={() => setPaymentMethod(m)}
                          className={`py-2 px-1 text-xs font-bold rounded-lg border transition-colors ${
                            paymentMethod === m
                              ? "bg-brand-50 border-brand-500 text-brand-700"
                              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>

                    {paymentMethod === "SPLIT" && (
                      <div className="grid grid-cols-2 gap-3 mt-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500">Tunai (Rp)</label>
                          <input
                            type="text"
                            placeholder="0"
                            value={splitCash}
                            onChange={(e) => setSplitCash(e.target.value.replace(/\D/g, ""))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-brand-500"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500">Transfer (Rp)</label>
                          <input
                            type="text"
                            placeholder="0"
                            value={splitTransfer}
                            onChange={(e) => setSplitTransfer(e.target.value.replace(/\D/g, ""))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-brand-500"
                          />
                        </div>
                        <div className="col-span-2 text-[10px] font-bold text-slate-500 text-right">
                          Total Split: <span className="text-slate-800">{formatIDR((Number(splitCash) || 0) + (Number(splitTransfer) || 0))}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* DP Toggle */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3 mt-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-slate-700">Bayar Sebagian (DP)</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Tempo maks 3 Hari</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={isDP} onChange={() => setIsDP(!isDP)} />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-brand-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-500"></div>
                      </label>
                    </div>
                    {isDP && (
                      <div className="pt-2 border-t border-slate-100">
                        <label className="text-[10px] font-bold text-slate-500">Nominal Dibayarkan (Rp)</label>
                        <input
                          type="text"
                          placeholder="0"
                          value={dpAmount}
                          onChange={(e) => setDpAmount(e.target.value.replace(/\D/g, ""))}
                          className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold focus:outline-none focus:border-brand-500"
                        />
                      </div>
                    )}
                  </div>


                  <button
                    onClick={handleCheckout}
                    disabled={loading || cartItems.length === 0}
                    className="w-full mt-2 py-3.5 rounded-xl bg-status-tersedia hover:bg-status-tersedia/90 text-white text-base font-semibold uppercase tracking-widest shadow-lg shadow-green-500/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                  >
                    {loading ? (
                      "Memproses Data..."
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        Selesaikan & Cetak Struk
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              /* Empty Cart State */
              <div className="h-full min-h-[520px] bg-white rounded-2xl border-2 border-slate-200 border-dashed shadow-md flex flex-col items-center justify-center text-center p-8">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-slate-100 rounded-full blur-xl animate-pulse" />
                  <ShoppingCart className="w-20 h-20 text-slate-300 relative z-10" />
                </div>
                <h3 className="text-2xl font-semibold text-slate-800 mb-2 tracking-tight">
                  Keranjang Kosong
                </h3>
                <p className="text-slate-500 max-w-sm leading-relaxed text-sm">
                  Arahkan kamera ke barcode barang atau ketik SKU manual untuk menambahkan barang ke keranjang.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ THERMAL PRINTER RECEIPT — Multi-Item ═══ */}
      {lastTx && (
        <div className="hidden print:block text-black bg-white w-full max-w-[80mm] mx-auto p-4 text-sm font-mono absolute top-0 left-0">
          <div className="text-center mb-4">
            <h1 className="font-black text-2xl tracking-tight">PT MBG</h1>
            <p className="font-bold text-xs">{formatBranchName(lastTx.branchName)}</p>
            <p className="text-[10px] mt-1">Katalog Lelang &amp; Bekas</p>
          </div>

          <div className="border-t-2 border-black border-dashed py-2 mb-2 text-[10px] space-y-1">
            <div className="flex justify-between">
              <span>Tgl:</span>
              <span>{lastTx.txDate}</span>
            </div>
            <div className="flex justify-between">
              <span>Kasir:</span>
              <span>{lastTx.cashierName}</span>
            </div>
            <div className="flex justify-between">
              <span>Metode:</span>
              <span className="font-bold">{lastTx.paymentMethod} {lastTx.isDP ? "(DP)" : ""}</span>
            </div>
          </div>

          <div className="border-t-2 border-black border-dashed py-3 mb-2 space-y-3">
            {lastTx.items.map((item, idx) => (
              <div key={item.sku} className="text-[10px]">
                <div className="font-bold">{item.title}</div>
                <div className="flex justify-between">
                  <span>SKU: {item.sku}</span>
                  <span>{formatIDR(item.price)}</span>
                </div>
                {item.discount > 0 && (
                  <div className="flex justify-between text-[9px]">
                    <span>Diskon:</span>
                    <span>- {formatIDR(item.discount)}</span>
                  </div>
                )}
                {item.hasWarranty && (
                  <div className="font-bold text-[9px] text-black mt-0.5">
                    [ 🛡️ GARANSI RESMI MBG ]
                  </div>
                )}
              </div>
            ))}
          </div>

          {lastTx.totalDiscount > 0 && (
            <div className="border-t border-black/20 py-1 text-[10px]">
              <div className="flex justify-between">
                <span>Total Diskon:</span>
                <span>- {formatIDR(lastTx.totalDiscount)}</span>
              </div>
            </div>
          )}

          <div className="flex justify-between font-bold text-lg mt-2 pt-2 border-t-2 border-black border-dashed">
            <span>TOTAL</span>
            <span>{formatIDR(lastTx.grandTotal)}</span>
          </div>

          {lastTx.isDP && (
            <div className="pt-2 mt-2 border-t border-black/20 text-[10px] space-y-1">
              <div className="flex justify-between font-bold">
                <span>DIBAYAR (DP):</span>
                <span>{formatIDR(lastTx.dpAmount)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>KEKURANGAN:</span>
                <span>{formatIDR(lastTx.grandTotal - lastTx.dpAmount)}</span>
              </div>
              <div className="text-center mt-2 font-bold italic">
                *Jatuh tempo pelunasan maksimal 3 Hari
              </div>
            </div>
          )}

          {!lastTx.isDP && lastTx.paymentMethod === "SPLIT" && (
            <div className="pt-2 mt-2 border-t border-black/20 text-[10px] space-y-1">
              <div className="flex justify-between">
                <span>Tunai:</span>
                <span>{formatIDR(lastTx.amountCash)}</span>
              </div>
              <div className="flex justify-between">
                <span>Transfer:</span>
                <span>{formatIDR(lastTx.amountTransfer)}</span>
              </div>
            </div>
          )}

          <div className="border-t-2 border-black border-dashed pt-4 mt-3 text-center text-[10px]">
            <p className="font-bold mb-1">TERIMA KASIH</p>
            <p>Barang yang sudah dibeli tidak dapat ditukar atau dikembalikan.</p>
            <p className="mt-4 opacity-50">Powered by MBG System</p>
          </div>

          <style
            dangerouslySetInnerHTML={{
              __html: `
            @media print {
              body * { visibility: hidden; }
              body { background-color: white !important; margin: 0; padding: 0; }
              .print\\:hidden { display: none !important; }
              .print\\:block { visibility: visible; display: block !important; position: absolute; left: 0; top: 0; width: 100%; }
              .print\\:block * { visibility: visible; }
              @page { size: 80mm auto; margin: 0; }
            }
          `,
            }}
          />
        </div>
      )}

      <ConfirmDialog
        isOpen={showConfirmCheckout}
        title="Konfirmasi Pembayaran"
        message="Apakah Anda yakin ingin memproses pembayaran dan menyelesaikan transaksi ini? Pastikan semua barang sudah sesuai."
        onConfirm={submitCheckout}
        onCancel={() => setShowConfirmCheckout(false)}
        confirmText="Ya, Proses Transaksi"
      />
    </>
  );
}
