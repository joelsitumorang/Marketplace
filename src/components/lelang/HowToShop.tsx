import { Eye, MessageCircle, Store, ChevronDown } from "lucide-react";

export default function HowToShop() {
  return (
    <details className="group bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden text-slate-800 transition-all">
      <summary className="flex items-center justify-between px-4 py-3 cursor-pointer select-none text-xs sm:text-sm font-semibold text-slate-700 hover:text-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 min-h-[44px]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-brand-500" aria-hidden="true" />
          <span>Cara belanja</span>
          <span className="text-slate-400 font-normal hidden sm:inline">— Cek, Pilih, Bawa Pulang</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-400 group-hover:text-slate-600 transition-colors">
          <span className="text-[11px] font-normal group-open:hidden">Lihat panduan</span>
          <ChevronDown className="w-4 h-4 transition-transform duration-200 group-open:rotate-180" aria-hidden="true" />
        </div>
      </summary>

      <div className="px-4 pb-4 pt-1 border-t border-slate-100 bg-slate-50/50">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
          {/* Langkah 1: Cek */}
          <div className="flex items-start gap-3 p-3 bg-white rounded-xl border border-slate-200/70">
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0" aria-hidden="true">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">1</span>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900">Cek</h4>
              </div>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Lihat foto, kondisi, dan harga barang di katalog.
              </p>
            </div>
          </div>

          {/* Langkah 2: Pilih */}
          <div className="flex items-start gap-3 p-3 bg-white rounded-xl border border-slate-200/70">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0" aria-hidden="true">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">2</span>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900">Pilih</h4>
              </div>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Chat admin cabang via WhatsApp untuk tanya ketersediaan dan booking.
              </p>
            </div>
          </div>

          {/* Langkah 3: Bawa Pulang */}
          <div className="flex items-start gap-3 p-3 bg-white rounded-xl border border-slate-200/70">
            <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0" aria-hidden="true">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">3</span>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900">Bawa Pulang</h4>
              </div>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Bayar dan ambil barang di cabang.
              </p>
            </div>
          </div>
        </div>
      </div>
    </details>
  );
}
