import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, Award, Wallet, Users, Sparkles, Printer, 
  ArrowLeftRight, FileText, Search, BookOpen, DollarSign, Trash2,
  X, Calendar, ArrowDownRight, ArrowUpRight, Eye, RotateCcw,
  ChevronDown, Filter, Pencil, Ban, AlertCircle, Undo2
} from 'lucide-react';
import { Customer, Transaction, FastTransferDetails, StandardTransferDetails } from '../types';
import { AppState } from '../data/stateManager';
import { formatMoney, formatKurdishDateTime, deduplicateTransactions, formatInputValue, parseInputValue } from '../utils';
import { translations } from '../data/translations';
import SearchableCustomerSelect from './SearchableCustomerSelect';
import GlassCard from './GlassCard';

interface ReportsViewProps {
  appState: AppState;
  onDeleteTransaction?: (transactionId: string) => void;
  onEditExpense?: (transactionId: string, newAmount: number, newCurrency: string, newNotes: string) => void;
  onDeleteFastTransfer?: (transferId: string) => void;
  onDeleteStandardTransfer?: (transferId: string) => void;
  onEditFastTransfer?: (transferId: string, updatedData: any) => void;
  onEditStandardTransfer?: (transferId: string, updatedData: any) => void;
  onPrintReceipt?: (type: 'Fast' | 'Standard' | 'Exchange' | 'Deposit' | 'Withdrawal', data: any) => void;
}

type ReportTab = 'summary' | 'customers' | 'transfers' | 'exchanges' | 'safe' | 'expenses';

