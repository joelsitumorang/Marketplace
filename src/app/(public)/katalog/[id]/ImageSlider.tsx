"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Image from 'next/image';
import { createPortal } from 'react-dom';

type Props = {
  images: string[];
  isUnavailable: boolean;
  status: string;
  youtubeUrl?: string | null;
};

export default function ImageSlider({ images, isUnavailable, status, youtubeUrl }: Props) {
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [mounted, setMounted] = useState(false);

  // Touch swipe state for Lightbox
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const extractYoutubeId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const youtubeId = useMemo(() => extractYoutubeId(youtubeUrl || ""), [youtubeUrl]);
  const youtubeEmbedUrl = youtubeId ? `https://www.youtube.com/embed/${youtubeId}` : null;

  const slides = useMemo(() => {
    const list: Array<{ type: "video" | "image"; url: string }> = [];
    if (youtubeEmbedUrl) {
      list.push({ type: "video", url: youtubeEmbedUrl });
    }
    const displayImages = images.length > 0 ? images : ["https://placehold.co/800x600/1a1a2e/e0e0e0?text=Tanpa+Gambar"];
    displayImages.forEach((img) => {
      list.push({ type: "image", url: img });
    });
    return list;
  }, [images, youtubeEmbedUrl]);

  // Image-only list for the fullscreen lightbox viewer
  const imageSlides = useMemo(() => {
    return slides.filter((s) => s.type === "image");
  }, [slides]);

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
    setIsVideoPlaying(false);
  }, [emblaApi, setSelectedIndex]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
  }, [emblaApi, onSelect]);

  // Lightbox handlers
  const openLightboxForSlide = useCallback((slideIndex: number) => {
    const targetSlide = slides[slideIndex];
    if (!targetSlide || targetSlide.type !== "image") return;
    const imgIdx = imageSlides.findIndex((img) => img.url === targetSlide.url);
    setLightboxIndex(imgIdx >= 0 ? imgIdx : 0);
    setIsLightboxOpen(true);
  }, [slides, imageSlides]);

  const closeLightbox = useCallback(() => {
    setIsLightboxOpen(false);
    const targetUrl = imageSlides[lightboxIndex]?.url;
    if (targetUrl && emblaApi) {
      const mainSlideIdx = slides.findIndex((s) => s.url === targetUrl);
      if (mainSlideIdx >= 0) {
        emblaApi.scrollTo(mainSlideIdx);
      }
    }
  }, [imageSlides, lightboxIndex, emblaApi, slides]);

  const handleLightboxPrev = useCallback(() => {
    setLightboxIndex((prev) => (prev > 0 ? prev - 1 : imageSlides.length - 1));
  }, [imageSlides.length]);

  const handleLightboxNext = useCallback(() => {
    setLightboxIndex((prev) => (prev < imageSlides.length - 1 ? prev + 1 : 0));
  }, [imageSlides.length]);

  // Lock body scroll when Lightbox is open
  useEffect(() => {
    if (isLightboxOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isLightboxOpen]);

  // Keyboard navigation for Lightbox
  useEffect(() => {
    if (!isLightboxOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') handleLightboxPrev();
      if (e.key === 'ArrowRight') handleLightboxNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen, closeLightbox, handleLightboxPrev, handleLightboxNext]);

  // Touch swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
    setTouchEnd(null);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const minSwipeDistance = 50;
    if (distance > minSwipeDistance) {
      handleLightboxNext();
    } else if (distance < -minSwipeDistance) {
      handleLightboxPrev();
    }
    setTouchStart(null);
    setTouchEnd(null);
  };

  return (
    <>
      <div className={`relative w-full aspect-[4/3] sm:rounded-3xl overflow-hidden bg-black ${isUnavailable ? 'grayscale' : ''}`}>
        <div className="overflow-hidden h-full" ref={emblaRef}>
          <div className="flex h-full touch-pan-y">
            {slides.map((slide, index) => (
              <div className="flex-[0_0_100%] min-w-0 relative h-full bg-slate-900" key={index}>
                {slide.type === "video" ? (
                  <div className="w-full h-full relative">
                    {isVideoPlaying ? (
                      <iframe 
                        className="absolute inset-0 w-full h-full border-0"
                        src={`${slide.url}?autoplay=1`}
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
                            className="object-cover opacity-80 group-hover:scale-105 transition-transform duration-500"
                            sizes="(max-width: 768px) 100vw, 50vw"
                            priority
                          />
                        )}
                        <div className="absolute inset-0 bg-black/25 group-hover:bg-black/35 transition-colors" />
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
                  <div 
                    className="w-full h-full relative cursor-zoom-in group"
                    onClick={() => openLightboxForSlide(index)}
                    title="Klik untuk melihat foto layar penuh"
                  >
                    <Image
                      src={slide.url}
                      alt={`Gambar produk ${index + 1}`}
                      fill
                      className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
                      sizes="(max-width: 768px) 100vw, 50vw"
                      priority={index === 0}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Floating Zoom / Fullscreen Button */}
        {slides[selectedIndex]?.type === "image" && (
          <button
            onClick={() => openLightboxForSlide(selectedIndex)}
            className="absolute top-3 right-3 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/50 hover:bg-black/75 active:scale-95 text-white text-[11px] sm:text-xs font-semibold backdrop-blur-md border border-white/20 transition-all shadow-lg"
            title="Buka Layar Penuh"
          >
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
            <span className="hidden xs:inline sm:inline">Layar Penuh</span>
          </button>
        )}

        {isUnavailable && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10 pointer-events-none backdrop-blur-[1px]">
            <span className="px-6 py-3 border-4 border-red-600 text-red-600 font-black text-3xl sm:text-4xl tracking-widest rounded-xl transform -rotate-12 bg-red-50/80 shadow-xl">
              {status.toUpperCase()}
            </span>
          </div>
        )}

        {slides.length > 1 && (
          <>
            {/* Controls */}
            <button
              className="hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/30 backdrop-blur border border-white/20 items-center justify-center text-white hover:bg-black/50 z-20 transition-colors"
              onClick={scrollPrev}
              aria-label="Foto sebelumnya"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <button
              className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/30 backdrop-blur border border-white/20 items-center justify-center text-white hover:bg-black/50 z-20 transition-colors"
              onClick={scrollNext}
              aria-label="Foto berikutnya"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>

            {/* Dots */}
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-20">
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  className={`h-2 rounded-full transition-all duration-300 ${idx === selectedIndex ? 'bg-brand-400 w-6' : 'bg-white/50 w-2'}`}
                  onClick={() => emblaApi?.scrollTo(idx)}
                  aria-label={`Ke slide ${idx + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Full-Screen Lightbox Modal */}
      {isLightboxOpen && mounted && imageSlides.length > 0 && createPortal(
        <div 
          className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-md flex flex-col justify-between select-none animate-in fade-in duration-200"
          onClick={closeLightbox}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Top Bar */}
          <div 
            className="flex items-center justify-between px-4 sm:px-6 py-4 z-30"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="px-3 py-1 rounded-full bg-white/10 text-white text-xs sm:text-sm font-semibold tracking-wider backdrop-blur-md border border-white/10">
              {lightboxIndex + 1} / {imageSlides.length}
            </span>

            <button
              onClick={closeLightbox}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/25 active:scale-95 text-white flex items-center justify-center transition-all backdrop-blur-md border border-white/10"
              title="Tutup (Esc)"
              aria-label="Tutup foto layar penuh"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Main Fullscreen Image Area */}
          <div 
            className="relative flex-1 w-full flex items-center justify-center p-2 sm:p-6 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative w-full h-full max-w-6xl max-h-[82vh] flex items-center justify-center">
              <Image
                src={imageSlides[lightboxIndex].url}
                alt={`Foto detail ${lightboxIndex + 1}`}
                fill
                className="object-contain"
                sizes="100vw"
                priority
              />
            </div>

            {/* Desktop Left / Right Arrow Buttons */}
            {imageSlides.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); handleLightboxPrev(); }}
                  className="hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/25 active:scale-90 text-white items-center justify-center transition-all z-20 backdrop-blur-md border border-white/10"
                  aria-label="Foto sebelumnya"
                >
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleLightboxNext(); }}
                  className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/25 active:scale-90 text-white items-center justify-center transition-all z-20 backdrop-blur-md border border-white/10"
                  aria-label="Foto berikutnya"
                >
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}
          </div>

          {/* Bottom Thumbnail Strip */}
          {imageSlides.length > 1 && (
            <div 
              className="py-3 px-4 flex justify-center items-center gap-2 overflow-x-auto no-scrollbar z-30"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex gap-2 max-w-full px-2 py-1">
                {imageSlides.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setLightboxIndex(idx)}
                    className={`relative w-12 h-9 sm:w-16 sm:h-12 rounded-lg overflow-hidden shrink-0 transition-all ${
                      idx === lightboxIndex 
                        ? 'ring-2 ring-brand-500 scale-105 opacity-100' 
                        : 'opacity-40 hover:opacity-80'
                    }`}
                    aria-label={`Pilih foto ${idx + 1}`}
                  >
                    <Image
                      src={img.url}
                      alt={`Thumbnail ${idx + 1}`}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>,
        document.body
      )}
    </>
  );
}
