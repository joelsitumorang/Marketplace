"use client";

import React, { useState, useEffect } from "react";
import { Package, ShieldCheck, RefreshCw, Gavel, AlertTriangle, Archive, Search, Lock, Loader2, DollarSign, Activity, BarChart3, CheckCircle, AlertCircle, Eye } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from "recharts";
import DatePicker from "@/components/DatePicker";

type TabType = "BARU" | "STOK_AKTIF" | "PERPANJANG" | "PROSES_LELANG" | "ETALASE_LELANG" | "ARSIP";
type ViewMode = "DASHBOARD" | "LIFECYCLE";

type Props = {
  dashboardData: {
    activeLoanCapital: number;
    netProfit: number;
    statusCounts: Record<string, number>;
  };
  lifecycleCounts: any;
  cashierName: string;
};

export default function UnifiedGudangClient({ dashboardData, lifecycleCounts, cashierName }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>("DASHBOARD");

  const [toast, setToast] = useState<{show: boolean, message: string, type: "success" | "error"}>({ show: false, message: "", type: "success" });
  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 3000);
  };

  // ==========================================
  // DASHBOARD STATE
  // ==========================================
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  const chartData = [
    { name: "Aktif", uv: dashboardData.statusCounts.AKTIF, color: "#10b981" },
    { name: "Perpanjang", uv: dashboardData.statusCounts.PERPANJANG, color: "#3b82f6" },
    { name: "Karantina", uv: dashboardData.statusCounts.PROSES_LELANG, color: "#f97316" },
    { name: "Etalase", uv: dashboardData.statusCounts.LELANG, color: "#a855f7" },
    { name: "Terjual", uv: dashboardData.statusCounts.TERJUAL, color: "#1e293b" },
    { name: "Tebus", uv: dashboardData.statusCounts.TEBUS, color: "#64748b" },
  ];

  const handleGlobalSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery) return;
    
    setIsSearching(true);
    setSearchError("");
    setSearchResult(null);

    try {
      const res = await fetch(`/api/admin/gudang/search?sku=${searchQuery}`);
      const json = await res.json();
      
      if (json.success) {
        setSearchResult(json.data);
      } else {
        setSearchError(json.message);
      }
    } catch (err: any) {
      setSearchError(err.message || "An error occurred");
    }
    setIsSearching(false);
  };

  // ==========================================
  // LIFECYCLE STATE
  // ==========================================
  const [activeTab, setActiveTab] = useState<TabType>("BARU");
  const [lifecycleData, setLifecycleData] = useState<any[]>([]);
  const [loadingLifecycle, setLoadingLifecycle] = useState(false);
  const [skuFilter, setSkuFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 50;

  useEffect(() => {
    setPage(1);
  }, [activeTab]);

  const [formBaru, setFormBaru] = useState({
    uniqueCode: "", itemName: "", category: "ELEKTRONIK", serialNumber: "", 
    description: "", customerName: "", customerPhone: "", appraisalValue: "",
    pawnEnteredAt: "",
    dueDate: ""
  });
  const [formattedAppraisalValue, setFormattedAppraisalValue] = useState("");

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    const due = new Date();
    due.setMonth(due.getMonth() + 1); // ELEKTRONIK default
    setFormBaru(prev => ({
      ...prev,
      pawnEnteredAt: today,
      dueDate: due.toISOString().split("T")[0]
    }));
  }, []);

  useEffect(() => {
    if (!formBaru.pawnEnteredAt) return;
    const date = new Date(formBaru.pawnEnteredAt);
    if (isNaN(date.getTime())) return;
    
    if (formBaru.category === "ELEKTRONIK") {
      date.setMonth(date.getMonth() + 1);
    } else if (formBaru.category === "GERABAHAN") {
      date.setMonth(date.getMonth() + 4);
    } else if (formBaru.category === "KENDARAAN") {
      date.setMonth(date.getMonth() + 2);
    } else {
      date.setMonth(date.getMonth() + 1);
    }
    
    const computedDue = date.toISOString().split("T")[0];
    if (computedDue !== formBaru.dueDate) {
      setFormBaru(prev => ({ ...prev, dueDate: computedDue }));
    }
  }, [formBaru.pawnEnteredAt, formBaru.category, formBaru.dueDate]);


  const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "");
    if (!val) {
      setFormattedAppraisalValue("");
      setFormBaru({ ...formBaru, appraisalValue: "" });
      return;
    }
    const formatted = new Intl.NumberFormat("id-ID").format(Number(val));
    setFormattedAppraisalValue(formatted);
    setFormBaru({ ...formBaru, appraisalValue: val });
  };

  const [isExtensionModalOpen, setExtensionModalOpen] = useState(false);
  const [extensionTarget, setExtensionTarget] = useState<any>(null);
  const [newUniqueCode, setNewUniqueCode] = useState("");
  const [extensionDate, setExtensionDate] = useState("");
  const [extensionFee, setExtensionFee] = useState("");

  const [isDetailModalOpen, setDetailModalOpen] = useState(false);
  const [detailTarget, setDetailTarget] = useState<any>(null);

  const [auctionPrepMode, setAuctionPrepMode] = useState(false);
  const [auctionPrepTarget, setAuctionPrepTarget] = useState<any>(null);
  const [auctionNotes, setAuctionNotes] = useState("");
  const [auctionSellingPrice, setAuctionSellingPrice] = useState("");
  const [formattedAuctionSellingPrice, setFormattedAuctionSellingPrice] = useState("");
  const [auctionImages, setAuctionImages] = useState("");

  const fetchLifecycleData = async (tab: TabType, currentPage: number) => {
    if (tab === "BARU") return;
    setLoadingLifecycle(true);
    setSkuFilter("");
    try {
      const skip = (currentPage - 1) * itemsPerPage;
      const res = await fetch(`/api/admin/gudang/lifecycle?tab=${tab}&limit=${itemsPerPage}&skip=${skip}`);
      const json = await res.json();
      if (json.success) {
        setLifecycleData(json.data);
        setTotalItems(json.total || 0);
      }
    } catch (e) {
      console.error(e);
    }
    setLoadingLifecycle(false);
  };

  useEffect(() => {
    if (viewMode === "LIFECYCLE") {
      fetchLifecycleData(activeTab, page);
    }
  }, [activeTab, viewMode, page]);

  const filteredLifecycleData = React.useMemo(() => {
    let data = lifecycleData;
    if (activeTab === "STOK_AKTIF") {
      data = data.filter(item => {
        const isExpired = item.endDate ? new Date(item.endDate) < new Date() : false;
        return !isExpired;
      });
    }
    if (!skuFilter) return data;
    return data.filter(item => item.uniqueCode.toLowerCase().includes(skuFilter.toLowerCase()));
  }, [lifecycleData, skuFilter, activeTab]);

  const handleCreateNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formBaru.customerPhone.startsWith("08")) {
      showToast("Nomor telepon harus diawali dengan '08'.", "error");
      return;
    }
    const res = await fetch("/api/admin/gudang/lifecycle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "CREATE_NEW", ...formBaru })
    });
    if (res.ok) {
      showToast("Barang berhasil didaftarkan!");
      const today = new Date().toISOString().split("T")[0];
      const due = new Date();
      due.setMonth(due.getMonth() + 1);
      setFormBaru({
        uniqueCode: "", itemName: "", category: "ELEKTRONIK", serialNumber: "", 
        description: "", customerName: "", customerPhone: "", appraisalValue: "",
        pawnEnteredAt: today,
        dueDate: due.toISOString().split("T")[0]
      });
      setFormattedAppraisalValue("");
    }
  };

  const handlePerpanjang = async () => {
    const res = await fetch("/api/admin/gudang/lifecycle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "PERPANJANG", contractId: extensionTarget.id, newUniqueCode, extensionDate, extensionFee })
    });
    if (res.ok) {
      if (activeTab === "PROSES_LELANG") {
        showToast("Kontrak Karantina Berhasil Diperpanjang!");
      } else {
        showToast("Kontrak berhasil diperpanjang!");
      }
      setExtensionModalOpen(false);
      fetchLifecycleData(activeTab, page);
    }
  };

  const handleTebus = async (id: string) => {
    if (!confirm("Konfirmasi proses tebus barang?")) return;
    const res = await fetch("/api/admin/gudang/lifecycle", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "TEBUS", contractId: id })
    });
    if (res.ok) {
      showToast("Barang berhasil ditebus!");
      fetchLifecycleData(activeTab, page);
    }
  };

  // Reset prep mode if navigating away from BARU tab
  useEffect(() => {
    if (activeTab !== "BARU") {
      setAuctionPrepMode(false);
      setAuctionPrepTarget(null);
    }
  }, [activeTab]);

  const handleAuctionSellingPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "");
    if (!val) {
      setFormattedAuctionSellingPrice("");
      setAuctionSellingPrice("");
      return;
    }
    const formatted = new Intl.NumberFormat("id-ID").format(Number(val));
    setFormattedAuctionSellingPrice(formatted);
    setAuctionSellingPrice(val);
  };

  const handlePostKatalogFromForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auctionSellingPrice) {
      showToast("Harga Jual Appraisal wajib diisi.", "error");
      return;
    }
    if (!auctionNotes) {
      showToast("Catatan Kondisi Fisik wajib diisi.", "error");
      return;
    }
    
    const imagesArray = auctionImages ? [auctionImages] : [];

    const res = await fetch("/api/admin/gudang/lifecycle", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        action: "POST_KATALOG", 
        contractId: auctionPrepTarget.id, 
        sellingPrice: auctionSellingPrice, 
        notes: auctionNotes,
        images: imagesArray
      })
    });
    if (res.ok) {
      showToast("Berhasil disiapkan untuk LELANG!");
      setAuctionPrepMode(false);
      setAuctionPrepTarget(null);
      setAuctionNotes("");
      setAuctionSellingPrice("");
      setFormattedAuctionSellingPrice("");
      setAuctionImages("");
      setActiveTab("ETALASE_LELANG");
    } else {
      showToast("Gagal memposting ke katalog lelang.", "error");
    }
  };

  const lifecycleTabs = [
    { id: "BARU", label: "TOTAL REGISTRASI", count: lifecycleCounts.totalBarangFisik, icon: Package, iconBg: "bg-slate-800", iconColor: "text-white" },
    { id: "STOK_AKTIF", label: "KONTRAK AKTIF", count: lifecycleCounts.totalAktif, icon: ShieldCheck, iconBg: "bg-emerald-100", iconColor: "text-emerald-700" },
    { id: "PERPANJANG", label: "DIPERPANJANG", count: lifecycleCounts.totalDiperpanjang, icon: RefreshCw, iconBg: "bg-blue-100", iconColor: "text-blue-700" },
    { id: "PROSES_LELANG", label: "KARANTINA GUDANG", count: lifecycleCounts.totalProsesLelang, icon: AlertTriangle, iconBg: "bg-orange-100", iconColor: "text-orange-700" },
    { id: "ETALASE_LELANG", label: "ETALASE KATALOG", count: lifecycleCounts.totalSiapLelang, icon: Gavel, iconBg: "bg-purple-100", iconColor: "text-purple-700" },
    { id: "ARSIP", label: "ARSIP LUNAS / TERJUAL", count: lifecycleCounts.totalLunas, icon: Archive, iconBg: "bg-slate-800", iconColor: "text-white" },
  ];

  return (
    <div className="space-y-6">
      
      {/* 2. SUB-HEADER INNER SWITCHER */}
      <div className="flex bg-slate-200/50 p-1.5 rounded-2xl w-fit mb-8 shadow-inner">
        <button
          onClick={() => setViewMode("DASHBOARD")}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
            viewMode === "DASHBOARD" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <BarChart3 size={18} /> Dashboard Analitik
        </button>
        <button
          onClick={() => setViewMode("LIFECYCLE")}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
            viewMode === "LIFECYCLE" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <Package size={18} /> Manajemen Siklus Barang
        </button>
      </div>

      {viewMode === "DASHBOARD" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          
          {/* Global SKU Search - Clean light mode */}
          {/*
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Global SKU Search</h2>
            <form onSubmit={handleGlobalSearch} className="flex gap-3">
              <div className="relative flex-1 max-w-xl">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-slate-400" />
                </div>
                <input 
                  type="text" 
                  placeholder="Masukkan SKU (contoh: BRG-001)..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
              </div>
              <button 
                type="submit" 
                disabled={isSearching}
                className="px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 shadow-md disabled:opacity-70 transition-colors flex items-center gap-2"
              >
                {isSearching && <Loader2 className="h-4 w-4 animate-spin" />}
                Cari Item
              </button>
            </form>

            {searchError && (
              <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 text-sm font-medium">
                {searchError}
              </div>
            )}

            {searchResult && (
              <div className="mt-6 p-5 border border-slate-200 rounded-xl bg-slate-50/50 flex flex-col md:flex-row gap-6">
                <div className="flex-1 space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">Item Name</p>
                    <p className="text-lg font-bold text-slate-900">{searchResult.physicalItem?.itemName}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase">SKU</p>
                      <p className="font-mono font-medium text-slate-700">{searchResult.uniqueCode}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase">Owner</p>
                      <p className="font-medium text-slate-700">{searchResult.customerName}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase">Status</p>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                        searchResult.status === 'TERJUAL' || searchResult.status === 'TEBUS' ? 'bg-slate-800 text-slate-100 border-slate-700' : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}>
                        {searchResult.status}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase">Location</p>
                      <p className="font-medium text-slate-700">{searchResult.physicalItem?.branchName}</p>
                    </div>
                  </div>
                </div>
                <div className="md:w-64 flex flex-col justify-center items-center bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                  <p className="text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Nilai Taksiran</p>
                  <p className="text-2xl font-black text-slate-900">
                    Rp {Number(searchResult.appraisalValue).toLocaleString('id-ID')}
                  </p>
                  {searchResult.status === 'TERJUAL' && searchResult.sellingPrice && (
                    <div className="mt-4 text-center pt-4 border-t border-slate-100 w-full">
                      <p className="text-xs font-bold text-emerald-600 mb-1 uppercase tracking-wider">Terjual Seharga</p>
                      <p className="text-lg font-bold text-emerald-700">
                        Rp {Number(searchResult.sellingPrice).toLocaleString('id-ID')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          */}

          {/* Interactive Graphics */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-6">Status Lifecycle Breakdown</h2>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 500}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 500}} />
                    <RechartsTooltip 
                      cursor={{fill: '#f8fafc'}}
                      contentStyle={{ borderRadius: '12px', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="uv" radius={[6, 6, 0, 0]} maxBarSize={50}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="flex flex-col gap-6">
              {/* Refactored Light Mode Financial Cards */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex-1 flex flex-col justify-center items-start relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 bg-blue-50 w-24 h-24 rounded-full opacity-50 group-hover:scale-110 transition-transform duration-500"></div>
                <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-4 relative z-10">
                  <Activity size={20} strokeWidth={2.5} />
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest relative z-10 mb-1">Active Loan Capital</p>
                <h3 className="text-3xl font-black text-slate-900 relative z-10 tracking-tight">
                  Rp {dashboardData.activeLoanCapital.toLocaleString('id-ID')}
                </h3>
                <p className="text-xs text-slate-500 mt-2 relative z-10 font-medium">
                  Total modal di barang aktif, perpanjang & karantina.
                </p>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex-1 flex flex-col justify-center items-start relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 bg-emerald-50 w-24 h-24 rounded-full opacity-50 group-hover:scale-110 transition-transform duration-500"></div>
                <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mb-4 relative z-10">
                  <DollarSign size={20} strokeWidth={2.5} />
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest relative z-10 mb-1">Cumulative Net Profit</p>
                <h3 className="text-3xl font-black text-slate-900 relative z-10 tracking-tight">
                  Rp {dashboardData.netProfit.toLocaleString('id-ID')}
                </h3>
                <p className="text-xs text-slate-500 mt-2 relative z-10 font-medium">
                  Total keuntungan penjualan lelang.
                </p>
              </div>
            </div>

          </div>

        </div>
      )}

      {viewMode === "LIFECYCLE" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          
          {/* 6-CARD METRICS ROW */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {lifecycleTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <div 
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`bg-white rounded-2xl p-5 cursor-pointer shadow-sm border transition-all duration-200 ${
                    isActive ? "border-blue-500 ring-2 ring-blue-500/50 transform -translate-y-1" : "border-slate-100 hover:border-slate-300 hover:shadow"
                  }`}
                >
                  <div className="flex flex-col gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tab.iconBg} ${tab.iconColor}`}>
                      <Icon size={20} strokeWidth={2.5} />
                    </div>
                    <div>
                      <h3 className="text-3xl font-black text-slate-900">{tab.count}</h3>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">{tab.label}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden min-h-[500px]">
            
            {/* TAB 1: TOTAL REGISTRASI (Form) */}
            {activeTab === "BARU" && (
              <div className="p-8">
                <div className="mb-8 border-b border-slate-100 pb-4">
                  <h2 className="text-xl font-bold text-slate-900">
                    {auctionPrepMode ? "Siapkan Barang Lelang" : "Registrasi Barang Baru"}
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    {auctionPrepMode 
                      ? "Lengkapi detail appraisal, kondisi fisik, dan foto barang untuk diposting ke katalog lelang."
                      : "Daftarkan barang fisik baru dan buat kontrak gadai pertama."}
                  </p>
                </div>
                
                <form onSubmit={auctionPrepMode ? handlePostKatalogFromForm : handleCreateNew} className="max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  
                  {/* Row 1: SKU & Nama Item */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-800">SKU / Kode Unik <span className="text-red-500">*</span></label>
                    <input 
                      required 
                      disabled={auctionPrepMode}
                      placeholder="Contoh: BRG-001" 
                      className="w-full border border-slate-200 text-slate-900 placeholder-slate-400 p-3.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-mono disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed" 
                      value={formBaru.uniqueCode} 
                      onChange={e => setFormBaru({...formBaru, uniqueCode: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-800">Nama Item <span className="text-red-500">*</span></label>
                    <input 
                      required 
                      disabled={auctionPrepMode}
                      placeholder="Contoh: Laptop Asus ROG" 
                      className="w-full border border-slate-200 text-slate-900 placeholder-slate-400 p-3.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed" 
                      value={formBaru.itemName} 
                      onChange={e => setFormBaru({...formBaru, itemName: e.target.value})} 
                    />
                  </div>

                  {/* Row 2: Kategori & Serial Number */}
                  <div className="space-y-2 relative">
                    <label className="block text-sm font-semibold text-slate-800">Kategori <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <select 
                        disabled={auctionPrepMode}
                        className="w-full border border-slate-200 text-slate-900 p-3.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none bg-white font-medium cursor-pointer pr-10 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed" 
                        value={formBaru.category} 
                        onChange={e => setFormBaru({...formBaru, category: e.target.value})}
                      >
                        <option value="ELEKTRONIK">ELEKTRONIK (+1 Bulan Jatuh Tempo)</option>
                        <option value="GERABAHAN">GERABAHAN (+4 Bulan Jatuh Tempo)</option>
                        <option value="KENDARAAN">KENDARAAN (+2 Bulan Jatuh Tempo)</option>
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-slate-500">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-800">Serial Number</label>
                    <input 
                      disabled={auctionPrepMode}
                      placeholder="SN / IMEI (Opsional)" 
                      className="w-full border border-slate-200 text-slate-900 placeholder-slate-400 p-3.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-mono disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed" 
                      value={formBaru.serialNumber} 
                      onChange={e => setFormBaru({...formBaru, serialNumber: e.target.value})} 
                    />
                  </div>

                  {/* Row 3: Nama Customer & Nomor Telepon */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-800">Nama Customer <span className="text-red-500">*</span></label>
                    <input 
                      required 
                      disabled={auctionPrepMode}
                      placeholder="Nama lengkap sesuai KTP" 
                      className="w-full border border-slate-200 text-slate-900 placeholder-slate-400 p-3.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed" 
                      value={formBaru.customerName} 
                      onChange={e => setFormBaru({...formBaru, customerName: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-800">Nomor Telepon <span className="text-red-500">*</span></label>
                    <input 
                      required 
                      disabled={auctionPrepMode}
                      maxLength={15} 
                      placeholder="08..." 
                      className="w-full border border-slate-200 text-slate-900 placeholder-slate-400 p-3.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-mono disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed" 
                      value={formBaru.customerPhone} 
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, "");
                        setFormBaru({...formBaru, customerPhone: val});
                      }} 
                    />
                  </div>

                  {/* Row 4: Nilai Pinjaman & Tanggal Masuk Gudang / Nota */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-800">Nilai Pinjaman (Rp) <span className="text-red-500">*</span></label>
                    <input 
                      required 
                      disabled={auctionPrepMode}
                      type="text" 
                      placeholder="0" 
                      className="w-full border border-slate-200 text-slate-900 placeholder-slate-400 p-3.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-mono font-medium disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed" 
                      value={formattedAppraisalValue} 
                      onChange={handleCurrencyChange} 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-800">Tanggal Masuk Gudang / Nota <span className="text-red-500">*</span></label>
                    <DatePicker 
                      disabled={auctionPrepMode}
                      value={formBaru.pawnEnteredAt} 
                      onChange={(date) => setFormBaru({...formBaru, pawnEnteredAt: date})}
                    />
                  </div>

                  {/* Row 5: Nama Cabang */}
                  <div className="space-y-2 col-span-1 md:col-span-2">
                    <label className="block text-sm font-semibold text-slate-800 flex items-center gap-2">
                      Nama Cabang <Lock size={14} className="text-slate-400"/>
                    </label>
                    <div className="w-full border border-slate-200 bg-slate-50 text-slate-500 p-3.5 rounded-lg font-medium flex items-center h-[52px]">
                      Cabang Pasuruan - Sangar
                    </div>
                  </div>

                  {/* Auction Preparation Additional Fields */}
                  {auctionPrepMode && (
                    <>
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-slate-800">Catatan Kondisi Fisik <span className="text-red-500">*</span></label>
                        <textarea 
                          required 
                          placeholder="Deskripsikan minus atau kelengkapan..." 
                          className="w-full border border-slate-200 text-slate-900 p-3.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all min-h-[100px]" 
                          value={auctionNotes} 
                          onChange={e => setAuctionNotes(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-slate-800">Harga Jual Appraisal (Rp) <span className="text-red-500">*</span></label>
                        <input 
                          required 
                          placeholder="Contoh: 1.500.000" 
                          className="w-full border border-slate-200 text-slate-900 placeholder-slate-400 p-3.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-mono font-medium" 
                          value={formattedAuctionSellingPrice} 
                          onChange={handleAuctionSellingPriceChange} 
                        />
                      </div>
                      <div className="space-y-2 col-span-1 md:col-span-2">
                        <label className="block text-sm font-semibold text-slate-800">Foto Barang / Asset (URL)</label>
                        <input 
                          placeholder="Contoh: https://images.unsplash.com/photo-1588508065123-287b28e013da..." 
                          className="w-full border border-slate-200 text-slate-900 placeholder-slate-400 p-3.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-mono" 
                          value={auctionImages} 
                          onChange={e => setAuctionImages(e.target.value)} 
                        />
                      </div>
                    </>
                  )}

                  <div className="col-span-1 md:col-span-2 pt-6 border-t border-slate-100 flex gap-3">
                    {auctionPrepMode ? (
                      <>
                        <button 
                          type="submit" 
                          className="px-8 py-3.5 bg-amber-600 text-white font-bold rounded-lg shadow-md hover:bg-amber-700 hover:shadow-lg transition-all focus:ring-2 focus:ring-offset-2 focus:ring-amber-600"
                        >
                          Posting ke Katalog Lelang
                        </button>
                        <button 
                          type="button" 
                          onClick={() => {
                            setAuctionPrepMode(false);
                            setAuctionPrepTarget(null);
                            setActiveTab("PROSES_LELANG");
                          }}
                          className="px-8 py-3.5 bg-slate-100 text-slate-600 font-bold rounded-lg hover:bg-slate-200 transition-all"
                        >
                          Batal
                        </button>
                      </>
                    ) : (
                      <button type="submit" className="px-8 py-3.5 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700 hover:shadow-lg transition-all focus:ring-2 focus:ring-offset-2 focus:ring-blue-600">
                        Simpan Kontrak Baru
                      </button>
                    )}
                  </div>
                </form>
              </div>
            )}

            {/* TAB 5: ETALASE KATALOG (Grid Layout) */}
            {activeTab === "ETALASE_LELANG" && (
              <div className="p-8">
                <div className="mb-6 flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Etalase Katalog Publik</h2>
                    <p className="text-sm text-slate-500">Barang yang sedang live di marketplace.</p>
                  </div>
                </div>

                {loadingLifecycle ? (
                  <div className="p-12 text-center text-slate-500 flex justify-center items-center gap-3">
                    <RefreshCw className="animate-spin text-slate-400" /> Memuat katalog...
                  </div>
                ) : filteredLifecycleData.length === 0 ? (
                  <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl">
                    <Package className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                    <p className="text-slate-500 font-medium">Etalase kosong.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {filteredLifecycleData.map(item => (
                      <div key={item.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden hover:shadow-xl hover:border-slate-200 shadow-sm transition-all group flex flex-col">
                        <div className="aspect-[4/3] bg-slate-100 relative overflow-hidden">
                          <img 
                            src={item.physicalItem?.images?.[0] || "https://images.unsplash.com/photo-1588508065123-287b28e013da?auto=format&fit=crop&w=800&q=80"} 
                            alt={item.physicalItem?.itemName}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute top-3 left-3 bg-white/95 backdrop-blur text-xs font-bold px-2 py-1 rounded-md text-slate-800 shadow-sm">
                            {item.physicalItem?.category}
                          </div>
                        </div>
                        <div className="p-4 flex flex-col flex-1">
                          <p className="text-xs font-mono text-slate-500 mb-1">SKU: {item.uniqueCode}</p>
                          <h3 className="font-bold text-slate-900 line-clamp-2 leading-tight mb-2 flex-1">
                            {item.physicalItem?.itemName}
                          </h3>
                          <div className="pt-3 border-t border-slate-100 mt-2">
                            <p className="text-[10px] text-slate-500 uppercase font-semibold mb-0.5">Harga Jual Appraisal</p>
                            <p className="text-lg font-black text-blue-600">
                              Rp {Number(item.sellingPrice).toLocaleString('id-ID')}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* OTHER DATA TABLES (Tabs 2, 3, 4, 6) */}
            {activeTab !== "BARU" && activeTab !== "ETALASE_LELANG" && (
              <div className="flex flex-col h-full">
                
                {/* Filter Bar for Active Tab */}
                {/*
                {activeTab === "STOK_AKTIF" && (
                  <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                    <Search className="text-slate-400 h-5 w-5 ml-2" />
                    <input 
                      type="text" 
                      placeholder="Cari SKU di stok aktif..." 
                      className="bg-transparent border-none focus:ring-0 text-sm w-full font-mono text-slate-700 placeholder-slate-400"
                      value={skuFilter}
                      onChange={(e) => setSkuFilter(e.target.value)}
                    />
                  </div>
                )}
                */}

                <div className="overflow-x-auto">
                  {loadingLifecycle ? (
                    <div className="p-12 text-center text-slate-500 flex justify-center items-center gap-3">
                      <RefreshCw className="animate-spin text-slate-400" /> Memuat data...
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse min-w-max">
                      <thead>
                        <tr className="border-b border-slate-100 bg-white">
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">SKU</th>
                          {activeTab === "PERPANJANG" && <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Previous SKU</th>}
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Item Name</th>
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Customer</th>
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Due Date</th>
                          {activeTab === "PERPANJANG" && <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Ext Count</th>}
                          {activeTab === "ARSIP" && <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Net Profit</th>}
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                          {activeTab !== "PERPANJANG" && <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {filteredLifecycleData.map(row => (
                          <tr key={row.id} className="hover:bg-slate-50/80 transition-colors group">
                            <td className="p-4 font-mono text-sm font-semibold text-slate-700">{row.uniqueCode}</td>
                            {activeTab === "PERPANJANG" && <td className="p-4 font-mono text-sm text-slate-400">{row.previousSku || "-"}</td>}
                            <td className="p-4 text-sm font-bold text-slate-900">{row.physicalItem?.itemName}</td>
                            <td className="p-4 text-sm text-slate-600">{row.customerName}</td>
                            <td className="p-4 text-sm text-slate-600">{row.endDate ? new Date(row.endDate).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' }) : "-"}</td>
                            {activeTab === "PERPANJANG" && <td className="p-4 text-sm text-slate-600">Ext: {row.extensionCount}</td>}
                            {activeTab === "ARSIP" && (
                              <td className="p-4 text-sm font-black text-emerald-600">
                                {row.status === 'TERJUAL' && row.sellingPrice 
                                  ? `+ Rp ${(row.sellingPrice - row.appraisalValue).toLocaleString('id-ID')}` 
                                  : "-"}
                              </td>
                            )}
                            <td className="p-4">
                              {row.status === 'TERJUAL' || row.status === 'TEBUS' ? (
                                <div className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-black tracking-widest bg-slate-900 text-white shadow-sm">
                                  [ {row.status} ]
                                </div>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border bg-blue-50 text-blue-700 border-blue-200">
                                  {row.status}
                                </span>
                              )}
                            </td>
                            {activeTab !== "PERPANJANG" && (
                              <td className="p-4 text-right flex items-center justify-end">
                                <button
                                  onClick={() => { setDetailTarget(row); setDetailModalOpen(true); }}
                                  className="inline-flex items-center justify-center p-1.5 text-slate-500 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors mr-2"
                                  title="Detail Kontrak"
                                >
                                  <Eye size={16} />
                                </button>
                                {activeTab === "STOK_AKTIF" && (
                                  <div className="flex gap-2">
                                    <button
                                      disabled={row.endDate ? new Date(row.endDate) > new Date() : false}
                                      onClick={() => { setExtensionTarget(row); setExtensionModalOpen(true); }}
                                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors border ${
                                        row.endDate && new Date(row.endDate) > new Date()
                                          ? "bg-slate-100 text-slate-400 border-none cursor-not-allowed"
                                          : "text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border-indigo-200"
                                      }`}
                                    >
                                      Perpanjang
                                    </button>
                                    <button onClick={() => handleTebus(row.id)} className="px-3 py-1.5 text-xs font-bold rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors border border-emerald-200">Tebus</button>
                                  </div>
                                )}
                                {activeTab === "PROSES_LELANG" && (
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => { setExtensionTarget(row); setExtensionModalOpen(true); }}
                                      className="px-3 py-1.5 text-xs font-bold rounded-lg text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors border border-indigo-200"
                                    >
                                      Perpanjang
                                    </button>
                                    <button 
                                      onClick={() => { 
                                        setAuctionPrepTarget(row);
                                        setAuctionPrepMode(true);
                                        setFormBaru({
                                          uniqueCode: row.uniqueCode || "",
                                          itemName: row.physicalItem?.itemName || "",
                                          category: row.physicalItem?.category || "ELEKTRONIK",
                                          serialNumber: row.physicalItem?.serialNumber || "",
                                          description: row.physicalItem?.description || "",
                                          customerName: row.customerName || "",
                                          customerPhone: row.customerPhone || "",
                                          appraisalValue: String(row.appraisalValue) || "",
                                          pawnEnteredAt: row.startDate ? row.startDate.split("T")[0] : "",
                                          dueDate: row.endDate ? row.endDate.split("T")[0] : ""
                                        });
                                        setFormattedAppraisalValue(row.appraisalValue ? new Intl.NumberFormat("id-ID").format(Number(row.appraisalValue)) : "");
                                        setAuctionNotes(row.notes || "");
                                        setAuctionSellingPrice(row.sellingPrice ? String(row.sellingPrice) : "");
                                        setFormattedAuctionSellingPrice(row.sellingPrice ? new Intl.NumberFormat("id-ID").format(Number(row.sellingPrice)) : "");
                                        setAuctionImages(row.physicalItem?.images?.[0] || "");
                                        setActiveTab("BARU");
                                      }} 
                                      className="px-4 py-2 text-xs font-bold rounded-lg text-white bg-amber-600 hover:bg-amber-700 transition-colors shadow-sm"
                                    >
                                      Siapkan Lelang
                                    </button>
                                  </div>
                                )}
                                {activeTab === "ARSIP" && (
                                   <div className="text-right">
                                     <p className="text-[10px] text-slate-400 font-semibold uppercase">{row.cashierName || cashierName}</p>
                                     <p className="text-xs text-slate-500 font-mono mt-0.5">{row.soldAt ? new Date(row.soldAt).toLocaleString('id-ID') : ""}</p>
                                   </div>
                                )}
                              </td>
                            )}
                          </tr>
                        ))}
                        {filteredLifecycleData.length === 0 && (
                          <tr><td colSpan={8} className="p-12 text-center text-sm text-slate-500">Tidak ada data ditemukan.</td></tr>
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
                {filteredLifecycleData.length > 0 && (
                  <div className="flex justify-between items-center px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                    <span className="text-xs text-slate-500 font-medium">
                      Menampilkan {filteredLifecycleData.length} data (Total: {totalItems} data)
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={page === 1}
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                      >
                        Sebelumnya
                      </button>
                      <button
                        type="button"
                        disabled={page * itemsPerPage >= totalItems}
                        onClick={() => setPage(p => p + 1)}
                        className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                      >
                        Berikutnya
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODALS */}
      {/* MODAL 1: Perpanjang Kontrak */}
      {isExtensionModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl w-full max-w-md shadow-2xl border border-slate-100">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Perpanjang Kontrak</h3>
            <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2 text-sm text-slate-700">
              <p>SKU Lama: <span className="font-mono font-bold">{extensionTarget?.uniqueCode}</span></p>
              <p>Customer: <span className="font-bold">{extensionTarget?.customerName}</span></p>
              <p>Item: <span className="font-semibold">{extensionTarget?.physicalItem?.itemName}</span></p>
              <p>Nilai Pinjaman: <span className="font-bold text-blue-600">Rp {Number(extensionTarget?.appraisalValue).toLocaleString('id-ID')}</span></p>
            </div>
            
            <div className="space-y-4 mb-6">
              <div className="space-y-1">
                <label className="block text-sm font-semibold text-slate-800">Input Nomor SKU Baru <span className="text-red-500">*</span></label>
                <input required placeholder="SKU Kontrak Baru" className="w-full border border-slate-200 text-slate-900 font-mono p-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all bg-slate-50" value={newUniqueCode} onChange={e => setNewUniqueCode(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-semibold text-slate-800">Tanggal Perpanjang <span className="text-red-500">*</span></label>
                <input required type="date" className="w-full border border-slate-200 text-slate-900 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all" value={extensionDate} onChange={e => setExtensionDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-semibold text-slate-800">Biaya Perpanjangan (Rp) <span className="text-red-500">*</span></label>
                <input required type="number" placeholder="0" className="w-full border border-slate-200 text-slate-900 font-mono p-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all" value={extensionFee} onChange={e => setExtensionFee(e.target.value)} />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => setExtensionModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">Batal</button>
              <button onClick={handlePerpanjang} className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-md transition-colors">Simpan Perpanjangan</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Detail Kontrak */}
      {isDetailModalOpen && detailTarget && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl w-full max-w-lg shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6 pb-3 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-900">
                Detail Kontrak Gadai - SKU {detailTarget.uniqueCode}
              </h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 col-span-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nama Item</p>
                <p className="font-bold text-slate-800 mt-0.5">{detailTarget.physicalItem?.itemName || "-"}</p>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kategori</p>
                <p className="font-semibold text-slate-800 mt-0.5">{detailTarget.physicalItem?.category || "-"}</p>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Serial Number</p>
                <p className="font-mono text-sm font-semibold text-slate-800 mt-0.5">{detailTarget.physicalItem?.serialNumber || "-"}</p>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nama Customer</p>
                <p className="font-semibold text-slate-800 mt-0.5">{detailTarget.customerName || "-"}</p>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nomor Telepon</p>
                <p className="font-mono text-sm font-semibold text-slate-800 mt-0.5">{detailTarget.customerPhone || "-"}</p>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nilai Pinjaman (Rp)</p>
                <p className="font-bold text-blue-600 mt-0.5">
                  Rp {Number(detailTarget.appraisalValue).toLocaleString('id-ID')}
                </p>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Jumlah Perpanjangan</p>
                <p className="font-semibold text-slate-800 mt-0.5">Ext: {detailTarget.extensionCount}</p>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tanggal Masuk</p>
                <p className="font-semibold text-slate-800 mt-0.5">
                  {detailTarget.startDate ? new Date(detailTarget.startDate).toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' }) : "-"}
                </p>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Due Date</p>
                <p className="font-semibold text-slate-800 mt-0.5">
                  {detailTarget.endDate ? new Date(detailTarget.endDate).toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' }) : "-"}
                </p>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 col-span-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nama Cabang</p>
                <p className="font-semibold text-slate-800 mt-0.5">
                  {detailTarget.physicalItem?.branchName && detailTarget.physicalItem.branchName.includes("Pasuruan")
                    ? "Cabang Pasuruan - Sangar"
                    : (detailTarget.physicalItem?.branchName || "Cabang Pasuruan - Sangar")}
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button 
                onClick={() => setDetailModalOpen(false)} 
                className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION */}
      <div 
        className={`fixed top-5 right-5 z-50 transition-all duration-500 transform ${
          toast.show ? "translate-x-0 opacity-100" : "translate-x-full opacity-0 pointer-events-none"
        }`}
      >
        <div className="bg-white border border-slate-100 rounded-xl shadow-md p-4 flex items-center gap-3">
          {toast.type === "success" ? (
            <div className="bg-green-50 text-green-500 rounded-full p-1.5 flex-shrink-0">
              <CheckCircle size={20} strokeWidth={2.5} />
            </div>
          ) : (
            <div className="bg-red-50 text-red-500 rounded-full p-1.5 flex-shrink-0">
              <AlertCircle size={20} strokeWidth={2.5} />
            </div>
          )}
          <p className="text-sm font-bold text-slate-800">{toast.message}</p>
        </div>
      </div>

    </div>
  );
}
