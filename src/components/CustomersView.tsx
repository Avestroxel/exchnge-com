import { useState, FormEvent, useEffect, useMemo } from 'react';
import { Users, Search, PlusCircle, Edit3, Trash2, ArrowUpRight, ArrowDownRight, ArrowRightLeft, CheckCircle2, Clock } from 'lucide-react';
import { Customer, Currency } from '../types';
import { AppState } from '../data/stateManager';
import { formatMoney, formatInputValue, parseInputValue, formatKurdishDateTime } from '../utils';
import { translations } from '../data/translations';
import ConfirmModal from './ConfirmModal';
import SearchableCustomerSelect from './SearchableCustomerSelect';
import GlassCard from './GlassCard';

interface CustomersViewProps {
  appState: AppState;
  onSaveCustomer: (customerData: Partial<Customer>) => void;
  onDeleteCustomer: (id: string) => void;
  onModifyCustomerBalance: (
    customerId: string, 
    type: 'Deposit' | 'Withdrawal', 
    currency: Currency, 
    amount: number, 
    notes: string
  ) => void;
  onCreateInternalTransfer?: (
    senderId: string, 
    receiverId: string, 
    currency: Currency, 
    amount: number, 
    notes: string
  ) => void;
  onDeleteTransaction?: (transactionId: string) => void;
  onEditTransactionNotes?: (transactionId: string, newNotes: string) => void;
}

