import { useState, FormEvent, useEffect, useMemo } from 'react';
import { RefreshCw, ArrowLeftRight, Printer, Edit3, ChevronRight, ChevronLeft, X, Trash2 } from 'lucide-react';
import { Currency, Transaction, AppUser } from '../types';
import { AppState } from '../data/stateManager';
import { formatMoney, formatKurdishDateTime, formatInputValue, parseInputValue } from '../utils';
import { translations } from '../data/translations';
import SearchableCustomerSelect from './SearchableCustomerSelect';

interface ExchangeViewProps {
  appState: AppState;
  onExecuteExchange: (
    sourceType: 'Safe' | string, 
    action: 'BuyUSD' | 'SellUSD', 
    otherCurrency: string, 
    usdAmount: number, 
    exchangeRate: number, 
    notes: string
  ) => void;
  onEditExchange?: (
    transactionId: string,
    sourceType: 'Safe' | string, 
    action: 'BuyUSD' | 'SellUSD', 
    otherCurrency: string, 
    usdAmount: number, 
    exchangeRate: number, 
    notes: string
  ) => void;
  onPrintReceipt?: (type: 'Transaction', data: Transaction) => void;
  onDeleteTransaction?: (transactionId: string) => void;
}

export default function ExchangeView({ 
  appState, 
  onExecuteExchange, 
  onEditExchange,
  onPrintReceipt,
  onDeleteTransaction
}: ExchangeViewProps) {
  const { customers, safeBalances, settings, currencies, transactions, currentUser, currentSessionRole } = appState;
  const lang = settings.language || 'ku';
  const t = translations[lang];

  const canEditOrDelete = currentSessionRole === 'Owner' || 
    (currentSessionRole === 'Employee' && (currentUser as AppUser)?.role !== 'Teller');

  const nonUSDCurrencies = useMemo(() => {
    return currencies.filter(c => c !== 'USD');
  }, [currencies]);

  const nonSystemCustomers = useMemo(() => {
    return customers.filter(c => c.id !== 'system-expenses' && c.id !== 'system-exchange');
  }, [customers]);
  
  // Form states
  const [sourceType, setSourceType] = useState<'Safe' | string>('Safe'); // 'Safe' or customerId
  const [action, setAction] = useState<'BuyUSD' | 'SellUSD'>('BuyUSD');
  const [otherCurrency, setOtherCurrency] = useState<string>(nonUSDCurrencies[0] || 'IQD');
  const [usdAmount, setUsdAmount] = useState('');
  const [exchangeRate, setExchangeRate] = useState('');
  const [notes, setNotes] = useState('');

  // Editing transaction states
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [editSourceType, setEditSourceType] = useState<'Safe' | string>('Safe');
  const [editAction, setEditAction] = useState<'BuyUSD' | 'SellUSD'>('BuyUSD');
  const [editOtherCurrency, setEditOtherCurrency] = useState('IQD');
  const [editUsdAmount, setEditUsdAmount] = useState('');
  const [editExchangeRate, setEditExchangeRate] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Pagination for history
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  // Filter state for "Today only"
  const [filterTodayOnly, setFilterTodayOnly] = useState(true);
  const [selectedHistoryCurrency, setSelectedHistoryCurrency] = useState<'all' | string>('all');

  const isToday = (timestamp: string) => {
    if (!timestamp) return false;
    const txDate = new Date(timestamp);
    const today = new Date();
    return txDate.getFullYear() === today.getFullYear() &&
           txDate.getMonth() === today.getMonth() &&
           txDate.getDate() === today.getDate();
  };

  // Filter only exchange transactions & optionally today only & selected currency
  const exchangeTrans = useMemo(() => {
    return transactions.filter(tr => {
      if (tr.type !== 'Exchange') return false;
      if (filterTodayOnly && !isToday(tr.timestamp)) return false;
      if (selectedHistoryCurrency !== 'all') {
        if (selectedHistoryCurrency === 'USD') return true; // all exchanges involve USD
        return tr.targetCurrency === selectedHistoryCurrency;
      }
      return true;
    });
  }, [transactions, filterTodayOnly, selectedHistoryCurrency]);

  // Sum incoming and outgoing for selected currency
  const { selectedCurrencyIncomingSum, selectedCurrencyOutgoingSum } = useMemo(() => {
    let incoming = 0;
    let outgoing = 0;

    if (selectedHistoryCurrency !== 'all') {
      exchangeTrans.forEach(tr => {
        if (selectedHistoryCurrency === 'USD') {
          if (tr.amount > 0) {
            incoming += Math.abs(tr.amount);
          } else {
            outgoing += Math.abs(tr.amount);
          }
        } else {
          // Counter currency
          if (tr.targetCurrency === selectedHistoryCurrency) {
            // If amount is positive, we bought USD, which means we spent/gave the counter currency (Outgoing)
            if (tr.amount > 0) {
              outgoing += Math.abs(tr.targetAmount || 0);
            } else {
              // We sold USD, which means we received the counter currency (Incoming)
              incoming += Math.abs(tr.targetAmount || 0);
            }
          }
        }
      });
    }

    return { selectedCurrencyIncomingSum: incoming, selectedCurrencyOutgoingSum: outgoing };
  }, [exchangeTrans, selectedHistoryCurrency]);

  const totalItems = exchangeTrans.length;
  const totalPages = useMemo(() => {
    return Math.ceil(totalItems / itemsPerPage) || 1;
  }, [totalItems, itemsPerPage]);

  const paginatedExchanges = useMemo(() => {
    return exchangeTrans.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [exchangeTrans, currentPage, itemsPerPage]);

  // Auto Calculations
  const numUSD = parseFloat(usdAmount) || 0;
  const numRate = parseFloat(exchangeRate) || 0;
  const calculatedOtherAmount = useMemo(() => {
    return Math.round(numUSD * numRate);
  }, [numUSD, numRate]);

  const selectedCustomer = useMemo(() => {
    return sourceType === 'Safe' ? null : customers.find(c => c.id === sourceType);
  }, [customers, sourceType]);

  // Sync state if nonUSDCurrencies list updates and current selected otherCurrency is invalid
  useEffect(() => {
    if (nonUSDCurrencies.length > 0 && !nonUSDCurrencies.includes(otherCurrency)) {
      setOtherCurrency(nonUSDCurrencies[0]);
    }
  }, [currencies]);

  // Handle setting up edit states when selecting a row
  const startEditing = (tx: Transaction) => {
    setEditingTx(tx);
    setEditSourceType(tx.customerId || 'Safe');
    const isBuyUSDRow = tx.amount > 0;
    setEditAction(isBuyUSDRow ? 'BuyUSD' : 'SellUSD');
    setEditOtherCurrency(tx.targetCurrency || 'IQD');
    setEditUsdAmount(String(Math.abs(tx.amount)));
    setEditExchangeRate(String(tx.rate || 0));
    
    // Attempt to extract operator description notes or keep original
    const rawNote = tx.notes || '';
    const delimiterIndex = rawNote.indexOf('. ');
    if (delimiterIndex !== -1) {
      setEditNotes(rawNote.slice(delimiterIndex + 2));
    } else {
      setEditNotes(rawNote);
    }
  };

  const targetCustomerForPreview = sourceType === 'Safe' 
    ? customers.find(c => c.id === 'system-exchange') 
    : selectedCustomer;

  // Previewing new balances
  const getPreviewBalances = () => {
    const safeUsdCurrent = safeBalances.USD || 0;
    const safeOtherCurrent = safeBalances[otherCurrency] || 0;

    const usdChange = action === 'BuyUSD' ? numUSD : -numUSD;
    const otherChange = action === 'BuyUSD' ? -calculatedOtherAmount : calculatedOtherAmount;

    const safeUsdNext = sourceType === 'Safe' ? safeUsdCurrent + usdChange : safeUsdCurrent;
    const safeOtherNext = sourceType === 'Safe' ? safeOtherCurrent + otherChange : safeOtherCurrent;

    let custUsdCurrent = 0;
    let custOtherCurrent = 0;
    let custUsdNext = 0;
    let custOtherNext = 0;

    if (targetCustomerForPreview) {
      custUsdCurrent = targetCustomerForPreview.balances.USD || 0;
      custOtherCurrent = targetCustomerForPreview.balances[otherCurrency] || 0;
      custUsdNext = custUsdCurrent - usdChange;
      custOtherNext = custOtherCurrent - otherChange;
    }

    return {
      safeUsdCurrent,
      safeOtherCurrent,
      safeUsdNext,
      safeOtherNext,
      custUsdCurrent,
      custOtherCurrent,
      custUsdNext,
      custOtherNext
    };
  };

  const preview = getPreviewBalances();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (numUSD <= 0 || numRate <= 0) return;

    onExecuteExchange(
      sourceType,
      action,
      otherCurrency,
      numUSD,
      numRate,
      notes
    );

    // Reset inputs
    setUsdAmount('');
    setExchangeRate('');
    setNotes('');
  };

  const handleEditSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!editingTx || !onEditExchange) return;

    const usdVal = parseFloat(editUsdAmount) || 0;
    const rateVal = parseFloat(editExchangeRate) || 0;
    if (usdVal <= 0 || rateVal <= 0) return;

    onEditExchange(
      editingTx.id,
      editSourceType,
      editAction,
      editOtherCurrency,
      usdVal,
      rateVal,
      editNotes
    );

    setEditingTx(null);
  };

  return (
    <div className={`space-y-6 animate-fade-in ${lang === 'en' ? 'text-left' : 'text-right'}`}>
      <div>
        <h2 className="text-xl font-bold text-gray-900 rtl:border-r-4 rtl:pr-3 ltr:border-l-4 ltr:pl-3 border-primary flex items-center gap-2">
          <ArrowLeftRight className="w-6 h-6 text-primary" />
          {t.currency_exchange_title}
        </h2>
        <p className="text-xs text-gray-400 mt-1">{t.exchange_desc}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Core calculation form */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4 lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Choose Source first */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">{t.exchange_source}</label>
                <SearchableCustomerSelect
                  value={sourceType}
                  onChange={(val) => setSourceType(val)}
                  customers={customers}
                  placeholder={lang === 'en' ? 'Select Safe or Customer...' : lang === 'ar' ? 'اختر الخزينة أو العميل...' : 'سندوق یان کڕیار هەڵبژێرە...'}
                  includeSafeOption={true}
                  lang={lang}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">{t.action_label}</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAction('BuyUSD')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                      action === 'BuyUSD'
                        ? 'border-primary bg-primary-light text-primary'
                        : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {t.buy_usd}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAction('SellUSD')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                      action === 'SellUSD'
                        ? 'border-primary bg-primary-light text-primary'
                        : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {t.sell_usd}
                  </button>
                </div>
              </div>
            </div>

            {/* Choose Other currency and amounts */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">{t.counter_currency}</label>
                <select
                  value={otherCurrency}
                  onChange={(e) => setOtherCurrency(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none font-mono"
                >
                  {nonUSDCurrencies.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">{t.amount_usd}</label>
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  placeholder="e.g. 1,000"
                  value={formatInputValue(usdAmount)}
                  onChange={(e) => setUsdAmount(parseInputValue(e.target.value))}
                  className={`w-full border border-gray-200 rounded-xl px-4 py-2.5 text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none font-mono ${lang === 'en' ? 'text-left' : 'text-right'}`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">{t.rate_label}</label>
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  placeholder="e.g. 1,520"
                  value={formatInputValue(exchangeRate)}
                  onChange={(e) => setExchangeRate(parseInputValue(e.target.value))}
                  className={`w-full border border-gray-200 rounded-xl px-4 py-2.5 text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none font-mono ${lang === 'en' ? 'text-left' : 'text-right'}`}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">{t.notes_label}</label>
              <textarea
                placeholder={lang === 'en' ? 'Write notes about this exchange...' : lang === 'ar' ? 'اكتب ملاحظات حول عملية الأوراق النقدية...' : 'تێبینی بنووسە بۆ ئەم ئاڵوگۆڕە (جێبجێکردن)...'}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none h-16 resize-none"
              />
            </div>

            {/* Calculations summaries preview */}
            <div className="bg-gray-50 p-4 rounded-xl space-y-2">
              <h4 className="text-xs font-bold text-gray-800">{t.preview_balances}</h4>
              <div className="grid grid-cols-2 text-xs text-gray-600 gap-y-1">
                <span>{lang === 'en' ? 'Amount exchanged:' : lang === 'ar' ? 'المبلغ المستبدل:' : 'بڕی دەرچوو/کە گۆڕدراوە:'}</span>
                <span className={`font-mono text-gray-900 font-bold ${lang === 'en' ? 'text-right' : 'text-left'}`}>{numUSD.toLocaleString()} USD</span>
                <span>{lang === 'en' ? 'Calculated counter value:' : lang === 'ar' ? 'القيمة المقابلة المحسوبة:' : 'بڕی حیسابکراو مۆدیلی تر:'}</span>
                <span className={`font-mono text-gray-900 font-bold ${lang === 'en' ? 'text-right' : 'text-left'}`}>
                  {calculatedOtherAmount.toLocaleString()} {otherCurrency}
                </span>
              </div>
            </div>

            <div className={`flex ${lang === 'en' ? 'justify-start' : 'justify-end'} pt-2`}>
              <button
                type="submit"
                className="px-6 py-2.5 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl text-xs shadow-md shadow-primary/10 transition-all flex items-center gap-1.5"
              >
                <RefreshCw className="w-4 h-4" />
                <span>{t.exchange_submit}</span>
              </button>
            </div>

          </form>
        </div>

        {/* Realtime balance preview of selected source */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-gray-900 pb-1 border-b border-gray-100 flex items-center justify-between">
            <span>{lang === 'en' ? 'Balance Before & After' : lang === 'ar' ? 'الرصيد قبل / بعد الحركة' : 'هاوسەنگی پێش/پاش باڵانس'}</span>
          </h3>
          
          <div className="space-y-4">
            {/* Safe / Treasury section */}
            <div className="space-y-3">
              <span className="text-xs font-black text-primary block rtl:border-r-2 rtl:pr-2 ltr:border-l-2 ltr:pl-2 border-primary">
                {lang === 'en' ? 'Safe (Main Office Vault)' : lang === 'ar' ? 'سندوق خزينة الشركة الرئيسي' : 'سندوق (گەنجینەی نووسینگە)'}
              </span>
              
              <div>
                <p className="text-[10px] text-gray-400 font-semibold mb-1">
                  {lang === 'en' ? 'USD Balance' : lang === 'ar' ? 'رصيد الدولار (USD)' : 'باڵانسی دۆلار (USD)'}
                </p>
                <div className="flex justify-between items-center bg-gray-50 p-2 rounded-xl text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-gray-400 block">{lang === 'en' ? 'Current' : lang === 'ar' ? 'الحالي' : 'ئێستا'}</span>
                    <span className="font-bold text-gray-800">{formatMoney(preview.safeUsdCurrent, 'USD')}</span>
                  </div>
                  <div className="border-r border-gray-200 h-5 mx-2" />
                  <div>
                    <span className="text-[10px] text-gray-400 block">{lang === 'en' ? 'After' : lang === 'ar' ? 'بعد الصرف' : 'دوای گۆڕین'}</span>
                    <span className="font-bold text-primary">{formatMoney(preview.safeUsdNext, 'USD')}</span>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-[10px] text-gray-400 font-semibold mb-1">
                  {lang === 'en' ? `${otherCurrency} Balance` : lang === 'ar' ? `رصيد ${otherCurrency}` : `باڵانسی ${otherCurrency}`}
                </p>
                <div className="flex justify-between items-center bg-gray-50 p-2 rounded-xl text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-gray-400 block">{lang === 'en' ? 'Current' : lang === 'ar' ? 'الحالي' : 'ئێستا'}</span>
                    <span className="font-bold text-gray-800">{formatMoney(preview.safeOtherCurrent, otherCurrency)}</span>
                  </div>
                  <div className="border-r border-gray-200 h-5 mx-2" />
                  <div>
                    <span className="text-[10px] text-gray-400 block">{lang === 'en' ? 'After' : lang === 'ar' ? 'بعد الصرف' : 'دوای گۆڕین'}</span>
                    <span className="font-bold text-primary">{formatMoney(preview.safeOtherNext, otherCurrency)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Selected Customer / Exchange Party section */}
            {targetCustomerForPreview && (
              <div className="space-y-3 pt-3 border-t border-gray-100">
                <span className="text-xs font-black text-indigo-700 block rtl:border-r-2 rtl:pr-2 ltr:border-l-2 ltr:pl-2 border-indigo-500">
                  {sourceType === 'Safe'
                    ? (lang === 'en' ? 'Currency Exchange Account (System)' : lang === 'ar' ? 'حساب تصريف العملات (النظام)' : 'هەژماری ئاڵوگۆڕی دراو (سیستەم)')
                    : (lang === 'en' ? `Customer Account: ${selectedCustomer?.name}` : lang === 'ar' ? `حساب العميل: ${selectedCustomer?.name}` : `هەژماری کڕیار: ${selectedCustomer?.name}`)
                  }
                </span>

                <div>
                  <p className="text-[10px] text-gray-400 font-semibold mb-1">
                    {lang === 'en' ? 'USD Balance' : lang === 'ar' ? 'رصيد الدولار (USD)' : 'باڵانسی دۆلار (USD)'}
                  </p>
                  <div className="flex justify-between items-center bg-gray-50 p-2 rounded-xl text-xs font-mono">
                    <div>
                      <span className="text-[10px] text-gray-400 block">{lang === 'en' ? 'Current' : lang === 'ar' ? 'الحالي' : 'ئێستا'}</span>
                      <span className="font-bold text-gray-800">{formatMoney(preview.custUsdCurrent, 'USD')}</span>
                    </div>
                    <div className="border-r border-gray-200 h-5 mx-2" />
                    <div>
                      <span className="text-[10px] text-gray-400 block">{lang === 'en' ? 'After' : lang === 'ar' ? 'بعد الصرف' : 'دوای گۆڕین'}</span>
                      <span className="font-bold text-indigo-700">{formatMoney(preview.custUsdNext, 'USD')}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] text-gray-400 font-semibold mb-1">
                    {lang === 'en' ? `${otherCurrency} Balance` : lang === 'ar' ? `رصيد ${otherCurrency}` : `باڵانسی ${otherCurrency}`}
                  </p>
                  <div className="flex justify-between items-center bg-gray-50 p-2 rounded-xl text-xs font-mono">
                    <div>
                      <span className="text-[10px] text-gray-400 block">{lang === 'en' ? 'Current' : lang === 'ar' ? 'الحالي' : 'ئێستا'}</span>
                      <span className="font-bold text-gray-800">{formatMoney(preview.custOtherCurrent, otherCurrency)}</span>
                    </div>
                    <div className="border-r border-gray-200 h-5 mx-2" />
                    <div>
                      <span className="text-[10px] text-gray-400 block">{lang === 'en' ? 'After' : lang === 'ar' ? 'بعد الصرف' : 'دوای گۆڕین'}</span>
                      <span className="font-bold text-indigo-700">{formatMoney(preview.custOtherNext, otherCurrency)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-100 text-[11px] text-amber-800 leading-normal">
              {lang === 'en' 
                ? 'Verify correctness of the source party (Safe or Client Account) before execution, because it directly mutates currency reserves.' 
                : lang === 'ar' 
                  ? 'تأكد من صحة طرف المعاملة (السندوق أو حساب العميل) قبل التنفيذ النهائي، لأن الحركة تغير القيم مباشرة.' 
                  : 'دڵنیابەرەوە لە ڕاستی لایەنی سەرچاوەی کارەکە (سندوق یان هەژماری کڕیار) پێش جێبەجێکردنی کۆتایی چونکە کردارەکە ڕاستەوخۆ دەبێتە هۆی گۆڕانی دینار و سەرچاوەی دۆلار.'}
            </div>
          </div>
        </div>

      </div>

      {/* Today's Exchange History List (Paginated, Last 9) */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-3 border-b border-gray-100 gap-3">
          <div>
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
              <ArrowLeftRight className="w-5 h-5 text-primary" />
              <span>
                {lang === 'en' ? "Exchange Activities & History" : lang === 'ar' ? "سجل وموجز حركات الصرافة" : "تۆماری مێژوویی سەرجەم ئاڵوگۆڕەکانی دراو"}
              </span>
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              {lang === 'en' ? "Showing calculated conversion trails (9 records per page)" : lang === 'ar' ? "عرض مسارات تحويل الصرافة (٩ قيود لكل صفحة)" : "پیشاندانی هەنگاو و گۆڕانکاریەکانی ئاڵوگۆڕ (٩ تۆمار لە هەر لاپەڕەیەک)"}
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Currency Filter Dropdown */}
            <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1.5 rounded-lg border border-gray-200">
              <span className="text-[10px] text-gray-400 font-bold whitespace-nowrap">
                {lang === 'en' ? 'Currency:' : lang === 'ar' ? 'العملة:' : 'دراو:'}
              </span>
              <select
                value={selectedHistoryCurrency}
                onChange={(e) => {
                  setSelectedHistoryCurrency(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent text-xs focus:outline-none font-bold text-gray-850 cursor-pointer text-center"
              >
                <option value="all">{lang === 'en' ? 'All' : lang === 'ar' ? 'جميع العملات' : 'سەرجەم دراوەکان'}</option>
                <option value="USD">USD</option>
                {nonUSDCurrencies.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Today filter checkbox */}
            <label className="inline-flex items-center gap-2 cursor-pointer bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-755 transition-colors select-none">
              <input 
                type="checkbox" 
                checked={filterTodayOnly} 
                onChange={(e) => {
                  setFilterTodayOnly(e.target.checked);
                  setCurrentPage(1);
                }}
                className="rounded border-gray-300 text-primary focus:ring-primary w-3.5 h-3.5"
              />
              <span>
                {lang === 'en' ? "Today Only" : lang === 'ar' ? "حركات اليوم فقط" : "تەنها مامەڵەکانی ئەمڕۆ"}
              </span>
            </label>

            {/* Item count badge */}
            <span className="bg-primary/10 text-primary text-xs font-bold px-3 py-1.5 rounded-lg border border-primary/10 w-fit">
              {lang === 'en' ? `${totalItems} Operations` : lang === 'ar' ? `${totalItems} عمليات جارية` : `${totalItems} مامەڵەی گۆڕینەوە`}
            </span>
          </div>
        </div>

        {paginatedExchanges.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-xs">
            {lang === 'en' ? "No exchange transaction records registered yet." : lang === 'ar' ? "لا يوجد أي سجلات مبادلة نقدية مسجلة حتى الآن." : "هیچ تۆمارێکی ئاڵوگۆڕی دراو تا ئێستا دەستی پێنەکردووە."}
          </div>
        ) : (
          <>
            {/* Mobile Exchanges Card List */}
            <div className="md:hidden divide-y divide-gray-100 p-1 bg-white">
              {paginatedExchanges.map((tx) => {
                const isBuy = tx.amount > 0;
                const absUSD = Math.abs(tx.amount);
                const otherAmt = Math.abs(tx.targetAmount || 0);
                const otherCurCode = tx.targetCurrency || 'IQD';

                return (
                  <div key={tx.id} className="p-4 space-y-3 hover:bg-gray-50/20 transition-colors" dir={lang === 'en' ? 'ltr' : 'rtl'}>
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-mono text-[10px] text-gray-400 font-bold">{tx.id}</span>
                      <span className="text-gray-400 font-mono text-[10px]">{formatKurdishDateTime(tx.timestamp)}</span>
                    </div>
                    <div className="flex justify-between items-end">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                            isBuy ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-blue-50 text-blue-700 border border-blue-100'
                          }`}>
                            {isBuy ? (lang === 'en' ? 'Buy USD' : lang === 'ar' ? 'شراء دولار' : 'کڕینی دۆلار') : (lang === 'en' ? 'Sell USD' : lang === 'ar' ? 'بيع دولار' : 'فرۆشتنی دۆلار')}
                          </span>
                          <span className="font-bold text-xs text-gray-800">
                            {tx.customerId === 'system-expenses' || (tx.customerName && tx.customerName.toLowerCase() === 'unknown')
                              ? (lang === 'en' ? 'Expenses' : lang === 'ar' ? 'المصاريف' : 'خەرجی')
                              : (tx.customerName || (lang === 'en' ? 'Vault' : lang === 'ar' ? 'الخزينة' : 'گەنجینە'))}
                          </span>
                        </div>
                        {selectedHistoryCurrency === 'all' && (
                          <p className="text-[10px] text-gray-400 font-mono">
                            1 USD = {tx.rate?.toLocaleString()} {otherCurCode}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        {(selectedHistoryCurrency === 'all' || selectedHistoryCurrency === 'USD') && (
                          <p className="font-mono text-xs font-black text-gray-900">
                            {formatMoney(absUSD, 'USD')}
                          </p>
                        )}
                        {(selectedHistoryCurrency === 'all' || selectedHistoryCurrency !== 'USD') && (
                          <p className="font-mono text-xs font-bold text-primary mt-0.5">
                            {formatMoney(otherAmt, otherCurCode)}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-gray-100/50 no-print">
                      <button
                        onClick={() => onPrintReceipt && onPrintReceipt('Transaction', tx)}
                        className="p-1 px-3 border border-blue-100 text-blue-600 hover:bg-blue-50 rounded-xl text-[10px] font-bold inline-flex items-center gap-1"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>{lang === 'en' ? 'Print' : lang === 'ar' ? 'طباعة' : 'پسوولە'}</span>
                      </button>
                      {canEditOrDelete && (
                        <button
                          onClick={() => startEditing(tx)}
                          className="px-2 py-1 text-[10px] font-bold text-primary bg-primary/10 rounded-md hover:bg-primary/20 transition-all flex items-center gap-1"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>{lang === 'en' ? 'Edit' : lang === 'ar' ? 'تعديل' : 'دەستکاری'}</span>
                        </button>
                      )}
                      {canEditOrDelete && onDeleteTransaction && (
                        <button
                          onClick={() => onDeleteTransaction(tx.id)}
                          className="px-2 py-1 text-[10px] font-bold text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-all flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{lang === 'en' ? 'Delete' : lang === 'ar' ? 'حذف' : 'بسرەوە'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop / Tablet Ledger View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-xs text-right text-gray-600">
              <thead className="bg-gray-50 text-gray-550 font-semibold border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-center"># ID</th>
                  <th className="px-4 py-3">{lang === 'en' ? 'Date & Time' : lang === 'ar' ? 'التاريخ والوقت' : 'بەروار و کات'}</th>
                  <th className="px-4 py-3">{lang === 'en' ? 'Source / Agent' : lang === 'ar' ? 'المصدر / الزبون' : 'سەرچاوە / بریکار'}</th>
                  <th className="px-4 py-3">{lang === 'en' ? 'Type' : lang === 'ar' ? 'العملية' : 'جۆری ئاڵوگۆڕ'}</th>
                  {(selectedHistoryCurrency === 'all' || selectedHistoryCurrency === 'USD') && (
                    <th className="px-4 py-3">{lang === 'en' ? 'USD Amount' : lang === 'ar' ? 'القيمة بالدولار' : 'بڕی دۆلار'}</th>
                  )}
                  {selectedHistoryCurrency === 'all' && (
                    <th className="px-4 py-3 text-center">{lang === 'en' ? 'Exchange Rate' : lang === 'ar' ? 'سعر الصرف' : 'نرخی گۆڕینەوە'}</th>
                  )}
                  {(selectedHistoryCurrency === 'all' || selectedHistoryCurrency !== 'USD') && (
                    <th className="px-4 py-3">
                      {selectedHistoryCurrency === 'all' 
                        ? (lang === 'en' ? 'Counter Amount' : lang === 'ar' ? 'المبلغ المستلم' : 'بڕی بەرامبەر')
                        : `${selectedHistoryCurrency} ${lang === 'en' ? 'Amount' : lang === 'ar' ? 'المبلغ' : 'بڕی دراو'}`
                      }
                    </th>
                  )}
                  <th className="px-2 py-3 text-center">{lang === 'en' ? 'Actions' : lang === 'ar' ? 'إجراءات' : 'کردارەکان'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {paginatedExchanges.map((tx) => {
                  const isBuy = tx.amount > 0;
                  const absUSD = Math.abs(tx.amount);
                  const otherAmt = Math.abs(tx.targetAmount || 0);
                  const otherCurCode = tx.targetCurrency || 'IQD';

                  return (
                    <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3.5 text-center font-mono font-bold text-gray-400">{tx.id}</td>
                      <td className="px-4 py-3.5 font-mono text-gray-500 whitespace-nowrap">{formatKurdishDateTime(tx.timestamp)}</td>
                      <td className="px-4 py-3.5 text-gray-900 font-bold">
                        {tx.customerId === 'system-expenses' || (tx.customerName && tx.customerName.toLowerCase() === 'unknown')
                          ? (lang === 'en' ? 'Expenses' : lang === 'ar' ? 'المصاريف' : 'خەرجی')
                          : (tx.customerName || (lang === 'en' ? 'Vault' : lang === 'ar' ? 'الخزينة' : 'گەنجینە'))}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold border ${
                          isBuy ? 'bg-emerald-100 text-emerald-950 border-emerald-300' : 'bg-blue-100 text-blue-950 border-blue-300'
                        }`}>
                          {isBuy ? (lang === 'en' ? 'Buy USD' : lang === 'ar' ? 'شراء دولار' : 'کڕینی دۆلار') : (lang === 'en' ? 'Sell USD' : lang === 'ar' ? 'بيع دولار' : 'فرۆشتنی دۆلار')}
                        </span>
                      </td>
                      {(selectedHistoryCurrency === 'all' || selectedHistoryCurrency === 'USD') && (
                        <td className="px-4 py-3.5 font-mono text-gray-900 font-bold whitespace-nowrap">
                          {formatMoney(absUSD, 'USD')}
                        </td>
                      )}
                      {selectedHistoryCurrency === 'all' && (
                        <td className="px-4 py-3.5 text-center font-mono text-gray-500 whitespace-nowrap">
                          1 USD = {tx.rate?.toLocaleString()} {otherCurCode}
                        </td>
                      )}
                      {(selectedHistoryCurrency === 'all' || selectedHistoryCurrency !== 'USD') && (
                        <td className="px-4 py-3.5 font-mono text-primary font-bold whitespace-nowrap">
                          {formatMoney(otherAmt, otherCurCode)}
                        </td>
                      )}
                      <td className="px-2 py-3.5 text-center no-print">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Print Action button */}
                          <button
                            onClick={() => onPrintReceipt && onPrintReceipt('Transaction', tx)}
                            title={lang === 'en' ? 'Print / Export PDF' : lang === 'ar' ? 'طباعة / تصدير PDF' : 'چاپکردنی پسوولە'}
                            className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors flex items-center justify-center"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {/* Edit Action Button */}
                          {canEditOrDelete && (
                            <button
                              onClick={() => startEditing(tx)}
                              title={lang === 'en' ? 'Edit exchange details' : lang === 'ar' ? 'تعديل تفاصيل الصرف' : 'دەستکاریکردنی مامەڵە'}
                              className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors flex items-center justify-center"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          )}

                          {/* Delete Action Button */}
                          {canEditOrDelete && onDeleteTransaction && (
                            <button
                              onClick={() => onDeleteTransaction(tx.id)}
                              title={lang === 'en' ? 'Delete and Revert Transaction' : lang === 'ar' ? 'حذف واسترجاع المعاملة' : 'سڕینەوەی ئەم پێدرایە'}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

        {/* Pagination bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 pt-4 text-xs">
            <div className="text-gray-400">
              {lang === 'en' 
                ? `Page ${currentPage} of ${totalPages}` 
                : lang === 'ar' 
                  ? `الصفحة ${currentPage} من أصل ${totalPages}` 
                  : `لاپەڕە ${currentPage} لە ${totalPages}`}
            </div>
            
            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="p-1.5 px-2.5 border border-gray-200 hover:bg-gray-50 rounded-lg transition-all disabled:opacity-40 disabled:hover:bg-white flex items-center gap-1 text-[11px] font-bold"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>{lang === 'en' ? 'Prev' : lang === 'ar' ? 'السابق' : 'پێشوو'}</span>
              </button>

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="p-1.5 px-2.5 border border-gray-200 hover:bg-gray-50 rounded-lg transition-all disabled:opacity-40 disabled:hover:bg-white flex items-center gap-1 text-[11px] font-bold"
              >
                <span>{lang === 'en' ? 'Next' : lang === 'ar' ? 'التالي' : 'دواتر'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Currency Specific Summary Panel (Shown only when a currency is selected) */}
        {selectedHistoryCurrency !== 'all' && (
          <div className="mt-6 pt-6 border-t border-gray-150 flex flex-col md:flex-row items-center justify-between gap-6 bg-gray-50/50 p-4 rounded-2xl border border-gray-100" dir={lang === 'en' ? 'ltr' : 'rtl'}>
            <div className="text-right space-y-1">
              <h4 className="text-[10px] font-bold text-primary uppercase tracking-wider">
                {lang === 'en' ? `Summary for ${selectedHistoryCurrency}` : lang === 'ar' ? `ملخص إجمالي لعملة ${selectedHistoryCurrency}` : `کورتەی کۆی گشتی بۆ دراوی ${selectedHistoryCurrency}`}
              </h4>
              <p className="text-xs text-gray-400">
                {lang === 'en' ? 'Accumulated volume for active exchange list' : lang === 'ar' ? 'الحجم الإجمالي لحركات هذه العملة المحددة' : 'کۆی گشتی جووڵەکانی گۆڕینەوەی ئەم دراوە دیاریکراوە'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full md:w-auto sm:min-w-[500px]">
              {/* Incoming (Buy) */}
              <div className="bg-emerald-50/60 border border-emerald-150/50 p-3.5 rounded-xl text-right">
                <span className="text-[10px] text-emerald-600 font-bold block mb-0.5">
                  {lang === 'en' ? 'Incoming / Bought:' : lang === 'ar' ? 'إجمالي الوارد (شراء):' : 'کۆی گشتی هاتوو (کڕین):'}
                </span>
                <span className="text-xs sm:text-sm font-black text-emerald-700 font-mono">
                  {formatMoney(selectedCurrencyIncomingSum, selectedHistoryCurrency)}
                </span>
              </div>

              {/* Outgoing (Sell) */}
              <div className="bg-rose-50/60 border border-rose-150/50 p-3.5 rounded-xl text-right">
                <span className="text-[10px] text-rose-600 font-bold block mb-0.5">
                  {lang === 'en' ? 'Outgoing / Sold:' : lang === 'ar' ? 'إجمالي الصادر (بيع):' : 'کۆی گشتی ڕۆیشتوو (فرۆشتن):'}
                </span>
                <span className="text-xs sm:text-sm font-black text-rose-700 font-mono">
                  {formatMoney(selectedCurrencyOutgoingSum, selectedHistoryCurrency)}
                </span>
              </div>

              {/* Net Flow */}
              {(() => {
                const netVal = selectedCurrencyIncomingSum - selectedCurrencyOutgoingSum;
                const isPositive = netVal >= 0;
                const netBg = isPositive ? 'bg-teal-50/60 border-teal-150/50 text-teal-850' : 'bg-red-50/60 border-red-150/50 text-red-850';
                return (
                  <div className={`border p-3.5 rounded-xl text-right ${netBg}`}>
                    <span className="text-[10px] font-bold block mb-0.5 opacity-85">
                      {lang === 'en' ? 'Net Flow:' : lang === 'ar' ? 'صافي التدفق:' : 'پوختەی گشتی حیساب:'}
                    </span>
                    <span className="text-xs sm:text-sm font-black font-mono">
                      {isPositive ? '+' : ''}{formatMoney(netVal, selectedHistoryCurrency)}
                    </span>
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>

      {/* Pop-up Overlay edit modal dialog */}
      {editingTx && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xl flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-slate-950/85 backdrop-blur-2xl backdrop-saturate-150 rounded-2xl shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.22),0_25px_60px_rgba(0,0,0,0.65)] border border-white/[0.12] w-full max-w-lg overflow-hidden flex flex-col h-auto max-h-[90vh] text-white">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-slate-950/60">
              <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Edit3 className="w-4 h-4 text-amber-400" />
                <span>
                  {lang === 'en' ? `Edit Exchange: #${editingTx.id}` : lang === 'ar' ? `تعديل الصرف: #${editingTx.id}` : `دەستکاریکردنی ئاڵوگۆڕ: ${editingTx.id}`}
                </span>
              </h2>
              <button onClick={() => setEditingTx(null)} className="text-slate-400 hover:text-white p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 overflow-y-auto space-y-4">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">{t.exchange_source}</label>
                  <SearchableCustomerSelect
                    value={editSourceType}
                    onChange={(val) => setEditSourceType(val)}
                    customers={customers}
                    placeholder={lang === 'en' ? 'Select Safe or Customer...' : lang === 'ar' ? 'اختر الخزينة أو العميل...' : 'سندوق یان کڕیار هەڵبژێرە...'}
                    includeSafeOption={true}
                    lang={lang}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">{t.action_label}</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setEditAction('BuyUSD')}
                      className={`py-1.5 px-3 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                        editAction === 'BuyUSD'
                          ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                          : 'border-white/[0.12] bg-white/[0.05] text-slate-400 hover:bg-white/[0.08]'
                      }`}
                    >
                      {t.buy_usd}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditAction('SellUSD')}
                      className={`py-1.5 px-3 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                        editAction === 'SellUSD'
                          ? 'border-rose-500 bg-rose-500/20 text-rose-400'
                          : 'border-white/[0.12] bg-white/[0.05] text-slate-400 hover:bg-white/[0.08]'
                      }`}
                    >
                      {t.sell_usd}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">{t.counter_currency}</label>
                  <select
                    value={editOtherCurrency}
                    onChange={(e) => setEditOtherCurrency(e.target.value)}
                    className="w-full bg-slate-900 border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-white focus:ring-2 focus:ring-[#1D7AFC]/30 focus:border-[#1D7AFC] outline-none font-mono"
                  >
                    {nonUSDCurrencies.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">{t.amount_usd}</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    value={formatInputValue(editUsdAmount)}
                    onChange={(e) => setEditUsdAmount(parseInputValue(e.target.value))}
                    className="w-full bg-white/[0.05] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-white focus:ring-2 focus:ring-[#1D7AFC]/30 focus:border-[#1D7AFC] outline-none font-mono text-right"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">{t.rate_label}</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    value={formatInputValue(editExchangeRate)}
                    onChange={(e) => setEditExchangeRate(parseInputValue(e.target.value))}
                    className="w-full bg-white/[0.05] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-white focus:ring-2 focus:ring-[#1D7AFC]/30 focus:border-[#1D7AFC] outline-none font-mono text-right"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">{t.notes_label}</label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full bg-white/[0.05] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-white focus:ring-2 focus:ring-[#1D7AFC]/30 focus:border-[#1D7AFC] outline-none h-16 resize-none"
                />
              </div>

              {/* Live preview calc inside modal */}
              <div className="bg-amber-500/10 border border-amber-500/20 p-3.5 rounded-xl text-xs space-y-1.5">
                <div className="flex justify-between items-center text-amber-300 font-bold">
                  <span>{lang === 'en' ? 'Calculated Value:' : lang === 'ar' ? 'القيمة المقابلة الجديدة:' : 'بڕی بەرامبەری نوێ:'}</span>
                  <span className="font-mono">
                    {( (parseFloat(editUsdAmount) || 0) * (parseFloat(editExchangeRate) || 0) ).toLocaleString()} {editOtherCurrency}
                  </span>
                </div>
                <p className="text-[10px] text-amber-400/80 leading-normal">
                  {lang === 'en' 
                    ? 'Saving will automatically withdraw the original values and apply the new balances across registers and ledger trails.'
                    : lang === 'ar'
                      ? 'الحفظ سيقوم تلقائياً بعكس وتحديث الأرصدة في الخزينة وحسابات العملاء وفق المعاملة المعدلة.'
                      : 'پاشەکەوتکردن بە شێوەیەکی ئۆتۆماتیکی داتای پێشوو حیسابەکانی گەنجینە یان بریکار پاکدەکاتەوە، و ئەم گۆڕانکارییە نوێیانە جێگیر دەکات.'}
                </p>
              </div>

              {/* Form buttons */}
              <div className="flex gap-2 justify-end border-t border-white/[0.08] pt-3">
                <button
                  type="button"
                  onClick={() => setEditingTx(null)}
                  className="px-4 py-2 border border-white/[0.12] bg-white/[0.06] hover:bg-white/[0.12] rounded-xl text-xs text-slate-200 font-medium cursor-pointer backdrop-blur-md"
                >
                  {lang === 'en' ? 'Cancel' : lang === 'ar' ? 'إلغاء' : 'پاشگەزبوونەوە'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-white font-bold rounded-xl text-xs shadow-[0_4px_20px_rgba(245,158,11,0.35)] flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{lang === 'en' ? 'Save Changes' : lang === 'ar' ? 'حفظ التغييرات' : 'پاشەکەوتکردنی گۆڕانکاری'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}
