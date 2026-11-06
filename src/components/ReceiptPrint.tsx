import { Printer, X } from 'lucide-react';
import { Currency, FastTransferDetails, StandardTransferDetails, Transaction, SystemSettings } from '../types';
import { formatMoney, formatKurdishDateTime } from '../utils';

interface ReceiptPrintProps {
  type: 'Fast' | 'Standard' | 'Transaction';
  data: FastTransferDetails | StandardTransferDetails | Transaction;
  onClose: () => void;
  settings: SystemSettings;
}

export default function ReceiptPrint({ type, data, onClose, settings }: ReceiptPrintProps) {
  const lang = settings.language || 'ku';
  
  const handlePrint = () => {
    window.print();
  };

  const officeName = settings.officeName || (lang === 'en' ? 'Exchange Office' : lang === 'ar' ? 'مكتب الصرافة' : 'نووسینگەی ئاڵوگۆڕ');
  const todayStr = formatKurdishDateTime(new Date().toISOString());

  // Render Fast Transfer Receipt Content
  const renderFastReceipt = (t: FastTransferDetails) => {
    return (
      <div className="space-y-6 flex-1 flex flex-col justify-between">
        <div className="space-y-6">
          <div className="flex justify-between items-center border-b border-gray-100 pb-4 hide-on-print">
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold uppercase px-2.5 py-1 rounded-full ${
                  t.status === 'Cancelled'
                    ? 'bg-rose-100 text-rose-700 font-bold border border-rose-200'
                    : 'text-primary bg-primary-light'
                }`}>
                  {t.status === 'Cancelled'
                    ? (lang === 'en' ? 'Cancelled / Refunded' : lang === 'ar' ? 'ملغاة / تم الاسترجاع' : 'هەڵوەشاوەتەوە / پارە گەڕێنراوەتەوە')
                    : (lang === 'en' ? 'Fast Hawala (Cash)' : lang === 'ar' ? 'حوالة سريعة (نقدي)' : 'حەواڵەی خێرا (کاش)')}
                </span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mt-2">
                {t.status === 'Cancelled'
                  ? (lang === 'en' ? 'Fast Hawala Cancellation & Refund Receipt' : lang === 'ar' ? 'إيصال إلغاء واسترجاع الحوالة السريعة' : 'وەسڵی هەڵوەشاندنەوە و گەڕاندنەوەی حەواڵەی خێرا')
                  : (lang === 'en' ? 'Money Transfer Receipt (Sending)' : lang === 'ar' ? 'إيصال تحويل مالي (إرسال)' : 'وەسڵی حەواڵەکردن (ناردن)')}
              </h3>
            </div>
            <div className={lang === 'en' ? 'text-right' : 'text-left'}>
              <p className="text-xs text-gray-400">{lang === 'en' ? 'Transfer Code' : lang === 'ar' ? 'كود الحوالة' : 'کۆدی حەواڵە'}</p>
              <p className="text-xl font-bold font-mono text-primary">{t.id}</p>
            </div>
          </div>

          {/* Sender & Receiver Info */}
          <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
            <div>
              <h4 className="text-xs text-gray-500 font-semibold">{lang === 'en' ? 'Sender Details' : lang === 'ar' ? 'معلومات المرسل' : 'زانیاری نێرەر'}</h4>
              <div className="mt-1 space-y-0.5">
                <p className="text-sm font-bold text-gray-900">{t.senderName}</p>
                <p className="text-xs text-gray-500">{lang === 'en' ? 'Local Customer' : lang === 'ar' ? 'عميل محلي' : 'کڕیاری ناوخۆ'}</p>
              </div>
            </div>
            <div>
              <h4 className="text-xs text-gray-500 font-semibold">{lang === 'en' ? 'Receiver Details' : lang === 'ar' ? 'معلومات المستلم' : 'زانیاری وەرگر'}</h4>
              <div className="mt-1 space-y-0.5">
                <p className="text-sm font-bold text-gray-900">{t.receiverName}</p>
                <p className="text-xs text-gray-500">{lang === 'en' ? 'Phone: ' : lang === 'ar' ? 'الهاتف: ' : 'مۆبایل: '}{t.receiverPhone}</p>
              </div>
            </div>
          </div>

          {/* Financial Details */}
          <div className="border border-gray-100 rounded-xl overflow-hidden">
            <table className={`w-full text-xs ${lang === 'en' ? 'text-left' : 'text-right'}`}>
              <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-100">
                <tr>
                  <th className="px-4 py-2.5">{lang === 'en' ? 'Description' : lang === 'ar' ? 'البيان / الشرح' : 'ڕوونکردنەوە'}</th>
                  <th className={`px-4 py-2.5 ${lang === 'en' ? 'text-right' : 'text-left'}`}>{lang === 'en' ? 'Amount' : lang === 'ar' ? 'المبلغ' : 'بڕی دراو'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                <tr>
                  <td className="px-4 py-2.5">{lang === 'en' ? 'Sent Transfer Amount' : lang === 'ar' ? 'مبلغ الحوالة المرسل' : 'بڕی حەواڵە نێردراو'}</td>
                  <td className={`px-4 py-2.5 font-mono ${lang === 'en' ? 'text-right' : 'text-left'}`}>{formatMoney(t.amount, t.currency)}</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 text-gray-400">{lang === 'en' ? 'Transfer Fee / Commission' : lang === 'ar' ? 'أجور / عمولة الحوالة' : 'تێچوو/کۆمسیۆنی حەواڵە'}</td>
                  <td className={`px-4 py-2.5 font-mono ${lang === 'en' ? 'text-right' : 'text-left'}`}>{formatMoney(t.fee, t.currency)}</td>
                </tr>
                <tr className="bg-primary/5 text-primary font-bold">
                  <td className="px-4 py-3">{lang === 'en' ? 'Total Amount Deducted' : lang === 'ar' ? 'إجمالي المبلغ المخصوم' : 'کۆی گشتی بڕی داشکێنراو'}</td>
                  <td className={`px-4 py-3 font-mono text-sm ${lang === 'en' ? 'text-right' : 'text-left'}`}>
                    {formatMoney(t.amount + t.fee, t.currency)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {t.notes && (
          <div>
            <h4 className="text-xs text-gray-500 font-semibold">{lang === 'en' ? 'Notes:' : lang === 'ar' ? 'ملاحظات:' : 'تێبینی:'}</h4>
            <p className="text-sm text-gray-700 mt-1">{t.notes}</p>
          </div>
        )}
      </div>
    );
  };

  // Render Standard Hawala Receipt Content (with Buy/Sell rates logic)
  const renderStandardReceipt = (t: StandardTransferDetails) => {
    return (
      <div className="space-y-6 flex-1 flex flex-col justify-between">
        <div className="space-y-6">
          <div className="flex justify-between items-center border-b border-gray-100 pb-4">
            <div>
              <span className="text-xs font-semibold text-secondary uppercase bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
                {lang === 'en' ? 'Standard Hawala (Spread)' : lang === 'ar' ? 'حوالة قياسية (سبريد)' : 'حەواڵەی ستاندارد (سپرێد)'}
              </span>
              <h3 className="text-lg font-bold text-gray-900 mt-2">
                {lang === 'en' ? 'Official Transfer & Trading Receipt' : lang === 'ar' ? 'إيصال رسمي للحوالات والتجارة' : 'وەسڵی فەرمی حەواڵە و بازرگانی'}
              </h3>
            </div>
            <div className={lang === 'en' ? 'text-right' : 'text-left'}>
              <p className="text-xs text-gray-400">{lang === 'en' ? 'Transfer Code' : lang === 'ar' ? 'كود الحوالة' : 'کۆدی حەواڵە'}</p>
              <p className="text-xl font-bold font-mono text-secondary">{t.id}</p>
            </div>
          </div>

          {/* Sender & Receiver & Beneficiary Details */}
          <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
            <div>
              <h4 className="text-xs text-gray-500 font-semibold uppercase">{lang === 'en' ? 'Buying Customer Details' : lang === 'ar' ? 'معلومات العميل المشتري' : 'زانیاری کڕیاری کڕین'}</h4>
              <div className="mt-1 space-y-0.5">
                <p className="text-sm font-bold text-gray-900">{t.senderName}</p>
                <p className="text-xs text-gray-500">{lang === 'en' ? 'Currency: ' : lang === 'ar' ? 'عملة المعاملة: ' : 'دراوی مامەڵە: '}{t.currency || 'USD'}</p>
              </div>
            </div>
            <div>
              <h4 className="text-xs text-gray-500 font-semibold uppercase">{lang === 'en' ? 'Selling Customer Details' : lang === 'ar' ? 'معلومات العميل البائع' : 'زانیاری کڕیاری فرۆشتن'}</h4>
              <div className="mt-1 space-y-0.5">
                <p className="text-sm font-bold text-gray-900">{t.receiverName}</p>
                <p className="text-xs font-bold text-primary">{lang === 'en' ? 'Beneficiary: ' : lang === 'ar' ? 'المستفيد المستلم: ' : 'سودمەندی وەرگر: '}{t.beneficiaryName}</p>
                <p className="text-xs text-gray-500">{lang === 'en' ? 'Delivery Location: ' : lang === 'ar' ? 'مكان التسليم: ' : 'شوێنی گەیاندن: '}{t.deliveryLocation}</p>
              </div>
            </div>
          </div>

          {/* Financial conversion calculations */}
          <div className="border border-gray-100 rounded-xl overflow-hidden">
            <table className={`w-full text-xs ${lang === 'en' ? 'text-left' : 'text-right'}`}>
              <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-100">
                <tr>
                  <th className="px-4 py-2.5">{lang === 'en' ? 'Item / Description' : lang === 'ar' ? 'المادة / البيان' : 'ماددە / بابەت'}</th>
                  <th className={`px-4 py-2.5 ${lang === 'en' ? 'text-right' : 'text-left'}`}>{lang === 'en' ? `Value in (${t.currency || 'USD'})` : lang === 'ar' ? `القيمة بالعملة (${t.currency || 'USD'})` : `بەها بە دراو (${t.currency || 'USD'})`}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                <tr>
                  <td className="px-4 py-2.5">{lang === 'en' ? `Principal Hawala Amount (${t.currency || 'USD'})` : lang === 'ar' ? `حصة الحوالة الأساسية (${t.currency || 'USD'})` : `حەواڵەی پشکی سەرەکی (${t.currency || 'USD'})`}</td>
                  <td className={`px-4 py-2.5 font-mono font-semibold ${lang === 'en' ? 'text-right' : 'text-left'}`}>{formatMoney(t.amountUSD, t.currency || 'USD')}</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5">{lang === 'en' ? 'Credited to Buyer Account' : lang === 'ar' ? 'مضاف لحساب العميل المشتري (المبلغ + الشراء)' : 'زیادکراو بۆ هەژماری کڕیاری کڕین (بڕی سەرەکی + کڕین)'}</td>
                  <td className={`px-4 py-2.5 font-mono text-green-700 ${lang === 'en' ? 'text-right' : 'text-left'}`}>+{formatMoney(t.senderIQDAdded, t.currency || 'USD')}</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5">{lang === 'en' ? 'Debited from Seller Account' : lang === 'ar' ? 'مخصوم من حساب العميل البائع (المبلغ + البيع)' : 'داشکێنراو لە هەژماری کڕیاری فرۆشتن (بڕی سەرەکی + فرۆشتن)'}</td>
                  <td className={`px-4 py-2.5 font-mono text-red-700 ${lang === 'en' ? 'text-right' : 'text-left'}`}>-{formatMoney(t.receiverIQDDeducted, t.currency || 'USD')}</td>
                </tr>
                <tr className="bg-primary/5 font-bold text-primary border-t border-gray-200">
                  <td className="px-4 py-3">{lang === 'en' ? 'Office Profit on Trade' : lang === 'ar' ? 'أرباح المكتب من هذه العملية' : 'قازانجی نووسینگە لەم بازرگانییە'}</td>
                  <td className={`px-4 py-3 font-mono text-blue-700 text-sm ${lang === 'en' ? 'text-right' : 'text-left'}`}>+{formatMoney(t.profitIQD, t.currency || 'USD')}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {t.notes && (
          <div>
            <h4 className="text-xs text-gray-500 font-semibold">{lang === 'en' ? 'Notes:' : lang === 'ar' ? 'ملاحظات:' : 'تێبینی:'}</h4>
            <p className="text-sm text-gray-700 mt-1">{t.notes}</p>
          </div>
        )}
      </div>
    );
  };

  // Render standard transaction (Deposits, Withdrawals, generic exchange)
  const renderTransactionReceipt = (t: Transaction) => {
    if (t.type === 'Exchange') {
      const isBuyUSD = t.amount > 0;
      const otherAmount = Math.abs(t.targetAmount || 0);
      const otherCurrency = t.targetCurrency || 'IQD';
      const rate = t.rate || 0;

      return (
        <div className="space-y-6 flex-1 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-gray-100 pb-4 hide-on-print">
              <div>
                <span className={`text-xs font-semibold uppercase px-2.5 py-1 rounded-full border ${
                  isBuyUSD ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-blue-50 text-blue-800 border-blue-200'
                }`}>
                  {isBuyUSD 
                    ? (lang === 'en' ? 'Buy USD' : lang === 'ar' ? 'شراء دولار' : 'کڕینی دۆلار') 
                    : (lang === 'en' ? 'Sell USD' : lang === 'ar' ? 'بيع دولار' : 'فرۆشتنی دۆلار')}
                </span>
                <h3 className="text-lg font-bold text-gray-900 mt-2">
                  {lang === 'en' ? 'Official Currency Exchange Receipt' : lang === 'ar' ? 'إيصال رسمي لصرف العملات' : 'وەسڵی فەرمی ئاڵوگۆڕی دراو'}
                </h3>
              </div>
              <div className={lang === 'en' ? 'text-right' : 'text-left'}>
                <p className="text-xs text-gray-400">{lang === 'en' ? 'Receipt No' : lang === 'ar' ? 'رقم الإيصال' : 'ژمارەی وەسڵ'}</p>
                <p className="text-xl font-bold font-mono text-gray-600">{t.id}</p>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 hide-on-print">
              <h4 className="text-xs text-gray-500 font-semibold">{lang === 'en' ? 'Client / Counterparty' : lang === 'ar' ? 'الطرف / العميل' : 'لایەنی گۆڕەر / کڕیار'}</h4>
              <p className="text-sm font-bold text-gray-900 mt-1">
                {t.customerName === 'خانەی گەنجینە' 
                  ? (lang === 'en' ? 'Main Vault' : lang === 'ar' ? 'الخزينة الرئيسية' : 'خانەی گەنجینە')
                  : (t.customerName || (lang === 'en' ? 'Main Vault' : lang === 'ar' ? 'الخزينة الرئيسية' : 'خانەی گەنجینە'))}
              </p>
            </div>

            <div className="border border-gray-100 rounded-xl overflow-hidden">
              <table className={`w-full text-xs ${lang === 'en' ? 'text-left' : 'text-right'}`}>
                <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-2.5">{lang === 'en' ? 'Details / Information' : lang === 'ar' ? 'البيان / التفاصيل' : 'بابەت / زانیاری'}</th>
                    <th className={`px-4 py-2.5 ${lang === 'en' ? 'text-right' : 'text-left'}`}>{lang === 'en' ? 'Amount & Value' : lang === 'ar' ? 'القيمة والمبلغ' : 'بەها و بڕ'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  <tr>
                    <td className="px-4 py-2.5">{lang === 'en' ? 'Exchange Type' : lang === 'ar' ? 'نوع العملية' : 'جۆری ئاڵوگۆڕ'}</td>
                    <td className={`px-4 py-2.5 font-bold text-primary ${lang === 'en' ? 'text-right' : 'text-left'}`}>
                      {isBuyUSD 
                        ? (lang === 'en' ? 'Office Buys USD' : lang === 'ar' ? 'المكتب يشتري دولار' : 'نووسینگە دۆلار دەکڕێت') 
                        : (lang === 'en' ? 'Office Sells USD' : lang === 'ar' ? 'المكتب يبيع دولار' : 'نووسینگە دۆلار دەفرۆشێت')}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5">{lang === 'en' ? 'USD Amount' : lang === 'ar' ? 'مبلغ الدولار (USD)' : 'بڕی دۆلار (USD)'}</td>
                    <td className={`px-4 py-2.5 font-mono font-bold text-gray-900 ${lang === 'en' ? 'text-right' : 'text-left'}`}>
                      ${Math.abs(t.amount).toLocaleString()} USD
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5">{lang === 'en' ? 'Exchange Rate' : lang === 'ar' ? 'السعر المحدد' : 'نرخی دەستنیشانکراو'}</td>
                    <td className={`px-4 py-2.5 font-mono text-gray-600 ${lang === 'en' ? 'text-right' : 'text-left'}`}>
                      1 USD = {rate.toLocaleString()} {otherCurrency}
                    </td>
                  </tr>
                  <tr className="bg-primary/5 font-bold text-primary">
                    <td className="px-4 py-3">{lang === 'en' ? `Equivalent Amount (${otherCurrency})` : lang === 'ar' ? `المبلغ المقابل (${otherCurrency})` : `بڕی بەرامبەر (${otherCurrency})`}</td>
                    <td className={`px-4 py-3 font-mono text-sm font-black ${lang === 'en' ? 'text-right' : 'text-left'}`}>
                      {otherAmount.toLocaleString()} {otherCurrency}
                    </td>
                  </tr>
                  <tr className="text-xs text-gray-400">
                    <td className="px-4 py-2">{lang === 'en' ? 'Date & Time' : lang === 'ar' ? 'التاريخ والوقت' : 'بەروار و کات'}</td>
                    <td className={`px-4 py-2 font-mono ${lang === 'en' ? 'text-right' : 'text-left'}`}>{formatKurdishDateTime(t.timestamp)}</td>
                  </tr>
                  <tr className="text-xs text-gray-400">
                    <td className="px-4 py-2">{lang === 'en' ? 'Performed By' : lang === 'ar' ? 'تم بواسطة' : 'ئەنجامدراوە لە لایەن'}</td>
                    <td className={`px-4 py-2 ${lang === 'en' ? 'text-right' : 'text-left'}`}>{t.performedBy}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {t.notes && (
            <div className="hide-on-print">
              <h4 className="text-xs text-gray-500 font-semibold">{lang === 'en' ? 'Notes:' : lang === 'ar' ? 'ملاحظات:' : 'تێبینی:'}</h4>
              <p className="text-sm text-gray-700 mt-1">{t.notes}</p>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-6 flex-1 flex flex-col justify-between">
        <div className="space-y-6">
          <div className="flex justify-between items-center border-b border-gray-100 pb-4">
            <div>
              <span className={`text-xs font-semibold uppercase px-2.5 py-1 rounded-full border ${
                t.type === 'Deposit' ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'
              }`}>
                {t.type === 'Deposit' 
                  ? (lang === 'en' ? 'Deposit / Cash In' : lang === 'ar' ? 'إيداع نقدي / أمانات' : 'پارە دانان / سپاردن') 
                  : (lang === 'en' ? 'Withdrawal / Cash Out' : lang === 'ar' ? 'سحب نقدي' : 'کاش / ڕاکێشان')}
              </span>
              <h3 className="text-lg font-bold text-gray-900 mt-2">
                {lang === 'en' ? 'Vault Deposit & Withdrawal Receipt' : lang === 'ar' ? 'إيصال إيداع وسحب الخزينة' : 'وەسڵی سپاردن و ڕاکێشانی گەنجینە'}
              </h3>
            </div>
            <div className={lang === 'en' ? 'text-right' : 'text-left'}>
              <p className="text-xs text-gray-400">{lang === 'en' ? 'Receipt No' : lang === 'ar' ? 'رقم الإيصال' : 'ژمارەی وەسڵ'}</p>
              <p className="text-xl font-bold font-mono text-gray-600">{t.id}</p>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
            <h4 className="text-xs text-gray-500 font-semibold">{lang === 'en' ? 'Associated Account' : lang === 'ar' ? 'الحساب المعني' : 'هەژماری تایبەتمەند'}</h4>
            <p className="text-sm font-bold text-gray-900 mt-1">
              {t.customerName === 'خانەی گەنجینە' 
                ? (lang === 'en' ? 'Main Vault' : lang === 'ar' ? 'الخزينة الرئيسية' : 'خانەی گەنجینە')
                : (t.customerName || (lang === 'en' ? 'Main Vault' : lang === 'ar' ? 'الخزينة الرئيسية' : 'خانەی گەنجینە'))}
            </p>
          </div>

          <div className="border border-gray-100 rounded-xl overflow-hidden">
            <table className={`w-full text-xs ${lang === 'en' ? 'text-left' : 'text-right'}`}>
              <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-100">
                <tr>
                  <th className="px-4 py-2.5">{lang === 'en' ? 'Item' : lang === 'ar' ? 'البيان' : 'بابەت'}</th>
                  <th className={`px-4 py-2.5 ${lang === 'en' ? 'text-right' : 'text-left'}`}>{lang === 'en' ? 'Cash Amount' : lang === 'ar' ? 'المبلغ النقدي' : 'بڕی نەختینە'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                <tr>
                  <td className="px-4 py-2.5">{lang === 'en' ? 'Date & Time' : lang === 'ar' ? 'التاريخ والوقت' : 'بەروار و کات'}</td>
                  <td className={`px-4 py-2.5 font-mono ${lang === 'en' ? 'text-right' : 'text-left'}`}>{formatKurdishDateTime(t.timestamp)}</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5">{lang === 'en' ? 'Performed By' : lang === 'ar' ? 'تم بواسطة' : 'ئەنجامدراوە لە لایەن'}</td>
                  <td className={`px-4 py-2.5 ${lang === 'en' ? 'text-right' : 'text-left'}`}>{t.performedBy}</td>
                </tr>
                <tr className="bg-gray-50 font-bold">
                  <td className="px-4 py-3">{lang === 'en' ? 'Total Processed Amount' : lang === 'ar' ? 'إجمالي المبلغ المعالج' : 'کۆی بڕی بەڕێوەچوو'}</td>
                  <td className={`px-4 py-3 font-mono text-sm font-black ${lang === 'en' ? 'text-right' : 'text-left'} ${t.amount < 0 ? 'text-red-650' : 'text-emerald-700'}`}>
                    {formatMoney(t.amount, t.currency)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {t.notes && (
          <div>
            <h4 className="text-xs text-gray-500 font-semibold">{lang === 'en' ? 'Notes:' : lang === 'ar' ? 'ملاحظات:' : 'تێبینی:'}</h4>
            <p className="text-sm text-gray-700 mt-1">{t.notes}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xl flex items-center justify-center z-50 p-4 animate-fade-in print-modal-wrapper" dir={lang === 'en' ? 'ltr' : 'rtl'}>
      {/* Outer modal card */}
      <div className="bg-slate-900 border border-white/[0.12] rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.6)] w-full max-w-lg overflow-hidden flex flex-col h-[90vh] print-card-wrapper">
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-slate-950/80 no-print">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-white">
              {lang === 'en' ? 'Print Financial Receipt' : lang === 'ar' ? 'طباعة الإيصال المالي' : 'چاپکردنی وەسڵی دارایی'}
            </h2>
            <span className="text-[10px] font-black text-emerald-300 bg-emerald-500/20 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
              {lang === 'en' ? 'Official A4 Size' : lang === 'ar' ? 'الحجم الرسمي A4' : 'A4 قەبارەی فەرمی'}
            </span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/[0.08] transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Detailed Scrollable Receipt Sheet */}
        <div className="flex-1 p-8 overflow-y-auto" id="receipt-print-area">
          {/* Real Invoice Sheet layout for print design */}
          <div className={`print-receipt-sheet border-2 border-gray-400 p-6 rounded-lg bg-white ${lang === 'en' ? 'text-left' : 'text-right'} flex flex-col justify-between`}>
            {/* Enterprise Header */}
            <div className="text-center space-y-1.5 border-b-2 border-gray-100 pb-5">
              <h2 className="text-xl font-extrabold text-primary">{officeName}</h2>
              <p className="text-xs text-gray-500">
                {lang === 'en' ? 'Core Accounting & Money Transfer System' : lang === 'ar' ? 'نظام الحسابات الرئيسية وإدارة الحوالات' : 'سستمی حیساباتی سەرەکی و بڵاوکردنەوەی حەواڵەکان'}
              </p>
              <div className="flex justify-center gap-3 text-[10px] text-gray-400 font-mono">
                <span>{lang === 'en' ? 'Print Date: ' : lang === 'ar' ? 'تاريخ الطباعة: ' : 'بەرواری چاپ: '}{todayStr}</span>
              </div>
            </div>

            {/* Dynamic Receipt Body */}
            <div className="my-6 flex-1 flex flex-col justify-between">
              {type === 'Fast' && renderFastReceipt(data as FastTransferDetails)}
              {type === 'Standard' && renderStandardReceipt(data as StandardTransferDetails)}
              {type === 'Transaction' && renderTransactionReceipt(data as Transaction)}
            </div>

            {/* Signatures terms footer */}
            <div className="pt-4 border-t border-dashed border-gray-300">
              <p className="text-[10px] text-gray-500 leading-normal text-center">
                {lang === 'en' 
                  ? 'Please consider this document as an official receipt for accounting verification. Any discrepancy must be resolved promptly. Thank you for your trust.' 
                  : lang === 'ar' 
                  ? 'يرجى اعتبار هذا المستند كإيصال رسمي معتمد للمطابقة المحاسبية. يرجى تسوية أي خلاف فوراً. شكراً لثقتكم بنا.'
                  : 'خوازراوم بەڕێزان ئەم بەڵگەنامەیە وەک وەسڵێکی حەواڵەکردنی هاوسەنگی و ژمێریاری ڕەوا ببینن. هەر جیاوازییەک پێویستە لە کاتی خۆیدا چارەسەر بکرێت. سپاس بۆ متمانەتان بە ئێمە.'}
              </p>
              
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="text-center space-y-6">
                  <p className="text-xs font-bold text-gray-600">
                    {lang === 'en' ? 'Customer / Beneficiary Signature' : lang === 'ar' ? 'توقيع العميل / المستفيد' : 'واژۆی کڕیار / سودمەند'}
                  </p>
                  <p className="text-gray-300">____________________</p>
                </div>
                <div className="text-center space-y-6">
                  <p className="text-xs font-bold text-gray-600">
                    {lang === 'en' ? 'Employee Stamp & Signature' : lang === 'ar' ? 'ختم وتوقيع الموظف' : 'مۆر و واژۆی کارمەند'}
                  </p>
                  <p className="text-gray-300">____________________</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal footer controls */}
        <div className="px-6 py-4 bg-slate-950/80 border-t border-white/[0.08] flex justify-end gap-3 no-print">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-white/[0.12] bg-white/[0.06] hover:bg-white/[0.12] rounded-xl transition-colors text-xs text-slate-200 font-medium cursor-pointer backdrop-blur-md"
          >
            {lang === 'en' ? 'Close' : lang === 'ar' ? 'إغلاق' : 'داخستن'}
          </button>
          
          <button
            onClick={handlePrint}
            className="px-5 py-2 bg-[#1D7AFC] text-white hover:bg-blue-500 rounded-xl shadow-[0_4px_20px_rgba(29,122,252,0.4)] transition-all text-xs font-bold flex items-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>{lang === 'en' ? 'Print (PDF / A4)' : lang === 'ar' ? 'طباعة (PDF / A4)' : 'چاپ بکە (PDF / A4)'}</span>
          </button>
        </div>
      </div>

      {/* Embedded print only stylesheet styling actual print out size and hides regular browser ui */}
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
            margin: 0 !important;
            padding: 0 !important;
            background-color: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color: #000000 !important;
            width: 210mm !important;
            height: 297mm !important;
            box-sizing: border-box !important;
            overflow: visible !important;
          }

          /* Hide all other core app content of the website completely using visibility rules */
          body * {
            visibility: hidden !important;
          }

          /* Keep only the print wrapper and its nested descendants visible */
          .print-modal-wrapper, .print-modal-wrapper * {
            visibility: visible !important;
          }

          /* Stretch the print modal wrapper to exact full A4 page viewport size and center the card */
          .print-modal-wrapper {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important;
            height: 297mm !important;
            background-color: #ffffff !important;
            background: #ffffff !important;
            padding: 5mm 5mm !important; /* Elegant 5mm margin to frame the 200mm wide card perfectly */
            margin: 0 !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
            z-index: 999999 !important;
            box-sizing: border-box !important;
            page-break-after: avoid !important;
            page-break-before: avoid !important;
          }

          /* Stretch the modal container to the requested 200mm * 287mm dimensions */
          .print-card-wrapper {
            box-shadow: none !important;
            background-color: #ffffff !important;
            background: #ffffff !important;
            width: 200mm !important;
            height: 287mm !important;
            max-width: 200mm !important;
            max-height: 287mm !important;
            overflow: visible !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: stretch !important;
            border: none !important;
            margin: 0 auto !important;
            padding: 0 !important;
            box-sizing: border-box !important;
          }

          #receipt-print-area {
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
            display: flex !important;
            flex-direction: column !important;
            width: 100% !important;
            height: 100% !important;
            box-sizing: border-box !important;
          }

          .print-receipt-sheet {
            border: 2px solid #111111 !important;
            padding: 10mm !important; /* Elegant spacious internal padding */
            border-radius: 8px !important;
            box-shadow: none !important;
            background-color: #ffffff !important;
            background: #ffffff !important;
            color: #000000 !important;
            width: 100% !important;
            height: 100% !important; /* Fully stretches the border and content to the 287mm container limit */
            box-sizing: border-box !important;
            page-break-inside: avoid !important;
            margin: 0 !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
          }

          /* Font size and color scaling for pristine A4 presentation */
          .print-receipt-sheet h2 {
            font-size: 20px !important;
            color: #000000 !important;
          }
          .print-receipt-sheet h3 {
            font-size: 14px !important;
            color: #000000 !important;
          }
          .print-receipt-sheet h4 {
            font-size: 11px !important;
            color: #4b5563 !important;
          }
          .print-receipt-sheet p, .print-receipt-sheet span {
            font-size: 11px !important;
            color: #111827 !important;
          }
          .print-receipt-sheet table {
            font-size: 11px !important;
          }
          .print-receipt-sheet table th, .print-receipt-sheet table td {
            padding: 6px 10px !important;
            border-bottom: 1px solid #d1d5db !important;
            color: #111827 !important;
          }
          .print-receipt-sheet table th {
            color: #374151 !important;
            background-color: #f3f4f6 !important;
          }

          /* Ensure brand colors / dark classes don't break in print */
          .text-primary, .text-secondary {
            color: #000000 !important;
          }
          .bg-primary-light, .bg-blue-50, .bg-gray-50, .bg-gray-100 {
            background-color: #f3f4f6 !important;
            background: #f3f4f6 !important;
            border: 1px solid #d1d5db !important;
          }
          .border-gray-100, .border-gray-200 {
            border-color: #d1d5db !important;
          }
          .no-print, .hide-on-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