export default function CustomersView({
  appState,
  onSaveCustomer,
  onDeleteCustomer,
  onModifyCustomerBalance,
  onCreateInternalTransfer,
  onDeleteTransaction,
  onEditTransactionNotes
}: CustomersViewProps) {
  const { customers, settings, currencies } = appState;
  const lang = settings.language || 'ku';
  const t = translations[lang];

  const [activeSubTab, setActiveSubTab] = useState<'list' | 'internal'>('list');

  const [searchTerm, setSearchTerm] = useState('');
  const [showSystemOnly, setShowSystemOnly] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  
  // Active states for editing or transaction execution
  const [activeCustomer, setActiveCustomer] = useState<Customer | null>(null);
  const [txType, setTxType] = useState<'Deposit' | 'Withdrawal'>('Deposit');
  const [txCurrency, setTxCurrency] = useState<Currency>('USD');
  const [txAmount, setTxAmount] = useState('');
  const [txNotes, setTxNotes] = useState('');

  // Internal Transfer Form State
  const [intSenderId, setIntSenderId] = useState('');
  const [intReceiverId, setIntReceiverId] = useState('');
  const [intCurrency, setIntCurrency] = useState<Currency>('USD');
  const [intAmount, setIntAmount] = useState('');
  const [intNotes, setIntNotes] = useState('');
  const [intSuccessMsg, setIntSuccessMsg] = useState('');

  // Editing Internal Transfer Notes Modal state
  const [editingInternalTx, setEditingInternalTx] = useState<{ id: string; notes: string } | null>(null);

  // Form states for creating / editing customer
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custPassword, setCustPassword] = useState('');
  const [custNotes, setCustNotes] = useState('');

  // Sync default currency
  useEffect(() => {
    if (currencies.length > 0 && !currencies.includes(txCurrency)) {
      setTxCurrency(currencies[0]);
    }
    if (currencies.length > 0 && !currencies.includes(intCurrency)) {
      setIntCurrency(currencies[0]);
    }
  }, [currencies]);

  const isSystemAccount = (id: string) => 
    id === 'system-expenses' || 
    id === 'system-exchange' || 
    id === 'system-transfer-fee' || 
    id === 'system-profit' ||
    id === 'system-fast-hawala';

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            c.phone.includes(searchTerm);
      if (showSystemOnly) {
        return matchesSearch && isSystemAccount(c.id);
      }
      return matchesSearch;
    });
  }, [customers, searchTerm, showSystemOnly]);

  // Last 10 Internal Transfers Memo
  const last10InternalTransfers = useMemo(() => {
    const senderTxs = appState.transactions.filter(
      tx => tx.type === 'InternalTransfer' && !tx.id.endsWith('-REC')
    );
    const sorted = [...senderTxs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return sorted.slice(0, 10).map(senderTx => {
      const receiverTx = appState.transactions.find(r => r.id === `${senderTx.id}-REC`);
      return {
        id: senderTx.id,
        senderName: senderTx.customerName,
        receiverName: receiverTx ? receiverTx.customerName : (lang === 'en' ? 'Receiver' : lang === 'ar' ? 'المستلم' : 'وەرگر'),
        currency: senderTx.currency,
        amount: Math.abs(senderTx.amount),
        notes: senderTx.notes,
        performedBy: senderTx.performedBy,
        timestamp: senderTx.timestamp
      };
    });
  }, [appState.transactions, lang]);

  const handleOpenForm = (customer?: Customer) => {
    if (customer) {
      setActiveCustomer(customer);
      setCustName(customer.name);
      setCustPhone(customer.phone);
      setCustPassword(customer.password || '123');
      setCustNotes(customer.notes || '');
    } else {
      setActiveCustomer(null);
      setCustName('');
      setCustPhone('');
      setCustPassword('123');
      setCustNotes('');
    }
    setShowFormModal(true);
  };

  const handleSaveCustSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!custName.trim() || !custPhone.trim()) return;

    onSaveCustomer({
      id: activeCustomer?.id,
      name: custName,
      phone: custPhone,
      password: custPassword,
      notes: custNotes
    });

    setShowFormModal(false);
  };

  const handleOpenTx = (customer: Customer, type: 'Deposit' | 'Withdrawal') => {
    setActiveCustomer(customer);
    setTxType(type);
    setTxCurrency(currencies[0] || 'USD');
    setTxAmount('');
    setTxNotes('');
    setShowTransactionModal(true);
  };

  const handleTxSubmit = (e: FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(txAmount);
    if (!activeCustomer || isNaN(numAmount) || numAmount <= 0) return;

    onModifyCustomerBalance(activeCustomer.id, txType, txCurrency, numAmount, txNotes);
    setShowTransactionModal(false);
  };

  const handleInternalTransferSubmit = (e: FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(intAmount);
    if (!intSenderId || !intReceiverId || isNaN(numAmount) || numAmount <= 0) return;
    if (intSenderId === intReceiverId) {
      alert(lang === 'en' ? 'Sender and receiver cannot be the same account' : lang === 'ar' ? 'لا يمكن اختيار نفس الحساب للمرسل والمستلم' : 'نێرەر و وەرگر نابێت یەک هەژمار بن');
      return;
    }

    if (onCreateInternalTransfer) {
      onCreateInternalTransfer(intSenderId, intReceiverId, intCurrency, numAmount, intNotes);
    }

    setIntAmount('');
    setIntNotes('');
    setIntSuccessMsg(lang === 'en' ? 'Internal transfer executed successfully!' : lang === 'ar' ? 'تم تنفيذ التحويل الداخلي بنجاح!' : 'گواستنەوەی ناوخۆیی بە سەرکەوتوویی جێبەجێ کرا!');
    setTimeout(() => setIntSuccessMsg(''), 4000);
  };

  return (
    <div className={`space-y-6 animate-fade-in ${lang === 'en' ? 'text-left' : 'text-right'}`}>
      {/* Top Header Card */}
      <GlassCard className="p-0" contentClassName="p-5 sm:p-6 space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 view-header" data-animate="header">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white rtl:border-r-4 rtl:pr-3 ltr:border-l-4 ltr:pl-3 border-[#1D7AFC] flex items-center gap-2.5">
              <Users className="w-6 h-6 text-[#1D7AFC]" />
              <span>{t.manage_customers}</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">{t.customers_desc}</p>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            {activeSubTab === 'list' && (
              <button
                onClick={() => handleOpenForm()}
                className="px-5 py-2.5 bg-[#1D7AFC] hover:bg-blue-500 text-white font-medium rounded-xl text-xs flex items-center gap-2 shadow-[0_4px_20px_rgba(29,122,252,0.4)] transition-all w-full md:w-auto justify-center cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>{t.add_new_customer}</span>
              </button>
            )}
          </div>
        </div>

        {/* Subtabs for Customers View */}
        <div className="flex items-center gap-2 border-t border-white/[0.08] pt-3 text-xs font-bold no-print overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('list')}
            className={`px-4 py-2 rounded-xl transition-all relative flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'list'
                ? 'bg-[#1D7AFC] text-white shadow-[0_4px_16px_rgba(29,122,252,0.4)]'
                : 'bg-white/[0.05] text-slate-300 hover:text-white hover:bg-white/[0.1] border border-white/[0.08]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>{lang === 'en' ? 'Customer List' : lang === 'ar' ? 'قائمة العملاء' : 'لیستی کڕیاران'}</span>
          </button>

          <button
            onClick={() => setActiveSubTab('internal')}
            className={`px-4 py-2 rounded-xl transition-all relative flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'internal'
                ? 'bg-[#1D7AFC] text-white shadow-[0_4px_16px_rgba(29,122,252,0.4)]'
                : 'bg-white/[0.05] text-slate-300 hover:text-white hover:bg-white/[0.1] border border-white/[0.08]'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>{lang === 'en' ? 'Internal Transfer' : lang === 'ar' ? 'التحويل الداخلي' : 'گواستنەوەی ناوخۆیی'}</span>
          </button>
        </div>
      </GlassCard>

      {/* SUBTAB 1: Customer List */}
      {activeSubTab === 'list' && (
        <div className="space-y-6">
          {/* Search and control panel */}
          <div data-animate="card" className="bento-card transform-gpu bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <input
                type="text"
                placeholder={t.search_placeholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-10 py-2.5 text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none"
              />
              <Search className="w-4.5 h-4.5 text-gray-400 absolute right-3.5 top-3" />
            </div>

            <button
              type="button"
              onClick={() => setShowSystemOnly(!showSystemOnly)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 w-full sm:w-auto justify-center ${
                showSystemOnly 
                  ? 'bg-amber-50 text-amber-800 border-amber-200 shadow-sm' 
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${showSystemOnly ? 'bg-amber-500 animate-pulse' : 'bg-gray-300'}`}></span>
              <span>
                {lang === 'en' 
                  ? 'System Accounts Only' 
                  : lang === 'ar' 
                    ? 'حسابات النظام فقط' 
                    : 'تەنها هەژمارەکانی سیستەم'}
              </span>
            </button>
          </div>

          {/* Customers list desktop table */}
          <div data-animate="card" className="bento-card transform-gpu bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Mobile Clients Card-vibe List */}
            <div className="md:hidden divide-y divide-gray-100 p-1 bg-white">
              {filteredCustomers.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                  {lang === 'en' ? 'No clients found matching the search' : lang === 'ar' ? 'لم يتم العثور على أي عميل يدعم البحث' : 'ھیچ کڕیارێک بەو مەرجە نەدۆزرایەوە.'}
                </div>
              ) : (
                filteredCustomers.map((c) => (
                  <div key={c.id} data-animate="row" className="list-item-row p-4 space-y-3.5 hover:bg-gray-50/20 transition-colors">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                          {c.name}
                          {isSystemAccount(c.id) && (
                            <span className="bg-amber-100 text-amber-950 text-[10px] font-bold px-2 py-0.5 rounded-md border border-amber-300">
                              {lang === 'en' ? 'SYSTEM' : lang === 'ar' ? 'نظام' : 'سیستەم'}
                            </span>
                          )}
                        </h3>
                        {c.notes && <p className="text-[10px] text-gray-400 mt-0.5">{c.notes}</p>}
                        <span className="inline-block mt-1 text-[10px] font-mono text-gray-700 bg-gray-100 px-2 py-0.5 rounded font-bold">{isSystemAccount(c.id) ? (lang === 'en' ? 'SYSTEM' : lang === 'ar' ? 'نظام' : 'سیستەم') : c.phone}</span>
                      </div>
                      
                      {/* Action buttons */}
                      {!isSystemAccount(c.id) ? (
                        <div className="flex items-center gap-1.5 no-print">
                          <button
                            onClick={() => handleOpenForm(c)}
                            className="p-1 px-1.5 border border-gray-100 text-gray-400 hover:text-primary hover:bg-gray-50 rounded"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setCustomerToDelete(c)}
                            className="p-1 px-1.5 border border-red-50 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5 animate-pulse" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold text-amber-950 bg-amber-100 px-2 py-1 rounded-md border border-amber-300">
                          {lang === 'en' ? 'RESTRICTED' : lang === 'ar' ? 'محمي' : 'پارێزراو'}
                        </span>
                      )}
                    </div>

                    {/* Balances list inside Grid */}
                    <div className="grid grid-cols-3 gap-2 py-2 border-t border-b border-dashed border-gray-100/60 bg-gray-50/30 rounded-lg p-2">
                      {currencies.map(cur => {
                        const bal = c.balances[cur] || 0;
                        const isNeg = bal < 0;
                        return (
                          <div key={cur} className="text-left">
                            <span className="text-[9px] text-gray-400 font-bold block">{cur}</span>
                            <p className={`font-mono text-xs font-bold ${isNeg ? 'text-red-600' : 'text-emerald-700'}`}>
                              {formatMoney(bal, cur)}
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    {/* Main Transaction Triggers */}
                    <div className="flex justify-end gap-2 text-xs no-print">
                      <button
                        onClick={() => handleOpenTx(c, 'Deposit')}
                        title={lang === 'en' ? 'Deposit' : lang === 'ar' ? 'إيداع' : 'پارە دانان'}
                        className="flex-1 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/60 rounded-xl inline-flex items-center justify-center transition-all active:scale-95"
                      >
                        <ArrowDownRight className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenTx(c, 'Withdrawal')}
                        title={lang === 'en' ? 'Withdraw' : lang === 'ar' ? 'سحب' : 'ڕاکێشان'}
                        className="flex-1 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/60 rounded-xl inline-flex items-center justify-center transition-all active:scale-95"
                      >
                        <ArrowUpRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop / Tablet Customer Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-100">
                  <tr className={lang === 'en' ? 'text-left' : 'text-right'}>
                    <th className="px-6 py-4">{lang === 'en' ? 'Customer Name' : lang === 'ar' ? 'اسم العميل' : 'کڕیار'}</th>
                    <th className="px-6 py-4">{t.customer_phone}</th>
                    {currencies.map(cur => (
                      <th key={cur} className="px-6 py-4 font-mono font-bold">
                        {lang === 'en' ? `${cur} Balance` : lang === 'ar' ? `رصيد بـ ${cur}` : `باڵانسی ${cur}`}
                      </th>
                    ))}
                    <th className={`px-6 py-4 ${lang === 'en' ? 'text-right' : 'text-left'}`}>
                      {lang === 'en' ? 'Actions' : lang === 'ar' ? 'الإجراءات' : 'کردارە تەکنیکییەکان'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {filteredCustomers.map((c) => {
                    return (
                      <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-bold text-gray-900 text-sm truncate max-w-[200px] flex items-center gap-2">
                              {c.name}
                              {isSystemAccount(c.id) && (
                                <span className="bg-amber-100 text-amber-950 text-[10px] font-bold px-2 py-0.5 rounded-md border border-amber-300">
                                  {lang === 'en' ? 'SYSTEM' : lang === 'ar' ? 'نظام' : 'سیستەم'}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-gray-400 font-mono mt-0.5">{c.notes || '-'}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-mono font-bold text-gray-700">{isSystemAccount(c.id) ? (lang === 'en' ? 'SYSTEM' : lang === 'ar' ? 'نظام' : 'سیستەم') : c.phone}</td>
                        
                        {currencies.map(cur => {
                          const bal = c.balances[cur] || 0;
                          const isNeg = bal < 0;
                          return (
                            <td key={cur} className={`px-6 py-4 font-mono font-bold text-sm ${isNeg ? 'text-red-600' : 'text-green-600'}`}>
                              {formatMoney(bal, cur)}
                            </td>
                          );
                        })}

                        {/* Technical actions */}
                        <td className={`px-6 py-4 space-x-1.5 space-y-1 ${lang === 'en' ? 'text-right' : 'text-left'}`}>
                          <button
                            onClick={() => handleOpenTx(c, 'Deposit')}
                            title={lang === 'en' ? 'Deposit' : lang === 'ar' ? 'إيداع' : 'پارە دانان'}
                            className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/60 rounded-xl inline-flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-2xs"
                          >
                            <ArrowDownRight className="w-4 h-4" />
                          </button>
                          
                          <button
                            onClick={() => handleOpenTx(c, 'Withdrawal')}
                            title={lang === 'en' ? 'Withdraw' : lang === 'ar' ? 'سحب' : 'ڕاکێشان'}
                            className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/60 rounded-xl inline-flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-2xs"
                          >
                            <ArrowUpRight className="w-4 h-4" />
                          </button>

                          {!isSystemAccount(c.id) ? (
                            <>
                              <button
                                onClick={() => handleOpenForm(c)}
                                className="p-1.5 text-gray-400 hover:text-primary hover:bg-gray-100 rounded-lg inline-flex"
                                title={lang === 'en' ? 'Edit details' : lang === 'ar' ? 'تعديل البيانات' : 'دەستکاریکردنی زانیاری'}
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => setCustomerToDelete(c)}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg inline-flex"
                                title={lang === 'en' ? 'Delete' : lang === 'ar' ? 'حذف الحساب' : 'سڕینەوە'}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <span className="text-[10px] font-bold text-amber-950 bg-amber-100 px-2.5 py-1 rounded-md border border-amber-300 inline-block align-middle select-none">
                              {lang === 'en' ? 'SYSTEM' : lang === 'ar' ? 'نظام' : 'سیستەم'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredCustomers.length === 0 && (
                    <tr>
                      <td colSpan={3 + currencies.length} className="text-center py-8 text-gray-400 text-sm">
                        {lang === 'en' ? 'No clients found matching the search' : lang === 'ar' ? 'لم يتم العثور على أي عميل يدعم البحث' : 'ھیچ کڕیارێک بەو مەرجە نەدۆزرایەوە.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: Internal Transfer */}
      {activeSubTab === 'internal' && (
        <div className="space-y-6">
          {intSuccessMsg && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl flex items-center gap-2 text-xs font-bold animate-fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <span>{intSuccessMsg}</span>
            </div>
          )}

          {/* Internal Transfer Form */}
          <div data-animate="card" className="bento-card transform-gpu bg-white p-6 rounded-2xl border border-gray-100 shadow-sm max-w-2xl mx-auto">
            <form onSubmit={handleInternalTransferSubmit} className="space-y-4">
              <h3 className="text-sm font-bold text-gray-900 border-b border-gray-50 pb-2 flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-primary" />
                {lang === 'en' ? 'Direct Move Between Two Accounts (Same Currency)' : lang === 'ar' ? 'تحويل مباشر بين حسابين (نفس العملة)' : 'گواستنەوەی ڕاستەوخۆ لە نێوان دوو هەژمار (هەمان دراو)'}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    {lang === 'en' ? 'From Account (Sender)' : lang === 'ar' ? 'من حساب (المرسل)' : 'لە هەژماری (نێرەر)'}
                  </label>
                  <SearchableCustomerSelect
                    value={intSenderId}
                    onChange={(id) => setIntSenderId(id)}
                    customers={customers}
                    disabledId={intReceiverId}
                    placeholder={lang === 'en' ? 'Select Sender...' : lang === 'ar' ? 'اختر المرسل...' : 'هەڵبژاردنی نێرەر...'}
                    lang={lang}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    {lang === 'en' ? 'To Account (Receiver)' : lang === 'ar' ? 'إلي حساب (المستلم)' : 'بۆ نێو هەژماری (وەرگر)'}
                  </label>
                  <SearchableCustomerSelect
                    value={intReceiverId}
                    onChange={(id) => setIntReceiverId(id)}
                    customers={customers}
                    disabledId={intSenderId}
                    placeholder={lang === 'en' ? 'Select Receiver...' : lang === 'ar' ? 'اختر المستلم...' : 'هەڵبژاردنی وەرگر...'}
                    lang={lang}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">{t.currency_label}</label>
                  <select
                    value={intCurrency}
                    onChange={(e) => setIntCurrency(e.target.value as Currency)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                  >
                    {currencies.map(cur => (
                      <option key={cur} value={cur}>
                        {cur === 'USD' ? 'USD ($)' : cur === 'IQD' ? 'IQD (د.ع)' : cur === 'IRR' ? 'IRR (﷼)' : cur}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    {lang === 'en' ? 'Amount to Transfer' : lang === 'ar' ? 'المبلغ المراد تحويله' : 'بڕی دراوە گوازراوەکە'}
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    placeholder={lang === 'en' ? 'e.g. 2,500' : lang === 'ar' ? 'مثال: 2500' : 'نموونە: 2,500'}
                    value={formatInputValue(intAmount)}
                    onChange={(e) => setIntAmount(parseInputValue(e.target.value))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none font-mono text-left"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">{t.notes_label}</label>
                <textarea
                  placeholder={lang === 'en' ? 'Write reason or notes for this direct transfer...' : lang === 'ar' ? 'اكتب سبب التحويل أو الملاحظات...' : 'هۆکار یان تێبینی بنووسە بۆ ئەم ئاڵوگۆڕە بێ بەرامبەرە...'}
                  value={intNotes}
                  onChange={(e) => setIntNotes(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none h-16 resize-none"
                />
              </div>

              <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 text-[11px] text-blue-800 leading-normal">
                {lang === 'en' ? 'Notice: This transfer does not add any expenses/fees to the Vault and does not update Safe cash. It only moves balances ledger between customer accounts.' : lang === 'ar' ? 'ملاحظة: هذا التحويل لا يحمل أي رسوم أو عمولات للخزينة ولا يؤثر على السيولة النقدية، فقط يقوم بنقل الحساب دفترياً بين العملاء.' : 'سەرنج: ئەم گواستنەوەیە هیچ جۆرە تێچوو و کرێ ناکاتە ئەستۆی گەنجینە و هیچ مامەڵەیەک لە سندوقدا ئەنجام نادات. تەنها حیساب لە نێوان کڕیاراندا جێدەگۆڕێت.'}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-primary text-white font-bold rounded-xl text-xs hover:bg-primary-dark transition-all flex items-center gap-1 shadow-sm"
                >
                  <span>{lang === 'en' ? 'Transfer Directly' : lang === 'ar' ? 'نفذ التحويل المباشر' : 'ڕاستەوخۆ حەواڵەی بکە'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Last 10 Internal Transfers Section */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-gray-900">
                  {lang === 'en' ? 'Last 10 Internal Transfers' : lang === 'ar' ? 'آخر 10 تحويلات داخلية' : 'کۆتا ١٠ گواستنەوە ناوخۆییەکان'}
                </h3>
              </div>
              <span className="text-xs text-gray-400 font-mono">
                {last10InternalTransfers.length} {lang === 'en' ? 'records' : lang === 'ar' ? 'سجلات' : 'تۆمار'}
              </span>
            </div>

            {/* Mobile View */}
            <div className="md:hidden divide-y divide-gray-100 p-2">
              {last10InternalTransfers.length === 0 ? (
                <div className="text-center py-6 text-gray-400 text-xs">
                  {lang === 'en' ? 'No internal transfers recorded yet' : lang === 'ar' ? 'لا توجد تحويلات داخلية مسجلة حتى الآن' : 'هیچ گواستنەوەیەکی ناوخۆیی تۆمار نەکراوە'}
                </div>
              ) : (
                last10InternalTransfers.map((tx) => (
                  <div key={tx.id} className="p-3 space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-mono text-primary font-bold text-[11px]">{tx.id}</span>
                      <span className="text-[10px] text-gray-400 font-mono">{formatKurdishDateTime(tx.timestamp)}</span>
                    </div>
                    <div className="flex justify-between items-center font-bold">
                      <span className="text-gray-800">{tx.senderName} ➔ {tx.receiverName}</span>
                      <span className="font-mono text-emerald-700">{formatMoney(tx.amount, tx.currency)}</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-400">
                      <span>{lang === 'en' ? 'Operator' : lang === 'ar' ? 'المستخدم' : 'ئەنجامدەر'}: {tx.performedBy || '-'}</span>
                      <span className="truncate max-w-[150px]">{tx.notes || '-'}</span>
                    </div>
                    <div className="flex justify-end gap-2 pt-2 border-t border-dashed border-gray-100">
                      {onEditTransactionNotes && (
                        <button
                          type="button"
                          onClick={() => setEditingInternalTx({ id: tx.id, notes: tx.notes || '' })}
                          className="px-2.5 py-1 text-gray-700 hover:bg-gray-100 rounded-lg text-[10px] font-bold flex items-center gap-1 border border-gray-200"
                        >
                          <Edit3 className="w-3 h-3 text-primary" />
                          <span>{lang === 'en' ? 'Edit' : lang === 'ar' ? 'تعديل' : 'دەستکاری'}</span>
                        </button>
                      )}
                      {onDeleteTransaction && (
                        <button
                          type="button"
                          onClick={() => onDeleteTransaction(tx.id)}
                          className="px-2.5 py-1 text-rose-600 hover:bg-rose-50 rounded-lg text-[10px] font-bold flex items-center gap-1 border border-rose-100"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>{lang === 'en' ? 'Delete' : lang === 'ar' ? 'حذف' : 'سڕینەوە'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-100">
                  <tr className={lang === 'en' ? 'text-left' : 'text-right'}>
                    <th className="px-6 py-3">{lang === 'en' ? 'Code' : lang === 'ar' ? 'الرمز' : 'کۆد'}</th>
                    <th className="px-6 py-3">{lang === 'en' ? 'From (Sender)' : lang === 'ar' ? 'من (المرسل)' : 'لە (نێرەر)'}</th>
                    <th className="px-6 py-3">{lang === 'en' ? 'To (Receiver)' : lang === 'ar' ? 'إلى (المستلم)' : 'بۆ (وەرگر)'}</th>
                    <th className="px-6 py-3">{t.amount_label}</th>
                    <th className="px-6 py-3">{lang === 'en' ? 'Date & Time' : lang === 'ar' ? 'التاريخ والوقت' : 'بەروار و کات'}</th>
                    <th className="px-6 py-3">{lang === 'en' ? 'Operator' : lang === 'ar' ? 'المستخدم' : 'ئەنجامدەر'}</th>
                    <th className="px-6 py-3">{t.notes_label}</th>
                    {(onEditTransactionNotes || onDeleteTransaction) && (
                      <th className="px-6 py-3 text-center">{lang === 'en' ? 'Actions' : lang === 'ar' ? 'الإجراءات' : 'کردارەکان'}</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {last10InternalTransfers.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-3.5 font-mono font-bold text-primary">{tx.id}</td>
                      <td className="px-6 py-3.5 font-bold text-gray-900">{tx.senderName}</td>
                      <td className="px-6 py-3.5 font-bold text-emerald-700">{tx.receiverName}</td>
                      <td className="px-6 py-3.5 font-mono font-bold text-emerald-700">
                        {formatMoney(tx.amount, tx.currency)}
                      </td>
                      <td className="px-6 py-3.5 font-mono text-gray-400 text-[11px]">
                        {formatKurdishDateTime(tx.timestamp)}
                      </td>
                      <td className="px-6 py-3.5 font-semibold text-gray-600">{tx.performedBy || '-'}</td>
                      <td className="px-6 py-3.5 text-gray-400 max-w-xs truncate">{tx.notes || '-'}</td>
                      {(onEditTransactionNotes || onDeleteTransaction) && (
                        <td className="px-6 py-3.5 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {onEditTransactionNotes && (
                              <button
                                type="button"
                                onClick={() => setEditingInternalTx({ id: tx.id, notes: tx.notes || '' })}
                                className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                title={lang === 'en' ? 'Edit Notes' : lang === 'ar' ? 'تعديل الملاحظات' : 'دەستکاریکردنی تێبینی'}
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                            )}
                            {onDeleteTransaction && (
                              <button
                                type="button"
                                onClick={() => onDeleteTransaction(tx.id)}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title={lang === 'en' ? 'Delete' : lang === 'ar' ? 'حذف' : 'سڕینەوە'}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                  {last10InternalTransfers.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-gray-400">
                        {lang === 'en' ? 'No internal transfers recorded yet' : lang === 'ar' ? 'لا توجد تحويلات داخلية مسجلة حتى الآن' : 'هیچ گواستنەوەیەکی ناوخۆیی تۆمار نەکراوە'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Customer Form Modal (Create / Edit) */}
      {showFormModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xl flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-slate-950/85 backdrop-blur-2xl backdrop-saturate-150 rounded-2xl w-full max-w-md shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.22),0_25px_60px_rgba(0,0,0,0.65)] border border-white/[0.12] overflow-hidden animate-scale-up text-white">
            <div className={`px-6 py-4 border-b border-white/[0.08] bg-slate-950/60 flex justify-between items-center ${lang === 'en' ? 'flex-row-reverse' : 'flex-row'}`} dir={lang === 'en' ? 'ltr' : 'rtl'}>
              <h3 className="text-sm font-bold text-white">
                {activeCustomer ? t.edit_customer : t.add_new_customer}
              </h3>
              <button onClick={() => setShowFormModal(false)} className="text-slate-400 hover:text-white text-lg p-1 cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSaveCustSubmit} className="p-6 space-y-4" dir={lang === 'en' ? 'ltr' : 'rtl'}>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">{t.customer_name}</label>
                <input
                  type="text"
                  required
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  className="w-full bg-white/[0.05] border border-white/[0.12] rounded-xl px-3.5 py-2 text-xs text-white focus:ring-2 focus:ring-[#1D7AFC]/30 focus:border-[#1D7AFC] outline-none"
                  placeholder="e.g. Ahmad Azad"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">{t.customer_phone}</label>
                <input
                  type="text"
                  required
                  value={custPhone}
                  onChange={(e) => setCustPhone(e.target.value)}
                  className="w-full bg-white/[0.05] border border-white/[0.12] rounded-xl px-3.5 py-2 text-xs text-white focus:ring-2 focus:ring-[#1D7AFC]/30 focus:border-[#1D7AFC] outline-none font-mono"
                  placeholder="e.g. 07501234567"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">{t.customer_password}</label>
                <input
                  type="text"
                  required
                  value={custPassword}
                  onChange={(e) => setCustPassword(e.target.value)}
                  className="w-full bg-white/[0.05] border border-white/[0.12] rounded-xl px-3.5 py-2 text-xs text-white focus:ring-2 focus:ring-[#1D7AFC]/30 focus:border-[#1D7AFC] outline-none font-mono"
                  placeholder="Password for client logging"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">{t.customer_notes}</label>
                <textarea
                  value={custNotes}
                  onChange={(e) => setCustNotes(e.target.value)}
                  className="w-full bg-white/[0.05] border border-white/[0.12] rounded-xl px-3.5 py-2 text-xs text-white focus:ring-2 focus:ring-[#1D7AFC]/30 focus:border-[#1D7AFC] outline-none h-16 resize-none"
                  placeholder="General notes..."
                />
              </div>

              <div className="pt-4 flex justify-end gap-2.5 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-4 py-2 border border-white/[0.12] bg-white/[0.06] hover:bg-white/[0.12] rounded-xl text-xs text-slate-200 transition-colors cursor-pointer backdrop-blur-md"
                >
                  {lang === 'en' ? 'Cancel' : lang === 'ar' ? 'إلغاء' : 'پاشگەزبوونەوە'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#1D7AFC] hover:bg-blue-500 font-bold text-white text-xs rounded-xl shadow-[0_4px_20px_rgba(29,122,252,0.4)] cursor-pointer"
                >
                  {t.save_changes}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Balance Transaction Modal */}
      {showTransactionModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xl flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-slate-950/85 backdrop-blur-2xl backdrop-saturate-150 rounded-2xl w-full max-w-md shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.22),0_25px_60px_rgba(0,0,0,0.65)] border border-white/[0.12] overflow-hidden animate-scale-up text-white">
            <div className={`px-6 py-4 border-b border-white/[0.08] bg-slate-950/60 flex justify-between items-center text-xs font-bold ${lang === 'en' ? 'flex-row-reverse' : 'flex-row'}`} dir={lang === 'en' ? 'ltr' : 'rtl'}>
              <span className={`px-2.5 py-0.5 rounded-full font-bold ${
                txType === 'Deposit' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              }`}>
                {txType === 'Deposit' ? t.deposit_action : t.withdrawal_action}
              </span>
              <h3 className="text-sm font-bold text-white">
                {lang === 'en' ? `Balance adjustment for ${activeCustomer?.name}` : lang === 'ar' ? `جوڵەی باڵانس لـ ${activeCustomer?.name}` : `جوڵەی ئەمانەت بۆ ${activeCustomer?.name}`}
              </h3>
            </div>

            <form onSubmit={handleTxSubmit} className="p-6 space-y-4" dir={lang === 'en' ? 'ltr' : 'rtl'}>
              <div className="bg-[#1D7AFC]/10 p-3.5 rounded-xl text-xs text-[#93C5FD] border border-[#1D7AFC]/20 mb-2">
                {lang === 'en' 
                  ? 'Notice: This directly alters the client account and updates the Main Office Vault correspondently.' 
                  : lang === 'ar' 
                    ? 'ملاحظة: هذا الإجراء يقوم بتعديل رصيد العميل فوراً ويقوم بتعديل رصيد الخزينة الرئيسية تلقائياً.' 
                    : 'سەرنج: ئەم کارە دەبێتە هۆی دەستکاریکردنی باڵانسی کڕیار و هاوشان گەنجینەی سەرەکی (Safe)ش نوێ ئەکاتەوە.'}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-slate-300 mb-1">{t.currency_label}</label>
                  <select
                    value={txCurrency}
                    onChange={(e) => setTxCurrency(e.target.value as Currency)}
                    className="w-full bg-slate-900 border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-white focus:ring-2 focus:ring-[#1D7AFC]/30 focus:border-[#1D7AFC] outline-none font-mono"
                  >
                    {currencies.map(cur => (
                      <option key={cur} value={cur}>
                        {cur}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-300 mb-1">{t.amount_label}</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    placeholder="e.g. 500"
                    value={formatInputValue(txAmount)}
                    onChange={(e) => setTxAmount(parseInputValue(e.target.value))}
                    className="w-full bg-white/[0.05] border border-white/[0.12] rounded-xl px-4 py-2 text-xs text-white focus:ring-2 focus:ring-[#1D7AFC]/30 focus:border-[#1D7AFC] outline-none font-mono text-left"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">{t.notes_label}</label>
                <textarea
                  placeholder="..."
                  value={txNotes}
                  onChange={(e) => setTxNotes(e.target.value)}
                  className="w-full bg-white/[0.05] border border-white/[0.12] rounded-xl px-4 py-2 text-xs text-white focus:ring-2 focus:ring-[#1D7AFC]/30 focus:border-[#1D7AFC] outline-none h-16 resize-none"
                  required
                />
              </div>

              <div className="pt-4 flex justify-end gap-2.5 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setShowTransactionModal(false)}
                  className="px-4 py-2 border border-white/[0.12] bg-white/[0.06] hover:bg-white/[0.12] rounded-xl text-xs text-slate-200 transition-colors cursor-pointer backdrop-blur-md"
                >
                  {lang === 'en' ? 'Cancel' : lang === 'ar' ? 'إلغاء' : 'پاشگەزبوونەوە'}
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 font-bold text-white text-xs rounded-xl cursor-pointer ${
                    txType === 'Deposit' 
                      ? 'bg-emerald-600 hover:bg-emerald-500 shadow-[0_4px_20px_rgba(16,185,129,0.35)]' 
                      : 'bg-rose-600 hover:bg-rose-500 shadow-[0_4px_20px_rgba(225,29,72,0.35)]'
                  }`}
                >
                  {lang === 'en' ? 'Confirm' : lang === 'ar' ? 'تأكيد' : 'دڵنیام، جێبەجێی بکە'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Internal Transfer Notes Modal */}
      {editingInternalTx && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-up">
            <div className={`px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center text-xs font-bold ${lang === 'en' ? 'flex-row-reverse' : 'flex-row'}`} dir={lang === 'en' ? 'ltr' : 'rtl'}>
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-primary" />
                {lang === 'en' ? `Edit Notes (${editingInternalTx.id})` : lang === 'ar' ? `تعديل الملاحظات (${editingInternalTx.id})` : `دەستکاریکردنی تێبینی (${editingInternalTx.id})`}
              </h3>
              <button
                type="button"
                onClick={() => setEditingInternalTx(null)}
                className="text-gray-400 hover:text-gray-600 text-lg p-1"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (onEditTransactionNotes) {
                  onEditTransactionNotes(editingInternalTx.id, editingInternalTx.notes);
                }
                setEditingInternalTx(null);
              }}
              className="p-6 space-y-4"
              dir={lang === 'en' ? 'ltr' : 'rtl'}
            >
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">{t.notes_label}</label>
                <textarea
                  required
                  value={editingInternalTx.notes}
                  onChange={(e) => setEditingInternalTx({ ...editingInternalTx, notes: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none h-24 resize-none"
                  placeholder={lang === 'en' ? 'Enter updated transfer notes...' : lang === 'ar' ? 'اكتب الملاحظات المحدثة...' : 'تێبینی نوێ یان هۆکاری گواستنەوە بنووسە...'}
                />
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingInternalTx(null)}
                  className="px-4 py-2 border border-gray-200 rounded-xl text-xs hover:bg-gray-50 font-bold"
                >
                  {lang === 'en' ? 'Cancel' : lang === 'ar' ? 'إلغاء' : 'پاشگەزبوونەوە'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary hover:bg-primary-dark text-white font-bold text-xs rounded-xl shadow-sm"
                >
                  {t.save_changes}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer deletion custom confirm modal */}
      <ConfirmModal
        isOpen={customerToDelete !== null}
        title={
          lang === 'en' 
            ? 'Delete Customer Account' 
            : lang === 'ar' 
              ? 'حذف الحساب الشخصي' 
              : 'سڕینەوەی هەژماری کڕیار'
        }
        message={
          lang === 'en'
            ? `Are you sure you want to delete client "${customerToDelete?.name}"? All their local balances will be deleted.`
            : lang === 'ar'
              ? `هل أنت متأكد من حذف العميل "${customerToDelete?.name}"؟ سيتم إزالة جميع الأرصدة والبيانات.`
              : `ئایا دڵنیایت لە سڕینەوەی کڕیار "${customerToDelete?.name}"؟ بە سڕینەوەی، سەرجەم باڵانس و زانیارییەکانی لادەبرێت.`
        }
        lang={lang}
        onConfirm={() => {
          if (customerToDelete) {
            onDeleteCustomer(customerToDelete.id);
            setCustomerToDelete(null);
          }
        }}
        onCancel={() => setCustomerToDelete(null)}
      />
    </div>
  );
}
