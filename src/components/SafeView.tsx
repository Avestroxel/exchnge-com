import { useState, FormEvent, useMemo } from 'react';
import { 
  Vault, ArrowUpRight, FileText, 
  Trash2, Edit3, Search, BookOpen, AlertCircle, X, Check
} from 'lucide-react';
import { Currency, Transaction } from '../types';
import { AppState } from '../data/stateManager';
import { formatMoney, formatKurdishDateTime, formatInputValue, parseInputValue } from '../utils';
import { translations } from '../data/translations';
import GlassCard from './GlassCard';

interface SafeViewProps {
  appState: AppState;
  onModifySafe: (type: 'Deposit' | 'Withdrawal', currency: Currency, amount: number, notes: string) => void;
  onModifyCustomerBalance?: (
    customerId: string, 
    type: 'Deposit' | 'Withdrawal', 
    currency: Currency, 
    amount: number, 
    notes: string
  ) => void;
  onDeleteTransaction?: (transactionId: string) => void;
  onEditExpense?: (transactionId: string, newAmount: number, newCurrency: string, newNotes: string) => void;
  onEditVaultTransaction?: (transactionId: string, newAmount: number, newCurrency: Currency, newNotes: string) => void;
  onEditTransactionNotes?: (transactionId: string, newNotes: string) => void;
}