export default function ReportsView({ 
  appState, 
  onDeleteTransaction, 
  onEditExpense,
  onDeleteFastTransfer,
  onDeleteStandardTransfer,
  onEditFastTransfer,
  onEditStandardTransfer,
  onPrintReceipt
}: ReportsViewProps) {
  const { 
    customers, 
    transactions, 
    standardTransfers, 
    fastTransfers = [], // safeguard default empty
    settings, 
    currencies,
    safeBalances = {}
  } = appState;

  const lang = settings.language || 'ku';
  const t = translations[lang];

  const [activeTab, setActiveTab] = useState<ReportTab>('summary');
  const [customerSubTab, setCustomerSubTab] = useState<'balances' | 'internal_transfers'>('balances');
  const [transferSubTab, setTransferSubTab] = useState<'transfers' | 'cancelled'>('transfers');
  const [customerSearch, setCustomerSearch] = useState('');
  const [transferSearch, setTransferSearch] = useState('');
  const [cancelledTransferSearch, setCancelledTransferSearch] = useState('');
  const [exchangeSearch, setExchangeSearch] = useState('');
  const [exchangeCurrencyFilter, setExchangeCurrencyFilter] = useState('all');
  const [safeSearch, setSafeSearch] = useState('');
  const [safeFilterType, setSafeFilterType] = useState('all');
  const [safeCurrencyFilter, setSafeCurrencyFilter] = useState('all');
  const [expenseSearch, setExpenseSearch] = useState('');
  const [expenseCurrencyFilter, setExpenseCurrencyFilter] = useState('all');

  // Edit Expense modal state
  const [editingExpense, setEditingExpense] = useState<Transaction | null>(null);
  const [editExpenseAmount, setEditExpenseAmount] = useState('');
  const [editExpenseCurrency, setEditExpenseCurrency] = useState('USD');
  const [editExpenseNotes, setEditExpenseNotes] = useState('');

  const handleStartEditExpense = (tx: Transaction) => {
    setEditingExpense(tx);
    setEditExpenseAmount(Math.abs(tx.amount).toString());
    setEditExpenseCurrency(tx.currency);
    setEditExpenseNotes(tx.notes || '');
  };

  const handleSaveExpenseEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense) return;
    const numAmt = parseFloat(editExpenseAmount);
    if (isNaN(numAmt) || numAmt <= 0) return;

    if (onEditExpense) {
      onEditExpense(editingExpense.id, numAmt, editExpenseCurrency, editExpenseNotes);
    }
    setEditingExpense(null);
  };

  const nonSystemCustomers = useMemo(() => {
    return customers.filter(c => 
      c.id !== 'system-expenses' && 
      c.id !== 'system-exchange' && 
      c.id !== 'system-transfer-fee' && 
      c.id !== 'system-profit' &&
      c.id !== 'system-fast-hawala'
    );
  }, [customers]);

  // Edit Fast Transfer modal state
  const [fastTransferToEdit, setFastTransferToEdit] = useState<FastTransferDetails | null>(null);
  const [editFastSenderId, setEditFastSenderId] = useState('');
  const [editFastRecName, setEditFastRecName] = useState('');
  const [editFastRecPhone, setEditFastRecPhone] = useState('');
  const [editFastAmount, setEditFastAmount] = useState('');
  const [editFastCurrency, setEditFastCurrency] = useState('USD');
  const [editFastFee, setEditFastFee] = useState('');
  const [editFastNotes, setEditFastNotes] = useState('');

  const handleOpenEditFast = (ft: FastTransferDetails) => {
    setFastTransferToEdit(ft);
    setEditFastSenderId(ft.senderId);
    setEditFastRecName(ft.receiverName);
    setEditFastRecPhone(ft.receiverPhone || '');
    setEditFastAmount(String(ft.amount));
    setEditFastCurrency(ft.currency || 'USD');
    setEditFastFee(String(ft.fee || 0));
    setEditFastNotes(ft.notes || '');
  };

  const handleSaveEditFast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fastTransferToEdit || !onEditFastTransfer) return;
    const amountNum = Number(parseInputValue(editFastAmount)) || 0;
    const feeNum = Number(parseInputValue(editFastFee)) || 0;
    if (!editFastSenderId || !editFastRecName || amountNum <= 0) return;

    onEditFastTransfer(fastTransferToEdit.id, {
      senderId: editFastSenderId,
      receiverName: editFastRecName,
      receiverPhone: editFastRecPhone,
      amount: amountNum,
      currency: editFastCurrency,
      fee: feeNum,
      notes: editFastNotes
    });
    setFastTransferToEdit(null);
  };

  // Edit Standard Transfer modal state
  const [standardTransferToEdit, setStandardTransferToEdit] = useState<StandardTransferDetails | null>(null);
  const [editStdSenderId, setEditStdSenderId] = useState('');
  const [editStdReceiverId, setEditStdReceiverId] = useState('');
  const [editStdBeneficiaryName, setEditStdBeneficiaryName] = useState('');
  const [editStdDeliveryLocation, setEditStdDeliveryLocation] = useState('');
  const [editStdAmountUSD, setEditStdAmountUSD] = useState('');
  const [editStdBuyRate, setEditStdBuyRate] = useState('');
  const [editStdSellRate, setEditStdSellRate] = useState('');
  const [editStdNotes, setEditStdNotes] = useState('');
  const [editStdCurrency, setEditStdCurrency] = useState('USD');

  const handleOpenEditStandard = (st: StandardTransferDetails) => {
    setStandardTransferToEdit(st);
    setEditStdSenderId(st.senderId);
    setEditStdReceiverId(st.receiverId);
    setEditStdBeneficiaryName(st.beneficiaryName || '');
    setEditStdDeliveryLocation(st.deliveryLocation || '');
    setEditStdAmountUSD(String(st.amountUSD));
    setEditStdBuyRate(String(st.buyRate));
    setEditStdSellRate(String(st.sellRate));
    setEditStdNotes(st.notes || '');
    setEditStdCurrency(st.currency || 'USD');
  };

  const handleSaveEditStandard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!standardTransferToEdit || !onEditStandardTransfer) return;
    const amountNum = Number(parseInputValue(editStdAmountUSD)) || 0;
    const buyNum = Number(parseInputValue(editStdBuyRate)) || 0;
    const sellNum = Number(parseInputValue(editStdSellRate)) || 0;
    if (!editStdSenderId || !editStdReceiverId || amountNum <= 0) return;

    onEditStandardTransfer(standardTransferToEdit.id, {
      senderId: editStdSenderId,
      receiverId: editStdReceiverId,
      beneficiaryName: editStdBeneficiaryName,
      deliveryLocation: editStdDeliveryLocation,
      amountUSD: amountNum,
      buyRate: buyNum,
      sellRate: sellNum,
      notes: editStdNotes,
      currency: editStdCurrency
    });
    setStandardTransferToEdit(null);
  };

  const handleDeleteTransferItem = (item: any) => {
    const confirmMsg = lang === 'en' 
      ? `Are you sure you want to delete transfer ${item.id}?` 
      : lang === 'ar' 
        ? `هل أنت تأكد من حذف الحوالة ${item.id}؟` 
        : `دڵنیایت لە سڕینەوەی حەواڵەی ${item.id}؟`;
    if (!window.confirm(confirmMsg)) return;

    if (item.rowType === 'Fast' && onDeleteFastTransfer) {
      onDeleteFastTransfer(item.id);
    } else if (item.rowType === 'Standard' && onDeleteStandardTransfer) {
      onDeleteStandardTransfer(item.id);
    } else if (onDeleteTransaction) {
      const matchingTx = transactions.find(t => t.notes?.includes(item.id));
      if (matchingTx) {
        onDeleteTransaction(matchingTx.id);
      } else {
        alert(lang === 'en' ? 'Transaction log not found.' : 'ببورە، مێژووی جووڵەی ئەم حەواڵەیە لە مێژووی گشتی سستەمەکە نەدۆزرایەوە.');
      }
    }
  };

  // Date Filters
  const getTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [startDate, setStartDate] = useState(getTodayString());
  const [endDate, setEndDate] = useState(getTodayString());

  // Selected Customer Ledger & Filters
  const [selectedCustomerForTxLog, setSelectedCustomerForTxLog] = useState<Customer | null>(null);
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerStartDate, setLedgerStartDate] = useState(getTodayString());
  const [ledgerEndDate, setLedgerEndDate] = useState(getTodayString());

  const isWithinDates = (timestamp: string) => {
    if (!timestamp) return true;
    const itemDate = new Date(timestamp).getTime();
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      if (itemDate < start.getTime()) return false;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      if (itemDate > end.getTime()) return false;
    }
    return true;
  };

  const filteredTransactionsByDate = transactions.filter(tr => isWithinDates(tr.timestamp));
  const filteredStandardTransfersByDate = standardTransfers.filter(tr => isWithinDates(tr.createdAt));
  const filteredFastTransfersByDate = fastTransfers.filter(tr => isWithinDates(tr.createdAt));

  // --- 1. Calculations & Summaries ---
  // A. Sum profits from standard transfers (spreads) separated per currency and estimated to IQD
  const standardTransferProfitSum: Record<string, number> = {};
  filteredStandardTransfersByDate.forEach(st => {
    const cur = st.currency || 'USD';
    standardTransferProfitSum[cur] = (standardTransferProfitSum[cur] || 0) + (st.profitIQD || 0);
  });

  const totalStandardProfitsIQD = Object.entries(standardTransferProfitSum).reduce((sum, [cur, val]) => {
    if (cur === 'IQD') return sum + val;
    if (cur === 'USD') return sum + val * 1500;
    if (cur === 'IRR') return sum + val / 400; // rough scale
    return sum + val * 1000; // default exchange estimate
  }, 0);

  // B. Sum profits from fast transfers (fees currency converted to estimate, or list per currency)
  // Cancelled transfers refunded their fees and therefore generate zero profit
  const fastTransferFeeSum: Record<string, number> = {};
  filteredFastTransfersByDate.forEach(ft => {
    if (ft.status === 'Cancelled') return;
    const cur = ft.currency || 'USD';
    fastTransferFeeSum[cur] = (fastTransferFeeSum[cur] || 0) + (ft.fee || 0);
  });

  // Calculate estimated combined profits in IQD (for overview, USD fee is converted at 1500 estimate, etc.)
  const estFastFeesInIQD = Object.entries(fastTransferFeeSum).reduce((sum, [cur, val]) => {
    if (cur === 'IQD') return sum + val;
    if (cur === 'USD') return sum + val * 1500;
    if (cur === 'IRR') return sum + val / 400; // rough estimate
    return sum + val * 1000;
  }, 0);

  const totalTransferProfitsEstIQD = totalStandardProfitsIQD + estFastFeesInIQD;

  // C. Calculate client liability totals per currency
  const totalLiabilities = customers.reduce((acc: Record<string, number>, c) => {
    currencies.forEach(cur => {
      if (!acc[cur]) acc[cur] = 0;
      acc[cur] += (c.balances[cur] || 0);
    });
    return acc;
  }, {});

  // Active Currencies: Currencies that have non-zero safe balance, liabilities, customer balance, or transactions
  const activeCurrencies = useMemo(() => {
    const list = currencies.filter(cur => {
      const safeBal = safeBalances[cur] || 0;
      const liabilitySum = totalLiabilities[cur] || 0;
      const hasTx = transactions.some(t => t.currency === cur || t.targetCurrency === cur);
      const hasCustBal = customers.some(c => (c.balances[cur] || 0) !== 0);
      return liabilitySum !== 0 || safeBal !== 0 || hasTx || hasCustBal;
    });
    return list.length > 0 ? list : currencies.filter(c => c === 'USD' || c === 'IQD');
  }, [currencies, safeBalances, totalLiabilities, transactions, customers]);

  // D. Top Customers ordered by activity volume
  const getCustomerScoreUSD = (c: Customer) => {
    let usdScore = c.balances.USD || 0;
    if (c.balances.IQD) usdScore += c.balances.IQD / 1500;
    if (c.balances.IRR) usdScore += c.balances.IRR / 60000;
    return usdScore;
  };

  const sortedCustomers = [...customers]
    .map(c => ({
      ...c,
      convertedScoreUSD: getCustomerScoreUSD(c),
      txCount: filteredTransactionsByDate.filter(tr => {
        if (c.id === 'system-exchange') {
          return tr.type === 'Exchange' || tr.customerId === 'system-exchange';
        }
        if (c.id === 'system-expenses') {
          return tr.customerId === 'system-expenses' || tr.type === 'Expense';
        }
        return tr.customerId === c.id;
      }).length
    }))
    .sort((a, b) => b.convertedScoreUSD - a.convertedScoreUSD);

  // E. Employee statistics (leaderboard)
  const employeeStatsMap: Record<string, { count: number; lastTxTime: string }> = {};
  filteredTransactionsByDate.forEach(tx => {
    const name = tx.performedBy || 'Unknown';
    if (!employeeStatsMap[name]) {
      employeeStatsMap[name] = { count: 0, lastTxTime: tx.timestamp };
    }
    employeeStatsMap[name].count += 1;
    if (new Date(tx.timestamp) > new Date(employeeStatsMap[name].lastTxTime)) {
      employeeStatsMap[name].lastTxTime = tx.timestamp;
    }
  });

  const employeeStatsList = Object.entries(employeeStatsMap)
    .map(([name, stat]) => ({ name, count: stat.count, lastTxTime: stat.lastTxTime }))
    .sort((a, b) => b.count - a.count);

  const maxTxCount = Math.max(...employeeStatsList.map(e => e.count), 1);

  // --- 2. Filters & Searches ---
  // A. Filtered Customers
  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) || 
    c.phone.includes(customerSearch)
  );

  // B. Combined Active Transfers List (Fast & Standard) for reports (Date Range filtered, excluding Cancelled)
  const activeFastTransfersForReport = filteredFastTransfersByDate.filter(ft => ft.status !== 'Cancelled');

  const allTransfersReport = [
    ...filteredStandardTransfersByDate.map(st => ({
      ...st,
      rowType: 'Standard' as const,
      rawItem: st,
      timestamp: st.createdAt,
      profitText: `${st.profitIQD.toLocaleString()} IQD ${lang === 'en' ? '(Spread)' : lang === 'ar' ? '(فارق السعر)' : '(سپرێد)'}`,
      amountText: `$${st.amountUSD.toLocaleString()} USD`
    })),
    ...activeFastTransfersForReport.map(ft => ({
      ...ft,
      rowType: 'Fast' as const,
      rawItem: ft,
      timestamp: ft.createdAt,
      profitText: `${formatMoney(ft.fee, ft.currency)} ${lang === 'en' ? '(Fee)' : lang === 'ar' ? '(رسوم)' : '(کرێ)'}`,
      amountText: formatMoney(ft.amount, ft.currency)
    }))
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const filteredTransfers = allTransfersReport.filter(t => 
    t.id.toLowerCase().includes(transferSearch.toLowerCase()) ||
    t.senderName.toLowerCase().includes(transferSearch.toLowerCase()) ||
    t.receiverName.toLowerCase().includes(transferSearch.toLowerCase()) ||
    ((t.rawItem as FastTransferDetails)?.officeName || '').toLowerCase().includes(transferSearch.toLowerCase()) ||
    ((t.rawItem as FastTransferDetails)?.deliveryReceiverName || '').toLowerCase().includes(transferSearch.toLowerCase()) ||
    (t.notes || '').toLowerCase().includes(transferSearch.toLowerCase())
  );

  // C. Dedicated Cancelled Transfers Report calculation
  const cancelledFastTransfers = useMemo(() => {
    return fastTransfers.filter(ft => ft.status === 'Cancelled' && isWithinDates(ft.createdAt));
  }, [fastTransfers, startDate, endDate]);

  const filteredCancelledTransfers = useMemo(() => {
    if (!cancelledTransferSearch.trim()) return cancelledFastTransfers;
    const q = cancelledTransferSearch.toLowerCase().trim();
    return cancelledFastTransfers.filter(ft => 
      ft.id.toLowerCase().includes(q) ||
      ft.senderName.toLowerCase().includes(q) ||
      ft.receiverName.toLowerCase().includes(q) ||
      (ft.receiverPhone || '').includes(q) ||
      (ft.notes || '').toLowerCase().includes(q) ||
      (ft.cancelReason || '').toLowerCase().includes(q) ||
      (ft.cancelledBy || '').toLowerCase().includes(q)
    );
  }, [cancelledFastTransfers, cancelledTransferSearch]);

  const cancelledSummaryByCurrency = useMemo(() => {
    const principalTotals: Record<string, number> = {};
    const feeTotals: Record<string, number> = {};
    const fullRefundTotals: Record<string, number> = {};

    cancelledFastTransfers.forEach(ft => {
      const cur = ft.currency || 'USD';
      principalTotals[cur] = (principalTotals[cur] || 0) + (ft.amount || 0);
      feeTotals[cur] = (feeTotals[cur] || 0) + (ft.fee || 0);
      fullRefundTotals[cur] = (fullRefundTotals[cur] || 0) + (ft.amount || 0) + (ft.fee || 0);
    });

    return { principalTotals, feeTotals, fullRefundTotals };
  }, [cancelledFastTransfers]);

  // C. Exchange transactions for reports (Date Range filtered)
  const exchangeTrans = filteredTransactionsByDate.filter(t => t.type === 'Exchange');
  const filteredExchanges = exchangeTrans.filter(t => {
    // Currency Filter
    if (exchangeCurrencyFilter !== 'all') {
      const isBaseMatch = t.currency === exchangeCurrencyFilter;
      const isTargetMatch = (t.targetCurrency || 'IQD') === exchangeCurrencyFilter;
      if (!isBaseMatch && !isTargetMatch) return false;
    }

    if (exchangeSearch.trim()) {
      const q = exchangeSearch.toLowerCase().trim();
      const idMatch = t.id.toLowerCase().includes(q);
      const custMatch = (t.customerName || '').toLowerCase().includes(q);
      const notesMatch = (t.notes || '').toLowerCase().includes(q);
      const opMatch = (t.performedBy || '').toLowerCase().includes(q);
      const curMatch = t.currency.toLowerCase().includes(q) || (t.targetCurrency || '').toLowerCase().includes(q);
      return idMatch || custMatch || notesMatch || opMatch || curMatch;
    }
    return true;
  });

  let exchangeIncomingFiltered = 0;
  let exchangeOutgoingFiltered = 0;

  if (exchangeCurrencyFilter !== 'all') {
    filteredExchanges.forEach(tx => {
      const isBaseFilter = tx.currency === exchangeCurrencyFilter;
      const isTargetFilter = (tx.targetCurrency || 'IQD') === exchangeCurrencyFilter;

      if (isBaseFilter) {
        if (tx.amount > 0) {
          exchangeIncomingFiltered += tx.amount;
        } else {
          exchangeOutgoingFiltered += Math.abs(tx.amount);
        }
      } else if (isTargetFilter) {
        const targetAmt = Math.abs(tx.targetAmount || 0);
        if (tx.amount > 0) {
          // Buying USD means paying out target currency (Outgoing)
          exchangeOutgoingFiltered += targetAmt;
        } else {
          // Selling USD means receiving target currency (Incoming)
          exchangeIncomingFiltered += targetAmt;
        }
      }
    });
  }

  const isSafeTx = (tx: Transaction) => {
    const isSafeParty = !tx.customerId || 
      tx.customerId === 'safe' || 
      tx.customerId === 'system-exchange' || 
      tx.customerName === 'خانەی گەنجینە';

    if (tx.type === 'SafeAdjustment') return true;
    if (tx.type === 'Deposit' || tx.type === 'Withdrawal') return true;
    if (tx.type === 'Exchange') {
      // Exchange belongs in Safe report ONLY if source was the Safe / Treasury
      return isSafeParty;
    }
    if (tx.type === 'FastTransfer') {
      return !tx.customerId || isSafeParty;
    }
    if (tx.type === 'StandardTransfer' || tx.type === 'InternalTransfer') {
      return isSafeParty;
    }
    return false;
  };

  // D. Safe / Treasury Report compile
  const calcSafeNetChanges = (txList: Transaction[]) => {
    const totals: Record<string, number> = {};
    const incoming: Record<string, number> = {};
    const outgoing: Record<string, number> = {};

    txList.forEach(tx => {
      if (!isSafeTx(tx)) return;

      if (tx.type === 'Exchange') {
        const usdAmt = tx.amount || 0;
        totals['USD'] = (totals['USD'] || 0) + usdAmt;
        if (usdAmt > 0) incoming['USD'] = (incoming['USD'] || 0) + usdAmt;
        else if (usdAmt < 0) outgoing['USD'] = (outgoing['USD'] || 0) + Math.abs(usdAmt);

        const targetCur = tx.targetCurrency || 'IQD';
        const targetAmt = tx.targetAmount || 0;
        totals[targetCur] = (totals[targetCur] || 0) + targetAmt;
        if (targetAmt > 0) incoming[targetCur] = (incoming[targetCur] || 0) + targetAmt;
        else if (targetAmt < 0) outgoing[targetCur] = (outgoing[targetCur] || 0) + Math.abs(targetAmt);
      } else if (tx.type === 'FastTransfer') {
        const cur = tx.currency || 'USD';
        const amt = Math.abs(tx.amount || 0);
        totals[cur] = (totals[cur] || 0) - amt;
        outgoing[cur] = (outgoing[cur] || 0) + amt;
      } else if (tx.type === 'SafeAdjustment' || tx.type === 'Deposit' || tx.type === 'Withdrawal') {
        const cur = tx.currency || 'USD';
        const amt = tx.amount || 0;
        totals[cur] = (totals[cur] || 0) + amt;
        if (amt > 0) incoming[cur] = (incoming[cur] || 0) + amt;
        else if (amt < 0) outgoing[cur] = (outgoing[cur] || 0) + Math.abs(amt);
      }
    });

    return { totals, incoming, outgoing };
  };

  const allSafeTransactions = useMemo(() => {
    const raw = transactions.filter(isSafeTx);
    return deduplicateTransactions(raw);
  }, [transactions]);

  const beforeStartSafeTransactions = useMemo(() => {
    if (!startDate) return [];
    const sDate = new Date(startDate);
    sDate.setHours(0, 0, 0, 0);
    const sTime = sDate.getTime();
    return allSafeTransactions.filter(tx => new Date(tx.timestamp).getTime() < sTime);
  }, [allSafeTransactions, startDate]);

  const safeOpeningNet = useMemo(() => {
    return calcSafeNetChanges(beforeStartSafeTransactions).totals;
  }, [beforeStartSafeTransactions]);

  const safeReportRaw = filteredTransactionsByDate.filter(isSafeTx);

  const safeReportTransactions = deduplicateTransactions(safeReportRaw);

  const filteredSafeTransactions = safeReportTransactions.filter(tx => {
    if (safeFilterType === 'safe_adj' && tx.type !== 'SafeAdjustment') return false;
    if (safeFilterType === 'deposits' && tx.type !== 'Deposit') return false;
    if (safeFilterType === 'withdrawals' && tx.type !== 'Withdrawal') return false;
    if (safeFilterType === 'exchanges' && tx.type !== 'Exchange') return false;
    if (safeFilterType === 'deliveries' && tx.type !== 'FastTransfer') return false;

    // Currency Filter
    if (safeCurrencyFilter !== 'all') {
      if (tx.type === 'Exchange') {
        const isBaseMatch = tx.currency === safeCurrencyFilter;
        const isTargetMatch = tx.targetCurrency === safeCurrencyFilter;
        if (!isBaseMatch && !isTargetMatch) return false;
      } else {
        if (tx.currency !== safeCurrencyFilter) return false;
      }
    }

    if (safeSearch.trim()) {
      const q = safeSearch.toLowerCase().trim();
      const idMatch = tx.id.toLowerCase().includes(q);
      const noteMatch = (tx.notes || '').toLowerCase().includes(q);
      const operatorMatch = (tx.performedBy || '').toLowerCase().includes(q);
      const customerMatch = (tx.customerName || '').toLowerCase().includes(q);
      const amountMatch = Math.abs(tx.amount).toString().includes(q);
      const currencyMatch = tx.currency.toLowerCase().includes(q);
      return idMatch || noteMatch || operatorMatch || customerMatch || amountMatch || currencyMatch;
    }
    return true;
  });

  const safeIncomingTotals: Record<string, number> = {};
  const safeOutgoingTotals: Record<string, number> = {};

  safeReportTransactions.forEach(tx => {
    const cur = tx.currency;
    if (tx.type === 'Exchange') {
      const usdAmount = tx.amount;
      if (usdAmount > 0) {
        safeIncomingTotals['USD'] = (safeIncomingTotals['USD'] || 0) + usdAmount;
      } else {
        safeOutgoingTotals['USD'] = (safeOutgoingTotals['USD'] || 0) + Math.abs(usdAmount);
      }
      const targetCur = tx.targetCurrency || 'IQD';
      const targetAmt = tx.targetAmount || 0;
      if (targetAmt > 0) {
        safeIncomingTotals[targetCur] = (safeIncomingTotals[targetCur] || 0) + targetAmt;
      } else {
        safeOutgoingTotals[targetCur] = (safeOutgoingTotals[targetCur] || 0) + Math.abs(targetAmt);
      }
    } else if (tx.type === 'FastTransfer') {
      safeOutgoingTotals[cur] = (safeOutgoingTotals[cur] || 0) + Math.abs(tx.amount);
    } else {
      if (tx.amount > 0) {
        safeIncomingTotals[cur] = (safeIncomingTotals[cur] || 0) + tx.amount;
      } else {
        safeOutgoingTotals[cur] = (safeOutgoingTotals[cur] || 0) + Math.abs(tx.amount);
      }
    }
  });

  // Calculate totals of incoming and outgoing for safeCurrencyFilter when not 'all'
  let totalIncomingFiltered = 0;
  let totalOutgoingFiltered = 0;

  if (safeCurrencyFilter !== 'all') {
    filteredSafeTransactions.forEach(tx => {
      if (tx.type === 'Exchange') {
        const isBaseUsd = safeCurrencyFilter === 'USD';
        const isTarget = safeCurrencyFilter === tx.targetCurrency;
        const isIncomingUsd = tx.amount > 0;
        
        if (isBaseUsd) {
          if (isIncomingUsd) {
            totalIncomingFiltered += tx.amount;
          } else {
            totalOutgoingFiltered += Math.abs(tx.amount);
          }
        } else if (isTarget) {
          if (isIncomingUsd) {
            totalOutgoingFiltered += Math.abs(tx.targetAmount || 0);
          } else {
            totalIncomingFiltered += Math.abs(tx.targetAmount || 0);
          }
        }
      } else {
        if (tx.currency === safeCurrencyFilter) {
          if (tx.type === 'SafeAdjustment') {
            if (tx.amount > 0) {
              totalIncomingFiltered += tx.amount;
            } else {
              totalOutgoingFiltered += Math.abs(tx.amount);
            }
          } else if (tx.type === 'Deposit') {
            totalIncomingFiltered += tx.amount;
          } else if (tx.type === 'Withdrawal') {
            totalOutgoingFiltered += Math.abs(tx.amount);
          } else if (tx.type === 'FastTransfer') {
            totalOutgoingFiltered += Math.abs(tx.amount);
          }
        }
      }
    });
  }

  // --- Internal Transfers Report calculation ---
  const internalTransferLogs = useMemo(() => {
    const intSenders = transactions.filter(tx => tx.type === 'InternalTransfer' && !tx.id.endsWith('-REC'));
    return intSenders.map(tx => {
      const receiverTx = transactions.find(r => r.id === `${tx.id}-REC`);
      return {
        id: tx.id,
        timestamp: tx.timestamp,
        senderName: tx.customerName || '—',
        receiverName: receiverTx ? receiverTx.customerName : '—',
        amount: Math.abs(tx.amount),
        currency: tx.currency,
        performedBy: tx.performedBy || '—',
        notes: tx.notes || ''
      };
    });
  }, [transactions]);

  const filteredInternalTransferLogs = useMemo(() => {
    return internalTransferLogs.filter(item => {
      if (startDate) {
        const s = new Date(startDate);
        s.setHours(0,0,0,0);
        if (new Date(item.timestamp).getTime() < s.getTime()) return false;
      }
      if (endDate) {
        const e = new Date(endDate);
        e.setHours(23,59,59,999);
        if (new Date(item.timestamp).getTime() > e.getTime()) return false;
      }
      if (customerSearch) {
        const q = customerSearch.toLowerCase().trim();
        return (
          item.id.toLowerCase().includes(q) ||
          item.senderName.toLowerCase().includes(q) ||
          item.receiverName.toLowerCase().includes(q) ||
          (item.notes || '').toLowerCase().includes(q) ||
          (item.performedBy || '').toLowerCase().includes(q) ||
          item.currency.toLowerCase().includes(q) ||
          item.amount.toString().includes(q)
        );
      }
      return true;
    });
  }, [internalTransferLogs, startDate, endDate, customerSearch]);

  const internalTransferVolumeByCurrency = useMemo(() => {
    const totals: Record<string, number> = {};
    filteredInternalTransferLogs.forEach(log => {
      totals[log.currency] = (totals[log.currency] || 0) + log.amount;
    });
    return totals;
  }, [filteredInternalTransferLogs]);

  // --- 3. Printing Trigger --
  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className={`space-y-6 animate-fade-in ${lang === 'en' ? 'text-left' : 'text-right'}`}>
      
      {/* Top Header Card */}
      <GlassCard className="p-0" contentClassName="p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 no-print view-header" data-animate="header">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white rtl:border-r-4 rtl:pr-3 ltr:border-l-4 ltr:pl-3 border-[#1D7AFC] flex items-center gap-2.5">
              <TrendingUp className="w-6 h-6 text-[#1D7AFC]" />
              <span>{t.reports_title}</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">{t.reports_desc}</p>
          </div>
        </div>
      </GlassCard>

      {/* Top Controls: Report Category & Date Range Filter Bar Side-by-Side */}
      <div data-animate="card" className="bento-card transform-gpu flex flex-col lg:flex-row items-stretch lg:items-center gap-3.5 no-print" dir={lang === 'en' ? 'ltr' : 'rtl'}>
        {/* Report Tab Selection (Dropdown List) */}
        <div className="bg-white p-3 px-4 rounded-xl border border-gray-200 shadow-xs flex items-center gap-3 w-full lg:w-72 shrink-0">
          <span className="text-xs font-extrabold text-gray-500 whitespace-nowrap">
            {lang === 'en' ? 'Report Category:' : lang === 'ar' ? 'فئة التقرير:' : 'جۆری ڕاپۆرت:'}
          </span>
          <div className="relative flex-1">
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value as ReportTab)}
              className={`w-full bg-gray-50 hover:bg-gray-100/70 border border-gray-200 rounded-lg py-1.5 text-xs font-bold text-gray-900 outline-none cursor-pointer focus:ring-1 focus:ring-primary appearance-none transition-all ${
                lang === 'en' ? 'pr-7 pl-2.5' : 'pl-7 pr-2.5'
              } text-start`}
            >
              <option value="summary" className="font-bold text-gray-800">
                {lang === 'en' ? 'Financial Summary' : lang === 'ar' ? 'الملخص المالي' : 'پوختەی دارایی'}
              </option>
              <option value="customers" className="font-bold text-gray-800">
                {lang === 'en' ? 'Customer Balances' : lang === 'ar' ? 'أرصدة وحسابات العملاء' : 'ڕاپۆرتی کڕیاران'}
              </option>
              <option value="transfers" className="font-bold text-gray-800">
                {lang === 'en' ? 'Transfers & Profits' : lang === 'ar' ? 'الحوالات والأرباح' : 'ڕاپۆرتی حەواڵەکان'}
              </option>
              <option value="exchanges" className="font-bold text-gray-800">
                {lang === 'en' ? 'Buy/Sell Exchange' : lang === 'ar' ? 'صرف وبيع وشراء العملات' : 'کڕین و فرۆشتنی دراو'}
              </option>
              <option value="safe" className="font-bold text-gray-800">
                {lang === 'en' ? 'Safe/Treasury Report' : lang === 'ar' ? 'تقرير الخزينة' : 'ڕاپۆرتی گەنجینە'}
              </option>
              <option value="expenses" className="font-bold text-rose-700">
                {lang === 'en' ? 'Expenses Report' : lang === 'ar' ? 'تقرير المصاريف' : 'ڕاپۆرتی خەرجییەکان'}
              </option>
            </select>
            <span className={`absolute inset-y-0 ${lang === 'en' ? 'right-2' : 'left-2'} flex items-center pointer-events-none text-gray-400 text-[10px] select-none`}>
              ▼
            </span>
          </div>
        </div>

        {/* Modern Date Range Filter Bar */}
        <div className="bg-white p-3 px-4 rounded-xl border border-gray-200 shadow-xs flex-1 flex flex-wrap md:flex-nowrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-gray-600 text-xs">
                {lang === 'en' ? 'From:' : lang === 'ar' ? 'من:' : 'لە:'}
              </span>
              <input 
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-gray-50 border border-gray-200 py-1.5 px-2.5 rounded-lg text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-gray-800"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="font-bold text-gray-600 text-xs">
                {lang === 'en' ? 'To:' : lang === 'ar' ? 'إلى:' : 'بۆ:'}
              </span>
              <input 
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-gray-50 border border-gray-200 py-1.5 px-2.5 rounded-lg text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-gray-800"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { setStartDate(getTodayString()); setEndDate(getTodayString()); }}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                startDate === getTodayString() && endDate === getTodayString()
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {lang === 'en' ? 'Today' : lang === 'ar' ? 'اليوم' : 'ئەمڕۆ'}
            </button>

            {(startDate || endDate) && (
              <button 
                onClick={() => { setStartDate(''); setEndDate(''); }}
                className="px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 rounded-lg font-bold text-xs transition-all cursor-pointer"
              >
                {lang === 'en' ? 'Clear' : lang === 'ar' ? 'مسح' : 'سڕینەوە'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Print-Only Title Sheet (Visible only on printing!) */}
      <div className="hidden print:block text-center border-b-2 border-gray-200 pb-5 mb-6 text-right" dir={lang === 'en' ? 'ltr' : 'rtl'}>
        <h1 className="text-2xl font-extrabold text-primary">
          {lang === 'en' ? 'Official Currency Exchange Office Report' : lang === 'ar' ? 'التقرير الرسمي لمكتب صرافة وتحويل العملات' : 'ڕاپۆرتی فەرمی نووسینگەی ئاڵوگۆڕی دراو'}
        </h1>
        <p className="text-xs text-gray-400 mt-1">
          {lang === 'en' ? 'Report Generation Date:' : lang === 'ar' ? 'تاريخ إنشاء التقرير:' : 'بەرواری سەرچاوەکردنی ڕاپۆرت:'} {formatKurdishDateTime(new Date().toISOString())}
        </p>
        <div className="mt-2 text-xs text-gray-500 font-bold">
          {activeTab === 'summary' && (lang === 'en' ? '• Subject Type: General Summary of Profits & Deposits' : lang === 'ar' ? '• نوع الموضوع: الملخص العام للأرباح والإيداعات' : '• جۆری بابەت: پوختەی گشتی قازانج و سپاردەکان')}
          {activeTab === 'customers' && (lang === 'en' ? '• Subject Type: Customer Accounts Balance Report' : lang === 'ar' ? '• نوع الموضوع: تقرير أرصدة حسابات العملاء' : '• جۆری بابەت: ڕاپۆرتی حیسابات و باڵانسی سەرجەم کڕیاران')}
          {activeTab === 'transfers' && (lang === 'en' ? '• Subject Type: History & Earned Profits of Transfers' : lang === 'ar' ? '• نوع الموضوع: سجل وأرباح الحوالات المحققة' : '• جۆری بابەت: مێژوو و قازانجە بەدەستهاتووەکانی حەواڵە')}
          {activeTab === 'exchanges' && (lang === 'en' ? '• Subject Type: History of Buying/Selling Currency Exchange Operations' : lang === 'ar' ? '• نوع الموضوع: سجل عمليات شراء وبيع صرافة العملات' : '• جۆری بابەت: مێژووی کرداری گۆڕینەوەی کڕین و فرۆشتنی دراو')}
          {activeTab === 'safe' && (lang === 'en' ? '• Subject Type: Official Safe/Vault Movements & Transactions Report' : lang === 'ar' ? '• نوع الموضوع: التقرير الرسمي لحركات وعمليات الخزينة' : '• جۆری بابەت: ڕاپۆرتی فەرمی تەواوی مامەڵە و جووڵەکانی گەنجینە')}
          {activeTab === 'expenses' && (lang === 'en' ? '• Subject Type: Official Office Expenses Ledger' : lang === 'ar' ? '• نوع الموضوع: التقرير الرسمي لمصاريف الخزينة والمكتب' : '• جۆری بابەت: ڕاپۆرتی فەرمی سەرجەم تێچوو و خەرجییەکانی نووسینگە')}
        </div>
      </div>

      {/* ======================= TAB 1: SUMMARY ======================= */}
      {activeTab === 'summary' && (
        <div className="space-y-6">
          
          {/* Revenue highlights grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Consolidated Transfer Profits */}
            <div className="bg-gradient-to-br from-primary to-blue-800 text-white p-6 rounded-2xl shadow-sm space-y-3 print:border print:border-primary print:text-black">
              <div className="flex justify-between items-start">
                <span className="text-xs text-white/80 font-bold uppercase print:text-gray-700">
                  {lang === 'en' ? 'Total Transfer Profits' : lang === 'ar' ? 'إجمالي أرباح الحوالات' : 'کۆی گشتی قازانجی حەواڵەکان'}
                </span>
                <Sparkles className="w-5 h-5 text-amber-300 animate-pulse no-print" />
              </div>
              <div>
                <p className="text-3xl font-black font-mono">
                  {totalStandardProfitsIQD.toLocaleString()} IQD
                </p>
                
                {/* Breakdowns inside card */}
                <div className="mt-4 pt-3 border-t border-white/20 text-[11px] text-white/70 space-y-1 print:text-gray-800">
                  <div className="flex justify-between">
                    <span>
                      {lang === 'en' ? 'Standard Hawala Spread Profit:' : lang === 'ar' ? 'ربح فارق أسعار الحوالات القياسية:' : 'قازانجی سپرێدی حەواڵە:'}
                    </span>
                    <span className="font-mono font-bold text-white print:text-black">+{totalStandardProfitsIQD.toLocaleString()} IQD</span>
                  </div>
                  <div className="flex justify-between">
                    <span>
                      {lang === 'en' ? 'Fast Hawala Fee Commission (Cash):' : lang === 'ar' ? 'عمولة رسوم الحوالات السريعة (نقدي):' : 'کۆمسیۆنی حەواڵەی خێرا (کاش):'}
                    </span>
                    <div className="text-left font-mono">
                      {Object.entries(fastTransferFeeSum).map(([curr, amt]) => (
                        <div key={curr} className="font-bold text-white print:text-black">+{amt.toLocaleString()} {curr}</div>
                      ))}
                      {Object.keys(fastTransferFeeSum).length === 0 && '0'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Total liabilities / Client deposits totals */}
            {activeCurrencies.map(cur => {
              const liabilitySum = totalLiabilities[cur] || 0;
              return (
                <div key={cur} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="text-xs text-gray-400 font-bold uppercase">
                      {lang === 'en' ? `Customer Deposits (${cur})` : lang === 'ar' ? `أمانات العملاء (${cur})` : `ئەمانەتی کڕیاران بە ${cur}`}
                    </span>
                    <Wallet className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className={`text-2xl font-black font-mono ${liabilitySum < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                      {formatMoney(liabilitySum, cur)}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1">
                      {lang === 'en' 
                        ? `Net client balance reserves stored in ${cur}` 
                        : lang === 'ar'
                          ? `صافي احتياطي أرصدة وإيداعات العملاء بالعملة ${cur}`
                          : `سەرجەم سەرمایەی سپاردەی یان قەرزی کڕیاران بۆ دراوی ${cur}`}
                    </p>
                  </div>
                </div>
              );
            })}

          </div>

          {/* Leaders board side-by-side (Hides on print or renders gracefully) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Employee operations register */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-50 pb-3">
                <Award className="w-5 h-5 text-amber-500" />
                <h3 className="text-sm font-bold text-gray-900">
                  {lang === 'en' ? 'Teller Volume & Operations leaderboard' : lang === 'ar' ? 'إحصائيات الموظفين وأحجام العمليات' : 'شیکاری کارمەندان و تەلەرەکان'}
                </h3>
              </div>
              <div className="space-y-4">
                {employeeStatsList.map((emp, idx) => {
                  const percentage = Math.round((emp.count / maxTxCount) * 100);
                  return (
                    <div key={emp.name} className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-primary-light text-primary font-bold text-[10px] flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="font-bold text-gray-800">{emp.name}</span>
                        </div>
                        <span className="font-mono text-gray-500 font-bold">
                          {emp.count} {lang === 'en' ? 'transactions' : lang === 'ar' ? 'عملية منجزة' : 'مامەڵە ئەنجامدراوە'}
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top most heavy accounts */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-50 pb-3">
                <Users className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-gray-900">
                  {lang === 'en' ? 'Heaviest and Active Client Accounts' : lang === 'ar' ? 'أكبر الحسابات وأكثرها نشاطاً' : 'کۆمەڵەی کڕیارانی گەورە و قەبارەی باڵانس'}
                </h3>
              </div>
              <div className="divide-y divide-gray-100 max-h-[240px] overflow-y-auto pr-1">
                {sortedCustomers.map((cust) => (
                  <div key={cust.id} className="py-2.5 flex justify-between items-center text-xs">
                    <div>
                      <h4 className="font-bold text-gray-950">{cust.name}</h4>
                      <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                        {lang === 'en' ? 'Movements:' : lang === 'ar' ? 'التحركات:' : 'جۆری جووڵەکان:'} {cust.txCount} • {lang === 'en' ? 'Phone:' : lang === 'ar' ? 'الهاتف:' : 'مۆبایل:'} {cust.phone}
                      </p>
                    </div>
                    <div className="text-left">
                      {currencies.map(cur => {
                        const val = cust.balances[cur] || 0;
                        if (val === 0) return null;
                        return (
                          <span key={cur} className="font-mono font-bold text-gray-700 block text-[10px]">
                            {formatMoney(val, cur)}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      )}


      {/* ======================= TAB 2: CUSTOMERS ======================= */}
      {activeTab === 'customers' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          
          {/* Sub-tab switcher bar */}
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3 no-print overflow-x-auto">
            <button
              onClick={() => setCustomerSubTab('balances')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 shrink-0 ${
                customerSubTab === 'balances'
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>{lang === 'en' ? 'Customer Balances & Accounts' : lang === 'ar' ? 'أرصدة وحسابات العملاء' : 'باڵانسی هەژماری کڕیاران'}</span>
            </button>

            <button
              onClick={() => setCustomerSubTab('internal_transfers')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 shrink-0 ${
                customerSubTab === 'internal_transfers'
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <ArrowLeftRight className="w-4 h-4" />
              <span>{lang === 'en' ? 'Internal Transfers Report' : lang === 'ar' ? 'تقرير التحويلات الداخلية' : 'ڕاپۆرتی گواستنەوەی ناوخۆیی'}</span>
              {filteredInternalTransferLogs.length > 0 && (
                <span className={`px-2 py-0.5 text-[10px] font-mono rounded-full font-bold ${
                  customerSubTab === 'internal_transfers' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
                }`}>
                  {filteredInternalTransferLogs.length}
                </span>
              )}
            </button>
          </div>

          {/* SUB-VIEW 1: CUSTOMER BALANCES */}
          {customerSubTab === 'balances' && (
            <div className="space-y-4">
              {/* Internal search filter bar (Hides on print!) */}
              <div className="flex items-center gap-3 bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-100 no-print">
                <Search className="w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={lang === 'en' ? 'Search customer (Name or Phone)...' : lang === 'ar' ? 'البحث عن زبون (الاسم أو الجوال)...' : 'گەڕان بەدوای کڕیاردا (ناو یان مۆبایل)...'}
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="bg-transparent text-xs w-full focus:outline-none placeholder-gray-450 text-right"
                />
              </div>

              {/* Mobile Customers Ledger view */}
              <div className="md:hidden divide-y divide-gray-100 p-1 bg-white">
                {filteredCustomers.map((c) => (
                  <div key={c.id} className="p-4 space-y-3.5 hover:bg-gray-50/20 transition-colors" dir={lang === 'en' ? 'ltr' : 'rtl'}>
                    <div>
                      <h3 className="font-bold text-sm text-gray-950 flex items-center gap-1.5">
                        {c.name}
                        {['system-expenses', 'system-exchange', 'system-transfer-fee', 'system-profit', 'system-fast-hawala'].includes(c.id) && (
                          <span className="bg-amber-100 text-amber-950 text-[10px] font-bold px-2 py-0.5 rounded-md border border-amber-300">
                            {lang === 'en' ? 'SYSTEM' : lang === 'ar' ? 'النظام' : 'سیستەم'}
                          </span>
                        )}
                      </h3>
                      <span className="inline-block mt-0.5 text-[10px] font-mono text-gray-700 bg-gray-100 px-2 py-0.5 rounded font-bold">
                        {['system-expenses', 'system-exchange', 'system-transfer-fee', 'system-profit', 'system-fast-hawala'].includes(c.id) ? (lang === 'en' ? 'SYSTEM' : lang === 'ar' ? 'النظام' : 'سیستەم') : c.phone}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 py-2 border-t border-b border-dashed border-gray-100/60 bg-gray-50/30 rounded-lg p-2">
                      {activeCurrencies.map(curr => {
                        const bal = c.balances[curr] || 0;
                        return (
                          <div key={curr} className="text-left font-mono">
                            <span className="text-[9px] text-gray-400 block font-semibold">{curr}</span>
                            <p className={`text-[11px] font-bold ${bal < 0 ? 'text-red-600' : bal > 0 ? 'text-emerald-700' : 'text-gray-400'}`}>
                              {formatMoney(bal, curr)}
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex justify-end no-print pt-1">
                      <button
                        onClick={() => {
                          setSelectedCustomerForTxLog(c);
                          setLedgerSearch('');
                          setLedgerStartDate(getTodayString());
                          setLedgerEndDate(getTodayString());
                        }}
                        className="w-full py-2 bg-primary-light hover:bg-primary text-primary-dark hover:text-white rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{lang === 'en' ? 'Statement' : lang === 'ar' ? 'كشف الحساب' : 'بینینی مامەڵەکان'}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Customers table view */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-xs text-right text-gray-600">
                  <thead className="bg-gray-50 text-gray-550 border-b border-gray-100 font-semibold">
                    <tr>
                      <th className="px-4 py-3 text-right">
                        {lang === 'en' ? 'Customer Full Name' : lang === 'ar' ? 'الاسم الكامل للعميل' : 'ناوی تەواوی پشکدار کڕیار'}
                      </th>
                      <th className="px-4 py-3 text-center">
                        {lang === 'en' ? 'Phone Number' : lang === 'ar' ? 'رقم الهاتف' : 'ژمارەی پەیوەندی'}
                      </th>
                      {activeCurrencies.map(curr => (
                        <th key={curr} className="px-4 py-3 text-left">
                          {lang === 'en' ? 'Balance' : lang === 'ar' ? 'الرصيد' : 'باڵانس'} ({curr})
                        </th>
                      ))}
                      <th className="px-4 py-3 text-center no-print">{lang === 'en' ? 'Actions' : lang === 'ar' ? 'الإجراءات' : 'کردارەکان'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-150 font-medium">
                    {filteredCustomers.map((c) => (
                      <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3 font-bold text-gray-900">
                          <div className="flex items-center gap-2">
                            <span>{c.name}</span>
                            {['system-expenses', 'system-exchange', 'system-transfer-fee', 'system-profit', 'system-fast-hawala'].includes(c.id) && (
                              <span className="bg-amber-100 text-amber-950 text-[10px] font-bold px-2 py-0.5 rounded-md border border-amber-300">
                                {lang === 'en' ? 'SYSTEM' : lang === 'ar' ? 'النظام' : 'سیستەم'}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center font-mono font-bold text-gray-700">
                          {['system-expenses', 'system-exchange', 'system-transfer-fee', 'system-profit', 'system-fast-hawala'].includes(c.id) ? (lang === 'en' ? 'SYSTEM' : lang === 'ar' ? 'النظام' : 'سیستەم') : c.phone}
                        </td>
                        {activeCurrencies.map(curr => {
                          const bal = c.balances[curr] || 0;
                          return (
                            <td 
                              key={curr} 
                              className={`px-4 py-3 font-mono text-left font-bold ${
                                bal < 0 ? 'text-red-600' : bal > 0 ? 'text-emerald-600' : 'text-gray-400'
                              }`}
                            >
                              {formatMoney(bal, curr)}
                            </td>
                          );
                        })}
                        <td className="px-4 py-3 text-center no-print">
                          <button
                            onClick={() => {
                              setSelectedCustomerForTxLog(c);
                              setLedgerSearch('');
                              setLedgerStartDate(getTodayString());
                              setLedgerEndDate(getTodayString());
                            }}
                            className="px-3.5 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary hover:text-primary-dark rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>{lang === 'en' ? 'Statement' : lang === 'ar' ? 'كشف الحساب' : 'بینینی مامەڵەکان'}</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* CURRENCY BALANCES SUMMARY (پوختەی کۆکردنەوەی باڵانسی هەژمارەکان بەپێی دراو) */}
              {(() => {
                const activeCurrencyTotals = currencies.map(cur => {
                  const hasTx = transactions.some(tx => tx.currency === cur) ||
                    fastTransfers.some(ft => ft.currency === cur) ||
                    standardTransfers.some(st => st.currency === cur) ||
                    customers.some(c => (c.balances[cur] || 0) !== 0);

                  if (!hasTx) return null;

                  let positiveSum = 0;
                  let negativeSum = 0;

                  customers.forEach(c => {
                    const bal = c.balances[cur] || 0;
                    if (bal > 0) {
                      positiveSum += bal;
                    } else if (bal < 0) {
                      negativeSum += bal;
                    }
                  });

                  const netSum = positiveSum + negativeSum;

                  return {
                    cur,
                    positiveSum,
                    negativeSum,
                    netSum
                  };
                }).filter((item): item is { cur: string; positiveSum: number; negativeSum: number; netSum: number } => item !== null);

                if (activeCurrencyTotals.length === 0) return null;

                return (
                  <div className="mt-6 pt-4 border-t border-gray-200/60 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                      <h3 className="font-extrabold text-sm text-gray-900">
                        {lang === 'en' ? 'Total Customer Balances Summary by Currency' : lang === 'ar' ? 'ملخص إجمالي أرصدة الحسابات حسب العملة' : 'پوختەی کۆکردنەوەی هەژمارەکان بەپێی دراو'}
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {activeCurrencyTotals.map(({ cur, positiveSum, negativeSum, netSum }) => (
                        <div key={cur} className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs space-y-2.5">
                          <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                            <span className="font-extrabold text-xs text-gray-900 flex items-center gap-1.5">
                              <span className="bg-primary/10 text-primary font-mono px-2.5 py-0.5 rounded-md font-extrabold text-xs">
                                {cur}
                              </span>
                              <span>{lang === 'en' ? 'Currency Totals' : lang === 'ar' ? 'إجمالي العملة' : 'کۆی گشتی دراو'}</span>
                            </span>
                          </div>

                          <div className="space-y-1.5 font-mono text-xs">
                            {/* Positive balances total */}
                            <div className="flex justify-between items-center bg-emerald-50/70 px-3 py-2 rounded-lg border border-emerald-100/60">
                              <span className="text-[11px] font-sans font-bold text-emerald-950">
                                {lang === 'en' ? 'Total Positive (+)' : lang === 'ar' ? 'إجمالي الأرصدة الإيجابية (+)' : 'کۆی باڵانسی ئەرێنی (+)'}
                              </span>
                              <span className="font-bold text-emerald-700">
                                {formatMoney(positiveSum, cur)}
                              </span>
                            </div>

                            {/* Negative balances total */}
                            <div className="flex justify-between items-center bg-rose-50/70 px-3 py-2 rounded-lg border border-rose-100/60">
                              <span className="text-[11px] font-sans font-bold text-rose-950">
                                {lang === 'en' ? 'Total Negative (-)' : lang === 'ar' ? 'إجمالي الأرصدة السلبية (-)' : 'کۆی باڵانسی نەرێنی (-)'}
                              </span>
                              <span className="font-bold text-rose-700">
                                {formatMoney(negativeSum, cur)}
                              </span>
                            </div>

                            {/* Net total */}
                            <div className="flex justify-between items-center bg-slate-100/80 px-3 py-2 rounded-lg border border-slate-200/80 mt-1">
                              <span className="text-[11px] font-sans font-extrabold text-slate-900">
                                {lang === 'en' ? 'Net Total Balance' : lang === 'ar' ? 'صافي إجمالي الأرصدة' : 'دەرئەنجامی سەرجەم (کۆی گشتی)'}
                              </span>
                              <span className={`font-black text-xs ${netSum < 0 ? 'text-red-600' : netSum > 0 ? 'text-emerald-700' : 'text-slate-700'}`}>
                                {formatMoney(netSum, cur)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* SUB-VIEW 2: INTERNAL TRANSFERS REPORT */}
          {customerSubTab === 'internal_transfers' && (
            <div className="space-y-4">
              {/* Summary Metrics Banner */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-gray-50/60 p-4 rounded-xl border border-gray-100">
                <div className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-2xs">
                  <span className="text-[10px] text-gray-500 font-bold block mb-1">
                    {lang === 'en' ? 'Total Internal Operations' : lang === 'ar' ? 'إجمالي التحويلات الداخلية' : 'کۆی گواستنەوە ناوخۆییەکان'}
                  </span>
                  <p className="text-base font-extrabold text-primary font-mono">
                    {filteredInternalTransferLogs.length}
                  </p>
                </div>

                {currencies.map(cur => {
                  const vol = internalTransferVolumeByCurrency[cur] || 0;
                  return (
                    <div key={cur} className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-2xs">
                      <span className="text-[10px] text-gray-500 font-bold block mb-1">
                        {lang === 'en' ? `Total Transferred (${cur})` : lang === 'ar' ? `إجمالي المحول (${cur})` : `کۆی گوازراوە (${cur})`}
                      </span>
                      <p className="text-base font-extrabold text-emerald-600 font-mono">
                        {formatMoney(vol, cur)}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Internal transfer search filter bar */}
              <div className="flex items-center gap-3 bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-100 no-print">
                <Search className="w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={lang === 'en' ? 'Search by Sender, Receiver, Ref ID, Notes...' : lang === 'ar' ? 'البحث بالمرسل، المستلم، الرقم المرجعي...' : 'گەڕان بەپێی نێرەر، وەرگر، کد، تێبینی...'}
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="bg-transparent text-xs w-full focus:outline-none placeholder-gray-450 text-right"
                />
              </div>

              {filteredInternalTransferLogs.length === 0 ? (
                <div className="text-center py-10 text-gray-400 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                  <ArrowLeftRight className="w-8 h-8 mx-auto mb-2 opacity-30 text-gray-500" />
                  <p className="text-xs font-semibold">
                    {lang === 'en' ? 'No internal transfers found in this range' : lang === 'ar' ? 'لا توجد تحويلات داخلية في هذه الفترة' : 'هیچ گواستنەوەیەکی ناوخۆیی نەدۆزرایەوە لەم بەروارەدا'}
                  </p>
                </div>
              ) : (
                <>
                  {/* Mobile Internal Transfer Cards */}
                  <div className="md:hidden divide-y divide-gray-100 bg-white rounded-xl border border-gray-100 overflow-hidden">
                    {filteredInternalTransferLogs.map(log => (
                      <div key={log.id} className="p-4 space-y-2.5 hover:bg-gray-50/40 transition-colors">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded text-[10px]">
                            {log.id}
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono">
                            {formatKurdishDateTime(log.timestamp)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2 py-2 border-y border-dashed border-gray-100 text-xs">
                          <div className="text-right">
                            <span className="text-[9px] text-gray-400 block font-semibold">
                              {lang === 'en' ? 'From (Sender)' : lang === 'ar' ? 'من (المرسل)' : 'لە (نێرەر)'}
                            </span>
                            <p className="font-bold text-gray-900">{log.senderName}</p>
                          </div>

                          <ArrowLeftRight className="w-4 h-4 text-primary shrink-0" />

                          <div className="text-left">
                            <span className="text-[9px] text-gray-400 block font-semibold">
                              {lang === 'en' ? 'To (Receiver)' : lang === 'ar' ? 'إلى (المستلم)' : 'بۆ (وەرگر)'}
                            </span>
                            <p className="font-bold text-gray-900">{log.receiverName}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <div>
                            <span className="text-[10px] text-gray-400 block font-mono">{log.performedBy}</span>
                            {log.notes && <p className="text-[11px] text-gray-600 mt-0.5 italic">{log.notes}</p>}
                          </div>
                          <div className="text-left font-mono">
                            <span className="text-xs font-bold text-emerald-600">
                              {formatMoney(log.amount, log.currency)}
                            </span>
                          </div>
                        </div>

                        {onDeleteTransaction && (
                          <div className="flex justify-end pt-2 no-print">
                            <button
                              onClick={() => {
                                if (window.confirm(lang === 'en' ? 'Are you sure you want to delete this internal transfer?' : lang === 'ar' ? 'هل أنت متأكد من حذف هذا التحويل الداخلي؟' : 'دڵنیایت لە سڕینەوەی ئەم گواستنەوە ناوخۆییە؟')) {
                                  onDeleteTransaction(log.id);
                                }
                              }}
                              className="px-2.5 py-1 text-rose-600 hover:bg-rose-50 rounded-lg text-[10px] font-bold flex items-center gap-1 border border-rose-100 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>{lang === 'en' ? 'Delete' : lang === 'ar' ? 'حذف' : 'سڕینەوە'}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Desktop Internal Transfer Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-xs text-right text-gray-600">
                      <thead className="bg-gray-50 text-gray-550 border-b border-gray-100 font-semibold">
                        <tr>
                          <th className="px-3 py-3 text-center">{lang === 'en' ? 'Code' : lang === 'ar' ? 'الكود المرجعي' : 'کۆدی مرجع'}</th>
                          <th className="px-3 py-3 text-center">{lang === 'en' ? 'Date & Time' : lang === 'ar' ? 'التاريخ والوقت' : 'بەروار و کات'}</th>
                          <th className="px-4 py-3 text-right">{lang === 'en' ? 'Sender Account' : lang === 'ar' ? 'حساب المرسل' : 'هەژماری نێرەر'}</th>
                          <th className="px-4 py-3 text-right">{lang === 'en' ? 'Receiver Account' : lang === 'ar' ? 'حساب المستلم' : 'هەژماری وەرگر'}</th>
                          <th className="px-4 py-3 text-left">{lang === 'en' ? 'Amount' : lang === 'ar' ? 'المبلغ المحول' : 'بڕی گوازراوە'}</th>
                          <th className="px-3 py-3 text-center">{lang === 'en' ? 'Operator' : lang === 'ar' ? 'المنفذ' : 'ئەنجامدەر'}</th>
                          <th className="px-4 py-3 text-right">{lang === 'en' ? 'Notes' : lang === 'ar' ? 'الملاحظات' : 'تێبینی'}</th>
                          {onDeleteTransaction && <th className="px-3 py-3 text-center no-print">{lang === 'en' ? 'Action' : lang === 'ar' ? 'الإجراء' : 'کردار'}</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-150 font-medium">
                        {filteredInternalTransferLogs.map(log => (
                          <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-3 py-3 text-center font-mono font-bold text-primary">
                              {log.id}
                            </td>
                            <td className="px-3 py-3 text-center font-mono text-[11px] text-gray-500">
                              {formatKurdishDateTime(log.timestamp)}
                            </td>
                            <td className="px-4 py-3 font-bold text-gray-900">
                              {log.senderName}
                            </td>
                            <td className="px-4 py-3 font-bold text-gray-900">
                              {log.receiverName}
                            </td>
                            <td className="px-4 py-3 font-mono font-bold text-left text-emerald-600">
                              {formatMoney(log.amount, log.currency)}
                            </td>
                            <td className="px-3 py-3 text-center font-mono text-[11px] text-gray-500">
                              {log.performedBy}
                            </td>
                            <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
                              {log.notes || '—'}
                            </td>
                            {onDeleteTransaction && (
                              <td className="px-3 py-3 text-center no-print">
                                <button
                                  onClick={() => {
                                    if (window.confirm(lang === 'en' ? 'Are you sure you want to delete this internal transfer?' : lang === 'ar' ? 'هل أنت متأكد من حذف هذا التحويل الداخلي؟' : 'دڵنیایت لە سڕینەوەی ئەم گواستنەوە ناوخۆییە؟')) {
                                      onDeleteTransaction(log.id);
                                    }
                                  }}
                                  className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  title={lang === 'en' ? 'Delete' : lang === 'ar' ? 'حذف' : 'سڕینەوە'}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

        </div>
      )}


      {/* ======================= TAB 3: TRANSFERS ======================= */}
      {activeTab === 'transfers' && (
        <div className="space-y-6">

          {/* Sub-tab Navigation (Active Transfers vs. Cancelled Transfers) */}
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3 overflow-x-auto no-print">
            <button
              onClick={() => setTransferSubTab('transfers')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                transferSubTab === 'transfers'
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>{lang === 'en' ? 'Active & Delivered Transfers' : lang === 'ar' ? 'الحوالات النشطة والمسلمة' : 'ڕاپۆرتی حەواڵە چالاک و گەیەندراوەکان'}</span>
              {allTransfersReport.length > 0 && (
                <span className={`px-2 py-0.5 text-[10px] font-mono rounded-full font-bold ${
                  transferSubTab === 'transfers' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
                }`}>
                  {allTransfersReport.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setTransferSubTab('cancelled')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                transferSubTab === 'cancelled'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100/70 border border-rose-200/60'
              }`}
            >
              <Ban className="w-4 h-4 text-rose-500" />
              <span>{lang === 'en' ? 'Cancelled Transfers' : lang === 'ar' ? 'الحوالات الملغاة' : 'ڕاپۆرتی حەواڵە هەڵوەشاوەکان'}</span>
              {cancelledFastTransfers.length > 0 && (
                <span className={`px-2 py-0.5 text-[10px] font-mono rounded-full font-bold ${
                  transferSubTab === 'cancelled' ? 'bg-white/20 text-white' : 'bg-rose-200 text-rose-900'
                }`}>
                  {cancelledFastTransfers.length}
                </span>
              )}
            </button>
          </div>

          {/* SUB-VIEW 1: ACTIVE & DELIVERED TRANSFERS */}
          {transferSubTab === 'transfers' && (
            <div className="space-y-6">
              {/* Detailed Profits Analytics and Stats card! */}
              <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-5 rounded-2xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold flex items-center gap-1.5 text-white">
                    <DollarSign className="w-5 h-5" />
                    <span>
                      {lang === 'en' ? 'Detailed Analysis of Transfer Profits (Spread & Fee Commission)' : lang === 'ar' ? 'تحليل تفصيلي لأرباح الحوالات (فارق السعر والعمولة)' : 'شیکاری وردی قازانجەکانی حەواڵەکردن (ماتماتیکی سپرێد و کۆمسیۆن)'}
                    </span>
                  </h3>
                  <p className="text-[11px] text-white/80 mt-1">
                    {lang === 'en' ? 'Summary of report profits from all standard standard transfers and fast sent transfers.' : lang === 'ar' ? 'خلاصة أرباح التقرير من جميع الحوالات القياسية العادية والحوالات السريعة المرسلة.' : 'پوختەی قازانجی ڕاپۆرت لە تەواوی حەواڵە ئاساییە ستانداردەکان و حەواڵە خێرا نێردراوەکانی تەقاو پیاو.'}
                  </p>
                </div>
                
                <div className="bg-black/10 p-3 px-5 rounded-xl border border-white/10 text-right">
                  <span className="text-[10px] text-white/70 block font-semibold">
                    {lang === 'en' ? 'Estimated Total Profit Value' : lang === 'ar' ? 'إجمالي قيمة الأرباح المقدرة' : 'کۆی بەهای خەمڵێنراو لە قازانجەکان'}
                  </span>
                  <span className="text-xl font-black font-mono">{totalTransferProfitsEstIQD.toLocaleString()} IQD</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Standard Hawala Profit breakdown table */}
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-3">
                  <h4 className="text-xs font-bold text-gray-700 uppercase rtl:border-r-2 rtl:pr-2 ltr:border-l-2 ltr:pl-2 border-primary">
                    {lang === 'en' ? 'Standard Hawala Spread Profit' : lang === 'ar' ? 'ربح فارق أسعار الحوالة القياسية' : 'قازانجی سپرێدی حەواڵەی ستاندارد'}
                  </h4>
                  <p className="text-[10px] text-gray-400 mb-2">
                    {lang === 'en' ? 'These values are generated through customer buy/sell spreads and rate exchange changes:' : lang === 'ar' ? 'هذه القيم تتولد نتيجة لفوارق أسعار الشراء والبيع بين العملاء وتغييرات أسعار الصرف:' : 'ئەم بەهایانە بەهۆی کڕین و فرۆشتنی نێوان کڕیاران و گۆڕینی دۆلاگ دروست بێت:'}
                  </p>
                  
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {standardTransfers.map((st) => (
                      <div key={st.id} className="flex justify-between items-center text-xs p-2.5 bg-gray-50 rounded-lg">
                        <div>
                          <span className="font-mono text-[10px] text-gray-400 font-bold block">{st.id}</span>
                          <span className="font-bold text-gray-800">{st.senderName} ➔ {st.receiverName}</span>
                        </div>
                        <div className="text-left">
                          <span className="font-mono block font-bold text-emerald-600">+{st.profitIQD.toLocaleString()} IQD</span>
                          <span className="text-[9px] text-gray-400 block font-mono">{lang === 'en' ? 'Amt:' : lang === 'ar' ? 'المبلغ:' : 'بڕ:'} ${st.amountUSD.toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                    {standardTransfers.length === 0 && (
                      <p className="text-center text-gray-400 text-[11px] py-4">{t.no_records}</p>
                    )}
                  </div>
                </div>

                {/* Fast Transfer Fee commission breakdown table */}
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-3">
                  <h4 className="text-xs font-bold text-gray-700 uppercase rtl:border-r-2 rtl:pr-2 ltr:border-l-2 ltr:pl-2 border-emerald-500">
                    {lang === 'en' ? 'Fast Hawala Fee Profit (Cash)' : lang === 'ar' ? 'أرباح رسوم الحوالة السريعة (نقدي)' : 'قازانجی کرێی حەواڵەی خێرا (کاش)'}
                  </h4>
                  <p className="text-[10px] text-gray-400 mb-2">
                    {lang === 'en' ? 'These values represent direct cash commissions collected from customers at the time of sending:' : lang === 'ar' ? 'تمثل هذه القيم العمولات النقدية المباشرة المستحصلة من العملاء وقت الإرسال:' : 'ئەم بەهایانە کۆمسیۆنی کاشی ڕاستەوخۆن کە لە کاتی ناردندا لە کڕیار وەردەگیرێن:'}
                  </p>
                  
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {fastTransfers.filter(ft => ft.status !== 'Cancelled').map((ft) => (
                      <div key={ft.id} className="flex justify-between items-center text-xs p-2.5 bg-gray-50 rounded-lg">
                        <div>
                          <span className="font-mono text-[10px] text-gray-400 font-bold block">{ft.id}</span>
                          <span className="font-bold text-gray-800">{ft.senderName} ➔ {ft.receiverName}</span>
                        </div>
                        <div className="text-left font-mono">
                          <span className="font-bold text-emerald-600 block">+{formatMoney(ft.fee, ft.currency)}</span>
                          <span className="text-[9px] text-gray-400 block">{lang === 'en' ? 'Amt:' : lang === 'ar' ? 'المبلغ:' : 'بڕ:'} {formatMoney(ft.amount, ft.currency)}</span>
                        </div>
                      </div>
                    ))}
                    {fastTransfers.filter(ft => ft.status !== 'Cancelled').length === 0 && (
                      <p className="text-center text-gray-400 text-[11px] py-4">{t.no_records}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Core Master Transfers list */}
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-gray-55 pb-3 justify-between">
                  <h3 className="text-xs font-extrabold text-gray-900 select-none flex items-center gap-1 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                    <BookOpen className="w-4 h-4 text-primary" />
                    <span>
                      {lang === 'en' ? 'All Transfer Records & Combined Profits' : lang === 'ar' ? 'سجل الحوالات الشامل والأرباح المشتركة' : 'سەرجەم تۆماری حەواڵەکان و قازانجە هاوبەشەکان'}
                    </span>
                  </h3>
                  
                  <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100 no-print w-64">
                    <Search className="w-3.5 h-3.5 text-gray-400" />
                    <input
                      type="text"
                      placeholder={lang === 'en' ? 'Search by code, sender, receiver or notes...' : lang === 'ar' ? 'البحث عن طريق الكود، المرسل، المستلم أو الملاحظات...' : 'گەڕان بەدوای کۆد، نێرەر، وەرگر یان تێبینی...'}
                      value={transferSearch}
                      onChange={(e) => setTransferSearch(e.target.value)}
                      className="bg-transparent text-[11px] w-full focus:outline-none placeholder-gray-450 text-right"
                    />
                  </div>
                </div>

                {/* Mobile Master Transfers view */}
                <div className="md:hidden divide-y divide-gray-100 p-1 bg-white">
                  {filteredTransfers.map((item) => (
                    <div key={item.id} className="p-4 space-y-3 hover:bg-gray-50/20 transition-colors text-right" dir={lang === 'en' ? 'ltr' : 'rtl'}>
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-mono text-[11px] font-bold text-gray-950">{item.id}</span>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                          item.rowType === 'Standard' ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          {item.rowType === 'Standard' 
                            ? (lang === 'en' ? 'Standard Transfer' : lang === 'ar' ? 'حوالة قياسية' : 'حەواڵەی ستاندارد') 
                            : (lang === 'en' ? 'Fast Transfer' : lang === 'ar' ? 'حوالة سريعة' : 'حەواڵەی خێرا')}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] font-medium">
                        <div>
                          <span className="text-gray-405 block text-[9px]">{lang === 'en' ? 'Sender' : lang === 'ar' ? 'المرسل' : 'نێرەر'}</span>
                          <p className="font-bold text-gray-900">{item.senderName}</p>
                        </div>
                        <div>
                          <span className="text-gray-405 block text-[9px]">{lang === 'en' ? 'Receiver' : lang === 'ar' ? 'المستلم' : 'وەرگر'}</span>
                          {item.rowType === 'Fast' ? (
                            <div className="space-y-0.5">
                              <p className="font-bold text-gray-900">{item.receiverName}</p>
                              {(item.rawItem as FastTransferDetails).status === 'Delivered' ? (
                                (item.rawItem as FastTransferDetails).isOfficeDelivery ? (
                                  <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[9px] font-extrabold">
                                    <span>{lang === 'en' ? 'Bureau:' : lang === 'ar' ? 'المكتب:' : 'نووسینگە:'}</span>
                                    <span>{(item.rawItem as FastTransferDetails).officeName}</span>
                                    {(item.rawItem as FastTransferDetails).deliveryReceiverName && (
                                      <span className="text-gray-500 font-normal">({(item.rawItem as FastTransferDetails).deliveryReceiverName})</span>
                                    )}
                                  </div>
                                ) : (
                                  <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 text-[9px] font-extrabold">
                                    <span>{lang === 'en' ? 'Personal:' : lang === 'ar' ? 'شخصي:' : 'کەسی:'}</span>
                                    <span>{(item.rawItem as FastTransferDetails).deliveryReceiverName || item.receiverName}</span>
                                  </div>
                                )
                              ) : (
                                <span className="inline-block px-1.5 py-0.5 rounded bg-yellow-50 text-yellow-800 border border-yellow-200 text-[9px] font-bold">
                                  {lang === 'en' ? 'Pending Payout' : lang === 'ar' ? 'قيد الانتظار' : 'لە چاوەڕوانیدایە'}
                                </span>
                              )}
                            </div>
                          ) : (
                            <p className="font-bold text-gray-900">{item.receiverName}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-2.5 border-t border-gray-100/50">
                        <div>
                          <span className="text-gray-405 text-[9px] block font-semibold">{lang === 'en' ? 'Amount' : lang === 'ar' ? 'المبلغ' : 'بڕ'}</span>
                          <span className="font-mono font-bold text-[11px] text-gray-900">{item.amountText}</span>
                        </div>
                        <div className="text-left">
                          <span className="text-gray-405 text-[9px] block font-semibold">{lang === 'en' ? 'Profit' : lang === 'ar' ? 'الربح' : 'قازانج'}</span>
                          <span className="font-mono font-extrabold text-[11px] text-emerald-600">{item.profitText}</span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-2 text-[10px] text-gray-450 font-mono">
                        <span>{formatKurdishDateTime(item.timestamp)}</span>
                        <div className="flex items-center gap-1.5 no-print">
                          {onPrintReceipt && (
                            <button
                              onClick={() => onPrintReceipt(item.rowType, item.rawItem)}
                              className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer"
                              title={lang === 'en' ? 'Print Receipt' : lang === 'ar' ? 'طباعة الوصل' : 'چاپکردنی وەسڵ'}
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              if (item.rowType === 'Fast') {
                                handleOpenEditFast(item.rawItem as FastTransferDetails);
                              } else {
                                handleOpenEditStandard(item.rawItem as StandardTransferDetails);
                              }
                            }}
                            className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer"
                            title={lang === 'en' ? 'Edit Transfer' : lang === 'ar' ? 'تعديل الحوالة' : 'دەستکاریکردنی حەواڵە'}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteTransferItem(item)}
                            className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title={lang === 'en' ? 'Delete Transfer' : lang === 'ar' ? 'حذف الحوالة' : 'سڕینەوەی حەواڵە'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Master Transfers table view */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-xs text-right text-gray-600">
                    <thead className="bg-gray-50 text-gray-550 border-b border-gray-100 font-semibold">
                      <tr>
                        <th className="px-3 py-2.5 text-center">
                          {lang === 'en' ? 'Transfer Code' : lang === 'ar' ? 'رمز الحوالة' : 'کۆدی حەواڵە'}
                        </th>
                        <th className="px-3 py-2.5 text-center">
                          {lang === 'en' ? 'Movement Type' : lang === 'ar' ? 'نوع الحركة' : 'جۆری جووڵە'}
                        </th>
                        <th className="px-3 py-2.5">
                          {lang === 'en' ? 'Sender Name (Depositor)' : lang === 'ar' ? 'اسم المرسل (المودع)' : 'ناوی نێرەر (سپارەر)'}
                        </th>
                        <th className="px-3 py-2.5">
                          {lang === 'en' ? 'Cash Receiver Name' : lang === 'ar' ? 'اسم مستلم النقد' : 'ناوی وەرگری کاش'}
                        </th>
                        <th className="px-3 py-2.5">
                          {lang === 'en' ? 'Moved Amount' : lang === 'ar' ? 'المبلغ المحول' : 'بڕی جوڵاندراو'}
                        </th>
                        <th className="px-3 py-2.5 text-left">
                          {lang === 'en' ? 'Earned Profit' : lang === 'ar' ? 'الربح المكتسب' : 'قازانجی دەستکەوتووە'}
                        </th>
                        <th className="px-3 py-2.5 text-center">
                          {lang === 'en' ? 'Date' : lang === 'ar' ? 'التاريخ' : 'ڕێکەوت'}
                        </th>
                        <th className="px-2 py-2.5 text-center no-print">{lang === 'en' ? 'Actions' : lang === 'ar' ? 'الإجراءات' : 'کردارەکان'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-150 font-medium whitespace-nowrap">
                      {filteredTransfers.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-3 py-3 text-center font-mono font-bold text-gray-900">{item.id}</td>
                          <td className="px-3 py-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              item.rowType === 'Standard' ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700'
                            }`}>
                              {item.rowType === 'Standard' 
                                ? (lang === 'en' ? 'Standard Transfer' : lang === 'ar' ? 'حوالة قياسية' : 'حەواڵەی ستاندارد') 
                                : (lang === 'en' ? 'Fast Transfer' : lang === 'ar' ? 'حوالة سريعة' : 'حەواڵەی خێرا')}
                            </span>
                          </td>
                          <td className="px-3 py-3 font-bold text-gray-800">{item.senderName}</td>
                          <td className="px-3 py-3">
                            {item.rowType === 'Fast' ? (
                              <div className="space-y-0.5">
                                <span className="font-bold text-gray-900 block">{item.receiverName}</span>
                                {(item.rawItem as FastTransferDetails).status === 'Delivered' ? (
                                  (item.rawItem as FastTransferDetails).isOfficeDelivery ? (
                                    <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-extrabold">
                                      <span>{lang === 'en' ? 'Bureau:' : lang === 'ar' ? 'المكتب:' : 'نووسینگە:'}</span>
                                      <span>{(item.rawItem as FastTransferDetails).officeName}</span>
                                      {(item.rawItem as FastTransferDetails).deliveryReceiverName && (
                                        <span className="text-gray-500 font-normal">({(item.rawItem as FastTransferDetails).deliveryReceiverName})</span>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-extrabold">
                                      <span>{lang === 'en' ? 'Personal:' : lang === 'ar' ? 'شخصي:' : 'کەسی:'}</span>
                                      <span>{(item.rawItem as FastTransferDetails).deliveryReceiverName || item.receiverName}</span>
                                    </div>
                                  )
                                ) : (
                                  <span className="inline-block px-1.5 py-0.5 rounded bg-yellow-50 text-yellow-800 border border-yellow-200 text-[10px] font-bold">
                                    {lang === 'en' ? 'Pending Payout' : lang === 'ar' ? 'قيد الانتظار' : 'لە چاوەڕوانیدایە'}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="font-bold text-gray-900">{item.receiverName}</span>
                            )}
                          </td>
                          <td className="px-3 py-3 font-mono font-bold text-gray-900">{item.amountText}</td>
                          <td className="px-3 py-3 font-mono font-bold text-emerald-600 text-left">
                            {item.profitText}
                          </td>
                          <td className="px-3 py-3 text-center font-mono text-gray-400 text-[10px]">
                            {formatKurdishDateTime(item.timestamp)}
                          </td>
                          <td className="px-2 py-3 text-center no-print">
                            <div className="flex items-center gap-1.5 justify-center">
                              {onPrintReceipt && (
                                <button
                                  onClick={() => onPrintReceipt(item.rowType, item.rawItem)}
                                  className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer"
                                  title={lang === 'en' ? 'Print Receipt' : lang === 'ar' ? 'طباعة الوصل' : 'چاپکردنی وەسڵ'}
                                >
                                  <FileText className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  if (item.rowType === 'Fast') {
                                    handleOpenEditFast(item.rawItem as FastTransferDetails);
                                  } else {
                                    handleOpenEditStandard(item.rawItem as StandardTransferDetails);
                                  }
                                }}
                                className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer"
                                title={lang === 'en' ? 'Edit Transfer' : lang === 'ar' ? 'تعديل الحوالة' : 'دەستکاریکردنی حەواڵە'}
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteTransferItem(item)}
                                className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title={lang === 'en' ? 'Delete Transfer' : lang === 'ar' ? 'حذف الحوالة' : 'سڕینەوەی حەواڵە'}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SUB-VIEW 2: DEDICATED CANCELLED TRANSFERS REPORT */}
          {transferSubTab === 'cancelled' && (
            <div className="space-y-6">
              {/* Cancelled Transfers Analytics Header Banner */}
              <div className="bg-gradient-to-r from-rose-600 via-rose-700 to-red-800 text-white p-5 rounded-2xl flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-sm">
                <div>
                  <h3 className="text-sm font-bold flex items-center gap-2 text-white">
                    <Ban className="w-5 h-5 text-white" />
                    <span>
                      {lang === 'en' ? 'Cancelled Fast Transfers & Refunded Amounts Report' : lang === 'ar' ? 'تقرير الحوالات السريعة الملغاة والمبالغ المسترجعة' : 'ڕاپۆرتی حەواڵە خێرا هەڵوەشاوەکان و بڕی پارە گەڕێنراوەکان'}
                    </span>
                  </h3>
                  <p className="text-[11px] text-white/85 mt-1">
                    {lang === 'en' ? 'All fast transfers that were cancelled. The principal amounts and fees were fully credited back to the customer accounts.' : lang === 'ar' ? 'جميع الحوالات السريعة التي تم إلغاؤها. تم استرجاع المبالغ والرسوم بالكامل إلى حسابات العملاء.' : 'سەرجەم ئەو حەواڵە خێرایانەی کە هەڵوەشاونەتەوە و تەواوی بڕی پارەکە لەگەڵ کرێکەی بۆ سەر باڵانسی نێرەر (کڕیار) گەڕێنراوەتەوە.'}
                  </p>
                </div>

                <div className="bg-black/20 backdrop-blur-xs p-3 px-5 rounded-xl border border-white/10 text-right shrink-0">
                  <span className="text-[10px] text-white/70 block font-semibold">
                    {lang === 'en' ? 'Total Cancelled Count' : lang === 'ar' ? 'إجمالي الحوالات الملغاة' : 'کۆی حەواڵە هەڵوەشاوەکان'}
                  </span>
                  <span className="text-xl font-black font-mono">{cancelledFastTransfers.length}</span>
                </div>
              </div>

              {/* Currency-wise Summary Cards */}
              {Object.keys(cancelledSummaryByCurrency.fullRefundTotals).length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Object.entries(cancelledSummaryByCurrency.fullRefundTotals).map(([cur, fullAmt]: [string, number]) => {
                    const principalAmt = cancelledSummaryByCurrency.principalTotals[cur] || 0;
                    const feeAmt = cancelledSummaryByCurrency.feeTotals[cur] || 0;
                    return (
                      <div key={cur} className="bg-white p-4 rounded-xl border border-rose-100 shadow-xs space-y-2.5">
                        <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                          <span className="font-extrabold text-xs text-gray-900 flex items-center gap-1.5">
                            <span className="bg-rose-100 text-rose-800 font-mono px-2 py-0.5 rounded font-bold text-xs">
                              {cur}
                            </span>
                            <span>{lang === 'en' ? 'Refunded Currency Summary' : lang === 'ar' ? 'ملخص الاسترجاع بالعملة' : 'پوختەی گەڕێنراوەکان'}</span>
                          </span>
                        </div>

                        <div className="space-y-1.5 font-mono text-xs">
                          <div className="flex justify-between items-center bg-gray-50 px-3 py-1.5 rounded-lg">
                            <span className="text-[11px] font-sans text-gray-600">
                              {lang === 'en' ? 'Principal Refunded:' : lang === 'ar' ? 'المبلغ الأصلي المسترجع:' : 'بڕی سەرەکی گەڕێنراوە:'}
                            </span>
                            <span className="font-bold text-gray-800">
                              {formatMoney(principalAmt, cur)}
                            </span>
                          </div>

                          <div className="flex justify-between items-center bg-gray-50 px-3 py-1.5 rounded-lg">
                            <span className="text-[11px] font-sans text-gray-600">
                              {lang === 'en' ? 'Fee Refunded:' : lang === 'ar' ? 'الرسوم المسترجعة:' : 'کرێی گەڕێنراوە:'}
                            </span>
                            <span className="font-bold text-amber-700">
                              {formatMoney(feeAmt, cur)}
                            </span>
                          </div>

                          <div className="flex justify-between items-center bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200/60">
                            <span className="text-[11px] font-sans font-bold text-rose-950">
                              {lang === 'en' ? 'Total Credited to Senders:' : lang === 'ar' ? 'إجمالي المضاف للمرسلين:' : 'کۆی گشتی باڵانسی گەڕاوە:'}
                            </span>
                            <span className="font-bold text-rose-700">
                              {formatMoney(fullAmt, cur)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Cancelled Transfers Table / List */}
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-gray-100 pb-3 justify-between">
                  <h3 className="text-xs font-extrabold text-gray-900 select-none flex items-center gap-1.5 bg-rose-50 text-rose-900 px-3 py-1.5 rounded-lg border border-rose-100">
                    <Ban className="w-4 h-4 text-rose-600" />
                    <span>
                      {lang === 'en' ? 'Cancelled Fast Hawala Log' : lang === 'ar' ? 'سجل الحوالات السريعة الملغاة' : 'تۆماری حەواڵە خێرا هەڵوەشاوەکان'}
                    </span>
                  </h3>
                  
                  <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100 no-print w-72">
                    <Search className="w-3.5 h-3.5 text-gray-400" />
                    <input
                      type="text"
                      placeholder={lang === 'en' ? 'Search by code, sender, receiver, reason...' : lang === 'ar' ? 'البحث بالكود، المرسل، المستلم، السبب...' : 'گەڕان بەدوای کۆد، نێرەر، وەرگر، هۆکار...'}
                      value={cancelledTransferSearch}
                      onChange={(e) => setCancelledTransferSearch(e.target.value)}
                      className="bg-transparent text-[11px] w-full focus:outline-none placeholder-gray-450 text-right"
                    />
                  </div>
                </div>

                {filteredCancelledTransfers.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                    <Ban className="w-8 h-8 mx-auto mb-2 opacity-30 text-rose-500" />
                    <p className="text-xs font-semibold">
                      {lang === 'en' ? 'No cancelled transfers found in this range' : lang === 'ar' ? 'لا توجد حوالات ملغاة في هذه الفترة' : 'هیچ حەواڵەیەکی هەڵوەشاوە نەدۆزرایەوە لەم بەروارەدا'}
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Mobile Cancelled Transfers Cards */}
                    <div className="md:hidden divide-y divide-gray-100 p-1 bg-white">
                      {filteredCancelledTransfers.map((ft) => {
                        const totalRefund = (ft.amount || 0) + (ft.fee || 0);
                        return (
                          <div key={ft.id} className="p-4 space-y-3 hover:bg-rose-50/10 transition-colors text-right" dir={lang === 'en' ? 'ltr' : 'rtl'}>
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-mono text-[11px] font-bold text-gray-950">{ft.id}</span>
                              <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                {lang === 'en' ? 'Cancelled / Refunded' : lang === 'ar' ? 'ملغاة / تم الاسترجاع' : 'هەڵوەشاوەتەوە / پارە گەڕێنراوە'}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-[11px] font-medium bg-gray-50/80 p-2.5 rounded-lg border border-gray-100">
                              <div>
                                <span className="text-gray-400 block text-[9px] font-semibold">{lang === 'en' ? 'Sender (Refunded Account)' : lang === 'ar' ? 'المرسل (المسترجع له)' : 'نێرەر (پارە بۆ هەژماری گەڕاوەتەوە)'}</span>
                                <p className="font-bold text-gray-900">{ft.senderName}</p>
                              </div>
                              <div>
                                <span className="text-gray-400 block text-[9px] font-semibold">{lang === 'en' ? 'Intended Receiver' : lang === 'ar' ? 'المستلم المقصود' : 'وەرگری مەبەست'}</span>
                                <p className="font-bold text-gray-900">{ft.receiverName}</p>
                                {ft.receiverPhone && <p className="text-[10px] text-gray-500 font-mono">{ft.receiverPhone}</p>}
                              </div>
                            </div>

                            {/* Financial breakdown */}
                            <div className="bg-rose-50/50 p-2.5 rounded-lg border border-rose-100 space-y-1 text-[11px] font-mono">
                              <div className="flex justify-between text-gray-600">
                                <span className="font-sans">{lang === 'en' ? 'Principal:' : lang === 'ar' ? 'المبلغ الأصلي:' : 'بڕی سەرەکی:'}</span>
                                <span className="font-bold">{formatMoney(ft.amount, ft.currency)}</span>
                              </div>
                              <div className="flex justify-between text-gray-600">
                                <span className="font-sans">{lang === 'en' ? 'Fee Refunded:' : lang === 'ar' ? 'الرسوم المسترجعة:' : 'کرێی گەڕێنراوە:'}</span>
                                <span className="font-bold text-amber-700">+{formatMoney(ft.fee, ft.currency)}</span>
                              </div>
                              <div className="flex justify-between text-rose-900 pt-1 border-t border-rose-200/60 font-bold">
                                <span className="font-sans">{lang === 'en' ? 'Total Refunded to Balance:' : lang === 'ar' ? 'إجمالي الرصيد المعاد:' : 'کۆی گشتی باڵانسی گەڕاوە:'}</span>
                                <span className="text-xs">{formatMoney(totalRefund, ft.currency)}</span>
                              </div>
                            </div>

                            {/* Cancellation metadata */}
                            {(ft.cancelReason || ft.cancelledBy) && (
                              <div className="text-[10px] text-gray-600 bg-gray-50 p-2 rounded border border-gray-100 space-y-0.5">
                                {ft.cancelReason && (
                                  <p>
                                    <span className="font-semibold text-rose-700">{lang === 'en' ? 'Reason: ' : lang === 'ar' ? 'السبب: ' : 'هۆکار: '}</span>
                                    {ft.cancelReason}
                                  </p>
                                )}
                                {ft.cancelledBy && (
                                  <p>
                                    <span className="font-semibold text-gray-500">{lang === 'en' ? 'Cancelled by: ' : lang === 'ar' ? 'ألغيت بواسطة: ' : 'هەڵوەشێنراوە لەلایەن: '}</span>
                                    {ft.cancelledBy}
                                  </p>
                                )}
                              </div>
                            )}

                            <div className="flex justify-between items-center pt-2 text-[10px] text-gray-450 font-mono">
                              <div>
                                <span>{lang === 'en' ? 'Created: ' : lang === 'ar' ? 'تاريخ الإنشاء: ' : 'نێردراو: '}{formatKurdishDateTime(ft.createdAt)}</span>
                                {ft.cancelledAt && (
                                  <span className="block text-rose-600">{lang === 'en' ? 'Cancelled: ' : lang === 'ar' ? 'تاريخ الإلغاء: ' : 'هەڵوەشاو: '}{formatKurdishDateTime(ft.cancelledAt)}</span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 no-print">
                                {onPrintReceipt && (
                                  <button
                                    onClick={() => onPrintReceipt('Fast', ft)}
                                    className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer"
                                    title={lang === 'en' ? 'Print Receipt' : lang === 'ar' ? 'طباعة الوصل' : 'چاپکردنی وەسڵ'}
                                  >
                                    <FileText className="w-4 h-4" />
                                  </button>
                                )}
                                <button
                                  onClick={() => onDeleteFastTransfer && onDeleteFastTransfer(ft.id)}
                                  className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  title={lang === 'en' ? 'Delete Record' : lang === 'ar' ? 'حذف السجل' : 'سڕینەوەی تۆمار'}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Desktop Cancelled Transfers Table */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-xs text-right text-gray-600">
                        <thead className="bg-rose-50/70 text-rose-950 border-b border-rose-100 font-semibold">
                          <tr>
                            <th className="px-3 py-2.5 text-center">
                              {lang === 'en' ? 'Transfer Code' : lang === 'ar' ? 'رمز الحوالة' : 'کۆدی حەواڵە'}
                            </th>
                            <th className="px-3 py-2.5">
                              {lang === 'en' ? 'Sender (Refunded)' : lang === 'ar' ? 'المرسل (المسترجع له)' : 'نێرەر (پارە بۆ هەژماری گەڕاوەتەوە)'}
                            </th>
                            <th className="px-3 py-2.5">
                              {lang === 'en' ? 'Intended Receiver' : lang === 'ar' ? 'المستلم المقصود' : 'وەرگری مەبەست'}
                            </th>
                            <th className="px-3 py-2.5">
                              {lang === 'en' ? 'Principal Amount' : lang === 'ar' ? 'المبلغ الأصلي' : 'بڕی سەرەکی'}
                            </th>
                            <th className="px-3 py-2.5">
                              {lang === 'en' ? 'Refunded Fee' : lang === 'ar' ? 'الرسوم المسترجعة' : 'کرێی گەڕێنراوە'}
                            </th>
                            <th className="px-3 py-2.5">
                              {lang === 'en' ? 'Total Refunded to Balance' : lang === 'ar' ? 'إجمالي الرصيد المعاد' : 'کۆی گشتی باڵانسی گەڕاوە'}
                            </th>
                            <th className="px-3 py-2.5">
                              {lang === 'en' ? 'Cancellation Reason' : lang === 'ar' ? 'سبب الإلغاء' : 'هۆکاری هەڵوەشاندنەوە'}
                            </th>
                            <th className="px-3 py-2.5 text-center">
                              {lang === 'en' ? 'Operator' : lang === 'ar' ? 'الموظف' : 'کارمەند'}
                            </th>
                            <th className="px-3 py-2.5 text-center">
                              {lang === 'en' ? 'Date' : lang === 'ar' ? 'التاريخ' : 'ڕێکەوت'}
                            </th>
                            <th className="px-2 py-2.5 text-center no-print">
                              {lang === 'en' ? 'Actions' : lang === 'ar' ? 'الإجراءات' : 'کردارەکان'}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-150 font-medium whitespace-nowrap">
                          {filteredCancelledTransfers.map((ft) => {
                            const totalRefund = (ft.amount || 0) + (ft.fee || 0);
                            return (
                              <tr key={ft.id} className="hover:bg-rose-50/20 transition-colors">
                                <td className="px-3 py-3 text-center font-mono font-bold text-gray-900">
                                  <span className="bg-rose-50 text-rose-700 px-2 py-0.5 rounded border border-rose-200">
                                    {ft.id}
                                  </span>
                                </td>
                                <td className="px-3 py-3 font-bold text-gray-900">{ft.senderName}</td>
                                <td className="px-3 py-3">
                                  <span className="font-bold text-gray-800 block">{ft.receiverName}</span>
                                  {ft.receiverPhone && <span className="text-[10px] text-gray-400 font-mono block">{ft.receiverPhone}</span>}
                                </td>
                                <td className="px-3 py-3 font-mono font-bold text-gray-900">
                                  {formatMoney(ft.amount, ft.currency)}
                                </td>
                                <td className="px-3 py-3 font-mono font-bold text-amber-700">
                                  +{formatMoney(ft.fee, ft.currency)}
                                </td>
                                <td className="px-3 py-3 font-mono font-extrabold text-rose-700">
                                  {formatMoney(totalRefund, ft.currency)}
                                </td>
                                <td className="px-3 py-3 text-gray-700 max-w-[200px] truncate" title={ft.cancelReason || ft.notes}>
                                  {ft.cancelReason || ft.notes || '-'}
                                </td>
                                <td className="px-3 py-3 text-center font-bold text-gray-600">
                                  {ft.cancelledBy || '-'}
                                </td>
                                <td className="px-3 py-3 text-center font-mono text-gray-400 text-[10px]">
                                  <div>{formatKurdishDateTime(ft.createdAt)}</div>
                                  {ft.cancelledAt && (
                                    <div className="text-rose-600">{formatKurdishDateTime(ft.cancelledAt)}</div>
                                  )}
                                </td>
                                <td className="px-2 py-3 text-center no-print">
                                  <div className="flex items-center gap-1.5 justify-center">
                                    {onPrintReceipt && (
                                      <button
                                        onClick={() => onPrintReceipt('Fast', ft)}
                                        className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer"
                                        title={lang === 'en' ? 'Print Receipt' : lang === 'ar' ? 'طباعة الوصل' : 'چاپکردنی وەسڵ'}
                                      >
                                        <FileText className="w-4 h-4" />
                                      </button>
                                    )}
                                    <button
                                      onClick={() => onDeleteFastTransfer && onDeleteFastTransfer(ft.id)}
                                      className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                      title={lang === 'en' ? 'Delete Record' : lang === 'ar' ? 'حذف السجل' : 'سڕینەوەی تۆمار'}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
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
              </div>
            </div>
          )}

        </div>
      )}


      {/* ======================= TAB 4: EXCHANGES ======================= */}
      {activeTab === 'exchanges' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-gray-100 pb-4 no-print">
            <h3 className="text-xs font-extrabold text-gray-900 select-none flex items-center gap-1 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
              <ArrowLeftRight className="w-4 h-4 text-primary" />
              <span>
                {lang === 'en' ? 'Historical Summary of All Currency Exchanges' : lang === 'ar' ? 'ملخص تاريخي لجميع عمليات صرافة العملات' : 'پوختەی تۆماری مێژوویی سەرجەم ئاڵوگۆڕەکانی دراو'}
              </span>
            </h3>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Currency Filter Dropdown Selector */}
              <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-150 w-full sm:w-48">
                <span className="text-[10px] text-gray-450 font-bold whitespace-nowrap">
                  {lang === 'en' ? 'Currency:' : lang === 'ar' ? 'العملة:' : 'دراو:'}
                </span>
                <select
                  value={exchangeCurrencyFilter}
                  onChange={(e) => setExchangeCurrencyFilter(e.target.value)}
                  className="bg-transparent text-xs w-full focus:outline-none font-bold text-gray-800 cursor-pointer text-right appearance-none"
                  style={{ direction: 'rtl' }}
                >
                  <option value="all" className="font-bold text-gray-800">
                    {lang === 'en' ? 'All Currencies' : lang === 'ar' ? 'كافة العملات' : 'سەرجەم دراوەکان'}
                  </option>
                  {currencies.map(cur => (
                    <option key={cur} value={cur} className="font-bold text-gray-800">
                      {cur}
                    </option>
                  ))}
                </select>
              </div>

              {/* Search input */}
              <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-150 w-full lg:w-64">
                <Search className="w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder={lang === 'en' ? 'Search by customer, type or notes...' : lang === 'ar' ? 'البحث بالعميل، النوع أو الملاحظات...' : 'گەڕان بەدوای کڕیار، جۆر یان تێبینی...'}
                  value={exchangeSearch}
                  onChange={(e) => setExchangeSearch(e.target.value)}
                  className="bg-transparent text-[11px] w-full focus:outline-none placeholder-gray-450 text-right font-bold text-gray-800"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right text-gray-600">
              <thead className="bg-gray-50 text-gray-550 border-b border-gray-100 font-semibold">
                <tr>
                  <th className="px-4 py-3 text-center"># ID</th>
                  <th className="px-4 py-3">
                    {lang === 'en' ? 'Date & Time' : lang === 'ar' ? 'التاريخ والوقت' : 'بەروار و کات'}
                  </th>
                  <th className="px-4 py-3">
                    {lang === 'en' ? 'Source / Account' : lang === 'ar' ? 'المصدر / الحساب' : 'سەرچاوە / چەندایەتی'}
                  </th>
                  <th className="px-4 py-3">
                    {lang === 'en' ? 'Action' : lang === 'ar' ? 'الإجراء' : 'کردار'}
                  </th>
                  <th className="px-4 py-3">
                    {lang === 'en' ? 'USD Amount ($)' : lang === 'ar' ? 'مبلغ الدولار' : 'بڕی دۆلار (USD)'}
                  </th>
                  <th className="px-4 py-3 text-center">
                    {lang === 'en' ? 'Exchange Rate' : lang === 'ar' ? 'سعر الصرف' : 'تێچووی نرخ'}
                  </th>
                  <th className="px-4 py-3">
                    {lang === 'en' ? 'Exchanged Amount' : lang === 'ar' ? 'المبلغ المقابل الصادر' : 'بڕی بەرامبەر دەرکراو'}
                  </th>
                  <th className="px-4 py-3">
                    {lang === 'en' ? 'Notes' : lang === 'ar' ? 'الملاحظات' : 'تێبینییەکان'}
                  </th>
                  <th className="px-4 py-3">
                    {lang === 'en' ? 'Staff' : lang === 'ar' ? 'الموظف' : 'کارمەند'}
                  </th>
                  <th className="px-2 py-3 text-center no-print">{lang === 'en' ? 'Actions' : lang === 'ar' ? 'الإجراءات' : 'کردارەکان'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150 font-medium text-gray-700 whitespace-nowrap">
                {filteredExchanges.map((tx) => {
                  const isBuy = tx.amount > 0;
                  const absUSD = Math.abs(tx.amount);
                  const otherAmt = Math.abs(tx.targetAmount || 0);
                  const otherCurCode = tx.targetCurrency || 'IQD';

                  return (
                    <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3.5 text-center font-mono font-bold text-gray-450">{tx.id}</td>
                      <td className="px-4 py-3.5 font-mono text-gray-500 text-[10px]">
                        {formatKurdishDateTime(tx.timestamp)}
                      </td>
                      <td className="px-4 py-3.5 font-bold text-gray-900">
                        {tx.customerName || (lang === 'en' ? 'Vault' : lang === 'ar' ? 'الخزينة' : 'Vault (گەنجینە)')}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isBuy ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-blue-50 text-blue-800 border border-blue-100'
                        }`}>
                          {isBuy 
                            ? (lang === 'en' ? 'Buy USD' : lang === 'ar' ? 'شراء دولار' : 'کڕینی دۆلار') 
                            : (lang === 'en' ? 'Sell USD' : lang === 'ar' ? 'بيع دولار' : 'فرۆشتنی دۆلار')}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-mono font-bold text-gray-900">
                        ${absUSD.toLocaleString()} USD
                      </td>
                      <td className="px-4 py-3.5 text-center font-mono text-gray-500 text-[11px]">
                        1 USD = {tx.rate?.toLocaleString()} {otherCurCode}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-primary font-bold">
                        {formatMoney(otherAmt, otherCurCode)}
                      </td>
                      <td className="px-4 py-3.5 text-gray-550 max-w-xs truncate font-normal" title={tx.notes}>
                        {tx.notes || '-'}
                      </td>
                      <td className="px-4 py-3.5 text-gray-500 text-[11px]">{tx.performedBy}</td>
                      <td className="px-2 py-3.5 text-center no-print">
                        {onDeleteTransaction && (
                          <button
                            onClick={() => onDeleteTransaction(tx.id)}
                            className="bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 hover:text-rose-800 font-bold text-[10px] px-2 py-1 rounded transition-all flex items-center gap-1.5 w-fit mx-auto"
                            title={lang === 'en' ? 'Delete this exchange transaction' : lang === 'ar' ? 'حذف وإلغاء عملية صرف العملات هذه' : 'سڕینەوە و هەڵوەشاندنەوەی ئەم ئاڵوگۆڕەی دراو'}
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>{lang === 'en' ? 'Delete' : lang === 'ar' ? 'حذف' : 'سڕینەوە'}</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Currency Specific Summary Bar */}
          {exchangeCurrencyFilter !== 'all' && (
            <div className="mt-6 pt-6 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-6" dir="rtl">
              {/* Total Title */}
              <div className="text-right space-y-1">
                <h4 className="text-[11px] font-bold text-gray-450 uppercase tracking-wider">
                  {lang === 'en' ? `Summary for ${exchangeCurrencyFilter}` : lang === 'ar' ? `ملخص عملة (${exchangeCurrencyFilter})` : `کورتەی کۆی گشتی دراوی (${exchangeCurrencyFilter})`}
                </h4>
                <p className="text-sm font-black text-gray-900">
                  {lang === 'en' ? 'Currency Exchanges Summary' : lang === 'ar' ? 'نشاط عمليات الصرف' : 'کۆی گشتی ئاڵوگۆڕ و کڕین و فرۆشتنی دراو'}
                </p>
              </div>

              {/* Grid of Incoming, Outgoing, and Net Flow */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full md:w-auto sm:min-w-[500px]">
                {/* Total Incoming */}
                <div className="bg-emerald-50/60 border border-emerald-150/50 p-3 rounded-2xl text-right">
                  <span className="text-[10px] text-emerald-600 font-bold block mb-0.5">
                    {lang === 'en' ? 'Total Incoming:' : lang === 'ar' ? 'إجمالي الوارد:' : 'کۆی هاتوو:'}
                  </span>
                  <span className="text-xs sm:text-sm font-black text-emerald-700 font-mono">
                    +{formatMoney(exchangeIncomingFiltered, exchangeCurrencyFilter as any)}
                  </span>
                </div>

                {/* Total Outgoing */}
                <div className="bg-rose-50/60 border border-rose-150/50 p-3 rounded-2xl text-right">
                  <span className="text-[10px] text-rose-600 font-bold block mb-0.5">
                    {lang === 'en' ? 'Total Outgoing:' : lang === 'ar' ? 'إجمالي الصادر:' : 'کۆی ڕۆیشتوو:'}
                  </span>
                  <span className="text-xs sm:text-sm font-black text-rose-700 font-mono">
                    -{formatMoney(exchangeOutgoingFiltered, exchangeCurrencyFilter as any)}
                  </span>
                </div>

                {/* Net Flow */}
                {(() => {
                  const netVal = exchangeIncomingFiltered - exchangeOutgoingFiltered;
                  const isPositive = netVal >= 0;
                  const netBg = isPositive ? 'bg-teal-50/60 border-teal-150/50 text-teal-800' : 'bg-red-50/60 border-red-150/50 text-red-800';
                  return (
                    <div className={`border p-3 rounded-2xl text-right ${netBg}`}>
                      <span className="text-[10px] font-bold block mb-0.5 opacity-80">
                        {lang === 'en' ? 'Net Range Flow:' : lang === 'ar' ? 'صافي التدفق للفترة:' : 'پوختەی جووڵە:'}
                      </span>
                      <span className="text-xs sm:text-sm font-black font-mono">
                        {netVal >= 0 ? '+' : ''}{formatMoney(netVal, exchangeCurrencyFilter as any)}
                      </span>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================= TAB 5: SAFE / TREASURY REPORT ======================= */}
      {activeTab === 'safe' && (
        <div className="space-y-6">
          {/* Safe Reserves Grid */}
          {(() => {
            const hasDateFilter = Boolean((startDate || endDate) && !(startDate === getTodayString() && endDate === getTodayString()));
            
            // Filter out currencies that have zero reserve balance AND zero activity/transactions
            const activeSafeCurrencies = currencies.filter(cur => {
              const currentReserves = appState.safeBalances[cur] || 0;
              const rangeIncoming = safeIncomingTotals[cur] || 0;
              const rangeOutgoing = safeOutgoingTotals[cur] || 0;
              const safeOpeningBal = startDate ? (safeOpeningNet[cur] || 0) : 0;
              const hasHistory = transactions.some(tx => {
                if (!isSafeTx(tx)) return false;
                if (tx.type === 'Exchange') {
                  return tx.targetCurrency === cur || cur === 'USD';
                }
                return tx.currency === cur;
              });
              return currentReserves !== 0 || rangeIncoming !== 0 || rangeOutgoing !== 0 || safeOpeningBal !== 0 || hasHistory;
            });

            const displayCurrencies = activeSafeCurrencies.length > 0 ? activeSafeCurrencies : currencies;

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayCurrencies.map((cur) => {
                  const currentReserves = appState.safeBalances[cur] || 0;
                  const safeOpeningBal = startDate ? (safeOpeningNet[cur] || 0) : 0;
                  const rangeIncoming = safeIncomingTotals[cur] || 0;
                  const rangeOutgoing = safeOutgoingTotals[cur] || 0;
                  const netChange = rangeIncoming - rangeOutgoing;
                  const safePeriodEndingBal = safeOpeningBal + netChange;

                  return (
                    <div key={cur} className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs hover:shadow-md hover:border-gray-300 transition-all duration-200 space-y-3.5">
                      <div className="flex justify-between items-center text-xs font-bold">
                        <span className="text-gray-500 font-medium">
                          {lang === 'en' ? `Vault Reserves (${cur})` : lang === 'ar' ? `احتياطي الخزينة (${cur})` : `گەنجینەی دراوی (${cur})`}
                        </span>
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-800 rounded-lg font-mono font-bold text-[11px] tracking-wide border border-slate-200/60 shadow-2xs">
                          {cur}
                        </span>
                      </div>

                      <div>
                        <div className="flex items-baseline justify-between">
                          <span className="text-[11px] font-semibold text-gray-400">
                            {lang === 'en' ? 'Live Reserve:' : lang === 'ar' ? 'الرصيد الحالي:' : 'باڵانسی ئێستا:'}
                          </span>
                          <p className={`text-2xl font-black font-mono tracking-tight ${currentReserves < 0 ? 'text-rose-600' : 'text-emerald-700'}`} dir="ltr">
                            {formatMoney(currentReserves, cur)}
                          </p>
                        </div>

                        {hasDateFilter && (
                          <div className="mt-3.5 pt-3 border-t border-gray-100 text-xs space-y-2 text-right" dir="rtl">
                            <div className="flex justify-between items-center text-amber-950 font-bold bg-amber-50/90 px-2.5 py-1.5 rounded-xl border border-amber-200/70 shadow-2xs">
                              <span className="text-[11px]">{lang === 'en' ? 'Opening Vault Reserve:' : lang === 'ar' ? 'رصيد الخزينة السابق:' : 'باڵانسی پێشتری گەنجینە:'}</span>
                              <span className="font-mono text-xs" dir="ltr">{formatMoney(safeOpeningBal, cur)}</span>
                            </div>

                            <div className="bg-gray-50/80 p-2 rounded-xl border border-gray-100 space-y-1.5">
                              <div className="flex justify-between items-center text-gray-600">
                                <span className="text-[11px]">{lang === 'en' ? 'Total Incoming:' : lang === 'ar' ? 'إجمالي الوارد:' : 'کۆی گشتی هاتوو:'}</span>
                                <span className="font-mono font-bold text-emerald-600 text-xs" dir="ltr">+{rangeIncoming.toLocaleString()} {cur}</span>
                              </div>
                              <div className="flex justify-between items-center text-gray-600">
                                <span className="text-[11px]">{lang === 'en' ? 'Total Outgoing:' : lang === 'ar' ? 'إجمالي الصادر:' : 'کۆی گشتی ڕۆیشتوو:'}</span>
                                <span className="font-mono font-bold text-rose-600 text-xs" dir="ltr">-{rangeOutgoing.toLocaleString()} {cur}</span>
                              </div>
                              <div className="flex justify-between items-center pt-1 border-t border-dashed border-gray-200">
                                <span className="text-[11px] font-semibold text-gray-700">{lang === 'en' ? 'Net Period Flow:' : lang === 'ar' ? 'صافي التدفق للفترة:' : 'پوختەی جووڵەی وادە:'}</span>
                                <span className={`font-mono font-bold text-xs ${netChange >= 0 ? 'text-emerald-700' : 'text-rose-700'}`} dir="ltr">
                                  {netChange >= 0 ? '+' : ''}{netChange.toLocaleString()} {cur}
                                </span>
                              </div>
                            </div>

                            <div className="flex justify-between items-center text-blue-950 font-bold bg-blue-50/90 px-2.5 py-1.5 rounded-xl border border-blue-200/70 shadow-2xs">
                              <span className="text-[11px]">{lang === 'en' ? 'Period Ending Reserve:' : lang === 'ar' ? 'رصيد نهاية الفترة:' : 'باڵانسی کۆتایی وادە:'}</span>
                              <span className="font-mono text-xs" dir="ltr">{formatMoney(safePeriodEndingBal, cur)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Table container & controls */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
            
            {/* Header controls bar */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 border-b border-gray-100 pb-4 no-print">
              {/* Left movement type filter dropdown */}
              <div className="flex items-center gap-2 bg-gray-50 px-3.5 py-2 rounded-xl border border-gray-150 w-full sm:w-64">
                <Filter className="w-4 h-4 text-gray-400 shrink-0" />
                <span className="text-[11px] text-gray-500 font-bold whitespace-nowrap">
                  {lang === 'en' ? 'Movement Type:' : lang === 'ar' ? 'نوع الحركة:' : 'جۆری جووڵە:'}
                </span>
                <select
                  value={safeFilterType}
                  onChange={(e) => setSafeFilterType(e.target.value)}
                  className="bg-transparent text-xs w-full focus:outline-none font-bold text-gray-800 cursor-pointer text-right appearance-none"
                  style={{ direction: 'rtl' }}
                >
                  <option value="all">{lang === 'en' ? 'All Movements' : lang === 'ar' ? 'كافة الحركات' : 'سەرجەم جووڵەکان'}</option>
                  <option value="safe_adj">{lang === 'en' ? 'Safe Adjustments' : lang === 'ar' ? 'تعديلات الخزينة' : 'گۆڕانکاری گەنجینە'}</option>
                  <option value="deposits">{lang === 'en' ? 'Deposits' : lang === 'ar' ? 'الإيداعات' : 'پارە دانان'}</option>
                  <option value="withdrawals">{lang === 'en' ? 'Withdrawals' : lang === 'ar' ? 'السحوبات' : 'ڕاکێشانەکان'}</option>
                  <option value="exchanges">{lang === 'en' ? 'Exchanges' : lang === 'ar' ? 'عمليات الصرف' : 'کڕین و فرۆشتن'}</option>
                  <option value="deliveries">{lang === 'en' ? 'Deliveries' : lang === 'ar' ? 'تسليم الحوالات' : 'ڕادەستکردنی حەواڵە'}</option>
                </select>
                <ChevronDown className="w-4 h-4 text-gray-400 shrink-0 pointer-events-none" />
              </div>

              {/* Right tools (Currency Filter + Search box) */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
                {/* Currency filter dropdown selector */}
                <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-150 w-full sm:w-48">
                  <span className="text-[10px] text-gray-450 font-bold whitespace-nowrap">
                    {lang === 'en' ? 'Currency:' : lang === 'ar' ? 'العملة:' : 'دراو:'}
                  </span>
                  <select
                    value={safeCurrencyFilter}
                    onChange={(e) => setSafeCurrencyFilter(e.target.value)}
                    className="bg-transparent text-xs w-full focus:outline-none font-bold text-gray-800 cursor-pointer text-right appearance-none"
                    style={{ direction: 'rtl' }}
                  >
                    <option value="all" className="font-bold text-gray-800">
                      {lang === 'en' ? 'All Currencies' : lang === 'ar' ? 'كافة العملات' : 'سەرجەم دراوەکان'}
                    </option>
                    {currencies.map(cur => (
                      <option key={cur} value={cur} className="font-bold text-gray-800">
                        {cur}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Right search box */}
                <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-150 w-full lg:w-64">
                  <Search className="w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder={lang === 'en' ? 'Search safe ledger...' : lang === 'ar' ? 'البحث في سجل الخزينة...' : 'گەڕان بەدوای کۆد، بڕ یان تێبینی...'}
                    value={safeSearch}
                    onChange={(e) => setSafeSearch(e.target.value)}
                    className="bg-transparent text-xs w-full focus:outline-none placeholder-gray-400 text-right font-bold text-gray-800"
                  />
                </div>
              </div>
            </div>

            {/* Main Ledger Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right text-gray-600">
                <thead className="bg-gray-50 text-gray-550 border-b border-gray-150 font-semibold">
                  <tr>
                    <th className="px-4 py-3 text-center"># ID</th>
                    <th className="px-4 py-3">{lang === 'en' ? 'Date & Time' : lang === 'ar' ? 'التاريخ والوقت' : 'ڕێکەوت و کات'}</th>
                    <th className="px-4 py-3">{lang === 'en' ? 'Type' : lang === 'ar' ? 'نوع الحركة' : 'جۆری جووڵە'}</th>
                    <th className="px-4 py-3">{lang === 'en' ? 'Client / Source' : lang === 'ar' ? 'العميل / الطرف المقابل' : 'کڕیار / سەرچاوە'}</th>
                    <th className="px-4 py-3">{lang === 'en' ? 'Incoming' : lang === 'ar' ? 'الوارد' : 'هاتوو (Incoming)'}</th>
                    <th className="px-4 py-3">{lang === 'en' ? 'Outgoing' : lang === 'ar' ? 'الصادر' : 'ڕۆیشتوو (Outgoing)'}</th>
                    <th className="px-4 py-3 text-center">{lang === 'en' ? 'Fee / Currency' : lang === 'ar' ? 'الرسوم / العملة' : 'تێچوو/دراو'}</th>
                    <th className="px-4 py-3">{lang === 'en' ? 'Notes' : lang === 'ar' ? 'الملاحظات' : 'تێبینییەکان'}</th>
                    <th className="px-4 py-3">{lang === 'en' ? 'Performed By' : lang === 'ar' ? 'الموظف' : 'ئەنجامدەر'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150 font-medium text-gray-700 whitespace-nowrap">
                  {Boolean((startDate || endDate) && !(startDate === getTodayString() && endDate === getTodayString())) && (
                    <tr className="bg-amber-50/80 font-semibold border-b-2 border-amber-200/80 text-amber-900">
                      <td className="px-4 py-3 text-center font-mono font-bold text-amber-700">—</td>
                      <td className="px-4 py-3 font-mono text-amber-800 text-[11px] font-bold">{startDate || (lang === 'en' ? 'Start' : lang === 'ar' ? 'البداية' : 'دەستپێک')}</td>
                      <td className="px-4 py-3">
                        <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                          {lang === 'en' ? 'Opening Safe Reserve' : lang === 'ar' ? 'رصيد الخزينة السابق' : 'باڵانسی پێشتری گەنجینە'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-amber-800 font-bold">{lang === 'en' ? 'Main Vault' : lang === 'ar' ? 'الخزينة الرئيسية' : 'گەنجینەی سەرەکی'}</td>
                      <td colSpan={2} className="px-4 py-3 text-left font-mono font-bold text-amber-900 text-xs">
                        {currencies.map(c => `${c}: ${formatMoney(safeOpeningNet[c] || 0, c)}`).join(' | ')}
                      </td>
                      <td className="px-4 py-3 text-center font-mono font-bold text-amber-700">—</td>
                      <td className="px-4 py-3 text-amber-800 text-[11px]">
                        {lang === 'en' ? `Safe balance prior to ${startDate}` : lang === 'ar' ? `رصيد الخزينة قبل تاريخ ${startDate}` : `باڵانسی گەنجینە پێش بەرواری ${startDate}`}
                      </td>
                      <td className="px-4 py-3 text-amber-700 text-[11px]">{lang === 'en' ? 'System' : lang === 'ar' ? 'النظام' : 'سیستەم'}</td>
                    </tr>
                  )}
                  {filteredSafeTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-12 text-gray-400 font-bold">
                        {lang === 'en' ? 'No safe transactions found.' : lang === 'ar' ? 'لم يتم العثور على أي حركات في الخزينة.' : 'هیچ جووڵە یان تۆمارێکی گەنجینە نەدۆزرایەوە بەپێی فیلتەرەکان.'}
                      </td>
                    </tr>
                  ) : (
                    filteredSafeTransactions.map((tx) => {
                      let txLabel = '';
                      let badgeStyle = '';
                      let incomingVal = '-';
                      let outgoingVal = '-';
                      let isIncoming = true;
                      const cur = tx.currency;

                      if (tx.type === 'SafeAdjustment') {
                        txLabel = tx.amount > 0 ? (lang === 'en' ? 'Safe Deposit' : lang === 'ar' ? 'إيداع في الخزينة' : 'پارە خستنە ناو گەنجینە') : (lang === 'en' ? 'Safe Withdrawal' : lang === 'ar' ? 'سحب من الخزينة' : 'پارە ڕاکێشان لە گەنجینە');
                        badgeStyle = tx.amount > 0 ? 'bg-emerald-100 text-emerald-950 border border-emerald-300 font-bold' : 'bg-rose-100 text-rose-950 border border-rose-300 font-bold';
                        isIncoming = tx.amount > 0;
                        if (isIncoming) {
                          incomingVal = formatMoney(tx.amount, cur);
                        } else {
                          outgoingVal = formatMoney(Math.abs(tx.amount), cur);
                        }
                      } else if (tx.type === 'Deposit') {
                        txLabel = lang === 'en' ? 'Client Deposit' : lang === 'ar' ? 'إيداع عميل' : 'سپاردەی کڕیار';
                        badgeStyle = 'bg-emerald-100 text-emerald-950 border border-emerald-300 font-bold';
                        isIncoming = true;
                        incomingVal = formatMoney(tx.amount, cur);
                      } else if (tx.type === 'Withdrawal') {
                        txLabel = lang === 'en' ? 'Client Withdrawal' : lang === 'ar' ? 'سحب عميل' : 'ڕاکێشانی کڕیار';
                        badgeStyle = 'bg-rose-100 text-rose-950 border border-rose-300 font-bold';
                        isIncoming = false;
                        outgoingVal = formatMoney(Math.abs(tx.amount), cur);
                      } else if (tx.type === 'FastTransfer') {
                        txLabel = lang === 'en' ? 'Transfer Delivery' : lang === 'ar' ? 'تسليم حوالة سريعة' : 'ڕادەستکردنی حەواڵەی خێرا';
                        badgeStyle = 'bg-purple-100 text-purple-950 border border-purple-300 font-bold';
                        isIncoming = false;
                        outgoingVal = formatMoney(Math.abs(tx.amount), cur);
                      } else if (tx.type === 'Exchange') {
                        txLabel = lang === 'en' ? 'Currency Exchange' : lang === 'ar' ? 'صرف عملات' : 'ئاڵوگۆڕی دراو';
                        badgeStyle = 'bg-blue-100 text-blue-950 border border-blue-300 font-bold';
                        isIncoming = tx.amount > 0;
                        if (safeCurrencyFilter === 'all') {
                          if (isIncoming) {
                            incomingVal = formatMoney(tx.amount, 'USD');
                            outgoingVal = formatMoney(Math.abs(tx.targetAmount || 0), tx.targetCurrency || 'IQD');
                          } else {
                            outgoingVal = formatMoney(Math.abs(tx.amount), 'USD');
                            incomingVal = formatMoney(Math.abs(tx.targetAmount || 0), tx.targetCurrency || 'IQD');
                          }
                        } else {
                          const isBaseFiltered = safeCurrencyFilter === 'USD';
                          const isTargetFiltered = safeCurrencyFilter === tx.targetCurrency;

                          if (isBaseFiltered) {
                            if (isIncoming) {
                              incomingVal = formatMoney(tx.amount, 'USD');
                              outgoingVal = '-';
                            } else {
                              incomingVal = '-';
                              outgoingVal = formatMoney(Math.abs(tx.amount), 'USD');
                            }
                          } else if (isTargetFiltered) {
                            if (isIncoming) {
                              incomingVal = '-';
                              outgoingVal = formatMoney(Math.abs(tx.targetAmount || 0), tx.targetCurrency as any || 'IQD');
                            } else {
                              incomingVal = formatMoney(Math.abs(tx.targetAmount || 0), tx.targetCurrency as any || 'IQD');
                              outgoingVal = '-';
                            }
                          } else {
                            incomingVal = '-';
                            outgoingVal = '-';
                          }
                        }
                      }

                      return (
                        <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3.5 text-center font-mono font-bold text-gray-450">{tx.id}</td>
                          <td className="px-4 py-3.5 font-mono text-gray-400 text-[10px]">
                            {formatKurdishDateTime(tx.timestamp)}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${badgeStyle}`}>
                              {txLabel}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 font-bold text-gray-900">
                            {tx.customerId === 'system-expenses' || (tx.customerName && tx.customerName.toLowerCase() === 'unknown')
                              ? (lang === 'en' ? 'Expenses' : lang === 'ar' ? 'المصاريف' : 'خەرجی')
                              : (tx.customerName || (lang === 'en' ? 'Vault' : lang === 'ar' ? 'الخزينة' : 'خانەی گەنجینە'))}
                          </td>
                          <td className="px-4 py-3.5 font-mono font-bold text-emerald-600">
                            {incomingVal !== '-' ? `+${incomingVal}` : '-'}
                          </td>
                          <td className="px-4 py-3.5 font-mono font-bold text-rose-600">
                            {outgoingVal !== '-' ? `-${outgoingVal}` : '-'}
                          </td>
                          <td className="px-4 py-3.5 text-center font-mono font-bold text-gray-700">
                            {tx.type === 'Exchange' ? `1 USD = ${tx.rate} ${tx.targetCurrency}` : cur}
                          </td>
                          <td className="px-4 py-3.5 text-gray-550 max-w-xs truncate font-normal" title={tx.notes}>
                            {tx.notes || '-'}
                          </td>
                          <td className="px-4 py-3.5 text-gray-400 font-medium text-[11px]">{tx.performedBy}</td>
                        </tr>
                      );
                    })
                  )}
                  {Boolean((startDate || endDate) && !(startDate === getTodayString() && endDate === getTodayString())) && filteredSafeTransactions.length > 0 && (
                    <tr className="bg-blue-50/80 font-semibold border-t-2 border-blue-200/80 text-blue-900">
                      <td className="px-4 py-3 text-center font-mono font-bold text-blue-700">—</td>
                      <td className="px-4 py-3 font-mono text-blue-800 text-[11px] font-bold">{endDate || (lang === 'en' ? 'Now' : lang === 'ar' ? 'الآن' : 'ئێستا')}</td>
                      <td className="px-4 py-3">
                        <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-200">
                          {lang === 'en' ? 'Period Ending Safe Reserve' : lang === 'ar' ? 'رصيد الخزينة بنهاية الفترة' : 'باڵانسی کۆتایی وادەی گەنجینە'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-blue-800 font-bold">{lang === 'en' ? 'Main Vault' : lang === 'ar' ? 'الخزينة الرئيسية' : 'گەنجینەی سەرەکی'}</td>
                      <td colSpan={2} className="px-4 py-3 text-left font-mono font-bold text-blue-900 text-xs">
                        {currencies.map(c => {
                          const openB = startDate ? (safeOpeningNet[c] || 0) : 0;
                          const netF = (safeIncomingTotals[c] || 0) - (safeOutgoingTotals[c] || 0);
                          return `${c}: ${formatMoney(openB + netF, c)}`;
                        }).join(' | ')}
                      </td>
                      <td className="px-4 py-3 text-center font-mono font-bold text-blue-700">—</td>
                      <td className="px-4 py-3 text-blue-800 text-[11px]">
                        {lang === 'en' ? `Final safe balance at end of period` : lang === 'ar' ? `رصيد الخزينة النهائي بنهاية الفترة` : `باڵانسی کۆتایی گەنجینە بۆ بەرواری دیاریکراو`}
                      </td>
                      <td className="px-4 py-3 text-blue-700 text-[11px]">{lang === 'en' ? 'System' : lang === 'ar' ? 'النظام' : 'سیستەم'}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {safeCurrencyFilter !== 'all' && (
              <div className="mt-6 pt-6 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-6" dir="rtl">
                {/* Total Title */}
                <div className="text-right space-y-1">
                  <h4 className="text-[11px] font-bold text-gray-450 uppercase tracking-wider">
                    {lang === 'en' ? `Summary for ${safeCurrencyFilter}` : lang === 'ar' ? `ملخص عملة (${safeCurrencyFilter})` : `کورتەی کۆی گشتی دراوی (${safeCurrencyFilter})`}
                  </h4>
                  <p className="text-sm font-black text-gray-900">
                    {lang === 'en' ? 'Safe Account Activity' : lang === 'ar' ? 'نشاط حساب الخزينة' : 'کۆی گشتی جووڵە و بارودۆخی گەنجینە'}
                  </p>
                </div>

                {/* Grid of Incoming, Outgoing, and Net Flow */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full md:w-auto sm:min-w-[500px]">
                  {/* Total Incoming */}
                  <div className="bg-emerald-50/60 border border-emerald-150/50 p-3 rounded-2xl text-right">
                    <span className="text-[10px] text-emerald-600 font-bold block mb-0.5">
                      {lang === 'en' ? 'Total Incoming:' : lang === 'ar' ? 'إجمالي الوارد:' : 'کۆی هاتوو:'}
                    </span>
                    <span className="text-xs sm:text-sm font-black text-emerald-700 font-mono">
                      +{formatMoney(totalIncomingFiltered, safeCurrencyFilter as any)}
                    </span>
                  </div>

                  {/* Total Outgoing */}
                  <div className="bg-rose-50/60 border border-rose-150/50 p-3 rounded-2xl text-right">
                    <span className="text-[10px] text-rose-600 font-bold block mb-0.5">
                      {lang === 'en' ? 'Total Outgoing:' : lang === 'ar' ? 'إجمالي الصادر:' : 'کۆی ڕۆیشتوو:'}
                    </span>
                    <span className="text-xs sm:text-sm font-black text-rose-700 font-mono">
                      -{formatMoney(totalOutgoingFiltered, safeCurrencyFilter as any)}
                    </span>
                  </div>

                  {/* Net Flow */}
                  {(() => {
                    const netVal = totalIncomingFiltered - totalOutgoingFiltered;
                    const isPositive = netVal >= 0;
                    const netBg = isPositive ? 'bg-teal-50/60 border-teal-150/50 text-teal-800' : 'bg-red-50/60 border-red-150/50 text-red-800';
                    return (
                      <div className={`border p-3 rounded-2xl text-right ${netBg}`}>
                        <span className="text-[10px] font-bold block mb-0.5 opacity-80">
                          {lang === 'en' ? 'Net Range Flow:' : lang === 'ar' ? 'صافي التدفق للفترة:' : 'پوختەی جووڵە:'}
                        </span>
                        <span className="text-xs sm:text-sm font-black font-mono">
                          {netVal >= 0 ? '+' : ''}{formatMoney(netVal, safeCurrencyFilter as any)}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ======================= TAB 6: EXPENSES ======================= */}
      {activeTab === 'expenses' && (() => {
        // Retrieve all expenses (transactions belonging to system-expenses customer)
        const rawExpenses = transactions.filter(tx => tx.customerId === 'system-expenses');
        const rangeExpenses = rawExpenses.filter(tx => isWithinDates(tx.timestamp));

        // Sum total spent per currency for active range (using Math.abs for positive visualization)
        const expensesSum: Record<string, number> = {};
        currencies.forEach(cur => {
          expensesSum[cur] = 0;
        });
        rangeExpenses.forEach(tx => {
          const cur = tx.currency;
          expensesSum[cur] = (expensesSum[cur] || 0) + Math.abs(tx.amount);
        });

        // Apply filters
        const filteredExpenses = rangeExpenses.filter(tx => {
          // Currency Filter
          if (expenseCurrencyFilter !== 'all' && tx.currency !== expenseCurrencyFilter) {
            return false;
          }

          // Search Filter
          if (expenseSearch.trim()) {
            const q = expenseSearch.toLowerCase().trim();
            const idMatch = tx.id.toLowerCase().includes(q);
            const notesMatch = (tx.notes || '').toLowerCase().includes(q);
            const operatorMatch = (tx.performedBy || '').toLowerCase().includes(q);
            const amountMatch = Math.abs(tx.amount).toString().includes(q);
            return idMatch || notesMatch || operatorMatch || amountMatch;
          }

          return true;
        }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        return (
          <div className="space-y-6">
            {/* Upper Stats: Total spent in each currency */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {activeCurrencies.filter(cur => (expensesSum[cur] || 0) > 0 || cur === 'USD' || cur === 'IQD').map(cur => {
                const totalSpent = expensesSum[cur] || 0;
                return (
                  <div key={cur} className="bg-white p-5 rounded-2xl border border-gray-101 shadow-sm space-y-4">
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <span className="text-gray-400">
                        {lang === 'en' ? `Office Expenses (${cur})` : lang === 'ar' ? `مصاريف المكتب (${cur})` : `خەرجییەکانی نووسینگە (${cur})`}
                      </span>
                      <span className="px-2 py-0.5 bg-rose-50 text-rose-700 rounded text-[10px] font-mono font-black">{cur}</span>
                    </div>
                    <div>
                      <p className="text-2xl font-black text-rose-750 font-mono tracking-tight text-left">
                        {formatMoney(totalSpent, cur)}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-1 text-right">
                        {lang === 'en' ? 'Sum for selected date range' : lang === 'ar' ? 'مجموع الفترة المحددة' : 'کۆی خەرجی بەپێی بەرواری دیاریکراو'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Expenses List and Controls */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
              {/* Header Controls Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-gray-100 pb-4 no-print">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse"></span>
                  {lang === 'en' ? 'Office Expenses Ledger' : lang === 'ar' ? 'دفتر مصاريف المكتب' : 'دەفتەری ڕاپۆرت و وردبینی خەرجییەکان'}
                </h3>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  {/* Currency Filter Dropdown */}
                  <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-150 w-full sm:w-48">
                    <span className="text-[10px] text-gray-450 font-bold whitespace-nowrap">
                      {lang === 'en' ? 'Currency:' : lang === 'ar' ? 'العملة:' : 'دراو:'}
                    </span>
                    <select
                      value={expenseCurrencyFilter}
                      onChange={(e) => setExpenseCurrencyFilter(e.target.value)}
                      className="bg-transparent text-xs w-full focus:outline-none font-bold text-gray-800 cursor-pointer text-right appearance-none"
                      style={{ direction: 'rtl' }}
                    >
                      <option value="all" className="font-bold text-gray-800">
                        {lang === 'en' ? 'All Currencies' : lang === 'ar' ? 'كافة العملات' : 'سەرجەم دراوەکان'}
                      </option>
                      {currencies.map(cur => (
                        <option key={cur} value={cur} className="font-bold text-gray-800">
                          {cur}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Search Input */}
                  <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-150 w-full lg:w-64">
                    <Search className="w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder={lang === 'en' ? 'Search expenses...' : lang === 'ar' ? 'بحث في المصاريف...' : 'گەڕان بەدوای کۆد، بڕ یان تێبینی خەرجی...'}
                      value={expenseSearch}
                      onChange={(e) => setExpenseSearch(e.target.value)}
                      className="bg-transparent text-xs w-full focus:outline-none placeholder-gray-400 text-right font-bold text-gray-800"
                    />
                  </div>
                </div>
              </div>

              {/* Mobile Card List (Visible on mobile) */}
              <div className="md:hidden divide-y divide-gray-100 p-1 bg-white">
                {filteredExpenses.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-xs font-bold">
                    {lang === 'en' ? 'No expenses recorded in this period.' : lang === 'ar' ? 'لم يتم تسجيل أي مصاريف في هذه الفترة.' : 'هیچ خەرجییەک لەم ماوەیەدا تۆمار نەکراوە.'}
                  </div>
                ) : (
                  filteredExpenses.map(tx => (
                    <div key={tx.id} className="py-4 space-y-2 hover:bg-gray-50/20 transition-colors">
                      <div className="flex justify-between items-center text-[10px] text-gray-400">
                        <span className="font-mono font-bold">#{tx.id}</span>
                        <span>{formatKurdishDateTime(tx.timestamp)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-gray-900 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded">
                          {lang === 'en' ? 'Office Expense' : lang === 'ar' ? 'مصروف المكتب' : 'خەرجی نووسینگە'}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-rose-700 text-sm">
                            {formatMoney(Math.abs(tx.amount), tx.currency)}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleStartEditExpense(tx)}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                              title={lang === 'en' ? 'Edit' : lang === 'ar' ? 'تعديل' : 'دەستکاریکردن'}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteTransaction && onDeleteTransaction(tx.id)}
                              className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                              title={lang === 'en' ? 'Delete' : lang === 'ar' ? 'حذف' : 'سڕینەوە'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 bg-gray-50/50 p-2 rounded-lg border border-gray-100/30">
                        {tx.notes}
                      </p>
                      <div className="text-[10px] text-gray-400 flex justify-between items-center">
                        <span>{lang === 'en' ? 'By:' : lang === 'ar' ? 'بواسطة:' : 'ئەنجامدەر:'} <strong className="text-gray-600">{tx.performedBy}</strong></span>
                        <span className="font-mono font-bold bg-gray-100 px-1.5 py-0.5 rounded">{tx.currency}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Desktop/Tablet Table (Visible on md and up) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-xs text-right text-gray-600">
                  <thead className="bg-gray-50 text-gray-550 border-b border-gray-150 font-semibold">
                    <tr>
                      <th className="px-4 py-3 text-center"># ID</th>
                      <th className="px-4 py-3">{lang === 'en' ? 'Date & Time' : lang === 'ar' ? 'التاريخ والوقت' : 'ڕێکەوت و کات'}</th>
                      <th className="px-4 py-3">{lang === 'en' ? 'Category' : lang === 'ar' ? 'الفئة' : 'جۆری بابەت'}</th>
                      <th className="px-4 py-3 text-left">{lang === 'en' ? 'Amount Spent' : lang === 'ar' ? 'المبلغ المنصرف' : 'بڕی خەرجکراو'}</th>
                      <th className="px-4 py-3 text-center">{lang === 'en' ? 'Currency' : lang === 'ar' ? 'العملة' : 'دراو'}</th>
                      <th className="px-4 py-3">{lang === 'en' ? 'Notes & Explanations' : lang === 'ar' ? 'الملاحظات والتفاصيل' : 'تێبینی و ڕوونکردنەوەی خەرجی'}</th>
                      <th className="px-4 py-3">{lang === 'en' ? 'Operator' : lang === 'ar' ? 'الموظف' : 'ئەنجامدەر (Operator)'}</th>
                      <th className="px-4 py-3 text-center">{lang === 'en' ? 'Actions' : lang === 'ar' ? 'الإجراءات' : 'کردارەکان'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-150 font-medium text-gray-700 whitespace-nowrap">
                    {filteredExpenses.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-12 text-gray-400 font-bold">
                          {lang === 'en' ? 'No office expenses found for the selected criteria.' : lang === 'ar' ? 'لم يتم العثور على أي مصاريف مكتبية وفقاً للشروط المحددة.' : 'هیچ خەرجییەک نەدۆزرایەوە بەپێی فیلتەر و بەروارەکان.'}
                        </td>
                      </tr>
                    ) : (
                      filteredExpenses.map(tx => (
                        <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3.5 text-center font-mono font-bold text-gray-450">{tx.id}</td>
                          <td className="px-4 py-3.5 font-mono text-gray-400 text-[10px]">
                            {formatKurdishDateTime(tx.timestamp)}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-150">
                              {lang === 'en' ? 'Office Expense' : lang === 'ar' ? 'مصروف المكتب' : 'خەرجی نووسینگە'}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 font-mono font-black text-rose-650 text-left text-sm">
                            {formatMoney(Math.abs(tx.amount), tx.currency)}
                          </td>
                          <td className="px-4 py-3.5 text-center font-mono font-bold text-gray-900">{tx.currency}</td>
                          <td className="px-4 py-3.5 text-gray-550 max-w-sm truncate font-bold text-gray-800" title={tx.notes}>
                            {tx.notes || '-'}
                          </td>
                          <td className="px-4 py-3.5 text-gray-400 font-semibold text-[11px]">{tx.performedBy}</td>
                          <td className="px-4 py-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleStartEditExpense(tx)}
                                className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                title={lang === 'en' ? 'Edit' : lang === 'ar' ? 'تعديل' : 'دەستکاریکردن'}
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteTransaction && onDeleteTransaction(tx.id)}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title={lang === 'en' ? 'Delete' : lang === 'ar' ? 'حذف' : 'سڕینەوە'}
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

              {/* Currency Specific Summary Bar */}
              {expenseCurrencyFilter !== 'all' && (() => {
                const totalSpentFiltered = filteredExpenses.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
                return (
                  <div className="mt-6 pt-6 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-6" dir="rtl">
                    {/* Total Title */}
                    <div className="text-right space-y-1">
                      <h4 className="text-[11px] font-bold text-gray-450 uppercase tracking-wider">
                        {lang === 'en' ? `Summary for ${expenseCurrencyFilter}` : lang === 'ar' ? `ملخص عملة (${expenseCurrencyFilter})` : `کورتەی کۆی گشتی دراوی (${expenseCurrencyFilter})`}
                      </h4>
                      <p className="text-sm font-black text-gray-900">
                        {lang === 'en' ? 'Office Expenses Activity' : lang === 'ar' ? 'نشاط مصاريف المكتب' : 'کۆی گشتی خەرجییەکانی نووسینگە'}
                      </p>
                    </div>

                    {/* Grid of Total Outgoing Expenses and Count */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full md:w-auto sm:min-w-[380px]">
                      {/* Total Outgoing Expenses */}
                      <div className="bg-rose-50/60 border border-rose-150/50 p-3 rounded-2xl text-right">
                        <span className="text-[10px] text-rose-600 font-bold block mb-0.5">
                          {lang === 'en' ? 'Total Expenses Outgoing:' : lang === 'ar' ? 'إجمالي المصاريف الصادرة:' : 'کۆی گشتی خەرجکراو (ڕۆیشتوو):'}
                        </span>
                        <span className="text-xs sm:text-sm font-black text-rose-700 font-mono">
                          -{formatMoney(totalSpentFiltered, expenseCurrencyFilter as any)}
                        </span>
                      </div>

                      {/* Transaction Count */}
                      <div className="bg-gray-50 border border-gray-150 p-3 rounded-2xl text-right">
                        <span className="text-[10px] text-gray-500 font-bold block mb-0.5">
                          {lang === 'en' ? 'Total Transactions:' : lang === 'ar' ? 'إجمالي العمليات:' : 'ژمارەی كردارەکان:'}
                        </span>
                        <span className="text-xs sm:text-sm font-black text-gray-800 font-mono">
                          {filteredExpenses.length} {lang === 'en' ? 'records' : lang === 'ar' ? 'عمليات' : 'تۆمار'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        );
      })()}

      {/* ======================= CUSTOMER LEDGER STATEMENT MODAL ======================= */}
      {selectedCustomerForTxLog && (() => {
        // Filter transactions for chosen ledger customer
        let ledgerTransactions: Transaction[] = [];

        if (selectedCustomerForTxLog.id === 'system-exchange') {
          ledgerTransactions = deduplicateTransactions(transactions).filter(tx => {
            return tx.type === 'Exchange' || tx.customerId === 'system-exchange';
          });
        } else if (selectedCustomerForTxLog.id === 'system-expenses') {
          ledgerTransactions = deduplicateTransactions(transactions).filter(tx => {
            return tx.customerId === 'system-expenses' || tx.type === 'Expense';
          });
        } else if (selectedCustomerForTxLog.id === 'system-transfer-fee') {
          const feeVirtualTxs: Transaction[] = [];

          // 1. Fast Transfers fees
          for (const ft of fastTransfers) {
            if (ft.fee && ft.fee > 0 && ft.status !== 'Cancelled') {
              feeVirtualTxs.push({
                id: `TRX-FEE-${ft.id}`,
                type: 'FastTransfer',
                timestamp: ft.createdAt || new Date().toISOString(),
                performedBy: 'سیستەم',
                customerId: 'system-transfer-fee',
                customerName: 'کرێی حەواڵە',
                amount: ft.fee,
                currency: ft.currency || 'USD',
                notes: `کرێی حەواڵەی خێرا بە کۆدی ${ft.id} (بڕی حەواڵە: ${formatMoney(ft.amount, ft.currency || 'USD')} - نێرەر: ${ft.senderName || ''}، وەرگر: ${ft.receiverName || ''})`
              });
            }
          }

          // 2. Standard Transfers profit/fee
          for (const st of standardTransfers) {
            if (st.status !== 'Cancelled') {
              let profit = st.profitIQD;
              if (profit === undefined || isNaN(profit)) {
                profit = (st.receiverIQDDeducted - st.senderIQDAdded) || (st.sellRate - st.buyRate) || 0;
              }
              if (profit !== 0) {
                feeVirtualTxs.push({
                  id: `INT-FEE-${st.id}`,
                  type: 'StandardTransfer',
                  timestamp: st.createdAt || new Date().toISOString(),
                  performedBy: 'سیستەم',
                  customerId: 'system-transfer-fee',
                  customerName: 'کرێی حەواڵە',
                  amount: profit,
                  currency: st.currency || 'USD',
                  notes: `کرێ/قازانجی حەواڵەی ستاندارد ${st.id} (بڕی حەواڵە: $${st.amountUSD.toLocaleString()} USD - نێرەر: ${st.senderName || ''}، وەرگر: ${st.receiverName || ''})`
                });
              }
            }
          }

          // 3. Any manual transactions directly created for system-transfer-fee
          const realManualFeeTxs = deduplicateTransactions(transactions).filter(tx => tx.customerId === 'system-transfer-fee');

          ledgerTransactions = [...feeVirtualTxs, ...realManualFeeTxs].sort(
            (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
        } else if (selectedCustomerForTxLog.id === 'system-fast-hawala') {
          const fastHawalaVirtualTxs: Transaction[] = [];

          for (const ft of fastTransfers) {
            if (ft.status !== 'Cancelled') {
              const feeNote = ft.fee ? ` - کرێ: ${formatMoney(ft.fee, ft.currency || 'USD')}` : '';

              // 1. Credit entry into system-fast-hawala when created
              fastHawalaVirtualTxs.push({
                id: `TRX-FAST-IN-${ft.id}`,
                type: 'FastTransfer',
                timestamp: ft.createdAt || new Date().toISOString(),
                performedBy: 'سیستەم',
                customerId: 'system-fast-hawala',
                customerName: 'حەواڵەی خێرا',
                amount: ft.amount,
                currency: ft.currency || 'USD',
                notes: `هاتنەناوە بۆ هەژماری حەواڵەی خێرا (کۆدی حەواڵە: ${ft.id}${feeNote} - نێرەر: ${ft.senderName}، وەرگر: ${ft.receiverName})`
              });

              // 2. Debit entry out of system-fast-hawala when delivered
              if (ft.status === 'Delivered') {
                const deliveryNote = ft.isOfficeDelivery && ft.officeName 
                  ? `تەسلیمکردن بۆ نووسینگەی ${ft.officeName} (وەرگرتن لەلایەن: ${ft.deliveryReceiverName || ft.receiverName})`
                  : `تەسلیمکردن بە کەسی (وەرگرتن لەلایەن: ${ft.deliveryReceiverName || ft.receiverName})`;

                fastHawalaVirtualTxs.push({
                  id: `TRX-FAST-OUT-${ft.id}`,
                  type: 'FastTransfer',
                  timestamp: ft.deliveredAt || ft.createdAt || new Date().toISOString(),
                  performedBy: 'سیستەم',
                  customerId: 'system-fast-hawala',
                  customerName: 'حەواڵەی خێرا',
                  amount: -ft.amount,
                  currency: ft.currency || 'USD',
                  notes: `دەربازبوون لە هەژماری حەواڵەی خێرا - ${deliveryNote} (کۆدی حەواڵە: ${ft.id}${feeNote})`
                });
              }
            }
          }

          const realManualHawalaTxs = deduplicateTransactions(transactions).filter(
            tx => tx.customerId === 'system-fast-hawala' && tx.type !== 'FastTransfer'
          );

          ledgerTransactions = [...fastHawalaVirtualTxs, ...realManualHawalaTxs].sort(
            (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
        } else {
          ledgerTransactions = deduplicateTransactions(transactions).filter(tx => tx.customerId === selectedCustomerForTxLog.id);
        }

        const custId = selectedCustomerForTxLog.id;

        // Expanded structure for single-currency ledger entries
        interface ExpandedLedgerEntry {
          id: string;
          originalTxId: string;
          timestamp: string;
          type: string;
          amount: number;
          currency: string;
          performedBy?: string;
          notes?: string;
          rate?: number;
          isExchangeLeg?: boolean;
          legLabel?: string;
        }

        const allLedgerEntries: ExpandedLedgerEntry[] = [];

        for (const tx of ledgerTransactions) {
          if (tx.type === 'Exchange') {
            const targetCur = tx.targetCurrency || 'IQD';
            let usdAmtChange = 0;
            let targetAmtChange = 0;

            if (custId === 'system-exchange') {
              usdAmtChange = +(tx.amount || 0);
              targetAmtChange = +(tx.targetAmount || 0);
            } else {
              usdAmtChange = -(tx.amount || 0);
              targetAmtChange = -(tx.targetAmount || 0);
            }

            if (usdAmtChange !== 0) {
              allLedgerEntries.push({
                id: tx.id,
                originalTxId: tx.id,
                timestamp: tx.timestamp,
                type: 'Exchange',
                amount: usdAmtChange,
                currency: tx.currency || 'USD',
                performedBy: tx.performedBy,
                notes: tx.notes,
                rate: tx.rate,
                isExchangeLeg: true,
                legLabel: tx.currency || 'USD'
              });
            }

            if (targetAmtChange !== 0) {
              allLedgerEntries.push({
                id: tx.id,
                originalTxId: tx.id,
                timestamp: tx.timestamp,
                type: 'Exchange',
                amount: targetAmtChange,
                currency: targetCur,
                performedBy: tx.performedBy,
                notes: tx.notes,
                rate: tx.rate,
                isExchangeLeg: true,
                legLabel: targetCur
              });
            }
          } else {
            allLedgerEntries.push({
              id: tx.id,
              originalTxId: tx.id,
              timestamp: tx.timestamp,
              type: tx.type,
              amount: tx.amount,
              currency: tx.currency || 'USD',
              performedBy: tx.performedBy,
              notes: tx.notes
            });
          }
        }

        // Filter currencies to only those that have a non-zero balance or have transactions in allLedgerEntries
        const activeCurrencies = currencies.filter(curr => {
          const balance = selectedCustomerForTxLog.balances[curr] || 0;
          if (balance !== 0) return true;
          return allLedgerEntries.some(entry => entry.currency === curr);
        });

        const filteredLedgerTransactions = allLedgerEntries.filter(entry => {
          if (ledgerStartDate) {
            const txDateStr = entry.timestamp.split('T')[0];
            if (txDateStr < ledgerStartDate) return false;
          }
          if (ledgerEndDate) {
            const txDateStr = entry.timestamp.split('T')[0];
            if (txDateStr > ledgerEndDate) return false;
          }

          if (ledgerSearch.trim()) {
            const q = ledgerSearch.toLowerCase().trim();
            const txNotes = (entry.notes || '').toLowerCase();
            const txId = entry.id.toLowerCase();
            const txOp = (entry.performedBy || '').toLowerCase();
            const txCur = entry.currency.toLowerCase();
            const txAmtStr = Math.abs(entry.amount).toString();

            let transType: string = entry.type;
            if (entry.type === 'Deposit') transType = t.type_deposit || 'پارە دانان';
            if (entry.type === 'Withdrawal') transType = t.type_withdrawal || 'ڕاکێشان';
            if (entry.type === 'Exchange') transType = `${t.type_exchange || 'ئاڵوگۆڕ'} (${entry.legLabel || entry.currency})`;
            if (entry.type === 'FastTransfer') transType = t.type_fast_transfer || 'حەواڵەی خێرا';
            if (entry.type === 'StandardTransfer') transType = t.type_standard_transfer || 'حەواڵەی ستاندارد';
            if (entry.type === 'InternalTransfer') transType = t.type_internal_transfer || 'حەواڵەی ناوخۆیی';
            if (entry.type === 'SafeAdjustment') transType = t.type_safe_adjustment || 'گۆڕینی لایەنەکان';
            const txTypeStr = transType.toLowerCase();

            return (
              txNotes.includes(q) ||
              txId.includes(q) ||
              txOp.includes(q) ||
              txCur.includes(q) ||
              txAmtStr.includes(q) ||
              txTypeStr.includes(q)
            );
          }

          return true;
        });

        // Calculate helper function for customer net changes per currency
        const calcCustNetChanges = (entryList: ExpandedLedgerEntry[]) => {
          const res: Record<string, number> = {};
          for (const entry of entryList) {
            res[entry.currency] = (res[entry.currency] || 0) + entry.amount;
          }
          return res;
        };

        // All customer entries prior to ledgerStartDate
        const beforeStartCustTxs = allLedgerEntries.filter(entry => {
          if (!ledgerStartDate) return false;
          const txDateStr = entry.timestamp.split('T')[0];
          return txDateStr < ledgerStartDate;
        });

        const openingBalances = calcCustNetChanges(beforeStartCustTxs);
        const periodNetChanges = calcCustNetChanges(filteredLedgerTransactions);

        return (
          <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/70 backdrop-blur-md flex items-center justify-center p-4 no-print-main-layout">
            <div className="bg-slate-950/95 backdrop-blur-2xl rounded-3xl max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-[0_25px_60px_rgba(0,0,0,0.8)] border border-white/[0.12] flex flex-col ledger-print-container animate-fade-in text-white" dir={lang === 'en' ? 'ltr' : 'rtl'}>
              
              {/* Modal Header Controls - HIDDEN on print */}
              <div className="px-6 py-4 bg-slate-950/80 border-b border-white/[0.08] flex justify-between items-center no-print sticky top-0 backdrop-blur-md z-10">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  <h3 className="font-bold text-white text-sm">
                    {lang === 'en' ? 'Customer Account Statement & Ledger' : lang === 'ar' ? 'كشف حساب العميل وسجل الحركات' : 'وردەکاری دەفتەری حیسابات و جووڵەی کڕیار'}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrintReport}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>{lang === 'en' ? 'Print Statement' : lang === 'ar' ? 'طباعة كشف الحساب' : 'چاپکردنی حیسابات'}</span>
                  </button>
                  <button
                    onClick={() => setSelectedCustomerForTxLog(null)}
                    className="p-2 hover:bg-gray-200 dark:hover:bg-slate-800 text-gray-500 hover:text-gray-850 dark:text-slate-400 dark:hover:text-white rounded-xl transition-all cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Print Friendly Statement Sheet Content */}
              <div className="p-6 md:p-8 space-y-6">
                
                {/* Report Header (Print Title Only) */}
                <div className="hidden print:block text-center border-b-2 border-gray-300 pb-4 mb-4" dir="rtl">
                  <h1 className="text-xl font-extrabold text-gray-900">{lang === 'en' ? 'Official Customer Account Statement' : lang === 'ar' ? 'التقرير الرسمي لكشف حساب العميل' : 'ڕاپۆرتی فەرمی دەفتەری حیسابات و جووڵەی کڕیار'}</h1>
                  <p className="text-[10px] text-gray-500 font-bold mt-1">
                    {lang === 'en' ? 'General Currency Exchange' : lang === 'ar' ? 'صرف العملات العام' : 'ئاڵوگۆڕی دراوی گشتی'} • {lang === 'en' ? 'Issue Time' : lang === 'ar' ? 'وقت الإصدار' : 'کاتی دەرکردن'}: {formatKurdishDateTime(new Date().toISOString())}
                  </p>
                </div>

                {/* Customer Profile & Overview card */}
                <div className="bg-gray-50/70 dark:bg-slate-800/40 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-1 text-right" dir="rtl">
                    <span className="text-[10px] text-primary font-bold uppercase tracking-wider">{lang === 'en' ? 'Customer Ledger Account' : lang === 'ar' ? 'الحساب الخاص بالمساهم / العميل' : 'هەژماری تایبەتی پشکدار'}</span>
                    <h2 className="text-xl font-black text-gray-900 dark:text-white">{selectedCustomerForTxLog.name}</h2>
                    <div className="flex flex-wrap gap-4 text-xs text-gray-500 dark:text-slate-400 font-medium">
                      <span className="font-mono">{lang === 'en' ? 'Phone:' : lang === 'ar' ? 'الهاتف:' : 'مۆبایل:'} {selectedCustomerForTxLog.phone}</span>
                      <span>{lang === 'en' ? 'Registration Date:' : lang === 'ar' ? 'تاريخ التسجيل:' : 'ڕێکەوتی تۆماربوون:'} {formatKurdishDateTime(selectedCustomerForTxLog.createdAt)}</span>
                    </div>
                  </div>

                  {/* Current & Period Balances Summary */}
                  <div className="flex flex-wrap items-center gap-3">
                    {activeCurrencies.map(curr => {
                      const hasCustomDateFilter = Boolean(
                        (ledgerStartDate || ledgerEndDate) &&
                        !(ledgerStartDate === getTodayString() && ledgerEndDate === getTodayString())
                      );
                      const openingBal = ledgerStartDate ? (openingBalances[curr] || 0) : 0;
                      const periodNet = periodNetChanges[curr] || 0;
                      const closingBal = openingBal + periodNet;
                      const liveBal = selectedCustomerForTxLog.balances[curr] || 0;

                      if (!hasCustomDateFilter) {
                        return (
                          <div key={curr} className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-gray-200 dark:border-slate-700 shadow-xs min-w-[140px] text-right space-y-1">
                            <div className="flex justify-between items-center border-b border-gray-100 dark:border-slate-700 pb-1 text-[10px] font-bold text-gray-400 dark:text-slate-400">
                              <span>{curr} {lang === 'en' ? 'Balance' : lang === 'ar' ? 'الرصيد' : 'باڵانس'}</span>
                              <span className="text-gray-900 dark:text-slate-200 font-mono font-bold">{curr}</span>
                            </div>
                            <span className={`text-base font-black font-mono block mt-1 ${liveBal < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                              {formatMoney(liveBal, curr)}
                            </span>
                          </div>
                        );
                      }

                      return (
                        <div key={curr} className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-gray-200 dark:border-slate-700 shadow-xs min-w-[185px] text-right space-y-1">
                          <div className="flex justify-between items-center border-b border-gray-100 dark:border-slate-700 pb-1 text-[10px] font-bold text-gray-400 dark:text-slate-400">
                            <span>{curr} {lang === 'en' ? 'Ledger Period' : 'دفتەری وادە'}</span>
                            <span className="text-gray-900 dark:text-slate-200 font-mono font-bold">{curr}</span>
                          </div>
                          {ledgerStartDate && (
                            <div className="flex justify-between text-[11px] text-amber-900 dark:text-amber-200 font-semibold bg-amber-500/10 dark:bg-amber-500/15 px-1.5 py-0.5 rounded border border-amber-500/20 dark:border-amber-500/30">
                              <span>{lang === 'en' ? 'Opening Bal:' : lang === 'ar' ? 'الرصيد السابق:' : 'باڵانسی پێشتر:'}</span>
                              <span className="font-mono">{formatMoney(openingBal, curr)}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-[11px] text-gray-600 dark:text-slate-300">
                            <span>{lang === 'en' ? 'Period Flow:' : lang === 'ar' ? 'صافي الحركة:' : 'جووڵەی وادە:'}</span>
                            <span className={`font-mono font-bold ${periodNet >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                              {periodNet >= 0 ? '+' : ''}{formatMoney(periodNet, curr)}
                            </span>
                          </div>
                          <div className="flex justify-between text-[11px] text-sky-900 dark:text-sky-200 font-bold bg-sky-500/10 dark:bg-sky-500/15 px-1.5 py-0.5 rounded border border-sky-500/20 dark:border-sky-500/30">
                            <span>{lang === 'en' ? 'Ending Bal:' : lang === 'ar' ? 'رصيد النهاية:' : 'کۆتایی وادە:'}</span>
                            <span className="font-mono">{formatMoney(closingBal, curr)}</span>
                          </div>
                          <div className="flex justify-between text-[10px] text-gray-400 dark:text-slate-400 pt-0.5 border-t border-dashed border-gray-100 dark:border-slate-700">
                            <span>{lang === 'en' ? 'Live Current Bal:' : lang === 'ar' ? 'الرصيد الحالي:' : 'باڵانسی ئێستا:'}</span>
                            <span className={`font-mono font-bold ${liveBal < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                              {formatMoney(liveBal, curr)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* interactive controls & logs tools - HIDDEN on print */}
                <div className="bg-white dark:bg-slate-850 p-4 rounded-xl border border-gray-150 dark:border-slate-750 flex flex-col md:flex-row md:items-center gap-4 justify-between no-print" dir={lang === 'en' ? 'ltr' : 'rtl'}>
                  
                  {/* Custom Date Range Log filter */}
                  <div className="flex flex-wrap items-center gap-3 text-xs w-full md:w-auto">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-gray-650 dark:text-slate-300">{lang === 'en' ? 'From:' : lang === 'ar' ? 'من:' : 'سەرەتا:'}</span>
                      <input
                        type="date"
                        value={ledgerStartDate}
                        onChange={(e) => setLedgerStartDate(e.target.value)}
                        className="p-1.5 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:border-primary rounded-lg text-xs font-mono font-bold focus:outline-none"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-gray-650 dark:text-slate-300">{lang === 'en' ? 'To:' : lang === 'ar' ? 'إلى:' : 'کۆتایی:'}</span>
                      <input
                        type="date"
                        value={ledgerEndDate}
                        onChange={(e) => setLedgerEndDate(e.target.value)}
                        className="p-1.5 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:border-primary rounded-lg text-xs font-mono font-bold focus:outline-none"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      {(ledgerStartDate || ledgerEndDate) && (
                        <button
                          onClick={() => { setLedgerStartDate(''); setLedgerEndDate(''); }}
                          className="text-red-600 font-bold hover:underline cursor-pointer text-xs"
                        >
                          {lang === 'en' ? 'Reset' : lang === 'ar' ? 'إعادة تعيين' : 'سڕینەوە'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Amount / notes Search Box */}
                  <div className="flex items-center gap-2 bg-gray-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-slate-700 w-full md:w-80">
                    <Search className="w-4 h-4 text-gray-400 dark:text-slate-500" />
                    <input
                      type="text"
                      placeholder={lang === 'en' ? 'Search by notes or amount...' : lang === 'ar' ? 'البحث عن طريق الملاحظات أو المبلغ...' : 'گەڕان بەدوای تێبینی یان بڕی پارە...'}
                      value={ledgerSearch}
                      onChange={(e) => setLedgerSearch(e.target.value)}
                      className="bg-transparent text-xs w-full focus:outline-none text-gray-900 dark:text-white placeholder-gray-450 dark:placeholder-slate-500 text-right"
                    />
                  </div>

                </div>

                {/* Transactions Statement Ledger Table */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-150 dark:border-slate-800 overflow-hidden shadow-xs">
                  <div className="px-5 py-3.5 bg-gray-50 dark:bg-slate-850 border-b border-gray-150 dark:border-slate-800 flex justify-between items-center">
                    <h4 className="text-xs font-bold text-gray-800 dark:text-white">
                      {lang === 'en' ? 'Transaction History Ledger' : lang === 'ar' ? 'السجل الكامل لتاريخ الحركات خلال هذه الفترة' : 'لیستی تەواوی مێژووی جووڵەکان لەم ماوەیەدا'}
                    </h4>
                    <span className="text-[11px] text-gray-400 dark:text-slate-400 font-mono font-bold">
                      {lang === 'en' ? `Total records: ${filteredLedgerTransactions.length}` : lang === 'ar' ? `إجمالي السجلات: ${filteredLedgerTransactions.length}` : `سەرجەم جووڵەکان: ${filteredLedgerTransactions.length}`}
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-right text-gray-600 dark:text-slate-300">
                      <thead className="bg-gray-50/50 dark:bg-slate-850/80 text-gray-500 dark:text-slate-400 border-b border-gray-250 dark:border-slate-800 font-semibold">
                        <tr>
                          {/* Code/License - Visible in web view, hidden in print */}
                          <th className="px-4 py-3 text-center print:hidden">
                            {lang === 'en' ? 'ID / Reference' : lang === 'ar' ? 'المعرف / الإشارة' : 'کۆد/مۆڵەت'}
                          </th>
                          {/* Sequential Number - Hidden in web view, visible in print */}
                          <th className="px-4 py-3 text-center hidden print:table-cell">
                            {lang === 'en' ? 'No.' : lang === 'ar' ? 'الرقم' : 'ژمارە'}
                          </th>
                          <th className="px-4 py-3">{lang === 'en' ? 'Date & Time' : lang === 'ar' ? 'التاريخ والوقت' : 'ڕێکەوت و کات'}</th>
                          <th className="px-4 py-3 text-center">{lang === 'en' ? 'Transaction Type' : lang === 'ar' ? 'نوع الحركة' : 'جۆری جووڵە'}</th>
                          <th className="px-4 py-3 text-left">{lang === 'en' ? 'Amount Transacted' : lang === 'ar' ? 'المبلغ المنقول' : 'بڕی جوڵێندراو'}</th>
                          <th className="px-4 py-3 text-center">{lang === 'en' ? 'Operator' : lang === 'ar' ? 'الموظف' : 'ئەنجامدەر (تێلەر)'}</th>
                          <th className="px-4 py-3">{lang === 'en' ? 'Notes & Details' : lang === 'ar' ? 'الملاحظات والتفاصيل' : 'تێبینی و وردەکارییەکان'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-150 dark:divide-slate-800 text-gray-700 dark:text-slate-200 whitespace-nowrap">
                        {/* Opening Balance Row */}
                        {Boolean((ledgerStartDate || ledgerEndDate) && !(ledgerStartDate === getTodayString() && ledgerEndDate === getTodayString())) && ledgerStartDate && (
                          <tr className="bg-amber-500/10 dark:bg-amber-500/10 font-semibold border-b-2 border-amber-500/25 dark:border-amber-500/30 text-amber-900 dark:text-amber-200">
                            <td className="px-4 py-3 text-center font-mono font-bold text-amber-700 dark:text-amber-400 print:hidden">—</td>
                            <td className="px-4 py-3 text-center font-bold text-amber-800 dark:text-amber-300 hidden print:table-cell">0</td>
                            <td className="px-4 py-3 font-mono text-amber-800 dark:text-amber-300 text-[11px] font-bold">{ledgerStartDate}</td>
                            <td className="px-4 py-3 text-center">
                              <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-900 dark:text-amber-200 border border-amber-500/30">
                                {lang === 'en' ? 'Opening Balance' : lang === 'ar' ? 'الرصيد السابق' : 'باڵانسی پێشتر'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-left font-mono font-bold text-amber-900 dark:text-amber-200 text-xs">
                              {activeCurrencies.map(c => `${c}: ${formatMoney(openingBalances[c] || 0, c)}`).join(' | ')}
                            </td>
                            <td className="px-4 py-3 text-center text-amber-700 dark:text-amber-400 text-[11px] font-bold">{lang === 'en' ? 'System' : 'سیستەم'}</td>
                            <td className="px-4 py-3 text-amber-800 dark:text-amber-300 text-[11px] whitespace-pre-wrap">
                              {lang === 'en' ? `Account balance prior to ${ledgerStartDate}` : lang === 'ar' ? `رصيد الحساب قبل تاريخ ${ledgerStartDate}` : `باڵانسی کۆنی کڕیار پێش بەرواری ${ledgerStartDate}`}
                            </td>
                          </tr>
                        )}
                        {filteredLedgerTransactions.map((tx, index) => {
                          const isNegative = tx.amount < 0;
                          let transType: string = tx.type;
                          if (tx.type === 'Deposit') transType = t.type_deposit || 'پارە دانان';
                          if (tx.type === 'Withdrawal') transType = t.type_withdrawal || 'ڕاکێشان';
                          if (tx.type === 'Exchange') {
                            transType = `${t.type_exchange || 'ئاڵوگۆڕ'} (${tx.legLabel || tx.currency})`;
                          }
                          if (tx.type === 'FastTransfer') transType = t.type_fast_transfer || 'حەواڵەی خێرا';
                          if (tx.type === 'StandardTransfer') transType = t.type_standard_transfer || 'حەواڵەی ستاندارد';
                          if (tx.type === 'InternalTransfer') transType = t.type_internal_transfer || 'حەواڵەی ناوخۆیی';
                          if (tx.type === 'SafeAdjustment') transType = t.type_safe_adjustment || 'گۆڕینی لایەنەکان';

                          const noteText = tx.notes ? (tx.rate ? `${tx.notes} (${lang === 'en' ? 'Rate' : lang === 'ar' ? 'سعر الصرف' : 'نرخی گۆڕینەوە'}: ${tx.rate})` : tx.notes) : (tx.rate ? `(${lang === 'en' ? 'Rate' : lang === 'ar' ? 'سعر الصرف' : 'نرخی گۆڕینەوە'}: ${tx.rate})` : '-');

                          return (
                            <tr key={`${tx.id}-${tx.currency}-${index}`} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/60 transition-colors">
                              {/* Code/License - Visible in web view, hidden in print */}
                              <td className="px-4 py-3.5 text-center font-mono font-bold text-gray-400 dark:text-slate-500 print:hidden">
                                {tx.id}
                              </td>
                              {/* Sequential Number (1 to N) - Hidden in web view, visible in print */}
                              <td className="px-4 py-3.5 text-center font-sans font-bold text-gray-800 dark:text-slate-200 hidden print:table-cell">
                                {index + 1}
                              </td>
                              <td className="px-4 py-3.5 font-mono text-gray-400 dark:text-slate-400 text-[10px]">
                                {formatKurdishDateTime(tx.timestamp)}
                              </td>
                              <td className="px-4 py-3.5 flex justify-center">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 w-fit border ${
                                  tx.type === 'Deposit' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40' :
                                  tx.type === 'Withdrawal' ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800/40' :
                                  'bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-800/40'
                                }`}>
                                  {tx.type === 'Deposit' && <ArrowDownRight className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
                                  {tx.type === 'Withdrawal' && <ArrowUpRight className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />}
                                  <span className="font-sans font-bold">{transType}</span>
                                </span>
                              </td>
                              <td className={`px-4 py-3.5 font-mono font-bold text-left font-sans text-xs ${isNegative ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                {isNegative ? '-' : '+'}{formatMoney(Math.abs(tx.amount), tx.currency)}
                              </td>
                              <td className="px-4 py-3.5 text-center text-gray-550 dark:text-slate-300 font-sans text-[11px] font-bold">
                                {tx.performedBy || 'System'}
                              </td>
                              <td className="px-4 py-3.5 text-gray-550 dark:text-slate-400 max-w-sm font-normal truncate text-right whitespace-pre-wrap" title={noteText}>
                                {noteText}
                              </td>
                            </tr>
                          );
                        })}
                        {filteredLedgerTransactions.length === 0 && (
                          <tr>
                            <td colSpan={7} className="text-center py-10 text-gray-400 dark:text-slate-500">
                              {lang === 'en' ? 'No transactions found matching criteria.' : lang === 'ar' ? 'لم يتم العثور على أي حركات تطابق الشروط.' : 'هیچ مامەڵەیەک نەدۆزرایەوە بەپێی ئەم فیلتەر و گەڕانە.'}
                            </td>
                          </tr>
                        )}
                        {/* Period Ending Balance Row */}
                        {Boolean((ledgerStartDate || ledgerEndDate) && !(ledgerStartDate === getTodayString() && ledgerEndDate === getTodayString())) && filteredLedgerTransactions.length > 0 && (
                          <tr className="bg-sky-500/10 dark:bg-sky-500/10 font-semibold border-t-2 border-sky-500/25 dark:border-sky-500/30 text-sky-900 dark:text-sky-200">
                            <td className="px-4 py-3 text-center font-mono font-bold text-sky-700 dark:text-sky-400 print:hidden">—</td>
                            <td className="px-4 py-3 text-center font-bold text-sky-800 dark:text-sky-300 hidden print:table-cell">—</td>
                            <td className="px-4 py-3 font-mono text-sky-800 dark:text-sky-300 text-[11px] font-bold">{ledgerEndDate || 'ئێستا'}</td>
                            <td className="px-4 py-3 text-center">
                              <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-sky-500/15 text-sky-900 dark:text-sky-200 border border-sky-500/30">
                                {lang === 'en' ? 'Period Ending Balance' : lang === 'ar' ? 'رصيد نهاية الفترة' : 'باڵانسی کۆتایی وادە'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-left font-mono font-bold text-sky-900 dark:text-sky-200 text-xs">
                              {activeCurrencies.map(c => {
                                const openB = ledgerStartDate ? (openingBalances[c] || 0) : 0;
                                const pNet = periodNetChanges[c] || 0;
                                return `${c}: ${formatMoney(openB + pNet, c)}`;
                              }).join(' | ')}
                            </td>
                            <td className="px-4 py-3 text-center text-sky-700 dark:text-sky-400 text-[11px] font-bold">{lang === 'en' ? 'System' : 'سیستەم'}</td>
                            <td className="px-4 py-3 text-sky-800 dark:text-sky-300 text-[11px] whitespace-pre-wrap">
                              {lang === 'en' ? `Final account balance at end of period` : lang === 'ar' ? `رصيد الحساب النهائي بنهاية الفترة` : `باڵانسی کۆتایی هەژمار بۆ بەرواری دیاریکراو`}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Printable Balances Summary at the Bottom - VISIBLE on print only */}
                <div className="hidden print:block border-2 border-gray-200 p-4 rounded-xl mt-6 bg-gray-50/80" dir="rtl">
                  <h3 className="text-xs font-black text-gray-900 mb-3 border-b border-gray-200 pb-1.5">
                    {lang === 'en' ? 'Account Balances Summary:' : lang === 'ar' ? 'ملخص أرصدة الحساب الحالية:' : 'پوختەی باڵانس و کۆتایی هەژماری کڕیار:'}
                  </h3>
                  <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(3, activeCurrencies.length)}, minmax(0, 1fr))` }}>
                    {activeCurrencies.map(curr => {
                      const hasDateFilter = Boolean(ledgerStartDate || ledgerEndDate);
                      const openingBal = ledgerStartDate ? (openingBalances[curr] || 0) : 0;
                      const periodNet = periodNetChanges[curr] || 0;
                      const closingBal = openingBal + periodNet;
                      const liveBal = selectedCustomerForTxLog.balances[curr] || 0;

                      if (!hasDateFilter) {
                        return (
                          <div key={curr} className="bg-white p-3 rounded-lg border border-gray-300 text-right shadow-xs">
                            <span className="text-[9px] text-gray-500 font-bold uppercase block mb-1">
                              {curr} {lang === 'en' ? 'Live Balance' : lang === 'ar' ? 'الرصيد الحالي' : 'باڵانسی ئێستا'}
                            </span>
                            <span className={`text-sm font-black font-mono block ${liveBal < 0 ? 'text-red-650' : 'text-emerald-700'}`}>
                              {formatMoney(liveBal, curr)}
                            </span>
                          </div>
                        );
                      }

                      return (
                        <div key={curr} className="bg-white p-3 rounded-lg border border-gray-300 text-right shadow-xs space-y-1">
                          <span className="text-[9px] text-gray-500 font-bold uppercase block border-b pb-1">
                            {curr} {lang === 'en' ? 'Statement' : 'حیسابات'}
                          </span>
                          {ledgerStartDate && (
                            <div className="flex justify-between text-[9px] text-gray-600">
                              <span>{lang === 'en' ? 'Opening Bal:' : 'باڵانسی پێشتر:'}</span>
                              <span className="font-mono font-bold">{formatMoney(openingBal, curr)}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-[9px] text-gray-600">
                            <span>{lang === 'en' ? 'Period Flow:' : 'جووڵەی وادە:'}</span>
                            <span className="font-mono font-bold">{periodNet >= 0 ? '+' : ''}{formatMoney(periodNet, curr)}</span>
                          </div>
                          <div className="flex justify-between text-[10px] text-gray-900 font-bold border-t pt-1">
                            <span>{lang === 'en' ? 'Period Ending Bal:' : 'باڵانسی کۆتایی وادە:'}</span>
                            <span className="font-mono">{formatMoney(closingBal, curr)}</span>
                          </div>
                          <div className="flex justify-between text-[9px] text-gray-500">
                            <span>{lang === 'en' ? 'Current Live Bal:' : 'باڵانسی ئێستا:'}</span>
                            <span className="font-mono">{formatMoney(liveBal, curr)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Signatures & Seal section (Print Only) */}
                <div className="hidden print:flex justify-between items-center pt-10 text-xs text-gray-700" dir={lang === 'en' ? 'ltr' : 'rtl'}>
                  <div className="text-center">
                    <p className="font-bold">{lang === 'en' ? 'Official Office Seal' : lang === 'ar' ? 'ختم المكتب الرسمي' : 'مۆری فەرمی نووسینگە'}</p>
                    <div className="w-24 h-16 border border-dashed border-gray-300 rounded mt-2 mx-auto"></div>
                  </div>
                  <div className="text-center">
                    <p className="font-bold">{lang === 'en' ? 'Exchange Manager Signature' : lang === 'ar' ? 'توقيع مدير الصيرفة' : 'واژۆی لێپرسراوی گۆڕینەوە'}</p>
                    <p className="text-[10px] text-gray-450 mt-8"></p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold">{lang === 'en' ? 'Customer Signature' : lang === 'ar' ? 'توقيع العميل / المساهم' : 'واژۆی پشکدار (کڕیار)'}</p>
                    <p className="text-[10px] text-gray-450 mt-8">{selectedCustomerForTxLog.name}</p>
                  </div>
                </div>

              </div>
            </div>
          </div>
        );
      })()}

      {/* Embedded print css overrides and spacing */}
      {/* Edit Expense Modal */}
      {editingExpense && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in no-print">
          <div className="bg-slate-950/90 backdrop-blur-2xl rounded-2xl p-6 max-w-md w-full space-y-4 shadow-[0_25px_60px_rgba(0,0,0,0.7)] border border-white/[0.12] text-white" dir={lang === 'en' ? 'ltr' : 'rtl'}>
            <div className="flex justify-between items-center border-b border-white/[0.08] pb-3">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <Pencil className="w-4 h-4 text-[#1D7AFC]" />
                {lang === 'en' ? 'Edit Expense' : lang === 'ar' ? 'تعديل المصروف' : 'دەستکاریکردنی خەرجی'}
              </h3>
              <button
                type="button"
                onClick={() => setEditingExpense(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExpenseEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  {lang === 'en' ? 'Amount' : lang === 'ar' ? 'المبلغ' : 'بڕی خەرجی'}
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  value={formatInputValue(editExpenseAmount)}
                  onChange={(e) => setEditExpenseAmount(parseInputValue(e.target.value))}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  {lang === 'en' ? 'Currency' : lang === 'ar' ? 'العملة' : 'دراو'}
                </label>
                <select
                  value={editExpenseCurrency}
                  onChange={(e) => setEditExpenseCurrency(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {currencies.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  {lang === 'en' ? 'Notes / Details' : lang === 'ar' ? 'الملاحظات والتفاصيل' : 'تێبینی و ڕوونکردنەوە'}
                </label>
                <textarea
                  rows={3}
                  value={editExpenseNotes}
                  onChange={(e) => setEditExpenseNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingExpense(null)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors"
                >
                  {lang === 'en' ? 'Cancel' : lang === 'ar' ? 'إلغاء' : 'پاشگەزبوونەوە'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary-dark transition-colors shadow-sm"
                >
                  {lang === 'en' ? 'Save Changes' : lang === 'ar' ? 'حفظ التعديلات' : 'پاشەکەوتکردن'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          /* Remove default headers and footers from browser printing */
          @page {
            size: A4 portrait;
            margin: 0 !important;
          }
          
          /* Neutralize HTML / body dark-mode entirely in printing */
          html, html.dark, :root, :root.dark {
            background-color: #ffffff !important;
            background: #ffffff !important;
            color: #000000 !important;
          }
          
          html.dark body, html.dark div, html.dark p, html.dark span, html.dark h1, html.dark h2, html.dark h3, html.dark h4, html.dark th, html.dark td, html.dark table {
            background-color: transparent !important;
            background: transparent !important;
            color: #000000 !important;
            border-color: #d1d5db !important;
            box-shadow: none !important;
            text-shadow: none !important;
          }

          body {
            background-color: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            box-sizing: border-box !important;
            width: 210mm !important;
            height: 297mm !important;
            overflow: visible !important;
          }

          /* Hide non-printable elements */
          .no-print {
            display: none !important;
          }

          /* Keep critical colors for balances, signals, debit and credits */
          .text-emerald-600, .text-emerald-700, .text-green-600, .text-green-700 {
            color: #15803d !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .text-red-650, .text-rose-800, .text-red-600, .text-red-500, .text-rose-600 {
            color: #b91c1c !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .text-blue-850, .text-blue-800, .text-blue-600 {
            color: #1e40af !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .text-gray-400, .text-gray-500, .text-gray-600, .text-gray-700, .text-gray-800, .text-gray-900 {
            color: #000000 !important;
          }

          /* Maintain layout adjustments */
          ${selectedCustomerForTxLog ? `
            /* Hide all other core app content of the website completely using visibility rules */
            body * {
              visibility: hidden !important;
            }
            
            /* Keep only the print wrapper and its nested descendants visible */
            .no-print-main-layout, .no-print-main-layout * {
              visibility: visible !important;
            }

            .no-print-main-layout {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 210mm !important;
              height: 297mm !important;
              background: #ffffff !important;
              z-index: 99999 !important;
              padding: 5mm 5mm !important;
              margin: 0 !important;
              display: flex !important;
              flex-direction: column !important;
              justify-content: center !important;
              box-sizing: border-box !important;
              page-break-after: avoid !important;
              page-break-before: avoid !important;
            }
            .ledger-print-container {
              border: 2px solid #111111 !important;
              border-radius: 8px !important;
              box-shadow: none !important;
              width: 200mm !important;
              height: 287mm !important;
              max-width: 200mm !important;
              max-height: 287mm !important;
              overflow: visible !important;
              background-color: #ffffff !important;
              background: #ffffff !important;
              padding: 10mm !important;
              margin: 0 auto !important;
              box-sizing: border-box !important;
              page-break-inside: avoid !important;
            }
            .ledger-print-container > div:not(.no-print) {
              padding: 0 !important;
              margin: 0 !important;
              display: flex !important;
              flex-direction: column !important;
              height: 100% !important;
              justify-content: space-between !important;
            }
          ` : ''}

          table th, table td {
            font-size: 11px !important;
            padding: 4px 6px !important;
            border-bottom: 1px solid #d1d5db !important;
          }
        }
      `}</style>
      {/* Edit Fast Transfer Modal */}
      {fastTransferToEdit && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-950/90 backdrop-blur-2xl rounded-2xl max-w-lg w-full border border-white/[0.12] shadow-[0_25px_60px_rgba(0,0,0,0.7)] overflow-hidden flex flex-col max-h-[90vh] animate-scale-in text-white">
            <div className="bg-[#1D7AFC]/20 border-b border-white/[0.1] px-6 py-4 text-white flex justify-between items-center">
              <h3 className="font-bold text-sm">
                {lang === 'en' ? 'Edit Fast Transfer' : lang === 'ar' ? 'تعديل الحوالة السريعة' : 'دەستکاریکردنی حەواڵەی خێرا'} ({fastTransferToEdit.id})
              </h3>
              <button onClick={() => setFastTransferToEdit(null)} className="text-slate-400 hover:text-white font-bold text-lg cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleSaveEditFast} className="p-6 space-y-3 overflow-y-auto text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">{lang === 'en' ? 'Sender (Customer)' : lang === 'ar' ? 'المرسل (العميل)' : 'نێرەر (کڕیار)'}</label>
                <SearchableCustomerSelect
                  value={editFastSenderId}
                  onChange={setEditFastSenderId}
                  customers={customers}
                  placeholder={lang === 'en' ? 'Select Sender...' : lang === 'ar' ? 'اختر المرسل...' : 'نێرەر هەڵبژێرە...'}
                  lang={lang}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">{lang === 'en' ? 'Receiver Name' : lang === 'ar' ? 'اسم المستلم' : 'ناوی وەرگر'}</label>
                  <input
                    type="text"
                    required
                    value={editFastRecName}
                    onChange={(e) => setEditFastRecName(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">{lang === 'en' ? 'Receiver Phone' : lang === 'ar' ? 'هاتف المستلم' : 'مۆبایلی وەرگر'}</label>
                  <input
                    type="text"
                    value={editFastRecPhone}
                    onChange={(e) => setEditFastRecPhone(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">{t.amount_label}</label>
                  <input
                    type="text"
                    required
                    value={formatInputValue(editFastAmount)}
                    onChange={(e) => setEditFastAmount(parseInputValue(e.target.value).toString())}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary outline-none font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">{lang === 'en' ? 'Currency' : lang === 'ar' ? 'العملة' : 'دراو'}</label>
                  <select
                    value={editFastCurrency}
                    onChange={(e) => setEditFastCurrency(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary outline-none font-bold"
                  >
                    {currencies.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">{t.transfer_fee}</label>
                <input
                  type="text"
                  value={formatInputValue(editFastFee)}
                  onChange={(e) => setEditFastFee(parseInputValue(e.target.value).toString())}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary outline-none font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">{lang === 'en' ? 'Notes' : lang === 'ar' ? 'ملاحظات' : 'تێبینی'}</label>
                <input
                  type="text"
                  value={editFastNotes}
                  onChange={(e) => setEditFastNotes(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary outline-none"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setFastTransferToEdit(null)}
                  className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-all cursor-pointer"
                >
                  {lang === 'en' ? 'Cancel' : lang === 'ar' ? 'إلغاء' : 'پاشگەزبوونەوە'}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl shadow-md transition-all cursor-pointer"
                >
                  {lang === 'en' ? 'Save Changes' : lang === 'ar' ? 'حفظ التغييرات' : 'پاشەکەوتکردن'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Standard Transfer Modal */}
      {standardTransferToEdit && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-950/90 backdrop-blur-2xl rounded-2xl max-w-lg w-full border border-white/[0.12] shadow-[0_25px_60px_rgba(0,0,0,0.7)] overflow-hidden flex flex-col max-h-[90vh] animate-scale-in text-white">
            <div className="bg-[#1D7AFC]/20 border-b border-white/[0.1] px-6 py-4 text-white flex justify-between items-center">
              <h3 className="font-bold text-sm">
                {lang === 'en' ? 'Edit Standard Transfer' : lang === 'ar' ? 'تعديل الحوالة القياسية' : 'دەستکاریکردنی حەواڵەی ستاندارد'} ({standardTransferToEdit.id})
              </h3>
              <button onClick={() => setStandardTransferToEdit(null)} className="text-slate-400 hover:text-white font-bold text-lg cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleSaveEditStandard} className="p-6 space-y-3 overflow-y-auto text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">{lang === 'en' ? 'Sender (Depositor)' : lang === 'ar' ? 'المرسل (المودع)' : 'نێرەر (سپارەر)'}</label>
                  <SearchableCustomerSelect
                    value={editStdSenderId}
                    onChange={setEditStdSenderId}
                    customers={customers}
                    placeholder={lang === 'en' ? 'Select Sender...' : lang === 'ar' ? 'اختر المرسل...' : 'نێرەر هەڵبژێرە...'}
                    lang={lang}
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">{lang === 'en' ? 'Receiver (Bureau / Trader)' : lang === 'ar' ? 'المستلم (المكتب)' : 'وەرگر (نووسینگە)'}</label>
                  <SearchableCustomerSelect
                    value={editStdReceiverId}
                    onChange={setEditStdReceiverId}
                    customers={customers}
                    placeholder={lang === 'en' ? 'Select Receiver...' : lang === 'ar' ? 'اختر المستلم...' : 'وەرگر هەڵبژێرە...'}
                    lang={lang}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">{lang === 'en' ? 'Beneficiary Name (Cash Recipient)' : lang === 'ar' ? 'اسم المستفيد النهائي' : 'ناوی وەرگری کۆتایی'}</label>
                  <input
                    type="text"
                    value={editStdBeneficiaryName}
                    onChange={(e) => setEditStdBeneficiaryName(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">{lang === 'en' ? 'Delivery Location' : lang === 'ar' ? 'موقع التسليم' : 'شوێنی تەسلیمکردن'}</label>
                  <input
                    type="text"
                    value={editStdDeliveryLocation}
                    onChange={(e) => setEditStdDeliveryLocation(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">{lang === 'en' ? 'Amount (USD)' : lang === 'ar' ? 'المبلغ (دولار)' : 'بڕی دۆلار'}</label>
                  <input
                    type="text"
                    required
                    value={formatInputValue(editStdAmountUSD)}
                    onChange={(e) => setEditStdAmountUSD(parseInputValue(e.target.value).toString())}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary outline-none font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">{lang === 'en' ? 'Currency' : lang === 'ar' ? 'العملة' : 'دراو'}</label>
                  <select
                    value={editStdCurrency}
                    onChange={(e) => setEditStdCurrency(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary outline-none font-bold"
                  >
                    {currencies.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">{lang === 'en' ? 'Buy Rate Add' : lang === 'ar' ? 'سعر الشراء' : 'کۆمسیۆنی کڕین'}</label>
                  <input
                    type="text"
                    value={formatInputValue(editStdBuyRate)}
                    onChange={(e) => setEditStdBuyRate(parseInputValue(e.target.value).toString())}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">{lang === 'en' ? 'Sell Rate Deduct' : lang === 'ar' ? 'سعر البيع' : 'کۆمسیۆنی فرۆشتن'}</label>
                  <input
                    type="text"
                    value={formatInputValue(editStdSellRate)}
                    onChange={(e) => setEditStdSellRate(parseInputValue(e.target.value).toString())}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">{lang === 'en' ? 'Notes' : lang === 'ar' ? 'ملاحظات' : 'تێبینی'}</label>
                <input
                  type="text"
                  value={editStdNotes}
                  onChange={(e) => setEditStdNotes(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary outline-none"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setStandardTransferToEdit(null)}
                  className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-all cursor-pointer"
                >
                  {lang === 'en' ? 'Cancel' : lang === 'ar' ? 'إلغاء' : 'پاشگەزبوونەوە'}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl shadow-md transition-all cursor-pointer"
                >
                  {lang === 'en' ? 'Save Changes' : lang === 'ar' ? 'حفظ التغييرات' : 'پاشەکەوتکردن'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
