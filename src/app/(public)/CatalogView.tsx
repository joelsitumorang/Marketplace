"use client";
import type { AuctionItem } from '@prisma/client';

import { useState, useEffect, useMemo, useRef, useCallback, Suspense } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import SearchBar from "@/components/SearchBar";

import { 
  LayoutGrid, 
  Laptop, 
  Gem, 
  Car, 
  Watch, 
  Shirt, 
  Package, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  MessageCircle,
  MapPin,
  PlayCircle,
  Flame,
  Wrench,
  Home
} from "lucide-react";

type CatalogViewProps = {
  items: AuctionItem[];
  categories: { category: string }[];
  branches: { branchName: string }[];
  branchFilter?: string;
  initialCategory: string;
  initialSearchQuery: string;
};

const getCategoryIcon = (categoryName: string) => {
  const name = categoryName.toLowerCase();
  if (name.includes("semua")) return <LayoutGrid className="w-4 h-4" />;
  if (name.includes("elektronik") || name.includes("hp") || name.includes("laptop")) return <Laptop className="w-4 h-4" />;
  if (name.includes("otomotif") || name.includes("motor") || name.includes("mobil") || name.includes("kendaraan")) return <Car className="w-4 h-4" />;
  if (name.includes("tukang") || name.includes("perkakas") || name.includes("bengkel")) return <Wrench className="w-4 h-4" />;
  if (name.includes("pakaian") || name.includes("fashion") || name.includes("baju")) return <Shirt className="w-4 h-4" />;
  if (name.includes("rumah tangga") || name.includes("perabot") || name.includes("dapur")) return <Home className="w-4 h-4" />;
  return <Package className="w-4 h-4" />;
};

