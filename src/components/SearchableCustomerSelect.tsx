import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, User, ShieldAlert, Landmark } from 'lucide-react';
import { Customer } from '../types';

interface SearchableCustomerSelectProps {
  value: string;
  onChange: (id: string) => void;
  customers: Customer[];
  placeholder: string;
  lang?: 'ku' | 'ar' | 'en';
  disabledId?: string;
  includeSafeOption?: boolean;
  buttonClassName?: string;
}

const SYSTEM_IDS_ORDER = [
  'system-expenses',
  'system-exchange',
  'system-transfer-fee',
  'system-profit',
  'system-fast-hawala'
];

export default function SearchableCustomerSelect({
  value,
  onChange,
  customers,
  placeholder,
  lang = 'ku',
  disabledId,
  includeSafeOption = false,
  buttonClassName = ''
}: SearchableCustomerSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const safeLabel = lang === 'en' 
    ? 'Safe (Main Office Vault)' 
    : lang === 'ar' 
    ? 'سندوق خزينة الشركة الرئيسي' 
    : 'سندوق (خانەی گەنجینەی سەرەکی)';

  const getDisplayName = (c: Customer) => {
    if (c.id === 'system-expenses') {
      return lang === 'en' ? 'Expenses (خەرجی)' : lang === 'ar' ? 'المصاريف (خەرجی)' : 'خەرجی (سیستەم)';
    } else if (c.id === 'system-exchange') {
      return lang === 'en' ? 'Currency Exchange (گۆڕینەوەی دراو)' : lang === 'ar' ? 'حساب الصرف (گۆڕینەوەی دراو)' : 'گۆڕینەوەی دراو (سیستەم)';
    } else if (c.id === 'system-transfer-fee') {
      return lang === 'en' ? 'Transfer Fee (کرێی حەواڵە)' : lang === 'ar' ? 'أجور الحوالات (کرێی حەواڵە)' : 'کرێی حەواڵە (سیستەم)';
    } else if (c.id === 'system-profit') {
      return lang === 'en' ? 'System Profit (قازانج)' : lang === 'ar' ? 'الأرباح (قازانج)' : 'قازانج (سیستەم)';
    } else if (c.id === 'system-fast-hawala') {
      return lang === 'en' ? 'Fast Hawala (حەواڵەی خێرا)' : lang === 'ar' ? 'الحوالات السريعة (حەواڵەی خێرا)' : 'حەواڵەی خێرا (سیستەم)';
    }
    return c.name;
  };

  const isSystem = (id: string) => SYSTEM_IDS_ORDER.includes(id);

  // Separate system accounts (fixed order at top) and normal customers
  const { systemCustomers, normalCustomers } = useMemo(() => {
    const sysMap = new Map<string, Customer>();
    const norm: Customer[] = [];

    customers.forEach(c => {
      if (isSystem(c.id)) {
        sysMap.set(c.id, c);
      } else {
        norm.push(c);
      }
    });

    const sys: Customer[] = [];
    SYSTEM_IDS_ORDER.forEach(id => {
      if (sysMap.has(id)) {
        sys.push(sysMap.get(id)!);
      }
    });

    // Sort normal customers by name
    norm.sort((a, b) => a.name.localeCompare(b.name, 'ku'));

    return { systemCustomers: sys, normalCustomers: norm };
  }, [customers]);

  // Normalize Kurdish and Arabic characters for robust search matching
  const normalize = (str: string) => {
    return (str || '')
      .replace(/[ڕ]/g, 'ر')
      .replace(/[ڵ]/g, 'ل')
      .replace(/[ێ]/g, 'ی')
      .replace(/[ۆ]/g, 'و')
      .replace(/[ى]/g, 'ی')
      .replace(/[ي]/g, 'ی')
      .replace(/[ة]/g, 'ە')
      .replace(/[ك]/g, 'ک')
      .toLowerCase()
      .trim();
  };

  // Check if safe matches search
  const matchesSafe = useMemo(() => {
    if (!includeSafeOption) return false;
    if (!searchTerm.trim()) return true;
    const term = normalize(searchTerm);
    const safeKeywords = ['سندوق', 'صندوق', 'گەنجینە', 'گنchannel', 'خزینە', 'خەزینە', 'خزینة', 'خزينة', 'سەرەکی', 'رئیسی', 'safe', 'vault', 'cash'];
    return (
      normalize(safeLabel).includes(term) ||
      safeKeywords.some(k => normalize(k).includes(term) || term.includes(normalize(k)))
    );
  }, [includeSafeOption, searchTerm, safeLabel]);

  // System account keywords map for intelligent multi-lingual / variation search
  const SYSTEM_KEYWORDS: Record<string, string[]> = {
    'system-expenses': ['خەرجی', 'خەرج', 'مەسرەف', 'خەرجکردن', 'expense', 'expenses', 'مصاريف', 'مصروف', 'نفقات'],
    'system-exchange': ['گۆڕینەوە', 'گۆرینەوە', 'ئاڵوگۆڕ', 'دراو', 'صرف', 'تصريف', 'exchange', 'currency', 'fx'],
    'system-transfer-fee': ['کرێ', 'کرێی', 'حەواڵە', 'عمولة', 'أجور', 'اجور', 'fee', 'transfer fee', 'رسوم'],
    'system-profit': ['قازانج', 'قازانجکردن', 'سوود', 'سود', 'قازانجەکان', 'أرباح', 'ارباح', 'ربح', 'profit', 'gain'],
    'system-fast-hawala': ['حەواڵە', 'حوالة', 'حەواڵەی خێرا', 'خێرا', 'سريعة', 'fast', 'hawala']
  };

  // System accounts: keep at top when opening. When searching, ONLY show system accounts that match the search query!
  const filteredSystem = useMemo(() => {
    if (!searchTerm.trim()) {
      return systemCustomers;
    }
    const term = normalize(searchTerm);
    return systemCustomers.filter(c => {
      const displayName = normalize(getDisplayName(c));
      const rawName = normalize(c.name || '');
      const cid = (c.id || '').toLowerCase();
      const keywords = SYSTEM_KEYWORDS[c.id] || [];
      const matchesKeyword = keywords.some(kw => normalize(kw).includes(term) || term.includes(normalize(kw)));
      const matchesSystemWord = term.includes('سیستەم') || term.includes('سیستم') || term.includes('نظام') || term.includes('system');

      return (
        displayName.includes(term) ||
        rawName.includes(term) ||
        cid.includes(term) ||
        matchesKeyword ||
        matchesSystemWord
      );
    });
  }, [systemCustomers, searchTerm, lang]);

  const filteredNormal = useMemo(() => {
    if (!searchTerm.trim()) return normalCustomers;
    const term = normalize(searchTerm);
    const rawTerm = searchTerm.toLowerCase().trim();
    return normalCustomers.filter(c => {
      const normName = normalize(c.name);
      const normDisplay = normalize(getDisplayName(c));
      const phone = c.phone ? c.phone.toLowerCase() : '';
      return (
        normName.includes(term) ||
        normDisplay.includes(term) ||
        (phone && (phone.includes(rawTerm) || phone.includes(term)))
      );
    });
  }, [normalCustomers, searchTerm, lang]);

  const isSafeSelected = includeSafeOption && value === 'Safe';
  const selectedCustomer = !isSafeSelected ? customers.find(c => c.id === value) : null;
  const selectedLabel = isSafeSelected 
    ? safeLabel 
    : selectedCustomer 
    ? getDisplayName(selectedCustomer) 
    : placeholder;

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Selector Trigger Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setSearchTerm('');
        }}
        className={`w-full rounded-xl px-3 text-xs text-right flex items-center justify-between transition-all outline-none backdrop-blur-md ${
          buttonClassName ? buttonClassName : 'py-2.5'
        } ${
          isOpen
            ? 'bg-white/[0.08] border border-[#1D7AFC] ring-2 ring-[#1D7AFC]/30 shadow-[0_0_15px_rgba(29,122,252,0.25)] text-white'
            : 'bg-white/[0.05] border border-white/[0.12] hover:bg-white/[0.08] hover:border-white/[0.22] text-white shadow-xs'
        }`}
      >
        <span className={`truncate flex items-center gap-1.5 ${isSafeSelected || selectedCustomer ? 'font-bold text-white' : 'text-slate-400'}`}>
          {isSafeSelected && <Landmark className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
          {selectedLabel}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180 text-[#1D7AFC]' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 mt-1.5 w-full bg-slate-950/90 backdrop-blur-2xl border border-white/[0.15] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.15)] overflow-hidden animate-fade-in text-right">
          {/* Search Box */}
          <div className="p-2 border-b border-white/[0.08] bg-slate-900/60 sticky top-0 z-10 backdrop-blur-xl">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 pointer-events-none" />
              <input
                type="text"
                autoFocus
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={lang === 'en' ? 'Search customer or system account...' : lang === 'ar' ? 'بحث عن عميل أو حساب نظام...' : 'گەڕان بەدوای کڕیار یان هەژماری سیستەم...'}
                className="w-full bg-white/[0.06] border border-white/[0.12] rounded-xl pr-8 pl-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-[#1D7AFC] focus:ring-2 focus:ring-[#1D7AFC]/30"
              />
            </div>
          </div>

          {/* List Options */}
          <div className="max-h-60 overflow-y-auto divide-y divide-white/[0.05]">
            {/* Safe / Vault Option (when enabled) */}
            {includeSafeOption && matchesSafe && (
              <div className="py-1 border-b border-white/[0.08] bg-emerald-950/30">
                <button
                  type="button"
                  onClick={() => {
                    onChange('Safe');
                    setIsOpen(false);
                  }}
                  className={`w-full text-right px-3 py-2 text-xs flex items-center justify-between transition-colors ${
                    value === 'Safe'
                      ? 'bg-emerald-500/20 text-emerald-300 font-bold'
                      : 'hover:bg-white/[0.08] text-emerald-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Landmark className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <span className="font-bold text-white">{safeLabel}</span>
                      <span className="block text-[10px] text-emerald-400 font-medium">
                        {lang === 'en' ? 'Office Cash Vault' : lang === 'ar' ? 'خزينة النقد الرئيسية' : 'سندوقی پارەی کاشی نووسینگە'}
                      </span>
                    </div>
                  </div>
                  {value === 'Safe' && <Check className="w-4 h-4 text-emerald-400" />}
                </button>
              </div>
            )}

            {/* System Accounts Section */}
            {filteredSystem.length > 0 && (
              <div className="py-1 border-b border-white/[0.08]">
                <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3 text-amber-400" />
                  <span>{lang === 'en' ? 'System Accounts' : lang === 'ar' ? 'حسابات النظام' : 'هەژمارەکانی سیستەم'}</span>
                </div>
                {filteredSystem.map((c) => {
                  const isSelected = c.id === value;
                  const isDisabled = c.id === disabledId;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => {
                        onChange(c.id);
                        setIsOpen(false);
                      }}
                      className={`w-full text-right px-3 py-2 text-xs flex items-center justify-between transition-colors ${
                        isSelected 
                          ? 'bg-[#1D7AFC]/25 text-[#60A5FA] font-bold' 
                          : isDisabled
                          ? 'opacity-30 cursor-not-allowed bg-black/20'
                          : 'hover:bg-white/[0.08] text-slate-200'
                      }`}
                    >
                      <span className="font-semibold flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block shadow-[0_0_6px_rgba(251,191,36,0.6)]"></span>
                        {getDisplayName(c)}
                      </span>
                      {isSelected && <Check className="w-4 h-4 text-[#60A5FA]" />}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Normal Customers Section */}
            {filteredNormal.length > 0 && (
              <div className="py-1">
                {(filteredSystem.length > 0 || (includeSafeOption && matchesSafe)) && (
                  <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <User className="w-3 h-3 text-slate-400" />
                    <span>{lang === 'en' ? 'Customers' : lang === 'ar' ? 'العملاء' : 'کڕیاران'}</span>
                  </div>
                )}
                {filteredNormal.map((c) => {
                  const isSelected = c.id === value;
                  const isDisabled = c.id === disabledId;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => {
                        onChange(c.id);
                        setIsOpen(false);
                      }}
                      className={`w-full text-right px-3 py-2 text-xs flex items-center justify-between transition-colors ${
                        isSelected 
                          ? 'bg-[#1D7AFC]/25 text-[#60A5FA] font-bold' 
                          : isDisabled
                          ? 'opacity-30 cursor-not-allowed bg-black/20'
                          : 'hover:bg-white/[0.08] text-slate-200'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="font-medium text-white">{c.name}</span>
                        {c.phone && <span className="text-[10px] text-slate-400 font-mono">{c.phone}</span>}
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-[#60A5FA]" />}
                    </button>
                  );
                })}
              </div>
            )}

            {!matchesSafe && filteredSystem.length === 0 && filteredNormal.length === 0 && (
              <div className="p-4 text-center text-xs text-slate-400">
                {lang === 'en' ? 'No accounts found' : lang === 'ar' ? 'لم يتم العثور على نتائج' : 'هیچ هەژمارێک نەدۆزرایەوە'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