export default function SafeView({ 
  appState, 
  onModifyCustomerBalance,
  onDeleteTransaction,
  onEditExpense,
  onEditVaultTransaction
}: SafeViewProps) {
  const { safeBalances, transactions, settings, currencies } = appState;
  
  // Sub-tab navigation state ('ledger' = دەفتەری گەنجینە, 'expenses' = تۆمارکردنی خەرجی)
  const [activeSubTab, setActiveSubTab] = useState<'ledger' | 'expenses'>('ledger');

  // Expenses management state
  const [expAmount, setExpAmount] = useState('');
  const [expCurrency, setExpCurrency] = useState<Currency>('USD');
  const [expNotes, setExpNotes] = useState('');

  // Helper for today's YYYY-MM-DD
  const getTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const isWithinDates = (timestamp: string, start: string, end: string) => {
    if (!timestamp) return true;
    const itemDate = new Date(timestamp).getTime();
    if (start) {
      const s = new Date(start);
      s.setHours(0, 0, 0, 0);
      if (itemDate < s.getTime()) return false;
    }
    if (end) {
      const e = new Date(end);
      e.setHours(23, 59, 59, 999);
      if (itemDate > e.getTime()) return false;
    }
    return true;
  };

  // Vault Ledger filters & search
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerCurrencyFilter, setLedgerCurrencyFilter] = useState<string>('ALL');
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState<string>('ALL');
  const [ledgerStartDate, setLedgerStartDate] = useState(getTodayString());
  const [ledgerEndDate, setLedgerEndDate] = useState(getTodayString());

  // Expenses search & currency filter
  const [expenseSearch, setExpenseSearch] = useState('');
  const [expenseCurrencyFilter, setExpenseCurrencyFilter] = useState<string>('ALL');
  const [expenseStartDate, setExpenseStartDate] = useState(getTodayString());
  const [expenseEndDate, setExpenseEndDate] = useState(getTodayString());

  // Edit / Delete Modals state
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editCurrency, setEditCurrency] = useState<Currency>('USD');
  const [editNotes, setEditNotes] = useState('');

  const [deletingTxId, setDeletingTxId] = useState<string | null>(null);

  const lang = settings.language || 'ku';
  const t = translations[lang];

  // 1. FILTER CURRENCIES FOR TOP SUMMARY: Only currencies with non-zero balances
  const activeVaultCurrencies = useMemo(() => {
    return currencies.filter(cur => {
      const bal = safeBalances[cur] || 0;
      return bal !== 0;
    });
  }, [currencies, safeBalances]);

  // 2. EXPENSES ONLY LOG
  const expenseOnlyTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (t.customerId !== 'system-expenses') return false;
      if (!isWithinDates(t.timestamp, expenseStartDate, expenseEndDate)) return false;
      if (expenseCurrencyFilter !== 'ALL' && t.currency !== expenseCurrencyFilter) return false;
      if (expenseSearch.trim()) {
        const q = expenseSearch.toLowerCase().trim();
        return t.id.toLowerCase().includes(q) || 
               t.notes?.toLowerCase().includes(q) || 
               t.performedBy?.toLowerCase().includes(q);
      }
      return true;
    });
  }, [transactions, expenseCurrencyFilter, expenseSearch, expenseStartDate, expenseEndDate]);

  // 3. FULL VAULT LEDGER TRANSACTIONS
  const vaultLedgerTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (!isWithinDates(t.timestamp, ledgerStartDate, ledgerEndDate)) return false;

      // Include any transaction that was performed against the safe or represents a physical vault movement
      const isSafeParty = !t.customerId || 
        t.customerId === 'safe' || 
        t.customerId === 'system-exchange' ||
        t.customerName === 'خانەی گەنجینە' ||
        t.customerId === 'system-fast-hawala';

      let isVaultTx = false;
      if (t.type === 'Exchange') {
        // Exchange belongs in Vault Ledger ONLY if source was the Safe / Treasury
        isVaultTx = isSafeParty;
      } else if (t.type === 'FastTransfer') {
        isVaultTx = isSafeParty || t.customerId === 'system-expenses' || t.customerId === 'system-fast-hawala';
      } else if (t.type === 'StandardTransfer' || t.type === 'InternalTransfer') {
        isVaultTx = isSafeParty;
      } else {
        isVaultTx = true;
      }

      if (!isVaultTx) return false;

      // Currency Filter
      if (ledgerCurrencyFilter !== 'ALL' && t.currency !== ledgerCurrencyFilter) {
        return false;
      }

      // Type Filter
      if (ledgerTypeFilter !== 'ALL') {
        if (ledgerTypeFilter === 'EXPENSE' && t.customerId !== 'system-expenses') return false;
        if (ledgerTypeFilter === 'DEPOSIT' && (t.amount <= 0 || t.customerId === 'system-expenses')) return false;
        if (ledgerTypeFilter === 'WITHDRAWAL' && (t.amount >= 0 || t.customerId === 'system-expenses')) return false;
        if (ledgerTypeFilter === 'EXCHANGE' && t.type !== 'Exchange') return false;
        if (ledgerTypeFilter === 'FAST_TRANSFER' && t.type !== 'FastTransfer') return false;
      }

      // Search term filter
      if (ledgerSearch.trim()) {
        const query = ledgerSearch.toLowerCase().trim();
        const matchesId = t.id.toLowerCase().includes(query);
        const matchesNotes = t.notes?.toLowerCase().includes(query) || false;
        const matchesUser = t.performedBy?.toLowerCase().includes(query) || false;
        const matchesCustomer = t.customerName?.toLowerCase().includes(query) || false;
        return matchesId || matchesNotes || matchesUser || matchesCustomer;
      }

      return true;
    });
  }, [transactions, ledgerCurrencyFilter, ledgerTypeFilter, ledgerSearch, ledgerStartDate, ledgerEndDate]);

  // Record an Expense
  const handleRecordExpenseSubmit = (e: FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(expAmount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    if (onModifyCustomerBalance) {
      onModifyCustomerBalance(
        'system-expenses', 
        'Withdrawal', 
        expCurrency, 
        numAmount, 
        expNotes || (lang === 'en' ? 'Office Expense' : lang === 'ar' ? 'مصاريف المكتب' : 'خەرجی گشتی گەنجینە')
      );
    }

    setExpAmount('');
    setExpNotes('');
  };

  const handleQuickNote = (noteText: string) => {
    setExpNotes(noteText);
  };

  // Start Edit Transaction Modal
  const handleOpenEditModal = (tx: Transaction) => {
    setEditingTx(tx);
    setEditAmount(Math.abs(tx.amount).toString());
    setEditCurrency(tx.currency as Currency);
    setEditNotes(tx.notes || '');
  };

  const handleSaveEditSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!editingTx) return;

    const numAmount = parseFloat(editAmount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    if (editingTx.customerId === 'system-expenses' && onEditExpense) {
      onEditExpense(editingTx.id, numAmount, editCurrency, editNotes);
    } else if (onEditVaultTransaction) {
      onEditVaultTransaction(editingTx.id, numAmount, editCurrency, editNotes);
    }

    setEditingTx(null);
  };

  // Confirm Delete Transaction
  const handleConfirmDelete = () => {
    if (deletingTxId && onDeleteTransaction) {
      onDeleteTransaction(deletingTxId);
      setDeletingTxId(null);
    }
  };

  // Safe capacities for indicator bars
  const capacities: Record<string, number> = {
    USD: 2000000,
    IQD: 3000000000,
    IRR: 25000000000
  };

  const calculatePct = (val: number, cap: number) => {
    const pct = Math.min(100, Math.round((val / cap) * 100));
    return Math.max(0, pct);
  };

  const colors = [
    'from-blue-500 to-blue-600',
    'from-amber-500 to-amber-600',
    'from-red-500 to-red-600',
    'from-emerald-500 to-emerald-600',
    'from-purple-500 to-purple-600',
    'from-indigo-500 to-indigo-600',
  ];

  return (
    <div className={`space-y-6 animate-fade-in ${lang === 'en' ? 'text-left' : 'text-right'}`}>
      
      {/* Top Header Card */}
      <GlassCard className="p-0" contentClassName="p-5 sm:p-6 space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 view-header" data-animate="header">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white rtl:border-r-4 rtl:pr-3 ltr:border-l-4 ltr:pl-3 border-[#1D7AFC] flex items-center gap-2.5">
              <Vault className="w-6 h-6 text-[#1D7AFC]" />
              <span>{t.safe_management}</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">{t.safe_description}</p>
          </div>
        </div>

        {/* Subtabs Navigation (دەفتەری حیسابی گەنجینە & تۆمارکردنی خەرجی) */}
        <div className="flex items-center gap-2 border-t border-white/[0.08] pt-3 text-xs font-bold no-print overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveSubTab('ledger')}
            className={`px-4 py-2 rounded-xl transition-all relative flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'ledger'
                ? 'bg-[#1D7AFC] text-white shadow-[0_4px_16px_rgba(29,122,252,0.4)]'
                : 'bg-white/[0.05] text-slate-300 hover:text-white hover:bg-white/[0.1] border border-white/[0.08]'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>{lang === 'en' ? 'Vault Ledger & Reserves' : lang === 'ar' ? 'دفتر حسابات الخزينة' : 'دەفتەری حیسابی گەنجینە'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('expenses')}
            className={`px-4 py-2 rounded-xl transition-all relative flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'expenses'
                ? 'bg-[#1D7AFC] text-white shadow-[0_4px_16px_rgba(29,122,252,0.4)]'
                : 'bg-white/[0.05] text-slate-300 hover:text-white hover:bg-white/[0.1] border border-white/[0.08]'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>{lang === 'en' ? 'Office Expenses' : lang === 'ar' ? 'تسجيل المصاريف' : 'تۆمارکردنی خەرجی'}</span>
          </button>
        </div>
      </GlassCard>

      {/* SUBTAB 1: VAULT LEDGER & RESERVES (دەفتەری حیسابی گەنجینە + پاشەکەوتی دراوەکان) */}
      {activeSubTab === 'ledger' && (
        <div className="space-y-8">
          
          {/* Top: Vault Reserves (Zero balances hidden) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-gray-500 flex items-center gap-1.5">
                <Vault className="w-4 h-4 text-primary" />
                <span>
                  {lang === 'en' ? 'Vault Currency Reserves' : lang === 'ar' ? 'أرصدة الخزينة الفعلية' : 'پاشەکەوتی گەنجینەی دراوەکان'}
                </span>
              </h3>
              <span className="text-[10px] text-gray-400">
                {lang === 'en' ? 'Zero balances hidden' : lang === 'ar' ? 'تم إخفاء الرصيد الصفر' : 'دراوەکانی باڵانسی سفر شاردراونەتەوە'}
              </span>
            </div>

            {activeVaultCurrencies.length === 0 ? (
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-center py-8">
                <Vault className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-gray-600">
                  {lang === 'en' ? 'No active cash reserves in vault' : lang === 'ar' ? 'لا توجد أرصدة حالية في الخزينة' : 'هیچ دراوێک ڕەسیدی نییە لە گەنجینەدا (باڵانسی دراوەکان سفرە)'}
                </p>
                <p className="text-[11px] text-gray-400 mt-1">
                  {lang === 'en' ? 'Currencies with zero balance are automatically omitted from this summary.' : lang === 'ar' ? 'العملات ذات الرصيد الصفري مخفية تلقائياً من هذا الملخص.' : 'ئەو دراوانەی باڵانسیان سفرە بەشێوەی ئۆتۆماتیکی نیشان نادرێن.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeVaultCurrencies.map((cur, i) => {
                  const cap = capacities[cur] || 1000000;
                  const bal = safeBalances[cur] || 0;
                  const pct = calculatePct(bal, cap);
                  const colorClass = colors[i % colors.length];
                  const badgeColor = cur === 'USD' ? 'text-blue-600' : cur === 'IQD' ? 'text-amber-600' : cur === 'IRR' ? 'text-red-500' : 'text-emerald-600';

                  return (
                    <div key={cur} data-animate="card" className="bento-card stat-card transform-gpu bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                      <div className="flex justify-between items-start text-xs font-semibold">
                        <span className="text-gray-400">
                          {lang === 'en' 
                            ? `Vault Reserves (${cur})` 
                            : lang === 'ar' 
                              ? `خزينة العملة (${cur})` 
                              : `گەنجینەی دراوی (${cur})`}
                        </span>
                        <span className={`${badgeColor} font-mono font-bold bg-gray-50 px-2 py-0.5 rounded border border-gray-100`}>{cur}</span>
                      </div>
                      <div className="space-y-1">
                        <p className={`text-2xl font-black text-gray-900 font-mono tracking-tight ${lang === 'en' ? 'text-left' : 'text-right'}`}>
                          {formatMoney(bal, cur)}
                        </p>
                        <div className="flex justify-between text-[11px] text-gray-400 pt-1">
                          <span>
                            {lang === 'en' 
                              ? 'Vault Capacity:' 
                              : lang === 'ar' 
                                ? 'استيعاب وسعة الخزنة:' 
                                : 'توانای گەنجینە:'}
                          </span>
                          <span className="font-semibold font-mono">{pct}%</span>
                        </div>
                        <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className={`bg-gradient-to-l ${colorClass} h-1.5 rounded-full transition-all duration-500`} 
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bottom: Vault Ledger Table (دەفتەری حیسابی گەنجینە) */}
          <div data-animate="card" className="glass-card bento-card transform-gpu bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden space-y-4">
            
            {/* Header & Filter Controls */}
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-xl text-primary">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">
                    {lang === 'en' ? 'Vault & Treasury Ledger' : lang === 'ar' ? 'دفتر حسابات الخزينة والمؤشرات' : 'دەفتەری حیسابی گەنجینە'}
                  </h3>
                </div>
              </div>

              {/* Search and Filters */}
              <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto" dir={lang === 'en' ? 'ltr' : 'rtl'}>
                {/* Date Filter Bar */}
                <div className="flex items-center gap-1.5 bg-gray-50 p-1 rounded-xl border border-gray-200 text-xs">
                  <span className="font-bold text-gray-500 text-[11px]">{lang === 'en' ? 'From:' : lang === 'ar' ? 'من:' : 'لە:'}</span>
                  <input
                    type="date"
                    value={ledgerStartDate}
                    onChange={(e) => setLedgerStartDate(e.target.value)}
                    className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs font-mono font-bold text-gray-800 outline-none focus:ring-1 focus:ring-primary"
                  />
                  <span className="font-bold text-gray-500 text-[11px]">{lang === 'en' ? 'To:' : lang === 'ar' ? 'إلى:' : 'بۆ:'}</span>
                  <input
                    type="date"
                    value={ledgerEndDate}
                    onChange={(e) => setLedgerEndDate(e.target.value)}
                    className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs font-mono font-bold text-gray-800 outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={() => { setLedgerStartDate(getTodayString()); setLedgerEndDate(getTodayString()); }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      ledgerStartDate === getTodayString() && ledgerEndDate === getTodayString()
                        ? 'bg-primary text-white shadow-xs'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {lang === 'en' ? 'Today' : lang === 'ar' ? 'اليوم' : 'ئەمڕۆ'}
                  </button>

                </div>

                {/* Search Input */}
                <div className="relative flex-1 sm:w-52">
                  <Search className="w-3.5 h-3.5 absolute right-3 top-2.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder={lang === 'en' ? 'Search vault log...' : lang === 'ar' ? 'البحث في سجل الخزينة...' : 'گەڕان لە دەفتەری گەنجینە...'}
                    value={ledgerSearch}
                    onChange={(e) => setLedgerSearch(e.target.value)}
                    className="w-full pl-3 pr-8 py-1.5 text-xs border border-gray-200 rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none bg-white"
                  />
                </div>

                {/* Currency Filter */}
                <select
                  value={ledgerCurrencyFilter}
                  onChange={(e) => setLedgerCurrencyFilter(e.target.value)}
                  className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs text-gray-700 bg-white focus:ring-1 focus:ring-primary focus:border-primary outline-none font-semibold cursor-pointer"
                >
                  <option value="ALL">{lang === 'en' ? 'All Currencies' : lang === 'ar' ? 'جميع العملات' : 'هەموو دراوەکان'}</option>
                  {currencies.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>

                {/* Type Filter */}
                <select
                  value={ledgerTypeFilter}
                  onChange={(e) => setLedgerTypeFilter(e.target.value)}
                  className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs text-gray-700 bg-white focus:ring-1 focus:ring-primary focus:border-primary outline-none font-semibold cursor-pointer"
                >
                  <option value="ALL">{lang === 'en' ? 'All Types' : lang === 'ar' ? 'جميع الحركات' : 'تەواوی مامەڵەکان'}</option>
                  <option value="DEPOSIT">{lang === 'en' ? 'Deposits (+)' : lang === 'ar' ? 'الإيداعات (+)' : 'هێنانەژوورەوە (+)'}</option>
                  <option value="WITHDRAWAL">{lang === 'en' ? 'Withdrawals (-)' : lang === 'ar' ? 'السحوبات (-)' : 'بردنەدەرەوە (-)'}</option>
                  <option value="EXPENSE">{lang === 'en' ? 'Expenses' : lang === 'ar' ? 'المصاريف' : 'خەرجییەکان'}</option>
                  <option value="EXCHANGE">{lang === 'en' ? 'Exchanges' : lang === 'ar' ? 'تصريف العملات' : 'گۆڕینەوەی دراو'}</option>
                  <option value="FAST_TRANSFER">{lang === 'en' ? 'Fast Transfers' : lang === 'ar' ? 'الحوالات السريعة' : 'حەواڵەی خێرا'}</option>
                </select>
              </div>
            </div>

            {/* Mobile View */}
            <div className="md:hidden divide-y divide-gray-100 p-2 bg-white">
              {vaultLedgerTransactions.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-xs">
                  {lang === 'en' ? 'No vault transactions matching filter' : lang === 'ar' ? 'لم يتم العثور على أي حركات في الخزينة' : 'هیچ مامەڵەیەک لە دەفتەری گەنجینەدا نەدۆزرایەوە'}
                </div>
              ) : (
                vaultLedgerTransactions.map((tx) => {
                  const isNegative = tx.amount < 0;
                  const isExpense = tx.customerId === 'system-expenses';

                  let typeLabel = '';
                  let badgeStyle = '';

                  if (isExpense) {
                    typeLabel = lang === 'en' ? 'Office Expense' : lang === 'ar' ? 'مصروف مكتب' : 'خەرجی نووسینگە';
                    badgeStyle = 'bg-rose-100 text-rose-950 border-rose-300 font-bold';
                  } else if (tx.type === 'Exchange') {
                    typeLabel = lang === 'en' ? 'Currency Exchange' : lang === 'ar' ? 'صرف عملات' : 'گۆڕینەوەی دراو';
                    badgeStyle = 'bg-blue-100 text-blue-950 border-blue-300 font-bold';
                  } else if (tx.type === 'FastTransfer') {
                    typeLabel = lang === 'en' ? 'Fast Transfer' : lang === 'ar' ? 'حوالة سريعة' : 'حەواڵەی خێرا';
                    badgeStyle = 'bg-purple-100 text-purple-950 border-purple-300 font-bold';
                  } else {
                    typeLabel = tx.amount > 0 ? (lang === 'en' ? 'Vault Deposit' : lang === 'ar' ? 'إيداع بالخزينة' : 'گەنجینە: هێنانەژوورەوە') : (lang === 'en' ? 'Vault Withdrawal' : lang === 'ar' ? 'سحب من الخزينة' : 'گەنجینە: بردنەدەرەوە');
                    badgeStyle = tx.amount > 0 ? 'bg-emerald-100 text-emerald-950 border-emerald-300 font-bold' : 'bg-amber-100 text-amber-950 border-amber-300 font-bold';
                  }

                  return (
                    <div key={tx.id} data-animate="row" className="list-item-row p-3.5 space-y-2 hover:bg-gray-50/50 transition-colors">
                      <div className="flex justify-between items-center text-[10px] text-gray-400">
                        <span className="font-mono font-semibold text-primary">{tx.id}</span>
                        <span className="font-mono">{formatKurdishDateTime(tx.timestamp)}</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${badgeStyle}`}>
                            {typeLabel}
                          </span>
                          <span className="text-xs font-bold text-gray-900 font-mono bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                            {tx.currency}
                          </span>
                        </div>
                        <div className={`font-mono text-sm font-black ${isNegative ? 'text-red-600' : 'text-emerald-700'}`}>
                          {tx.amount > 0 ? '+' : ''}{formatMoney(tx.amount, tx.currency)}
                        </div>
                      </div>

                      {tx.notes && (
                        <p className="text-[11px] text-gray-600 bg-gray-50 p-2 rounded-lg border border-gray-100">
                          {tx.notes}
                        </p>
                      )}

                      <div className="flex justify-between items-center pt-1 text-[10px] text-gray-400">
                        <span>{lang === 'en' ? 'By:' : lang === 'ar' ? 'بواسطة:' : 'ئەنجامدەر:'} <strong className="text-gray-700">{tx.performedBy}</strong></span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(tx)}
                            className="px-2 py-1 text-[10px] font-bold text-primary bg-primary/10 rounded-md hover:bg-primary/20 transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>{lang === 'en' ? 'Edit' : lang === 'ar' ? 'تعديل' : 'دەستکاری'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingTxId(tx.id)}
                            className="px-2 py-1 text-[10px] font-bold text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>{lang === 'en' ? 'Delete' : lang === 'ar' ? 'حذف' : 'ڕەشکردنەوە'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop / Tablet Full Vault Ledger Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-gray-50 text-gray-500 font-bold border-y border-gray-100">
                  <tr>
                    <th className="px-5 py-3">{t.date_label}</th>
                    <th className="px-5 py-3">ID</th>
                    <th className="px-5 py-3">{t.action_label}</th>
                    <th className="px-5 py-3">{t.currency_label}</th>
                    <th className="px-5 py-3 text-left">{t.amount_label}</th>
                    <th className="px-5 py-3">{t.operator_label}</th>
                    <th className="px-5 py-3">{t.notes_label}</th>
                    <th className="px-5 py-3 text-center">{lang === 'en' ? 'Actions' : lang === 'ar' ? 'الإجراءات' : 'کردارەکان'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700 font-medium">
                  {vaultLedgerTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-10 text-gray-400 text-xs">
                        {lang === 'en' ? 'No vault transactions found' : lang === 'ar' ? 'لم يتم تسجيل أي معاملات في الخزينة' : 'هیچ مامەڵەیەک لە دەفتەری گەنجینەدا تۆمار نەکراوە'}
                      </td>
                    </tr>
                  ) : (
                    vaultLedgerTransactions.map((tx) => {
                      const isNegative = tx.amount < 0;
                      const isExpense = tx.customerId === 'system-expenses';

                      let typeLabel = '';
                      let badgeStyle = '';

                      if (isExpense) {
                        typeLabel = lang === 'en' ? 'Office Expense' : lang === 'ar' ? 'مصروف مكتب' : 'خەرجی نووسینگە';
                        badgeStyle = 'bg-rose-100 text-rose-950 border-rose-300 font-bold';
                      } else if (tx.type === 'Exchange') {
                        typeLabel = lang === 'en' ? 'Currency Exchange' : lang === 'ar' ? 'صرف عملات' : 'گۆڕینەوەی دراو';
                        badgeStyle = 'bg-blue-100 text-blue-950 border-blue-300 font-bold';
                      } else if (tx.type === 'FastTransfer') {
                        typeLabel = lang === 'en' ? 'Fast Transfer' : lang === 'ar' ? 'حوالة سريعة' : 'حەواڵەی خێرا';
                        badgeStyle = 'bg-purple-100 text-purple-950 border-purple-300 font-bold';
                      } else {
                        typeLabel = tx.amount > 0 ? (lang === 'en' ? 'Vault Deposit' : lang === 'ar' ? 'إيداع بالخزينة' : 'گەنجینە: هێنانەژوورەوە') : (lang === 'en' ? 'Vault Withdrawal' : lang === 'ar' ? 'سحب من الخزينة' : 'گەنجینە: بردنەدەرەوە');
                        badgeStyle = tx.amount > 0 ? 'bg-emerald-100 text-emerald-950 border-emerald-300 font-bold' : 'bg-amber-100 text-amber-950 border-amber-300 font-bold';
                      }

                      return (
                        <tr key={tx.id} className="hover:bg-gray-50/60 transition-colors">
                          <td className="px-5 py-3.5 font-mono text-gray-400 text-[11px]">
                            {formatKurdishDateTime(tx.timestamp)}
                          </td>
                          <td className="px-5 py-3.5 font-mono text-primary font-bold text-[11px]">
                            {tx.id}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold border ${badgeStyle}`}>
                              {typeLabel}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 font-extrabold text-gray-900">{tx.currency}</td>
                          <td className={`px-5 py-3.5 font-mono font-bold text-left text-sm ${isNegative ? 'text-red-600' : 'text-emerald-700'}`}>
                            {tx.amount > 0 ? '+' : ''}{formatMoney(tx.amount, tx.currency)}
                          </td>
                          <td className="px-5 py-3.5 text-gray-600 text-xs font-semibold">{tx.performedBy}</td>
                          <td className="px-5 py-3.5 text-gray-500 text-xs max-w-xs truncate" title={tx.notes}>
                            {tx.notes || '-'}
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(tx)}
                                className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer"
                                title={lang === 'en' ? 'Edit Transaction' : lang === 'ar' ? 'تعديل المعاملة' : 'دەستکاریکردنی مامەڵە'}
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingTxId(tx.id)}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                title={lang === 'en' ? 'Delete Transaction' : lang === 'ar' ? 'حذف المعاملة' : 'ڕەشکردنەوەی مامەڵە'}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: RECORD EXPENSES & EXPENSES LOG (تۆمارکردنی خەرجی نوێ + تۆماری خەرجییەکانی نووسینگە) */}
      {activeSubTab === 'expenses' && (
        <div className="space-y-8">
          
          {/* Top: Form to record expense */}
          <div data-animate="card" className="bento-card transform-gpu bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-5">
            <div className="flex items-center gap-2 border-b border-gray-50 pb-3">
              <div className="p-2 bg-red-50 rounded-xl">
                <ArrowUpRight className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">
                  {lang === 'en' ? 'Record Office Expense' : lang === 'ar' ? 'تسجيل مصروف جديد' : 'تۆمارکردنی خەرجی نوێ'}
                </h3>
                <p className="text-[11px] text-gray-400">
                  {lang === 'en' ? 'Deducts from safe and records to expenses' : lang === 'ar' ? 'يتم الخصم مباشرة من رصيد الخزينة ويقيد في حساب المصاريف' : 'ڕاستەوخۆ لە نەختینەی گەنجینە کەم دەبێتەوە و لەسەر هەژماری خەرجییەکان تۆمار دەبێت'}
                </p>
              </div>
            </div>

            <form onSubmit={handleRecordExpenseSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">{t.currency_label}</label>
                  <select
                    value={expCurrency}
                    onChange={(e) => setExpCurrency(e.target.value as Currency)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                  >
                    {currencies.map(cur => (
                      <option key={cur} value={cur}>{cur}</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-1 md:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">{t.amount_label}</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    placeholder="250"
                    value={formatInputValue(expAmount)}
                    onChange={(e) => setExpAmount(parseInputValue(e.target.value))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">{t.notes_label}</label>
                <textarea
                  placeholder={lang === 'en' ? 'e.g., Office Rent, Electricity...' : lang === 'ar' ? 'مثال: إيجار المكتب، شاي وقهوة...' : 'بۆ نموونە: کرێی نووسینگە، چا و قاوە...'}
                  value={expNotes}
                  onChange={(e) => setExpNotes(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none h-20 resize-none"
                  required
                />
              </div>

              <div>
                <span className="block text-[10px] font-black text-gray-400 mb-1.5">
                  {lang === 'en' ? 'Quick Templates:' : lang === 'ar' ? 'نماذج سريعة:' : 'تێبینی خێرا:'}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    lang === 'en' ? 'Office Rent' : lang === 'ar' ? 'إيجار المكتب' : 'کرێی نووسینگە',
                    lang === 'en' ? 'Electricity' : lang === 'ar' ? 'أجور الكهرباء' : 'پارەی کارەبا',
                    lang === 'en' ? 'Generator' : lang === 'ar' ? 'أجور المولد' : 'پارەی مۆلیدە',
                    lang === 'en' ? 'Internet' : lang === 'ar' ? 'اشتراك الإنترنت' : 'پارەی ئینتەرنێت',
                    lang === 'en' ? 'Tea & Coffee' : lang === 'ar' ? 'شاي وقهوة وضيافة' : 'خەرجی چا و قاوە',
                    lang === 'en' ? 'Salaries' : lang === 'ar' ? 'رواتب الموظفين' : 'مووچەی کارمەندان'
                  ].map(note => (
                    <button
                      key={note}
                      type="button"
                      onClick={() => handleQuickNote(note)}
                      className="px-2.5 py-1 text-[10px] font-bold bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-lg border border-gray-200/60 transition-all cursor-pointer"
                    >
                      {note}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="px-6 py-2.5 text-xs font-black text-white bg-red-600 hover:bg-red-700 shadow-md shadow-red-200/50 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  <span>{lang === 'en' ? 'Record Expense' : lang === 'ar' ? 'تسجيل المصروف' : 'تۆمارکردنی خەرجی'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Bottom: Office Expenses Log */}
          <div data-animate="card" className="bento-card transform-gpu bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden space-y-4">
            
            {/* Header & Controls */}
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-red-50 rounded-xl text-red-600">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">
                    {lang === 'en' ? 'Office Expenses Log' : lang === 'ar' ? 'سجل المصاريف الرسمية' : 'تۆماری خەرجییەکانی نووسینگە'}
                  </h3>
                  <p className="text-[11px] text-gray-400">
                    {lang === 'en' ? 'History of all recorded expenses' : lang === 'ar' ? 'سجل كامل لمصاريف الخزينة مع إمكانية التعديل والحذف' : 'تەواوی تۆماری خەرجییەکانی گەنجینە لەگەڵ توانای دەستکاریکردن و سڕینەوە'}
                  </p>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto" dir={lang === 'en' ? 'ltr' : 'rtl'}>
                {/* Date Filter Bar */}
                <div className="flex items-center gap-1.5 bg-gray-50 p-1 rounded-xl border border-gray-200 text-xs">
                  <span className="font-bold text-gray-500 text-[11px]">{lang === 'en' ? 'From:' : lang === 'ar' ? 'من:' : 'لە:'}</span>
                  <input
                    type="date"
                    value={expenseStartDate}
                    onChange={(e) => setExpenseStartDate(e.target.value)}
                    className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs font-mono font-bold text-gray-800 outline-none focus:ring-1 focus:ring-primary"
                  />
                  <span className="font-bold text-gray-500 text-[11px]">{lang === 'en' ? 'To:' : lang === 'ar' ? 'إلى:' : 'بۆ:'}</span>
                  <input
                    type="date"
                    value={expenseEndDate}
                    onChange={(e) => setExpenseEndDate(e.target.value)}
                    className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs font-mono font-bold text-gray-800 outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={() => { setExpenseStartDate(getTodayString()); setExpenseEndDate(getTodayString()); }}
                    className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      expenseStartDate === getTodayString() && expenseEndDate === getTodayString()
                        ? 'bg-primary text-white shadow-xs'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {lang === 'en' ? 'Today' : lang === 'ar' ? 'اليوم' : 'ئەمڕۆ'}
                  </button>
                  {(expenseStartDate || expenseEndDate) && (
                    <button
                      type="button"
                      onClick={() => { setExpenseStartDate(''); setExpenseEndDate(''); }}
                      className="px-2 py-1 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                    >
                      {lang === 'en' ? 'All' : lang === 'ar' ? 'الكل' : 'هەموو'}
                    </button>
                  )}
                </div>

                <div className="relative flex-1 sm:w-48">
                  <Search className="w-3.5 h-3.5 absolute right-3 top-2.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder={lang === 'en' ? 'Search expenses...' : lang === 'ar' ? 'البحث في المصاريف...' : 'گەڕان لە خەرجییەکان...'}
                    value={expenseSearch}
                    onChange={(e) => setExpenseSearch(e.target.value)}
                    className="w-full pl-3 pr-8 py-1.5 text-xs border border-gray-200 rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none bg-white"
                  />
                </div>

                <select
                  value={expenseCurrencyFilter}
                  onChange={(e) => setExpenseCurrencyFilter(e.target.value)}
                  className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs text-gray-700 bg-white focus:ring-1 focus:ring-primary focus:border-primary outline-none font-semibold cursor-pointer"
                >
                  <option value="ALL">{lang === 'en' ? 'All Currencies' : lang === 'ar' ? 'جميع العملات' : 'هەموو دراوەکان'}</option>
                  {currencies.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Mobile View */}
            <div className="md:hidden divide-y divide-gray-100 p-2 bg-white">
              {expenseOnlyTransactions.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-xs">
                  {lang === 'en' ? 'No expense records found' : lang === 'ar' ? 'لا توجد سجلات مصاريف' : 'هیچ تۆمارێکی خەرجی نییە'}
                </div>
              ) : (
                expenseOnlyTransactions.map((tx) => (
                  <div key={tx.id} data-animate="row" className="list-item-row p-3.5 space-y-2 hover:bg-gray-50/50 transition-colors">
                    <div className="flex justify-between items-center text-[10px] text-gray-400">
                      <span className="font-mono font-semibold text-red-600">{tx.id}</span>
                      <span className="font-mono">{formatKurdishDateTime(tx.timestamp)}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-gray-900 font-mono bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                        {tx.currency}
                      </span>
                      <div className="font-mono text-sm font-black text-red-600">
                        -{formatMoney(Math.abs(tx.amount), tx.currency)}
                      </div>
                    </div>

                    {tx.notes && (
                      <p className="text-[11px] text-gray-600 bg-gray-50 p-2 rounded-lg border border-gray-100">
                        {tx.notes}
                      </p>
                    )}

                    <div className="flex justify-between items-center pt-1 text-[10px] text-gray-400">
                      <span>{lang === 'en' ? 'By:' : lang === 'ar' ? 'بواسطة:' : 'ئەنجامدەر:'} <strong className="text-gray-700">{tx.performedBy}</strong></span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(tx)}
                          className="px-2 py-1 text-[10px] font-bold text-primary bg-primary/10 rounded-md hover:bg-primary/20 transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>{lang === 'en' ? 'Edit' : lang === 'ar' ? 'تعديل' : 'دەستکاری'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingTxId(tx.id)}
                          className="px-2 py-1 text-[10px] font-bold text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>{lang === 'en' ? 'Delete' : lang === 'ar' ? 'حذف' : 'ڕەشکردنەوە'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-gray-50 text-gray-500 font-bold border-y border-gray-100">
                  <tr>
                    <th className="px-5 py-3">{t.date_label}</th>
                    <th className="px-5 py-3">ID</th>
                    <th className="px-5 py-3">{t.currency_label}</th>
                    <th className="px-5 py-3 text-left">{t.amount_label}</th>
                    <th className="px-5 py-3">{t.operator_label}</th>
                    <th className="px-5 py-3">{t.notes_label}</th>
                    <th className="px-5 py-3 text-center">{lang === 'en' ? 'Action' : lang === 'ar' ? 'الإجراء' : 'کردار'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700 font-medium">
                  {expenseOnlyTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-gray-400 text-xs">
                        {lang === 'en' ? 'No expense records found' : lang === 'ar' ? 'لا توجد أي مصاريف مسجلة في النظام' : 'هیچ تۆمارێکی خەرجی لە سیستەمدا نییە'}
                      </td>
                    </tr>
                  ) : (
                    expenseOnlyTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-5 py-3.5 font-mono text-gray-400 text-[11px]">
                          {formatKurdishDateTime(tx.timestamp)}
                        </td>
                        <td className="px-5 py-3.5 font-mono text-red-600 font-bold text-[11px]">
                          {tx.id}
                        </td>
                        <td className="px-5 py-3.5 font-extrabold text-gray-900">{tx.currency}</td>
                        <td className="px-5 py-3.5 font-mono font-bold text-left text-sm text-red-600">
                          -{formatMoney(Math.abs(tx.amount), tx.currency)}
                        </td>
                        <td className="px-5 py-3.5 text-gray-600 text-xs font-semibold">{tx.performedBy}</td>
                        <td className="px-5 py-3.5 text-gray-500 text-xs max-w-xs truncate" title={tx.notes}>
                          {tx.notes || '-'}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(tx)}
                              className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer"
                              title={lang === 'en' ? 'Edit' : lang === 'ar' ? 'تعديل' : 'دەستکاریکردن'}
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingTxId(tx.id)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title={lang === 'en' ? 'Delete' : lang === 'ar' ? 'حذف' : 'ڕەشکردنەوە'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

          </div>

        </div>
      )}

      {/* EDIT VAULT TRANSACTION MODAL */}
      {editingTx && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xl z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-950/85 backdrop-blur-2xl backdrop-saturate-150 rounded-2xl max-w-md w-full p-6 shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.22),0_25px_60px_rgba(0,0,0,0.65)] border border-white/[0.12] space-y-5 animate-scale-up text-white">
            <div className="flex justify-between items-center border-b border-white/[0.08] pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-[#1D7AFC]" />
                <span>{lang === 'en' ? 'Edit Vault Transaction' : lang === 'ar' ? 'تعديل حركة الخزينة' : 'دەستکاریکردنی مامەڵەی گەنجینە'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingTx(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditSubmit} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-slate-300 mb-1">{t.currency_label}</label>
                  <select
                    value={editCurrency}
                    onChange={(e) => setEditCurrency(e.target.value as Currency)}
                    className="w-full bg-slate-900 border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-white focus:ring-2 focus:ring-[#1D7AFC]/30 focus:border-[#1D7AFC] outline-none cursor-pointer"
                  >
                    {currencies.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-300 mb-1">{t.amount_label}</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    value={formatInputValue(editAmount)}
                    onChange={(e) => setEditAmount(parseInputValue(e.target.value))}
                    className="w-full bg-white/[0.05] border border-white/[0.12] rounded-xl px-3.5 py-2 text-xs text-white focus:ring-2 focus:ring-[#1D7AFC]/30 focus:border-[#1D7AFC] outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">{t.notes_label}</label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full bg-white/[0.05] border border-white/[0.12] rounded-xl px-3.5 py-2 text-xs text-white focus:ring-2 focus:ring-[#1D7AFC]/30 focus:border-[#1D7AFC] outline-none h-20 resize-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setEditingTx(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-300 hover:bg-white/[0.08] border border-white/[0.12] rounded-xl transition-all cursor-pointer backdrop-blur-md"
                >
                  {lang === 'en' ? 'Cancel' : lang === 'ar' ? 'إلغاء' : 'پاشگەزبوونەوە'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-[#1D7AFC] hover:bg-blue-500 shadow-[0_4px_20px_rgba(29,122,252,0.4)] rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{lang === 'en' ? 'Save Changes' : lang === 'ar' ? 'حفظ التغييرات' : 'پاشەکەوتکردنی گۆڕانکاری'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE VAULT TRANSACTION CONFIRMATION MODAL */}
      {deletingTxId && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xl z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-950/85 backdrop-blur-2xl backdrop-saturate-150 rounded-2xl max-w-sm w-full p-6 shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.22),0_25px_60px_rgba(0,0,0,0.65)] border border-white/[0.12] space-y-4 text-center animate-scale-up text-white">
            <div className="p-3 bg-rose-500/15 border border-rose-500/20 text-rose-400 rounded-2xl w-12 h-12 mx-auto flex items-center justify-center">
              <AlertCircle className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {lang === 'en' ? 'Delete Vault Transaction?' : lang === 'ar' ? 'هل أنت متأكد من حذف حركة الخزينة؟' : 'دڵنیایت لە ڕەشکردنەوەی مامەڵەی گەنجینە؟'}
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                {lang === 'en' 
                  ? 'Deleting this transaction will automatically adjust and restore the vault cash balances.' 
                  : lang === 'ar'
                    ? 'حذف هذه المعاملة سيعيد ضبط وتحديث رصيد الخزينة تلقائياً إلى حالته السابقة.'
                    : 'ڕەشکردنەوەی ئەم مامەڵەیە ڕاسپاردە و پاشەکەوتی نەختینەی گەنجینەکە بۆ باری پێشوو دەگەڕێنێتەوە.'}
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={() => setDeletingTxId(null)}
                className="w-1/2 py-2 text-xs font-bold text-slate-200 bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.12] rounded-xl transition-all cursor-pointer backdrop-blur-md"
              >
                {lang === 'en' ? 'Cancel' : lang === 'ar' ? 'إلغاء' : 'پاشگەزبوونەوە'}
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="w-1/2 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 shadow-[0_4px_20px_rgba(225,29,72,0.4)] rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{lang === 'en' ? 'Delete' : lang === 'ar' ? 'حذف' : 'ڕەشکردنەوە'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
