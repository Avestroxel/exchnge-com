import React, { useState, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, Download, RotateCw, Maximize2 } from 'lucide-react';

interface ImageViewerModalProps {
  isOpen: boolean;
  imageSrc: string | null;
  title?: string;
  lang?: 'ku' | 'en' | 'ar';
  onClose: () => void;
}

export default function ImageViewerModal({
  isOpen,
  imageSrc,
  title,
  lang = 'ku',
  onClose
}: ImageViewerModalProps) {
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);

  // Reset zoom & rotation when opened
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setRotation(0);
    }
  }, [isOpen, imageSrc]);

  // Handle Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !imageSrc) return null;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageSrc;
    link.download = `office-image-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleZoomIn = () => setZoom((prev) => Math.min(3, Number((prev + 0.25).toFixed(2))));
  const handleZoomOut = () => setZoom((prev) => Math.max(0.5, Number((prev - 0.25).toFixed(2))));
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
  };
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  const displayTitle = title || (
    lang === 'en' ? 'Image View' : lang === 'ar' ? 'عرض الصورة' : 'سەیرکردنی وێنە'
  );

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xl animate-fade-in select-none"
      onClick={onClose}
      dir={lang === 'en' ? 'ltr' : 'rtl'}
    >
      <div 
        className="relative max-w-4xl w-full max-h-[92vh] flex flex-col bg-slate-950/85 backdrop-blur-2xl backdrop-saturate-150 border border-white/[0.12] rounded-3xl overflow-hidden shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.22),inset_0_0_24px_rgba(255,255,255,0.03),0_25px_60px_rgba(0,0,0,0.65)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#1D7AFC]/20 text-[#60A5FA] flex items-center justify-center">
              <Maximize2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">{displayTitle}</h3>
              <p className="text-[11px] text-slate-400">
                {lang === 'en' 
                  ? 'High resolution preview' 
                  : lang === 'ar' 
                    ? 'معاينة بدقة عالية' 
                    : 'پێشبینینی وێنە بە کوالێتی بەرز'}
              </p>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/[0.08] transition-colors cursor-pointer"
            title={lang === 'en' ? 'Close (Esc)' : 'داخستن'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Image Content Viewport */}
        <div className="relative flex-1 overflow-hidden min-h-[300px] max-h-[65vh] flex items-center justify-center p-6 bg-radial from-slate-900/60 to-slate-950/90">
          <div 
            className="transition-transform duration-150 ease-out flex items-center justify-center max-w-full max-h-full"
            style={{
              transform: `scale(${zoom}) rotate(${rotation}deg)`
            }}
          >
            <img
              src={imageSrc}
              alt={displayTitle}
              className="max-h-[55vh] max-w-full object-contain rounded-2xl shadow-2xl drop-shadow-lg"
            />
          </div>
        </div>

        {/* Toolbar Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5 border-t border-white/[0.08] bg-slate-950/80 shrink-0">
          <div className="flex items-center gap-2">
            {/* Zoom Out */}
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={zoom <= 0.5}
              className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white transition-colors disabled:opacity-40 cursor-pointer"
              title={lang === 'en' ? 'Zoom Out' : 'بچووککردنەوە'}
            >
              <ZoomOut className="w-4 h-4" />
            </button>

            {/* Current Zoom Indicator */}
            <span className="text-xs font-mono text-slate-300 px-2 min-w-[3rem] text-center">
              {Math.round(zoom * 100)}%
            </span>

            {/* Zoom In */}
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={zoom >= 3}
              className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white transition-colors disabled:opacity-40 cursor-pointer"
              title={lang === 'en' ? 'Zoom In' : 'گەورەکردن'}
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            {/* Rotate */}
            <button
              type="button"
              onClick={handleRotate}
              className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white transition-colors cursor-pointer"
              title={lang === 'en' ? 'Rotate 90°' : 'سوڕاندن'}
            >
              <RotateCw className="w-4 h-4" />
            </button>

            {/* Reset */}
            {(zoom !== 1 || rotation !== 0) && (
              <button
                type="button"
                onClick={handleReset}
                className="px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-xs font-bold text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                {lang === 'en' ? 'Reset' : 'ڕێکخستنەوە'}
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Download */}
            <button
              type="button"
              onClick={handleDownload}
              className="px-4 py-2 bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.12] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Download className="w-4 h-4 text-[#60A5FA]" />
              <span>{lang === 'en' ? 'Download' : lang === 'ar' ? 'تحميل' : 'داگرتنی وێنە'}</span>
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-[#1D7AFC] hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-[0_4px_20px_rgba(29,122,252,0.4)]"
            >
              {lang === 'en' ? 'Done' : lang === 'ar' ? 'إغلاق' : 'داخستن'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
