import React, { useState, useMemo, useEffect } from 'react';
import { 
  ArrowUpRight, ArrowDownRight, RefreshCw, Zap, Layers, 
  ArrowLeftRight, CheckCircle2, Send, PlusCircle, Sparkles, Clock, Calendar
} from 'lucide-react';
import { Currency } from '../types';
import { AppState } from '../data/stateManager';
import { formatMoney, formatInputValue, parseInputValue, formatKurdishDateTime, deduplicateTransactions } from '../utils';
import { translations } from '../data/translations';
import SearchableCustomerSelect from './SearchableCustomerSelect';
import GlassCard from './GlassCard';

interface UniversalEntryViewProps {
  appState: AppState;
  onPrintReceipt?: (type: 'Transaction', data: any) => void;
  onCreateFastTransfer?: (
    senderId: string, 
    receiverName: string, 
    receiverPhone: string, 
    amount: number, 
    currency: Currency, 
    fee: number, 
    notes?: string
  ) => void;
  onCreateStandardTransfer?: (
    buyerCustomerId: string,
    sellerCustomerId: string,
    amount: number,
    buyRate: number,
    sellRate: number,
    beneficiaryName: string,
    deliveryLocation: string,
    notes?: string,
    currency?: Currency
  ) => void;
  onCreateInternalTransfer?: (
    senderId: string,
    receiverId: string,
    currency: Currency,
    amount: number,
    notes?: string
  ) => void;
  onModifyCustomerBalance?: (
    customerId: string, 
    type: 'Deposit' | 'Withdrawal', 
    currency: Currency, 
    amount: number, 
    notes?: string
  ) => void;
  onExecuteExchange?: (
    sourceType: 'Safe' | string,
    action: 'BuyUSD' | 'SellUSD',
    otherCurrency: string,
    usdAmount: number,
    rate: number,
    notes?: string
  ) => void;
}

