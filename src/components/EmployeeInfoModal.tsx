import React, { useState, useEffect } from 'react';
import { X, Eye, EyeOff, Copy, Check, Clock, User, Shield, DollarSign, Mail, Lock, Calendar, Edit, ExternalLink } from 'lucide-react';
import { AppUser } from '../types';

interface EmployeeInfoModalProps {
  isOpen: boolean;
  employee: AppUser | null;
  lang?: 'ku' | 'en' | 'ar';
  onClose: () => void;
  onEdit?: (employee: AppUser) => void;
  onViewAvatar?: (avatarUrl: string, name: string) => void;
}

export default function EmployeeInfoModal({
  isOpen,
  employee,
  lang = 'ku',
  onClose,
  onEdit,
  onViewAvatar
}: EmployeeInfoModalProps) {
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Reset show password when employee changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setShowPassword(false);
      setCopiedField(null);
    }
  }, [isOpen, employee?.id]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !employee) return null;

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const formatExactDate = (isoString?: string) => {
    if (!isoString) {
      return lang === 'en' ? 'Not recorded' : lang === 'ar' ? 'غير مسجل' : 'تۆمار نەکراوە';
    }
    const d = new Date(isoString);
    if (isNaN(d.getTime())) {
      return lang === 'en' ? 'Not recorded' : lang === 'ar' ? 'غير مسجل' : 'تۆمار نەکراوە';
    }
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    return `${year}/${month}/${day} — ${timeStr}`;
  };

  const formatRelativeTime = (isoString?: string) => {
    if (!isoString) {
      return lang === 'en' ? 'Never active' : lang === 'ar' ? 'غير نشط' : 'هێشتا نەهاتووەتە ژوورەوە';
    }
    const d = new Date(isoString);
    if (isNaN(d.getTime())) {
      return lang === 'en' ? 'Never active' : lang === 'ar' ? 'غير نشط' : 'هێشتا نەهاتووەتە ژوورەوە';
    }
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMin < 1) {
      return lang === 'en' ? 'Just now' : lang === 'ar' ? 'الآن' : 'کەمێک پێش ئێستا';
    }
    if (diffMin < 60) {
      return lang === 'en' ? `${diffMin} mins ago` : lang === 'ar' ? `منذ ${diffMin} دقيقة` : `پێش ${diffMin} خولەک`;
    }
    if (diffHours < 24) {
      return lang === 'en' ? `${diffHours} hours ago` : lang === 'ar' ? `منذ ${diffHours} ساعة` : `پێش ${diffHours} کاتژمێر`;
    }
    return lang === 'en' ? `${diffDays} days ago` : lang === 'ar' ? `منذ ${diffDays} يوم` : `پێش ${diffDays} ڕۆژ`;
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'Owner':
        return {
          title: lang === 'en' ? 'Owner (Full Access)' : lang === 'ar' ? 'المالك (كامل الصلاحيات)' : 'خاوەنکار (دەسەڵاتی باڵا)',
          color: 'bg-primary text-white border-primary/30',
          desc: lang === 'en' ? 'Full administrative rights and total system management' : 'دەسەڵاتی تەواوەتی بەسەر تەواوی سیستەمەکە و دارایی'
        };
      case 'Manager':
        return {
          title: lang === 'en' ? 'Manager' : lang === 'ar' ? 'مدير عام' : 'بەڕێوەبەر',
          color: 'bg-purple-600 text-white border-purple-500/30',
          desc: lang === 'en' ? 'Management of operations, reports and employees' : 'بەڕێوەبردنی کارمەندان، ڕاپۆرتەکان و مامەڵە داراییەکان'
        };
      case 'Admin':
        return {
          title: lang === 'en' ? 'Admin' : lang === 'ar' ? 'مسؤول (أدمن)' : 'ئادمین',
          color: 'bg-blue-600 text-white border-blue-500/30',
          desc: lang === 'en' ? 'System operations, transactions and records entry' : 'تۆمارکردنی حەواڵە، ئاڵوگۆڕ و بەڕێوەبردنی هەژمارەکان'
        };
      default:
        return {
          title: lang === 'en' ? 'Teller (Member)' : lang === 'ar' ? 'صراف (تيلر)' : 'تەلەر (کارمەند)',
          color: 'bg-indigo-600 text-white border-indigo-500/30',
          desc: lang === 'en' ? 'Standard transactions and cash flow entry' : 'تۆمارکردنی کڕین و فرۆشتن و مامەڵەی ڕۆژانەی دراو'
        };
    }
  };

  const roleInfo = getRoleBadge(employee.role);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xl animate-fade-in select-none overflow-y-auto"
      onClick={onClose}
      dir={lang === 'en' ? 'ltr' : 'rtl'}
    >
      <div 
        className="bg-slate-950/85 backdrop-blur-2xl backdrop-saturate-150 rounded-3xl shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.22),inset_0_0_24px_rgba(255,255,255,0.03),0_25px_60px_rgba(0,0,0,0.65)] border border-white/[0.12] w-full max-w-lg overflow-hidden flex flex-col my-8 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="relative px-6 pt-6 pb-5 bg-gradient-to-br from-[#1D7AFC]/15 via-white/[0.03] to-transparent border-b border-white/[0.08] flex items-start justify-between">
          <div className="flex items-center gap-4">
            {/* Avatar with click to view full size */}
            <div className="relative group shrink-0">
              {employee.avatar ? (
                <button
                  type="button"
                  onClick={() => onViewAvatar && onViewAvatar(employee.avatar!, employee.name)}
                  className="w-16 h-16 rounded-full overflow-hidden border-2 border-white/20 shadow-md block transition-transform hover:scale-105 active:scale-95 cursor-pointer relative"
                  title={lang === 'en' ? 'Click to view photo' : 'کلیک بکە بۆ سەیرکردنی وێنە'}
                >
                  <img
                    src={employee.avatar}
                    alt={employee.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-[#1D7AFC]/40 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                    <ExternalLink className="w-5 h-5 text-white drop-shadow-sm" />
                  </div>
                </button>
              ) : (
                <div className="w-16 h-16 rounded-full bg-[#1D7AFC] text-white font-black text-2xl flex items-center justify-center border-2 border-white/20 shadow-md">
                  {employee.name.charAt(0).toUpperCase()}
                </div>
              )}

              {/* Online pulse dot */}
              {employee.isOnline ? (
                <span className="absolute bottom-0.5 right-0.5 block h-4 w-4 rounded-full bg-emerald-500 ring-2 ring-slate-950 shadow-xs" title="Online">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                </span>
              ) : (
                <span className="absolute bottom-0.5 right-0.5 block h-4 w-4 rounded-full bg-slate-500 ring-2 ring-slate-950 shadow-xs" title="Offline"></span>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-black text-white">
                  {employee.name}
                </h3>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase shadow-2xs border ${roleInfo.color}`}>
                  {roleInfo.title}
                </span>
              </div>

              <div className="flex items-center gap-2 mt-1">
                {employee.isOnline ? (
                  <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-bold bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-emerald-500/25">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>{lang === 'en' ? 'Active Online' : lang === 'ar' ? 'متصل الآن' : 'ئێستا ئۆنلاینە لەناو سیستەم'}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 font-bold bg-white/[0.05] px-2.5 py-0.5 rounded-full border border-white/[0.08]">
                    <span className="h-2 w-2 rounded-full bg-slate-500"></span>
                    <span>{lang === 'en' ? 'Offline' : lang === 'ar' ? 'غير متصل' : 'دەرەوەی سیستەم (ئۆفلاین)'}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/[0.08] transition-colors cursor-pointer"
            title={lang === 'en' ? 'Close' : 'داخستن'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 text-right">
          {/* Email / Username Card */}
          <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/[0.08] space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400">
              <span className="flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-[#1D7AFC]" />
                <span>{lang === 'en' ? 'Email / Login Account' : lang === 'ar' ? 'البريد الإلكتروني / الحساب' : 'ئیمەیڵ و هەژماری چوونەژوورەوە'}</span>
              </span>
              <button
                type="button"
                onClick={() => handleCopy(employee.email, 'email')}
                className="text-[#60A5FA] hover:text-blue-300 transition-colors flex items-center gap-1 text-[11px] cursor-pointer"
              >
                {copiedField === 'email' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedField === 'email' ? (lang === 'en' ? 'Copied' : 'کۆپی کرا') : (lang === 'en' ? 'Copy' : 'کۆپیکردن')}</span>
              </button>
            </div>
            <p className="text-sm font-mono font-bold text-white select-all">
              {employee.email}
            </p>
          </div>

          {/* Password Card with Show/Hide toggle */}
          <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/[0.08] space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400">
              <span className="flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-amber-400" />
                <span>{lang === 'en' ? 'Account Password' : lang === 'ar' ? 'كلمة المرور' : 'وشەی تێپەڕبوون (نهێنوشە)'}</span>
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-slate-400 hover:text-white transition-colors flex items-center gap-1 text-[11px] cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showPassword ? (lang === 'en' ? 'Hide' : 'شاردنەوە') : (lang === 'en' ? 'Show' : 'نیشاندان')}</span>
                </button>

                {employee.password && (
                  <button
                    type="button"
                    onClick={() => handleCopy(employee.password!, 'password')}
                    className="text-[#60A5FA] hover:text-blue-300 transition-colors flex items-center gap-1 text-[11px] cursor-pointer"
                  >
                    {copiedField === 'password' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedField === 'password' ? (lang === 'en' ? 'Copied' : 'کۆپی کرا') : (lang === 'en' ? 'Copy' : 'کۆپیکردن')}</span>
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm font-mono font-bold text-white select-all">
                {employee.password ? (
                  showPassword ? employee.password : '••••••••••••'
                ) : (
                  <span className="text-slate-500 font-sans text-xs">
                    {lang === 'en' ? 'No password set' : 'وشەی نهێنی دیاری نەکراوە'}
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Salary Card (Informational only, not connected to treasury) */}
          <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/25 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-400">
              <span className="flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span>{lang === 'en' ? 'Monthly Salary' : lang === 'ar' ? 'الراتب الشهري' : 'مووچەی مانگانە'}</span>
              </span>
              <span className="text-[10px] font-medium text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
                {lang === 'en' ? 'Informational only' : 'تەنها بۆ زانیارییە'}
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              {employee.salary !== undefined && employee.salary !== null && employee.salary > 0 ? (
                <>
                  <span className="text-xl font-black font-mono text-emerald-300">
                    {Number(employee.salary).toLocaleString()}
                  </span>
                  <span className="text-xs font-bold text-emerald-400">
                    {employee.salaryCurrency === 'IQD' || employee.salaryCurrency === 'د.ع' ? 'د.ع (IQD)' : '$ (USD)'}
                  </span>
                </>
              ) : (
                <div className="text-xs text-slate-400 font-medium py-1">
                  {lang === 'en' 
                    ? 'Salary not set yet (can be added via Edit)' 
                    : 'مووچە دیاری نەکراوە (دەتوانیت لە ڕێگەی دەستکاریکردنەوە دایبنێیت)'}
                </div>
              )}
            </div>
            <p className="text-[10px] text-slate-400">
              {lang === 'en'
                ? '* This salary figure is purely informational for management records and does not affect safe/cash balances.'
                : '* ئەم ژمارەی مووچەیە تەنها بۆ زانیاری و بەڕێوەبردنە و هیچ پەیوەندی و کاریگەرییەکی لەسەر پارەی گەنجینە نییە.'}
            </p>
          </div>

          {/* Online Times & Activity Details */}
          <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/[0.08] space-y-3">
            <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#1D7AFC]" />
              <span>{lang === 'en' ? 'Online Times & Activity History' : lang === 'ar' ? 'أوقات النشاط والدخول' : 'کاتەکانی ئۆنڵاین بوون و دوایین چالاکی'}</span>
            </div>

            <div className="space-y-2 text-xs divide-y divide-white/[0.06]">
              {/* Last active time */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-400 font-medium">
                  {lang === 'en' ? 'Last Active Time:' : 'دوایین کاتی چالاکی:'}
                </span>
                <div className="text-left font-mono">
                  <span className="font-bold text-white block">
                    {formatExactDate(employee.lastActiveAt)}
                  </span>
                  <span className="text-[10px] text-[#60A5FA] font-bold">
                    ({formatRelativeTime(employee.lastActiveAt)})
                  </span>
                </div>
              </div>

              {/* Account Created Date */}
              {employee.createdAt && (
                <div className="flex items-center justify-between pt-2">
                  <span className="text-slate-400 font-medium">
                    {lang === 'en' ? 'Account Created At:' : 'بەرواری دروستکردنی هەژمار:'}
                  </span>
                  <span className="font-mono font-bold text-slate-200">
                    {formatExactDate(employee.createdAt)}
                  </span>
                </div>
              )}

              {/* Role explanation */}
              <div className="pt-2">
                <span className="text-slate-400 text-[11px] block font-medium">
                  {roleInfo.desc}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 border-t border-white/[0.08] bg-slate-900/60 flex items-center justify-between gap-3">
          {onEdit ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(employee);
              }}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-white rounded-xl text-xs font-bold transition-all shadow-[0_4px_15px_rgba(245,158,11,0.35)] flex items-center gap-1.5 cursor-pointer"
            >
              <Edit className="w-4 h-4" />
              <span>{lang === 'en' ? 'Edit Account & Salary' : 'دەستکاریکردنی هەژمار و مووچە'}</span>
            </button>
          ) : <div />}

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.12] text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer backdrop-blur-md"
          >
            {lang === 'en' ? 'Close' : 'داخستن'}
          </button>
        </div>
      </div>
    </div>
  );
}
