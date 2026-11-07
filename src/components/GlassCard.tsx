import React from 'react';

interface GlassCardProps {
  key?: React.Key;
  id?: string;
  children: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

export default function GlassCard({
  children,
  title,
  subtitle,
  icon,
  action,
  className = '',
  contentClassName = '',
}: GlassCardProps) {
  return (
    <div
      data-animate="card"
      className={`glass-card transform-gpu relative overflow-hidden rounded-2xl bg-slate-950/35 backdrop-blur-2xl backdrop-saturate-150 border border-white/[0.12] shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.22),inset_0_0_24px_rgba(255,255,255,0.03),0_20px_50px_rgba(0,0,0,0.45)] hover:bg-slate-900/40 hover:border-white/[0.18] transition-colors duration-300 text-slate-100 ${className}`}
    >
      {/* Specular Inner Glint line */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />

      {/* Header if title/action/icon provided */}
      {(title || action || icon) && (
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-white/[0.08] relative z-10">
          <div className="flex items-center gap-3 min-w-0">
            {icon && (
              <div className="w-9 h-9 rounded-xl bg-white/[0.06] border border-white/[0.12] flex items-center justify-center shrink-0 text-[#1D7AFC] shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              {title && (
                <h3 className="text-sm font-semibold tracking-wide text-white truncate">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-xs text-slate-400 truncate mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {action && (
            <div className="flex items-center gap-2 shrink-0">
              {action}
            </div>
          )}
        </div>
      )}

      {/* Main Content Area */}
      <div className={`p-5 relative z-10 ${contentClassName}`}>
        {children}
      </div>
    </div>
  );
}
