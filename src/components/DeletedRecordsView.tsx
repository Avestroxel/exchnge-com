import React, { useState, useMemo } from 'react';
import { 
  Trash2, Search, Filter, Calendar, Info, Eye, X, RefreshCw, 
  ArrowLeftRight, Send, Users, Vault, AlertTriangle, FileText
} from 'lucide-react';
import { DeletedRecord, DeletedRecordCategory, SystemSettings } from '../types';

interface DeletedRecordsViewProps {
  deletedRecords: DeletedRecord[];
  currencies: string[];
  settings: SystemSettings;
}

export default function DeletedRecordsView({
  deletedRecords = [],
  currencies = ['USD', 'IQD'],
  settings
}: DeletedRecordsViewProps) {
  const lang = settings.language || 'ku';

  const [activeCategory, setActiveCategory] = useState<'All' | DeletedRecordCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState<string>('All');
  const getTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [fromDate, setFromDate] = useState<string>(getTodayString());
  const [toDate, setToDate] = useState<string>(getTodayString());
  const [selectedRecord, setSelectedRecord] = useState<DeletedRecord | null>(null);

  // Normalize deleted records so internal transfers map to Customer category
  const normalizedDeletedRecords = useMemo(() => {
    return deletedRecords.map(record => {
      if (
        record.originalId?.startsWith('INT') ||
        record.details?.['جۆری مامەڵە'] === 'InternalTransfer' ||
        record.title?.includes('حەواڵەی ناوخۆیی') ||
        record.title?.includes('گواستنەوەی ناوخۆیی') ||
        record.notes?.includes('حەواڵەی ناوخۆیی')
      ) {
        return { ...record, category: 'Customer' as const };
      }
      return record;
    });
  }, [deletedRecords]);

  // Filter logic
  const filteredRecords = useMemo(() => {
    return normalizedDeletedRecords.filter(record => {
      // Category filter
      if (activeCategory !== 'All' && record.category !== activeCategory) {
        return false;
      }

      // Currency filter
      if (selectedCurrency !== 'All') {
        if (record.currency) {
          if (record.currency !== selectedCurrency) return false;
        } else if (record.details) {
          const detailsStr = JSON.stringify(record.details);
          if (!detailsStr.includes(selectedCurrency)) return false;
        }
      }

      // Date range filter
      if (fromDate) {
        const recordDate = new Date(record.deletedAt);
        const fDate = new Date(fromDate);
        if (recordDate < fDate) return false;
      }
      if (toDate) {
        const recordDate = new Date(record.deletedAt);
        const tDate = new Date(toDate);
        tDate.setHours(23, 59, 59, 999);
        if (recordDate > tDate) return false;
      }

      // Text search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const titleMatch = record.title.toLowerCase().includes(q);
        const idMatch = record.id.toLowerCase().includes(q);
        const origIdMatch = record.originalId.toLowerCase().includes(q);
        const deletedByMatch = record.deletedBy.toLowerCase().includes(q);
        const notesMatch = (record.notes || '').toLowerCase().includes(q);
        const detailsMatch = JSON.stringify(record.details || {}).toLowerCase().includes(q);

        return titleMatch || idMatch || origIdMatch || deletedByMatch || notesMatch || detailsMatch;
      }

      return true;
    });
  }, [normalizedDeletedRecords, activeCategory, selectedCurrency, fromDate, toDate, searchQuery]);

  // Counts summary
  const counts = useMemo(() => {
    return {
      all: normalizedDeletedRecords.length,
      exchange: normalizedDeletedRecords.filter(r => r.category === 'Exchange').length,
      transfer: normalizedDeletedRecords.filter(r => r.category === 'Transfer').length,
      customer: normalizedDeletedRecords.filter(r => r.category === 'Customer').length,
      safe: normalizedDeletedRecords.filter(r => r.category === 'SafeTransaction').length
    };
  }, [normalizedDeletedRecords]);

  const handleResetFilters = () => {
    setActiveCategory('All');
    setSearchQuery('');
    setSelectedCurrency('All');
    setFromDate('');
    setToDate('');
  };

  const getCategoryBadge = (cat: DeletedRecordCategory) => {
    switch (cat) {
      case 'Exchange':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
            <ArrowLeftRight className="w-3.5 h-3.5" />
            {lang === 'en' ? 'Exchange' : lang === 'ar' ? 'صرافة' : 'گۆڕینەوەی دراو'}
          </span>
        );
      case 'Transfer':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
            <Send className="w-3.5 h-3.5" />
            {lang === 'en' ? 'Hawala / Transfer' : lang === 'ar' ? 'حوالة' : 'حەواڵە'}
          </span>
        );
      case 'Customer':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-100">
            <Users className="w-3.5 h-3.5" />
            {lang === 'en' ? 'Customer' : lang === 'ar' ? 'زبون' : 'کڕیار'}
          </span>
        );
      case 'SafeTransaction':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-100">
            <Vault className="w-3.5 h-3.5" />
            {lang === 'en' ? 'Safe / Cash' : lang === 'ar' ? 'الخزينة' : 'سندوق / نەقد'}
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`space-y-6 animate-fade-in ${lang === 'en' ? 'text-left' : 'text-right'}`}>
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 rtl:border-r-4 rtl:border-r-primary ltr:border-l-4 ltr:border-l-primary">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-red-50 text-red-600 rounded-xl border border-red-100">
            <Trash2 className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900">
                {lang === 'en' ? 'Deleted Records Archive' : lang === 'ar' ? 'أرشيف السجلات المحذوفة' : 'سڕاوەکان (ئەرشیفی سڕاوەکان)'}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-600 border border-red-100">
                {deletedRecords.length}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {lang === 'en'
                ? 'View-only historical log of all deleted transactions, customers, and hawala records.'
                : lang === 'ar'
                ? 'سجل للرؤية فقط لجميع العمليات والحوالات والزبائن المحذوفة للتدقيق والارشفة.'
                : 'بینینی سەرجەم ئەو مامەڵە و تۆمارانەی سڕاونەتەوە لە سیستەمدا بۆ وردبینی و دیاریکردنی هۆکارەکان.'}
            </p>
          </div>
        </div>

        {/* View-Only Alert Note */}
        <div className="flex items-center gap-2.5 px-4 py-3 bg-amber-50 text-amber-800 rounded-xl border border-amber-200/80 text-xs font-medium max-w-md">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-600" />
          <span>
            {lang === 'en'
              ? 'This section is read-only for security and auditing. Records cannot be restored.'
              : lang === 'ar'
              ? 'هذا القسم للقراءة والاطلاع فقط للتدقيق والأمان. لا يمكن استعادة السجلات المحذوفة.'
              : 'ئەم بەشە تەنها بۆ بینین و سەیرکردنە بۆ وردبینی. هیچ تۆمارێکی سڕاوە ناگەڕێندرێتەوە بۆ باڵانسەکان.'}
          </span>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <button
          onClick={() => setActiveCategory('All')}
          className={`p-4 rounded-xl border transition-all text-right flex flex-col justify-between ${
            activeCategory === 'All'
              ? 'bg-primary-light border-primary text-primary shadow-sm'
              : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <span className="text-xs font-medium opacity-80">
            {lang === 'en' ? 'All Deleted' : lang === 'ar' ? 'جميع المحذوفات' : 'هەموو سڕاوەکان'}
          </span>
          <span className="text-2xl font-bold mt-2">{counts.all}</span>
        </button>

        <button
          onClick={() => setActiveCategory('Exchange')}
          className={`p-4 rounded-xl border transition-all text-right flex flex-col justify-between ${
            activeCategory === 'Exchange'
              ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm'
              : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <span className="text-xs font-medium opacity-80 flex items-center gap-1.5">
            <ArrowLeftRight className="w-3.5 h-3.5 text-emerald-600" />
            {lang === 'en' ? 'Exchange' : lang === 'ar' ? 'الصرافة' : 'گۆڕینەوە'}
          </span>
          <span className="text-2xl font-bold mt-2">{counts.exchange}</span>
        </button>

        <button
          onClick={() => setActiveCategory('Transfer')}
          className={`p-4 rounded-xl border transition-all text-right flex flex-col justify-between ${
            activeCategory === 'Transfer'
              ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm'
              : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <span className="text-xs font-medium opacity-80 flex items-center gap-1.5">
            <Send className="w-3.5 h-3.5 text-blue-600" />
            {lang === 'en' ? 'Hawala' : lang === 'ar' ? 'الحوالات' : 'حەواڵەکان'}
          </span>
          <span className="text-2xl font-bold mt-2">{counts.transfer}</span>
        </button>

        <button
          onClick={() => setActiveCategory('Customer')}
          className={`p-4 rounded-xl border transition-all text-right flex flex-col justify-between ${
            activeCategory === 'Customer'
              ? 'bg-purple-50 border-purple-500 text-purple-700 shadow-sm'
              : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <span className="text-xs font-medium opacity-80 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-purple-600" />
            {lang === 'en' ? 'Customers' : lang === 'ar' ? 'الزبائن' : 'کڕیاران'}
          </span>
          <span className="text-2xl font-bold mt-2">{counts.customer}</span>
        </button>

        <button
          onClick={() => setActiveCategory('SafeTransaction')}
          className={`p-4 rounded-xl border transition-all text-right flex flex-col justify-between ${
            activeCategory === 'SafeTransaction'
              ? 'bg-amber-50 border-amber-500 text-amber-700 shadow-sm'
              : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <span className="text-xs font-medium opacity-80 flex items-center gap-1.5">
            <Vault className="w-3.5 h-3.5 text-amber-600" />
            {lang === 'en' ? 'Safe / Cash' : lang === 'ar' ? 'الخزينة' : 'سندوق / نەقد'}
          </span>
          <span className="text-2xl font-bold mt-2">{counts.safe}</span>
        </button>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Search Box */}
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                lang === 'en'
                  ? 'Search deleted records by title, ID, notes...'
                  : lang === 'ar'
                  ? 'البحث بالنص، الكود، السبب، الملاحظات...'
                  : 'گەڕان لە سڕاوەکان بە ناونیشان، کۆد، تێبینی، ناوی ئه‌نجامده‌ر...'
              }
              className="w-full pr-10 pl-4 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none text-gray-900"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Currency Filter */}
          <div className="md:col-span-2">
            <select
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none text-gray-900 font-bold"
            >
              <option value="All">{lang === 'en' ? 'All Currencies' : lang === 'ar' ? 'جميع العملات' : 'هەموو دراوەکان'}</option>
              {currencies.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* From Date */}
          <div className="md:col-span-2 relative">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none text-gray-900"
            />
          </div>

          {/* To Date */}
          <div className="md:col-span-2 relative">
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none text-gray-900"
            />
          </div>

          {/* Reset Filters */}
          <div className="md:col-span-1 flex justify-end">
            <button
              onClick={handleResetFilters}
              title={lang === 'en' ? 'Reset Filters' : lang === 'ar' ? 'إعادة ضبط' : 'پاککردنەوەی فلتەر'}
              className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-colors border border-gray-200"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Table View */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {filteredRecords.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-gray-50 flex items-center justify-center text-gray-400 border border-gray-100">
              <FileText className="w-8 h-8" />
            </div>
            <h3 className="text-sm font-bold text-gray-800">
              {lang === 'en' ? 'No deleted records found' : lang === 'ar' ? 'لم يتم العثور على سجلات محذوفة' : 'هیچ تۆمارێکی سڕاوە نەدۆزرایەوە'}
            </h3>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              {lang === 'en'
                ? 'Try adjusting your search keywords, category tab, or date filter.'
                : lang === 'ar'
                ? 'جرب تغيير كود البحث أو اختيار فئة أخرى أو إعادة ضبط الفلتر.'
                : 'دڵنیابەوە لە گەڕانەکەت یان بەشی تر هەڵبژێرە بۆ بینینی سڕاوەکان.'}
            </p>
            {(searchQuery || selectedCurrency !== 'All' || fromDate || toDate || activeCategory !== 'All') && (
              <button
                onClick={handleResetFilters}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-primary bg-primary-light rounded-xl hover:bg-primary/20 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {lang === 'en' ? 'Clear All Filters' : lang === 'ar' ? 'إلغاء جميع الفلاتر' : 'پاککردنەوەی هەموو فلتەرەکان'}
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-100">
                <tr>
                  <th className="p-4">{lang === 'en' ? 'ID' : lang === 'ar' ? 'الكود' : 'کۆدی سڕاوە'}</th>
                  <th className="p-4">{lang === 'en' ? 'Category' : lang === 'ar' ? 'الفئة' : 'جۆری بەش'}</th>
                  <th className="p-4">{lang === 'en' ? 'Title / Description' : lang === 'ar' ? 'العنوان / الوصف' : 'ناونیشان / وەسفی تۆمار'}</th>
                  <th className="p-4">{lang === 'en' ? 'Amount / Value' : lang === 'ar' ? 'المبلغ / القيمة' : 'بڕی پارە / دراو'}</th>
                  <th className="p-4">{lang === 'en' ? 'Deleted By' : lang === 'ar' ? 'حُذف بواسطة' : 'سڕراوەتەوە لەلایەن'}</th>
                  <th className="p-4">{lang === 'en' ? 'Deleted Date' : lang === 'ar' ? 'تاريخ الحذف' : 'بەرواری سڕینەوە'}</th>
                  <th className="p-4 text-center">{lang === 'en' ? 'Action' : lang === 'ar' ? 'الإجراء' : 'کردار'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {filteredRecords.map((record) => {
                  const deletedDateFormatted = new Date(record.deletedAt).toLocaleString(
                    lang === 'en' ? 'en-US' : 'ku-IQ',
                    { dateStyle: 'medium', timeStyle: 'short' }
                  );

                  return (
                    <tr 
                      key={record.id}
                      className="hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="p-4 font-mono text-xs font-semibold text-gray-500">
                        {record.id}
                      </td>
                      <td className="p-4">
                        {getCategoryBadge(record.category)}
                      </td>
                      <td className="p-4 font-medium">
                        <div>
                          <p className="text-gray-900 font-bold">{record.title}</p>
                          {record.notes && (
                            <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">
                              {record.notes}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="p-4 font-bold text-gray-900">
                        {record.amount ? (
                          <span>
                            {record.amount.toLocaleString()}{' '}
                            <span className="text-xs font-normal text-gray-500">{record.currency || ''}</span>
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 font-normal">-</span>
                        )}
                      </td>
                      <td className="p-4 text-xs font-medium text-gray-700">
                        {record.deletedBy}
                      </td>
                      <td className="p-4 text-xs text-gray-500 dir-ltr text-right">
                        {deletedDateFormatted}
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => setSelectedRecord(record)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-primary bg-primary-light hover:bg-primary/20 rounded-xl transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          {lang === 'en' ? 'Details' : lang === 'ar' ? 'التفاصيل' : 'وردەکاری'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal / Detailed Record Drawer */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-gray-100 space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-red-50 text-red-600 rounded-xl border border-red-100">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {lang === 'en' ? 'Deleted Record Details' : lang === 'ar' ? 'تفاصيل السجل المحذوف' : 'وردەکارییەکانی تۆماری سڕاوە'}
                  </h3>
                  <p className="text-xs font-mono text-gray-400 mt-0.5">
                    {selectedRecord.id} ({selectedRecord.originalId})
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedRecord(null)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* General Overview */}
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">{lang === 'en' ? 'Category' : lang === 'ar' ? 'الفئة' : 'جۆری بەش'}</span>
                <div>{getCategoryBadge(selectedRecord.category)}</div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">{lang === 'en' ? 'Title' : lang === 'ar' ? 'العنوان' : 'ناونیشان'}</span>
                <span className="text-sm font-bold text-gray-900">{selectedRecord.title}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">{lang === 'en' ? 'Deleted By' : lang === 'ar' ? 'حُذف بواسطة' : 'سڕراوەتەوە لەلایەن'}</span>
                <span className="text-xs font-semibold text-gray-700">{selectedRecord.deletedBy}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">{lang === 'en' ? 'Deleted Date' : lang === 'ar' ? 'تاريخ الحذف' : 'بەروار و کاتی سڕینەوە'}</span>
                <span className="text-xs font-mono text-gray-700">
                  {new Date(selectedRecord.deletedAt).toLocaleString()}
                </span>
              </div>

              {selectedRecord.notes && (
                <div className="pt-2 border-t border-gray-200/60">
                  <span className="text-xs text-gray-500 block mb-1">
                    {lang === 'en' ? 'Deletion Reason / Notes' : lang === 'ar' ? 'سبب الحذف / الملاحظات' : 'تێبینی / هۆکاری سڕینەوە'}
                  </span>
                  <p className="text-xs text-gray-700 bg-white p-2.5 rounded-xl border border-gray-200">
                    {selectedRecord.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Key-Value Breakdown */}
            {selectedRecord.details && Object.keys(selectedRecord.details).length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  {lang === 'en' ? 'Complete Technical Breakdown' : lang === 'ar' ? 'التفاصيل الكاملة للعملية' : 'تەواوی وردەکارییەکانی مامەڵەی سەرەکی'}
                </h4>
                <div className="divide-y divide-gray-100 border border-gray-100 rounded-2xl overflow-hidden text-xs">
                  {Object.entries(selectedRecord.details).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between p-3.5 bg-white hover:bg-gray-50/50">
                      <span className="font-medium text-gray-500">{key}</span>
                      <span className="font-bold text-gray-900">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-100 text-xs">
              <span className="text-gray-400 italic">
                {lang === 'en' ? 'Read-only archive log' : lang === 'ar' ? 'سجل أرشيف غير قابل للتعديل' : 'تۆماری ئەرشیفکراو (تەنها خوێندنەوە)'}
              </span>
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-5 py-2.5 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors"
              >
                {lang === 'en' ? 'Close' : lang === 'ar' ? 'إغلاق' : 'داخستن'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
