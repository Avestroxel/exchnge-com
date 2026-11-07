import React, { useState, useMemo } from 'react';
import { 
  ArrowDownRight, ArrowUpRight, 
  PieChart as PieIcon, TrendingUp
} from 'lucide-react';
import { Transaction } from '../types';
import { formatMoney } from '../utils';

interface DollarExchangePieChartProps {
  transactions: Transaction[];
  lang: 'ku' | 'ar' | 'en';
}

export default function DollarExchangePieChart({
  transactions,
  lang
}: DollarExchangePieChartProps) {
  const [timeframe, setTimeframe] = useState<'this_month' | 'last_7_days' | 'today'>('this_month');

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const todayStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // Filter and aggregate USD exchange transactions
  const { 
    usdBought, 
    usdSold, 
    usdBoughtCount, 
    usdSoldCount, 
    counterSpentOnBuy, 
    counterReceivedOnSell, 
    totalVolume,
    buyPercentage,
    sellPercentage,
    netPosition,
    counterCurrency
  } = useMemo(() => {
    let bought = 0;
    let sold = 0;
    let bCount = 0;
    let sCount = 0;
    let spentOnBuy = 0;
    let receivedOnSell = 0;
    let detectedCounterCurrency = 'IQD';

    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    transactions.forEach(tx => {
      if (tx.type !== 'Exchange') return;
      if (!tx.timestamp) return;

      const txDate = new Date(tx.timestamp);
      if (isNaN(txDate.getTime())) return;

      // Timeframe filter
      if (timeframe === 'today') {
        const txDateStr = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}-${String(txDate.getDate()).padStart(2, '0')}`;
        if (txDateStr !== todayStr) return;
      } else if (timeframe === 'last_7_days') {
        if (txDate.getTime() < sevenDaysAgo.getTime()) return;
      } else if (timeframe === 'this_month') {
        if (txDate.getFullYear() !== currentYear || txDate.getMonth() !== currentMonth) return;
      }

      if (tx.targetCurrency) {
        detectedCounterCurrency = tx.targetCurrency;
      }

      // Check buy vs sell
      const isBuy = tx.notes?.includes('کڕینی دۆلار') || 
                    tx.notes?.toLowerCase().includes('buy') || 
                    (tx.amount > 0 && !tx.notes?.includes('فرۆشتنی'));
      const isSell = tx.notes?.includes('فرۆشتنی دۆلار') || 
                     tx.notes?.toLowerCase().includes('sell') || 
                     (tx.amount < 0 && !tx.notes?.includes('کڕینی'));

      const isClassifiedBuy = isBuy || (!isSell && tx.amount > 0);

      const usdVal = Math.abs(tx.currency === 'USD' ? tx.amount : (tx.targetCurrency === 'USD' ? (tx.targetAmount || 0) : 0));
      const counterVal = Math.abs(tx.currency === 'USD' ? (tx.targetAmount || 0) : tx.amount);

      if (isClassifiedBuy) {
        bought += usdVal;
        bCount++;
        spentOnBuy += counterVal;
      } else {
        sold += usdVal;
        sCount++;
        receivedOnSell += counterVal;
      }
    });

    const tot = bought + sold;
    const buyPct = tot > 0 ? (bought / tot) * 100 : 50;
    const sellPct = tot > 0 ? (sold / tot) * 100 : 50;

    return {
      usdBought: bought,
      usdSold: sold,
      usdBoughtCount: bCount,
      usdSoldCount: sCount,
      counterSpentOnBuy: spentOnBuy,
      counterReceivedOnSell: receivedOnSell,
      totalVolume: tot,
      buyPercentage: buyPct,
      sellPercentage: sellPct,
      netPosition: bought - sold,
      counterCurrency: detectedCounterCurrency
    };
  }, [transactions, timeframe, todayStr, currentYear, currentMonth]);

  // Radial gauge constants
  const cx = 60;
  const cy = 60;
  const radius = 46;
  const strokeWidth = 6;
  const circumference = 2 * Math.PI * radius; // ~289
  const progressRatio = totalVolume > 0 ? buyPercentage / 100 : 0;
  const progressLength = progressRatio * circumference;

  // Dot position at the tip of the arc
  const angleInRad = (progressRatio * 360 - 90) * (Math.PI / 180);
  const dotX = cx + radius * Math.cos(angleInRad);
  const dotY = cy + radius * Math.sin(angleInRad);

  return (
    <div className="p-5 flex flex-col justify-between h-full space-y-4 text-slate-100">
      {/* Header & Timeframe Switcher */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5 border-b border-white/[0.08] pb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-[#1D7AFC]/15 text-[#1D7AFC] border border-[#1D7AFC]/25 flex items-center justify-center font-bold shrink-0">
            <PieIcon className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-bold text-white leading-tight truncate">
                {lang === 'en' 
                  ? 'USD Exchange' 
                  : lang === 'ar' 
                    ? 'صرافة الدولار' 
                    : 'فرۆشتن و کڕینی دۆلار'}
              </h3>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-white/[0.06] text-[#60A5FA] border border-white/[0.1]">
                USD
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate">
              {lang === 'en'
                ? 'Buy vs Sell distribution'
                : lang === 'ar'
                  ? 'مقارنة بيع وشراء الدولار'
                  : 'ڕێژەی ئاڵوگۆڕی دۆلار'}
            </p>
          </div>
        </div>

        {/* Clean Filter Toggle */}
        <div className="flex items-center bg-white/[0.05] p-0.5 rounded-xl border border-white/[0.1] shrink-0">
          <button
            onClick={() => setTimeframe('this_month')}
            className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
              timeframe === 'this_month'
                ? 'bg-[#1D7AFC] text-white shadow-[0_2px_10px_rgba(29,122,252,0.4)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {lang === 'en' ? 'Month' : lang === 'ar' ? 'الشهر' : 'مانگ'}
          </button>
          <button
            onClick={() => setTimeframe('last_7_days')}
            className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
              timeframe === 'last_7_days'
                ? 'bg-[#1D7AFC] text-white shadow-[0_2px_10px_rgba(29,122,252,0.4)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {lang === 'en' ? '7D' : lang === 'ar' ? '٧أيام' : '٧ ڕۆژ'}
          </button>
          <button
            onClick={() => setTimeframe('today')}
            className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
              timeframe === 'today'
                ? 'bg-[#1D7AFC] text-white shadow-[0_2px_10px_rgba(29,122,252,0.4)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {lang === 'en' ? 'Today' : lang === 'ar' ? 'اليوم' : 'ئەمڕۆ'}
          </button>
        </div>
      </div>

      {/* Cirrel Style Horizontal Layout: Thin Radial Gauge + Side-by-Side Statistics */}
      <div className="flex items-center gap-5 my-auto">
        {/* Radial Gauge Container */}
        <div className="relative w-[120px] h-[120px] shrink-0 select-none">
          <svg viewBox="0 0 120 120" className="w-full h-full transform -rotate-90 origin-center">
            <defs>
              <linearGradient id="cirrelRadialGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#1D7AFC" />
                <stop offset="100%" stopColor="#38BDF8" />
              </linearGradient>
              <filter id="glowIndicator" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Background Track */}
            <circle
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke="rgba(255, 255, 255, 0.08)"
              strokeWidth={strokeWidth}
            />

            {/* Active Progress Arc */}
            {totalVolume > 0 && (
              <circle
                cx={cx}
                cy={cy}
                r={radius}
                fill="none"
                stroke="url(#cirrelRadialGrad)"
                strokeWidth={strokeWidth}
                strokeDasharray={`${progressLength} ${circumference}`}
                strokeLinecap="round"
                className="transition-all duration-500 ease-out"
              />
            )}

            {/* Glowing Tip Indicator Dot */}
            {totalVolume > 0 && (
              <circle
                cx={dotX}
                cy={dotY}
                r="3.5"
                fill="#38BDF8"
                filter="url(#glowIndicator)"
                className="transition-all duration-500 ease-out"
              />
            )}
          </svg>

          {/* Centered Total Volume Display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-1">
            <span className="text-[10px] text-slate-400 font-medium leading-none">
              {lang === 'en' ? 'Volume' : lang === 'ar' ? 'الحجم' : 'قەبارە'}
            </span>
            <span className="text-xs sm:text-sm font-bold font-mono text-white mt-1 tracking-tight tabular-nums" dir="ltr">
              ${formatMoney(totalVolume, 'USD')}
            </span>
            <span className="text-[9px] text-slate-400 font-mono mt-0.5">
              {usdBoughtCount + usdSoldCount} deals
            </span>
          </div>
        </div>

        {/* Side-by-side statistics */}
        <div className="flex-1 flex flex-col justify-center space-y-2.5 min-w-0">
          {/* USD Bought */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399] shrink-0" />
              <span className="text-slate-300 font-medium text-xs truncate">
                {lang === 'en' ? 'Bought' : lang === 'ar' ? 'شراء' : 'کڕین'}
              </span>
            </div>
            <div className="text-right font-mono shrink-0">
              <span className="text-emerald-400 font-bold tabular-nums" dir="ltr">
                +${formatMoney(usdBought, 'USD')}
              </span>
              <span className="text-[10px] text-slate-400 block font-sans">
                {usdBoughtCount} deals ({buyPercentage.toFixed(0)}%)
              </span>
            </div>
          </div>

          {/* USD Sold */}
          <div className="flex items-center justify-between text-xs pt-1.5 border-t border-white/[0.06]">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-2 h-2 rounded-full bg-rose-400 shadow-[0_0_6px_#fb7185] shrink-0" />
              <span className="text-slate-300 font-medium text-xs truncate">
                {lang === 'en' ? 'Sold' : lang === 'ar' ? 'بيع' : 'فرۆشتن'}
              </span>
            </div>
            <div className="text-right font-mono shrink-0">
              <span className="text-rose-400 font-bold tabular-nums" dir="ltr">
                -${formatMoney(usdSold, 'USD')}
              </span>
              <span className="text-[10px] text-slate-400 block font-sans">
                {usdSoldCount} deals ({sellPercentage.toFixed(0)}%)
              </span>
            </div>
          </div>

          {/* Net Position */}
          <div className="flex items-center justify-between text-xs pt-1.5 border-t border-white/[0.06]">
            <span className="text-slate-400 text-[11px]">
              {lang === 'en' ? 'Net Position' : lang === 'ar' ? 'الصافي' : 'هاوسەنگی'}
            </span>
            <span className={`font-mono text-xs font-bold tabular-nums ${netPosition >= 0 ? 'text-[#60A5FA]' : 'text-rose-400'}`} dir="ltr">
              {netPosition >= 0 ? '+' : ''}${formatMoney(netPosition, 'USD')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
