"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  ExternalLink,
  Printer,
  PackageSearch,
  Search,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  EyeOff,
  Eye,
  X,
  Loader2,
  ShieldAlert,
  UploadCloud,
  Video,
  QrCode,
} from "lucide-react";
import imageCompression from "browser-image-compression";
import { QRCodeSVG } from "qrcode.react";

type Item = {
  id: number;
  sku: string;
  title: string;
  branchName: string;
  price: any;
  status: string;
  isMarketplaceVisible: boolean;
  hasWarranty?: boolean;
};

type SortField = "sku" | "title" | "price" | "status" | null;
type SortDirection = "asc" | "desc";

const ITEMS_PER_PAGE = 20;

export default function ItemsTableClient({
  items,
  currentPage,
  totalPages,
  totalCount,
  initialSearchQuery,
}: {
  items: Item[];
  currentPage: number;
  totalPages: number;
  totalCount: number;
  initialSearchQuery: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchQuery, setSearchQuery] = useState(initialSearchQuery || "");
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [userRole, setUserRole] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const updateUrl = useCallback(
    (newPage: number, newQuery: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("page", String(newPage));
      if (newQuery.trim()) {
        params.set("q", newQuery.trim());
      } else {
        params.delete("q");
      }
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      updateUrl(newPage, searchQuery);
    }
  };

  // Synchronize searchQuery with searchParams change (e.g. back/forward navigation)
  useEffect(() => {
    const currentQ = searchParams.get("q") || "";
    if (searchQuery !== currentQ) {
      setSearchQuery(currentQ);
    }
  }, [searchParams]);

  // Debounce search query updates to URL
  useEffect(() => {
    const timer = setTimeout(() => {
      const currentQ = searchParams.get("q") || "";
      if (searchQuery.trim() !== currentQ.trim()) {
        updateUrl(1, searchQuery);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, searchParams, updateUrl]);

  // Overridden product statuses and transaction details
  const [overriddenStatuses, setOverriddenStatuses] = useState<Record<number, {
    status: string;
    customerName: string;
    dpAmount: number;
    settlementAmount: number;
    invoiceNo: string;
    timestamp: string;
  }>>({});

  // Active status selection for the modal popup
  const [invoiceModalData, setInvoiceModalData] = useState<{
    isOpen: boolean;
    item: Item | null;
    targetStatus: string;
    customerName: string;
    dpAmount: string;
    settlementAmount: string;
  }>({
    isOpen: false,
    item: null,
    targetStatus: "",
    customerName: "",
    dpAmount: "",
    settlementAmount: "",
  });

  // State to hold the invoice data currently being printed
  const [printInvoiceData, setPrintInvoiceData] = useState<{
    item: Item;
    status: string;
    customerName: string;
    amount: number;
    invoiceNo: string;
    timestamp: string;
  } | null>(null);

  // Load overridden statuses from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("mbg_local_statuses");
      if (saved) {
        try {
          setOverriddenStatuses(JSON.parse(saved));
        } catch (e) {
          console.error("Gagal memuat local status overrides:", e);
        }
      }
    }
  }, []);

  // Trigger print and reset state when printInvoiceData is set
  useEffect(() => {
    if (printInvoiceData) {
      const timer = setTimeout(() => {
        window.print();
        setPrintInvoiceData(null);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [printInvoiceData]);

  // Helper to update local statuses and save to localStorage
  const updateLocalStatus = (itemId: number, data: {
    status: string;
    customerName: string;
    dpAmount: number;
    settlementAmount: number;
    invoiceNo: string;
    timestamp: string;
  } | null) => {
    setOverriddenStatuses((prev) => {
      const next = { ...prev };
      if (data === null) {
        delete next[itemId];
      } else {
        next[itemId] = data;
      }
      localStorage.setItem("mbg_local_statuses", JSON.stringify(next));
      return next;
    });
  };

  // Helper to get effective item status
  const getEffectiveItemStatus = useCallback((item: Item) => {
    return overriddenStatuses[item.id]?.status || item.status;
  }, [overriddenStatuses]);
  
  // Full form edit states
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [editPriceText, setEditPriceText] = useState("");
  const [editHargaMasukText, setEditHargaMasukText] = useState("");
  const [compressedImages, setCompressedImages] = useState<any[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Fetch user role on mount for RBAC
  useEffect(() => {
    fetch("/api/admin/users/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setUserRole(data.data.role);
        }
      })
      .catch(() => {});
  }, []);

  const formatIDR = (val: any) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(Number(val));
  };

  // Format a raw number string into Indonesian dot-separated thousands (e.g. "8000000" → "8.000.000")
  const formatRupiahMask = (value: string): string => {
    const digits = value.replace(/\D/g, "");
    if (!digits) return "";
    return new Intl.NumberFormat("id-ID").format(Number(digits));
  };

  // Strip dots from masked string back to raw number (e.g. "8.000.000" → 8000000)
  const parseRupiahMask = (value: string): number => {
    return Number(value.replace(/\./g, "")) || 0;
  };

  const formatBranchName = (name: string) => {
    if (name && name.toLowerCase().includes("pasuruan")) {
      return "Cabang Pasuruan - Sangar";
    }
    return name;
  };

  // 1. Sort current page items
  const sortedItems = useMemo(() => {
    if (!sortField) return items;

    return [...items].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "sku":
          cmp = Number(a.sku) - Number(b.sku);
          if (isNaN(cmp)) cmp = a.sku.localeCompare(b.sku);
          break;
        case "title":
          cmp = a.title.localeCompare(b.title, "id");
          break;
        case "price":
          cmp = Number(a.price) - Number(b.price);
          break;
        case "status": {
          const statusOrder: Record<string, number> = {
            Terjual: 0,
            Dipesan: 1,
            "Dipesan (DP)": 1,
            Tersedia: 2,
            RETUR: 3,
          };
          const statusA = getEffectiveItemStatus(a);
          const statusB = getEffectiveItemStatus(b);
          cmp = (statusOrder[statusA] ?? 99) - (statusOrder[statusB] ?? 99);
          break;
        }
      }
      return sortDirection === "asc" ? cmp : -cmp;
    });
  }, [items, sortField, sortDirection, getEffectiveItemStatus]);

  const paginatedItems = sortedItems;

  // Sort toggle handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else {
        setSortField(null);
        setSortDirection("asc");
      }
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Sort icon renderer
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-500 transition-colors" />;
    }
    return sortDirection === "asc" ? (
      <ChevronUp className="w-3.5 h-3.5 text-blue-600" />
    ) : (
      <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
    );
  };

  // ──── Action Handlers ────

  const handleToggleVisibility = async (item: Item) => {
    try {
      const res = await fetch(`/api/admin/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isMarketplaceVisible: !item.isMarketplaceVisible,
        }),
      });
      if (res.ok) {
        router.refresh();
      }
    } catch (err) {
      console.error("Toggle visibility failed:", err);
    }
  };

  const handleStatusChange = (item: Item, newStatus: string) => {
    if (newStatus === "Tersedia") {
      updateLocalStatus(item.id, null);
    } else {
      const localData = overriddenStatuses[item.id];
      setInvoiceModalData({
        isOpen: true,
        item,
        targetStatus: newStatus,
        customerName: localData?.customerName || "",
        dpAmount: localData?.dpAmount ? String(localData.dpAmount) : "",
        settlementAmount: localData?.settlementAmount ? String(localData.settlementAmount) : String(item.price),
      });
    }
  };

  // Full Edit Form API operations
  const openEditForm = async (item: Item) => {
    setSelectedItem(item);
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/admin/items/${item.id}`);
      const resData = await res.json();
      if (resData.success && resData.data) {
        setEditingItem(resData.data);
        setEditPriceText(formatRupiahMask(String(resData.data.price)));
        setEditHargaMasukText(resData.data.hargaMasuk ? formatRupiahMask(String(resData.data.hargaMasuk)) : "");
        setCompressedImages(resData.data.images.map((url: string) => ({ url })));
      } else {
        alert(resData.message || "Gagal memuat detail barang.");
      }
    } catch (err) {
      alert("Terjadi kesalahan jaringan.");
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleEditFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    setActionLoading(true);
    try {
      const rawPrice = parseRupiahMask(editPriceText);
      const rawHargaMasuk = editHargaMasukText ? parseRupiahMask(editHargaMasukText) : null;
      const payload = {
        sku: editingItem.sku,
        title: editingItem.title,
        category: editingItem.category,
        kondisi: editingItem.kondisi,
        price: rawPrice,
        hargaMasuk: rawHargaMasuk,
        whatsappNumber: editingItem.whatsappNumber,
        youtubeUrl: editingItem.youtubeUrl,
        hasWarranty: editingItem.hasWarranty,
        description: editingItem.description,
        defects: editingItem.defects,
        images: compressedImages.map((img: any) => img.url),
        nomorInduk: editingItem.nomorInduk || "",
      };

      const res = await fetch(`/api/admin/items/${editingItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const resData = await res.json();
      if (res.ok && resData.success) {
        setEditingItem(null);
        setSelectedItem(null);
        router.refresh();
      } else {
        alert(resData.message || "Gagal menyimpan perubahan barang.");
      }
    } catch (err) {
      alert("Terjadi kesalahan jaringan.");
    } finally {
      setActionLoading(false);
    }
  };

  const openDeleteModal = (item: Item) => {
    setSelectedItem(item);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedItem) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/items/${selectedItem.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setDeleteModalOpen(false);
        setSelectedItem(null);
        router.refresh();
      } else {
        alert(data.message || "Gagal menghapus barang.");
      }
    } catch (err) {
      alert("Terjadi kesalahan jaringan.");
    } finally {
      setActionLoading(false);
    }
  };


  const isSuperAdmin = userRole === "SUPERADMIN";

  // ──── Status Badge ────
  const StatusBadge = ({ status }: { status: string }) => (
    <span
      className={`px-2.5 py-1 rounded-md text-[10px] uppercase tracking-wider font-bold ${
        status === "Tersedia"
          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
          : status === "Terjual"
          ? "bg-slate-700 text-white border border-slate-800"
          : status === "RETUR"
          ? "bg-rose-50 text-rose-700 border border-rose-200"
          : "bg-amber-50 text-amber-700 border border-amber-200"
      }`}
    >
      {status}
    </span>
  );

  // ──── Pagination Controls ────
  const PaginationBar = () => {
    if (totalCount === 0) return null;
    return (
      <div className="flex justify-between items-center px-6 py-4 border-t border-slate-100 bg-slate-50/50">
        <span className="text-xs text-slate-500 font-medium">
          Halaman {currentPage} dari {totalPages} (Total {totalCount} Barang)
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() => handlePageChange(currentPage - 1)}
            className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            Sebelumnya
          </button>
          <button
            type="button"
            disabled={currentPage === totalPages}
            onClick={() => handlePageChange(currentPage + 1)}
            className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            Berikutnya
          </button>
        </div>
      </div>
    );
  };

  // ─── FULL EDIT FORM RENDER ───
  if (editingItem) {
    const inputClassName =
      "w-full bg-white border border-slate-300 rounded-xl px-4 py-3 md:py-2.5 min-h-[44px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all shadow-sm text-base md:text-sm";

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

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      setActionLoading(true);
      const newImages: any[] = [];
      for (let i = 0; i < files.length; i++) {
        try {
          const file = files[i];
          const url = await uploadImage(file);
          newImages.push({ url });
        } catch (err: any) {
          console.error("Failed to upload image:", err);
          alert(err.message || `Gagal mengunggah gambar ke-${i + 1}`);
        }
      }
      setCompressedImages((prev) => [...prev, ...newImages]);
      setActionLoading(false);
      e.target.value = "";
    };

    const removeImage = (idx: number) => {
      setCompressedImages((prev) => prev.filter((_, i) => i !== idx));
    };

    return (
      <div className="max-w-5xl mx-auto space-y-6 pb-12 animate-in fade-in duration-200">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Edit Detail Barang</h1>
          <p className="text-sm md:text-base text-slate-500 mt-1">
            Ubah detail spesifikasi barang lelang atau preloved katalog secara lengkap.
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 md:p-8 border border-slate-200 shadow-md">
          <form onSubmit={handleEditFormSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {/* SKU */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Nomor SKU Barang <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  value={editingItem.sku}
                  onChange={(e) => setEditingItem({ ...editingItem, sku: e.target.value })}
                  className={inputClassName}
                  placeholder="Contoh: SKU-1234"
                />
                <p className="text-xs text-slate-400 mt-1">Harus unik.</p>
              </div>

              {/* Nomor Induk (Grouping ID Varian) */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Nomor Induk (Grouping ID Varian)
                </label>
                <input
                  type="text"
                  value={editingItem.nomorInduk || ""}
                  onChange={(e) => setEditingItem({ ...editingItem, nomorInduk: e.target.value })}
                  className={inputClassName}
                  placeholder="Contoh: 1001 (kosongkan jika tidak dikelompokkan)"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Barang dengan Nomor Induk yang sama akan dikelompokkan sebagai varian di katalog publik.
                </p>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Nama Barang <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  value={editingItem.title}
                  onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                  className={inputClassName}
                  placeholder="Contoh: iPhone 13 Pro Max"
                />
              </div>

              {/* Kategori */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Kategori</label>
                <select
                  value={editingItem.category}
                  onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                  className={inputClassName}
                >
                  <option>Elektronik</option>
                  <option>Gerabahan</option>
                  <option>Kendaraan</option>
                  <option>Alat Tukang</option>
                  <option>Pakaian</option>
                  <option>Alat Rumah Tangga</option>
                </select>
              </div>

              {/* Kondisi */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Status Kondisi Barang</label>
                <div className="flex gap-3 h-12 md:h-11">
                  <button
                    type="button"
                    onClick={() => setEditingItem({ ...editingItem, kondisi: "Baru" })}
                    className={`flex-1 px-4 rounded-xl font-semibold text-sm border-2 transition-all shadow-sm ${
                      editingItem.kondisi === "Baru"
                        ? "border-green-500 bg-green-50 text-green-700 ring-2 ring-green-500/20"
                        : "border-slate-300 bg-white text-slate-600 hover:border-slate-400"
                    }`}
                  >
                    ✨ Baru
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingItem({ ...editingItem, kondisi: "Bekas" })}
                    className={`flex-1 px-4 rounded-xl font-semibold text-sm border-2 transition-all shadow-sm ${
                      editingItem.kondisi === "Bekas"
                        ? "border-slate-700 bg-slate-100 text-slate-800 ring-2 ring-slate-500/20"
                        : "border-slate-300 bg-white text-slate-600 hover:border-slate-400"
                    }`}
                  >
                    ♻️ Bekas
                  </button>
                </div>
              </div>

              {/* Harga Jual */}
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
                    value={editPriceText}
                    onChange={(e) => setEditPriceText(formatRupiahMask(e.target.value))}
                    className={`${inputClassName} pl-10`}
                    placeholder="5.000.000"
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">Ketik angka, titik pemisah ribuan otomatis muncul.</p>
              </div>

              {/* Harga Masuk / Modal */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Harga Masuk / Modal (Rp)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm">Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={editHargaMasukText}
                    onChange={(e) => setEditHargaMasukText(formatRupiahMask(e.target.value))}
                    className={`${inputClassName} pl-10`}
                    placeholder="4.000.000"
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">Ketik angka, titik pemisah ribuan otomatis muncul.</p>
              </div>

              {/* WhatsApp CS */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Nomor WhatsApp CS <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  value={editingItem.whatsappNumber}
                  onChange={(e) => setEditingItem({ ...editingItem, whatsappNumber: e.target.value })}
                  className={inputClassName}
                  placeholder="628..."
                />
              </div>

              {/* Lokasi Cabang */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Lokasi Cabang</label>
                <div className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 md:py-2.5 text-slate-500 text-base md:text-sm font-medium flex items-center gap-2 cursor-not-allowed shadow-sm">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500 shrink-0"></span>
                  <span className="truncate">{editingItem.branchName} (Terkunci)</span>
                </div>
              </div>

              {/* YouTube Link */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Video className="w-4 h-4 text-red-500 shrink-0" />
                  Link Video Demo YouTube (Opsional)
                </label>
                <input
                  type="url"
                  value={editingItem.youtubeUrl || ""}
                  onChange={(e) => setEditingItem({ ...editingItem, youtubeUrl: e.target.value })}
                  className={inputClassName}
                  placeholder="https://youtube.com/watch?v=..."
                />
              </div>

              {/* Warranty */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Garansi</label>
                <div className="flex items-center gap-3 bg-white border border-slate-300 rounded-xl px-4 py-3 min-h-[44px] shadow-sm">
                  <input
                    type="checkbox"
                    id="editHasWarranty"
                    checked={!!editingItem.hasWarranty}
                    onChange={(e) => setEditingItem({ ...editingItem, hasWarranty: e.target.checked })}
                    className="w-5 h-5 text-brand-600 border-slate-300 rounded focus:ring-brand-500 transition-all cursor-pointer"
                  />
                  <label htmlFor="editHasWarranty" className="text-sm font-semibold text-slate-700 cursor-pointer select-none">
                    🛡️ Memiliki Garansi Resmi MBG
                  </label>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Deskripsi / Spesifikasi <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={5}
                  value={editingItem.description}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                  className={inputClassName}
                  placeholder="Spesifikasi, kelengkapan, dan informasi penting untuk pembeli..."
                />
              </div>

              {/* Defects */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Minus / Defect (Opsional)
                </label>
                <textarea
                  rows={5}
                  value={editingItem.defects || ""}
                  onChange={(e) => setEditingItem({ ...editingItem, defects: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 md:py-2.5 min-h-[44px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all shadow-sm text-base md:text-sm"
                  placeholder="Catat jika ada lecet, kerusakan kecil, dll."
                />
              </div>
            </div>

            {/* Images upload */}
            <div className="border-t border-slate-200 pt-6 mt-2">
              <label className="block text-sm font-semibold text-slate-700 mb-3">
                Upload Gambar Marketplace (Wajib Upload Manual)
              </label>

              <div className="space-y-4">
                <label className="flex flex-col items-center justify-center w-full h-40 md:h-36 border-2 border-dashed border-slate-300 rounded-2xl cursor-pointer bg-slate-50 hover:bg-slate-100 hover:border-brand-500 transition-all">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <UploadCloud className="w-10 h-10 text-slate-400 mb-2" />
                    <p className="text-sm text-slate-600 text-center px-4">
                      <span className="font-semibold text-brand-600">Klik untuk upload gambar baru</span> (bisa pilih banyak)
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

                {compressedImages.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-slate-700">
                      {compressedImages.length} gambar terpilih
                    </p>
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
                            className="absolute top-2 right-2 w-8 h-8 md:w-6 md:h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-md transition-opacity"
                          >
                            <X className="w-4 h-4 md:w-3.5 md:h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="border-t border-slate-200 pt-6 mt-2 flex flex-col md:flex-row items-center md:items-end justify-between gap-6">
              {editingItem.sku?.trim() && (
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 flex items-center gap-4 shadow-sm w-full md:w-auto">
                  <div className="bg-white p-2 rounded-lg border border-slate-100 shrink-0">
                    <QRCodeSVG
                      value={editingItem.sku.trim()}
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
                    <p className="text-[11px] text-slate-500 font-mono break-all line-clamp-1">{editingItem.sku.trim()}</p>
                  </div>
                </div>
              )}

              <div className="flex gap-3 w-full md:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    setEditingItem(null);
                    setSelectedItem(null);
                  }}
                  disabled={actionLoading}
                  className="w-full md:w-auto px-6 py-3 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-all font-semibold min-h-[44px] flex items-center justify-center"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !editingItem.title?.trim() || !editPriceText}
                  className="w-full md:w-auto px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-70 flex justify-center items-center gap-2 min-h-[44px]"
                >
                  {actionLoading ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4 print:hidden">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cari SKU atau Nama Barang..."
          className="w-full bg-white border border-slate-300 rounded-xl pl-12 pr-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all shadow-sm text-sm font-medium min-h-[44px]"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors text-xs font-semibold bg-slate-100 px-2 py-1 rounded-md min-h-[32px]"
          >
            Reset
          </button>
        )}
      </div>

      {/* Results count when searching */}
      {searchQuery.trim() && (
        <p className="text-xs text-slate-500 font-medium px-1">
          Menampilkan {items.length} dari {totalCount} barang
        </p>
      )}

      {/* ═══════════ Desktop Table ═══════════ */}
      <div className="hidden md:block bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="px-6 py-4 font-semibold">
                  <button
                    onClick={() => handleSort("sku")}
                    className="group flex items-center gap-1.5 hover:text-blue-600 transition-colors"
                  >
                    SKU
                    <SortIcon field="sku" />
                  </button>
                </th>
                <th className="px-6 py-4 font-semibold">
                  <button
                    onClick={() => handleSort("title")}
                    className="group flex items-center gap-1.5 hover:text-blue-600 transition-colors"
                  >
                    Nama Barang
                    <SortIcon field="title" />
                  </button>
                </th>
                <th className="px-6 py-4 font-semibold">
                  <button
                    onClick={() => handleSort("price")}
                    className="group flex items-center gap-1.5 hover:text-blue-600 transition-colors"
                  >
                    Harga
                    <SortIcon field="price" />
                  </button>
                </th>
                <th className="px-6 py-4 font-semibold">
                  <button
                    onClick={() => handleSort("status")}
                    className="group flex items-center gap-1.5 hover:text-blue-600 transition-colors"
                  >
                    Status
                    <SortIcon field="status" />
                  </button>
                </th>
                <th className="px-6 py-4 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedItems.map((item, idx) => {
                const effectiveStatus = getEffectiveItemStatus(item);
                const isDipesanDP = effectiveStatus === "Dipesan (DP)" || effectiveStatus === "Dipesan";
                const rowBg = isDipesanDP
                  ? "bg-blue-50/70 hover:bg-blue-100/50 border-l-4 border-l-blue-600"
                  : idx % 2 === 0
                  ? "bg-white"
                  : "bg-slate-50/50";
                return (
                  <tr
                    key={item.id}
                    className={`transition-colors hover:bg-blue-50/50 ${rowBg} ${!item.isMarketplaceVisible ? "opacity-50" : ""}`}
                  >
                    <td className="px-6 py-4 font-mono text-slate-900 font-bold">
                      {item.sku}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">
                      <div className="flex items-center gap-2">
                        <div className="max-w-[220px] truncate" title={item.title}>
                          {item.title}
                        </div>
                        {!item.isMarketplaceVisible && (
                          <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider font-bold bg-orange-100 text-orange-600 border border-orange-200">
                            Hidden
                          </span>
                        )}
                        {item.hasWarranty && (
                          <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider font-bold bg-blue-100 text-blue-600 border border-blue-200">
                            🛡️ Garansi
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {formatBranchName(item.branchName)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-900 font-medium">
                      {formatIDR(item.price)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <select
                          value={effectiveStatus === "Dipesan" ? "Dipesan (DP)" : effectiveStatus}
                          onChange={(e) => handleStatusChange(item, e.target.value)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs uppercase tracking-wider font-bold border focus:outline-none focus:ring-2 cursor-pointer transition-all ${
                            effectiveStatus === "Tersedia"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 focus:ring-emerald-500/20"
                              : effectiveStatus === "Terjual"
                              ? "bg-slate-700 text-white border-slate-800 focus:ring-slate-500/20"
                              : effectiveStatus === "RETUR"
                              ? "bg-rose-50 text-rose-700 border-rose-200 focus:ring-rose-500/20"
                              : "bg-blue-50 text-blue-700 border-blue-200 focus:ring-blue-500/20"
                          }`}
                        >
                          <option value="Tersedia">Tersedia</option>
                          <option value="Dipesan (DP)">Dipesan (DP)</option>
                          <option value="Terjual">Terjual</option>
                          {item.status === "RETUR" && <option value="RETUR">RETUR</option>}
                        </select>
                        
                        {overriddenStatuses[item.id] && (
                          <button
                            onClick={() => {
                              const local = overriddenStatuses[item.id];
                              setPrintInvoiceData({
                                item,
                                status: local.status,
                                customerName: local.customerName,
                                amount: local.status === "Dipesan (DP)" ? local.dpAmount : local.settlementAmount,
                                invoiceNo: local.invoiceNo,
                                timestamp: local.timestamp,
                              });
                            }}
                            className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all min-h-[32px] min-w-[32px] flex items-center justify-center border border-slate-200 cursor-pointer"
                            title="Cetak Ulang E-Invoice"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1 items-center">
                      {/* Hide/Show Toggle */}
                      <button
                        onClick={() => handleToggleVisibility(item)}
                        className={`p-1.5 rounded-lg transition-all min-h-[44px] min-w-[44px] flex items-center justify-center ${
                          item.isMarketplaceVisible
                            ? "text-slate-400 hover:text-orange-600 hover:bg-orange-50"
                            : "text-orange-500 hover:text-emerald-600 hover:bg-emerald-50"
                        }`}
                        title={
                          item.isMarketplaceVisible
                            ? "Sembunyikan dari Marketplace"
                            : "Tampilkan di Marketplace"
                        }
                      >
                        {item.isMarketplaceVisible ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                      {/* Print */}
                      <Link
                        href={`/mbg-internal-portal/items/${item.id}`}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
                        title="Detail & Print Barcode"
                      >
                        <Printer className="w-4 h-4" />
                      </Link>
                      {/* External link */}
                      <Link
                        href={`/katalog/${item.id}`}
                        target="_blank"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
                        title="Lihat di Publik"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                      {/* Superadmin: Retur (redirect ke halaman retur baru) */}
                      {isSuperAdmin && item.status === "Terjual" && (
                        <Link
                          href={`/mbg-internal-portal/retur/new?sku=${item.sku}`}
                          className="p-1.5 rounded-lg text-orange-500 hover:text-orange-700 hover:bg-orange-50 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
                          title="Proses Retur Barang"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 15v-6a4 4 0 00-4-4H4m0 0l3-3m-3 3l3 3m1-3h8a4 4 0 014 4v6m-9 5h.01M12 12h.01" />
                          </svg>
                        </Link>
                      )}
                      {/* Superadmin: Edit */}
                      {isSuperAdmin && (
                        <button
                          onClick={() => openEditForm(item)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
                          title="Edit Barang"
                          disabled={loadingDetail}
                        >
                          {loadingDetail && selectedItem?.id === item.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                          ) : (
                            <Pencil className="w-4 h-4" />
                          )}
                        </button>
                      )}
                      {/* Superadmin: Delete */}
                      {isSuperAdmin && (
                        <button
                          onClick={() => openDeleteModal(item)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
                          title="Hapus Barang"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
              {paginatedItems.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-12 text-center text-slate-500 bg-white"
                  >
                    <div className="flex flex-col items-center">
                      <PackageSearch className="w-12 h-12 mb-3 opacity-20" />
                      {searchQuery.trim()
                        ? `Tidak ada barang dengan SKU atau nama "${searchQuery}".`
                        : "Belum ada barang terdaftar."}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══════════ Mobile Card List ═══════════ */}
      <div className="block md:hidden space-y-3">
        {paginatedItems.map((item, idx) => {
          const effectiveStatus = getEffectiveItemStatus(item);
          const isDipesanDP = effectiveStatus === "Dipesan (DP)" || effectiveStatus === "Dipesan";
          const cardBg = isDipesanDP
            ? "bg-gradient-to-br from-blue-50/80 to-white border-blue-200"
            : idx % 2 === 0
            ? "bg-white"
            : "bg-slate-50/50";
          return (
            <div
              key={item.id}
              className={`border border-gray-150 rounded-xl p-4 shadow-none flex flex-col gap-3 content-visibility-card ${cardBg} ${!item.isMarketplaceVisible ? "opacity-50" : ""}`}
            >
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {isDipesanDP && (
                      <span className="shrink-0 px-2 py-0.5 rounded text-[8px] uppercase tracking-wider font-bold bg-blue-600 text-white shadow-sm mr-1">
                        DIPESAN
                      </span>
                    )}
                    <h3 className="font-bold text-slate-900 text-sm line-clamp-2 leading-tight">
                      {item.title}
                    </h3>
                    {!item.isMarketplaceVisible && (
                      <span className="shrink-0 px-1 py-0.5 rounded text-[8px] uppercase tracking-wider font-bold bg-orange-100 text-orange-600 border border-orange-200">
                        Hidden
                      </span>
                    )}
                    {item.hasWarranty && (
                      <span className="shrink-0 px-1 py-0.5 rounded text-[8px] uppercase tracking-wider font-bold bg-blue-100 text-blue-600 border border-blue-200">
                        🛡️ Garansi
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 font-mono mt-1">
                    SKU: {item.sku}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {formatBranchName(item.branchName)}
                  </p>
                </div>
                <div className="text-right">
                  <div className="font-bold text-slate-900 text-sm">
                    {formatIDR(item.price)}
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1.5">
                  <select
                    value={effectiveStatus === "Dipesan" ? "Dipesan (DP)" : effectiveStatus}
                    onChange={(e) => handleStatusChange(item, e.target.value)}
                    className={`px-2 py-1 rounded-md text-[10px] uppercase tracking-wider font-bold border focus:outline-none focus:ring-2 cursor-pointer transition-all ${
                      effectiveStatus === "Tersedia"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : effectiveStatus === "Terjual"
                        ? "bg-slate-700 text-white border-slate-800"
                        : effectiveStatus === "RETUR"
                        ? "bg-rose-50 text-rose-700 border-rose-200"
                        : "bg-blue-50 text-blue-700 border-blue-200"
                    }`}
                  >
                    <option value="Tersedia">Tersedia</option>
                    <option value="Dipesan (DP)">Dipesan (DP)</option>
                    <option value="Terjual">Terjual</option>
                    {item.status === "RETUR" && <option value="RETUR">RETUR</option>}
                  </select>
                  
                  {overriddenStatuses[item.id] && (
                    <button
                      onClick={() => {
                        const local = overriddenStatuses[item.id];
                        setPrintInvoiceData({
                          item,
                          status: local.status,
                          customerName: local.customerName,
                          amount: local.status === "Dipesan (DP)" ? local.dpAmount : local.settlementAmount,
                          invoiceNo: local.invoiceNo,
                          timestamp: local.timestamp,
                        });
                      }}
                      className="p-1 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all border border-slate-200 min-h-[32px] min-w-[32px] flex items-center justify-center cursor-pointer"
                      title="Cetak Ulang E-Invoice"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              <div className="flex gap-1.5 items-center">
                {/* Hide/Show Toggle */}
                <button
                  onClick={() => handleToggleVisibility(item)}
                  className={`p-1.5 rounded-md transition-all min-h-[44px] min-w-[44px] flex items-center justify-center ${
                    item.isMarketplaceVisible
                      ? "text-slate-400 hover:text-orange-600 bg-slate-50"
                      : "text-orange-500 hover:text-emerald-600 bg-orange-50"
                  }`}
                >
                  {item.isMarketplaceVisible ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
                <Link
                  href={`/mbg-internal-portal/items/${item.id}`}
                  className="text-slate-400 hover:text-slate-700 p-1.5 bg-slate-50 rounded-md min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  <Printer className="w-4 h-4" />
                </Link>
                <Link
                  href={`/katalog/${item.id}`}
                  target="_blank"
                  className="text-slate-400 hover:text-slate-700 p-1.5 bg-slate-50 rounded-md min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  <ExternalLink className="w-4 h-4" />
                </Link>
                {/* Superadmin: Retur (redirect ke halaman retur baru) */}
                {isSuperAdmin && item.status === "Terjual" && (
                  <Link
                    href={`/mbg-internal-portal/retur/new?sku=${item.sku}`}
                    className="text-orange-500 hover:text-orange-700 p-1.5 bg-orange-50 rounded-md min-h-[44px] min-w-[44px] flex items-center justify-center"
                    title="Proses Retur Barang"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 15v-6a4 4 0 00-4-4H4m0 0l3-3m-3 3l3 3m1-3h8a4 4 0 014 4v6m-9 5h.01M12 12h.01" />
                    </svg>
                  </Link>
                )}
                {isSuperAdmin && (
                  <button
                    onClick={() => openEditForm(item)}
                    className="text-slate-400 hover:text-blue-600 p-1.5 bg-slate-50 rounded-md min-h-[44px] min-w-[44px] flex items-center justify-center"
                    disabled={loadingDetail}
                  >
                    {loadingDetail && selectedItem?.id === item.id ? (
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    ) : (
                      <Pencil className="w-4 h-4" />
                    )}
                  </button>
                )}
                {isSuperAdmin && (
                  <button
                    onClick={() => openDeleteModal(item)}
                    className="text-slate-400 hover:text-red-600 p-1.5 bg-slate-50 rounded-md min-h-[44px] min-w-[44px] flex items-center justify-center"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
        {paginatedItems.length === 0 && (
          <div className="py-8 text-center text-slate-500 bg-white border border-slate-200 rounded-xl shadow-sm">
            <PackageSearch className="w-10 h-10 mb-2 opacity-20 mx-auto" />
            <p className="text-sm">
              {searchQuery.trim()
                ? `Tidak ada barang.`
                : "Belum ada barang."}
            </p>
          </div>
        )}
      </div>

      {/* ═══════════ Pagination ═══════════ */}
      <PaginationBar />

      {/* ═══════════ DELETE MODAL ═══════════ */}
      {deleteModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => !actionLoading && setDeleteModalOpen(false)}
          />
          {/* Modal Card */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-red-200 animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="px-6 py-5 text-center">
              <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
                <ShieldAlert className="w-7 h-7 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                Hapus Barang?
              </h3>
              <p className="text-sm text-slate-500 mt-2">
                Anda akan menghapus barang ini secara permanen:
              </p>
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mt-3 text-left">
                <p className="text-sm font-bold text-red-900">
                  {selectedItem.title}
                </p>
                <p className="text-xs text-red-600 font-mono mt-1">
                  SKU: {selectedItem.sku}
                </p>
              </div>
              <p className="text-xs text-red-500 mt-3 font-medium">
                Aksi ini tidak dapat dibatalkan.
              </p>
            </div>
            {/* Footer */}
            <div className="flex items-center justify-center gap-3 px-6 py-4 border-t border-red-100 bg-red-50/30 rounded-b-2xl">
              <button
                onClick={() => setDeleteModalOpen(false)}
                disabled={actionLoading}
                className="px-4 py-2.5 min-h-[44px] text-sm font-medium text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-all disabled:opacity-50 bg-white border border-slate-200 flex items-center justify-center"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={actionLoading}
                className="flex items-center gap-2 px-5 py-2.5 min-h-[44px] text-sm font-semibold text-white bg-red-600 hover:bg-red-500 rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {actionLoading && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ E-INVOICE GENERATOR MODAL ═══════════ */}
      {invoiceModalData.isOpen && invoiceModalData.item && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 print:hidden">
          <div className="max-w-md w-full bg-white rounded-2xl p-6 shadow-2xl border border-slate-100 flex flex-col animate-in fade-in zoom-in-95 duration-150 text-slate-800">
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              Generate E-Invoice ({invoiceModalData.targetStatus})
            </h3>
            <p className="text-slate-500 text-xs mb-4">
              Masukkan detail transaksi untuk produk <span className="font-semibold text-slate-800">{invoiceModalData.item.title}</span> (SKU: {invoiceModalData.item.sku}).
            </p>

            <div className="space-y-4 text-left">
              {/* Buyer's Name */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Nama Pembeli <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={invoiceModalData.customerName}
                  onChange={(e) => setInvoiceModalData({ ...invoiceModalData, customerName: e.target.value })}
                  placeholder="Contoh: Budi Santoso"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm min-h-[44px]"
                />
              </div>

              {/* Down Payment Amount - Show only if "Dipesan (DP)" is active */}
              {invoiceModalData.targetStatus === "Dipesan (DP)" && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Jumlah Down Payment (DP) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">Rp</span>
                    <input
                      type="number"
                      required
                      value={invoiceModalData.dpAmount}
                      onChange={(e) => setInvoiceModalData({ ...invoiceModalData, dpAmount: e.target.value })}
                      placeholder="Contoh: 1000000"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3.5 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm min-h-[44px]"
                    />
                  </div>
                </div>
              )}

              {/* Full Payment Amount - Show only if "Terjual" is active */}
              {invoiceModalData.targetStatus === "Terjual" && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Jumlah Pembayaran Pelunasan <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">Rp</span>
                    <input
                      type="number"
                      required
                      value={invoiceModalData.settlementAmount}
                      onChange={(e) => setInvoiceModalData({ ...invoiceModalData, settlementAmount: e.target.value })}
                      placeholder="Contoh: 5000000"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3.5 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm min-h-[44px]"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="w-full grid grid-cols-2 gap-3 mt-6">
              <button
                type="button"
                onClick={() => setInvoiceModalData({ isOpen: false, item: null, targetStatus: "", customerName: "", dpAmount: "", settlementAmount: "" })}
                className="w-full py-2.5 rounded-xl font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all min-h-[44px] flex items-center justify-center cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={
                  !invoiceModalData.customerName.trim() ||
                  (invoiceModalData.targetStatus === "Dipesan (DP)" && !invoiceModalData.dpAmount) ||
                  (invoiceModalData.targetStatus === "Terjual" && !invoiceModalData.settlementAmount)
                }
                onClick={() => {
                  const item = invoiceModalData.item!;
                  const amount = invoiceModalData.targetStatus === "Dipesan (DP)" 
                    ? Number(invoiceModalData.dpAmount) 
                    : Number(invoiceModalData.settlementAmount);
                  
                  const now = new Date();
                  const year = now.getFullYear();
                  const randomTail = Math.floor(1000 + Math.random() * 9000);
                  const generatedInvoiceNo = `INV/MBG/${year}/${randomTail}`;
                  const formattedTimestamp = now.toLocaleString("id-ID", {
                    dateStyle: "medium",
                    timeStyle: "short"
                  });

                  // Update client status & details
                  updateLocalStatus(item.id, {
                    status: invoiceModalData.targetStatus,
                    customerName: invoiceModalData.customerName,
                    dpAmount: invoiceModalData.targetStatus === "Dipesan (DP)" ? amount : 0,
                    settlementAmount: invoiceModalData.targetStatus === "Terjual" ? amount : 0,
                    invoiceNo: generatedInvoiceNo,
                    timestamp: formattedTimestamp,
                  });

                  // Setup invoice print state
                  setPrintInvoiceData({
                    item,
                    status: invoiceModalData.targetStatus,
                    customerName: invoiceModalData.customerName,
                    amount,
                    invoiceNo: generatedInvoiceNo,
                    timestamp: formattedTimestamp,
                  });

                  // Close modal
                  setInvoiceModalData({ isOpen: false, item: null, targetStatus: "", customerName: "", dpAmount: "", settlementAmount: "" });
                }}
                className="w-full py-2.5 rounded-xl font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-100 transition-all min-h-[44px] flex items-center justify-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Generate & Print Invoice
              </button>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* ═══════════ E-INVOICE PRINTABLE DOCUMENT ═══════════ */}
      {printInvoiceData && (
        <div
          id="mbg-einvoice-print"
          className="hidden print:!block fixed inset-0 z-[9999] w-full min-h-screen bg-white p-0 m-0"
        >
          <div className="w-full max-w-[800px] mx-auto px-12 py-10 bg-white text-slate-900">
            {/* Header */}
            <div className="border-b-2 border-slate-900 pb-6 mb-8 flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900">
                  PT MAKMUR BERSAMA GADAI
                </h1>
                <p className="text-xs text-slate-600 font-semibold mt-1">
                  KANTOR CABANG: {printInvoiceData.item.branchName.toUpperCase()}
                </p>
                <p className="text-[10px] text-slate-500">
                  Layanan Penjaminan Resmi Gadai &amp; Marketplace Gadai Terpercaya
                </p>
              </div>
              <div className="text-right">
                <span className="inline-block px-3 py-1 bg-slate-900 text-white font-mono text-xs font-bold rounded">
                  E-INVOICE RESMI
                </span>
              </div>
            </div>

            {/* Metadata Block */}
            <div className="grid grid-cols-2 gap-6 mb-8 text-xs text-slate-800">
              <div>
                <p className="text-slate-500 font-bold uppercase tracking-wider mb-1">Diterbitkan Untuk:</p>
                <p className="font-bold text-slate-900 text-sm">{printInvoiceData.customerName.toUpperCase()}</p>
                <p className="text-slate-600">Pelanggan Cabang {printInvoiceData.item.branchName}</p>
              </div>
              <div className="text-right">
                <p className="text-slate-500 font-bold uppercase tracking-wider mb-1">Rincian Dokumen:</p>
                <p className="font-mono font-bold text-slate-900 text-sm">{printInvoiceData.invoiceNo}</p>
                <p className="text-slate-600">Tanggal: {printInvoiceData.timestamp}</p>
              </div>
            </div>

            {/* Table */}
            <table className="w-full text-left text-xs mb-10 border-collapse text-slate-800">
              <thead>
                <tr className="border-b border-slate-300 text-slate-500 font-bold">
                  <th className="py-3 pr-4">NAMA BARANG (SKU)</th>
                  <th className="py-3 px-4 text-right">HARGA ASLI</th>
                  <th className="py-3 px-4 text-center">JENIS PEMBAYARAN</th>
                  <th className="py-3 pl-4 text-right">JUMLAH DIBAYAR</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-200 text-slate-900 font-medium">
                  <td className="py-4 pr-4">
                    <p className="font-bold text-sm text-slate-900">{printInvoiceData.item.title}</p>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">SKU: {printInvoiceData.item.sku}</p>
                  </td>
                  <td className="py-4 px-4 text-right font-mono">
                    {formatIDR(printInvoiceData.item.price)}
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className={`px-2 py-0.5 rounded font-bold text-[9px] uppercase tracking-wider ${
                      printInvoiceData.status === "Dipesan (DP)"
                        ? "bg-blue-100 text-blue-800 border border-blue-200"
                        : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                    }`}>
                      {printInvoiceData.status === "Dipesan (DP)" ? "DOWN PAYMENT (DP)" : "PELUNASAN PENUH"}
                    </span>
                  </td>
                  <td className="py-4 pl-4 text-right font-bold text-sm font-mono">
                    {formatIDR(printInvoiceData.amount)}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Trust Clause Catatan Kaki */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-10 text-[10px] leading-relaxed text-slate-600">
              <h4 className="font-bold text-slate-900 text-xs mb-1.5 uppercase tracking-wider">
                Catatan Penting Penjaminan Transaksi:
              </h4>
              <p className="italic">
                {"\"Sesuai dengan regulasi penjaminan transaksi retail PT Makmur Bersama Gadai, seluruh transaksi pembayaran Down Payment (DP) maupun Pelunasan melalui metode Transfer Bank secara resmi dialihkan ke rekening internal: Bank BNI — No. Rekening: 1793056882 — a.n. Jaha Joel Situmorang selaku Kepala Toko Lelang Utama PT MBG Cabang Pasuruan Sangar. Dokumen ini sah sebagai bukti reservasi unit.\""}
              </p>
            </div>

            {/* Footer stamp and signature */}
            <div className="flex justify-between items-end mt-12 pt-6 border-t border-slate-100 text-slate-800">
              <div className="text-left text-[9px] text-slate-500">
                <p>Dokumen ini diterbitkan secara elektronik oleh sistem retail marketplace</p>
                <p className="font-bold font-mono mt-1">PT MAKMUR BERSAMA GADAI &copy; {new Date().getFullYear()}</p>
              </div>
              <div className="text-center w-52">
                <p className="text-[10px] text-slate-600 mb-1 font-semibold">
                  Kepala Cabang {printInvoiceData.item.branchName}
                </p>
                
                {/* Digital stamp placeholder */}
                <div className="my-3 flex justify-center items-center h-16 relative">
                  <div className="border-2 border-dashed border-blue-600 text-blue-600 text-[8px] font-black rounded-lg px-3 py-1.5 uppercase tracking-widest leading-none rotate-6 select-none opacity-80 scale-105">
                    <p className="border-b border-blue-600 pb-0.5 mb-0.5 font-bold">PT MBG APPROVED</p>
                    <p className="text-[7px]">DIGITAL SIGNATURE</p>
                  </div>
                </div>

                <div className="border-t border-slate-300 pt-1">
                  <p className="font-bold text-[10px] text-slate-900">MANAGER ON DUTY</p>
                  <p className="text-[9px] text-slate-500 font-mono">AUTHORIZED DIGITAL DOCUMENT</p>
                </div>
              </div>
            </div>
          </div>

          {/* Print-specific CSS: full isolation of invoice content */}
          <style
            dangerouslySetInnerHTML={{
              __html: `
                @media print {
                  /* Hide everything in the document */
                  body > * { display: none !important; }
                  body { background: white !important; margin: 0 !important; padding: 0 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }

                  /* Unhide the React root and all ancestors up to the invoice */
                  body > #__next,
                  body > #__next * { display: revert !important; }

                  /* But re-hide everything that is NOT the invoice */
                  aside, nav, [class*="print:!hidden"], [class*="print:hidden"] { display: none !important; }

                  /* Make the invoice visible and full-width */
                  #mbg-einvoice-print {
                    display: block !important;
                    position: fixed !important;
                    inset: 0 !important;
                    z-index: 99999 !important;
                    width: 100% !important;
                    min-height: 100vh !important;
                    background: white !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    overflow: visible !important;
                  }
                  #mbg-einvoice-print * {
                    visibility: visible !important;
                    color-adjust: exact !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                  }

                  /* A4 page layout */
                  @page {
                    size: A4 portrait;
                    margin: 10mm;
                  }
                }
              `,
            }}
          />
        </div>
      )}
    </>
  );
}
