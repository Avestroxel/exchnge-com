import { useState, FormEvent, useMemo } from 'react';
import { Send, Search, CheckCircle, Clock, ArrowRightLeft, FileText, Sparkles, Edit3, Trash2, Filter, Zap, RefreshCw, X, Ban } from 'lucide-react';
import { Customer, Currency, FastTransferDetails, StandardTransferDetails } from '../types';
import { AppState } from '../data/stateManager';
import { formatMoney, formatKurdishDateTime, formatInputValue, parseInputValue } from '../utils';
import { translations } from '../data/translations';
import ConfirmModal from './ConfirmModal';
import SearchableCustomerSelect from './SearchableCustomerSelect';
import GlassCard from './GlassCard';

interface TransfersViewProps {
  appState: AppState;
  onCreateFastTransfer: (
    senderId: string, 
    receiverName: string, 
    receiverPhone: string, 
    amount: number, 
    currency: Currency, 
    fee: number, 
    notes: string
  ) => void;
  onDeliverFastTransfer: (
    transferId: string,
    deliveryDetails?: {
      isOfficeDelivery?: boolean;
      officeName?: string;
      receiverName?: string;
      receiverPhone?: string;
    }
  ) => void;
  onCancelFastTransfer?: (
    transferId: string,
    reason?: string
  ) => void;
  onCreateStandardTransfer: (
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
  onDeleteFastTransfer?: (id: string) => void;
  onDeleteStandardTransfer?: (id: string) => void;
  onEditFastTransfer?: (id: string, updates: any) => void;
  onEditStandardTransfer?: (id: string, updates: any) => void;
  onPrintReceipt: (type: 'Fast' | 'Standard', data: any) => void;
}

type TransferSubTab = 'fast' | 'standard' | 'pickup' | 'history';

export default function TransfersView({
  appState,
  onCreateFastTransfer,
  onDeliverFastTransfer,
  onCancelFastTransfer,
  onCreateStandardTransfer,
  onDeleteFastTransfer,
  onDeleteStandardTransfer,
  onEditFastTransfer,
  onEditStandardTransfer,
  onPrintReceipt
}: TransfersViewProps) {
  const { customers, fastTransfers, standardTransfers, settings } = appState;
  const lang = settings.language || 'ku';
  const t = translations[lang];
  
  const [activeSubTab, setActiveSubTab] = useState<TransferSubTab>('fast');
  const [transferToDeliver, setTransferToDeliver] = useState<FastTransferDetails | null>(null);

  // Cancellation modal state
  const [transferToCancel, setTransferToCancel] = useState<FastTransferDetails | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  
  // States for delivery editing form modal
  const [showDeliverModal, setShowDeliverModal] = useState(false);
  const [deliverIsOffice, setDeliverIsOffice] = useState(false);
  const [deliverOfficeName, setDeliverOfficeName] = useState('');
  const [deliverReceiverName, setDeliverReceiverName] = useState('');
  const [deliverReceiverPhone, setDeliverReceiverPhone] = useState('');

  // History Filter state
  const [historyFilter, setHistoryFilter] = useState<'all' | 'fast' | 'standard'>('all');
  const [historySearch, setHistorySearch] = useState('');
  const [filterTodayOnly, setFilterTodayOnly] = useState(true);

  const isToday = (timestamp?: string) => {
    if (!timestamp) return false;
    const txDate = new Date(timestamp);
    const today = new Date();
    return txDate.getFullYear() === today.getFullYear() &&
           txDate.getMonth() === today.getMonth() &&
           txDate.getDate() === today.getDate();
  };

  // Delete modal state
  const [transferToDelete, setTransferToDelete] = useState<{ id: string; type: 'Fast' | 'Standard'; name: string } | null>(null);

  // Edit Fast Transfer state
  const [fastTransferToEdit, setFastTransferToEdit] = useState<FastTransferDetails | null>(null);
  const [editFastSenderId, setEditFastSenderId] = useState('');
  const [editFastRecName, setEditFastRecName] = useState('');
  const [editFastRecPhone, setEditFastRecPhone] = useState('');
  const [editFastAmount, setEditFastAmount] = useState('');
  const [editFastCurrency, setEditFastCurrency] = useState<Currency>('USD');
  const [editFastFee, setEditFastFee] = useState('');
  const [editFastNotes, setEditFastNotes] = useState('');

  // Edit Standard Transfer state
  const [standardTransferToEdit, setStandardTransferToEdit] = useState<StandardTransferDetails | null>(null);
  const [editStdSenderId, setEditStdSenderId] = useState('');
  const [editStdReceiverId, setEditStdReceiverId] = useState('');
  const [editStdBeneficiaryName, setEditStdBeneficiaryName] = useState('');
  const [editStdDeliveryLocation, setEditStdDeliveryLocation] = useState('');
  const [editStdAmountUSD, setEditStdAmountUSD] = useState('');
  const [editStdBuyRate, setEditStdBuyRate] = useState('');
  const [editStdSellRate, setEditStdSellRate] = useState('');
  const [editStdNotes, setEditStdNotes] = useState('');
  const [editStdCurrency, setEditStdCurrency] = useState<Currency>('USD');

  const handleOpenDeliverModal = (t: FastTransferDetails) => {
    setTransferToDeliver(t);
    setDeliverIsOffice(t.isOfficeDelivery || false);
    setDeliverOfficeName(t.officeName || '');
    setDeliverReceiverName(t.receiverName || '');
    setDeliverReceiverPhone(t.receiverPhone || '');
    setShowDeliverModal(true);
  };

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

  const handleSaveEditFast = (e: FormEvent) => {
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

  const handleSaveEditStandard = (e: FormEvent) => {
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

  const handleConfirmDelete = () => {
    if (!transferToDelete) return;
    if (transferToDelete.type === 'Fast' && onDeleteFastTransfer) {
      onDeleteFastTransfer(transferToDelete.id);
    } else if (transferToDelete.type === 'Standard' && onDeleteStandardTransfer) {
      onDeleteStandardTransfer(transferToDelete.id);
    }
    setTransferToDelete(null);
  };
  
  // Search state for Fast pickup/code search
  const [pickupSearch, setPickupSearch] = useState('');

  // 1. Fast Transfer State
  const [fastSenderId, setFastSenderId] = useState('');
  const [fastRecName, setFastRecName] = useState('');
  const [fastRecPhone, setFastRecPhone] = useState('');
  const [fastAmount, setFastAmount] = useState('');
  const [fastCurrency, setFastCurrency] = useState<Currency>('USD');
  const [fastFee, setFastFee] = useState('');
  const [fastNotes, setFastNotes] = useState('');

  // 2. Standard Hawala State
  const [stdSenderId, setStdSenderId] = useState('');
  const [stdReceiverId, setStdReceiverId] = useState('');
  const [stdCurrency, setStdCurrency] = useState<Currency>('USD');
  const [stdAmountUSD, setStdAmountUSD] = useState('');
  const [stdBuyRate, setStdBuyRate] = useState('');
  const [stdSellRate, setStdSellRate] = useState('');
  const [stdBeneficiaryName, setStdBeneficiaryName] = useState('');
  const [stdDeliveryLocation, setStdDeliveryLocation] = useState('');
  const [stdNotes, setStdNotes] = useState('');

  // Senders/receivers lookup
  const nonSystemCustomers = useMemo(() => {
    return customers.filter(c => 
      c.id !== 'system-expenses' && 
      c.id !== 'system-exchange' && 
      c.id !== 'system-transfer-fee' && 
      c.id !== 'system-profit' &&
      c.id !== 'system-fast-hawala'
    );
  }, [customers]);

  const currentFastSender = useMemo(() => {
    return customers.find(c => c.id === fastSenderId);
  }, [customers, fastSenderId]);

  const currentStdSender = useMemo(() => {
    return customers.find(c => c.id === stdSenderId);
  }, [customers, stdSenderId]);

  const currentStdReceiver = useMemo(() => {
    return customers.find(c => c.id === stdReceiverId);
  }, [customers, stdReceiverId]);

  const filteredFastTransfers = useMemo(() => {
    // Exclude cancelled fast transfers from Transfers history view (they are viewable in Reports -> Cancelled Transfers)
    let result = fastTransfers.filter(ft => ft.status !== 'Cancelled');
    if (filterTodayOnly) {
      result = result.filter(ft => isToday(ft.createdAt));
    }
    if (historySearch.trim()) {
      const q = historySearch.toLowerCase();
      result = result.filter(ft => 
        ft.id.toLowerCase().includes(q) ||
        ft.senderName.toLowerCase().includes(q) ||
        ft.receiverName.toLowerCase().includes(q) ||
        ft.receiverPhone?.includes(q)
      );
    }
    return result;
  }, [fastTransfers, historySearch, filterTodayOnly]);

  const filteredStandardTransfers = useMemo(() => {
    let result = standardTransfers;
    if (filterTodayOnly) {
      result = result.filter(st => isToday(st.createdAt));
    }
    if (historySearch.trim()) {
      const q = historySearch.toLowerCase();
      result = result.filter(st => 
        st.id.toLowerCase().includes(q) ||
        st.senderName.toLowerCase().includes(q) ||
        st.receiverName.toLowerCase().includes(q) ||
        st.beneficiaryName.toLowerCase().includes(q) ||
        st.deliveryLocation?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [standardTransfers, historySearch, filterTodayOnly]);

  // Auto spread calculation previews for standard hawala
  const numUSD = parseFloat(stdAmountUSD) || 0;
  const numBuy = parseFloat(stdBuyRate) || 0;
  const numSell = parseFloat(stdSellRate) || 0;
  const calculatedSenderValue = numUSD + numBuy;
  const calculatedReceiverValue = numUSD + numSell;
  const calculatedProfitVal = numSell - numBuy;

  const handleCreateFastSubmit = (e: FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(fastAmount);
    const feeVal = parseFloat(fastFee) || 0;
    if (!fastSenderId || isNaN(amountVal) || amountVal <= 0) return;

    onCreateFastTransfer(
      fastSenderId,
      fastRecName,
      fastRecPhone,
      amountVal,
      fastCurrency,
      feeVal,
      fastNotes
    );

    // reset
    setFastSenderId('');
    setFastRecName('');
    setFastRecPhone('');
    setFastAmount('');
    setFastFee('');
    setFastNotes('');
    setActiveSubTab('pickup'); // move to pickup search or history
  };

  const handleCreateStandardSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!stdSenderId || !stdReceiverId || stdSenderId === stdReceiverId) {
      alert(
        lang === 'en' 
          ? 'Sender and Receiver must be two different accounts' 
          : lang === 'ar' 
            ? 'يجب أن يكون المرسل والمستلم حسابين مختلفين' 
            : 'نێرەر و وەرگر دەبێت دوو هەژماری جیاواز بن'
      );
      return;
    }
    if (numUSD <= 0 || isNaN(numBuy) || isNaN(numSell)) return;

    onCreateStandardTransfer(
      stdSenderId,
      stdReceiverId,
      numUSD,
      numBuy,
      numSell,
      stdBeneficiaryName,
      stdDeliveryLocation,
      stdNotes,
      stdCurrency
    );

    // reset
    setStdSenderId('');
    setStdReceiverId('');
    setStdAmountUSD('');
    setStdBuyRate('');
    setStdSellRate('');
    setStdBeneficiaryName('');
    setStdDeliveryLocation('');
    setStdNotes('');
    setActiveSubTab('history');
  };

  // Searching pending fast transfers for delivery pickup
  const filteredPickups = useMemo(() => {
    return fastTransfers.filter(t => 
      t.status === 'Pending' && 
      (t.id.toLowerCase().includes(pickupSearch.toLowerCase()) || 
       t.receiverName.toLowerCase().includes(pickupSearch.toLowerCase()) ||
       t.receiverPhone.includes(pickupSearch))
    );
  }, [fastTransfers, pickupSearch]);

  return (
    <div className={`space-y-6 animate-fade-in ${lang === 'en' ? 'text-left' : 'text-right'}`}>
      {/* Top Header Card */}
      <GlassCard className="p-0" contentClassName="p-5 sm:p-6 space-y-4">
        <div className="view-header" data-animate="header">
          <h2 className="text-xl sm:text-2xl font-bold text-white rtl:border-r-4 rtl:pr-3 ltr:border-l-4 ltr:pl-3 border-[#1D7AFC] flex items-center gap-2.5">
            <Send className="w-6 h-6 text-[#1D7AFC]" />
            <span>{t.transfers_title}</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">{t.transfers_desc}</p>
        </div>

        {/* Internal submenu tabs */}
        <div className="flex items-center gap-2 border-t border-white/[0.08] pt-3 text-xs font-bold no-print overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('fast')}
            className={`px-4 py-2 rounded-xl transition-all relative flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'fast' 
                ? 'bg-[#1D7AFC] text-white shadow-[0_4px_16px_rgba(29,122,252,0.4)]' 
                : 'bg-white/[0.05] text-slate-300 hover:text-white hover:bg-white/[0.1] border border-white/[0.08]'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>{t.fast_transfers}</span>
          </button>

          <button
            onClick={() => setActiveSubTab('standard')}
            className={`px-4 py-2 rounded-xl transition-all relative flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'standard' 
                ? 'bg-[#1D7AFC] text-white shadow-[0_4px_16px_rgba(29,122,252,0.4)]' 
                : 'bg-white/[0.05] text-slate-300 hover:text-white hover:bg-white/[0.1] border border-white/[0.08]'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>{t.standard_transfers}</span>
          </button>

          <button
            onClick={() => setActiveSubTab('pickup')}
            className={`px-4 py-2 rounded-xl transition-all relative flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'pickup' 
                ? 'bg-[#1D7AFC] text-white shadow-[0_4px_16px_rgba(29,122,252,0.4)]' 
                : 'bg-white/[0.05] text-slate-300 hover:text-white hover:bg-white/[0.1] border border-white/[0.08]'
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            <span>{lang === 'en' ? 'Deliver / Pickup' : lang === 'ar' ? 'استلام حوالة' : 'وەرگرتن / گەیاندن'}</span>
            {fastTransfers.filter(ft => ft.status === 'Pending').length > 0 && (
              <span className="bg-white/20 text-white px-2 py-0.5 rounded-full text-[10px] font-mono font-bold">
                {fastTransfers.filter(ft => ft.status === 'Pending').length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('history')}
            className={`px-4 py-2 rounded-xl transition-all relative flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'history' 
                ? 'bg-[#1D7AFC] text-white shadow-[0_4px_16px_rgba(29,122,252,0.4)]' 
                : 'bg-white/[0.05] text-slate-300 hover:text-white hover:bg-white/[0.1] border border-white/[0.08]'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>{lang === 'en' ? 'Transfers' : lang === 'ar' ? 'الحوالات' : 'حەواڵەکان'}</span>
          </button>
        </div>
      </GlassCard>

      {/* --- Tab Content --- */}
      
      {/* 1. Fast Transfer */}
      {activeSubTab === 'fast' && (
        <div data-animate="card" className="bento-card transform-gpu bg-white p-5 md:p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
          <form onSubmit={handleCreateFastSubmit} className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
              <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <Send className="w-4 h-4 text-primary" />
                {lang === 'en' ? 'Send New Fast Transfer (Cash-to-Cash)' : lang === 'ar' ? 'إرسال حوالة سريعة جديدة (كاش)' : 'ناردنی حەواڵەی خێرای نوێ'}
              </h3>
              <span className="text-xs text-gray-400 font-medium">
                {lang === 'en' ? 'Fill all transfer fields below' : lang === 'ar' ? 'قم بملء جميع الحقول أدناه' : 'سەرجەم زانیارییەکانی حەواڵەکە پڕبکەوە'}
              </span>
            </div>

            {/* Horizontal inline field grid without individual card boxes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3 items-end">
              {/* 1. Sender Customer */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 truncate">
                  {lang === 'en' ? 'Sender Customer' : lang === 'ar' ? 'العميل المرسل' : 'کڕیاری نێرەر (خاوەن هەژمار)'}
                </label>
                <SearchableCustomerSelect
                  value={fastSenderId}
                  onChange={(id) => setFastSenderId(id)}
                  customers={customers}
                  placeholder={lang === 'en' ? 'Select Sender...' : lang === 'ar' ? 'اختر المرسل...' : 'هەڵبژاردنی نێرەر...'}
                  lang={lang}
                />
              </div>

              {/* 2. Currency */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 truncate">
                  {t.currency_label}
                </label>
                <select
                  value={fastCurrency}
                  onChange={(e) => setFastCurrency(e.target.value as Currency)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none bg-white font-bold text-gray-800 h-[38px]"
                >
                  {appState.currencies.map(cur => (
                    <option key={cur} value={cur}>
                      {cur === 'USD' ? 'USD ($)' : cur === 'IQD' ? 'IQD (د.ع)' : cur === 'IRR' ? 'IRR (﷼)' : cur}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Transfer Fee */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 truncate">
                  {t.transfer_fee}
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder={lang === 'en' ? 'Fee e.g. 10' : lang === 'ar' ? 'العمولة 10' : 'نموونە: 10'}
                  value={formatInputValue(fastFee)}
                  onChange={(e) => setFastFee(parseInputValue(e.target.value))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none font-mono text-left bg-white font-bold h-[38px]"
                />
              </div>

              {/* 4. Sent Amount */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 truncate">
                  {lang === 'en' ? 'Amount to Send' : lang === 'ar' ? 'المبلغ المرسل' : 'بڕی نێردراو'}
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  placeholder={lang === 'en' ? 'e.g. 1,000' : lang === 'ar' ? '1,000' : 'نموونە: 1,000'}
                  value={formatInputValue(fastAmount)}
                  onChange={(e) => setFastAmount(parseInputValue(e.target.value))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none font-mono text-left bg-white font-bold text-gray-900 h-[38px]"
                />
              </div>

              {/* 5. Receiver Name */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 truncate">
                  {t.receiver_name}
                </label>
                <input
                  type="text"
                  required
                  placeholder={lang === 'en' ? "Full Name..." : lang === 'ar' ? 'الاسم الثلاثي...' : 'ناوی تەواوی وەرگر...'}
                  value={fastRecName}
                  onChange={(e) => setFastRecName(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none bg-white font-medium h-[38px]"
                />
              </div>

              {/* 6. Receiver Phone */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 truncate">
                  {t.receiver_phone}
                </label>
                <input
                  type="text"
                  required
                  placeholder="0750XXXXXXX"
                  value={fastRecPhone}
                  onChange={(e) => setFastRecPhone(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none font-mono text-left bg-white font-medium h-[38px]"
                />
              </div>

              {/* 7. Notes */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 truncate">
                  {t.notes_label}
                </label>
                <input
                  type="text"
                  placeholder={lang === 'en' ? 'Notes...' : lang === 'ar' ? 'ملاحظات...' : 'تێبینی...'}
                  value={fastNotes}
                  onChange={(e) => setFastNotes(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none bg-white h-[38px]"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-6 py-2.5 bg-primary text-white font-bold rounded-xl text-xs hover:bg-primary-dark transition-all flex items-center gap-1.5 shadow-md shadow-primary/10 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>
                  {lang === 'en' ? 'Register & Deduct Balance' : lang === 'ar' ? 'تسجيل وخصم الرصيد' : 'تۆمارکردن و بڕینی باڵانس'}
                </span>
              </button>
            </div>
          </form>

          {/* Balance sheet display (Placed below the form full width) */}
          <div className="bg-gradient-to-r from-gray-50 via-white to-gray-50 p-4 md:p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-3">
            <h4 className="font-bold text-gray-900 text-xs flex items-center gap-2 border-b border-gray-150 pb-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
              {lang === 'en' ? 'Balance Deduction Details' : lang === 'ar' ? 'تفاصيل خصم الرصيد' : 'وردەکاری دەستکاریکردنی باڵانس'}
            </h4>
            {currentFastSender ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs pt-1">
                <div className="bg-white p-2.5 rounded-xl border border-gray-200/80 shadow-2xs">
                  <span className="text-[10px] text-gray-400 font-bold block">{lang === 'en' ? 'Customer Name' : lang === 'ar' ? 'اسم العميل' : 'ناوی کڕیار'}</span>
                  <strong className="text-gray-900 text-xs truncate block mt-0.5">{currentFastSender.name}</strong>
                </div>

                <div className="bg-white p-2.5 rounded-xl border border-gray-200/80 shadow-2xs">
                  <span className="text-[10px] text-gray-400 font-bold block">{lang === 'en' ? 'Previous Balance' : lang === 'ar' ? 'الرصيد السابق' : 'باڵانسی فەرمی پێشتر'}</span>
                  <span className="font-mono text-primary font-bold text-xs mt-0.5 block">{formatMoney(currentFastSender.balances[fastCurrency], fastCurrency)}</span>
                </div>

                <div className="bg-white p-2.5 rounded-xl border border-gray-200/80 shadow-2xs">
                  <span className="text-[10px] text-gray-400 font-bold block">{lang === 'en' ? 'Sent Amount' : lang === 'ar' ? 'المبلغ المرسل' : 'بڕی نێردراو'}</span>
                  <span className="font-mono text-gray-800 font-semibold text-xs mt-0.5 block">{formatMoney(parseFloat(fastAmount)||0, fastCurrency)}</span>
                </div>

                <div className="bg-white p-2.5 rounded-xl border border-gray-200/80 shadow-2xs">
                  <span className="text-[10px] text-gray-400 font-bold block">{lang === 'en' ? 'Transfer Fee' : lang === 'ar' ? 'العمولة' : 'کرێی حەواڵە'}</span>
                  <span className="font-mono text-amber-600 font-bold text-xs mt-0.5 block">+{formatMoney(parseFloat(fastFee)||0, fastCurrency)}</span>
                </div>

                <div className="bg-white p-2.5 rounded-xl border border-gray-200/80 shadow-2xs">
                  <span className="text-[10px] text-gray-400 font-bold block">{lang === 'en' ? 'Total Deduction' : lang === 'ar' ? 'إجمالي الخصم' : 'تێکڕای بڕین (-بڕ و کرێ)'}</span>
                  <span className="font-mono text-red-600 font-bold text-xs mt-0.5 block">-{formatMoney((parseFloat(fastAmount)||0) + (parseFloat(fastFee)||0), fastCurrency)}</span>
                </div>

                <div className="bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-200/80 shadow-2xs">
                  <span className="text-[10px] text-emerald-800 font-bold block">{lang === 'en' ? 'New Balance' : lang === 'ar' ? 'الرصيد الجديد' : 'باڵانسی نوێ'}</span>
                  <span className="font-mono text-emerald-700 font-bold text-xs mt-0.5 block">{formatMoney(currentFastSender.balances[fastCurrency] - ((parseFloat(fastAmount)||0) + (parseFloat(fastFee)||0)), fastCurrency)}</span>
                </div>
              </div>
            ) : (
              <p className="text-gray-400 text-xs py-1">
                {lang === 'en' ? 'Select sender to view real-time balance details.' : lang === 'ar' ? 'اختر المرسل لعرض تفاصيل الرصيد الفعلي.' : 'نێرەر هەڵبژێرە تا باڵانسی فەرمی و بڕین بە ڕاستەقینەیی ببینی.'}
              </p>
            )}
          </div>
        </div>
      )}

      {/* 2. Standard Spread Transfer */}
      {activeSubTab === 'standard' && (
        <div data-animate="card" className="bento-card transform-gpu bg-white p-5 md:p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
          <form onSubmit={handleCreateStandardSubmit} className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
              <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <Send className="w-4 h-4 text-primary" />
                {lang === 'en' ? 'Send Standard Transfer with Rate Difference (Spread)' : lang === 'ar' ? 'إرسال حوالة قياسية بفارق السعر (سبريد)' : 'ناردنی حەواڵەی ستاندارد بە جیاوازی نرخ (سپرێد)'}
              </h3>
              <span className="text-xs text-gray-400 font-medium">
                {lang === 'en' ? 'Fill standard hawala spread parameters' : lang === 'ar' ? 'حدد معطيات السبريد والحسابات' : 'زانیاری و تێچووی سپرێدی حەواڵەکە پڕبکەوە'}
              </span>
            </div>
            
            {/* Top Row: Buying and Selling Customers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Buying Customer */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 truncate">
                  {lang === 'en' ? `Buying Customer (${stdCurrency})` : lang === 'ar' ? `العميل المشتري (${stdCurrency})` : `کڕیاری کڕین (${stdCurrency})`}
                </label>
                <SearchableCustomerSelect
                  value={stdSenderId}
                  onChange={(id) => setStdSenderId(id)}
                  customers={customers}
                  disabledId={stdReceiverId}
                  placeholder={lang === 'en' ? 'Select Buying Customer...' : lang === 'ar' ? 'اختر العميل المشتري...' : 'هەڵبژاردنی کڕیاری کڕین...'}
                  lang={lang}
                />
              </div>

              {/* Selling Customer */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 truncate">
                  {lang === 'en' ? `Selling Customer (${stdCurrency})` : lang === 'ar' ? `العميل البائع (${stdCurrency})` : `کڕیاری فرۆشتن (${stdCurrency})`}
                </label>
                <SearchableCustomerSelect
                  value={stdReceiverId}
                  onChange={(id) => setStdReceiverId(id)}
                  customers={customers}
                  disabledId={stdSenderId}
                  placeholder={lang === 'en' ? 'Select Selling Customer...' : lang === 'ar' ? 'اختر العميل البائع...' : 'هەڵبژاردنی کڕیاری فرۆشتن...'}
                  lang={lang}
                />
              </div>
            </div>

            {/* Horizontal inline field grid for remaining details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3 items-end">
              {/* 1. Currency */}
              <div>
                <label className="block text-xs font-bold text-primary mb-1 truncate">
                  {lang === 'en' ? 'Currency' : lang === 'ar' ? 'العملة' : 'دراو'}
                </label>
                <select
                  required
                  value={stdCurrency}
                  onChange={(e) => setStdCurrency(e.target.value as Currency)}
                  className="w-full border border-primary/30 rounded-xl px-2.5 py-2 text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none font-bold bg-primary/5 text-primary h-[38px]"
                >
                  {appState.currencies.map(cur => (
                    <option key={cur} value={cur}>
                      {cur === 'USD' ? 'USD ($)' : cur === 'IQD' ? 'IQD (د.ع)' : cur === 'IRR' ? 'IRR (﷼)' : cur}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Buy Premium */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 truncate">
                  {lang === 'en' ? 'Buy Premium' : lang === 'ar' ? 'الشراء' : 'کڕین (سپرێد)'}
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  placeholder="e.g. 10"
                  value={formatInputValue(stdBuyRate)}
                  onChange={(e) => setStdBuyRate(parseInputValue(e.target.value))}
                  className="w-full border border-gray-200 rounded-xl px-2.5 py-2 text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none font-mono text-left bg-white font-bold h-[38px]"
                />
              </div>

              {/* 3. Sell Premium */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 truncate">
                  {lang === 'en' ? 'Sell Premium' : lang === 'ar' ? 'البيع' : 'فرۆشتن (سپرێد)'}
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  placeholder="e.g. 15"
                  value={formatInputValue(stdSellRate)}
                  onChange={(e) => setStdSellRate(parseInputValue(e.target.value))}
                  className="w-full border border-gray-200 rounded-xl px-2.5 py-2 text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none font-mono text-left bg-white font-bold h-[38px]"
                />
              </div>

              {/* 4. Amount */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 truncate">
                  {lang === 'en' ? 'Amount' : lang === 'ar' ? 'المبلغ' : 'بڕی نێردراو'}
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  placeholder="1,000"
                  value={formatInputValue(stdAmountUSD)}
                  onChange={(e) => setStdAmountUSD(parseInputValue(e.target.value))}
                  className="w-full border border-gray-200 rounded-xl px-2.5 py-2 text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none font-mono text-left bg-white font-bold text-gray-900 h-[38px]"
                />
              </div>

              {/* 7. Beneficiary Name */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 truncate">
                  {lang === 'en' ? 'Beneficiary Name' : lang === 'ar' ? 'المستفيد' : 'ناوی سودمەند'}
                </label>
                <input
                  type="text"
                  placeholder={lang === 'en' ? 'Optional...' : lang === 'ar' ? 'اسم المستفيد...' : 'خوازراو...'}
                  value={stdBeneficiaryName}
                  onChange={(e) => setStdBeneficiaryName(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-2.5 py-2 text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none bg-white font-medium h-[38px]"
                />
              </div>

              {/* 8. Delivery Location */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 truncate">
                  {lang === 'en' ? 'Location' : lang === 'ar' ? 'الموقع' : 'شوێنی گەیاندن'}
                </label>
                {settings.locations && settings.locations.length > 0 ? (
                  <select
                    required
                    value={stdDeliveryLocation}
                    onChange={(e) => setStdDeliveryLocation(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-2 py-2 text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none bg-white font-sans h-[38px]"
                    id="delivery_location_select"
                  >
                    <option value="">
                      {lang === 'en' ? '-- Location --' : lang === 'ar' ? '-- الموقع --' : '-- شوێن --'}
                    </option>
                    {settings.locations.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    placeholder={lang === 'en' ? 'Location...' : lang === 'ar' ? 'مكان التسليم...' : 'سلێمانی...'}
                    value={stdDeliveryLocation}
                    onChange={(e) => setStdDeliveryLocation(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-2.5 py-2 text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none bg-white font-sans h-[38px]"
                    id="delivery_location_input"
                  />
                )}
              </div>

              {/* 9. Notes */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 truncate">
                  {t.notes_label}
                </label>
                <input
                  type="text"
                  placeholder={lang === 'en' ? 'Notes...' : lang === 'ar' ? 'ملاحظات...' : 'تێبینی...'}
                  value={stdNotes}
                  onChange={(e) => setStdNotes(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-2.5 py-2 text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none bg-white h-[38px]"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-6 py-2.5 bg-primary text-white font-bold rounded-xl text-xs hover:bg-primary-dark transition-all flex items-center gap-1.5 shadow-md shadow-primary/10 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                <span>
                  {lang === 'en' ? 'Settle & Execute Balances' : lang === 'ar' ? 'تسوية وتنفيذ الأرصدة' : 'ڕێکخستن و جێبەجێکردنی هاوسەنگی'}
                </span>
              </button>
            </div>
          </form>

          {/* Calculator spread helper preview (Placed full-width below the form) */}
          <div className="bg-gradient-to-r from-gray-50 via-white to-gray-50 p-4 md:p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-3 text-xs">
            <h4 className="font-bold text-gray-900 text-xs flex items-center gap-2 border-b border-gray-150 pb-2 text-primary">
              <Sparkles className="w-4 h-4 text-amber-500" />
              {lang === 'en' ? 'Transfer Equation Calculator' : lang === 'ar' ? 'محاسب معادلة التحويل والحوالة' : 'وردەکاری ژمێرکاری و هەژماری سپرێد'}
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
              <div className="bg-white p-2.5 rounded-xl border border-gray-200/80 shadow-2xs">
                <span className="text-[10px] text-gray-400 font-bold block">{lang === 'en' ? 'Core Amount' : lang === 'ar' ? 'المبلغ الأساسي' : 'بڕی سەرەکی'}</span>
                <span className="font-mono text-gray-800 font-bold text-xs mt-0.5 block">{formatMoney(numUSD, stdCurrency)}</span>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-gray-200/80 shadow-2xs">
                <span className="text-[10px] text-gray-400 font-bold block">{lang === 'en' ? 'Buying Account (Credited)' : lang === 'ar' ? 'حساب الشراء' : 'حیسابی کڕین (دیاری پێدەگات)'}</span>
                <span className="font-mono text-green-600 font-bold text-xs mt-0.5 block">+{formatMoney(calculatedSenderValue, stdCurrency)}</span>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-gray-200/80 shadow-2xs">
                <span className="text-[10px] text-gray-400 font-bold block">{lang === 'en' ? 'Selling Account (Debited)' : lang === 'ar' ? 'حساب البيع' : 'حیسابی فرۆشتن (لێی دەردەکرێت)'}</span>
                <span className="font-mono text-red-600 font-bold text-xs mt-0.5 block">-{formatMoney(calculatedReceiverValue, stdCurrency)}</span>
              </div>

              <div className="bg-blue-50/70 p-2.5 rounded-xl border border-blue-200/80 shadow-2xs">
                <span className="text-[10px] text-blue-800 font-bold block">{lang === 'en' ? 'Office Profit' : lang === 'ar' ? 'ربح المكتب' : 'قازانجی نووسینگە'}</span>
                <span className="font-mono text-blue-700 font-bold text-xs mt-0.5 block">{formatMoney(calculatedProfitVal, stdCurrency)}</span>
              </div>
            </div>

            <p className="text-[10px] text-gray-400 font-medium pt-1">
              {lang === 'en' 
                ? `Notice: This profit is registered from the ledger difference between both customers, and will be physically realized in the Safe as cash when their accounts are settled.` 
                : lang === 'ar' 
                  ? `ملاحظة: يتم تسجيل هذا الربح من فرق الحساب الجاري للعميلين، ويدخل في صندوق الخزينة نقداً بمجرد تسوية حساباتهما بالقبض أو الصرف.` 
                  : `سەرنج: ئەم قازانجە لە جیاوازی هەژماری نێوان کڕیارەکان تۆمار دەکرێت، کاتێک کڕیارەکان وەسڵەکانیان بە نەختینە لەگەڵ سندوقی نقدی یەکلایی دەکەنەوە قازانجەکە دەچێتە سندوق.`}
            </p>
          </div>
        </div>
      )}

      {/* 4. Pickup Search area */}
      {activeSubTab === 'pickup' && (
        <div className="space-y-4 animate-fade-in">
          <div data-animate="card" className="bento-card transform-gpu bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-gray-950">
              {lang === 'en' ? 'Fast Transfer Beneficiaries (Pickup Center)' : lang === 'ar' ? 'مستفيدي الحوالات السريعة (قيد الاستلام)' : 'سوودمەندانی حەواڵەی خێرا (پۆلی وەرگرتن)'}
            </h3>
            <p className="text-xs text-gray-400">
              {lang === 'en' ? "When receiver visits the office, search by Transfer Code (HW-xxxx) or receiver phone/name to pay out." : lang === 'ar' ? "عند حضور المستلم إلى المكتب، اكتب رمز الحوالة (HW-xxxx) أو هاتف/اسم المستلم هنا للصرف." : "کاتێک کەسی وەرگر دێتە نوسینگە، لێرەدا کۆدی حەواڵەکە (HW-xxxx) یان مۆبایلەکەی بنووسە بۆ دۆزینەوە."}
            </p>

            <div className="relative">
              <input
                type="text"
                placeholder={lang === 'en' ? 'Search by transfer code, receiver name, or phone...' : lang === 'ar' ? 'ابحث عن رمز الحوالة، اسم المستلم، أو الهاتف...' : 'گەڕان بەدوای کۆدی حەواڵە یان ناوی وەرگر یان ژمارەی تەلەفۆن...'}
                value={pickupSearch}
                onChange={(e) => setPickupSearch(e.target.value)}
                className={`w-full border border-gray-200 rounded-xl px-10 py-2.5 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none font-medium ${lang === 'en' ? 'text-left pl-10 pr-4' : 'text-right pr-10 pl-4'}`}
              />
              <Search className={`w-4.5 h-4.5 text-gray-400 absolute top-3 ${lang === 'en' ? 'left-3.5' : 'right-3.5'}`} />
            </div>
          </div>

          <div data-animate="card" className="bento-card transform-gpu bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            {/* Mobile pending pickups view */}
            <div className="md:hidden divide-y divide-gray-100 p-1 bg-white">
              {filteredPickups.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-sm">
                  {lang === 'en' ? 'No pending transfers found matching these details.' : lang === 'ar' ? 'لم يتم العثور على أي حوالة معلقة بهذه البيانات المعينة.' : 'ھیچ حەواڵەیەکی چاوەڕوانکراوی نێردراو بەو زانیاریانە نەدۆزرایەوە.'}
                </div>
              ) : (
                filteredPickups.map((t) => (
                  <div key={t.id} data-animate="row" className="list-item-row p-4 space-y-3 hover:bg-gray-50/40 transition-colors" dir={lang === 'en' ? 'ltr' : 'rtl'}>
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-mono text-[11px] text-primary font-extrabold">{t.id}</span>
                      <span className="flex items-center gap-1 text-[9px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100 w-max font-sans">
                        <Clock className="w-3 h-3" />
                        <span>{translations[lang].status_pending}</span>
                      </span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] text-gray-400 font-medium">
                        {lang === 'en' ? 'Sender' : lang === 'ar' ? 'المرسل' : 'نێرەر'}: <span className="text-gray-950 font-bold">{t.senderName}</span>
                      </p>
                      <h4 className="font-black text-sm text-gray-900">
                        {t.receiverName}
                      </h4>
                      <p className="text-[11px] font-mono font-semibold text-gray-400">{t.receiverPhone}</p>
                    </div>
                    
                    <div className="flex justify-between items-center pt-2.5 border-t border-gray-100/50">
                      <span className="font-mono font-black text-xs text-green-700">{formatMoney(t.amount, t.currency)}</span>
                      <div className="flex items-center gap-1.5">
                        {onCancelFastTransfer && (
                          <button
                            onClick={() => {
                              setTransferToCancel(t);
                              setCancelReason('');
                            }}
                            className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-xl text-[10px] flex items-center gap-1 transition-all cursor-pointer"
                            title={lang === 'en' ? 'Cancel Transfer' : lang === 'ar' ? 'إلغاء الحوالة' : 'هەڵوەشاندنەوەی حەواڵە'}
                          >
                            <Ban className="w-3 h-3 text-rose-600" />
                            <span>{lang === 'en' ? 'Cancel' : lang === 'ar' ? 'إلغاء' : 'هەڵوەشاندنەوە'}</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenDeliverModal(t)}
                          className="px-3.5 py-1.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-[10px] flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <CheckCircle className="w-3 h-3" />
                          <span>{lang === 'en' ? 'Deliver' : lang === 'ar' ? 'تسليم الحوالة' : 'تەسلیم بکە'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop pending pickups table */}
            <div className="hidden md:block overflow-x-auto">
              <table className={`w-full text-xs ${lang === 'en' ? 'text-left' : 'text-right'}`}>
                <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-3.5">{lang === 'en' ? 'Transfer Code' : lang === 'ar' ? 'رمز الحوالة' : 'کۆدی حەواڵە'}</th>
                    <th className="px-6 py-3.5">{lang === 'en' ? 'Sender' : lang === 'ar' ? 'المرسل' : 'نێرەر'}</th>
                    <th className="px-6 py-3.5">{lang === 'en' ? 'Cash Beneficiary Name' : lang === 'ar' ? 'اسم مستلم النقدية' : 'ناوی وەرگری نەختینە'}</th>
                    <th className="px-6 py-3.5">{lang === 'en' ? 'Mobile' : lang === 'ar' ? 'رقم الهاتف' : 'مۆبایل'}</th>
                    <th className="px-6 py-3.5 font-mono">{lang === 'en' ? 'Pickup Amount' : lang === 'ar' ? 'قيمة الاستلام' : 'بڕی وەرگرتن'}</th>
                    <th className="px-6 py-3.5">{lang === 'en' ? 'Status' : lang === 'ar' ? 'الحالة' : 'بارودۆخ'}</th>
                    <th className={`px-6 py-3.5 ${lang === 'en' ? 'text-right' : 'text-left'}`}>{lang === 'en' ? 'Technical Actions' : lang === 'ar' ? 'الإجراءات التقنية' : 'کردارە تەکنیکییەکان'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {filteredPickups.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-primary">{t.id}</td>
                      <td className="px-6 py-4 font-bold">{t.senderName}</td>
                      <td className="px-6 py-4 font-black text-gray-900">{t.receiverName}</td>
                      <td className="px-6 py-4 font-mono">{t.receiverPhone}</td>
                      <td className="px-6 py-4 font-mono font-bold text-green-600 text-sm">{formatMoney(t.amount, t.currency)}</td>
                      <td className="px-6 py-4">
                        <span className="flex items-center gap-1 text-[11px] text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100 w-max">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{translations[lang].status_pending}</span>
                        </span>
                      </td>
                      <td className={`px-6 py-4 ${lang === 'en' ? 'text-right' : 'text-left'}`}>
                        <div className="inline-flex items-center gap-2">
                          {onCancelFastTransfer && (
                            <button
                              onClick={() => {
                                setTransferToCancel(t);
                                setCancelReason('');
                              }}
                              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-xl text-xs flex items-center gap-1 transition-all cursor-pointer"
                              title={lang === 'en' ? 'Cancel Transfer' : lang === 'ar' ? 'إلغاء الحوالة' : 'هەڵوەشاندنەوەی حەواڵە'}
                            >
                              <Ban className="w-3.5 h-3.5 text-rose-600" />
                              <span>{lang === 'en' ? 'Cancel' : lang === 'ar' ? 'إلغاء' : 'هەڵوەشاندنەوە'}</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenDeliverModal(t)}
                            className="px-3.5 py-1.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-xs flex items-center gap-1 transition-all inline-flex cursor-pointer shadow-sm"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>{lang === 'en' ? 'Deliver (Paid Out Cash)' : lang === 'ar' ? 'تسليم الحوالة (دفع)' : 'تەسلیم بکە (کاش درا)'}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredPickups.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-gray-400">
                        {lang === 'en' ? 'No pending transfers found matching these details.' : lang === 'ar' ? 'لم يتم العثور على أي حوالة معلقة بهذه البيانات المعينة.' : 'ھیچ حەواڵەیەکی چاوەڕوانکراوی نێردراو بەو زانیاریانە نەدۆزرایەوە.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5. Combined History / Transfers tab */}
      {activeSubTab === 'history' && (
        <div className="space-y-6 animate-fade-in">
          {/* Controls Bar: Search & Sub-filters */}
          <div data-animate="card" className="bento-card transform-gpu bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-2 w-full md:w-auto">
              <span className="text-xs font-bold text-gray-500">{lang === 'en' ? 'Filter:' : lang === 'ar' ? 'تصفية:' : 'فلتەر:'}</span>
              <button
                onClick={() => setHistoryFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  historyFilter === 'all' 
                    ? 'bg-primary text-white shadow-xs' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {lang === 'en' ? 'All Transfers' : lang === 'ar' ? 'جميع الحوالات' : 'هەموو حەواڵەکان'}
              </button>
              <button
                onClick={() => setHistoryFilter('fast')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  historyFilter === 'fast' 
                    ? 'bg-primary text-white shadow-xs' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                ⚡ {lang === 'en' ? 'Fast Transfers' : lang === 'ar' ? 'الحوالات السريعة' : 'حەواڵە خێراکان'}
              </button>
              <button
                onClick={() => setHistoryFilter('standard')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  historyFilter === 'standard' 
                    ? 'bg-primary text-white shadow-xs' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                🔄 {lang === 'en' ? 'Standard Transfers' : lang === 'ar' ? 'الحوالات القياسية' : 'حەواڵەی ستاندارد'}
              </button>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="flex items-center bg-gray-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setFilterTodayOnly(true)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    filterTodayOnly ? 'bg-primary text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {lang === 'en' ? 'Today' : lang === 'ar' ? 'اليوم' : 'ئەمڕۆ'}
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTodayOnly(false)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    !filterTodayOnly ? 'bg-primary text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {lang === 'en' ? 'All' : lang === 'ar' ? 'الكل' : 'هەموو'}
                </button>
              </div>

              <div className="relative flex-1 md:w-64">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder={lang === 'en' ? 'Search by code, sender, receiver...' : lang === 'ar' ? 'البحث بالرمز، المرسل، المستلم...' : 'گەڕان بەپێی کۆد، نێرەر، وەرگر...'}
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 1: Fast Transfers */}
          {(historyFilter === 'all' || historyFilter === 'fast') && (
            <div data-animate="card" className="bento-card transform-gpu bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
              <div className="px-5 py-3.5 bg-gray-50 text-gray-900 font-bold text-sm border-b border-gray-100 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 bg-primary/10 text-primary rounded-lg text-xs font-black">⚡ {lang === 'en' ? 'Fast Transfers' : lang === 'ar' ? 'حوالات سريعة' : 'حەواڵەی خێرا'}</span>
                  <span>({filteredFastTransfers.length})</span>
                </div>
              </div>

              {/* Mobile Fast Transfer Cards */}
              <div className="md:hidden divide-y divide-gray-100 p-1 bg-white">
                {filteredFastTransfers.length === 0 ? (
                  <div className="text-center py-6 text-gray-400 text-sm">
                    {lang === 'en' ? 'No fast transfers found.' : lang === 'ar' ? 'لا توجد حوالات سريعة.' : 'هیچ حەواڵەیەکی خێرا نەدۆزرایەوە.'}
                  </div>
                ) : (
                  filteredFastTransfers.map((ft) => (
                    <div key={ft.id} data-animate="row" className="list-item-row p-4 space-y-3 hover:bg-gray-50/20 transition-colors">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-mono text-[11px] text-primary font-bold">{ft.id}</span>
                        <span className="text-gray-400 font-mono text-[10px]">{formatKurdishDateTime(ft.createdAt)}</span>
                      </div>
                      <div className="flex justify-between items-end">
                        <div className="space-y-1">
                          <p className="text-[11px] text-gray-400">
                            {lang === 'en' ? 'Sender' : lang === 'ar' ? 'المرسل' : 'نێرەر'}: <span className="text-gray-900 font-bold">{ft.senderName}</span>
                          </p>
                          <h4 className="font-bold text-xs text-gray-800">{ft.receiverName}</h4>
                          <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold ${
                            ft.status === 'Delivered' 
                              ? 'bg-green-100 text-green-700' 
                              : ft.status === 'Cancelled'
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-amber-100 text-amber-700 animate-pulse'
                          }`}>
                            {ft.status === 'Delivered' 
                              ? (lang === 'en' ? 'Delivered' : lang === 'ar' ? 'تم التسليم' : 'تەسلیمکراو') 
                              : ft.status === 'Cancelled'
                                ? (lang === 'en' ? 'Cancelled' : lang === 'ar' ? 'تم الإلغاء' : 'هەڵوەشاوەتەوە')
                                : (lang === 'en' ? 'Pending' : lang === 'ar' ? 'قيد الانتظار' : 'چاوەڕوانکراو')}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-xs font-black text-emerald-700">{formatMoney(ft.amount, ft.currency)}</p>
                          {ft.fee > 0 && <p className="text-[10px] text-gray-400 font-mono">+{formatMoney(ft.fee, ft.currency)} {t.transfer_fee}</p>}
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 no-print">
                        <button
                          onClick={() => onPrintReceipt('Fast', ft)}
                          className="px-2.5 py-1.5 bg-primary-light hover:bg-primary text-primary-dark hover:text-white rounded-xl text-[10px] font-bold inline-flex items-center gap-1 transition-colors"
                        >
                          <FileText className="w-3 h-3" />
                          <span>{lang === 'en' ? 'Print' : lang === 'ar' ? 'طباعة' : 'چاپ'}</span>
                        </button>
                        {ft.status === 'Pending' && onCancelFastTransfer && (
                          <button
                            onClick={() => {
                              setTransferToCancel(ft);
                              setCancelReason('');
                            }}
                            className="px-2 py-1 text-[10px] font-bold text-rose-600 bg-rose-50 rounded-md hover:bg-rose-100 transition-all flex items-center gap-1"
                          >
                            <Ban className="w-3 h-3 text-rose-600" />
                            <span>{lang === 'en' ? 'Cancel' : lang === 'ar' ? 'إلغاء' : 'هەڵوەشاندنەوە'}</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenEditFast(ft)}
                          className="px-2 py-1 text-[10px] font-bold text-primary bg-primary/10 rounded-md hover:bg-primary/20 transition-all flex items-center gap-1"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>{lang === 'en' ? 'Edit' : lang === 'ar' ? 'تعديل' : 'دەستکاری'}</span>
                        </button>
                        <button
                          onClick={() => setTransferToDelete({ id: ft.id, type: 'Fast', name: `${ft.id} (${ft.receiverName})` })}
                          className="px-2 py-1 text-[10px] font-bold text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-all flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>{lang === 'en' ? 'Delete' : lang === 'ar' ? 'حذف' : 'سڕینەوە'}</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Desktop Fast Transfer Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className={`w-full text-xs ${lang === 'en' ? 'text-left' : 'text-right'}`}>
                  <thead className="bg-gray-100 text-gray-500 font-semibold border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-3">{lang === 'en' ? 'Code' : lang === 'ar' ? 'الرمز' : 'کۆد'}</th>
                      <th className="px-6 py-3">{lang === 'en' ? 'Sender' : lang === 'ar' ? 'المرسل' : 'نێرەر'}</th>
                      <th className="px-6 py-3">{lang === 'en' ? 'Receiver' : lang === 'ar' ? 'المستلم' : 'وەرگر'}</th>
                      <th className="px-6 py-3">{t.amount_label}</th>
                      <th className="px-6 py-3">{t.transfer_fee}</th>
                      <th className="px-6 py-3">{lang === 'en' ? 'Status' : lang === 'ar' ? 'الحالة' : 'بارودۆخ'}</th>
                      <th className="px-6 py-3">{lang === 'en' ? 'Date Sent' : lang === 'ar' ? 'تاريخ الإرسال' : 'ناردن'}</th>
                      <th className={`px-6 py-3 ${lang === 'en' ? 'text-right' : 'text-left'}`}>{lang === 'en' ? 'Actions' : lang === 'ar' ? 'إجراءات' : 'کردارەکان'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-700">
                    {filteredFastTransfers.map((ft) => (
                      <tr key={ft.id} className="hover:bg-gray-50/50">
                        <td className="px-6 py-4 font-mono font-bold text-primary">{ft.id}</td>
                        <td className="px-6 py-4">{ft.senderName}</td>
                        <td className="px-6 py-4 font-semibold">{ft.receiverName}</td>
                        <td className="px-6 py-4 font-mono font-bold">{formatMoney(ft.amount, ft.currency)}</td>
                        <td className="px-6 py-4 font-mono text-gray-400">{formatMoney(ft.fee, ft.currency)}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-block px-3 py-1 rounded text-[10px] font-bold ${
                            ft.status === 'Delivered' 
                              ? 'bg-green-100 text-green-700' 
                              : ft.status === 'Cancelled'
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-amber-100 text-amber-700 animate-pulse'
                          }`}>
                            {ft.status === 'Delivered' 
                              ? (lang === 'en' ? 'Delivered' : lang === 'ar' ? 'تم التسليم' : 'تەسلیم کراوە') 
                              : ft.status === 'Cancelled'
                                ? (lang === 'en' ? 'Cancelled' : lang === 'ar' ? 'تم الإلغاء' : 'هەڵوەشاوەتەوە')
                                : (lang === 'en' ? 'Pending' : lang === 'ar' ? 'قيد الانتظار' : 'لە چاوەڕوانیدا')}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono text-gray-400">{formatKurdishDateTime(ft.createdAt)}</td>
                        <td className={`px-6 py-4 ${lang === 'en' ? 'text-right' : 'text-left'}`}>
                          <div className="flex items-center gap-1.5 justify-end">
                            <button
                              onClick={() => onPrintReceipt('Fast', ft)}
                              className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                              title={lang === 'en' ? 'Print' : lang === 'ar' ? 'طباعة' : 'چاپ'}
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                            {ft.status === 'Pending' && onCancelFastTransfer && (
                              <button
                                onClick={() => {
                                  setTransferToCancel(ft);
                                  setCancelReason('');
                                }}
                                className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title={lang === 'en' ? 'Cancel Transfer' : lang === 'ar' ? 'إلغاء الحوالة' : 'هەڵوەشاندنەوەی حەواڵە'}
                              >
                                <Ban className="w-4 h-4 text-rose-500" />
                              </button>
                            )}
                            <button
                              onClick={() => handleOpenEditFast(ft)}
                              className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                              title={lang === 'en' ? 'Edit' : lang === 'ar' ? 'تعديل' : 'دەستکاری'}
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setTransferToDelete({ id: ft.id, type: 'Fast', name: `${ft.id} (${ft.receiverName})` })}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title={lang === 'en' ? 'Delete' : lang === 'ar' ? 'حذف' : 'سڕینەوە'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredFastTransfers.length === 0 && (
                      <tr>
                        <td colSpan={8} className="text-center py-6 text-gray-400">
                          {lang === 'en' ? 'No fast transfers found.' : lang === 'ar' ? 'لا توجد حوالات سريعة.' : 'هیچ حەواڵەیەکی خێرا نەدۆزرایەوە.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Section 2: Standard Transfers */}
          {(historyFilter === 'all' || historyFilter === 'standard') && (
            <div data-animate="card" className="bento-card transform-gpu bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
              <div className="px-5 py-3.5 bg-gray-50 text-gray-900 font-bold text-sm border-b border-gray-100 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-black">🔄 {lang === 'en' ? 'Standard Transfers' : lang === 'ar' ? 'حوالات قياسية' : 'حەواڵەی ستاندارد'}</span>
                  <span>({filteredStandardTransfers.length})</span>
                </div>
              </div>

              {/* Mobile Standard Transfer Cards */}
              <div className="md:hidden divide-y divide-gray-100 p-1 bg-white">
                {filteredStandardTransfers.length === 0 ? (
                  <div className="text-center py-6 text-gray-400 text-sm">
                    {lang === 'en' ? 'No standard transfers found.' : lang === 'ar' ? 'لا توجد حوالات قياسية.' : 'هیچ حەواڵەیەکی ستاندارد نەدۆزرایەوە.'}
                  </div>
                ) : (
                  filteredStandardTransfers.map((st) => (
                    <div key={st.id} data-animate="row" className="list-item-row p-4 space-y-3.5 hover:bg-gray-50/20 transition-colors">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-mono text-[11px] text-secondary font-black">{st.id}</span>
                        <span className="text-[10px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded-md font-bold">{st.deliveryLocation || '-'}</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-[11px] font-medium py-1">
                        <div>
                          <span className="text-gray-400 block text-[9px]">{lang === 'en' ? 'Sender' : lang === 'ar' ? 'العميل المشتري (+)' : 'کڕیاری کڕین (+)'}</span>
                          <p className="text-gray-900 font-bold">{st.senderName}</p>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[9px]">{lang === 'en' ? 'Receiver' : lang === 'ar' ? 'العميل البائع (-)' : 'کڕیاری فرۆشتن (-)'}</span>
                          <p className="text-gray-900 font-bold">{st.receiverName}</p>
                        </div>
                      </div>

                      <div className="flex justify-between items-end border-t border-dashed border-gray-100 pt-2 bg-gray-50/20 p-2 rounded-lg">
                        <div className="space-y-0.5">
                          <span className="text-gray-400 text-[10px] block font-semibold">{lang === 'en' ? 'Beneficiary' : lang === 'ar' ? 'المستفيد' : 'ناو سودمەند'}</span>
                          <p className="font-bold text-xs text-primary">{st.beneficiaryName}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-xs font-black text-gray-900">{formatMoney(st.amountUSD, st.currency || 'USD')}</p>
                          <p className="font-mono text-[10px] text-emerald-700 font-bold">+{formatMoney(st.profitIQD, st.currency || 'USD')} {lang === 'en' ? 'Profit' : lang === 'ar' ? 'الأرباح' : 'قازانج'}</p>
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-1 no-print">
                        <span className="text-[10px] font-mono text-gray-400">{formatMoney(st.buyRate, st.currency || 'USD')} / {formatMoney(st.sellRate, st.currency || 'USD')}</span>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => onPrintReceipt('Standard', st)}
                            className="px-2.5 py-1 bg-primary-light hover:bg-primary text-primary-dark hover:text-white rounded-lg text-[10px] font-bold inline-flex items-center gap-1 transition-colors"
                          >
                            <FileText className="w-3 h-3" />
                            <span>{lang === 'en' ? 'Receipt' : lang === 'ar' ? 'فواتير' : 'وەسڵ'}</span>
                          </button>
                          <button
                            onClick={() => handleOpenEditStandard(st)}
                            className="px-2 py-1 text-[10px] font-bold text-primary bg-primary/10 rounded-md hover:bg-primary/20 transition-all flex items-center gap-1"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>{lang === 'en' ? 'Edit' : lang === 'ar' ? 'تعديل' : 'دەستکاری'}</span>
                          </button>
                          <button
                            onClick={() => setTransferToDelete({ id: st.id, type: 'Standard', name: `${st.id} (${st.beneficiaryName})` })}
                            className="px-2 py-1 text-[10px] font-bold text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-all flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>{lang === 'en' ? 'Delete' : lang === 'ar' ? 'حذف' : 'سڕینەوە'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Desktop Standard Transfer Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className={`w-full text-xs ${lang === 'en' ? 'text-left' : 'text-right'}`}>
                  <thead className="bg-gray-100 text-gray-500 font-semibold border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-3">{lang === 'en' ? 'Code' : lang === 'ar' ? 'الرمز' : 'کۆد'}</th>
                      <th className="px-6 py-3">{lang === 'en' ? 'Buying Customer (+)' : lang === 'ar' ? 'العميل المشتري (+)' : 'کڕیاری کڕین (+)'}</th>
                      <th className="px-6 py-3">{lang === 'en' ? 'Selling Customer (-)' : lang === 'ar' ? 'العميل البائع (-)' : 'کڕیاری فرۆشتن (-)'}</th>
                      <th className="px-6 py-3">{lang === 'en' ? 'Beneficiary' : lang === 'ar' ? 'المستفيد' : 'سودمەند'}</th>
                      <th className="px-6 py-3">{lang === 'en' ? 'Amount' : lang === 'ar' ? 'المبلغ' : 'بڕی حەواڵە'}</th>
                      <th className="px-6 py-3">{lang === 'en' ? 'Buy / Sell Rates' : lang === 'ar' ? 'الشراء / البيع' : 'ناو نرخ (کڕین/فرۆشتن)'}</th>
                      <th className="px-6 py-3">{lang === 'en' ? 'Profit' : lang === 'ar' ? 'الأرباح' : 'قازانج'}</th>
                      <th className={`px-6 py-3 ${lang === 'en' ? 'text-right' : 'text-left'}`}>{lang === 'en' ? 'Actions' : lang === 'ar' ? 'إجراءات' : 'کردارەکان'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-700">
                    {filteredStandardTransfers.map((st) => (
                      <tr key={st.id} className="hover:bg-gray-50/50">
                        <td className="px-6 py-4 font-mono font-bold text-secondary">{st.id}</td>
                        <td className="px-6 py-4">{st.senderName}</td>
                        <td className="px-6 py-4">{st.receiverName}</td>
                        <td className="px-6 py-4 font-bold text-primary">{st.beneficiaryName}</td>
                        <td className="px-6 py-4 font-mono font-bold">{formatMoney(st.amountUSD, st.currency || 'USD')}</td>
                        <td className="px-6 py-4 font-mono text-gray-400">{formatMoney(st.buyRate, st.currency || 'USD')} / {formatMoney(st.sellRate, st.currency || 'USD')}</td>
                        <td className="px-6 py-4 font-mono font-bold text-green-600">{formatMoney(st.profitIQD, st.currency || 'USD')}</td>
                        <td className={`px-6 py-4 ${lang === 'en' ? 'text-right' : 'text-left'}`}>
                          <div className="flex items-center gap-1.5 justify-end">
                            <button
                              onClick={() => onPrintReceipt('Standard', st)}
                              className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                              title={lang === 'en' ? 'Print' : lang === 'ar' ? 'طباعة' : 'چاپ'}
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenEditStandard(st)}
                              className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                              title={lang === 'en' ? 'Edit' : lang === 'ar' ? 'تعديل' : 'دەستکاری'}
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setTransferToDelete({ id: st.id, type: 'Standard', name: `${st.id} (${st.beneficiaryName})` })}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title={lang === 'en' ? 'Delete' : lang === 'ar' ? 'حذف' : 'سڕینەوە'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredStandardTransfers.length === 0 && (
                      <tr>
                        <td colSpan={8} className="text-center py-6 text-gray-400">
                          {lang === 'en' ? 'No standard transfers found.' : lang === 'ar' ? 'لا توجد حوالات قياسية.' : 'هیچ حەواڵەیەکی ستاندارد نەدۆزرایەوە.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Deliver Transfer Form Modal */}
      {showDeliverModal && transferToDeliver !== null && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xl flex items-center justify-center p-4 z-50" id="delivery-modal">
          <div className="bg-slate-950/85 backdrop-blur-2xl backdrop-saturate-150 rounded-2xl max-w-lg w-full border border-white/[0.12] shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.22),0_25px_60px_rgba(0,0,0,0.65)] overflow-hidden flex flex-col max-h-[90vh] text-white">
            {/* Modal Header */}
            <div className="bg-[#1D7AFC]/20 border-b border-white/[0.1] px-6 py-4 text-white flex justify-between items-center">
              <h3 className="font-bold text-sm text-white">
                {lang === 'en' 
                  ? 'Deliver Transfer (Express Payout Form)' 
                  : lang === 'ar' 
                    ? 'تسليم الحوالة (نموذج الصرف السريع)' 
                    : 'تەسلیمکردنی حەواڵە (سەرفکردنی کاش)'}
              </h3>
              <button 
                onClick={() => {
                  setShowDeliverModal(false);
                  setTransferToDeliver(null);
                }}
                className="text-slate-400 hover:text-white font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (deliverIsOffice && !deliverOfficeName.trim()) {
                  alert(
                    lang === 'en' 
                      ? 'Please enter the office name' 
                      : lang === 'ar' 
                        ? 'يرجى إدخال اسم المكتب' 
                        : 'تکایە ناوی نووسینگە بنووسە'
                  );
                  return;
                }
                onDeliverFastTransfer(transferToDeliver.id, {
                  isOfficeDelivery: deliverIsOffice,
                  officeName: deliverOfficeName,
                  receiverName: deliverReceiverName,
                  receiverPhone: deliverReceiverPhone
                });
                setShowDeliverModal(false);
                setTransferToDeliver(null);
              }}
              className="p-6 space-y-4 overflow-y-auto text-xs"
            >
              {/* Transfer Overview Card */}
              <div className="bg-white/[0.04] rounded-xl p-4 border border-white/[0.08] space-y-2">
                <div className="flex justify-between items-center border-b border-white/[0.06] pb-1.5">
                  <span className="text-slate-400 font-semibold">{lang === 'en' ? 'Transfer Code:' : lang === 'ar' ? 'رمز الحوالة:' : 'کۆدی حەواڵە:'}</span>
                  <span className="font-mono font-bold text-cyan-400 text-sm">{transferToDeliver.id}</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-400">{lang === 'en' ? 'Sender:' : lang === 'ar' ? 'المرسل:' : 'نێرەر:'}</span>
                  <span className="font-bold text-white">{transferToDeliver.senderName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-semibold">{lang === 'en' ? 'Payout Amount:' : lang === 'ar' ? 'قيمة الاستلام النقدية:' : 'بڕی پارەی تەسلیمکردن:'}</span>
                  <span className="font-mono font-black text-sm text-emerald-400">{formatMoney(transferToDeliver.amount, transferToDeliver.currency)}</span>
                </div>
              </div>

              {/* Delivery Type Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">
                  {lang === 'en' ? 'Delivery Option' : lang === 'ar' ? 'خيارات التسليم' : 'بژاردەی تەسلیمکردن'}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDeliverIsOffice(false)}
                    className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      !deliverIsOffice 
                        ? 'border-[#1D7AFC] bg-[#1D7AFC]/20 text-white font-bold shadow-[0_0_15px_rgba(29,122,252,0.3)]' 
                        : 'border-white/[0.1] hover:bg-white/[0.05] text-slate-400'
                    }`}
                  >
                    {lang === 'en' ? 'Personal (Direct Recipient)' : lang === 'ar' ? 'شخصي (المستلم المباشر)' : 'کەسی (قبوڵکەری سەرەکی)'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliverIsOffice(true)}
                    className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      deliverIsOffice 
                        ? 'border-[#1D7AFC] bg-[#1D7AFC]/20 text-white font-bold shadow-[0_0_15px_rgba(29,122,252,0.3)]' 
                        : 'border-white/[0.1] hover:bg-white/[0.05] text-slate-400'
                    }`}
                  >
                    {lang === 'en' ? 'Office / Bureau' : lang === 'ar' ? 'نووسینگە / مكتب' : 'نووسینگە / مەکتەب'}
                  </button>
                </div>
              </div>

              {/* Office Name Input */}
              {deliverIsOffice && (
                <div className="space-y-1 animate-fade-in">
                  <label className="block text-xs font-bold text-slate-300">
                    {lang === 'en' ? 'Office / Bureau Name *' : lang === 'ar' ? 'اسم المكتب / الشركة *' : 'ناوی نووسینگە / مەکتەب *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={lang === 'en' ? 'Enter office name...' : lang === 'ar' ? 'أدخل اسم المكتب...' : 'ناوی نووسینگە بنووسە...'}
                    value={deliverOfficeName}
                    onChange={(e) => setDeliverOfficeName(e.target.value)}
                    className="w-full bg-white/[0.05] border border-white/[0.12] rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-[#1D7AFC]/40 focus:border-[#1D7AFC] outline-none"
                  />
                </div>
              )}

              {/* Receiver Name Input */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-300">
                  {lang === 'en' ? "Receiver's Name" : lang === 'ar' ? 'اسم مستلم الحوالة' : 'ناوی وەرگری حەواڵە'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={lang === 'en' ? 'Full name of receiver...' : lang === 'ar' ? 'الاسم الثلاثي للمستلم...' : 'ناوی تەواوی وەرگر بنووسە...'}
                  value={deliverReceiverName}
                  onChange={(e) => setDeliverReceiverName(e.target.value)}
                  className="w-full bg-white/[0.05] border border-white/[0.12] rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-[#1D7AFC]/40 focus:border-[#1D7AFC] outline-none"
                />
              </div>

              {/* Receiver Phone Input */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-300">
                  {lang === 'en' ? "Receiver's Phone" : lang === 'ar' ? 'هاتف المستلم' : 'مۆبایلی وەرگر'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={lang === 'en' ? 'Phone number...' : lang === 'ar' ? 'رقم هاتف المستلم...' : 'ژمارەی مۆبایلی وەرگر بنووسە...'}
                  value={deliverReceiverPhone}
                  onChange={(e) => setDeliverReceiverPhone(e.target.value)}
                  className="w-full bg-white/[0.05] border border-white/[0.12] rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-[#1D7AFC]/40 focus:border-[#1D7AFC] outline-none font-mono text-left"
                />
              </div>

              {/* Bottom Actions */}
              <div className="flex gap-3 pt-4 border-t border-white/[0.1]">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeliverModal(false);
                    setTransferToDeliver(null);
                  }}
                  className="flex-1 py-2.5 bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] text-slate-300 font-bold rounded-xl transition-all cursor-pointer"
                >
                  {lang === 'en' ? 'Cancel' : lang === 'ar' ? 'إلغاء' : 'پاشگەزبوونەوە'}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-[0_4px_20px_rgba(16,185,129,0.35)] transition-all cursor-pointer"
                >
                  {lang === 'en' ? 'Confirm & Deliver' : lang === 'ar' ? 'تأكيد وصرف' : 'تەسلیمکردنی کۆتایی'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Transfer Modal */}
      {transferToDelete && (
        <ConfirmModal
          isOpen={!!transferToDelete}
          title={lang === 'en' ? 'Delete Transfer' : lang === 'ar' ? 'حذف الحوالة' : 'سڕینەوەی حەواڵە'}
          message={
            lang === 'en'
              ? `Are you sure you want to delete ${transferToDelete.name}? Balances will be recalculated.`
              : lang === 'ar'
                ? `هل أنت أکد من حذف ${transferToDelete.name}؟ سیتم إعادة احتساب الأرصدة.`
                : `ئایا دڵنیایت لە سڕینەوەی ${transferToDelete.name}؟ باڵانسی سەرجەم هەژمارەکان ڕێکدەخرێتەوە.`
          }
          confirmText={lang === 'en' ? 'Delete' : lang === 'ar' ? 'حذف' : 'سڕینەوە'}
          cancelText={lang === 'en' ? 'Cancel' : lang === 'ar' ? 'إلغاء' : 'پاشگەزبوونەوە'}
          onConfirm={handleConfirmDelete}
          onCancel={() => setTransferToDelete(null)}
        />
      )}

      {/* Edit Fast Transfer Modal */}
      {fastTransferToEdit && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xl flex items-center justify-center p-4 z-50">
          <div className="bg-slate-950/85 backdrop-blur-2xl backdrop-saturate-150 rounded-2xl max-w-lg w-full border border-white/[0.12] shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.22),0_25px_60px_rgba(0,0,0,0.65)] overflow-hidden flex flex-col max-h-[90vh] text-white">
            <div className="bg-[#1D7AFC]/20 border-b border-white/[0.1] px-6 py-4 text-white flex justify-between items-center">
              <h3 className="font-bold text-sm text-white">
                {lang === 'en' ? 'Edit Fast Transfer' : lang === 'ar' ? 'تعديل الحوالة السريعة' : 'دەستکاریکردنی حەواڵەی خێرا'} ({fastTransferToEdit.id})
              </h3>
              <button onClick={() => setFastTransferToEdit(null)} className="text-slate-400 hover:text-white font-bold text-lg cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSaveEditFast} className="p-6 space-y-4 overflow-y-auto text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">{lang === 'en' ? 'Sender *' : lang === 'ar' ? 'المرسل *' : 'نێرەر *'}</label>
                <SearchableCustomerSelect
                  customers={nonSystemCustomers}
                  value={editFastSenderId}
                  onChange={setEditFastSenderId}
                  placeholder={lang === 'en' ? 'Sender' : lang === 'ar' ? 'المرسل' : 'نێرەر'}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">{lang === 'en' ? 'Receiver Name *' : lang === 'ar' ? 'اسم المستلم *' : 'ناوی وەرگر *'}</label>
                  <input
                    type="text"
                    required
                    value={editFastRecName}
                    onChange={(e) => setEditFastRecName(e.target.value)}
                    className="w-full bg-white/[0.05] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-[#1D7AFC]/40 focus:border-[#1D7AFC] outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 mb-1">{lang === 'en' ? 'Receiver Phone' : lang === 'ar' ? 'هاتف المستلم' : 'مۆبایلی وەرگر'}</label>
                  <input
                    type="text"
                    value={editFastRecPhone}
                    onChange={(e) => setEditFastRecPhone(e.target.value)}
                    className="w-full bg-white/[0.05] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-[#1D7AFC]/40 focus:border-[#1D7AFC] outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">{t.amount_label} *</label>
                  <input
                    type="text"
                    required
                    value={formatInputValue(editFastAmount)}
                    onChange={(e) => setEditFastAmount(parseInputValue(e.target.value).toString())}
                    className="w-full bg-white/[0.05] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-[#1D7AFC]/40 focus:border-[#1D7AFC] outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 mb-1">{lang === 'en' ? 'Currency' : lang === 'ar' ? 'العملة' : 'دراو'}</label>
                  <select
                    value={editFastCurrency}
                    onChange={(e) => setEditFastCurrency(e.target.value as Currency)}
                    className="w-full bg-white/[0.05] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-white focus:ring-2 focus:ring-[#1D7AFC]/40 focus:border-[#1D7AFC] outline-none"
                  >
                    {appState.currencies.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-300 mb-1">{t.transfer_fee}</label>
                  <input
                    type="text"
                    value={formatInputValue(editFastFee)}
                    onChange={(e) => setEditFastFee(parseInputValue(e.target.value).toString())}
                    className="w-full bg-white/[0.05] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-[#1D7AFC]/40 focus:border-[#1D7AFC] outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">{lang === 'en' ? 'Notes' : lang === 'ar' ? 'ملاحظات' : 'تێبینی'}</label>
                <input
                  type="text"
                  value={editFastNotes}
                  onChange={(e) => setEditFastNotes(e.target.value)}
                  className="w-full bg-white/[0.05] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-[#1D7AFC]/40 focus:border-[#1D7AFC] outline-none"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-white/[0.1]">
                <button
                  type="button"
                  onClick={() => setFastTransferToEdit(null)}
                  className="flex-1 py-2 bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] text-slate-300 font-bold rounded-xl transition-all cursor-pointer"
                >
                  {lang === 'en' ? 'Cancel' : lang === 'ar' ? 'إلغاء' : 'پاشگەزبوونەوە'}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-[#1D7AFC] hover:bg-blue-500 text-white font-bold rounded-xl shadow-[0_4px_20px_rgba(29,122,252,0.4),inset_0_1px_0_rgba(255,255,255,0.3)] transition-all cursor-pointer"
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
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xl flex items-center justify-center p-4 z-50">
          <div className="bg-slate-950/85 backdrop-blur-2xl backdrop-saturate-150 rounded-2xl max-w-lg w-full border border-white/[0.12] shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.22),0_25px_60px_rgba(0,0,0,0.65)] overflow-hidden flex flex-col max-h-[90vh] text-white">
            <div className="bg-cyan-500/20 border-b border-white/[0.1] px-6 py-4 text-white flex justify-between items-center">
              <h3 className="font-bold text-sm text-white">
                {lang === 'en' ? 'Edit Standard Transfer' : lang === 'ar' ? 'تعديل الحوالة القياسية' : 'دەستکاریکردنی حەواڵەی ستاندارد'} ({standardTransferToEdit.id})
              </h3>
              <button onClick={() => setStandardTransferToEdit(null)} className="text-slate-400 hover:text-white font-bold text-lg cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSaveEditStandard} className="p-6 space-y-4 overflow-y-auto text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">{lang === 'en' ? 'Buying Customer (+)' : lang === 'ar' ? 'العميل المشتري (+)' : 'کڕیاری کڕین (+)'} *</label>
                  <SearchableCustomerSelect
                    customers={nonSystemCustomers}
                    value={editStdSenderId}
                    onChange={setEditStdSenderId}
                    placeholder={lang === 'en' ? 'Buying Customer' : lang === 'ar' ? 'العميل المشتري' : 'کڕیاری کڕین'}
                    lang={lang}
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 mb-1">{lang === 'en' ? 'Selling Customer (-)' : lang === 'ar' ? 'العميل البائع (-)' : 'کڕیاری فرۆشتن (-)'} *</label>
                  <SearchableCustomerSelect
                    customers={nonSystemCustomers}
                    value={editStdReceiverId}
                    onChange={setEditStdReceiverId}
                    placeholder={lang === 'en' ? 'Selling Customer' : lang === 'ar' ? 'العميل البائع' : 'کڕیاری فرۆشتن'}
                    lang={lang}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">{lang === 'en' ? 'Beneficiary Name' : lang === 'ar' ? 'اسم المستفيد' : 'ناوی سودمەند'}</label>
                  <input
                    type="text"
                    value={editStdBeneficiaryName}
                    onChange={(e) => setEditStdBeneficiaryName(e.target.value)}
                    className="w-full bg-white/[0.05] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-[#1D7AFC]/40 focus:border-[#1D7AFC] outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 mb-1">{lang === 'en' ? 'Delivery Location' : lang === 'ar' ? 'مكان التسليم' : 'شوێنی گەیاندن'}</label>
                  <input
                    type="text"
                    value={editStdDeliveryLocation}
                    onChange={(e) => setEditStdDeliveryLocation(e.target.value)}
                    className="w-full bg-white/[0.05] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-[#1D7AFC]/40 focus:border-[#1D7AFC] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">{t.amount_label} *</label>
                  <input
                    type="text"
                    required
                    value={formatInputValue(editStdAmountUSD)}
                    onChange={(e) => setEditStdAmountUSD(parseInputValue(e.target.value).toString())}
                    className="w-full bg-white/[0.05] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-[#1D7AFC]/40 focus:border-[#1D7AFC] outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 mb-1">{lang === 'en' ? 'Currency' : lang === 'ar' ? 'العملة' : 'دراو'}</label>
                  <select
                    value={editStdCurrency}
                    onChange={(e) => setEditStdCurrency(e.target.value as Currency)}
                    className="w-full bg-white/[0.05] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-white focus:ring-2 focus:ring-[#1D7AFC]/40 focus:border-[#1D7AFC] outline-none"
                  >
                    {appState.currencies.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">{lang === 'en' ? 'Buy Rate Add' : lang === 'ar' ? 'سعر الشراء' : 'کۆمسیۆنی کڕین'}</label>
                  <input
                    type="text"
                    value={formatInputValue(editStdBuyRate)}
                    onChange={(e) => setEditStdBuyRate(parseInputValue(e.target.value).toString())}
                    className="w-full bg-white/[0.05] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-[#1D7AFC]/40 focus:border-[#1D7AFC] outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 mb-1">{lang === 'en' ? 'Sell Rate Deduct' : lang === 'ar' ? 'سعر البيع' : 'کۆمسیۆنی فرۆشتن'}</label>
                  <input
                    type="text"
                    value={formatInputValue(editStdSellRate)}
                    onChange={(e) => setEditStdSellRate(parseInputValue(e.target.value).toString())}
                    className="w-full bg-white/[0.05] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-[#1D7AFC]/40 focus:border-[#1D7AFC] outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">{lang === 'en' ? 'Notes' : lang === 'ar' ? 'ملاحظات' : 'تێبینی'}</label>
                <input
                  type="text"
                  value={editStdNotes}
                  onChange={(e) => setEditStdNotes(e.target.value)}
                  className="w-full bg-white/[0.05] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-[#1D7AFC]/40 focus:border-[#1D7AFC] outline-none"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-white/[0.1]">
                <button
                  type="button"
                  onClick={() => setStandardTransferToEdit(null)}
                  className="flex-1 py-2 bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] text-slate-300 font-bold rounded-xl transition-all cursor-pointer"
                >
                  {lang === 'en' ? 'Cancel' : lang === 'ar' ? 'إلغاء' : 'پاشگەزبوونەوە'}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl shadow-[0_4px_20px_rgba(6,182,212,0.4),inset_0_1px_0_rgba(255,255,255,0.3)] transition-all cursor-pointer"
                >
                  {lang === 'en' ? 'Save Changes' : lang === 'ar' ? 'حفظ التغييرات' : 'پاشەکەوتکردن'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Fast Transfer Modal */}
      {transferToCancel && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xl z-50 flex items-center justify-center p-4 animate-fade-in no-print">
          <div className="bg-slate-950/85 backdrop-blur-2xl backdrop-saturate-150 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.22),0_25px_60px_rgba(0,0,0,0.65)] border border-white/[0.12] text-white" dir={lang === 'en' ? 'ltr' : 'rtl'}>
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.1]">
              <div className="flex items-center gap-2 text-rose-400">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center">
                  <Ban className="w-5 h-5 text-rose-400" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-white">
                    {lang === 'en' ? 'Cancel Fast Transfer' : lang === 'ar' ? 'إلغاء الحوالة السريعة' : 'هەڵوەشاندنەوەی حەواڵەی خێرا'}
                  </h3>
                  <span className="text-[11px] text-slate-400 font-mono font-bold">{transferToCancel.id}</span>
                </div>
              </div>
              <button
                onClick={() => { setTransferToCancel(null); setCancelReason(''); }}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/[0.08] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-white/[0.04] p-4 rounded-2xl border border-white/[0.08] space-y-2.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">{lang === 'en' ? 'Sender:' : lang === 'ar' ? 'المرسل:' : 'نێرەر:'}</span>
                <span className="font-bold text-white">{transferToCancel.senderName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">{lang === 'en' ? 'Receiver:' : lang === 'ar' ? 'المستلم:' : 'وەرگر:'}</span>
                <span className="font-bold text-white">{transferToCancel.receiverName} {transferToCancel.receiverPhone ? `(${transferToCancel.receiverPhone})` : ''}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">{lang === 'en' ? 'Amount:' : lang === 'ar' ? 'المبلغ:' : 'بڕی حەواڵە:'}</span>
                <span className="font-mono font-bold text-white">{formatMoney(transferToCancel.amount, transferToCancel.currency)}</span>
              </div>
              {transferToCancel.fee > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-medium">{lang === 'en' ? 'Transfer Fee:' : lang === 'ar' ? 'رسوم الحوالة:' : 'کرێی حەواڵە:'}</span>
                  <span className="font-mono font-bold text-white">{formatMoney(transferToCancel.fee, transferToCancel.currency)}</span>
                </div>
              )}
              <div className="pt-2 border-t border-white/[0.08] flex justify-between items-center bg-emerald-500/10 border-emerald-500/20 -mx-4 -mb-4 p-3.5 rounded-b-2xl">
                <span className="font-bold text-emerald-400">
                  {lang === 'en' ? 'Total Refund to Sender Balance:' : lang === 'ar' ? 'إجمالي المبلغ المسترجع لحساب المرسل:' : 'کۆی بڕی گەڕاوە بۆ سەر هەژماری نێرەر:'}
                </span>
                <span className="font-mono font-black text-sm text-emerald-300">
                  {formatMoney(transferToCancel.amount + (transferToCancel.fee || 0), transferToCancel.currency)}
                </span>
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/25 p-3 rounded-2xl text-[11px] text-amber-200 font-medium leading-relaxed">
              {lang === 'en'
                ? 'Upon cancellation, the total amount (amount + transfer fee) will be immediately refunded to the sender\'s account balance, and the status will be changed to Cancelled.'
                : lang === 'ar'
                ? 'عند الإلغاء، سيتم إرجاع كامل المبلغ ورسوم الحوالة مباشرة إلى حساب المرسل، وستتحول حالة الحوالة إلى ملغاة.'
                : 'لە کاتی هەڵوەشاندنەوەدا، تەواوی بڕی پارەکە لەگەڵ کرێی حەواڵەکە راستەوخۆ دەگەڕێتەوە سەر هەژماری کڕیار (نێرەر) و دۆخی حەواڵەکە دەبێتە هەڵوەشاوەتەوە.'}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                {lang === 'en' ? 'Cancellation Reason (Optional):' : lang === 'ar' ? 'سبب الإلغاء (اختياري):' : 'هۆکاری هەڵوەشاندنەوە (ئارەزوومەندانە):'}
              </label>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder={lang === 'en' ? 'e.g. Customer requested cancellation' : lang === 'ar' ? 'مثال: طلب العميل الإلغاء' : 'بۆ نموونە: کڕیار داوای هەڵوەشاندنەوەی کرد'}
                className="w-full bg-white/[0.05] border border-white/[0.12] rounded-2xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-rose-500/40 focus:border-rose-500 outline-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setTransferToCancel(null); setCancelReason(''); }}
                className="flex-1 py-2.5 bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] text-slate-300 font-bold rounded-2xl text-xs transition-all cursor-pointer"
              >
                {lang === 'en' ? 'Back' : lang === 'ar' ? 'تراجع' : 'پاشگەزبوونەوە'}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onCancelFastTransfer) {
                    onCancelFastTransfer(transferToCancel.id, cancelReason);
                  }
                  setTransferToCancel(null);
                  setCancelReason('');
                }}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-2xl text-xs shadow-[0_4px_20px_rgba(225,29,72,0.4)] transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Ban className="w-4 h-4" />
                <span>{lang === 'en' ? 'Confirm Cancellation' : lang === 'ar' ? 'تأكيد الإلغاء واسترجاع المبلغ' : 'هەڵوەشاندنەوە و گەڕاندنەوەی پارە'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