export default function UniversalEntryView({
  appState,
  onPrintReceipt,
  onCreateFastTransfer,
  onCreateStandardTransfer,
  onCreateInternalTransfer,
  onModifyCustomerBalance,
  onExecuteExchange
}: UniversalEntryViewProps) {
  const { customers, settings, currencies, transactions } = appState;
  const lang = settings.language || 'ku';
  const t = translations[lang];

  const getTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = getTodayString();

  // Deduplicate and filter exclusively for today's transactions
  const uniqueTransactions = useMemo(() => {
    return deduplicateTransactions(transactions || []);
  }, [transactions]);

  const todayTransactions = useMemo(() => {
    return uniqueTransactions.filter(tx => {
      if (!tx.timestamp) return true;
      let txDateStr = '';
      try {
        const txDate = new Date(tx.timestamp);
        if (!isNaN(txDate.getTime())) {
          const year = txDate.getFullYear();
          const month = String(txDate.getMonth() + 1).padStart(2, '0');
          const day = String(txDate.getDate()).padStart(2, '0');
          txDateStr = `${year}-${month}-${day}`;
        } else {
          txDateStr = tx.timestamp.split('T')[0].split(' ')[0];
        }
      } catch {
        txDateStr = tx.timestamp.split('T')[0].split(' ')[0];
      }
      return txDateStr === todayStr;
    });
  }, [uniqueTransactions, todayStr]);

  // Pagination for Today's Transactions (20 items per page as requested)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const totalPages = useMemo(() => {
    return Math.ceil(todayTransactions.length / itemsPerPage) || 1;
  }, [todayTransactions.length, itemsPerPage]);

  const activePage = Math.min(currentPage, totalPages);

  const paginatedTransactions = useMemo(() => {
    const startIndex = (activePage - 1) * itemsPerPage;
    return todayTransactions.slice(startIndex, startIndex + itemsPerPage);
  }, [todayTransactions, activePage, itemsPerPage]);

  // Universal Entry Mode
  const [entryMode, setEntryMode] = useState<'deposit' | 'withdrawal' | 'exchange' | 'fast_hawala' | 'standard_hawala' | 'internal_transfer'>('deposit');
  
  // Fast Hawala
  const [fastSenderId, setFastSenderId] = useState('');
  const [fastCurrency, setFastCurrency] = useState<Currency>(settings.defaultCurrency || 'USD');
  const [fastFee, setFastFee] = useState('');
  const [fastAmount, setFastAmount] = useState('');
  const [fastRecName, setFastRecName] = useState('');
  const [fastRecPhone, setFastRecPhone] = useState('');
  const [fastNotes, setFastNotes] = useState('');

  // Standard Hawala
  const [stdBuyCustId, setStdBuyCustId] = useState('');
  const [stdSellCustId, setStdSellCustId] = useState('');
  const [stdCurrency, setStdCurrency] = useState<Currency>(settings.defaultCurrency || 'USD');
  const [stdBuyRate, setStdBuyRate] = useState('');
  const [stdSellRate, setStdSellRate] = useState('');
  const [stdAmount, setStdAmount] = useState('');
  const [stdBeneficiaryName, setStdBeneficiaryName] = useState('');
  const [stdDeliveryLocation, setStdDeliveryLocation] = useState(settings.locations?.[0] || 'سلێمانی');
  const [stdNotes, setStdNotes] = useState('');

  // Internal Transfer
  const [intSenderId, setIntSenderId] = useState('');
  const [intRecId, setIntRecId] = useState('');
  const [intCurrency, setIntCurrency] = useState<Currency>(settings.defaultCurrency || 'USD');
  const [intAmount, setIntAmount] = useState('');
  const [intNotes, setIntNotes] = useState('');

  // Deposit
  const [depCustId, setDepCustId] = useState('');
  const [depCurrency, setDepCurrency] = useState<Currency>(settings.defaultCurrency || 'USD');
  const [depAmount, setDepAmount] = useState('');
  const [depNotes, setDepNotes] = useState('');

  // Withdrawal
  const [withCustId, setWithCustId] = useState('');
  const [withCurrency, setWithCurrency] = useState<Currency>(settings.defaultCurrency || 'USD');
  const [withAmount, setWithAmount] = useState('');
  const [withNotes, setWithNotes] = useState('');

  // Currency Exchange (گۆڕینەوەی دراو)
  const nonUSDCurrencies = useMemo(() => {
    return currencies.filter(c => c !== 'USD');
  }, [currencies]);

  const [exSourceType, setExSourceType] = useState<'Safe' | string>('Safe');
  const [exAction, setExAction] = useState<'BuyUSD' | 'SellUSD'>('BuyUSD');
  const [exOtherCurrency, setExOtherCurrency] = useState<string>(nonUSDCurrencies[0] || 'IQD');
  const [exUsdAmount, setExUsdAmount] = useState('');
  const [exRate, setExRate] = useState('');
  const [exNotes, setExNotes] = useState('');

  useEffect(() => {
    if (nonUSDCurrencies.length > 0 && !nonUSDCurrencies.includes(exOtherCurrency)) {
      setExOtherCurrency(nonUSDCurrencies[0]);
    }
  }, [currencies, nonUSDCurrencies, exOtherCurrency]);

  const exNumUSD = parseFloat(parseInputValue(exUsdAmount)) || 0;
  const exNumRate = parseFloat(parseInputValue(exRate)) || 0;
  const exCalculatedOther = Math.round(exNumUSD * exNumRate);

  // Success Notification
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const showSuccess = (msg: string) => {
    setSuccessBanner(msg);
    setCurrentPage(1);
    setTimeout(() => setSuccessBanner(null), 3500);
  };

  const handleUniversalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (entryMode === 'fast_hawala') {
      if (!fastSenderId || !fastAmount) return;
      const numAmt = parseFloat(parseInputValue(fastAmount));
      const numFee = parseFloat(parseInputValue(fastFee)) || 0;
      if (isNaN(numAmt) || numAmt <= 0) return;

      onCreateFastTransfer?.(
        fastSenderId,
        fastRecName,
        fastRecPhone,
        numAmt,
        fastCurrency,
        numFee,
        fastNotes
      );
      showSuccess(lang === 'en' ? 'Fast Hawala created successfully!' : lang === 'ar' ? 'تم إنشاء الحوالة السريعة بنجاح!' : 'حەواڵەی خێرا بە سەرکەوتوویی تۆمارکرا!');
      setFastAmount('');
      setFastFee('');
      setFastRecName('');
      setFastRecPhone('');
      setFastNotes('');
    } else if (entryMode === 'standard_hawala') {
      if (!stdBuyCustId || !stdSellCustId || !stdAmount) return;
      const numAmt = parseFloat(parseInputValue(stdAmount));
      const numBuy = parseFloat(parseInputValue(stdBuyRate)) || 0;
      const numSell = parseFloat(parseInputValue(stdSellRate)) || 0;
      if (isNaN(numAmt) || numAmt <= 0) return;

      onCreateStandardTransfer?.(
        stdBuyCustId,
        stdSellCustId,
        numAmt,
        numBuy,
        numSell,
        stdBeneficiaryName,
        stdDeliveryLocation,
        stdNotes,
        stdCurrency
      );
      showSuccess(lang === 'en' ? 'Standard Hawala created successfully!' : lang === 'ar' ? 'تم إنشاء الحوالة القياسية بنجاح!' : 'حەواڵەی ستاندارد بە سەرکەوتوویی تۆمارکرا!');
      setStdAmount('');
      setStdBuyRate('');
      setStdSellRate('');
      setStdBeneficiaryName('');
      setStdDeliveryLocation('');
      setStdNotes('');
    } else if (entryMode === 'internal_transfer') {
      if (!intSenderId || !intRecId || !intAmount) return;
      if (intSenderId === intRecId) {
        alert(lang === 'en' ? 'Sender and receiver cannot be the same customer.' : lang === 'ar' ? 'لا يمكن اختيار نفس العميل للطرفين.' : 'نێرەر و وەرگر ناكرێت هەمان کڕیار بن.');
        return;
      }
      const numAmt = parseFloat(parseInputValue(intAmount));
      if (isNaN(numAmt) || numAmt <= 0) return;

      onCreateInternalTransfer?.(
        intSenderId,
        intRecId,
        intCurrency,
        numAmt,
        intNotes
      );
      showSuccess(lang === 'en' ? 'Internal Transfer completed successfully!' : lang === 'ar' ? 'تمت عملية النقل الداخلي بنجاح!' : 'گواستنەوەی ناوخۆیی بە سەرکەوتوویی تۆمارکرا!');
      setIntAmount('');
      setIntNotes('');
    } else if (entryMode === 'deposit') {
      if (!depCustId || !depAmount) return;
      const numAmt = parseFloat(parseInputValue(depAmount));
      if (isNaN(numAmt) || numAmt <= 0) return;

      onModifyCustomerBalance?.(
        depCustId,
        'Deposit',
        depCurrency,
        numAmt,
        depNotes
      );
      showSuccess(lang === 'en' ? 'Deposit recorded successfully!' : lang === 'ar' ? 'تم تسجيل الإيداع بنجاح!' : 'پارە دانان بە سەرکەوتوویی تۆمارکرا!');
      setDepAmount('');
      setDepNotes('');
    } else if (entryMode === 'withdrawal') {
      if (!withCustId || !withAmount) return;
      const numAmt = parseFloat(parseInputValue(withAmount));
      if (isNaN(numAmt) || numAmt <= 0) return;

      onModifyCustomerBalance?.(
        withCustId,
        'Withdrawal',
        withCurrency,
        numAmt,
        withNotes
      );
      showSuccess(lang === 'en' ? 'Withdrawal recorded successfully!' : lang === 'ar' ? 'تم تسجيل السحب بنجاح!' : 'پارە ڕاکێشان بە سەرکەوتوویی تۆمارکرا!');
      setWithAmount('');
      setWithNotes('');
    } else if (entryMode === 'exchange') {
      if (exNumUSD <= 0 || exNumRate <= 0) return;

      onExecuteExchange?.(
        exSourceType,
        exAction,
        exOtherCurrency,
        exNumUSD,
        exNumRate,
        exNotes
      );
      showSuccess(
        lang === 'en' 
          ? 'Currency exchange executed successfully!' 
          : lang === 'ar' 
            ? 'تمت عملية صرافة العملات بنجاح!' 
            : 'گۆڕینەوەی دراو بە سەرکەوتوویی تۆمارکرا!'
      );
      setExUsdAmount('');
      setExRate('');
      setExNotes('');
    }
  };

  return (
    <div className={`space-y-6 animate-fade-in pb-12 ${lang === 'en' ? 'text-left' : 'text-right'}`}>
      {/* Top Header Card */}
      <GlassCard className="p-0" contentClassName="p-5 sm:p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 view-header" data-animate="header">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white rtl:border-r-4 rtl:pr-3 ltr:border-l-4 ltr:pl-3 border-[#1D7AFC] flex items-center gap-2.5">
              <PlusCircle className="w-6 h-6 text-[#1D7AFC]" />
              <span>{t.universal_entry}</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              {lang === 'en'
                ? 'Quickly record deposits, withdrawals, transfers, and currency exchanges'
                : lang === 'ar'
                ? 'تسجيل سريع للإيداعات، السحوبات، الحوالات وصرف العملات'
                : 'تۆمارکردنی خێرای پارەدانان، پارە ڕاکێشان، حەواڵە و ئاڵوگۆڕی دراو'}
            </p>
          </div>
        </div>
      </GlassCard>

      {/* Main Entry Card */}
      <div data-animate="card" className="glass-card transform-gpu bg-slate-950/35 backdrop-blur-2xl backdrop-saturate-150 p-5 sm:p-6 rounded-2xl border border-white/[0.12] shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.22),inset_0_0_24px_rgba(255,255,255,0.03),0_20px_50px_rgba(0,0,0,0.45)] space-y-5">
        {/* Success Banner */}
        {successBanner && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2 animate-fade-in shadow-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successBanner}</span>
          </div>
        )}

        {/* Mode selection pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar border-b border-white/[0.08]">
          <button
            type="button"
            onClick={() => setEntryMode('deposit')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer backdrop-blur-md ${
              entryMode === 'deposit'
                ? 'bg-emerald-600 text-white shadow-[0_4px_20px_rgba(16,185,129,0.35),inset_0_1px_0_rgba(255,255,255,0.3)] font-black'
                : 'bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] text-slate-200'
            }`}
          >
            <ArrowDownRight className="w-4 h-4 text-emerald-400" />
            <span>{lang === 'en' ? 'Deposit' : lang === 'ar' ? 'إيداع' : 'پارە دانان'}</span>
          </button>
          
          <button
            type="button"
            onClick={() => setEntryMode('withdrawal')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer backdrop-blur-md ${
              entryMode === 'withdrawal'
                ? 'bg-rose-600 text-white shadow-[0_4px_20px_rgba(225,29,72,0.35),inset_0_1px_0_rgba(255,255,255,0.3)] font-black'
                : 'bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] text-slate-200'
            }`}
          >
            <ArrowUpRight className="w-4 h-4 text-rose-400" />
            <span>{lang === 'en' ? 'Withdrawal' : lang === 'ar' ? 'سحب' : 'پارە ڕاکێشان'}</span>
          </button>

          <button
            type="button"
            onClick={() => setEntryMode('exchange')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer backdrop-blur-md ${
              entryMode === 'exchange'
                ? 'bg-amber-500 text-white shadow-[0_4px_20px_rgba(245,158,11,0.35),inset_0_1px_0_rgba(255,255,255,0.3)] font-black'
                : 'bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] text-slate-200'
            }`}
          >
            <RefreshCw className="w-4 h-4 text-amber-400" />
            <span>{lang === 'en' ? 'Exchange' : lang === 'ar' ? 'صرافة العملات' : 'گۆڕینەوەی دراو'}</span>
          </button>

          <button
            type="button"
            onClick={() => setEntryMode('fast_hawala')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer backdrop-blur-md ${
              entryMode === 'fast_hawala'
                ? 'bg-[#1D7AFC] text-white shadow-[0_4px_20px_rgba(29,122,252,0.4),inset_0_1px_0_rgba(255,255,255,0.3)] font-black'
                : 'bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] text-slate-200'
            }`}
          >
            <Zap className="w-4 h-4 text-cyan-400" />
            <span>{lang === 'en' ? 'Fast Hawala' : lang === 'ar' ? 'حوالة سريعة' : 'حەواڵەی خێرا'}</span>
          </button>

          <button
            type="button"
            onClick={() => setEntryMode('standard_hawala')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer backdrop-blur-md ${
              entryMode === 'standard_hawala'
                ? 'bg-[#1D7AFC] text-white shadow-[0_4px_20px_rgba(29,122,252,0.4),inset_0_1px_0_rgba(255,255,255,0.3)] font-black'
                : 'bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4 text-blue-400" />
            <span>{lang === 'en' ? 'Standard Hawala' : lang === 'ar' ? 'حوالة قياسية' : 'حەواڵەی ستاندارد'}</span>
          </button>

          <button
            type="button"
            onClick={() => setEntryMode('internal_transfer')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer backdrop-blur-md ${
              entryMode === 'internal_transfer'
                ? 'bg-[#1D7AFC] text-white shadow-[0_4px_20px_rgba(29,122,252,0.4),inset_0_1px_0_rgba(255,255,255,0.3)] font-black'
                : 'bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] text-slate-200'
            }`}
          >
            <ArrowLeftRight className="w-4 h-4 text-indigo-400" />
            <span>{lang === 'en' ? 'Internal Transfer' : lang === 'ar' ? 'تحويل داخلي' : 'گواستنەوەی ناوخۆیی'}</span>
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleUniversalSubmit} className="space-y-4 pt-1">
          {/* 1. Deposit */}
          {entryMode === 'deposit' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
                <div className="col-span-1 sm:col-span-2">
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">{lang === 'en' ? 'Customer' : lang === 'ar' ? 'العميل' : 'کڕیار'}</label>
                  <SearchableCustomerSelect
                    value={depCustId}
                    onChange={setDepCustId}
                    customers={customers}
                    placeholder={lang === 'en' ? 'Select Customer...' : lang === 'ar' ? 'اختر العميل...' : 'کڕیار هەڵبژێرە...'}
                    lang={lang}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">{lang === 'en' ? 'Currency' : lang === 'ar' ? 'العملة' : 'دراو'}</label>
                  <select
                    value={depCurrency}
                    onChange={(e) => setDepCurrency(e.target.value as Currency)}
                    className="w-full border border-gray-200 rounded-xl px-2.5 py-2 text-xs font-bold outline-none focus:ring-1 focus:ring-primary h-[38px] bg-white cursor-pointer"
                  >
                    {currencies.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">{lang === 'en' ? 'Amount Received' : lang === 'ar' ? 'المبلغ المودع' : 'بڕی وەرگیراو (دانان)'}</label>
                  <input
                    type="text"
                    required
                    value={depAmount}
                    onChange={(e) => setDepAmount(formatInputValue(e.target.value))}
                    placeholder="0"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono font-bold outline-none focus:ring-1 focus:ring-emerald-600 h-[38px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1">{lang === 'en' ? 'Notes' : lang === 'ar' ? 'الملاحظات' : 'تێبینی'}</label>
                <input
                  type="text"
                  value={depNotes}
                  onChange={(e) => setDepNotes(e.target.value)}
                  placeholder={lang === 'en' ? 'Optional note or receipt description...' : lang === 'ar' ? 'ملاحظة اختيارية...' : 'تێبینی یان وردەکاری وەسڵ...'}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-1 focus:ring-emerald-600 h-[38px] bg-white"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex justify-end">
                <button
                  type="submit"
                  disabled={!depCustId || !depAmount}
                  className="w-full sm:w-auto min-w-[200px] bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 text-white font-bold py-2.5 px-6 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm h-[40px]"
                >
                  <ArrowDownRight className="w-4 h-4" />
                  <span>{lang === 'en' ? 'Record Deposit' : lang === 'ar' ? 'تسجيل الإيداع' : 'تۆمارکردنی دانان (پارە وەرگرتن)'}</span>
                </button>
              </div>
            </div>
          )}

          {/* 2. Withdrawal */}
          {entryMode === 'withdrawal' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
                <div className="col-span-1 sm:col-span-2">
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">{lang === 'en' ? 'Customer' : lang === 'ar' ? 'العميل' : 'کڕیار'}</label>
                  <SearchableCustomerSelect
                    value={withCustId}
                    onChange={setWithCustId}
                    customers={customers}
                    placeholder={lang === 'en' ? 'Select Customer...' : lang === 'ar' ? 'اختر العميل...' : 'کڕیار هەڵبژێرە...'}
                    lang={lang}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">{lang === 'en' ? 'Currency' : lang === 'ar' ? 'العملة' : 'دراو'}</label>
                  <select
                    value={withCurrency}
                    onChange={(e) => setWithCurrency(e.target.value as Currency)}
                    className="w-full border border-gray-200 rounded-xl px-2.5 py-2 text-xs font-bold outline-none focus:ring-1 focus:ring-primary h-[38px] bg-white cursor-pointer"
                  >
                    {currencies.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">{lang === 'en' ? 'Amount Paid' : lang === 'ar' ? 'المبلغ المسحوب' : 'بڕی پێدراو (ڕاکێشان)'}</label>
                  <input
                    type="text"
                    required
                    value={withAmount}
                    onChange={(e) => setWithAmount(formatInputValue(e.target.value))}
                    placeholder="0"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono font-bold outline-none focus:ring-1 focus:ring-rose-600 h-[38px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1">{lang === 'en' ? 'Notes' : lang === 'ar' ? 'الملاحظات' : 'تێبینی'}</label>
                <input
                  type="text"
                  value={withNotes}
                  onChange={(e) => setWithNotes(e.target.value)}
                  placeholder={lang === 'en' ? 'Optional note or receipt description...' : lang === 'ar' ? 'ملاحظة اختيارية...' : 'تێبینی یان هۆکاری ڕاکێشان...'}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-1 focus:ring-rose-600 h-[38px] bg-white"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex justify-end">
                <button
                  type="submit"
                  disabled={!withCustId || !withAmount}
                  className="w-full sm:w-auto min-w-[200px] bg-rose-600 hover:bg-rose-700 disabled:bg-gray-200 text-white font-bold py-2.5 px-6 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm h-[40px]"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  <span>{lang === 'en' ? 'Record Withdrawal' : lang === 'ar' ? 'تسجيل السحب' : 'تۆمارکردنی ڕاکێشان (پارە دان)'}</span>
                </button>
              </div>
            </div>
          )}

          {/* 3. Exchange (گۆڕینەوەی دراو) */}
          {entryMode === 'exchange' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-12 gap-3 items-end">
                {/* Source: Safe or Customer (3 cols) */}
                <div className="xl:col-span-3">
                  <label className="block text-[11px] font-bold text-gray-500 mb-1">
                    {lang === 'en' ? 'Source' : lang === 'ar' ? 'المصدر' : 'سەرچاوە (سندوق یان کڕیار)'}
                  </label>
                  <SearchableCustomerSelect
                    value={exSourceType}
                    onChange={setExSourceType}
                    customers={customers}
                    placeholder={lang === 'en' ? 'Select Safe or Customer...' : lang === 'ar' ? 'اختر الخزينة أو العميل...' : 'سندوق یان کڕیار هەڵبژێرە...'}
                    includeSafeOption={true}
                    lang={lang}
                  />
                </div>

                {/* Operation Type: Buy USD / Sell USD (2 cols) */}
                <div className="xl:col-span-2">
                  <label className="block text-[11px] font-bold text-gray-500 mb-1">
                    {lang === 'en' ? 'Operation' : lang === 'ar' ? 'نوع العملية' : 'جۆری کردار'}
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 h-[38px]">
                    <button
                      type="button"
                      onClick={() => setExAction('BuyUSD')}
                      className={`px-2 py-1 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                        exAction === 'BuyUSD'
                          ? 'bg-emerald-600 text-white border-emerald-600 font-black shadow-xs'
                          : 'bg-white/[0.06] border-white/[0.12] text-slate-300 hover:bg-white/[0.1] hover:text-white'
                      }`}
                    >
                      {lang === 'en' ? 'Buy USD' : lang === 'ar' ? 'شراء $' : 'کڕینی $'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setExAction('SellUSD')}
                      className={`px-2 py-1 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                        exAction === 'SellUSD'
                          ? 'bg-rose-600 text-white border-rose-600 font-black shadow-xs'
                          : 'bg-white/[0.06] border-white/[0.12] text-slate-300 hover:bg-white/[0.1] hover:text-white'
                      }`}
                    >
                      {lang === 'en' ? 'Sell USD' : lang === 'ar' ? 'بيع $' : 'فرۆشتنی $'}
                    </button>
                  </div>
                </div>

                {/* Counter Currency (1 col) */}
                <div className="xl:col-span-1">
                  <label className="block text-[11px] font-bold text-gray-500 mb-1">
                    {lang === 'en' ? 'Currency' : lang === 'ar' ? 'العملة المقابلة' : 'دراوی تر'}
                  </label>
                  <select
                    value={exOtherCurrency}
                    onChange={(e) => setExOtherCurrency(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-2.5 py-2 text-xs font-bold outline-none focus:ring-1 focus:ring-amber-500 h-[38px] bg-white font-mono"
                  >
                    {nonUSDCurrencies.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {/* Exchange Rate (2 cols) */}
                <div className="xl:col-span-2">
                  <label className="block text-[11px] font-bold text-gray-500 mb-1">
                    {lang === 'en' ? 'Rate (1 USD)' : lang === 'ar' ? 'سعر الصرف' : 'نرخی 1 دۆلار'}
                  </label>
                  <input
                    type="text"
                    required
                    value={exRate}
                    onChange={(e) => setExRate(formatInputValue(e.target.value))}
                    placeholder="1500"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono font-bold outline-none focus:ring-1 focus:ring-amber-500 h-[38px] text-center bg-white"
                  />
                </div>

                {/* USD Amount (2 cols) */}
                <div className="xl:col-span-2">
                  <label className="block text-[11px] font-bold text-gray-500 mb-1">
                    {lang === 'en' ? 'USD Amount' : lang === 'ar' ? 'مبلغ الدولار' : 'بڕی دۆلار ($)'}
                  </label>
                  <input
                    type="text"
                    required
                    value={exUsdAmount}
                    onChange={(e) => setExUsdAmount(formatInputValue(e.target.value))}
                    placeholder="0"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono font-bold outline-none focus:ring-1 focus:ring-amber-500 h-[38px] placeholder:text-gray-400 placeholder:font-normal"
                  />
                </div>

                {/* Notes (2 cols) */}
                <div className="xl:col-span-2">
                  <label className="block text-[11px] font-bold text-gray-500 mb-1">
                    {lang === 'en' ? 'Notes' : lang === 'ar' ? 'ملاحظات' : 'تێبینی'}
                  </label>
                  <input
                    type="text"
                    value={exNotes}
                    onChange={(e) => setExNotes(e.target.value)}
                    placeholder={lang === 'en' ? 'Exchange notes...' : lang === 'ar' ? 'ملاحظات الصرافة...' : 'تێبینی گۆڕینەوە...'}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-1 focus:ring-amber-500 h-[38px] bg-white"
                  />
                </div>
              </div>

              {/* Calculated live conversion preview */}
              {exNumUSD > 0 && exNumRate > 0 && (
                <div className="bg-primary text-white rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-bold shadow-xs">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-white animate-spin-slow shrink-0" />
                    <span className="text-white">
                      {exAction === 'BuyUSD'
                        ? (lang === 'en' ? 'Receiving USD & Paying out Counter Currency:' : lang === 'ar' ? 'استلام الدولار ودفع العملة المقابلة:' : 'وەرگرتنی دۆلار و پێدانی دراوی بەرامبەر:')
                        : (lang === 'en' ? 'Giving USD & Receiving Counter Currency:' : lang === 'ar' ? 'تسليم الدولار واستلام العملة المقابلة:' : 'پێدانی دۆلار و وەرگرتنی دراوی بەرامبەر:')
                      }
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 font-mono">
                    <span className="bg-white/20 px-3 py-1 rounded-lg border border-white/25 text-white font-black text-xs shadow-xs">
                      ${exNumUSD.toLocaleString()} USD
                    </span>
                    <span className="text-white/80 font-bold">⇄</span>
                    <span className="bg-white/20 px-3 py-1 rounded-lg border border-white/25 text-white font-black text-xs shadow-xs">
                      {exCalculatedOther.toLocaleString()} {exOtherCurrency}
                    </span>
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-gray-100 flex justify-end">
                <button
                  type="submit"
                  disabled={exNumUSD <= 0 || exNumRate <= 0}
                  className="w-full sm:w-auto min-w-[200px] bg-amber-500 hover:bg-amber-600 disabled:bg-gray-200 text-white font-bold py-2.5 px-6 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs h-[40px]"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>{lang === 'en' ? 'Execute Exchange' : lang === 'ar' ? 'تنفيذ الصرافة' : 'تۆمارکردنی گۆڕینەوەی دراو'}</span>
                </button>
              </div>
            </div>
          )}

          {/* 4. Fast Hawala */}
          {entryMode === 'fast_hawala' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3 items-end">
                <div className="col-span-1 xl:col-span-2">
                  <label className="block text-[11px] font-bold text-gray-500 mb-1">{lang === 'en' ? 'Sender Customer' : lang === 'ar' ? 'العميل المرسل' : 'کڕیاری نێرەر'}</label>
                  <SearchableCustomerSelect
                    value={fastSenderId}
                    onChange={setFastSenderId}
                    customers={customers}
                    placeholder={lang === 'en' ? 'Select Sender...' : lang === 'ar' ? 'اختر المرسل...' : 'نێرەر هەڵبژێرە...'}
                    lang={lang}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-500 mb-1">{lang === 'en' ? 'Currency' : lang === 'ar' ? 'العملة' : 'دراو'}</label>
                  <select
                    value={fastCurrency}
                    onChange={(e) => setFastCurrency(e.target.value as Currency)}
                    className="w-full border border-gray-200 rounded-xl px-2.5 py-2 text-xs font-bold outline-none focus:ring-1 focus:ring-primary h-[38px] bg-white cursor-pointer"
                  >
                    {currencies.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-500 mb-1">{lang === 'en' ? 'Fee' : lang === 'ar' ? 'العمولة' : 'کرێی حەواڵە'}</label>
                  <input
                    type="text"
                    value={fastFee}
                    onChange={(e) => setFastFee(formatInputValue(e.target.value))}
                    placeholder="0"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono font-bold outline-none focus:ring-1 focus:ring-primary h-[38px]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-500 mb-1">{lang === 'en' ? 'Amount' : lang === 'ar' ? 'المبلغ' : 'بڕی نێردراو'}</label>
                  <input
                    type="text"
                    required
                    value={fastAmount}
                    onChange={(e) => setFastAmount(formatInputValue(e.target.value))}
                    placeholder="0"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono font-bold outline-none focus:ring-1 focus:ring-primary h-[38px]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-500 mb-1">{lang === 'en' ? 'Receiver Name' : lang === 'ar' ? 'اسم المستلم' : 'ناوی وەرگر'}</label>
                  <input
                    type="text"
                    required
                    value={fastRecName}
                    onChange={(e) => setFastRecName(e.target.value)}
                    placeholder={lang === 'en' ? 'Full name' : lang === 'ar' ? 'الاسم الكامل' : 'ناوی سیانی'}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-1 focus:ring-primary h-[38px]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-500 mb-1">{lang === 'en' ? 'Receiver Phone' : lang === 'ar' ? 'هاتف المستلم' : 'موبایلی وەرگر'}</label>
                  <input
                    type="text"
                    value={fastRecPhone}
                    onChange={(e) => setFastRecPhone(e.target.value)}
                    placeholder="0750..."
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono font-bold outline-none focus:ring-1 focus:ring-primary h-[38px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 mb-1">{lang === 'en' ? 'Notes' : lang === 'ar' ? 'ملاحظات' : 'تێبینی'}</label>
                <input
                  type="text"
                  value={fastNotes}
                  onChange={(e) => setFastNotes(e.target.value)}
                  placeholder={lang === 'en' ? 'Optional transfer note...' : lang === 'ar' ? 'ملاحظات الحوالة...' : 'تێبینی یان وردەکاری...'}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-1 focus:ring-primary h-[38px] bg-white"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex justify-end">
                <button
                  type="submit"
                  disabled={!fastSenderId || !fastAmount}
                  className="w-full sm:w-auto min-w-[200px] bg-primary hover:bg-primary-dark disabled:bg-gray-200 text-white font-bold py-2.5 px-6 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs h-[40px]"
                >
                  <Send className="w-4 h-4" />
                  <span>{lang === 'en' ? 'Save Fast Hawala' : lang === 'ar' ? 'حفظ الحوالة السريعة' : 'تۆمارکردنی حەواڵەی خێرا'}</span>
                </button>
              </div>
            </div>
          )}

          {/* 5. Standard Hawala */}
          {entryMode === 'standard_hawala' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-12 gap-3 items-end">
                {/* Buying Customer (2 cols) */}
                <div className="xl:col-span-2">
                  <label className="block text-[11px] font-bold text-gray-500 mb-1">{lang === 'en' ? 'Buying Customer' : lang === 'ar' ? 'العميل المشتري' : 'کڕیاری کڕین'}</label>
                  <SearchableCustomerSelect
                    value={stdBuyCustId}
                    onChange={setStdBuyCustId}
                    customers={customers}
                    placeholder={lang === 'en' ? 'Select Buyer...' : lang === 'ar' ? 'اختر المشتري...' : 'کڕیار هەڵبژێرە...'}
                    lang={lang}
                  />
                </div>

                {/* Selling Customer (2 cols) */}
                <div className="xl:col-span-2">
                  <label className="block text-[11px] font-bold text-gray-500 mb-1">{lang === 'en' ? 'Selling Customer' : lang === 'ar' ? 'العميل البائع' : 'کڕیاری فرۆشتن'}</label>
                  <SearchableCustomerSelect
                    value={stdSellCustId}
                    onChange={setStdSellCustId}
                    customers={customers}
                    disabledId={stdBuyCustId}
                    placeholder={lang === 'en' ? 'Select Seller...' : lang === 'ar' ? 'اختر البائع...' : 'فرۆشیار هەڵبژێرە...'}
                    lang={lang}
                  />
                </div>

                {/* Currency (1 col) */}
                <div className="xl:col-span-1">
                  <label className="block text-[11px] font-bold text-gray-500 mb-1">{lang === 'en' ? 'Currency' : lang === 'ar' ? 'العملة' : 'دراو'}</label>
                  <select
                    value={stdCurrency}
                    onChange={(e) => setStdCurrency(e.target.value as Currency)}
                    className="w-full border border-gray-200 rounded-xl px-2.5 py-2 text-xs font-bold outline-none focus:ring-1 focus:ring-primary h-[38px] bg-white cursor-pointer"
                  >
                    {currencies.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {/* Buy Rate (1 col) */}
                <div className="xl:col-span-1">
                  <label className="block text-[11px] font-bold text-gray-500 mb-1">{lang === 'en' ? 'Buy Rate' : lang === 'ar' ? 'سعر الشراء' : 'نرخی کڕین'}</label>
                  <input
                    type="text"
                    value={stdBuyRate}
                    onChange={(e) => setStdBuyRate(formatInputValue(e.target.value))}
                    placeholder="1500"
                    className="w-full border border-gray-200 rounded-xl px-2 py-2 text-xs font-mono font-bold outline-none focus:ring-1 focus:ring-primary h-[38px] text-center"
                  />
                </div>

                {/* Sell Rate (1 col) */}
                <div className="xl:col-span-1">
                  <label className="block text-[11px] font-bold text-gray-500 mb-1">{lang === 'en' ? 'Sell Rate' : lang === 'ar' ? 'سعر البيع' : 'نرخی فرۆشتن'}</label>
                  <input
                    type="text"
                    value={stdSellRate}
                    onChange={(e) => setStdSellRate(formatInputValue(e.target.value))}
                    placeholder="1505"
                    className="w-full border border-gray-200 rounded-xl px-2 py-2 text-xs font-mono font-bold outline-none focus:ring-1 focus:ring-primary h-[38px] text-center"
                  />
                </div>

                {/* Amount (2 cols) */}
                <div className="xl:col-span-2">
                  <label className="block text-[11px] font-bold text-gray-500 mb-1">{lang === 'en' ? 'Amount' : lang === 'ar' ? 'المبلغ' : 'بڕی نێردراو'}</label>
                  <input
                    type="text"
                    required
                    value={stdAmount}
                    onChange={(e) => setStdAmount(formatInputValue(e.target.value))}
                    placeholder="0"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono font-bold outline-none focus:ring-1 focus:ring-primary h-[38px] text-base text-primary bg-primary/5"
                  />
                </div>

                {/* Beneficiary Name (1 col) */}
                <div className="xl:col-span-1">
                  <label className="block text-[11px] font-bold text-gray-500 mb-1">{lang === 'en' ? 'Beneficiary' : lang === 'ar' ? 'المستفيد' : 'ناوی سودمەند'}</label>
                  <input
                    type="text"
                    value={stdBeneficiaryName}
                    onChange={(e) => setStdBeneficiaryName(e.target.value)}
                    placeholder={lang === 'en' ? 'Beneficiary Name' : lang === 'ar' ? 'اسم المستفيد' : 'ناوی سیانی'}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-1 focus:ring-primary h-[38px]"
                  />
                </div>

                {/* Delivery Location (1 col) */}
                <div className="xl:col-span-1">
                  <label className="block text-[11px] font-bold text-gray-500 mb-1">{lang === 'en' ? 'Location' : lang === 'ar' ? 'الموقع' : 'شوێن'}</label>
                  {settings.locations && settings.locations.length > 0 ? (
                    <select
                      value={stdDeliveryLocation}
                      onChange={(e) => setStdDeliveryLocation(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-2.5 py-2 text-xs font-bold outline-none focus:ring-1 focus:ring-primary h-[38px] bg-white cursor-pointer"
                    >
                      {settings.locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={stdDeliveryLocation}
                      onChange={(e) => setStdDeliveryLocation(e.target.value)}
                      placeholder={lang === 'en' ? 'Location' : lang === 'ar' ? 'الموقع' : 'شار / شوێن'}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-1 focus:ring-primary h-[38px]"
                    />
                  )}
                </div>

                {/* Notes (1 col) */}
                <div className="xl:col-span-1">
                  <label className="block text-[11px] font-bold text-gray-500 mb-1">{lang === 'en' ? 'Notes' : lang === 'ar' ? 'ملاحظات' : 'تێبینی'}</label>
                  <input
                    type="text"
                    value={stdNotes}
                    onChange={(e) => setStdNotes(e.target.value)}
                    placeholder={lang === 'en' ? 'Notes' : lang === 'ar' ? 'ملاحظات' : 'تێبینی / وردەکاری'}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-1 focus:ring-primary h-[38px]"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 flex justify-end">
                <button
                  type="submit"
                  disabled={!stdBuyCustId || !stdSellCustId || !stdAmount}
                  className="w-full sm:w-auto min-w-[200px] bg-primary hover:bg-primary-dark disabled:bg-gray-200 text-white font-bold py-2.5 px-6 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs h-[40px]"
                >
                  <Send className="w-4 h-4" />
                  <span>{lang === 'en' ? 'Save Standard Hawala' : lang === 'ar' ? 'حفظ الحوالة القياسية' : 'تۆمارکردنی حەواڵەی ستاندارد'}</span>
                </button>
              </div>
            </div>
          )}

          {/* 6. Internal Transfer */}
          {entryMode === 'internal_transfer' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 items-end">
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 mb-1">{lang === 'en' ? 'From Account' : lang === 'ar' ? 'من حساب' : 'لە هەژماری (نێرەر)'}</label>
                  <SearchableCustomerSelect
                    value={intSenderId}
                    onChange={setIntSenderId}
                    customers={customers}
                    placeholder={lang === 'en' ? 'From...' : lang === 'ar' ? 'من العميل...' : 'نێرەر هەڵبژێرە...'}
                    lang={lang}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-500 mb-1">{lang === 'en' ? 'To Account' : lang === 'ar' ? 'إلى حساب' : 'بۆ هەژماری (وەرگر)'}</label>
                  <SearchableCustomerSelect
                    value={intRecId}
                    onChange={setIntRecId}
                    customers={customers}
                    disabledId={intSenderId}
                    placeholder={lang === 'en' ? 'To...' : lang === 'ar' ? 'إلى العميل...' : 'وەرگر هەڵبژێرە...'}
                    lang={lang}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-500 mb-1">{lang === 'en' ? 'Currency' : lang === 'ar' ? 'العملة' : 'دراو'}</label>
                  <select
                    value={intCurrency}
                    onChange={(e) => setIntCurrency(e.target.value as Currency)}
                    className="w-full border border-gray-200 rounded-xl px-2.5 py-2 text-xs font-bold outline-none focus:ring-1 focus:ring-primary h-[38px] bg-white cursor-pointer"
                  >
                    {currencies.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-500 mb-1">{lang === 'en' ? 'Amount' : lang === 'ar' ? 'المبلغ' : 'بڕی گواستنەوە'}</label>
                  <input
                    type="text"
                    required
                    value={intAmount}
                    onChange={(e) => setIntAmount(formatInputValue(e.target.value))}
                    placeholder="0"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono font-bold outline-none focus:ring-1 focus:ring-primary h-[38px]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-500 mb-1">{lang === 'en' ? 'Notes' : lang === 'ar' ? 'ملاحظات' : 'تێبینی'}</label>
                  <input
                    type="text"
                    value={intNotes}
                    onChange={(e) => setIntNotes(e.target.value)}
                    placeholder={lang === 'en' ? 'Reason / details' : lang === 'ar' ? 'التفاصيل' : 'هۆکار / وردەکاری'}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-1 focus:ring-primary h-[38px]"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 flex justify-end">
                <button
                  type="submit"
                  disabled={!intSenderId || !intRecId || !intAmount}
                  className="w-full sm:w-auto min-w-[200px] bg-primary hover:bg-primary-dark disabled:bg-gray-200 text-white font-bold py-2.5 px-6 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs h-[40px]"
                >
                  <Send className="w-4 h-4" />
                  <span>{lang === 'en' ? 'Save Internal Transfer' : lang === 'ar' ? 'تأكيد التحويل الداخلي' : 'تۆمارکردنی گواستنەوەی ناوخۆیی'}</span>
                </button>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Today's Transactions Journal Section (بینینی هەموو مامەڵەکانی ئەمڕۆ - ٢٠ مامەڵە بۆ هەر لاپەڕەیەک) */}
      <div data-animate="card" className="glass-card transform-gpu bg-slate-950/35 backdrop-blur-2xl backdrop-saturate-150 border border-white/[0.12] rounded-2xl shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.22),inset_0_0_24px_rgba(255,255,255,0.03),0_20px_50px_rgba(0,0,0,0.45)] overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.08] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1D7AFC]/20 text-[#60A5FA] flex items-center justify-center font-bold shrink-0 border border-[#1D7AFC]/30">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">
                  {lang === 'en' ? "Today's Transactions Journal" : lang === 'ar' ? 'دفتر معاملات اليوم' : 'دەفتەری سەرجەم مامەڵەکانی ئەمڕۆ'}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#1D7AFC]/20 text-[#60A5FA] border border-[#1D7AFC]/30 font-mono">
                  {todayTransactions.length}
                </span>
              </div>
            </div>
          </div>

          <div className="text-xs text-slate-300 font-medium flex items-center gap-2 bg-white/[0.05] px-3 py-1.5 rounded-xl border border-white/[0.1] backdrop-blur-md">
            <Calendar className="w-3.5 h-3.5 text-[#1D7AFC]" />
            <span className="text-[11px] font-bold text-slate-400">{lang === 'en' ? 'Date:' : lang === 'ar' ? 'التاريخ:' : 'بەروار:'}</span>
            <span className="font-mono font-bold text-white">{todayStr}</span>
          </div>
        </div>

        {/* Mobile-Friendly Transaction Cards */}
        <div className="md:hidden divide-y divide-white/[0.06] p-1 bg-transparent">
          {todayTransactions.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              {lang === 'en' ? 'No transactions recorded today yet' : lang === 'ar' ? 'لا توجد معاملات مسجلة اليوم حتى الآن' : 'هیچ مامەڵەیەک تا ئێستا بۆ ئەمڕۆ تۆمار نەکراوە'}
            </div>
          ) : (
            paginatedTransactions.map((tx) => {
              const isNegative = tx.amount < 0;
              let transType: string = tx.type;
              if (tx.type === 'Deposit') transType = t.type_deposit;
              if (tx.type === 'Withdrawal') transType = t.type_withdrawal;
              if (tx.type === 'Exchange') transType = t.type_exchange;
              if (tx.type === 'FastTransfer') transType = t.type_fast_transfer;
              if (tx.type === 'StandardTransfer') transType = t.type_standard_transfer;
              if (tx.type === 'InternalTransfer') transType = t.type_internal_transfer;
              if (tx.type === 'SafeAdjustment') transType = t.type_safe_adjustment;

              return (
                <div key={tx.id} data-animate="row" className="list-item-row p-4 space-y-3 hover:bg-gray-50/40 transition-colors">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-mono text-[10px] text-gray-400 font-medium">{tx.id}</span>
                    <span className="text-gray-400 font-mono text-[10px]">{formatKurdishDateTime(tx.timestamp)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold ${
                        tx.type === 'Deposit' 
                          ? 'bg-green-50 text-green-700 border border-green-100' 
                          : tx.type === 'Withdrawal' 
                            ? 'bg-red-50 text-red-700 border border-red-100'
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                      }`}>
                        {transType}
                      </span>
                      <h4 className="font-bold text-xs text-gray-800">
                        {tx.customerId === 'system-expenses' || (tx.customerName && tx.customerName.toLowerCase() === 'unknown')
                          ? (lang === 'en' ? 'Expenses' : lang === 'ar' ? 'المصاريف' : 'خەرجی')
                          : tx.customerName === 'خانەی گەنجینە' 
                            ? (lang === 'en' ? 'Main Vault' : lang === 'ar' ? 'الخزينة الرئيسية' : 'خانەی گەنجینە') 
                            : (tx.customerName || '-')}
                      </h4>
                    </div>
                    <div className="text-right">
                      <p className={`font-mono text-xs font-bold ${isNegative ? 'text-red-600' : 'text-emerald-700'}`}>
                        {formatMoney(tx.amount, tx.currency)}
                      </p>
                      {tx.targetAmount && (
                        <p className="text-[9px] text-gray-400 font-mono mt-0.5">
                          {tx.targetAmount > 0 ? '+' : ''}{formatMoney(tx.targetAmount, tx.targetCurrency || 'IQD')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-gray-100/50">
                    <span className="text-[10px] text-gray-400 font-medium">{t.operator_label}: <span className="text-gray-600 font-semibold">{tx.performedBy}</span></span>
                    {onPrintReceipt && (
                      <button
                        onClick={() => onPrintReceipt('Transaction', tx)}
                        className="px-3 py-1.5 text-primary-dark bg-primary-light hover:bg-primary hover:text-white rounded-lg transition-all text-[10px] font-bold cursor-pointer"
                      >
                        {lang === 'en' ? 'Print' : lang === 'ar' ? 'طباعة' : 'بچاپێنە'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop / Tablet Grid View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 text-gray-500 font-bold">
              <tr className={lang === 'en' ? 'text-left' : 'text-right'}>
                <th className="px-6 py-3 border-b border-gray-100">ID</th>
                <th className="px-6 py-3 border-b border-gray-100">{t.action_label}</th>
                <th className="px-6 py-3 border-b border-gray-100">{lang === 'en' ? 'Client / Counterparty' : lang === 'ar' ? 'العميل / الطرف المقابل' : 'کڕیار / سەرچاوە'}</th>
                <th className={`px-6 py-3 border-b border-gray-100 font-mono ${lang === 'en' ? 'text-left' : 'text-right'}`}>{t.amount_label}</th>
                <th className="px-6 py-3 border-b border-gray-100">{t.operator_label}</th>
                <th className="px-6 py-3 border-b border-gray-100">{t.date_label}</th>
                {onPrintReceipt && (
                  <th className={`px-6 py-3 border-b border-gray-100 no-print ${lang === 'en' ? 'text-right' : 'text-left'}`}>{lang === 'en' ? 'Actions' : lang === 'ar' ? 'إجراءات' : 'کردارەکان'}</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {paginatedTransactions.map((tx) => {
                const isNegative = tx.amount < 0;
                let transType: string = tx.type;
                if (tx.type === 'Deposit') transType = t.type_deposit;
                if (tx.type === 'Withdrawal') transType = t.type_withdrawal;
                if (tx.type === 'Exchange') transType = t.type_exchange;
                if (tx.type === 'FastTransfer') transType = t.type_fast_transfer;
                if (tx.type === 'StandardTransfer') transType = t.type_standard_transfer;
                if (tx.type === 'InternalTransfer') transType = t.type_internal_transfer;
                if (tx.type === 'SafeAdjustment') transType = t.type_safe_adjustment;

                return (
                  <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-mono font-medium text-gray-400">{tx.id}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold border ${
                        tx.type === 'Deposit' 
                          ? 'bg-emerald-100 text-emerald-950 border-emerald-300' 
                          : tx.type === 'Withdrawal' 
                            ? 'bg-rose-100 text-rose-950 border-rose-300'
                            : 'bg-indigo-100 text-indigo-950 border-indigo-300'
                      }`}>
                        {transType}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-800">
                      {tx.customerId === 'system-expenses' || (tx.customerName && tx.customerName.toLowerCase() === 'unknown')
                        ? (lang === 'en' ? 'Expenses' : lang === 'ar' ? 'المصاريف' : 'خەرجی')
                        : tx.customerName === 'خانەی گەنجینە' 
                          ? (lang === 'en' ? 'Main Vault' : lang === 'ar' ? 'الخزينة الرئيسية' : 'خانەی گەنجینە') 
                          : (tx.customerName || '-')}
                    </td>
                    <td className={`px-6 py-4 font-mono font-bold ${lang === 'en' ? 'text-left' : 'text-right'} ${isNegative ? 'text-red-600' : 'text-green-600'}`}>
                      {formatMoney(tx.amount, tx.currency)}
                      {tx.targetAmount && (
                        <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                          {tx.targetAmount > 0 ? '+' : ''}{formatMoney(tx.targetAmount, tx.targetCurrency || 'IQD')}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-500 font-medium">{tx.performedBy}</td>
                    <td className="px-6 py-4 font-mono text-gray-400">{formatKurdishDateTime(tx.timestamp)}</td>
                    {onPrintReceipt && (
                      <td className={`px-6 py-4 no-print ${lang === 'en' ? 'text-right' : 'text-left'}`}>
                        <button
                          onClick={() => onPrintReceipt('Transaction', tx)}
                          className="px-2.5 py-1 text-primary-dark bg-primary-light hover:bg-primary hover:text-white rounded-lg transition-all text-xs font-semibold cursor-pointer"
                        >
                          {lang === 'en' ? 'Print (PDF)' : lang === 'ar' ? 'طباعة (PDF)' : 'بچاپێنە (PDF)'}
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
              {todayTransactions.length === 0 && (
                <tr>
                  <td colSpan={onPrintReceipt ? 7 : 6} className="text-center py-8 text-gray-400 text-xs">
                    {lang === 'en' ? 'No transactions recorded today yet' : lang === 'ar' ? 'لا توجد معاملات مسجلة اليوم حتى الآن' : 'هیچ مامەڵەیەک تا ئێستا بۆ ئەمڕۆ تۆمار نەکراوە'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls (20 transactions per page) */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-white/[0.08] flex items-center justify-between bg-white/[0.02] flex-wrap gap-3">
            <button
              disabled={activePage === 1}
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              className="px-4 py-2 bg-white/[0.07] border border-white/[0.12] text-slate-200 rounded-xl text-xs font-bold hover:bg-white/[0.12] disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-xs min-h-[40px] min-w-[80px]"
            >
              {lang === 'en' ? 'Previous' : lang === 'ar' ? 'السابق' : 'پێشوو'}
            </button>
            
            <div className="flex items-center gap-1.5 flex-wrap">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => {
                const isActive = pageNumber === activePage;
                return (
                  <button
                    key={pageNumber}
                    onClick={() => setCurrentPage(pageNumber)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer min-h-[36px] min-w-[36px] ${
                      isActive 
                        ? 'bg-primary text-white border border-primary shadow-sm shadow-primary/20 scale-105' 
                        : 'bg-white/[0.06] border border-white/[0.1] text-slate-300 hover:bg-white/[0.12] hover:text-white'
                    }`}
                  >
                    {pageNumber}
                  </button>
                );
              })}
            </div>

            <button
              disabled={activePage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              className="px-4 py-2 bg-white/[0.07] border border-white/[0.12] text-slate-200 rounded-xl text-xs font-bold hover:bg-white/[0.12] disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-xs min-h-[40px] min-w-[80px]"
            >
              {lang === 'en' ? 'Next' : lang === 'ar' ? 'التالي' : 'دواتر'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