export default function CatalogView({
  items,
  categories,
  branches,
  branchFilter,
  initialCategory,
  initialSearchQuery,
}: CatalogViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [selectedItem, setSelectedItem] = useState<AuctionItem | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [modalVariants, setModalVariants] = useState<AuctionItem[]>([]);

  // Pagination states
  const [loadedItems, setLoadedItems] = useState<AuctionItem[]>(items);
  const [skip, setSkip] = useState(items.length);
  const [hasMore, setHasMore] = useState(items.length >= 20);
  const [loading, setLoading] = useState(false);
  const isInitialRef = useRef(true);


  // Sync state with props
  useEffect(() => {
    setActiveCategory(initialCategory);
    setSearchQuery(initialSearchQuery);
  }, [initialCategory, initialSearchQuery]);

  useEffect(() => {
    setLoadedItems(items);
    setSkip(items.length);
    setHasMore(items.length >= 20);
    setLoading(false); // Make sure to turn off loading when new props arrive
  }, [items]);

  // Client-side cache for query results
  const cacheRef = useRef<{
    [key: string]: {
      data: AuctionItem[];
      skip: number;
      hasMore: boolean;
    };
  }>({
    "Semua Kategori::": {
      data: items,
      skip: items.length,
      hasMore: items.length >= 20,
    },
  });

  const observerRef = useRef<HTMLDivElement | null>(null);
  const prevCategoryRef = useRef(activeCategory);

  // Removed client-side filter-fetching useEffect since category and search changes are debounced & processed via Server Component routing.

  const handleLoadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", "20");
      params.set("skip", skip.toString());
      if (activeCategory !== "Semua Kategori") {
        params.set("category", activeCategory);
      }
      if (searchQuery) {
        params.set("q", searchQuery);
      }

      const res = await fetch(`/api/items?${params.toString()}`);
      const result = await res.json();
      if (result.success) {
        const cacheKey = `${activeCategory}::${searchQuery}`;
        const newItems = [...loadedItems, ...result.data];
        const newSkip = skip + result.data.length;
        const newHasMore = result.hasMore;

        // Update query cache for this filter
        cacheRef.current[cacheKey] = {
          data: newItems,
          skip: newSkip,
          hasMore: newHasMore,
        };

        setLoadedItems(newItems);
        setSkip(newSkip);
        setHasMore(newHasMore);
      }
    } catch (err) {
      console.error("Error loading more items:", err);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, skip, activeCategory, searchQuery, loadedItems]);

  // Intersection Observer for scroll triggers
  useEffect(() => {
    if (!hasMore || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          handleLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerRef.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, loading, handleLoadMore]);

  const displayedItems = loadedItems;

  const handleCategoryClick = (category: string) => {
    if (category === activeCategory) return;
    
    // Instantly reset states to prevent leaking
    setActiveCategory(category);
    setLoadedItems([]);
    setSkip(0);
    setHasMore(false);
    setLoading(true);
    
    const params = new URLSearchParams(window.location.search);
    if (category === "Semua Kategori") {
      params.delete("category");
    } else {
      params.set("category", category);
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const formatIDR = (val: any) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(Number(val));
  };

  const openModal = async (item: AuctionItem) => {
    setSelectedItem(item);
    setCurrentImageIndex(0);
    setIsVideoPlaying(false);
    setModalVariants([]);
    document.body.style.overflow = "hidden";

    const nomInduk = (item as any).nomorInduk;
    if (nomInduk) {
      try {
        const res = await fetch(`/api/items?nomorInduk=${nomInduk}`);
        const data = await res.json();
        if (data.success && data.data) {
          const list = [...data.data];
          if (!list.some(v => v.id === item.id)) {
            list.unshift(item);
          }
          setModalVariants(list);
        }
      } catch (err) {
        console.error("Gagal memuat varian item:", err);
      }
    }
  };

  const closeModal = () => {
    setSelectedItem(null);
    setModalVariants([]);
    setIsVideoPlaying(false);
    document.body.style.overflow = "auto";
  };

  const extractYoutubeId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const youtubeId = selectedItem ? extractYoutubeId(selectedItem.youtubeUrl || (selectedItem as any).video_url || "") : null;
  const youtubeEmbedUrl = youtubeId ? `https://www.youtube.com/embed/${youtubeId}` : null;

  const slides = useMemo(() => {
    if (!selectedItem) return [];
    const list: Array<{ type: "video" | "image"; url: string }> = [];
    if (youtubeEmbedUrl) {
      list.push({ type: "video", url: youtubeEmbedUrl });
    }
    const varImgUrl = (selectedItem as any).variantImageUrl;
    if (varImgUrl) {
      list.push({ type: "image", url: varImgUrl });
    } else if (selectedItem.images && selectedItem.images.length > 0) {
      selectedItem.images.forEach((img) => {
        list.push({ type: "image", url: img });
      });
    } else {
      list.push({ type: "image", url: "https://placehold.co/800x600/1a1a2e/e0e0e0?text=Tanpa+Gambar" });
    }
    return list;
  }, [selectedItem, youtubeEmbedUrl]);

  const defectText = selectedItem ? (selectedItem.defects || (selectedItem as any).minus || (selectedItem as any).defect) : null;

  const handleSlideChange = (newIndex: number) => {
    setCurrentImageIndex(newIndex);
    setIsVideoPlaying(false);
  };

  return (
    <>
      {/* Top Header Gradient Block (The Yellow Box Region) */}
      <div className="w-full bg-gradient-to-b from-[#1e3a8a] to-[#122557] text-white pt-14 pb-20 relative z-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Header title & desc */}
          <div className="mb-8 text-center sm:text-left">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white mb-2.5">
              Katalog <span className="text-blue-300">MBG</span>
            </h1>
            <p className="text-xs sm:text-base text-blue-100 max-w-2xl font-medium leading-relaxed">
              Temukan barang preloved & lelang terbaik dari seluruh cabang kami.
            </p>
          </div>

          {/* Search Bar - Moved to the middle of the box! */}
          <div className="mb-10 w-full flex justify-center">
            <Suspense fallback={<div className="w-full max-w-2xl h-14 bg-white/10 rounded-2xl animate-pulse"></div>}>
              <SearchBar />
            </Suspense>
          </div>

          {/* Category Filter Tabs */}
          <div className="space-y-3">
            <h2 className="text-[10px] font-bold text-blue-200 uppercase tracking-wider">Kategori</h2>
            <div className="flex flex-row overflow-x-auto gap-3 pb-3 whitespace-nowrap scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <button
                onClick={() => handleCategoryClick("Semua Kategori")}
                className={`flex-shrink-0 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                  activeCategory === "Semua Kategori"
                    ? "bg-[#2563eb] text-white font-extrabold shadow-md border-0"
                    : "bg-white/10 text-white/95 border border-white/10 hover:bg-white/20 backdrop-blur-md"
                }`}
              >
                {getCategoryIcon("Semua Kategori")} <span>Semua</span>
              </button>
              {["Elektronik", "Gerabahan", "Kendaraan", "Alat Tukang", "Pakaian", "Alat Rumah Tangga"].map((catName) => {
                const matchedDbCat = categories.find(c => c.category.toLowerCase() === catName.toLowerCase())?.category || catName;
                const isActive = activeCategory.toLowerCase() === matchedDbCat.toLowerCase();
                return (
                  <button
                    key={catName}
                    onClick={() => handleCategoryClick(matchedDbCat)}
                    className={`flex-shrink-0 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                      isActive
                        ? "bg-[#2563eb] text-white font-extrabold shadow-md border-0"
                        : "bg-white/10 text-white/95 border border-white/10 hover:bg-white/20 backdrop-blur-md"
                    }`}
                    title={catName}
                  >
                    {getCategoryIcon(catName)} <span>{catName}</span>
                  </button>
                );
              })}
            </div>
          </div>

        </div>
      </div>

      {/* Grid: Extreme Density Container */}
      <div className="w-full bg-slate-50 -mt-10 rounded-t-[32px] sm:rounded-t-[48px] pt-10 pb-8 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative">
        {loading && loadedItems.length > 0 && (
          <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] z-10 flex items-start justify-center pt-20 rounded-xl">
            <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin shadow-md"></div>
          </div>
        )}
        <div key={`${activeCategory}-${searchQuery}`} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
          {loading && loadedItems.length === 0 ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl sm:rounded-2xl overflow-hidden flex flex-col group border relative text-left w-full animate-pulse border-gray-150">
                <div className="relative aspect-[4/3] w-full bg-slate-200"></div>
                <div className="p-2 sm:p-4 flex flex-col flex-grow bg-white space-y-2">
                  <div className="h-3 bg-slate-200 rounded w-1/3"></div>
                  <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                  <div className="mt-auto pt-3">
                    <div className="h-5 bg-slate-200 rounded w-1/2 mb-2"></div>
                    <div className="h-3 bg-slate-200 rounded w-2/3"></div>
                  </div>
                </div>
              </div>
            ))
          ) : displayedItems.length > 0 ? (
          displayedItems.map((item, index) => {
            const isUnavailable = item.status === "Terjual";
            const conditionLabel = item.kondisi;
            
            // Mock recommendation logic
            const isRecommended = item.kondisi === "Baru" || Number(item.price) > 5000000;

            return (
              <Link
                key={item.id}
                href={isUnavailable ? "#" : `/katalog/${item.id}`}
                onClick={(e) => { if (isUnavailable) e.preventDefault(); }}
                className={`bg-white rounded-xl sm:rounded-2xl overflow-hidden flex flex-col group border relative text-left w-full focus:outline-none content-visibility-card transition-all duration-400 block ${
                  isUnavailable ? "grayscale opacity-50 border-gray-150 shadow-none cursor-not-allowed" : "border-gray-150 shadow-none md:shadow-md md:hover:-translate-y-1 md:hover:shadow-lg transition-all duration-300"
                }`}
              >
                <div className="relative aspect-[4/3] w-full bg-slate-100 overflow-hidden">
                  {item.images && item.images.length > 0 ? (
                    <Image
                      src={item.thumbnailIndex !== null && item.thumbnailIndex !== undefined && item.images[item.thumbnailIndex] ? item.images[item.thumbnailIndex] : item.images[0]}
                      alt={item.title}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className={`object-cover ${!isUnavailable && "group-hover:scale-105 transition-transform duration-500"}`}
                      priority={index === 0 ? true : index < 4}
                      fetchPriority={index === 0 ? "high" : undefined}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-[10px] sm:text-sm">
                      Tanpa Gambar
                    </div>
                  )}
                  
                  {isUnavailable && (
                    <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-20 backdrop-blur-[1px]">
                      <span className="px-2 py-1 sm:px-4 sm:py-2 border-2 border-red-600 text-red-600 font-black text-[8px] sm:text-xl tracking-widest rounded-lg transform -rotate-12 bg-red-50/80 shadow-lg uppercase">
                        {item.status}
                      </span>
                    </div>
                  )}

                  {/* Recommendation Badge */}
                  {!isUnavailable && isRecommended && (
                    <div className="absolute top-1.5 left-1.5 sm:top-3 sm:left-3 z-10">
                      <span className="px-1.5 py-0.5 sm:px-2.5 sm:py-1 flex items-center gap-1 rounded-md sm:rounded-lg text-[7px] sm:text-[10px] uppercase font-black shadow-md bg-gradient-to-r from-amber-500 to-orange-600 text-white">
                        <Flame className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> <span className="hidden sm:inline">Pilihan Terbaik</span>
                      </span>
                    </div>
                  )}

                  {/* Condition Badge */}
                  <div className="absolute top-1.5 right-1.5 sm:top-3 sm:right-3 z-10">
                    <span
                      className={`px-1.5 py-0.5 sm:px-2.5 sm:py-1 flex items-center justify-center rounded-md sm:rounded-lg text-[7px] sm:text-[10px] uppercase font-black border border-white/10 shadow-none md:shadow-md md:backdrop-blur-md ${
                        conditionLabel === "Baru"
                          ? "bg-emerald-700 text-white"
                          : "bg-slate-700 text-white"
                      }`}
                    >
                      {conditionLabel}
                    </span>
                  </div>
                </div>

                <div className="p-2 sm:p-4 flex flex-col flex-grow bg-white">
                  <div className="text-[8px] sm:text-[10px] text-brand-600 font-bold tracking-wider uppercase mb-0.5 sm:mb-1 truncate">
                    {item.category}
                  </div>
                  <h3 className="font-semibold text-slate-900 leading-snug mb-1 sm:mb-2 line-clamp-2 text-[10px] sm:text-base group-hover:text-brand-600 transition-colors h-8 sm:h-12 overflow-hidden">
                    {item.title}
                  </h3>
                  
                  <div className="mt-auto pt-1 sm:pt-3">
                    <div className="text-[11px] sm:text-xl font-black text-brand-700 mb-1 sm:mb-2 truncate">
                      {formatIDR(item.price)}
                    </div>
                    <div className="flex items-center text-[8px] sm:text-[11px] text-slate-500 gap-1 pt-1.5 sm:pt-2 border-t border-slate-100">
                      <MapPin className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 text-brand-500 flex-shrink-0" />
                      <span className="truncate">{item.branchName.replace("MBG Cabang ", "")}</span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })
        ) : (
          <div className="col-span-full flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
            <Package className="w-12 h-12 mb-3 text-slate-300" />
            <h3 className="text-lg font-bold text-slate-900 mb-1">Tidak ada barang</h3>
            <p className="text-sm text-slate-500">Kategori atau pencarian yang Anda tuju sedang kosong.</p>
            <button onClick={() => {setSearchQuery(""); setActiveCategory("Semua Kategori")}} className="mt-4 px-5 py-2 rounded-lg bg-slate-100 text-slate-800 text-sm font-semibold hover:bg-slate-200 transition-colors">
              Reset Filter
            </button>
          </div>
        )}
        </div>
      </div>

      {/* Intersection Observer Target & Loading State */}
      {hasMore && (
        <div ref={observerRef} className="col-span-full flex justify-center py-8">
          <button
            onClick={handleLoadMore}
            disabled={loading}
            className="px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-semibold transition-colors disabled:opacity-50 shadow-sm border border-slate-200"
          >
            {loading ? "Memuat..." : "Muat Lebih Banyak"}
          </button>
        </div>
      )}

      {loading && !hasMore && (
        <div className="col-span-full flex justify-center py-8">
          <div className="text-slate-500 text-sm font-medium">Memuat katalog...</div>
        </div>
      )}
        </div>
      </div>

      {/* Modal / Drawer for Instant Product Details */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 transition-opacity duration-300">
          {/* Dismiss overlay */}
          <div className="absolute inset-0" onClick={closeModal}></div>
          
          <div className="bg-white w-full sm:w-[500px] md:w-[700px] h-[90vh] sm:h-auto sm:max-h-[85vh] rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col relative overflow-hidden animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-300">
            {/* Header/Close */}
            <div className="absolute top-4 right-4 z-20 flex gap-2">
              <button onClick={closeModal} className="p-2 bg-white/90 hover:bg-white text-slate-800 rounded-full shadow-sm backdrop-blur-sm transition-all border border-slate-200/50">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Scroll Area */}
            <div className="overflow-y-auto flex-grow pb-24 sm:pb-6">
              
              {/* Image / Video Carousel */}
              <div className="relative w-full aspect-[4/3] md:aspect-video rounded-t-2xl overflow-hidden bg-slate-100">
                {slides.length > 0 ? (
                  <div className="w-full h-full relative">
                    {/* Slide content */}
                    {slides[currentImageIndex].type === "video" ? (
                      <div className="w-full h-full relative bg-black">
                        {isVideoPlaying ? (
                          <iframe 
                            className="absolute inset-0 w-full h-full border-0"
                            src={`${slides[currentImageIndex].url}?autoplay=1`}
                            title="Review Video YouTube" 
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                            allowFullScreen
                          ></iframe>
                        ) : (
                          <div 
                            className="absolute inset-0 w-full h-full cursor-pointer flex items-center justify-center group"
                            onClick={() => setIsVideoPlaying(true)}
                          >
                            {youtubeId && (
                              <Image
                                src={`https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`}
                                alt="Video thumbnail"
                                fill
                                className="object-cover opacity-85 group-hover:scale-105 transition-transform duration-500"
                                sizes="(max-width: 768px) 100vw, 50vw"
                                priority
                              />
                            )}
                            {/* Overlay backdrop */}
                            <div className="absolute inset-0 bg-black/25 group-hover:bg-black/35 transition-colors" />
                            {/* Play button */}
                            <div className="relative z-10 w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-xl transform group-hover:scale-110 active:scale-95 transition-all duration-300">
                              <svg className="w-8 h-8 fill-current ml-1" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                              </svg>
                            </div>
                            <span className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/60 rounded-full text-white text-[10px] sm:text-xs font-bold tracking-wider uppercase backdrop-blur-sm">
                              Klik untuk putar video
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <Image 
                        src={slides[currentImageIndex].url} 
                        alt={selectedItem.title}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-contain sm:object-cover"
                        priority
                      />
                    )}

                    {/* Navigation buttons */}
                    {slides.length > 1 && (
                      <>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleSlideChange(currentImageIndex === 0 ? slides.length - 1 : currentImageIndex - 1) }}
                          className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-white/80 rounded-full shadow-md text-slate-800 hover:scale-105 active:scale-95 transition-all z-10"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleSlideChange(currentImageIndex === slides.length - 1 ? 0 : currentImageIndex + 1) }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-white/80 rounded-full shadow-md text-slate-800 hover:scale-105 active:scale-95 transition-all z-10"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                          {slides.map((_, idx) => (
                            <button 
                              key={idx}
                              onClick={() => handleSlideChange(idx)}
                              className={`h-1.5 rounded-full transition-all ${idx === currentImageIndex ? 'w-4 bg-brand-600' : 'w-1.5 bg-white/60 hover:bg-white/80'}`} 
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400 flex-col gap-2">
                    <Package className="w-12 h-12 opacity-20" />
                    <span className="text-sm font-medium">Tanpa Gambar</span>
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div className="p-5 sm:p-6 space-y-5">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2.5 py-1 rounded-md text-[10px] uppercase font-black text-white ${selectedItem.kondisi === 'Baru' ? 'bg-emerald-700' : 'bg-slate-700'}`}>
                      {selectedItem.kondisi === 'Baru' ? 'Baru' : 'Bekas'}
                    </span>
                    <Link 
                      href={`/?category=${selectedItem.category}`}
                      onClick={(e) => {
                        handleCategoryClick(selectedItem.category);
                        closeModal();
                      }}
                      className="px-2.5 py-1 rounded-md text-[10px] uppercase font-black bg-brand-100 text-brand-700 hover:bg-brand-200 transition-colors"
                    >
                      {selectedItem.category}
                    </Link>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">
                    {selectedItem.title}
                  </h2>
                  <div className="text-2xl sm:text-3xl font-black text-brand-700 mt-2">
                    {formatIDR(selectedItem.price)}
                  </div>
                  <div className="flex items-center text-sm text-slate-500 gap-1.5 mt-2">
                    <MapPin className="w-4 h-4 text-slate-400" /> Tersedia di: <span className="font-semibold text-slate-700">{selectedItem.branchName}</span>
                  </div>
                </div>

                {/* Grouped Variants Selector Chips */}
                {modalVariants.length > 1 && (
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150 shadow-sm">
                    <span className="text-slate-500 block text-[10px] uppercase tracking-wider font-bold mb-2">
                      Pilihan Varian Barang
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {modalVariants.map((v) => {
                        const isActive = selectedItem.id === v.id;
                        return (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => {
                              setSelectedItem(v);
                              setIsVideoPlaying(false);
                              // Sync active slide index to show the variant image automatically
                              const varImgUrl = (v as any).variantImageUrl;
                              if (varImgUrl) {
                                setCurrentImageIndex(youtubeEmbedUrl ? 1 : 0);
                              } else {
                                setCurrentImageIndex(0);
                              }
                            }}
                            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-2 ${
                              isActive
                                ? "bg-brand-600 border-brand-600 text-white shadow-md shadow-brand-500/20"
                                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            {(v as any).variantImageUrl && (
                              <img
                                src={(v as any).variantImageUrl}
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

                {/* Description */}
                <div className="prose prose-sm sm:prose-base max-w-none text-slate-600">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">Deskripsi Produk</h3>
                  <div className="whitespace-pre-wrap">{selectedItem.description}</div>
                  
                  {defectText && (
                    <div className="mt-4">
                      <h3 className="text-sm font-bold text-rose-600 mt-4 tracking-wide uppercase">MINUS / DEFECT</h3>
                      <div className="mt-1 p-3 bg-rose-50/60 rounded-xl text-slate-700 text-sm border border-rose-100/50 leading-relaxed">
                        {defectText}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sticky Bottom Actions */}
            <div className="absolute sm:relative bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-100 flex items-center gap-3 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.1)]">
              <a 
                href={`https://maps.google.com/?q=${encodeURIComponent(selectedItem.branchName)}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-800 py-3 sm:py-3.5 px-4 rounded-xl font-bold transition-all text-sm sm:text-base border border-slate-200 shadow-sm hover:shadow-md"
                title="Petunjuk Lokasi"
              >
                <MapPin className="w-5 h-5" />
              </a>
              <a 
                href={`https://wa.me/${selectedItem.whatsappNumber.replace(/^0/, '62').replace(/\D/g, '')}?text=${encodeURIComponent(`Halo Admin MBG ${selectedItem.branchName}, saya tertarik dengan barang ini: ${selectedItem.title} (SKU: ${selectedItem.sku})`)}`}
                target="_blank"
                rel="noreferrer"
                className="flex-grow flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1ebd5a] text-white py-3 sm:py-3.5 px-6 rounded-xl font-bold transition-all shadow-lg shadow-green-500/30 text-sm sm:text-base"
              >
                <MessageCircle className="w-5 h-5" /> Chat via WhatsApp
              </a>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
