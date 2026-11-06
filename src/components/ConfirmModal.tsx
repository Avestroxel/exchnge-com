import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  lang?: 'ku' | 'en' | 'ar';
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  lang = 'ku'
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const defaultConfirmText = lang === 'en' ? 'Yes, Delete' : lang === 'ar' ? 'نعم، حذف' : 'بەڵێ، بسڕەوە';
  const defaultCancelText = lang === 'en' ? 'Cancel' : lang === 'ar' ? 'إلغاء' : 'پاشگەزبوونەوە';

  return (
    <div className="fixed inset-0 bg-slate-950/65 backdrop-blur-xl z-100 flex items-center justify-center p-4 animate-fade-in">
      <div 
        className="bg-slate-950/85 backdrop-blur-2xl backdrop-saturate-150 rounded-2xl w-full max-w-md p-6 shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.22),inset_0_0_24px_rgba(255,255,255,0.03),0_20px_50px_rgba(0,0,0,0.55)] border border-white/[0.12] flex flex-col space-y-4 animate-scale-up"
        dir={lang === 'en' ? 'ltr' : 'rtl'}
      >
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 bg-rose-500/15 border border-rose-500/20 rounded-xl text-rose-400 shrink-0">
            <AlertTriangle className="w-5 h-5 animate-pulse" />
          </div>
          <div className="space-y-1.5 flex-1">
            <h3 className="text-sm font-bold text-white leading-none">
              {title}
            </h3>
            <p className="text-xs text-slate-300 font-medium leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-white/[0.08]">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-white/[0.12] bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer backdrop-blur-md"
          >
            {cancelText || defaultCancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-[0_4px_20px_rgba(225,29,72,0.4)] transition-all cursor-pointer"
          >
            {confirmText || defaultConfirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
