import { useRef, useLayoutEffect } from 'react';
import gsap from 'gsap';
import { Vault } from 'lucide-react';

interface AppLoaderProps {
  onFinish: () => void;
  systemTitle?: string;
  officeLogo?: string;
  lang?: 'ku' | 'ar' | 'en';
}

export default function AppLoader({
  onFinish,
  systemTitle,
  officeLogo,
  lang = 'ku',
}: AppLoaderProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const podRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const progressObj = { val: 0 };

      // Set initial states
      if (barRef.current) {
        gsap.set(barRef.current, { scaleX: 0, transformOrigin: 'left center' });
      }

      const tl = gsap.timeline({
        defaults: { force3D: true },
        onComplete: () => {
          onFinish();
        },
      });

      // Stage 1: Glass Pod & Emblem spring in
      tl.fromTo(
        podRef.current,
        { opacity: 0, scale: 0.9, y: 24 },
        { opacity: 1, scale: 1, y: 0, duration: 0.55, ease: 'back.out(1.4)' }
      );

      // Stage 2: Smooth progress bar fill & 0% -> 100% number counter
      tl.to(
        barRef.current,
        { scaleX: 1, duration: 1.35, ease: 'power3.inOut' },
        '-=0.2'
      ).to(
        progressObj,
        {
          val: 100,
          duration: 1.35,
          ease: 'power3.inOut',
          onUpdate: () => {
            if (counterRef.current) {
              counterRef.current.textContent = `${Math.round(progressObj.val)}%`;
            }
          },
        },
        '<'
      );

      // Stage 3: Silky Exit — Glass Pod scales up slightly & fades while backdrop dissolves away
      tl.to(podRef.current, {
        scale: 1.06,
        opacity: 0,
        y: -16,
        duration: 0.4,
        ease: 'power3.in',
      }).to(
        overlayRef.current,
        {
          opacity: 0,
          duration: 0.5,
          ease: 'expo.inOut',
          pointerEvents: 'none',
        },
        '-=0.2'
      );
    });

    return () => ctx.revert();
  }, [onFinish]);

  const defaultTitle = 
    lang === 'en' 
      ? 'Hawala & Exchange System' 
      : lang === 'ar' 
        ? 'نظام الحوالات والصرافة' 
        : 'سیستەمی حەواڵە و ئاڵوگۆڕی دراو';

  const subtitle = 
    lang === 'en' 
      ? 'Initializing workspace...' 
      : lang === 'ar' 
        ? 'جاري تهيئة مساحة العمل...' 
        : 'ئامادەکردنی سیستەم...';

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#05070B]/80 backdrop-blur-3xl overflow-hidden select-none"
      dir={lang === 'en' ? 'ltr' : 'rtl'}
    >
      {/* Subtle ambient glowing orbs behind the glass pod */}
      <div className="absolute top-1/3 left-1/2 -translate-x-3/4 -translate-y-1/2 w-96 h-96 rounded-full bg-[#1D7AFC]/25 blur-[110px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/3 left-1/2 -translate-x-1/4 translate-y-1/2 w-96 h-96 rounded-full bg-[#10B981]/20 blur-[110px] pointer-events-none animate-pulse" />

      {/* Center 3D Crystal Glass Pod */}
      <div
        ref={podRef}
        className="px-10 py-9 rounded-3xl bg-slate-950/45 backdrop-blur-2xl border border-white/[0.15] shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.28),0_30px_80px_rgba(0,0,0,0.75)] flex flex-col items-center gap-6 min-w-[320px] max-w-[90vw] relative z-10 transform-gpu"
      >
        {/* Specular Inner Glint line */}
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none rounded-t-3xl" />

        {/* Animated Brand Emblem with rotating orbital ring */}
        <div className="relative flex items-center justify-center">
          {/* Rotating dashed orbital ring */}
          <div className="w-20 h-20 rounded-2xl border border-dashed border-white/20 animate-spin [animation-duration:12s] absolute" />

          {/* Glowing blue squircle emblem */}
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#1D7AFC] to-[#38BDF8] shadow-[0_0_35px_rgba(29,122,252,0.65)] flex items-center justify-center border border-white/25 relative z-10">
            {officeLogo ? (
              <img src={officeLogo} alt="Logo" className="w-8 h-8 object-contain" />
            ) : (
              <Vault className="w-7 h-7 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)]" />
            )}
          </div>
        </div>

        {/* Typography */}
        <div className="flex flex-col items-center text-center gap-1 min-w-0">
          <h2 className="text-base font-bold text-white tracking-tight drop-shadow-sm max-w-[260px] truncate">
            {systemTitle || defaultTitle}
          </h2>
          <p className="text-xs text-slate-400 font-medium tracking-wide">
            {subtitle}
          </p>
        </div>

        {/* Monospace Live Percentage Counter */}
        <div className="flex items-center justify-center">
          <span
            ref={counterRef}
            className="font-mono text-2xl font-semibold text-white tabular-nums tracking-tight drop-shadow-sm"
          >
            0%
          </span>
        </div>

        {/* Liquid Glass Progress Track */}
        <div className="w-56 h-1.5 rounded-full bg-white/[0.08] overflow-hidden border border-white/[0.08] relative shadow-inner">
          <div
            ref={barRef}
            className="h-full w-full rounded-full bg-gradient-to-r from-[#1D7AFC] via-[#38BDF8] to-[#10B981] shadow-[0_0_16px_rgba(56,189,248,0.8)]"
          />
        </div>
      </div>
    </div>
  );
}

