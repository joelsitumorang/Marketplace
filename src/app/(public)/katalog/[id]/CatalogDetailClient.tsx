"use client";

import { useState, useMemo } from "react";
import ImageSlider from "./ImageSlider";
import Link from "next/link";
import BackButton from "@/components/BackButton";
import { Share2 } from "lucide-react";
import { toast } from "sonner";

type VariantItem = {
  id: number;
  sku: string;
  branchName: string;
  title: string;
  category: string;
  description: string;
  defects: string | null;
  kondisi: string;
  price: number;
  status: string;
  images: string[];
  whatsappNumber: string;
  youtubeUrl: string | null;
  variantImageUrl: string | null;
};

type Props = {
  initialItem: VariantItem;
  variants: VariantItem[];
};

export default function CatalogDetailClient({ initialItem, variants }: Props) {
  const [selectedItem, setSelectedItem] = useState<VariantItem>(initialItem);

  const formatIDR = (val: any) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(Number(val));
  };

  const isUnavailable = selectedItem.status === "Terjual";

  const waMessage = `Halo Admin ${
    selectedItem.branchName
  }, saya tertarik dengan barang ini:%0A%0A*${
    selectedItem.title
  }*%0ASKU: ${selectedItem.sku}%0AHarga: ${formatIDR(
    selectedItem.price
  )}%0A%0AApakah masih bisa dilihat?`;
  const waLink = `https://wa.me/${selectedItem.whatsappNumber}?text=${waMessage}`;

  // If a child variant is selected and has its own image, strictly use that. Otherwise, fall back to the default catalog images list.
  const activeImages = useMemo(() => {
    if (selectedItem.variantImageUrl) {
      return [selectedItem.variantImageUrl];
    }
    return selectedItem.images.length > 0 ? selectedItem.images : [];
  }, [selectedItem]);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: selectedItem.title,
          text: `Cek barang ini di MBG: ${selectedItem.title}`,
          url: window.location.href,
        });
      } catch (e) {
        console.error("Share failed", e);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link berhasil disalin!");
    }
  };

  return (
    <div className="pb-28 sm:pb-12 bg-slate-50 min-h-screen">
      {/* Mobile-friendly Breadcrumbs */}
      <div className="px-4 py-4 max-w-5xl mx-auto flex items-center gap-2 text-[11px] font-medium text-slate-500 overflow-x-auto scrollbar-hide whitespace-nowrap">
        <Link href="/" prefetch={true} className="hover:text-brand-600 uppercase tracking-wider">Katalog</Link>
        <span className="opacity-40">/</span>
        <Link href={`/?category=${selectedItem.category}`}>
          <span className="hover:text-brand-600 uppercase tracking-wider">{selectedItem.category}</span>
        </Link>
        <span className="opacity-40">/</span>
        <span className="text-slate-700 truncate">{selectedItem.title}</span>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
        <BackButton />
        <button onClick={handleShare} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-sm font-bold text-slate-700 hover:text-brand-600 hover:border-brand-300 shadow-sm transition-all">
          <Share2 className="w-4 h-4" /> Share
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-0 sm:px-6 lg:px-8 mt-4">
        <div className="grid md:grid-cols-2 gap-0 sm:gap-8 lg:gap-12">
          {/* Image Slider Component */}
          <div className="w-full">
            <ImageSlider
              images={activeImages}
              isUnavailable={isUnavailable}
              status={selectedItem.status}
              youtubeUrl={selectedItem.youtubeUrl}
              key={selectedItem.id} // force re-mount/re-init carousel on variant change
            />
          </div>

          {/* Details */}
          <div className="px-5 sm:px-0 py-6 sm:py-2">
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-3">
                <span className={`px-2 py-1 text-[10px] uppercase font-black tracking-widest rounded border ${
                    selectedItem.kondisi === "Baru" ? "border-green-500/50 text-green-500 bg-green-500/10" :
                    "border-slate-500/50 text-slate-400 bg-slate-500/10"
                }`}>
                  {selectedItem.kondisi}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">SKU: {selectedItem.sku}</span>
              </div>
              
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2 leading-snug">
                {selectedItem.title}
              </h1>
              
              <div className="text-3xl font-black text-brand-700 mt-4 mb-2">
                {formatIDR(selectedItem.price)}
              </div>
            </div>

            {/* Selection Chips / Radios for Grouped Variants */}
            {variants.length > 1 && (
              <div className="mb-6 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-slate-500 block text-[11px] uppercase tracking-wider font-bold mb-2.5">
                  Pilihan Varian Barang
                </span>
                <div className="flex flex-wrap gap-2">
                  {variants.map((v) => {
                    const isActive = selectedItem.id === v.id;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setSelectedItem(v)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-2 ${
                          isActive
                            ? "bg-brand-600 border-brand-600 text-white shadow-md shadow-brand-500/20"
                            : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        {v.variantImageUrl && (
                          <img
                            src={v.variantImageUrl}
                            alt={v.title}
                            className="w-5 h-5 rounded-md object-cover border border-black/10"
                          />
                        )}
                        <span>{v.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 text-sm bg-white p-4 rounded-2xl mb-8 border border-slate-200 shadow-sm">
              <div>
                <span className="text-slate-500 block text-[11px] uppercase tracking-wider font-bold mb-1">Kategori</span>
                <Link href={`/?category=${selectedItem.category}`}>
                  <span className="font-semibold text-slate-900 hover:text-brand-600 transition-colors">{selectedItem.category}</span>
                </Link>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px] uppercase tracking-wider font-bold mb-1">Lokasi</span>
                <span className="font-semibold text-slate-900">{selectedItem.branchName.replace("MBG Cabang ", "")}</span>
              </div>
            </div>

            <div className="space-y-6 mb-8">
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Deskripsi</h3>
                <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-line">
                  {selectedItem.description}
                </p>
              </div>

              {selectedItem.defects && (
                <div>
                  <h3 className="text-sm font-bold text-rose-600 tracking-wide uppercase">MINUS / DEFECT</h3>
                  <div className="mt-1 p-3 bg-rose-50/60 rounded-xl text-slate-700 text-sm border border-rose-100/50 leading-relaxed">
                    {selectedItem.defects}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Action Button for Mobile & Desktop */}
      <div className="fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-md border-t border-slate-200 p-4 sm:p-6 z-50 transform translate-y-0 shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.1)]">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="hidden sm:block">
            <div className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-1">Tertarik?</div>
            <div className="font-bold text-slate-900">
              {isUnavailable ? 'Barang tidak tersedia' : 'Tanya ketersediaan atau cek lokasi'}
            </div>
          </div>
          
          <div className="flex flex-row gap-3 w-full sm:w-auto flex-1 sm:flex-initial">
            <a
              href={isUnavailable ? '#' : waLink}
              target={isUnavailable ? '_self' : '_blank'}
              rel="noopener noreferrer"
              className={`flex-1 justify-center items-center gap-2 px-5 py-3.5 rounded-xl font-bold transition-all text-sm flex ${
                isUnavailable 
                ? "bg-slate-100 text-slate-400 cursor-not-allowed pointer-events-none" 
                : "bg-[#25D366] hover:bg-[#20bd5a] text-white shadow-md shadow-[#25D366]/20 hover:scale-[1.01]"
              }`}
            >
              {!isUnavailable && (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
                </svg>
              )}
              {isUnavailable ? `Terjual` : 'Beli Sekarang'}
            </a>
            
            <a
              href="https://maps.app.goo.gl/fnR6mUaLTjGJCTrj7"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 justify-center items-center gap-2 px-5 py-3.5 rounded-xl font-bold transition-all text-sm border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 active:bg-slate-100 shadow-sm flex hover:scale-[1.01]"
            >
              <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Ke Lokasi
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
