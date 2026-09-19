"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import imageCompression from "browser-image-compression";
import { UploadCloud, CheckCircle, AlertCircle, X, Video, QrCode } from "lucide-react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";

type CompressedImage = {
  url: string;
  originalSize: number;
  compressedSize: number;
};

function AddItemForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromPhysical = searchParams.get("fromPhysical");

  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{
    isOpen: boolean;
    type: "success" | "error";
    message: string;
  }>({
    isOpen: false,
    type: "success",
    message: "",
  });
  const [compressedImages, setCompressedImages] = useState<CompressedImage[]>([]);

  const [physicalItemId, setPhysicalItemId] = useState<string | null>(null);
  const [serialNumber, setSerialNumber] = useState<string | null>(null);
  const [isFromPhysical, setIsFromPhysical] = useState(false);

  const [formData, setFormData] = useState({
    sku: "",
    title: "",
    branchName: "Cabang Pasuruan - Sangar",
    category: "Elektronik",
    price: "",
    hargaMasuk: "",
    kondisi: "Baru",
    whatsappNumber: "6281213211413",
    description: "",
    defects: "",
    youtubeUrl: "",
    hasWarranty: false,
  });

  type VariantInput = {
    title: string;
    hargaJual: string;
    hargaMasuk: string;
    imageUrl: string;
    imageName: string;
  };

  const [variants, setVariants] = useState<VariantInput[]>([]);

  const addVariantRow = () => {
    setVariants((prev) => [
      ...prev,
      { title: "", hargaJual: "", hargaMasuk: "", imageUrl: "", imageName: "" },
    ]);
  };

  const removeVariantRow = (index: number) => {
    setVariants((prev) => prev.filter((_, i) => i !== index));
  };

  const handleVariantChange = (index: number, field: keyof VariantInput, value: string) => {
    setVariants((prev) =>
      prev.map((v, i) => (i === index ? { ...v, [field]: value } : v))
    );
  };

  const uploadImage = async (file: File): Promise<string> => {
    const options = {
      maxSizeMB: 0.5,
      maxWidthOrHeight: 1024,
      useWebWorker: true,
    };

    const compressedFile = await imageCompression(file, options);
    const compressedFileObj = new File([compressedFile], file.name, {
      type: compressedFile.type,
      lastModified: Date.now(),
    });

    const formData = new FormData();
    formData.append("file", compressedFileObj);

    const res = await fetch("/api/admin/upload", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.message || "Gagal mengunggah gambar ke server.");
    }

    const data = await res.json();
    if (!data.success) {
      throw new Error(data.message || "Gagal mengunggah gambar.");
    }

    return data.url;
  };

  const handleVariantImageUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setLoading(true);
      const url = await uploadImage(files[0]);

      setVariants((prev) =>
        prev.map((v, i) =>
          i === index
            ? { ...v, imageUrl: url, imageName: files[0].name }
            : v
        )
      );
    } catch (err: any) {
      console.error("Failed to upload variant image:", err);
      toast.error(err.message || "Gagal mengunggah gambar untuk sub-barang.");
    } finally {
      setLoading(false);
    }
    e.target.value = "";
  };

  useEffect(() => {
    if (fromPhysical) {
      setLoading(true);
      fetch(`/api/admin/gudang?id=${fromPhysical}`)
        .then((res) => res.json())
        .then((resData) => {
          if (resData.success && resData.data) {
            const item = resData.data;
            setPhysicalItemId(item.id);
            setSerialNumber(item.serialNumber);
            setIsFromPhysical(true);

            // Auto generate numeric SKU
            const generatedSku = Date.now().toString().slice(-8);

            setFormData((prev) => ({
              ...prev,
              sku: generatedSku,
              title: item.itemName,
              branchName: item.branchName,
              category: item.category,
              kondisi: "Bekas", // Forfeited pawn items are always Bekas
            }));
          } else {
            setNotification({
              isOpen: true,
              type: "error",
              message: resData.message || "Gagal memuat data barang gudang.",
            });
          }
        })
        .catch(() => {
          setNotification({
            isOpen: true,
            type: "error",
            message: "Gagal menghubungi server untuk memuat data barang.",
          });
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [fromPhysical]);

  // ─── Currency Masking ──────────────────────────────────────────────────────
  const formatCurrency = (value: string): string => {
    const digits = value.replace(/\D/g, "");
    if (!digits) return "";
    return new Intl.NumberFormat("id-ID").format(Number(digits));
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const formatted = formatCurrency(rawValue);
    setFormData({ ...formData, price: formatted });
  };

  const handleHargaMasukChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const formatted = formatCurrency(rawValue);
    setFormData({ ...formData, hargaMasuk: formatted });
  };

  const getCleanPrice = (): number => {
    return Number(formData.price.replace(/\./g, ""));
  };

  // ─── Multiple Image Upload ─────────────────────────────────────────────────
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setLoading(true);
    const newImages: CompressedImage[] = [];

    for (let i = 0; i < files.length; i++) {
      try {
        const file = files[i];
        const url = await uploadImage(file);

        newImages.push({
          url: url,
          originalSize: file.size,
          compressedSize: file.size,
        });
      } catch (err: any) {
        console.error("Failed to upload image:", err);
        setNotification({
          isOpen: true,
          type: "error",
          message: err.message || `Gagal mengunggah gambar ke-${i + 1}`,
        });
      }
    }

    setCompressedImages((prev) => [...prev, ...newImages]);
    setLoading(false);
    e.target.value = "";
  };

  const removeImage = (index: number) => {
    setCompressedImages((prev) => prev.filter((_, i) => i !== index));
  };

  // ─── Submit Handler ────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!formData.sku.trim()) {
      setNotification({
        isOpen: true,
        type: "error",
        message: "SKU / ID Barang wajib diisi.",
      });
      setLoading(false);
      return;
    }

    try {
      const cleanPrice = (val: string): number => {
        return Number(val.replace(/\./g, "")) || 0;
      };

      const payload = {
        ...formData,
        price: getCleanPrice(),
        hargaMasuk: formData.hargaMasuk ? Number(formData.hargaMasuk.replace(/\./g, "")) : null,
        images: compressedImages.length > 0
          ? compressedImages.map((img) => img.url)
          : ["https://placehold.co/800x600/f1f5f9/94a3b8?text=No+Image"],
        youtubeUrl: formData.youtubeUrl.trim() || null,
        physicalItemId,
        isMarketplaceVisible: false,
        variants: variants.map((v) => ({
          title: v.title,
          price: cleanPrice(v.hargaJual),
          hargaMasuk: v.hargaMasuk ? cleanPrice(v.hargaMasuk) : null,
          imageUrl: v.imageUrl || "https://placehold.co/800x600/f1f5f9/94a3b8?text=No+Image",
        })),
      };

      const res = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setNotification({
          isOpen: true,
          type: "success",
          message: "Barang Berhasil Disimpan! Status otomatis disembunyikan (Hidden) untuk keperluan pengecekan manual detail barang oleh admin sebelum dipublish ke katalog.",
        });
      } else {
        setNotification({
          isOpen: true,
          type: "error",
          message: data.message || "Gagal menyimpan barang",
        });
      }
    } catch (err) {
      setNotification({
        isOpen: true,
        type: "error",
        message: "Terjadi kesalahan jaringan",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const totalSaved = compressedImages.reduce((acc, img) => acc + img.originalSize - img.compressedSize, 0);
  const totalOriginal = compressedImages.reduce((acc, img) => acc + img.originalSize, 0);

  const inputClassName =
    "w-full bg-white border border-slate-300 rounded-xl px-4 py-3 md:py-2.5 min-h-[44px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all shadow-sm text-base md:text-sm";

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Tambah Barang Baru</h1>
        <p className="text-sm md:text-base text-slate-500 mt-1">
          {isFromPhysical
            ? "Verifikasi dan lengkapi detail barang lelang dari gudang untuk dipublikasikan."
            : "Masukkan detail barang lelang atau preloved ke dalam katalog."}
        </p>
      </div>

      <div className="bg-white rounded-2xl p-5 md:p-8 border border-slate-200 shadow-md">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Input SKU / ID Barang <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="text"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                className={inputClassName}
                placeholder="Contoh: SKU-1234"
              />
              <p className="text-xs text-slate-400 mt-1">Harus unik.</p>



              <div className="mt-3">
                <button
                  type="button"
                  onClick={addVariantRow}
                  className="px-4 py-2 text-xs font-bold text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-lg transition-colors border border-brand-200"
                >
                  [+ Tambah Barang ke Nomor Induk Ini]
                </button>
              </div>

              {variants.length > 0 && (
                <div className="mt-4 space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Daftar Sub-Barang (Varian)</h3>
                  {variants.map((v, index) => (
                    <div key={index} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end bg-white p-3 rounded-lg border border-slate-100 shadow-sm relative">
                      <button
                        type="button"
                        onClick={() => removeVariantRow(index)}
                        className="absolute -top-1.5 -right-1.5 bg-red-100 text-red-600 hover:bg-red-200 p-1 rounded-full border border-red-200"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nama Sub-Barang</label>
                        <input
                          type="text"
                          required
                          value={v.title}
                          onChange={(e) => handleVariantChange(index, "title", e.target.value)}
                          placeholder="Contoh: Sarung Motif A"
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-brand-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Harga Jual</label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">Rp</span>
                          <input
                            type="text"
                            required
                            inputMode="numeric"
                            value={v.hargaJual}
                            onChange={(e) => handleVariantChange(index, "hargaJual", formatCurrency(e.target.value))}
                            placeholder="500.000"
                            className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-brand-500 font-mono"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Harga Masuk</label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">Rp</span>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={v.hargaMasuk || ""}
                            onChange={(e) => handleVariantChange(index, "hargaMasuk", formatCurrency(e.target.value))}
                            placeholder="400.000"
                            className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-brand-500 font-mono"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Upload Gambar Khusus Varian</label>
                        <div className="flex items-center gap-2">
                          <label className="flex-1 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg px-2.5 py-1.5 text-[10px] font-semibold text-slate-600 text-center cursor-pointer truncate max-w-full">
                            {v.imageName || "Pilih Gambar"}
                            <input
                              type="file"
                              accept="image/*"
                              required={!v.imageUrl}
                              onChange={(e) => handleVariantImageUpload(index, e)}
                              className="hidden"
                            />
                          </label>
                          {v.imageUrl && (
                            <img src={v.imageUrl} className="w-8 h-8 object-cover rounded border border-slate-200 shadow-sm" alt="variant preview" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Nama Barang <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className={`${inputClassName} ${isFromPhysical ? "bg-slate-50 cursor-not-allowed text-slate-500" : ""}`}
                placeholder="Contoh: iPhone 13 Pro Max"
                readOnly={isFromPhysical}
              />
              {isFromPhysical && (
                <p className="text-xs text-slate-400 mt-1">Nama barang diwarisi secara permanen dari database gudang.</p>
              )}
            </div>

            {/* ROW 2 */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Kategori</label>
              {isFromPhysical ? (
                <div className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 md:py-2.5 text-slate-500 text-base md:text-sm font-medium cursor-not-allowed shadow-sm">
                  {formData.category}
                </div>
              ) : (
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className={inputClassName}
                >
                  <option>Elektronik</option>
                  <option>Gerabahan</option>
                  <option>Kendaraan</option>
                  <option>Alat Tukang</option>
                  <option>Pakaian</option>
                  <option>Alat Rumah Tangga</option>
                </select>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Status Kondisi Barang</label>
              <div className="flex gap-3 h-12 md:h-11">
                <button
                  type="button"
                  onClick={() => !isFromPhysical && setFormData({ ...formData, kondisi: "Baru" })}
                  disabled={isFromPhysical}
                  className={`flex-1 px-4 rounded-xl font-semibold text-sm border-2 transition-all shadow-sm ${
                    formData.kondisi === "Baru"
                      ? "border-green-500 bg-green-50 text-green-700 ring-2 ring-green-500/20"
                      : "border-slate-300 bg-white text-slate-600 hover:border-slate-400"
                  } ${isFromPhysical ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  ✨ Baru
                </button>
                <button
                  type="button"
                  onClick={() => !isFromPhysical && setFormData({ ...formData, kondisi: "Bekas" })}
                  disabled={isFromPhysical}
                  className={`flex-1 px-4 rounded-xl font-semibold text-sm border-2 transition-all shadow-sm ${
                    formData.kondisi === "Bekas"
                      ? "border-slate-700 bg-slate-100 text-slate-800 ring-2 ring-slate-500/20"
                      : "border-slate-300 bg-white text-slate-600 hover:border-slate-400"
                  } ${isFromPhysical ? "border-slate-700 bg-slate-100 text-slate-800" : ""}`}
                >
                  ♻️ Bekas
                </button>
              </div>
            </div>

            {/* ROW 3 */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Harga Jual (Rp) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm">Rp</span>
                <input
                  required
                  type="text"
                  inputMode="numeric"
                  value={formData.price}
                  onChange={handlePriceChange}
                  className={`${inputClassName} pl-10`}
                  placeholder="5.000.000"
                />
              </div>
              <p className="text-xs text-slate-400 mt-1">Ketik angka, titik pemisah ribuan otomatis muncul.</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Harga Masuk / Modal (Rp)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm">Rp</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formData.hargaMasuk}
                  onChange={handleHargaMasukChange}
                  className={`${inputClassName} pl-10`}
                  placeholder="4.000.000"
                />
              </div>
              <p className="text-xs text-slate-400 mt-1">Ketik angka, titik pemisah ribuan otomatis muncul.</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Nomor WhatsApp CS <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="text"
                value={formData.whatsappNumber}
                onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
                className={inputClassName}
                placeholder="628..."
              />
            </div>

            {/* ROW 4 */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Lokasi Cabang</label>
              <div className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 md:py-2.5 text-slate-500 text-base md:text-sm font-medium flex items-center gap-2 cursor-not-allowed shadow-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500 shrink-0"></span>
                <span className="truncate">{formData.branchName} (Terkunci)</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Video className="w-4 h-4 text-red-500 shrink-0" />
                Link Video Demo YouTube (Opsional)
              </label>
              <input
                type="url"
                value={formData.youtubeUrl}
                onChange={(e) => setFormData({ ...formData, youtubeUrl: e.target.value })}
                className={inputClassName}
                placeholder="https://youtube.com/watch?v=..."
              />
            </div>

            {/* IMMUTABLE INHERITED FIELDS FOR WAREHOUSE BRIDGE */}
            {isFromPhysical && (
              <>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Serial Number</label>
                  <input
                    type="text"
                    value={serialNumber || "Tidak Ada"}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 md:py-2.5 text-slate-500 text-base md:text-sm font-medium cursor-not-allowed shadow-sm"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">ID Barang Fisik</label>
                  <input
                    type="text"
                    value={physicalItemId || ""}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 md:py-2.5 text-slate-500 text-base md:text-sm font-medium cursor-not-allowed shadow-sm font-mono"
                    readOnly
                  />
                </div>
              </>
            )}

            {/* Warranty Checkbox */}
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Garansi</label>
              <div className="flex items-center gap-3 bg-white border border-slate-300 rounded-xl px-4 py-3 min-h-[44px] shadow-sm">
                <input
                  type="checkbox"
                  id="hasWarranty"
                  checked={formData.hasWarranty}
                  onChange={(e) => setFormData({ ...formData, hasWarranty: e.target.checked })}
                  className="w-5 h-5 text-brand-600 border-slate-300 rounded focus:ring-brand-500 transition-all cursor-pointer"
                />
                <label htmlFor="hasWarranty" className="text-sm font-semibold text-slate-700 cursor-pointer select-none">
                  🛡️ Memiliki Garansi Resmi MBG
                </label>
              </div>
            </div>

            {/* ROW 5 - Textareas */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Deskripsi Marketplace <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={5}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className={inputClassName}
                placeholder="Spesifikasi, kelengkapan, dan informasi penting untuk pembeli..."
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Minus / Defect (Opsional)
              </label>
              <textarea
                rows={5}
                value={formData.defects}
                onChange={(e) => setFormData({ ...formData, defects: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 md:py-2.5 min-h-[44px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all shadow-sm text-base md:text-sm"
                placeholder="Catat jika ada lecet, kerusakan kecil, dll."
              />
            </div>
          </div>

          {/* ─── Multiple Image Upload ─────────────────────────────────────────── */}
          <div className="border-t border-slate-200 pt-6 mt-2">
            <label className="block text-sm font-semibold text-slate-700 mb-3">
              Upload Gambar Marketplace (Wajib Upload Manual)
            </label>

            <div className="space-y-4">
              <label className="flex flex-col items-center justify-center w-full h-40 md:h-36 border-2 border-dashed border-slate-300 rounded-2xl cursor-pointer bg-slate-50 hover:bg-slate-100 hover:border-brand-500 transition-all">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <UploadCloud className="w-10 h-10 text-slate-400 mb-2" />
                  <p className="text-sm text-slate-600 text-center px-4">
                    <span className="font-semibold text-brand-600">Klik untuk upload gambar</span> (bisa pilih banyak)
                  </p>
                  <p className="text-xs text-slate-400 mt-1">Maks. 5MB per file, format JPG/PNG</p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                />
              </label>

              {/* Image Previews Grid */}
              {compressedImages.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-700">
                      {compressedImages.length} gambar terupload
                    </p>
                    {totalOriginal > 0 && (
                      <p className="hidden sm:block text-xs font-semibold text-green-600 bg-green-50 px-2.5 py-1 rounded-lg border border-green-200">
                        Total hemat: {Math.round((totalSaved / totalOriginal) * 100)}% ({formatBytes(totalSaved)})
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    {compressedImages.map((img, idx) => (
                      <div
                        key={idx}
                        className="relative group rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100 aspect-square"
                      >
                        <img
                          src={img.url}
                          alt={`Preview ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          className="absolute top-2 right-2 w-8 h-8 md:w-6 md:h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-md md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-4 h-4 md:w-3.5 md:h-3.5" />
                        </button>
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] md:text-[9px] text-center py-1 md:py-0.5 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                          {formatBytes(img.compressedSize)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ─── QR Code Preview + Submit ──────────────────────────────────────── */}
          <div className="border-t border-slate-200 pt-6 mt-2 flex flex-col md:flex-row items-center md:items-end justify-between gap-6">
            {/* QR Code Preview */}
            {formData.sku.trim() && (
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 flex items-center gap-4 shadow-sm w-full md:w-auto">
                <div className="bg-white p-2 rounded-lg border border-slate-100 shrink-0">
                  <QRCodeSVG
                    value={formData.sku.trim()}
                    size={64}
                    level="M"
                    bgColor="#ffffff"
                    fgColor="#0f172a"
                  />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-1">
                    <QrCode className="w-3.5 h-3.5" /> QR Code Preview
                  </p>
                  <p className="text-[11px] text-slate-500 font-mono break-all line-clamp-1">{formData.sku.trim()}</p>
                  <p className="text-[10px] text-slate-400 mt-1">QR tersedia setelah simpan</p>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full md:w-auto px-8 py-3.5 md:py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold shadow-md hover:shadow-lg hover:shadow-brand-500/20 transition-all disabled:opacity-70 disabled:hover:shadow-md flex justify-center items-center gap-2 min-h-[44px]"
            >
              {loading ? "Menyimpan..." : "Simpan Barang"}
            </button>
          </div>
        </form>
      </div>

      {/* Form Notifications Center Modal */}
      {notification.isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className={`max-w-md w-full bg-white rounded-2xl p-6 shadow-2xl border flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-200 ${
            notification.type === 'error' ? 'border-red-100' : 'border-emerald-100'
          }`}>
            
            <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${
              notification.type === 'error' ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-500'
            }`}>
              {notification.type === 'error' ? (
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              ) : (
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>

            <h3 className="text-lg font-bold text-slate-900 mb-2">
              {notification.type === 'error' ? 'Terjadi Kendala!' : 'Berhasil Disimpan!'}
            </h3>

            <p className="text-slate-600 text-sm mb-6 leading-relaxed">
              {notification.message}
            </p>

            <button
              type="button"
              onClick={() => {
                setNotification(prev => ({ ...prev, isOpen: false }));
                if (notification.type === 'success') {
                  router.push("/mbg-internal-portal/items");
                  router.refresh();
                }
              }}
              className={`w-full py-2.5 rounded-xl font-semibold transition-all shadow-sm min-h-[44px] flex items-center justify-center ${
                notification.type === 'error' 
                  ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-100 shadow-sm' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-100 shadow-sm'
              }`}
            >
              {notification.type === 'error' ? 'Perbaiki Data' : 'Selesai'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AddItemPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500 font-medium">Memuat form...</div>}>
      <AddItemForm />
    </Suspense>
  );
}
