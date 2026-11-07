import React, { useState, useMemo } from 'react';
import { 
  Clock, Calendar, Filter, RotateCcw, 
  ArrowDownRight, ArrowUpRight, ArrowLeftRight, Send, Vault, PlusCircle,
  Printer, Activity, ShieldCheck
} from 'lucide-react';
import { Currency } from '../types';
import { AppState } from '../data/stateManager';
import { formatMoney, formatKurdishDateTime, deduplicateTransactions } from '../utils';
import { translations } from '../data/translations';
import GlassCard from './GlassCard';
import MonthlyCashFlowChart from './MonthlyCashFlowChart';
import DollarExchangePieChart from './DollarExchangePieChart';

interface DashboardViewProps {
  appState: AppState;
  onQuickAction: (action: 'deposit' | 'withdrawal' | 'exchange' | 'transfer') => void;
  onPrintReceipt: (type: 'Transaction', data: any) => void;
  onLocalLangChange?: (newLang: 'ku' | 'en' | 'ar') => void;
  onCreateFastTransfer?: (
    senderId: string, 
    receiverName: string, 
    receiverPhone: string, 
    amount: number, 
    currency: Currency, 
    fee: number, 
    notes: string
  ) => void;
  onCreateStandardTransfer?: (
    senderId: string, 
    receiverId: string, 
    amountUSD: number, 
    buyRate: number, 
    sellRate: number, 
    beneficiaryName: string, 
    deliveryLocation: string, 
    notes: string,
    currency?: Currency
  ) => void;
  onCreateInternalTransfer?: (
    senderId: string, 
    receiverId: string, 
    currency: Currency, 
    amount: number, 
    notes: string
  ) => void;
  onModifyCustomerBalance?: (
    customerId: string, 
    type: 'Deposit' | 'Withdrawal', 
    currency: Currency, 
    amount: number, 
    notes: string
  ) => void;
  onExecuteExchange?: (
    sourceType: 'Safe' | string, 
    action: 'BuyUSD' | 'SellUSD', 
    otherCurrency: string, 
    usdAmount: number, 
    exchangeRate: number, 
    notes: string
  ) => void;
}

