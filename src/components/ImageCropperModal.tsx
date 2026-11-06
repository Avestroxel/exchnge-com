import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ZoomIn, ZoomOut, RotateCw, RotateCcw, Check, X, Move, Sparkles, Maximize, Minimize, RefreshCw } from 'lucide-react';

interface ImageCropperModalProps {
  isOpen: boolean;
  imageSrc: string;
  cropShape?: 'square' | 'circle';
  title?: string;
  lang?: 'ku' | 'en' | 'ar';
  onCrop: (croppedDataUrl: string) => void;
  onClose: () => void;
}

export default function ImageCropperModal({
  isOpen,
  imageSrc,
  cropShape = 'square',
  title,
  lang = 'ku',
  onCrop,
  onClose
}: ImageCropperModalProps) {
  const [scale, setScale] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [previewUrl, setPreviewUrl] = useState<string>('');

  const imageRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const CROP_BOX_SIZE = 280; // Visual crop viewport box size in px
  const OUTPUT_SIZE = 560;   // High-res exported canvas resolution in px

  // Calculate base image dimensions to fill or fit inside CROP_BOX_SIZE
  const aspect = naturalSize.width > 0 && naturalSize.height > 0
    ? naturalSize.width / naturalSize.height
    : 1;

  // Base dimensions when scale = 1 (Cover mode by default)
  let baseW = CROP_BOX_SIZE;
  let baseH = CROP_BOX_SIZE;
  if (aspect >= 1) {
    baseH = CROP_BOX_SIZE;
    baseW = CROP_BOX_SIZE * aspect;
  } else {
    baseW = CROP_BOX_SIZE;
    baseH = CROP_BOX_SIZE / aspect;
  }

  // Reset transformations on new image
  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setRotation(0);
      setPosition({ x: 0, y: 0 });
      setIsLoaded(false);
      setPreviewUrl('');
    }
  }, [isOpen, imageSrc]);

  // Image load handler to capture natural dimensions
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
    setIsLoaded(true);
  };

  // Generate cropped image on canvas - 100% isomorphic to DOM display
  const generateCroppedData = useCallback((targetSize = OUTPUT_SIZE): string => {
    const img = imageRef.current;
    if (!img || !isLoaded || !naturalSize.width || !naturalSize.height) return '';

    const canvas = document.createElement('canvas');
    canvas.width = targetSize;
    canvas.height = targetSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Circular clipping mask
    if (cropShape === 'circle') {
      ctx.beginPath();
      ctx.arc(targetSize / 2, targetSize / 2, targetSize / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
    }

    // Exact scale factor between DOM crop box and Canvas output
    const ratio = targetSize / CROP_BOX_SIZE;

    ctx.save();
    // 1. Move to center of canvas
    ctx.translate(targetSize / 2, targetSize / 2);
    // 2. Pan offset mapped to canvas scale
    ctx.translate(position.x * ratio, position.y * ratio);
    // 3. Rotation around center
    ctx.rotate((rotation * Math.PI) / 180);
    // 4. Zoom scale mapped to canvas scale
    ctx.scale(scale * ratio, scale * ratio);
    // 5. Draw image centered with base dimensions
    ctx.drawImage(img, -baseW / 2, -baseH / 2, baseW, baseH);
    ctx.restore();

    return canvas.toDataURL('image/png', 0.95);
  }, [isLoaded, naturalSize, baseW, baseH, position, rotation, scale, cropShape]);

  // Live thumbnail preview updater
  useEffect(() => {
    if (!isOpen || !isLoaded) return;
    const timer = setTimeout(() => {
      try {
        const preview = generateCroppedData(120);
        if (preview) setPreviewUrl(preview);
      } catch {
        // Safe catch
      }
    }, 40);
    return () => clearTimeout(timer);
  }, [isOpen, isLoaded, scale, rotation, position, generateCroppedData]);

  // Mouse & Touch Pan Handling
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    try {
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    } catch {
      // Safe fallback
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {
      // Safe fallback
    }
  };

  // Window fallback while dragging to prevent sticking if cursor exits modal
  useEffect(() => {
    if (!isDragging) return;
    const onGlobalMove = (e: PointerEvent) => {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    };
    const onGlobalUp = () => setIsDragging(false);

    window.addEventListener('pointermove', onGlobalMove);
    window.addEventListener('pointerup', onGlobalUp);
    return () => {
      window.removeEventListener('pointermove', onGlobalMove);
      window.removeEventListener('pointerup', onGlobalUp);
    };
  }, [isDragging, dragStart]);

  // Keyboard navigation & Nudge
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const step = e.shiftKey ? 20 : 5;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setPosition((p) => ({ ...p, x: p.x - step }));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setPosition((p) => ({ ...p, x: p.x + step }));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setPosition((p) => ({ ...p, y: p.y - step }));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setPosition((p) => ({ ...p, y: p.y + step }));
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        setScale((s) => Math.min(3.5, Number((s + 0.1).toFixed(2))));
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        setScale((s) => Math.max(0.4, Number((s - 0.1).toFixed(2))));
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    setScale((prev) => Math.min(3.5, Math.max(0.4, Number((prev + delta).toFixed(2)))));
  };

  const handleRotateCW = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleRotateCCW = () => {
    setRotation((prev) => (prev - 90 + 360) % 360);
  };

  // Preset: Fit inside box (Contain)
  const handleFit = () => {
    if (aspect >= 1) {
      // Wide image: shrink scale so width = CROP_BOX_SIZE
      setScale(Number((1 / aspect).toFixed(2)));
    } else {
      // Tall image: shrink scale so height = CROP_BOX_SIZE
      setScale(Number(aspect.toFixed(2)));
    }
    setPosition({ x: 0, y: 0 });
  };

  // Preset: Fill whole frame (Cover)
  const handleFill = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleReset = () => {
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  const handleConfirm = () => {
    const finalData = generateCroppedData(OUTPUT_SIZE);
    if (finalData) {
      onCrop(finalData);
    }
  };

  if (!isOpen) return null;

  const defaultTitle = cropShape === 'circle'
    ? (lang === 'en' ? 'Crop Profile Picture (Circular)' : lang === 'ar' ? 'قص الصورة الشخصية (دائري)' : 'قرتاندنی وێنەی کەسی (بازنەیی)')
    : (lang === 'en' ? 'Crop Office Logo (Square)' : lang === 'ar' ? 'قص شعار المكتب (مربع)' : 'دەستکاریکردن و قرتاندنی لۆگۆ (چوارگۆشە)');

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xl animate-fade-in select-none"
      dir={lang === 'en' ? 'ltr' : 'rtl'}
      onClick={onClose}
    >
      <div 
        className="bg-slate-950/85 backdrop-blur-2xl backdrop-saturate-150 rounded-3xl shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.22),inset_0_0_24px_rgba(255,255,255,0.03),0_25px_60px_rgba(0,0,0,0.65)] border border-white/[0.12] w-full max-w-lg overflow-hidden flex flex-col text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#1D7AFC]/20 text-[#60A5FA] flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {title || defaultTitle}
              </h3>
              <p className="text-[11px] text-slate-400">
                {lang === 'en' 
                  ? 'Drag to align and use controls to zoom or rotate' 
                  : lang === 'ar' 
                    ? 'اسحب الصورة لتحديد الموقع واستخدم الأدوات للتحكم' 
                    : 'وێنەکە ڕابکێشە بۆ دانانی شوێن و قەبارەکەی ڕێکبخە'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/[0.08] transition-colors cursor-pointer"
            title={lang === 'en' ? 'Close' : 'داخستن'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Crop Viewport Container */}
        <div className="p-6 flex flex-col items-center justify-center bg-slate-950 relative overflow-hidden select-none">
          {/* Instructions Hint */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-white/90 text-[11px] font-medium pointer-events-none flex items-center gap-1.5 z-20 shadow-xs">
            <Move className="w-3.5 h-3.5 text-primary" />
            <span>
              {lang === 'en' ? 'Click & drag image to position' : lang === 'ar' ? 'انقر واسحب للتحريك' : 'بە ماوس وێنەکە ڕابکێشە بۆ دیاریکردنی شوێنەکەی'}
            </span>
          </div>

          {/* Interactive Crop Mask Viewport */}
          <div
            ref={containerRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onWheel={handleWheel}
            style={{ width: CROP_BOX_SIZE, height: CROP_BOX_SIZE }}
            className={`relative overflow-hidden cursor-grab active:cursor-grabbing border-2 border-white/90 shadow-2xl touch-none select-none my-2 ring-4 ring-black/40 ${
              cropShape === 'circle' ? 'rounded-full' : 'rounded-2xl'
            }`}
          >
            {/* The Image undergoing transformation - strictly bounded and scaled */}
            {imageSrc && (
              <img
                ref={imageRef}
                src={imageSrc}
                alt="Crop Source"
                draggable={false}
                onLoad={handleImageLoad}
                className="absolute pointer-events-none origin-center max-w-none transition-none select-none"
                style={{
                  width: `${baseW}px`,
                  height: `${baseH}px`,
                  top: '50%',
                  left: '50%',
                  transform: `translate(-50%, -50%) translate(${position.x}px, ${position.y}px) rotate(${rotation}deg) scale(${scale})`,
                  transformOrigin: 'center center',
                  userSelect: 'none'
                }}
              />
            )}

            {/* Grid overlay for rule of thirds alignment */}
            <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 border border-white/20">
              <div className="border-r border-b border-white/20"></div>
              <div className="border-r border-b border-white/20"></div>
              <div className="border-b border-white/20"></div>
              <div className="border-r border-b border-white/20"></div>
              <div className="border-r border-b border-white/20"></div>
              <div className="border-b border-white/20"></div>
              <div className="border-r border-b border-white/20"></div>
              <div className="border-r border-b border-white/20"></div>
              <div></div>
            </div>
          </div>

          {/* Dimension badge indicator */}
          {naturalSize.width > 0 && (
            <div className="text-[10px] text-gray-400 font-mono mt-1">
              {lang === 'en' ? 'Original Size:' : 'قەبارەی سەرەکی:'} {naturalSize.width} × {naturalSize.height}px
            </div>
          )}
        </div>

        {/* Toolbar Controls */}
        <div className="p-5 space-y-4 bg-gray-50/80 dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800">
          {/* Zoom Slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-300 font-bold">
              <span className="flex items-center gap-1.5">
                <ZoomIn className="w-3.5 h-3.5 text-primary" />
                <span>{lang === 'en' ? 'Zoom Scale' : lang === 'ar' ? 'درجة التكبير' : 'قەبارەی زوومکردن'}</span>
              </span>
              <span className="font-mono text-gray-800 dark:text-gray-200 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md border border-gray-200 dark:border-slate-700 shadow-2xs">
                {Math.round(scale * 100)}%
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setScale((prev) => Math.max(0.4, Number((prev - 0.1).toFixed(2))))}
                className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:text-primary transition-colors cursor-pointer"
                title={lang === 'en' ? 'Zoom Out' : 'بچووککردنەوە'}
              >
                <ZoomOut className="w-4 h-4" />
              </button>

              <input
                type="range"
                min="0.4"
                max="3.0"
                step="0.05"
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                className="flex-1 accent-primary h-2 bg-gray-200 dark:bg-slate-700 rounded-lg cursor-pointer"
              />

              <button
                type="button"
                onClick={() => setScale((prev) => Math.min(3.0, Number((prev + 0.1).toFixed(2))))}
                className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:text-primary transition-colors cursor-pointer"
                title={lang === 'en' ? 'Zoom In' : 'گەورەکردن'}
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Actions & Presets */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-gray-200/60 dark:border-slate-800">
            <div className="flex items-center gap-1.5">
              {/* Rotate CCW */}
              <button
                type="button"
                onClick={handleRotateCCW}
                className="p-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-200 hover:text-primary hover:border-primary/40 transition-colors flex items-center cursor-pointer shadow-2xs"
                title={lang === 'en' ? 'Rotate Left' : 'سوڕاندن بۆ چەپ'}
              >
                <RotateCcw className="w-3.5 h-3.5 text-primary" />
              </button>

              {/* Rotate CW */}
              <button
                type="button"
                onClick={handleRotateCW}
                className="p-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-200 hover:text-primary hover:border-primary/40 transition-colors flex items-center cursor-pointer shadow-2xs"
                title={lang === 'en' ? 'Rotate Right' : 'سوڕاندن بۆ ڕاست'}
              >
                <RotateCw className="w-3.5 h-3.5 text-primary" />
              </button>

              {/* Fit button (Show entire image) */}
              <button
                type="button"
                onClick={handleFit}
                className="px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-[11px] font-bold text-gray-700 dark:text-gray-200 hover:text-primary transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                title={lang === 'en' ? 'Fit all image' : 'گونجاندنی هەموو وێنەکە'}
              >
                <Minimize className="w-3 h-3 text-primary" />
                <span>{lang === 'en' ? 'Fit' : 'گونجاندن'}</span>
              </button>

              {/* Fill button (Fill frame) */}
              <button
                type="button"
                onClick={handleFill}
                className="px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-[11px] font-bold text-gray-700 dark:text-gray-200 hover:text-primary transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                title={lang === 'en' ? 'Fill frame' : 'پڕکردنەوە'}
              >
                <Maximize className="w-3 h-3 text-primary" />
                <span>{lang === 'en' ? 'Fill' : 'پڕکردنەوە'}</span>
              </button>

              {/* Reset */}
              <button
                type="button"
                onClick={handleReset}
                className="p-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors cursor-pointer shadow-2xs"
                title={lang === 'en' ? 'Reset' : 'ڕێکخستنەوە'}
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Live Small Preview Thumbnail */}
            {previewUrl && (
              <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-2 py-1 rounded-xl border border-gray-200 dark:border-slate-700 shadow-2xs">
                <span className="text-[10px] text-gray-400 font-medium">
                  {lang === 'en' ? 'Result:' : 'ئەنجام:'}
                </span>
                <div 
                  className={`w-8 h-8 border-2 border-primary/50 overflow-hidden shrink-0 shadow-xs bg-white dark:bg-slate-900 ${
                    cropShape === 'circle' ? 'rounded-full' : 'rounded-lg'
                  }`}
                >
                  <img src={previewUrl} alt="Preview Result" className="w-full h-full object-cover" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Actions */}
        <div className="px-6 py-4 border-t border-white/[0.08] flex justify-end gap-3 bg-slate-950/80">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-white/[0.12] bg-white/[0.06] hover:bg-white/[0.12] rounded-xl text-xs font-bold text-slate-200 transition-colors cursor-pointer backdrop-blur-md"
          >
            {lang === 'en' ? 'Cancel' : lang === 'ar' ? 'إلغاء' : 'پاشگەزبوونەوە'}
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            className="px-6 py-2 bg-[#1D7AFC] hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-[0_4px_20px_rgba(29,122,252,0.4)] flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Check className="w-4 h-4" />
            <span>
              {lang === 'en' ? 'Apply & Save Crop' : lang === 'ar' ? 'قص وحفظ' : 'قرتاندن و پەسەندکردن'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
