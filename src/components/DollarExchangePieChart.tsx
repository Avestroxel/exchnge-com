import React, { useState, useMemo } from 'react';
import { 
  ArrowDownRight, ArrowUpRight, 
  PieChart as PieIcon, ArrowRightLeft, CheckCircle2, TrendingUp
} from 'lucide-react';
import { Transaction } from '../types';
import { formatMoney } from '../utils';

interface DollarExchangePieChartProps {
  transactions: Transaction[];
  lang: 'ku' | 'ar' | 'en';
}

function polarToCartesian(cx: number, cy: number, r: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: cx + r * Math.cos(angleInRadians),
    y: cy + r * Math.sin(angleInRadians)
  };
}

function describeDonutSlice(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  startAngle: number,
  endAngle: number
): string {
  const diff = Math.max(0.1, endAngle - startAngle);
  const clampedEndAngle = diff >= 360 ? startAngle + 359.99 : endAngle;
  
  const startOuter = polarToCartesian(cx, cy, outerR, startAngle);
  const endOuter = polarToCartesian(cx, cy, outerR, clampedEndAngle);
  const startInner = polarToCartesian(cx, cy, innerR, clampedEndAngle);
  const endInner = polarToCartesian(cx, cy, innerR, startAngle);

  const largeArcFlag = diff > 180 ? '1' : '0';

  return [
    'M', startOuter.x, startOuter.y,
    'A', outerR, outerR, 0, largeArcFlag, 1, endOuter.x, endOuter.y,
    'L', startInner.x, startInner.y,
    'A', innerR, innerR, 0, largeArcFlag, 0, endInner.x, endInner.y,
    'Z'
  ].join(' ');
}