export default function DashboardView({ 
  appState, 
  onQuickAction, 
  onPrintReceipt, 
}: DashboardViewProps) {
  const { safeBalances, customers, transactions, settings, currentUser, currentSessionRole, currencies } = appState;
  const lang = settings.language || 'ku';
  const t = translations[lang];

  // Calculate sum of customer liabilities (deposits) per currency
  const totalCustomerDeposits = useMemo(() => {
    return customers.reduce(
      (acc: Record<string, number>, cust) => {
        currencies.forEach(cur => {
          if (!acc[cur]) acc[cur] = 0;
          acc[cur] += (cust.balances[cur] || 0);
        });
        return acc;
      },
      {}
    );
  }, [customers, currencies]);

  // Calculate active currencies
  const activeCurrencies = useMemo(() => {
    const list = currencies.filter(cur => {
      const safeBal = safeBalances[cur] || 0;
      const liabilities = totalCustomerDeposits[cur] || 0;
      const hasTx = transactions.some(t => t.currency === cur || t.targetCurrency === cur);
      const hasCustBal = customers.some(c => (c.balances[cur] || 0) !== 0);
      return safeBal !== 0 || liabilities !== 0 || hasTx || hasCustBal;
    });
    return list.length > 0 ? list : currencies.filter(c => c === 'USD' || c === 'IQD');
  }, [currencies, safeBalances, totalCustomerDeposits, transactions, customers]);

  const isCustomer = currentSessionRole === 'Customer';

  const getTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [dateFilterType, setDateFilterType] = useState<'today' | 'custom'>('today');
  const [startDate, setStartDate] = useState(getTodayString());
  const [endDate, setEndDate] = useState(getTodayString());
  const [currentPage, setCurrentPage] = useState(1);

  const handleSetToday = () => {
    setDateFilterType('today');
    const today = getTodayString();
    setStartDate(today);
    setEndDate(today);
    setCurrentPage(1);
  };

  const handleToggleCustomDate = () => {
    if (dateFilterType === 'custom') {
      setDateFilterType('today');
      const today = getTodayString();
      setStartDate(today);
      setEndDate(today);
      setCurrentPage(1);
    } else {
      setDateFilterType('custom');
      setCurrentPage(1);
    }
  };

  const uniqueAllTransactions = useMemo(() => {
    return deduplicateTransactions(transactions);
  }, [transactions]);

  const customerFilteredTransactions = useMemo(() => {
    return isCustomer
      ? uniqueAllTransactions.filter(tx => tx.customerId === currentUser?.id)
      : uniqueAllTransactions;
  }, [isCustomer, uniqueAllTransactions, currentUser?.id]);

  const filteredUserTransactions = useMemo(() => {
    return customerFilteredTransactions.filter(tx => {
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
      if (startDate && txDateStr < startDate) return false;
      if (endDate && txDateStr > endDate) return false;
      return true;
    });
  }, [customerFilteredTransactions, startDate, endDate]);

  const itemsPerPage = 10;
  const totalPages = useMemo(() => {
    return Math.ceil(filteredUserTransactions.length / itemsPerPage) || 1;
  }, [filteredUserTransactions.length, itemsPerPage]);

  const activePage = Math.min(currentPage, totalPages);

  const paginatedTransactions = useMemo(() => {
    const startIndex = (activePage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredUserTransactions.slice(startIndex, endIndex);
  }, [filteredUserTransactions, activePage, itemsPerPage]);

  const usdSafeBal = safeBalances['USD'] || 0;
  const usdLiabilities = totalCustomerDeposits['USD'] || 0;
  const usdEquity = usdSafeBal - usdLiabilities;

  const iqdSafeBal = safeBalances['IQD'] || 0;
  const iqdLiabilities = totalCustomerDeposits['IQD'] || 0;
  const iqdEquity = iqdSafeBal - iqdLiabilities;

  const otherActiveCurrencies = useMemo(() => {
    return activeCurrencies.filter(cur => cur !== 'USD' && cur !== 'IQD');
  }, [activeCurrencies]);

  return (
    <div className={`space-y-6 ${lang === 'en' ? 'text-left' : 'text-right'}`}>
      {/* 1. Bento Header: Clean Open Flex Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 view-header" data-animate="header">
        <div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_8px_#34d399]"></span>
            </span>
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
              {currentSessionRole} · {startDate} · {lang === 'en' ? 'Real-time financial control hub' : lang === 'ar' ? 'مركز العمليات المالي المباشر' : 'ناوەندی کۆنتڕۆڵی دارایی ڕاستەوخۆ'}
            </span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight mt-1">
            {lang === 'en' 
              ? `Welcome back, ${currentUser?.name || 'Guest'}` 
              : lang === 'ar' 
                ? `مرحباً بك، ${currentUser?.name || 'ضيف'}` 
                : `سڵاو لە بەڕێزتان، ${currentUser?.name || 'میوان'}`}
          </h2>
        </div>

        {/* Quick Action Buttons Pill Bar */}
        {!isCustomer && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => onQuickAction('deposit')}
              className="flex items-center gap-2 bg-[#1D7AFC] hover:bg-blue-500 text-white font-medium shadow-[0_4px_20px_rgba(29,122,252,0.4),inset_0_1px_0_rgba(255,255,255,0.3)] rounded-full px-4 py-2 text-xs transition-all cursor-pointer active:scale-95"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>{lang === 'en' ? '+ Deposit' : lang === 'ar' ? '+ إيداع' : '+ پارە دانان'}</span>
            </button>

            <button
              type="button"
              onClick={() => onQuickAction('withdrawal')}
              className="flex items-center gap-2 bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.12] text-slate-200 hover:text-white rounded-full px-4 py-2 text-xs backdrop-blur-md transition-all cursor-pointer active:scale-95"
            >
              <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />
              <span>{lang === 'en' ? 'Withdrawal' : lang === 'ar' ? 'سحب' : 'ڕاکێشان'}</span>
            </button>

            <button
              type="button"
              onClick={() => onQuickAction('exchange')}
              className="flex items-center gap-2 bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.12] text-slate-200 hover:text-white rounded-full px-4 py-2 text-xs backdrop-blur-md transition-all cursor-pointer active:scale-95"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-cyan-400" />
              <span>{lang === 'en' ? 'Exchange' : lang === 'ar' ? 'صرافة' : 'ئاڵوگۆڕ'}</span>
            </button>

            <button
              type="button"
              onClick={() => onQuickAction('transfer')}
              className="flex items-center gap-2 bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.12] text-slate-200 hover:text-white rounded-full px-4 py-2 text-xs backdrop-blur-md transition-all cursor-pointer active:scale-95"
            >
              <Send className="w-3.5 h-3.5 text-amber-400" />
              <span>{lang === 'en' ? 'Hawala' : lang === 'ar' ? 'حوالة' : 'حەواڵە'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Customer custom account summary */}
      {isCustomer && (
        <GlassCard 
          title={lang === 'en' ? 'Personal Account Summary' : lang === 'ar' ? 'ملخص الحساب الشخصي' : 'هەژماری تایبەت بە کڕیار'}
          subtitle={lang === 'en' ? 'Your active liquid balances' : lang === 'ar' ? 'أرصدتك الحالية' : 'باڵانسی ئێستای تۆ'}
          icon={<Vault className="w-4 h-4" />}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {currencies.map(cur => (
              <div 
                key={cur} 
                className="p-4 rounded-xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-md flex flex-col justify-between"
              >
                <span className="text-xs text-slate-400">
                  {lang === 'en' ? `${cur} Balance` : lang === 'ar' ? `رصيد ${cur}` : `باڵانسی ${cur}`}
                </span>
                <p className="text-2xl font-bold font-mono tabular-nums text-white mt-1" dir="ltr">
                  {formatMoney((currentUser as any).balances?.[cur] || 0, cur)}
                </p>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* 2. Unified 12-Column Bento Grid Architecture */}
      {!isCustomer && (
        <div className="grid grid-cols-12 gap-5" data-animate="bento">
          {/* Left 8 Cols: Unified Multi-Vault Hero Card & Monthly Cash Flow Studio */}
          <div className="col-span-12 xl:col-span-8 flex flex-col">
            <GlassCard className="p-0 h-full flex flex-col" contentClassName="p-5 sm:p-6 flex flex-col justify-between flex-1">
              {/* Top Multi-Vault KPI Strip */}
              <div className="pb-6 border-b border-white/[0.08]">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <Vault className="w-4 h-4 text-[#1D7AFC]" />
                    <h3 className="text-xs sm:text-sm font-semibold tracking-wide text-white uppercase">
                      {lang === 'en' ? 'Vault Reserves & Company Equity' : lang === 'ar' ? 'أرصدة الخزينة ورأس المال' : 'سەرمایەی گەنجینە و هاوسەنگی گشتی'}
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 px-2.5 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08]">
                    {activeCurrencies.length} {lang === 'en' ? 'Active Currencies' : lang === 'ar' ? 'عملات نشطة' : 'دراوی چالاک'}
                  </span>
                </div>

                {/* Side-by-side USD and IQD Strip */}
                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x rtl:md:divide-x-reverse divide-white/[0.08]">
                  {/* USD Safe Vault */}
                  <div className="pb-5 md:pb-0 md:pe-6 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-300">
                          {lang === 'en' ? 'USD Safe Vault' : lang === 'ar' ? 'خزينة الدولار USD' : 'گەنجینەی دۆلار USD'}
                        </span>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                          usdEquity >= 0 
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' 
                            : 'bg-rose-500/15 text-rose-400 border-rose-500/25'
                        }`}>
                          {usdEquity >= 0 
                            ? (lang === 'en' ? 'Surplus' : lang === 'ar' ? 'فائض' : 'زیادە')
                            : (lang === 'en' ? 'Deficit' : lang === 'ar' ? 'عجز' : 'کەمی')}
                        </span>
                      </div>
                      <p className={`text-3xl font-bold font-mono tabular-nums mt-1 tracking-tight ${usdEquity >= 0 ? 'text-white' : 'text-rose-400'}`} dir="ltr">
                        {formatMoney(usdEquity, 'USD')}
                      </p>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        {lang === 'en' ? 'Net Company Equity' : lang === 'ar' ? 'صافي رأس مال المكتب' : 'سەرمایەی پوختی نووسینگە'}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 mt-5 pt-3.5 border-t border-white/[0.06] text-xs">
                      <div className="flex-1">
                        <span className="text-[10px] text-slate-400 block mb-0.5">
                          {lang === 'en' ? 'Liquid Cash' : lang === 'ar' ? 'السيولة في الخزنة' : 'کاش لە گەنجینە'}
                        </span>
                        <span className="font-bold font-mono text-emerald-400 tabular-nums text-sm" dir="ltr">
                          {formatMoney(usdSafeBal, 'USD')}
                        </span>
                      </div>
                      <div className="w-[1px] h-7 bg-white/[0.08]" />
                      <div className="flex-1">
                        <span className="text-[10px] text-slate-400 block mb-0.5">
                          {lang === 'en' ? 'Client Liabilities' : lang === 'ar' ? 'أمانات العملاء' : 'ئەمانات و قەرز'}
                        </span>
                        <span className="font-bold font-mono text-rose-400 tabular-nums text-sm" dir="ltr">
                          {formatMoney(usdLiabilities, 'USD')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* IQD Safe Vault */}
                  <div className="pt-5 md:pt-0 md:ps-6 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-300">
                          {lang === 'en' ? 'IQD Safe Vault' : lang === 'ar' ? 'خزينة الدينار IQD' : 'گەنجینەی دینار IQD'}
                        </span>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                          iqdEquity >= 0 
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' 
                            : 'bg-rose-500/15 text-rose-400 border-rose-500/25'
                        }`}>
                          {iqdEquity >= 0 
                            ? (lang === 'en' ? 'Surplus' : lang === 'ar' ? 'فائض' : 'زیادە')
                            : (lang === 'en' ? 'Deficit' : lang === 'ar' ? 'عجز' : 'کەمی')}
                        </span>
                      </div>
                      <p className={`text-3xl font-bold font-mono tabular-nums mt-1 tracking-tight ${iqdEquity >= 0 ? 'text-white' : 'text-rose-400'}`} dir="ltr">
                        {formatMoney(iqdEquity, 'IQD')}
                      </p>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        {lang === 'en' ? 'Net Company Equity' : lang === 'ar' ? 'صافي رأس مال المكتب' : 'سەرمایەی پوختی نووسینگە'}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 mt-5 pt-3.5 border-t border-white/[0.06] text-xs">
                      <div className="flex-1">
                        <span className="text-[10px] text-slate-400 block mb-0.5">
                          {lang === 'en' ? 'Liquid Cash' : lang === 'ar' ? 'السيولة في الخزنة' : 'کاش لە گەنجینە'}
                        </span>
                        <span className="font-bold font-mono text-emerald-400 tabular-nums text-sm" dir="ltr">
                          {formatMoney(iqdSafeBal, 'IQD')}
                        </span>
                      </div>
                      <div className="w-[1px] h-7 bg-white/[0.08]" />
                      <div className="flex-1">
                        <span className="text-[10px] text-slate-400 block mb-0.5">
                          {lang === 'en' ? 'Client Liabilities' : lang === 'ar' ? 'أمانات العملاء' : 'ئەمانات و قەرز'}
                        </span>
                        <span className="font-bold font-mono text-rose-400 tabular-nums text-sm" dir="ltr">
                          {formatMoney(iqdLiabilities, 'IQD')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Other Active Currencies if present */}
                {otherActiveCurrencies.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-4 mt-4 border-t border-white/[0.08]">
                    {otherActiveCurrencies.map(cur => {
                      const safeBal = safeBalances[cur] || 0;
                      const liabilities = totalCustomerDeposits[cur] || 0;
                      const equity = safeBal - liabilities;
                      return (
                        <div key={cur} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-semibold text-slate-300">{cur} Vault</span>
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${equity >= 0 ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'}`}>
                              {equity >= 0 ? 'Surplus' : 'Deficit'}
                            </span>
                          </div>
                          <p className="text-lg font-bold font-mono text-white mt-1 tabular-nums" dir="ltr">
                            {formatMoney(equity, cur)}
                          </p>
                          <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                            <span>Cash: {formatMoney(safeBal, cur)}</span>
                            <span>Liabilities: {formatMoney(liabilities, cur)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Integrated Monthly Cash Flow Studio */}
              <div className="pt-4 flex-1">
                <MonthlyCashFlowChart 
                  transactions={uniqueAllTransactions}
                  currencies={currencies}
                  lang={lang}
                />
              </div>
            </GlassCard>
          </div>

          {/* Right 4 Cols: Stacked Side Bento Cards */}
          <div className="col-span-12 xl:col-span-4 flex flex-col gap-5">
            {/* Card 1: USD Exchange Radial Gauge */}
            <GlassCard className="p-0 flex-1" contentClassName="p-0">
              <DollarExchangePieChart 
                transactions={uniqueAllTransactions}
                lang={lang}
              />
            </GlassCard>

            {/* Card 2: Live System Overview (Cirrel Live Store Style) */}
            <GlassCard className="p-0 flex-1" contentClassName="p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-cyan-400" />
                    <h4 className="text-xs font-semibold tracking-wide text-white uppercase">
                      {lang === 'en' ? 'Live System Overview' : lang === 'ar' ? 'نظرة عامة حية على النظام' : 'کورتەی ڕاستەوخۆی سیستەم'}
                    </h4>
                  </div>
                  <span className="flex items-center gap-1.5 text-[10px] font-medium px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {lang === 'en' ? 'Vaults synced' : lang === 'ar' ? 'الخزائن متزامنة' : 'گەنجینە هاوکاتکراوە'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm">
                    <span className="text-[10px] uppercase text-slate-400 block font-medium">
                      {lang === 'en' ? "Today's Deals" : lang === 'ar' ? 'معاملات اليوم' : 'مامەڵەکانی ئەمڕۆ'}
                    </span>
                    <p className="text-2xl font-bold font-mono text-white mt-1 tabular-nums">
                      {filteredUserTransactions.length}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm">
                    <span className="text-[10px] uppercase text-slate-400 block font-medium">
                      {lang === 'en' ? 'Active Currencies' : lang === 'ar' ? 'العملات النشطة' : 'دراوە چالاکەکان'}
                    </span>
                    <p className="text-2xl font-bold font-mono text-cyan-400 mt-1 tabular-nums">
                      {activeCurrencies.length}
                    </p>
                  </div>
                </div>
              </div>

              {/* Mini Equalizer & Status Footer */}
              <div className="pt-4 mt-4 border-t border-white/[0.08] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex items-end gap-1 h-5">
                    <span className="w-1 h-3 rounded-full bg-blue-500 animate-[pulse_1.2s_ease-in-out_infinite]" />
                    <span className="w-1 h-5 rounded-full bg-cyan-400 animate-[pulse_1.5s_ease-in-out_infinite]" />
                    <span className="w-1 h-2 rounded-full bg-emerald-400 animate-[pulse_1s_ease-in-out_infinite]" />
                    <span className="w-1 h-4 rounded-full bg-blue-400 animate-[pulse_1.8s_ease-in-out_infinite]" />
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {lang === 'en' ? 'Real-time ledger online' : lang === 'ar' ? 'السجل المباشر متصل' : 'تۆماری دارایی ئۆنلاینە'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>100% OK</span>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      )}

      {/* 4. Transactions Journal Glass Table */}
      <GlassCard
        title={
          dateFilterType === 'today'
            ? (lang === 'en' ? "Today's Transactions Journal" : lang === 'ar' ? 'دفتر معاملات اليوم' : 'دەفتەری مامەڵەکانی ئەمڕۆ')
            : (lang === 'en' ? "Filtered Transactions Journal" : lang === 'ar' ? 'دفتر المعاملات المفلترة' : 'دەفتەری مامەڵە فلتەرکراوەکان')
        }
        subtitle={`${filteredUserTransactions.length} ${lang === 'en' ? 'recorded transactions' : lang === 'ar' ? 'معاملة مسجلة' : 'مامەڵە تۆمارکراوە'}`}
        icon={<Clock className="w-4 h-4 text-[#1D7AFC]" />}
        action={
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={handleSetToday}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                dateFilterType === 'today'
                  ? 'bg-[#1D7AFC] text-white shadow-[0_4px_16px_rgba(29,122,252,0.4)]'
                  : 'bg-white/[0.06] border border-white/[0.1] text-slate-300 hover:text-white hover:bg-white/[0.12]'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{lang === 'en' ? "Today" : lang === 'ar' ? "اليوم" : "ئەمڕۆ"}</span>
            </button>

            <button
              onClick={handleToggleCustomDate}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                dateFilterType === 'custom'
                  ? 'bg-[#1D7AFC] text-white shadow-[0_4px_16px_rgba(29,122,252,0.4)]'
                  : 'bg-white/[0.06] border border-white/[0.1] text-slate-300 hover:text-white hover:bg-white/[0.12]'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>{lang === 'en' ? "Filter Date" : lang === 'ar' ? "تاريخ محدد" : "دیاریکردنی بەروار"}</span>
            </button>
          </div>
        }
        className="p-0"
        contentClassName="p-0"
      >
        {/* Date Filter Range Bar if custom date active */}
        {dateFilterType === 'custom' && (
          <div className="bg-white/[0.04] p-3 border-b border-white/[0.08] flex flex-col sm:flex-row items-center gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-slate-400">{lang === 'en' ? 'From:' : lang === 'ar' ? 'من:' : 'لە:'}</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-white/[0.05] border border-white/[0.1] text-white rounded-lg px-2.5 py-1 text-xs font-mono outline-none h-8 focus:border-[#1D7AFC]"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-slate-400">{lang === 'en' ? 'To:' : lang === 'ar' ? 'إلى:' : 'بۆ:'}</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-white/[0.05] border border-white/[0.1] text-white rounded-lg px-2.5 py-1 text-xs font-mono outline-none h-8 focus:border-[#1D7AFC]"
              />
            </div>
            <button
              onClick={handleSetToday}
              className="px-3 py-1 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 rounded-lg text-xs font-medium flex items-center gap-1 transition-all h-8 cursor-pointer border border-rose-500/25"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{lang === 'en' ? 'Reset to Today' : lang === 'ar' ? 'إعادة لليوم' : 'گەڕانەوە بۆ ئەمڕۆ'}</span>
            </button>
          </div>
        )}

        {/* Mobile View */}
        <div className="md:hidden divide-y divide-white/[0.06] p-1">
          {filteredUserTransactions.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">{t.no_records}</div>
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
                <div key={tx.id} data-animate="row" className="list-item-row p-4 space-y-3 hover:bg-white/[0.04] transition-colors">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-mono text-[11px] text-slate-400">{tx.id}</span>
                    <span className="text-slate-400 font-mono text-[11px]">{formatKurdishDateTime(tx.timestamp)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-medium border ${
                        tx.type === 'Deposit' 
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' 
                          : tx.type === 'Withdrawal' 
                            ? 'bg-rose-500/15 text-rose-400 border-rose-500/25'
                            : 'bg-[#1D7AFC]/15 text-blue-400 border-[#1D7AFC]/25'
                      }`}>
                        {transType}
                      </span>
                      <h4 className="font-semibold text-sm text-white">
                        {tx.customerId === 'system-expenses' || (tx.customerName && tx.customerName.toLowerCase() === 'unknown')
                          ? (lang === 'en' ? 'Expenses' : lang === 'ar' ? 'المصاريف' : 'خەرجی')
                          : tx.customerName === 'خانەی گەنجینە' 
                            ? (lang === 'en' ? 'Main Vault' : lang === 'ar' ? 'الخزينة الرئيسية' : 'خانەی گەنجینە') 
                            : (tx.customerName || '-')}
                      </h4>
                    </div>
                    <div className="text-right">
                      <p className={`font-mono text-sm font-bold tabular-nums ${isNegative ? 'text-rose-400' : 'text-emerald-400'}`} dir="ltr">
                        {formatMoney(tx.amount, tx.currency)}
                      </p>
                      {tx.targetAmount && (
                        <p className="text-[10px] text-slate-400 font-mono tabular-nums mt-0.5" dir="ltr">
                          {tx.targetAmount > 0 ? '+' : ''}{formatMoney(tx.targetAmount, tx.targetCurrency || 'IQD')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-white/[0.06]">
                    <span className="text-[11px] text-slate-400">
                      {t.operator_label}: <span className="text-white font-medium">{tx.performedBy}</span>
                    </span>
                    <button
                      onClick={() => onPrintReceipt('Transaction', tx)}
                      className="px-3 py-1 bg-white/[0.06] hover:bg-[#1D7AFC] text-slate-300 hover:text-white rounded-lg transition-all text-xs font-medium cursor-pointer border border-white/[0.1] flex items-center gap-1.5"
                    >
                      <Printer className="w-3 h-3" />
                      <span>{lang === 'en' ? 'Print' : lang === 'ar' ? 'طباعة' : 'بچاپێنە'}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop Data Grid */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-white/[0.04] text-slate-400 uppercase tracking-wider font-semibold border-b border-white/[0.08]">
              <tr className={lang === 'en' ? 'text-left' : 'text-right'}>
                <th className="px-5 py-3.5 font-mono">ID</th>
                <th className="px-5 py-3.5">{t.action_label}</th>
                <th className="px-5 py-3.5">{lang === 'en' ? 'Client / Entity' : lang === 'ar' ? 'العميل / الحساب' : 'کڕیار / هەژمار'}</th>
                <th className={`px-5 py-3.5 font-mono ${lang === 'en' ? 'text-left' : 'text-right'}`}>{t.amount_label}</th>
                <th className="px-5 py-3.5">{t.operator_label}</th>
                <th className="px-5 py-3.5">{t.date_label}</th>
                <th className={`px-5 py-3.5 no-print ${lang === 'en' ? 'text-right' : 'text-left'}`}>{lang === 'en' ? 'Actions' : lang === 'ar' ? 'إجراءات' : 'کردارەکان'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06] text-slate-200">
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
                  <tr key={tx.id} className="hover:bg-white/[0.04] transition-colors">
                    <td className="px-5 py-3.5 font-mono text-slate-400">{tx.id}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                        tx.type === 'Deposit' 
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' 
                          : tx.type === 'Withdrawal' 
                            ? 'bg-rose-500/15 text-rose-400 border-rose-500/25'
                            : 'bg-[#1D7AFC]/15 text-blue-400 border-[#1D7AFC]/25'
                      }`}>
                        {transType}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-white">
                      {tx.customerId === 'system-expenses' || (tx.customerName && tx.customerName.toLowerCase() === 'unknown')
                        ? (lang === 'en' ? 'Expenses' : lang === 'ar' ? 'المصاريف' : 'خەرجی')
                        : tx.customerName === 'خانەی گەنجینە' 
                          ? (lang === 'en' ? 'Main Vault' : lang === 'ar' ? 'الخزينة الرئيسية' : 'خانەی گەنجینە') 
                          : (tx.customerName || '-')}
                    </td>
                    <td className={`px-5 py-3.5 font-mono font-bold tabular-nums ${lang === 'en' ? 'text-left' : 'text-right'} ${isNegative ? 'text-rose-400' : 'text-emerald-400'}`}>
                      <div dir="ltr" className={lang === 'en' ? 'text-left' : 'text-right'}>
                        {formatMoney(tx.amount, tx.currency)}
                        {tx.targetAmount && (
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                            {tx.targetAmount > 0 ? '+' : ''}{formatMoney(tx.targetAmount, tx.targetCurrency || 'IQD')}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-300 font-medium">{tx.performedBy}</td>
                    <td className="px-5 py-3.5 font-mono text-slate-400">{formatKurdishDateTime(tx.timestamp)}</td>
                    <td className={`px-5 py-3.5 no-print ${lang === 'en' ? 'text-right' : 'text-left'}`}>
                      <button
                        onClick={() => onPrintReceipt('Transaction', tx)}
                        className="px-2.5 py-1 text-slate-200 hover:text-white bg-white/[0.06] hover:bg-[#1D7AFC] border border-white/[0.1] rounded-lg transition-all text-xs font-medium cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <Printer className="w-3 h-3" />
                        <span>{lang === 'en' ? 'Print' : lang === 'ar' ? 'طباعة' : 'بچاپێنە'}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredUserTransactions.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400 text-sm">{t.no_records}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="px-5 py-3.5 border-t border-white/[0.08] flex items-center justify-between bg-white/[0.02] flex-wrap gap-3">
            <button
              disabled={activePage === 1}
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              className="px-3.5 py-1.5 bg-white/[0.06] border border-white/[0.1] text-slate-300 hover:text-white rounded-lg text-xs font-medium hover:bg-white/[0.1] disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
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
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer min-h-[30px] min-w-[30px] ${
                      isActive 
                        ? 'bg-[#1D7AFC] text-white shadow-[0_2px_12px_rgba(29,122,252,0.4)]' 
                        : 'bg-white/[0.04] border border-white/[0.08] text-slate-300 hover:text-white hover:bg-white/[0.08]'
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
              className="px-3.5 py-1.5 bg-white/[0.06] border border-white/[0.1] text-slate-300 hover:text-white rounded-lg text-xs font-medium hover:bg-white/[0.1] disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              {lang === 'en' ? 'Next' : lang === 'ar' ? 'التالي' : 'دواتر'}
            </button>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
