import React, { useState, useMemo, useEffect } from 'react';
import { 
  TrendingUp, TrendingDown, ArrowDownRight, ArrowUpRight, 
  ChevronLeft, ChevronRight, Calendar, Layers, Activity, Coins
} from 'lucide-react';
import { Transaction, Currency } from '../types';
import { formatMoney } from '../utils';

interface MonthlyCashFlowChartProps {
  transactions: Transaction[];
  currencies: Currency[];
  lang: 'ku' | 'ar' | 'en';
}

export default function MonthlyCashFlowChart({
  transactions,
  currencies,
  lang
}: MonthlyCashFlowChartProps) {
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth()); // 0-11
  
  // Default currency is USD, with fallback to first currency if USD is somehow not in list
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(() => {
    return currencies.includes('USD') ? 'USD' : (currencies[0] || 'USD');
  });

  // Ensure default stays USD if currencies list refreshes
  useEffect(() => {
    if (currencies.includes('USD') && !currencies.includes(selectedCurrency)) {
      setSelectedCurrency('USD');
    }
  }, [currencies, selectedCurrency]);

  const [hoveredDay, setHoveredDay] = useState<{
    day: number;
    inflow: number;
    outflow: number;
    net: number;
  } | null>(null);

  // Month names
  const monthNames = useMemo(() => {
    if (lang === 'en') {
      return ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    }
    if (lang === 'ar') {
      return ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    }
    return ['کانوونی دووەم', 'شوبات', 'ئازار', 'نیسان', 'ئایار', 'حوزەیران', 'تەمووز', 'ئاب', 'ئەیلوول', 'تشرینی یەکەم', 'تشرینی دووەم', 'کانوونی یەکەم'];
  }, [lang]);

  // Days in selected month
  const daysInMonth = useMemo(() => {
    return new Date(selectedYear, selectedMonth + 1, 0).getDate();
  }, [selectedYear, selectedMonth]);

  // Navigate months
  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(prev => prev - 1);
    } else {
      setSelectedMonth(prev => prev - 1);
    }
    setHoveredDay(null);
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(prev => prev + 1);
    } else {
      setSelectedMonth(prev => prev + 1);
    }
    setHoveredDay(null);
  };

  const handleResetToCurrentMonth = () => {
    setSelectedYear(currentDate.getFullYear());
    setSelectedMonth(currentDate.getMonth());
    setHoveredDay(null);
  };

  const isCurrentMonth = selectedYear === currentDate.getFullYear() && selectedMonth === currentDate.getMonth();

  // Compute daily and total inflow / outflow for the selected month and currency
  const { dailyData, totalInflow, totalOutflow, netFlow, maxDailyValue, activeDaysCount } = useMemo(() => {
    const days = Array.from({ length: daysInMonth }, (_, i) => ({
      day: i + 1,
      inflow: 0,
      outflow: 0,
    }));

    transactions.forEach(tx => {
      if (!tx.timestamp) return;
      const txDate = new Date(tx.timestamp);
      if (isNaN(txDate.getTime())) return;

      if (txDate.getFullYear() === selectedYear && txDate.getMonth() === selectedMonth) {
        const dayIdx = txDate.getDate() - 1;
        if (dayIdx < 0 || dayIdx >= daysInMonth) return;

        let inflowVal = 0;
        let outflowVal = 0;

        if (tx.type === 'Expense') {
          if (tx.currency === selectedCurrency) {
            outflowVal += Math.abs(tx.amount);
          }
        } else if (tx.type === 'Deposit') {
          if (tx.currency === selectedCurrency) {
            inflowVal += Math.abs(tx.amount);
          }
        } else if (tx.type === 'Withdrawal') {
          if (tx.currency === selectedCurrency) {
            outflowVal += Math.abs(tx.amount);
          }
        } else if (tx.type === 'Exchange') {
          if (selectedCurrency === 'USD') {
            const isBuy = tx.notes?.includes('کڕینی دۆلار') || tx.notes?.toLowerCase().includes('buy') || (tx.amount > 0 && !tx.notes?.includes('فرۆشتنی'));
            if (isBuy) {
              inflowVal += Math.abs(tx.amount);
            } else {
              outflowVal += Math.abs(tx.amount);
            }
          } else if (tx.targetCurrency === selectedCurrency) {
            const isBuyUSD = tx.notes?.includes('کڕینی دۆلار') || tx.notes?.toLowerCase().includes('buy') || (tx.amount > 0 && !tx.notes?.includes('فرۆشتنی'));
            if (isBuyUSD) {
              outflowVal += Math.abs(tx.targetAmount || 0);
            } else {
              inflowVal += Math.abs(tx.targetAmount || 0);
            }
          }
        } else {
          if (tx.currency === selectedCurrency) {
            if (tx.amount > 0) inflowVal += Math.abs(tx.amount);
            else if (tx.amount < 0) outflowVal += Math.abs(tx.amount);
          }
          if (tx.targetCurrency === selectedCurrency && tx.targetAmount) {
            if (tx.targetAmount > 0) inflowVal += Math.abs(tx.targetAmount);
            else if (tx.targetAmount < 0) outflowVal += Math.abs(tx.targetAmount);
          }
        }

        days[dayIdx].inflow += inflowVal;
        days[dayIdx].outflow += outflowVal;
      }
    });

    let sumIn = 0;
    let sumOut = 0;
    let maxVal = 0;
    let activeDays = 0;

    days.forEach(d => {
      sumIn += d.inflow;
      sumOut += d.outflow;
      if (d.inflow > 0 || d.outflow > 0) activeDays++;
      if (d.inflow > maxVal) maxVal = d.inflow;
      if (d.outflow > maxVal) maxVal = d.outflow;
    });

    return {
      dailyData: days,
      totalInflow: sumIn,
      totalOutflow: sumOut,
      netFlow: sumIn - sumOut,
      maxDailyValue: maxVal > 0 ? maxVal : 100,
      activeDaysCount: activeDays
    };
  }, [transactions, selectedYear, selectedMonth, selectedCurrency, daysInMonth]);

  // Flow Ratio
  const totalVolume = totalInflow + totalOutflow;
  const inflowPercent = totalVolume > 0 ? (totalInflow / totalVolume) * 100 : 50;
  const outflowPercent = totalVolume > 0 ? (totalOutflow / totalVolume) * 100 : 50;

  // Chart dimensions - generous width and useful height for full-width layout
  const svgWidth = 860;
  const svgHeight = 160;
  const paddingLeft = 56;
  const paddingRight = 18;
  const paddingTop = 12;
  const paddingBottom = 26;
  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  const daySlotWidth = chartWidth / daysInMonth;
  const barWidth = Math.max(daySlotWidth * 0.40, 3);

  // Y-axis grid tick values (4 evenly spaced ticks)
  const yTicks = [0, 0.33, 0.66, 1].map(ratio => ratio * maxDailyValue);

  return (
    <div className="p-5 space-y-4 text-slate-100">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/[0.08] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#1D7AFC]/15 text-[#1D7AFC] border border-[#1D7AFC]/25 flex items-center justify-center font-bold shrink-0 shadow-[0_0_12px_rgba(29,122,252,0.2)]">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white leading-tight">
                {lang === 'en' 
                  ? 'Monthly Cash Flow' 
                  : lang === 'ar' 
                    ? 'حركة التدفق المالي الشهري' 
                    : 'ڕێژەی هاتن و چوون لە مانگێکدا'}
              </h3>
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-white/[0.06] text-[#60A5FA] border border-white/[0.1]">
                {selectedCurrency}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {lang === 'en'
                ? `${monthNames[selectedMonth]} ${selectedYear} flow breakdown`
                : lang === 'ar'
                  ? `حركة التدفق لشهر ${monthNames[selectedMonth]} ${selectedYear}`
                  : `جوڵەی دارایی بۆ مانگی ${monthNames[selectedMonth]}ی ${selectedYear}`}
            </p>
          </div>
        </div>

        {/* Currency Switcher & Month Nav */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          {/* Currency Selector */}
          <div className="flex items-center gap-1 bg-white/[0.05] p-0.5 rounded-xl border border-white/[0.1]">
            {currencies.map(cur => (
              <button
                key={cur}
                onClick={() => {
                  setSelectedCurrency(cur);
                  setHoveredDay(null);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
                  selectedCurrency === cur
                    ? 'bg-[#1D7AFC] text-white shadow-[0_2px_10px_rgba(29,122,252,0.4)]'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.08]'
                }`}
                title={`${lang === 'en' ? 'Switch to' : lang === 'ar' ? 'التحويل إلى' : 'گۆڕین بۆ'} ${cur}`}
              >
                {cur}
              </button>
            ))}
          </div>

          {/* Month Navigator */}
          <div className="flex items-center bg-white/[0.05] p-0.5 rounded-xl border border-white/[0.1]">
            <button
              onClick={handlePrevMonth}
              title={lang === 'en' ? 'Previous Month' : lang === 'ar' ? 'الشهر السابق' : 'مانگی پێشوو'}
              className="p-1 text-slate-400 hover:text-white rounded transition-colors cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5 rtl:rotate-0 ltr:rotate-180" />
            </button>
            
            <span className="text-xs font-semibold text-white px-2 min-w-[95px] text-center font-mono">
              {monthNames[selectedMonth]} {selectedYear}
            </span>

            <button
              onClick={handleNextMonth}
              title={lang === 'en' ? 'Next Month' : lang === 'ar' ? 'الشهر التالي' : 'مانگی دواتر'}
              className="p-1 text-slate-400 hover:text-white rounded transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5 rtl:rotate-0 ltr:rotate-180" />
            </button>

            {!isCurrentMonth && (
              <button
                onClick={handleResetToCurrentMonth}
                title={lang === 'en' ? 'Current Month' : lang === 'ar' ? 'الشهر الحالي' : 'ئەم مانگە'}
                className="px-2 py-0.5 text-[10px] font-bold bg-[#1D7AFC] text-white rounded-md hover:bg-blue-500 transition-all cursor-pointer ml-0.5"
              >
                {lang === 'en' ? 'Current' : lang === 'ar' ? 'الحالي' : 'ئەم مانگە'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Clean KPI Summary Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Total Inflow Card */}
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
              <ArrowDownRight className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{lang === 'en' ? 'Inflow' : lang === 'ar' ? 'الوارد' : 'هاتن'}</span>
            </div>
            <div className="text-base sm:text-lg font-bold font-mono text-emerald-400 mt-1 tabular-nums" dir="ltr">
              +{formatMoney(totalInflow, selectedCurrency)}
            </div>
          </div>
          <span className="text-xs font-medium text-slate-400 font-mono">
            {inflowPercent.toFixed(0)}%
          </span>
        </div>

        {/* Total Outflow Card */}
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
              <ArrowUpRight className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>{lang === 'en' ? 'Outflow' : lang === 'ar' ? 'المنصرف' : 'چوون'}</span>
            </div>
            <div className="text-base sm:text-lg font-bold font-mono text-rose-400 mt-1 tabular-nums" dir="ltr">
              -{formatMoney(totalOutflow, selectedCurrency)}
            </div>
          </div>
          <span className="text-xs font-medium text-slate-400 font-mono">
            {outflowPercent.toFixed(0)}%
          </span>
        </div>

        {/* Net Flow Card */}
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
              <TrendingUp className="w-3.5 h-3.5 text-[#1D7AFC] shrink-0" />
              <span>{lang === 'en' ? 'Net Flow' : lang === 'ar' ? 'صافي الحركة' : 'هاوسەنگی پوختە'}</span>
            </div>
            <div className={`text-base sm:text-lg font-bold font-mono mt-1 tabular-nums ${
              netFlow >= 0 ? 'text-[#60A5FA]' : 'text-rose-400'
            }`} dir="ltr">
              {netFlow >= 0 ? '+' : ''}{formatMoney(netFlow, selectedCurrency)}
            </div>
          </div>
          <span className={`text-[11px] font-medium font-mono px-2 py-0.5 rounded ${
            netFlow >= 0 
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
          }`}>
            {netFlow >= 0 
              ? (lang === 'en' ? 'Surplus' : lang === 'ar' ? 'فائض' : 'زیادە')
              : (lang === 'en' ? 'Deficit' : lang === 'ar' ? 'عجز' : 'کەمی')}
          </span>
        </div>
      </div>

      {/* Active Hover / Legend Bar */}
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-slate-400 px-0.5 min-h-[22px]">
        {hoveredDay ? (
          <div className="flex items-center gap-3 flex-wrap font-mono text-xs">
            <span className="text-gray-900 dark:text-white font-bold bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded">
              {lang === 'en' ? `Day ${hoveredDay.day}` : lang === 'ar' ? `اليوم ${hoveredDay.day}` : `ڕۆژی ${hoveredDay.day}`}
            </span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold" dir="ltr">
              +{formatMoney(hoveredDay.inflow, selectedCurrency)}
            </span>
            <span className="text-rose-600 dark:text-rose-400 font-bold" dir="ltr">
              -{formatMoney(hoveredDay.outflow, selectedCurrency)}
            </span>
            <span className={`font-bold ${hoveredDay.net >= 0 ? 'text-primary dark:text-teal-400' : 'text-rose-600 dark:text-rose-400'}`} dir="ltr">
              Net: {hoveredDay.net >= 0 ? '+' : ''}{formatMoney(hoveredDay.net, selectedCurrency)}
            </span>
          </div>
        ) : (
          <span className="text-gray-400 dark:text-slate-500 text-xs">
            {lang === 'en' 
              ? 'Hover over any day bar for details' 
              : lang === 'ar' 
                ? 'مرر على أي عمود للتفاصيل اليومية' 
                : 'دەست بنێ بە هەر ڕۆژێکدا بۆ بینینی وردەکاری'}
          </span>
        )}

        <div className="flex items-center gap-3 shrink-0 text-xs font-medium">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500"></span>
            <span className="text-gray-600 dark:text-slate-300">{lang === 'en' ? 'Inflow' : lang === 'ar' ? 'وارد' : 'هاتن'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-rose-500"></span>
            <span className="text-gray-600 dark:text-slate-300">{lang === 'en' ? 'Outflow' : lang === 'ar' ? 'منصرف' : 'چوون'}</span>
          </div>
        </div>
      </div>

      {/* SVG Bar Chart with Quiet Inactive Days */}
      <div className="w-full overflow-x-auto no-scrollbar">
        <div className="min-w-[580px]">
          <svg 
            viewBox={`0 0 ${svgWidth} ${svgHeight}`} 
            className="w-full h-auto overflow-visible select-none"
          >
            <defs>
              <linearGradient id="inflowGradCompact" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#059669" stopOpacity="0.85" />
              </linearGradient>
              <linearGradient id="outflowGradCompact" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#e11d48" stopOpacity="0.85" />
              </linearGradient>
            </defs>

            {/* Horizontal Gridlines & Y-axis labels */}
            {yTicks.map((val, idx) => {
              const y = paddingTop + chartHeight - (val / maxDailyValue) * chartHeight;
              const formattedVal = val >= 1000000 
                ? `${(val / 1000000).toFixed(1)}M` 
                : val >= 1000 
                  ? `${(val / 1000).toFixed(0)}k` 
                  : val.toFixed(0);

              return (
                <g key={idx}>
                  <line 
                    x1={paddingLeft} 
                    y1={y} 
                    x2={svgWidth - paddingRight} 
                    y2={y} 
                    className="stroke-gray-100 dark:stroke-slate-800"
                    strokeWidth="1"
                    strokeDasharray={idx === 0 ? undefined : "3 3"}
                  />
                  <text
                    x={paddingLeft - 6}
                    y={y + 3}
                    textAnchor="end"
                    fontSize="9"
                    fill="#94a3b8"
                    fontFamily="monospace"
                    fontWeight="500"
                  >
                    {formattedVal}
                  </text>
                </g>
              );
            })}

            {/* Bars for each day */}
            {dailyData.map((d) => {
              const slotX = paddingLeft + (d.day - 1) * daySlotWidth;
              const midSlot = slotX + daySlotWidth / 2;

              const inHeight = maxDailyValue > 0 ? (d.inflow / maxDailyValue) * chartHeight : 0;
              const outHeight = maxDailyValue > 0 ? (d.outflow / maxDailyValue) * chartHeight : 0;

              const inY = paddingTop + chartHeight - inHeight;
              const outY = paddingTop + chartHeight - outHeight;

              const isHovered = hoveredDay?.day === d.day;
              const hasData = d.inflow > 0 || d.outflow > 0;

              return (
                <g 
                  key={d.day}
                  onMouseEnter={() => setHoveredDay({
                    day: d.day,
                    inflow: d.inflow,
                    outflow: d.outflow,
                    net: d.inflow - d.outflow
                  })}
                  onMouseLeave={() => setHoveredDay(null)}
                  className="cursor-pointer group"
                >
                  <rect
                    x={slotX}
                    y={paddingTop}
                    width={daySlotWidth}
                    height={chartHeight}
                    className={`transition-colors ${
                      isHovered 
                        ? 'fill-gray-100/50 dark:fill-slate-800/40' 
                        : 'fill-transparent'
                    }`}
                    rx="3"
                  />

                  {/* Inflow Bar (Green) */}
                  {d.inflow > 0 && (
                    <rect
                      x={midSlot - barWidth - 0.5}
                      y={inY}
                      width={barWidth}
                      height={Math.max(inHeight, 2)}
                      fill="url(#inflowGradCompact)"
                      rx="1.5"
                      className={`transition-all duration-200 ${isHovered ? 'filter drop-shadow-sm brightness-110' : ''}`}
                    />
                  )}

                  {/* Outflow Bar (Rose) */}
                  {d.outflow > 0 && (
                    <rect
                      x={midSlot + 0.5}
                      y={outY}
                      width={barWidth}
                      height={Math.max(outHeight, 2)}
                      fill="url(#outflowGradCompact)"
                      rx="1.5"
                      className={`transition-all duration-200 ${isHovered ? 'filter drop-shadow-sm brightness-110' : ''}`}
                    />
                  )}

                  {/* Empty days are visually quiet: subtle tiny dot at baseline */}
                  {!hasData && (
                    <circle
                      cx={midSlot}
                      cy={paddingTop + chartHeight}
                      r="1"
                      className="fill-gray-300 dark:fill-slate-700 opacity-60"
                    />
                  )}

                  {/* Date labels evenly spaced */}
                  {(d.day === 1 || d.day % 5 === 0 || d.day === daysInMonth || isHovered) && (
                    <text
                      x={midSlot}
                      y={paddingTop + chartHeight + 14}
                      textAnchor="middle"
                      fontSize="9"
                      className={isHovered ? "fill-gray-900 dark:fill-white font-bold" : "fill-gray-400 dark:fill-slate-500"}
                      fontFamily="monospace"
                    >
                      {d.day}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Baseline */}
            <line
              x1={paddingLeft}
              y1={paddingTop + chartHeight}
              x2={svgWidth - paddingRight}
              y2={paddingTop + chartHeight}
              className="stroke-gray-200 dark:stroke-slate-700"
              strokeWidth="1"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