export default function DollarExchangePieChart({
  transactions,
  lang
}: DollarExchangePieChartProps) {
  const [timeframe, setTimeframe] = useState<'this_month' | 'last_7_days' | 'today'>('this_month');
  const [hoveredSlice, setHoveredSlice] = useState<'buy' | 'sell' | null>(null);

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
        bCount += 1;
        spentOnBuy += counterVal;
      } else {
        sold += usdVal;
        sCount += 1;
        receivedOnSell += counterVal;
      }
    });

    const tot = bought + sold;
    const buyPct = tot > 0 ? (bought / tot) * 100 : 0;
    const sellPct = tot > 0 ? (sold / tot) * 100 : 0;

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

  // Average exchange rates
  const avgBuyRate = usdBought > 0 ? counterSpentOnBuy / usdBought : 0;
  const avgSellRate = usdSold > 0 ? counterReceivedOnSell / usdSold : 0;

  // Donut geometry constants (balanced 150x150 canvas)
  const cx = 75;
  const cy = 75;
  const outerR = 60;
  const innerR = 42;
  const buyAngle = totalVolume > 0 ? (buyPercentage / 100) * 360 : 0;

  return (
    <div className="p-5 space-y-4 text-slate-100">
      {/* Header & Timeframe Switcher */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/[0.08] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#1D7AFC]/15 text-[#1D7AFC] border border-[#1D7AFC]/25 flex items-center justify-center font-bold shrink-0 shadow-[0_0_12px_rgba(29,122,252,0.2)]">
            <PieIcon className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white leading-tight">
                {lang === 'en' 
                  ? 'USD Exchange' 
                  : lang === 'ar' 
                    ? 'صرافة الدولار' 
                    : 'فرۆشتن و کڕینی دۆلار'}
              </h3>
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-white/[0.06] text-[#60A5FA] border border-white/[0.1]">
                USD
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {lang === 'en'
                ? 'Buy vs Sell distribution'
                : lang === 'ar'
                  ? 'مقارنة بيع وشراء الدولار'
                  : 'ڕێژەی ئاڵوگۆڕی دۆلار'}
            </p>
          </div>
        </div>

        {/* Clean Filter Toggle */}
        <div className="flex items-center bg-white/[0.05] p-0.5 rounded-xl border border-white/[0.1]">
          <button
            onClick={() => setTimeframe('this_month')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              timeframe === 'this_month'
                ? 'bg-[#1D7AFC] text-white shadow-[0_2px_10px_rgba(29,122,252,0.4)]'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.08]'
            }`}
          >
            {lang === 'en' ? 'Month' : lang === 'ar' ? 'الشهر' : 'ئەم مانگە'}
          </button>
          <button
            onClick={() => setTimeframe('last_7_days')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              timeframe === 'last_7_days'
                ? 'bg-[#1D7AFC] text-white shadow-[0_2px_10px_rgba(29,122,252,0.4)]'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.08]'
            }`}
          >
            {lang === 'en' ? '7 Days' : lang === 'ar' ? 'آخر 7 أيام' : 'کۆتا ٧ ڕۆژ'}
          </button>
          <button
            onClick={() => setTimeframe('today')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              timeframe === 'today'
                ? 'bg-[#1D7AFC] text-white shadow-[0_2px_10px_rgba(29,122,252,0.4)]'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.08]'
            }`}
          >
            {lang === 'en' ? 'Today' : lang === 'ar' ? 'اليوم' : 'ئەمڕۆ'}
          </button>
        </div>
      </div>

      {/* Balanced Side-by-Side Content - ample room without wasted vertical space */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
        {/* Donut Chart with Legend */}
        <div className="md:col-span-4 flex flex-col items-center justify-center py-1">
          <div className="relative w-[150px] h-[150px] select-none">
            <svg 
              viewBox="0 0 150 150" 
              className="w-full h-full transform -rotate-90 origin-center"
            >
              <defs>
                <linearGradient id="pieBuyGradCompact" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>
                <linearGradient id="pieSellGradCompact" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#f43f5e" />
                  <stop offset="100%" stopColor="#e11d48" />
                </linearGradient>
              </defs>

              {totalVolume === 0 ? (
                <circle
                  cx={cx}
                  cy={cy}
                  r={(outerR + innerR) / 2}
                  fill="none"
                  className="stroke-gray-100 dark:stroke-slate-800"
                  strokeWidth={outerR - innerR}
                />
              ) : buyPercentage >= 99.9 ? (
                <circle
                  cx={cx}
                  cy={cy}
                  r={(outerR + innerR) / 2}
                  fill="none"
                  stroke="url(#pieBuyGradCompact)"
                  strokeWidth={outerR - innerR}
                  className="cursor-pointer transition-opacity hover:opacity-90"
                  onMouseEnter={() => setHoveredSlice('buy')}
                  onMouseLeave={() => setHoveredSlice(null)}
                />
              ) : sellPercentage >= 99.9 ? (
                <circle
                  cx={cx}
                  cy={cy}
                  r={(outerR + innerR) / 2}
                  fill="none"
                  stroke="url(#pieSellGradCompact)"
                  strokeWidth={outerR - innerR}
                  className="cursor-pointer transition-opacity hover:opacity-90"
                  onMouseEnter={() => setHoveredSlice('sell')}
                  onMouseLeave={() => setHoveredSlice(null)}
                />
              ) : (
                <g>
                  <path
                    d={describeDonutSlice(cx, cy, hoveredSlice === 'buy' ? outerR + 2 : outerR, innerR, 0, buyAngle)}
                    fill="url(#pieBuyGradCompact)"
                    className="stroke-white dark:stroke-slate-900 cursor-pointer transition-all duration-200"
                    strokeWidth="2"
                    onMouseEnter={() => setHoveredSlice('buy')}
                    onMouseLeave={() => setHoveredSlice(null)}
                  />
                  <path
                    d={describeDonutSlice(cx, cy, hoveredSlice === 'sell' ? outerR + 2 : outerR, innerR, buyAngle, 360)}
                    fill="url(#pieSellGradCompact)"
                    className="stroke-white dark:stroke-slate-900 cursor-pointer transition-all duration-200"
                    strokeWidth="2"
                    onMouseEnter={() => setHoveredSlice('sell')}
                    onMouseLeave={() => setHoveredSlice(null)}
                  />
                </g>
              )}
            </svg>

            {/* Center Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-2">
              <span className="text-[10px] font-semibold text-gray-500 dark:text-slate-400">
                {hoveredSlice === 'buy'
                  ? (lang === 'en' ? 'Bought' : lang === 'ar' ? 'المشترى' : 'کڕین')
                  : hoveredSlice === 'sell'
                    ? (lang === 'en' ? 'Sold' : lang === 'ar' ? 'المباع' : 'فرۆشتن')
                    : (lang === 'en' ? 'Total Volume' : lang === 'ar' ? 'الإجمالي' : 'کۆی گشتی')}
              </span>
              <span className="text-sm font-bold font-mono text-gray-900 dark:text-white mt-0.5 tracking-tight tabular-nums" dir="ltr">
                {hoveredSlice === 'buy' 
                  ? formatMoney(usdBought, 'USD') 
                  : hoveredSlice === 'sell'
                    ? formatMoney(usdSold, 'USD')
                    : formatMoney(totalVolume, 'USD')}
              </span>
              <span className="text-[10px] font-medium font-mono text-gray-500 dark:text-slate-400 mt-0.5">
                {hoveredSlice === 'buy' 
                  ? `${buyPercentage.toFixed(0)}%` 
                  : hoveredSlice === 'sell'
                    ? `${sellPercentage.toFixed(0)}%`
                    : `${usdBoughtCount + usdSoldCount} deals`}
              </span>
            </div>
          </div>

          {/* Interactive Legend Pills */}
          <div className="flex items-center gap-3 mt-2 text-xs font-medium">
            <button
              type="button"
              onMouseEnter={() => setHoveredSlice('buy')}
              onMouseLeave={() => setHoveredSlice(null)}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                hoveredSlice === 'buy'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold'
                  : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
              <span>{lang === 'en' ? 'Buy' : lang === 'ar' ? 'شراء' : 'کڕین'}:</span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400" dir="ltr">{buyPercentage.toFixed(0)}%</span>
            </button>

            <button
              type="button"
              onMouseEnter={() => setHoveredSlice('sell')}
              onMouseLeave={() => setHoveredSlice(null)}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                hoveredSlice === 'sell'
                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold'
                  : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0"></span>
              <span>{lang === 'en' ? 'Sell' : lang === 'ar' ? 'بيع' : 'فرۆشتن'}:</span>
              <span className="font-mono font-bold text-rose-600 dark:text-rose-400" dir="ltr">{sellPercentage.toFixed(0)}%</span>
            </button>
          </div>
        </div>

        {/* Bought & Sold Statistics Beside Donut */}
        <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Buy USD Card */}
          <div 
            onMouseEnter={() => setHoveredSlice('buy')}
            onMouseLeave={() => setHoveredSlice(null)}
            className={`rounded-xl p-4 border transition-all ${
              hoveredSlice === 'buy'
                ? 'bg-gray-50/90 dark:bg-slate-800/70 border-emerald-500/40 shadow-xs'
                : 'bg-gray-50/70 dark:bg-slate-800/40 border-gray-200/60 dark:border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-slate-300">
                <ArrowDownRight className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{lang === 'en' ? 'USD Bought' : lang === 'ar' ? 'شراء الدولار' : 'کڕینی دۆلار'}</span>
              </div>
              <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {buyPercentage.toFixed(0)}%
              </span>
            </div>

            <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-2 tabular-nums" dir="ltr">
              {formatMoney(usdBought, 'USD')}
            </div>

            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-slate-400 mt-2 pt-2 border-t border-gray-200/60 dark:border-slate-800 font-mono">
              <span>{usdBoughtCount} {lang === 'en' ? 'deals' : lang === 'ar' ? 'معاملة' : 'مامەڵە'}</span>
              {avgBuyRate > 0 && (
                <span dir="ltr">~{Math.round(avgBuyRate).toLocaleString()} {counterCurrency}</span>
              )}
            </div>
          </div>

          {/* Sell USD Card */}
          <div 
            onMouseEnter={() => setHoveredSlice('sell')}
            onMouseLeave={() => setHoveredSlice(null)}
            className={`rounded-xl p-4 border transition-all ${
              hoveredSlice === 'sell'
                ? 'bg-gray-50/90 dark:bg-slate-800/70 border-rose-500/40 shadow-xs'
                : 'bg-gray-50/70 dark:bg-slate-800/40 border-gray-200/60 dark:border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-slate-300">
                <ArrowUpRight className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{lang === 'en' ? 'USD Sold' : lang === 'ar' ? 'بيع الدولار' : 'فرۆشتنی دۆلار'}</span>
              </div>
              <span className="text-xs font-bold font-mono text-rose-600 dark:text-rose-400">
                {sellPercentage.toFixed(0)}%
              </span>
            </div>

            <div className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-2 tabular-nums" dir="ltr">
              {formatMoney(usdSold, 'USD')}
            </div>

            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-slate-400 mt-2 pt-2 border-t border-gray-200/60 dark:border-slate-800 font-mono">
              <span>{usdSoldCount} {lang === 'en' ? 'deals' : lang === 'ar' ? 'معاملة' : 'مامەڵە'}</span>
              {avgSellRate > 0 && (
                <span dir="ltr">~{Math.round(avgSellRate).toLocaleString()} {counterCurrency}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Net Position Footer */}
      <div className="bg-gray-50/70 dark:bg-slate-800/40 border border-gray-200/60 dark:border-slate-800 rounded-xl px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-slate-400">
          <TrendingUp className="w-3.5 h-3.5 text-primary shrink-0" />
          <span>{lang === 'en' ? 'Net Position:' : lang === 'ar' ? 'صافي المركز:' : 'هاوسەنگی پوختە:'}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-bold font-mono tabular-nums ${netPosition >= 0 ? 'text-primary dark:text-teal-400' : 'text-rose-600 dark:text-rose-400'}`} dir="ltr">
            {netPosition >= 0 ? '+' : ''}{formatMoney(netPosition, 'USD')}
          </span>
          <span className={`text-[11px] font-medium font-mono px-2 py-0.5 rounded ${
            netPosition >= 0 
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
          }`}>
            {netPosition >= 0 
              ? (lang === 'en' ? 'Surplus' : lang === 'ar' ? 'زيادة' : 'زیادە')
              : (lang === 'en' ? 'Deficit' : lang === 'ar' ? 'عجز' : 'کەمی')}
          </span>
        </div>
      </div>
    </div>
  );
}
