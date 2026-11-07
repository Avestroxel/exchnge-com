import { useState, FormEvent, useEffect } from 'react';
import { Settings, ShieldAlert, Users, Plus, Trash2, Key, Coins, Globe, MapPin, Edit, X, Upload, Camera, User, Eye, Info, Sun, Moon } from 'lucide-react';
import { AppUser, SystemSettings, Currency } from '../types';
import { AppState } from '../data/stateManager';
import { translations } from '../data/translations';
import ConfirmModal from './ConfirmModal';
import ImageCropperModal from './ImageCropperModal';
import ImageViewerModal from './ImageViewerModal';
import EmployeeInfoModal from './EmployeeInfoModal';
import GlassCard from './GlassCard';

interface SettingsViewProps {
  appState: AppState;
  onSaveSettings: (settings: SystemSettings) => void;
  onAddEmployee: (user: Omit<AppUser, 'id'>) => void;
  onEditEmployee?: (id: string, fields: Partial<AppUser>) => void;
  onDeleteEmployee: (id: string) => void;
  onAddCurrency: (code: string) => void;
  onDeleteCurrency?: (code: string) => void;
  onResetAllData: () => void;
  targetSection?: 'all' | 'general' | 'currencies' | 'employees' | 'data';
  onSelectSection?: (section: 'all' | 'general' | 'currencies' | 'employees' | 'data') => void;
}

export default function SettingsView({
  appState,
  onSaveSettings,
  onAddEmployee,
  onEditEmployee,
  onDeleteEmployee,
  onAddCurrency,
  onDeleteCurrency,
  onResetAllData,
  targetSection = 'all',
  onSelectSection
}: SettingsViewProps) {
  const { settings, users, currencies } = appState;
  const lang = settings.language || 'ku';
  const t = translations[lang];

  useEffect(() => {
    if (targetSection && targetSection !== 'all') {
      const timer = setTimeout(() => {
        const el = document.getElementById(`settings-section-${targetSection}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
      return () => clearTimeout(timer);
    } else if (targetSection === 'all') {
      const timer = setTimeout(() => {
        const mainEl = document.querySelector('main');
        if (mainEl) mainEl.scrollTo({ top: 0, behavior: 'smooth' });
        else window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [targetSection]);

  const sessionRole = appState.currentSessionRole;
  const isOwner = sessionRole === 'Owner';
  const isManager = appState.currentUser && (appState.currentUser as AppUser).role === 'Manager';
  const canManageEmployees = isOwner || isManager;

  const showAll = !targetSection || targetSection === 'all';
  const showGeneral = showAll || targetSection === 'general';
  const showCurrencies = isOwner && (showAll || targetSection === 'currencies');
  const showEmployees = canManageEmployees && (showAll || targetSection === 'employees');
  const showData = isOwner && (showAll || targetSection === 'data');

  const formatLastActive = (lastActiveAt?: string, currentLang: string = 'ku') => {
    if (!lastActiveAt) {
      if (currentLang === 'en') return 'Never logged in';
      if (currentLang === 'ar') return 'لم يسجل الدخول أبداً';
      return 'هێشتا نەهاتووەتە ژوورەوە';
    }

    const d = new Date(lastActiveAt);
    if (isNaN(d.getTime())) {
      if (currentLang === 'en') return 'Never logged in';
      if (currentLang === 'ar') return 'لم يسجل الدخول أبداً';
      return 'هێشتا نەهاتووەتە ژوورەوە';
    }

    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (isToday) {
      const todayText = currentLang === 'en' ? 'Today' : currentLang === 'ar' ? 'اليوم' : 'ئەمڕۆ';
      return `${todayText} ${timeStr}`;
    }

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateStr = `${year}/${month}/${day}`;
    return `${dateStr} • ${timeStr}`;
  };
  const [officeName, setOfficeName] = useState(settings.officeName);
  const [officeLogo, setOfficeLogo] = useState<string | undefined>(settings.officeLogo);
  const [themeColor, setThemeColor] = useState(settings.themeColor);
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'midnight' | 'sepia' | 'navy' | 'sky_light' | 'soft_cream'>(settings.themeMode || 'light');
  const [defaultCurrency, setDefaultCurrency] = useState<Currency>(settings.defaultCurrency);
  const [fontSize, setFontSize] = useState(settings.fontSize);
  const [language, setLanguage] = useState<'ku' | 'en' | 'ar'>(lang);

  // New employee state
  const [empName, setEmpName] = useState('');
  const [empEmail, setEmpEmail] = useState('');
  const [empPassword, setEmpPassword] = useState('');
  const [empRole, setEmpRole] = useState<'Manager' | 'Admin' | 'Teller'>('Teller');
  const [empAvatar, setEmpAvatar] = useState<string | undefined>(undefined);
  const [empSalary, setEmpSalary] = useState<string>('');
  const [empSalaryCurrency, setEmpSalaryCurrency] = useState<string>('USD');

  // Edit employee state
  const [employeeToEdit, setEmployeeToEdit] = useState<AppUser | null>(null);
  const [editEmpName, setEditEmpName] = useState('');
  const [editEmpEmail, setEditEmpEmail] = useState('');
  const [editEmpPassword, setEditEmpPassword] = useState('');
  const [editEmpRole, setEditEmpRole] = useState<'Manager' | 'Admin' | 'Teller'>('Teller');
  const [editEmpAvatar, setEditEmpAvatar] = useState<string | undefined>(undefined);
  const [editEmpSalary, setEditEmpSalary] = useState<string>('');
  const [editEmpSalaryCurrency, setEditEmpSalaryCurrency] = useState<string>('USD');

  // Employee Information Details Modal state
  const [selectedEmployeeForInfo, setSelectedEmployeeForInfo] = useState<AppUser | null>(null);

  // Image Cropper Modal state
  const [cropperModalOpen, setCropperModalOpen] = useState<boolean>(false);
  const [cropperImageSrc, setCropperImageSrc] = useState<string>('');
  const [cropperShape, setCropperShape] = useState<'square' | 'circle'>('square');
  const [cropperTarget, setCropperTarget] = useState<'officeLogo' | 'empAvatar' | 'editEmpAvatar' | 'directUserAvatar' | 'ownerAvatar'>('officeLogo');
  const [cropperTitle, setCropperTitle] = useState<string>('');
  const [directAvatarUserId, setDirectAvatarUserId] = useState<string | null>(null);

  // Full Image Lightbox Viewer Modal state
  const [viewingImage, setViewingImage] = useState<{ src: string; title: string } | null>(null);

  const handleImageFileSelect = (
    file: File,
    target: 'officeLogo' | 'empAvatar' | 'editEmpAvatar' | 'directUserAvatar' | 'ownerAvatar',
    shape: 'square' | 'circle',
    title: string
  ) => {
    if (file.size > 8 * 1024 * 1024) {
      alert(lang === 'en' ? 'Image size must be less than 8MB' : lang === 'ar' ? 'حجم الصورة يجب أن يكون أقل من 8 ميغابايت' : 'قەبارەی وێنەکە دەبێت کەمتر بێت لە ٨ مێگابایت');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setCropperImageSrc(reader.result as string);
      setCropperTarget(target);
      setCropperShape(shape);
      setCropperTitle(title);
      setCropperModalOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropperComplete = (croppedDataUrl: string) => {
    if (cropperTarget === 'officeLogo') {
      setOfficeLogo(croppedDataUrl);
      onSaveSettings({
        officeName,
        officeLogo: croppedDataUrl,
        themeColor,
        themeMode,
        defaultCurrency,
        fontSize,
        language,
        locations
      });
      setMessage(lang === 'en' ? 'Office logo updated successfully!' : lang === 'ar' ? 'تم تحديث شعار المكتب بنجاح!' : 'لۆگۆی نووسینگە بە سەرکەوتوویی نوێکرایەوە و پاشەکەوت کرا.');
      setTimeout(() => setMessage(''), 3000);
    } else if (cropperTarget === 'empAvatar') {
      setEmpAvatar(croppedDataUrl);
    } else if (cropperTarget === 'editEmpAvatar') {
      setEditEmpAvatar(croppedDataUrl);
    } else if (cropperTarget === 'directUserAvatar' && directAvatarUserId) {
      if (onEditEmployee) {
        onEditEmployee(directAvatarUserId, { avatar: croppedDataUrl });
      }
      setDirectAvatarUserId(null);
      setMessage(lang === 'en' ? 'Profile picture updated successfully!' : lang === 'ar' ? 'تم تحديث الصورة الشخصية بنجاح!' : 'وێنەی کەسی بە سەرکەوتوویی نوێکرایەوە.');
      setTimeout(() => setMessage(''), 3000);
    } else if (cropperTarget === 'ownerAvatar') {
      const ownerUser = users.find(u => u.role === 'Owner') || (appState.currentUser && 'role' in appState.currentUser && appState.currentUser.role === 'Owner' ? appState.currentUser : null);
      if (ownerUser && onEditEmployee) {
        onEditEmployee(ownerUser.id, { avatar: croppedDataUrl });
      }
      setMessage(lang === 'en' ? 'Owner profile picture updated successfully!' : lang === 'ar' ? 'تم تحديث صورة المالك بنجاح!' : 'وێنەی خاوەنکار بە سەرکەوتوویی نوێکرایەوە.');
      setTimeout(() => setMessage(''), 3000);
    }
    setCropperModalOpen(false);
  };

  // New currency state
  const [currencyCode, setCurrencyCode] = useState('');
  const [employeeToDelete, setEmployeeToDelete] = useState<AppUser | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [doubleConfirmOpen, setDoubleConfirmOpen] = useState(false);

  const [message, setMessage] = useState('');

  const [locations, setLocations] = useState<string[]>(settings.locations || []);
  const [newLocation, setNewLocation] = useState('');

  // Synchronize state with props when settings change (e.g. user logs in/out or settings are modified)
  useEffect(() => {
    setOfficeName(settings.officeName);
    setOfficeLogo(settings.officeLogo);
    setThemeColor(settings.themeColor);
    setThemeMode(settings.themeMode || 'light');
    setDefaultCurrency(settings.defaultCurrency);
    setFontSize(settings.fontSize);
    setLanguage(lang);
    setLocations(settings.locations || []);
  }, [settings.officeName, settings.officeLogo, settings.themeColor, settings.themeMode, settings.defaultCurrency, settings.fontSize, lang, settings.locations]);

  const handleSaveGeneral = (e: FormEvent) => {
    e.preventDefault();
    onSaveSettings({
      officeName,
      officeLogo,
      themeColor,
      themeMode,
      defaultCurrency,
      fontSize,
      language,
      locations
    });
    setMessage(lang === 'en' ? 'Settings updated successfully!' : lang === 'ar' ? 'تم حفظ الإعدادات بنجاح!' : 'ڕێکخستنەکان بە سەرکەوتوویی پاشەکەوت کران.');
    setTimeout(() => setMessage(''), 3000);
  };

  const handleSelectThemeMode = (mode: 'sky_light' | 'midnight') => {
    setThemeMode(mode);
    onSaveSettings({
      officeName,
      officeLogo,
      themeColor,
      themeMode: mode,
      defaultCurrency,
      fontSize,
      language,
      locations
    });
  };

  const handleAddLocationSubmit = (e: FormEvent) => {
    e.preventDefault();
    const cleanLoc = newLocation.trim();
    if (!cleanLoc) return;

    if (locations.includes(cleanLoc)) {
      alert(lang === 'en' ? 'Location already exists!' : lang === 'ar' ? 'الموقع موجود بالفعل!' : 'ئەم شوێنە پێشتر زیادکراوە!');
      return;
    }

    const updatedLocations = [...locations, cleanLoc];
    setLocations(updatedLocations);
    setNewLocation('');

    onSaveSettings({
      officeName,
      officeLogo,
      themeColor,
      themeMode,
      defaultCurrency,
      fontSize,
      language,
      locations: updatedLocations
    });

    setMessage(lang === 'en' ? 'Location added successfully!' : lang === 'ar' ? 'تم إضافة الموقع بنجاح!' : 'شوێنەکە بە سەرکەوتوویی زیادکرا.');
    setTimeout(() => setMessage(''), 3000);
  };

  const handleDeleteLocation = (locToDelete: string) => {
    const updatedLocations = locations.filter(loc => loc !== locToDelete);
    setLocations(updatedLocations);

    onSaveSettings({
      officeName,
      officeLogo,
      themeColor,
      themeMode,
      defaultCurrency,
      fontSize,
      language,
      locations: updatedLocations
    });

    setMessage(lang === 'en' ? 'Location deleted successfully!' : lang === 'ar' ? 'تم حذف الموقع بنجاح!' : 'شوێنەکە بە سەرکەوتوویی سڕایەوە.');
    setTimeout(() => setMessage(''), 3000);
  };

  const handleAddEmployeeSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!empName.trim() || !empEmail.trim() || !empPassword.trim()) return;

    onAddEmployee({
      name: empName,
      email: empEmail,
      password: empPassword,
      role: empRole,
      avatar: empAvatar,
      salary: empSalary ? parseFloat(empSalary) : undefined,
      salaryCurrency: empSalary ? empSalaryCurrency : undefined,
      createdAt: new Date().toISOString()
    });

    // reset employee inputs
    setEmpName('');
    setEmpEmail('');
    setEmpPassword('');
    setEmpRole('Teller');
    setEmpAvatar(undefined);
    setEmpSalary('');
    setEmpSalaryCurrency('USD');
    setMessage(lang === 'en' ? 'New employee registered successfully!' : lang === 'ar' ? 'تم تسجيل الموظف الجديد بنجاح!' : 'کارمەندی نوێ زیادکرا بە سەرکەوتوویی.');
    setTimeout(() => setMessage(''), 3000);
  };

  const startEditingEmployee = (u: AppUser) => {
    setEmployeeToEdit(u);
    setEditEmpName(u.name);
    setEditEmpEmail(u.email);
    setEditEmpPassword(u.password || '');
    setEditEmpRole(u.role);
    setEditEmpAvatar(u.avatar);
    setEditEmpSalary(u.salary !== undefined && u.salary !== null ? String(u.salary) : '');
    setEditEmpSalaryCurrency(u.salaryCurrency || 'USD');
  };

  const handleEditEmployeeSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!employeeToEdit) return;
    if (onEditEmployee) {
      onEditEmployee(employeeToEdit.id, {
        name: editEmpName,
        email: editEmpEmail,
        password: editEmpPassword,
        role: editEmpRole,
        avatar: editEmpAvatar,
        salary: editEmpSalary ? parseFloat(editEmpSalary) : undefined,
        salaryCurrency: editEmpSalary ? editEmpSalaryCurrency : undefined
      });
    }
    setEmployeeToEdit(null);
    setEditEmpAvatar(undefined);
    setMessage(lang === 'en' ? 'Employee account updated successfully!' : lang === 'ar' ? 'تم تحديث حساب الموظف بنجاح!' : 'هەژماری کارمەندەکە بە سەرکەوتوویی نوێکرایەوە.');
    setTimeout(() => setMessage(''), 3000);
  };

  const handleAddCurrencySubmit = (e: FormEvent) => {
    e.preventDefault();
    const cleanCode = currencyCode.trim().toUpperCase();
    if (!cleanCode) return;

    if (currencies.includes(cleanCode)) {
      alert(lang === 'en' ? 'Currency already exists!' : lang === 'ar' ? 'العملة موجودة بالفعل!' : 'ئەم دراوە پێشتر زیادکراوە!');
      return;
    }

    onAddCurrency(cleanCode);
    setCurrencyCode('');
    setMessage(t.news_currency_success);
    setTimeout(() => setMessage(''), 3000);
  };

  return (
    <div className={`space-y-6 animate-fade-in ${lang === 'en' ? 'text-left' : 'text-right'}`}>
      {/* Top Header Card */}
      <GlassCard className="p-0" contentClassName="p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3 view-header" data-animate="header">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white rtl:border-r-4 rtl:pr-3 ltr:border-l-4 ltr:pl-3 border-[#1D7AFC] flex items-center gap-2.5">
              <Settings className="w-6 h-6 text-[#1D7AFC]" />
              <span>
                {!showAll ? (
                  targetSection === 'general' ? (lang === 'en' ? 'General Settings' : lang === 'ar' ? 'الإعدادات العامة' : 'ڕێکخستنی گشتی') :
                  targetSection === 'currencies' ? (lang === 'en' ? 'Currencies & Locations' : lang === 'ar' ? 'العملات والمواقع' : 'دراو و شوێن') :
                  targetSection === 'employees' ? (lang === 'en' ? 'Staff' : lang === 'ar' ? 'الموظفين' : 'کارمەند') :
                  (lang === 'en' ? 'Data & Information' : lang === 'ar' ? 'البيانات والمعلومات' : 'داتا و زانیاری')
                ) : t.settings_title}
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">{t.settings_desc}</p>
          </div>
        </div>
      </GlassCard>

      {message && (
        <div className="p-3.5 bg-green-50 text-green-800 border border-green-100 rounded-xl text-xs font-semibold">
          {message}
        </div>
      )}

      {/* 1. General Settings Section - Wide Layout */}
      {showGeneral && (
        <div id="settings-section-general" data-animate="card" className="bento-card transform-gpu bg-white p-6 rounded-2xl border border-gray-100 shadow-sm rtl:border-r-4 rtl:border-r-primary ltr:border-l-4 ltr:border-l-primary hover:shadow-md transition-all duration-300">
          <h3 className="text-sm font-bold text-gray-900 border-b border-gray-50 pb-3 mb-5 flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            {sessionRole === 'Customer'
              ? (lang === 'en' ? 'Display Preferences & Language Settings' : lang === 'ar' ? 'تفضيلات العرض وإعدادات اللغة' : 'ڕێکخستنەکانی ڕووکار و زمان')
              : (lang === 'en' ? 'General Settings & Office Branding' : lang === 'ar' ? 'الإعدادات العامة وهيكل المكتب' : 'ڕێکخستنە گشتییەکان و ناسنامەی نووسینگە')}
          </h3>
          
          <form onSubmit={handleSaveGeneral} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sessionRole !== 'Customer' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">{t.office_name}</label>
                  <input
                    type="text"
                    required
                    value={officeName}
                    onChange={(e) => setOfficeName(e.target.value)}
                    disabled={!isOwner}
                    className="w-full bg-white/[0.05] border border-white/[0.12] rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-400 focus:border-[#1D7AFC] focus:bg-white/[0.08] focus:outline-none transition-all disabled:opacity-50 disabled:bg-white/[0.02] font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    {lang === 'en' ? 'Office Logo' : lang === 'ar' ? 'شعار المكتب (اللوغو)' : 'لۆگۆی نووسینگە (وێنەی بەشی چوونە ژوورەوە)'}
                  </label>
                  <div className="flex flex-wrap items-center gap-3">
                    {officeLogo ? (
                      <div className="relative group shrink-0">
                        {/* Direct Click to View Full Image Modal */}
                        <button
                          type="button"
                          onClick={() => setViewingImage({
                            src: officeLogo,
                            title: lang === 'en' ? 'Office Logo' : lang === 'ar' ? 'شعار المكتب' : 'لۆگۆی نووسینگە'
                          })}
                          className="w-14 h-14 rounded-2xl border-2 border-primary/25 hover:border-primary overflow-hidden shrink-0 shadow-2xs bg-white p-1 flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95 group/btn relative"
                          title={lang === 'en' ? 'Click to view full image' : lang === 'ar' ? 'انقر لعرض الصورة بالحجم الكامل' : 'کلیک بکە بۆ سەیرکردنی تەواوی وێنەکە'}
                        >
                          <img src={officeLogo} alt="Logo Preview" className="w-full h-full object-contain" />
                          <div className="absolute inset-0 bg-primary/25 backdrop-blur-[1px] opacity-0 group-hover/btn:opacity-100 transition-opacity flex flex-col items-center justify-center text-primary-dark">
                            <Eye className="w-5 h-5 text-primary drop-shadow-sm" />
                            <span className="text-[8px] font-black text-gray-900 bg-white/95 px-1 py-0.2 rounded-sm mt-0.5 shadow-2xs">
                              {lang === 'en' ? 'View' : 'سەیرکردن'}
                            </span>
                          </div>
                        </button>

                        {/* Separate Remove Logo Button in corner */}
                        {isOwner && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOfficeLogo(undefined);
                            }}
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-xs cursor-pointer transition-all hover:scale-110 z-10"
                            title={lang === 'en' ? 'Remove Logo' : lang === 'ar' ? 'إزالة اللوغو' : 'سڕینەوەی لۆگۆ'}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="w-14 h-14 rounded-2xl bg-white/[0.05] border border-dashed border-white/20 flex items-center justify-center text-slate-400 shrink-0">
                        <Upload className="w-5 h-5 text-slate-400" />
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2">
                      {/* View Button if logo exists */}
                      {officeLogo && (
                        <button
                          type="button"
                          onClick={() => setViewingImage({
                            src: officeLogo,
                            title: lang === 'en' ? 'Office Logo' : lang === 'ar' ? 'شعار المكتب' : 'لۆگۆی نووسینگە'
                          })}
                          className="bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.15] text-slate-100 rounded-xl px-4 py-2 text-sm font-medium backdrop-blur-md transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                          title={lang === 'en' ? 'View Full Image' : 'سەیرکردنی وێنە'}
                        >
                          <Eye className="w-3.5 h-3.5 text-primary" />
                          <span>{lang === 'en' ? 'View' : lang === 'ar' ? 'معاينة' : 'سەیرکردن'}</span>
                        </button>
                      )}

                      {isOwner ? (
                        <label className="cursor-pointer bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.15] text-slate-100 rounded-xl px-4 py-2 text-sm font-medium backdrop-blur-md transition-all flex items-center gap-1.5 shadow-sm">
                          <Upload className="w-3.5 h-3.5 text-primary" />
                          <span>
                            {officeLogo 
                              ? (lang === 'en' ? 'Change Logo (Crop)' : lang === 'ar' ? 'تغيير اللوغو (قص)' : 'گۆڕین و قرتاندنی لۆگۆ') 
                              : (lang === 'en' ? 'Upload Logo' : lang === 'ar' ? 'رفع اللوغو' : 'داگرتنی وێنەی لۆگۆ')}
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleImageFileSelect(
                                  file,
                                  'officeLogo',
                                  'square',
                                  lang === 'en' ? 'Crop Office Logo (Square)' : lang === 'ar' ? 'قص شعار المكتب (مربع)' : 'دەستکاریکردن و قرتاندنی لۆگۆی نووسینگە'
                                );
                                e.target.value = '';
                              }
                            }}
                          />
                        </label>
                      ) : (
                        <span className="text-[11px] text-gray-400 font-medium">
                          {lang === 'en' ? 'Only owner can change logo' : lang === 'ar' ? 'فقط المالك يمكنه تغيير اللوغو' : 'تەنها خاوەنکار دەتوانێت دەستکاری لۆگۆ بکات'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">{t.language_label}</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as any)}
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none"
              >
                <option value="ku">کوردی (Kurdish)</option>
                <option value="en">English (English)</option>
                <option value="ar">العربية (Arabic)</option>
              </select>
            </div>

            {sessionRole !== 'Customer' && (
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">{t.default_currency}</label>
                <select
                  value={defaultCurrency}
                  onChange={(e) => setDefaultCurrency(e.target.value as Currency)}
                  disabled={!isOwner}
                  className="w-full bg-slate-950/50 border border-white/[0.12] rounded-xl px-3.5 py-2 text-xs text-white focus:border-[#1D7AFC] focus:outline-none transition-all disabled:opacity-50 font-bold"
                >
                  {currencies.map((cur) => (
                    <option key={cur} value={cur} className="bg-[#0B0F19] text-white">
                      {cur === 'USD' ? 'USD ($)' : cur === 'IQD' ? 'IQD (د.ع)' : cur === 'IRR' ? 'IRR (﷼)' : `${cur} (${cur})`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 font-semibold text-primary">{t.theme_color}</label>
              <select
                value={themeColor}
                onChange={(e) => setThemeColor(e.target.value as any)}
                className="w-full bg-slate-950/50 border border-white/[0.12] rounded-xl px-3.5 py-2 text-xs text-white focus:border-[#1D7AFC] focus:outline-none font-bold"
              >
                <option value="blue">{lang === 'en' ? 'Blue' : lang === 'ar' ? 'أزرق' : 'شین (Blue)'}</option>
                <option value="indigo">{lang === 'en' ? 'Indigo' : lang === 'ar' ? 'نيلي' : 'نیلی (Indigo)'}</option>
                <option value="slate">{lang === 'en' ? 'Slate' : lang === 'ar' ? 'رمادي' : 'ڕەساسی (Slate)'}</option>
                <option value="emerald" className="bg-[#0B0F19] text-white">{lang === 'en' ? 'Emerald' : lang === 'ar' ? 'زمردي' : 'سەوز (Emerald)'}</option>
                <option value="teal" className="bg-[#0B0F19] text-white">{lang === 'en' ? 'Teal' : lang === 'ar' ? 'تيل / تركوازي' : 'کەسکی فیرۆزی (Teal)'}</option>
                <option value="purple" className="bg-[#0B0F19] text-white">{lang === 'en' ? 'Purple' : lang === 'ar' ? 'أرجواني' : 'مۆر (Purple)'}</option>
                <option value="amber" className="bg-[#0B0F19] text-white">{lang === 'en' ? 'Amber' : lang === 'ar' ? 'عنبري / ذهبي' : 'زێڕین (Amber)'}</option>
                <option value="rose" className="bg-[#0B0F19] text-white">{lang === 'en' ? 'Rose' : lang === 'ar' ? 'وردي / أحمر' : 'سوور / گوڵی (Rose)'}</option>
                <option value="violet" className="bg-[#0B0F19] text-white">{lang === 'en' ? 'Violet' : lang === 'ar' ? 'بنفسجي' : 'وەنەوشەیی (Violet)'}</option>
                <option value="cyan" className="bg-[#0B0F19] text-white">{lang === 'en' ? 'Cyan' : lang === 'ar' ? 'سمائي' : 'شینی ئاسمانی (Cyan)'}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5 font-semibold text-primary">{t.theme_mode}</label>
              <div className="bg-slate-950/60 border border-white/[0.12] p-1 rounded-xl inline-flex items-center gap-1">
                {/* Sun icon: Sky Blue (Ultra-smooth & Compact) */}
                <button
                  type="button"
                  onClick={() => handleSelectThemeMode('sky_light')}
                  title={lang === 'en' ? 'Sky Blue Mode' : lang === 'ar' ? 'الوضع السماوي الفاتح' : 'دۆخی شینی ئاسمانی'}
                  className={`w-9 h-8 flex items-center justify-center rounded-lg transition-all duration-300 ease-in-out cursor-pointer ${
                    themeMode === 'sky_light' || themeMode === 'light'
                      ? 'bg-sky-500 text-white shadow-sm shadow-sky-500/40 ring-1 ring-sky-400/50 scale-105'
                      : 'text-slate-400 hover:text-sky-400 hover:bg-white/[0.08]'
                  }`}
                >
                  <Sun className={`w-4 h-4 transition-all duration-300 ease-in-out ${themeMode === 'sky_light' || themeMode === 'light' ? 'text-white rotate-45 scale-110' : 'text-amber-400/90 hover:rotate-45'}`} />
                </button>

                {/* Moon icon: Midnight Black (Ultra-smooth & Compact) */}
                <button
                  type="button"
                  onClick={() => handleSelectThemeMode('midnight')}
                  title={lang === 'en' ? 'Midnight Black Mode' : lang === 'ar' ? 'وضع سواد منتصف الليل' : 'دۆخی ڕەشی نێوەشەو'}
                  className={`w-9 h-8 flex items-center justify-center rounded-lg transition-all duration-300 ease-in-out cursor-pointer ${
                    themeMode === 'midnight' || themeMode === 'dark'
                      ? 'bg-[#1D7AFC] text-white shadow-sm shadow-[#1D7AFC]/40 ring-1 ring-[#1D7AFC]/50 scale-105'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.08]'
                  }`}
                >
                  <Moon className={`w-4 h-4 transition-all duration-300 ease-in-out ${themeMode === 'midnight' || themeMode === 'dark' ? 'text-cyan-200 -rotate-12 scale-110' : 'text-slate-400 hover:-rotate-12'}`} />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 font-semibold text-primary">
                {lang === 'en' ? 'Font Size' : lang === 'ar' ? 'حجم الخط' : 'قەبارەی نووسین'}
              </label>
              <select
                value={fontSize}
                onChange={(e) => setFontSize(e.target.value as any)}
                className="w-full bg-slate-950/50 border border-white/[0.12] rounded-xl px-3.5 py-2 text-xs text-white focus:border-[#1D7AFC] focus:outline-none font-bold"
              >
                <option value="sm" className="bg-[#0B0F19] text-white">{lang === 'en' ? 'Small' : lang === 'ar' ? 'صغير' : 'بچووک (Sm)'}</option>
                <option value="md" className="bg-[#0B0F19] text-white">{lang === 'en' ? 'Medium' : lang === 'ar' ? 'متوسط' : 'مامناوەند (Md)'}</option>
                <option value="lg" className="bg-[#0B0F19] text-white">{lang === 'en' ? 'Large' : lang === 'ar' ? 'كبير' : 'گەورە (Lg)'}</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-6 py-2.5 bg-primary text-white font-bold rounded-xl text-xs hover:bg-primary-dark transition-all duration-200 shadow-sm hover:shadow"
            >
              {t.save_changes}
            </button>
          </div>
        </form>
      </div>
      )}

      {showCurrencies && (
        <div id="settings-section-currencies" data-animate="card" className="bento-card transform-gpu bg-white p-6 rounded-2xl border border-gray-100 shadow-sm rtl:border-r-4 rtl:border-r-primary ltr:border-l-4 ltr:border-l-primary hover:shadow-md transition-all duration-300">
            <h3 className="text-sm font-bold text-gray-900 border-b border-gray-50 pb-3 mb-5 flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              {lang === 'en' ? 'System Currencies & Delivery Locations' : lang === 'ar' ? 'العملات المتاحة ومواقع التسليم' : 'دراوەکانی سیستەم و شوێنەکانی گەیاندن'}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 divide-y md:divide-y-0 md:divide-x md:divide-x-reverse divide-gray-100">
              
              {/* Right/First Sub-section: Currencies */}
              <div className="space-y-6 md:px-4">
                <div className="flex items-center gap-2 mb-2">
                  <Coins className="w-4.5 h-4.5 text-primary" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wide">
                    {t.news_currency_title}
                  </h4>
                </div>

                <form onSubmit={handleAddCurrencySubmit} className="space-y-3 bg-slate-950/45 backdrop-blur-xl border border-white/[0.1] rounded-2xl p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)]">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">{t.news_currency_code}</label>
                    <input
                      type="text"
                      required
                      maxLength={5}
                      placeholder="e.g. EUR, TRY, GBP"
                      value={currencyCode}
                      onChange={(e) => setCurrencyCode(e.target.value)}
                      className="w-full bg-white/[0.05] border border-white/[0.12] rounded-xl px-4 py-2.5 text-white placeholder-slate-400 focus:border-[#1D7AFC] focus:bg-white/[0.08] focus:outline-none transition-all font-mono text-xs"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-primary text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm hover:bg-primary-dark transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{t.news_currency_btn}</span>
                    </button>
                  </div>
                </form>

                <div className="pt-2">
                  <h4 className="text-xs font-bold text-slate-400 mb-2">{t.available_currencies}</h4>
                  <div className="flex flex-wrap gap-2">
                    {currencies.map((cur) => (
                      <div 
                        key={cur} 
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.06] border border-white/[0.1] rounded-xl text-xs font-bold text-slate-200 shadow-xs"
                      >
                        <span>{cur}</span>
                        {cur !== 'USD' && cur !== 'IQD' && isOwner && onDeleteCurrency && (
                          <button
                            type="button"
                            onClick={() => {
                              const confirmMsg = lang === 'en'
                                ? `Are you sure you want to delete ${cur} currency?`
                                : lang === 'ar'
                                  ? `هل أنت متأكد من حذف عملة ${cur}؟`
                                  : `ئایا دڵنیایت لە سڕینەوەی دراوی ${cur}؟`;
                              if (window.confirm(confirmMsg)) {
                                onDeleteCurrency(cur);
                              }
                            }}
                            className="text-slate-400 hover:text-red-400 p-0.5 rounded transition-colors cursor-pointer"
                            title={lang === 'en' ? 'Delete Currency' : lang === 'ar' ? 'حذف العملة' : 'سڕینەوەی دراو'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Left/Second Sub-section: Delivery Locations */}
              <div className="space-y-6 md:px-8 pt-6 md:pt-0">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-4.5 h-4.5 text-primary animate-bounce" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wide">
                    {lang === 'en' ? 'Delivery Locations' : lang === 'ar' ? 'مواقع التسليم' : 'شوێنەکانی گەیاندن'}
                  </h4>
                </div>

                {/* Add Location Form */}
                <form onSubmit={handleAddLocationSubmit} className="space-y-3 bg-slate-950/45 backdrop-blur-xl border border-white/[0.1] rounded-2xl p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)]">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      {lang === 'en' ? 'Location Name' : lang === 'ar' ? 'اسم الموقع' : 'ناوی شوێن'}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={lang === 'en' ? 'e.g. Sulaymaniyah' : lang === 'ar' ? 'مثال: السليمانية' : 'نموونە: سلێمانی'}
                      value={newLocation}
                      onChange={(e) => setNewLocation(e.target.value)}
                      className="w-full bg-white/[0.05] border border-white/[0.12] rounded-xl px-4 py-2.5 text-white placeholder-slate-400 focus:border-[#1D7AFC] focus:bg-white/[0.08] focus:outline-none transition-all text-xs"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-primary text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm hover:bg-primary-dark transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{lang === 'en' ? 'Add Location' : lang === 'ar' ? 'إضافة' : 'زیادکردن'}</span>
                    </button>
                  </div>
                </form>

                {/* List Locations */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 mb-1">
                    {lang === 'en' ? 'Configured Locations' : lang === 'ar' ? 'المواقع المحددة' : 'شوێنە پاشەکەوتکراوەکان'}
                  </h4>
                  {locations.length === 0 ? (
                    <p className="text-xs text-slate-400 font-semibold pr-1">
                      {lang === 'en' ? 'No locations configured.' : lang === 'ar' ? 'لم يتم تكوين أي مواقع بعد.' : 'هیچ شوێنێک هێشتا زیادنەکراوە.'}
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-white/[0.08] p-2.5 rounded-xl">
                      {locations.map((loc) => (
                        <div key={loc} className="flex justify-between items-center text-xs p-2 bg-white/[0.04] hover:bg-white/[0.08] rounded-xl border border-white/[0.08] transition-colors">
                          <span className="font-bold text-slate-200">{loc}</span>
                          <button
                            onClick={() => handleDeleteLocation(loc)}
                            className="p-1 text-slate-400 hover:text-red-400 rounded transition-colors"
                            type="button"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

            </div>
          </div>
      )}

      {showEmployees && (
        <div id="settings-section-employees" data-animate="card" className="bento-card transform-gpu bg-white p-6 rounded-2xl border border-gray-100 shadow-sm rtl:border-r-4 rtl:border-r-primary ltr:border-l-4 ltr:border-l-primary hover:shadow-md transition-all duration-300">
            <h3 className="text-sm font-bold text-gray-900 border-b border-gray-50 pb-3 mb-5 flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              {t.employee_management}
            </h3>

            {/* Owner Profile Banner Card */}
            {isOwner && (
              (() => {
                const ownerUser = users.find(u => u.role === 'Owner') || (appState.currentUser && 'role' in appState.currentUser && appState.currentUser.role === 'Owner' ? appState.currentUser : null);
                if (!ownerUser) return null;
                return (
                  <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xs">
                    <div className="flex items-center gap-4">
                      <div className="relative group/owner shrink-0">
                        {ownerUser.avatar ? (
                          <button
                            type="button"
                            onClick={() => setViewingImage({
                              src: ownerUser.avatar!,
                              title: `${ownerUser.name} - ${lang === 'en' ? 'Owner Profile' : 'وێنەی خاوەنکار'}`
                            })}
                            className="w-16 h-16 rounded-full overflow-hidden border-2 border-primary shadow-md block transition-transform hover:scale-105 active:scale-95 cursor-pointer relative"
                            title={lang === 'en' ? 'Click to view photo' : 'کلیک بکە بۆ سەیرکردنی وێنەکە'}
                          >
                            <img
                              src={ownerUser.avatar}
                              alt={ownerUser.name}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-primary/20 backdrop-blur-[1px] opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                              <Eye className="w-5 h-5 text-white drop-shadow-sm" />
                            </div>
                          </button>
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-primary text-white font-black text-xl flex items-center justify-center border-2 border-primary/30 shadow-md">
                            {ownerUser.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <label
                          className="absolute -bottom-1 -left-1 w-7 h-7 bg-primary hover:bg-primary-dark text-white rounded-full flex items-center justify-center shadow-md cursor-pointer transition-transform hover:scale-110 z-10 border-2 border-white"
                          title={lang === 'en' ? 'Change Photo (Circular Crop)' : 'گۆڕینی وێنەی خاوەن (بازنەیی)'}
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setDirectAvatarUserId(ownerUser.id);
                                handleImageFileSelect(
                                  file,
                                  'directUserAvatar',
                                  'circle',
                                  lang === 'en' ? 'Crop Owner Profile Picture (Circular)' : 'قرتاندنی وێنەی خاوەن (بازنەیی)'
                                );
                                e.target.value = '';
                              }
                            }}
                          />
                        </label>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-black text-gray-900">{ownerUser.name}</h4>
                          <span className="px-2 py-0.5 rounded-md bg-primary text-white text-[10px] font-black uppercase shadow-xs">
                            {lang === 'en' ? 'Owner' : 'خاوەنکار'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 font-mono mt-0.5">{ownerUser.email}</p>
                        <p className="text-[11px] text-primary/90 font-bold mt-1">
                          {lang === 'en' ? 'Upload and crop circular photo to display in the menu' : 'وێنەی بازنەیی دابنێ تاوەکو لە مێنیو دەربکەوێت'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <label className="cursor-pointer px-3.5 py-2 bg-primary text-white hover:bg-primary-dark rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95">
                        <Camera className="w-3.5 h-3.5" />
                        <span>{ownerUser.avatar ? (lang === 'en' ? 'Change Photo (Crop)' : 'گۆڕینی وێنەی خاوەن') : (lang === 'en' ? 'Upload Photo (Crop)' : 'دانانی وێنەی خاوەن (بازنەیی)')}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setDirectAvatarUserId(ownerUser.id);
                              handleImageFileSelect(
                                file,
                                'directUserAvatar',
                                'circle',
                                lang === 'en' ? 'Crop Owner Profile Picture (Circular)' : 'قرتاندنی وێنەی خاوەن (بازنەیی)'
                              );
                              e.target.value = '';
                            }
                          }}
                        />
                      </label>
                      {ownerUser.avatar && (
                        <button
                          type="button"
                          onClick={() => {
                            if (onEditEmployee) {
                              onEditEmployee(ownerUser.id, { avatar: undefined });
                            }
                            setMessage(lang === 'en' ? 'Owner photo removed' : 'وێنەی خاوەنکار سڕایەوە');
                            setTimeout(() => setMessage(''), 3000);
                          }}
                          className="px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl border border-red-200 transition-colors"
                        >
                          {lang === 'en' ? 'Remove' : 'سڕینەوە'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Employee List Section: Span 7 on large devices, or 12 if only viewing */}
              <div className={`${isOwner ? 'lg:col-span-7' : 'lg:col-span-12'} space-y-4`}>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  {lang === 'en' ? 'Active System Accounts' : lang === 'ar' ? 'حسابات النظام النشطة' : 'هەژمارە چالاکەکانی سیستەم'}
                </h4>
                
                <div className="border border-white/[0.08] rounded-xl overflow-hidden shadow-sm bg-white/[0.02] max-h-96 overflow-y-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="bg-white/[0.04] border-b border-white/[0.08] text-slate-400 font-bold">
                        <th className="p-3 font-semibold">{lang === 'en' ? 'Employee Name' : lang === 'ar' ? 'اسم الموظف' : 'ناوی کارمەند'}</th>
                        <th className="p-3 font-semibold">{lang === 'en' ? 'Mailing Account' : lang === 'ar' ? 'البريد الإلكتروني' : 'ئیمەیڵی چوونەژوورەوە'}</th>
                        <th className="p-3 font-semibold text-center">{lang === 'en' ? 'Privilege Role' : lang === 'ar' ? 'دور الصلاحية' : 'دەسەڵات / ڕۆڵ'}</th>
                        <th className="p-3 font-semibold text-center">{lang === 'en' ? 'Salary' : lang === 'ar' ? 'الراتب' : 'مووچە'}</th>
                        <th className="p-3 font-semibold text-center">{lang === 'en' ? 'Action' : lang === 'ar' ? 'إجراء' : 'کردار'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.06] bg-transparent">
                      {users
                        .filter((u) => !isManager || u.role !== 'Owner')
                        .map((u) => (
                        <tr key={u.id} className="hover:bg-white/[0.04] transition-colors">
                          <td className="p-3.5">
                            <div className="flex items-center gap-3">
                              <div className="relative group/avatar shrink-0">
                                {u.avatar ? (
                                  <button
                                    type="button"
                                    onClick={() => setViewingImage({
                                      src: u.avatar!,
                                      title: `${u.name} - ${u.role}`
                                    })}
                                    className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary/20 hover:border-primary shadow-xs block transition-all cursor-pointer hover:scale-105 active:scale-95 relative"
                                    title={lang === 'en' ? 'Click to view photo' : 'کلیک بکە بۆ سەیرکردنی وێنە'}
                                  >
                                    <img
                                      src={u.avatar}
                                      alt={u.name}
                                      className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-primary/20 backdrop-blur-[1px] opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                      <Eye className="w-3.5 h-3.5 text-white" />
                                    </div>
                                  </button>
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-extrabold flex items-center justify-center border border-primary/10 text-xs">
                                    {u.name.charAt(0).toUpperCase()}
                                  </div>
                                )}
                                {u.isOnline && (
                                  <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white"></span>
                                )}
                                {(isOwner || u.id === appState.currentUser?.id) && (
                                  <label
                                    className="absolute -top-1 -left-1 w-5 h-5 bg-primary hover:bg-primary-dark text-white rounded-full flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-all cursor-pointer shadow-xs border border-white z-10"
                                    title={lang === 'en' ? 'Change Photo (Circular Crop)' : 'گۆڕینی وێنە (بازنەیی)'}
                                  >
                                    <Camera className="w-2.5 h-2.5" />
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          setDirectAvatarUserId(u.id);
                                          handleImageFileSelect(
                                            file,
                                            'directUserAvatar',
                                            'circle',
                                            lang === 'en' ? `Crop Photo for ${u.name} (Circular)` : `قرتاندنی وێنەی ${u.name} (بازنەیی)`
                                          );
                                          e.target.value = '';
                                        }
                                      }}
                                    />
                                  </label>
                                )}
                              </div>
                              <div>
                                <span className="font-bold text-gray-800 block">{u.name}</span>
                                <div className="flex items-center gap-2 mt-1">
                                  {u.isOnline ? (
                                    <span className="flex items-center gap-1 text-[9px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded-lg border border-emerald-100">
                                      <span className="relative flex h-1.5 w-1.5 mr-0.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                      </span>
                                      {lang === 'en' ? 'Online' : lang === 'ar' ? 'متصل' : 'ئۆنلاین'}
                                      {` • ${formatLastActive(u.lastActiveAt, lang)}`}
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1 text-[9px] text-gray-500 font-bold bg-gray-50 px-1.5 py-0.5 rounded-lg border border-gray-100">
                                      <span className="h-1.5 w-1.5 rounded-full bg-gray-300"></span>
                                      {lang === 'en' ? 'Offline' : lang === 'ar' ? 'خارج النظام' : 'دەرەوەی سیستەم'}
                                      {` • ${formatLastActive(u.lastActiveAt, lang)}`}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="p-3.5 font-mono text-gray-500">{u.email}</td>
                          <td className="p-3.5 text-center">
                            {u.role === 'Owner' || !isOwner ? (
                              <span className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-bold text-white uppercase shadow-sm ${
                                u.role === 'Owner' 
                                  ? 'bg-primary' 
                                  : u.role === 'Manager'
                                    ? 'bg-purple-600'
                                    : u.role === 'Admin' 
                                      ? 'bg-blue-600' 
                                      : 'bg-indigo-600'
                              }`}>
                                {u.role === 'Owner' 
                                  ? (lang === 'en' ? 'Owner' : lang === 'ar' ? 'المالك' : 'خاوەن') 
                                  : u.role === 'Manager'
                                    ? (lang === 'en' ? 'Manager' : lang === 'ar' ? 'مدير' : 'بەڕێوەبەر')
                                    : u.role === 'Admin' 
                                      ? (lang === 'en' ? 'Admin' : lang === 'ar' ? 'أدمن' : 'ئادمین') 
                                      : (lang === 'en' ? 'Teller' : lang === 'ar' ? 'تيلر' : 'تەلەر')}
                              </span>
                            ) : (
                              <select
                                value={u.role}
                                onChange={(e) => {
                                  const newRole = e.target.value as any;
                                  if (onEditEmployee) {
                                    onEditEmployee(u.id, { role: newRole });
                                    setMessage(lang === 'en' ? 'Employee role updated successfully!' : lang === 'ar' ? 'تم تحديث دور الموظف بنجاح!' : 'ڕۆڵی کارمەندەکە بە سەرکەوتوویی نوێکرایەوە.');
                                    setTimeout(() => setMessage(''), 3000);
                                  }
                                }}
                                className={`inline-block px-2 py-1 rounded-lg text-[10px] font-bold text-white uppercase shadow-sm border-none cursor-pointer focus:ring-2 focus:ring-primary outline-none text-center ${
                                  u.role === 'Manager'
                                    ? 'bg-purple-600 hover:bg-purple-700'
                                    : u.role === 'Admin' 
                                      ? 'bg-blue-600 hover:bg-blue-700' 
                                      : 'bg-indigo-600 hover:bg-indigo-700'
                                }`}
                              >
                                <option value="Manager" className="bg-[#0B0F19] text-white">{lang === 'en' ? 'Manager' : lang === 'ar' ? 'مدير' : 'بەڕێوەبەر'}</option>
                                <option value="Admin" className="bg-[#0B0F19] text-white">{lang === 'en' ? 'Admin' : lang === 'ar' ? 'أدمن' : 'ئادمین'}</option>
                                <option value="Teller" className="bg-[#0B0F19] text-white">{lang === 'en' ? 'Teller' : lang === 'ar' ? 'تيلر' : 'تەلەر'}</option>
                              </select>
                            )}
                          </td>
                          <td className="p-3.5 text-center font-mono">
                            {u.salary !== undefined && u.salary !== null && Number(u.salary) > 0 ? (
                              <span className="inline-flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-lg border border-emerald-100 dark:border-emerald-800 text-xs">
                                <span>{Number(u.salary).toLocaleString()}</span>
                                <span className="text-[10px] text-emerald-600 dark:text-emerald-500 font-sans">
                                  {u.salaryCurrency === 'IQD' || u.salaryCurrency === 'د.ع' ? 'د.ع' : '$'}
                                </span>
                              </span>
                            ) : (
                              <span className="text-gray-300 dark:text-gray-600 text-xs font-sans">-</span>
                            )}
                          </td>
                          <td className="p-3.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {/* Details & Info Button */}
                              <button
                                type="button"
                                onClick={() => setSelectedEmployeeForInfo(u)}
                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200 cursor-pointer"
                                title={lang === 'en' ? 'Employee Information & Salary' : 'زانیاریی تەواوی کارمەند و مووچە'}
                              >
                                <Info className="w-4 h-4 text-blue-500" />
                              </button>

                              {isOwner && u.role !== 'Owner' ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => startEditingEmployee(u)}
                                    className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all duration-200 cursor-pointer"
                                    title={lang === 'en' ? 'Edit Account & Salary' : 'دەستکاریکردن'}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEmployeeToDelete(u)}
                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 cursor-pointer"
                                    title={lang === 'en' ? 'Block Account' : 'سڕینەوە'}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              ) : isOwner && u.role === 'Owner' ? (
                                <button
                                  type="button"
                                  onClick={() => startEditingEmployee(u)}
                                  className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-all duration-200 cursor-pointer"
                                  title={lang === 'en' ? 'Edit Profile & Photo' : 'دەستکاریکردنی پرۆفایل و وێنە'}
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {isOwner && (
                /* Registration Form: Span 5 on large devices */
                <div className="lg:col-span-5 space-y-4">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    {t.add_new_employee}
                  </h4>

                  <form onSubmit={handleAddEmployeeSubmit} className="space-y-4 p-5 bg-slate-950/45 backdrop-blur-xl border border-white/[0.1] rounded-2xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)]">
                    {/* Employee Profile Photo (Circular Crop) */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1.5">
                        {lang === 'en' ? 'Employee Photo (Circular)' : lang === 'ar' ? 'صورة الموظف (دائري)' : 'وێنەی کارمەند (بازنەیی)'}
                      </label>
                      <div className="flex items-center gap-3">
                        {empAvatar ? (
                          <div className="relative w-12 h-12 rounded-full border-2 border-primary/30 overflow-hidden shrink-0 group shadow-xs">
                            <img src={empAvatar} alt="Avatar Preview" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => setEmpAvatar(undefined)}
                              className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              title={lang === 'en' ? 'Remove Photo' : 'سڕینەوەی وێنە'}
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-white/[0.05] border border-dashed border-white/20 flex items-center justify-center text-slate-400 shrink-0">
                            <User className="w-5 h-5 text-slate-400" />
                          </div>
                        )}

                        <label className="cursor-pointer px-3 py-1.5 bg-white/[0.08] hover:bg-white/[0.14] text-slate-100 rounded-xl text-xs font-medium backdrop-blur-md transition-all flex items-center gap-1.5 border border-white/[0.15] shadow-sm">
                          <Camera className="w-3.5 h-3.5 text-primary" />
                          <span>{empAvatar ? (lang === 'en' ? 'Change Photo (Crop)' : 'گۆڕینی وێنە (بازنەیی)') : (lang === 'en' ? 'Upload Photo (Crop)' : 'دانانی وێنە (بازنەیی)')}</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleImageFileSelect(
                                  file,
                                  'empAvatar',
                                  'circle',
                                  lang === 'en' ? 'Crop Employee Photo (Circular)' : 'قرتاندنی وێنەی کارمەند (بازنەیی)'
                                );
                                e.target.value = '';
                              }
                            }}
                          />
                        </label>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">{t.full_name}</label>
                        <input
                          type="text"
                          required
                          value={empName}
                          onChange={(e) => setEmpName(e.target.value)}
                          className="w-full bg-white/[0.05] border border-white/[0.12] rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-400 focus:border-[#1D7AFC] focus:bg-white/[0.08] focus:outline-none transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">{t.role_label}</label>
                        <select
                          value={empRole}
                          onChange={(e) => setEmpRole(e.target.value as any)}
                          className="w-full bg-slate-950/50 border border-white/[0.12] rounded-xl px-3.5 py-2 text-xs text-white focus:border-[#1D7AFC] focus:outline-none font-bold"
                        >
                          <option value="Manager" className="bg-[#0B0F19] text-white">{lang === 'en' ? 'Manager' : lang === 'ar' ? 'مدير' : 'بەڕێوەبەر'}</option>
                          <option value="Admin" className="bg-[#0B0F19] text-white">{lang === 'en' ? 'Admin' : lang === 'ar' ? 'أدمن' : 'ئادمین'}</option>
                          <option value="Teller" className="bg-[#0B0F19] text-white">{lang === 'en' ? 'Member (Teller)' : lang === 'ar' ? 'عضو (تيلر)' : 'مێمبەر (کارمەند)'}</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">{t.email_login}</label>
                      <input
                        type="email"
                        required
                        value={empEmail}
                        onChange={(e) => setEmpEmail(e.target.value)}
                        className="w-full bg-white/[0.05] border border-white/[0.12] rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-400 focus:border-[#1D7AFC] focus:bg-white/[0.08] focus:outline-none transition-all font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">{t.password_label}</label>
                      <input
                        type="password"
                        required
                        value={empPassword}
                        onChange={(e) => setEmpPassword(e.target.value)}
                        className="w-full bg-white/[0.05] border border-white/[0.12] rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-400 focus:border-[#1D7AFC] focus:bg-white/[0.08] focus:outline-none transition-all font-mono"
                      />
                    </div>

                    {/* Monthly Salary Input */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">
                          {lang === 'en' ? 'Monthly Salary' : lang === 'ar' ? 'الراتب الشهري' : 'مووچەی مانگانە'}
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          placeholder={lang === 'en' ? 'e.g. 750' : 'بڕی مووچە (نموونە: ٧٥٠)'}
                          value={empSalary}
                          onChange={(e) => setEmpSalary(e.target.value)}
                          className="w-full bg-white/[0.05] border border-white/[0.12] rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-400 focus:border-[#1D7AFC] focus:bg-white/[0.08] focus:outline-none transition-all font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">
                          {lang === 'en' ? 'Salary Currency' : lang === 'ar' ? 'عملة الراتب' : 'دراوی مووچە'}
                        </label>
                        <select
                          value={empSalaryCurrency}
                          onChange={(e) => setEmpSalaryCurrency(e.target.value)}
                          className="w-full bg-slate-950/50 border border-white/[0.12] rounded-xl px-3.5 py-2 text-xs text-white focus:border-[#1D7AFC] focus:outline-none font-bold"
                        >
                          <option value="USD" className="bg-[#0B0F19] text-white">$ - دۆلاری ئەمریکی (USD)</option>
                          <option value="IQD" className="bg-[#0B0F19] text-white">د.ع - دیناری عێراقی (IQD)</option>
                        </select>
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        type="submit"
                        className="px-6 py-2.5 bg-primary text-[#ffffff] font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm hover:bg-primary-dark transition-colors duration-200"
                      >
                        <Plus className="w-4 h-4" />
                        <span>{t.submit_add}</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

            </div>
          </div>
      )}

      {showData && (
        /* Start Fresh / Database Reset - Beautifully Separated and Placed at the Bottom */
        <div id="settings-section-data" data-animate="card" className="bento-card transform-gpu bg-white dark:bg-slate-900 p-6 rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-gradient-to-br from-white to-rose-50/10 dark:from-slate-900 dark:to-rose-950/20 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
            <ShieldAlert className="w-5 h-5 animate-pulse text-red-500" />
            <h3 className="text-sm font-extrabold text-red-600 dark:text-red-400 uppercase">
              {t.reset_data_title}
            </h3>
          </div>
          <p className="text-xs text-gray-500 dark:text-slate-300 leading-relaxed max-w-4xl">
            {lang === 'en'
              ? 'Factory Reset: This action will completely and permanently delete all registered clients, system users, employee accounts, current cash balances, standard hawala logs, fast transfers, and financial transaction records. This action cannot be reversed.'
              : lang === 'ar'
                ? 'إعادة ضبط مصنع شاملة: هذا الإجراء سيقوم بحذف كافة العملاء المسجلين، مستخدمي النظام، حسابات الموظفين، أرصدة الصناديق الحالية، سجلات الحوالات العادية والفورسات، وجميع القيود المالية نهائياً وبلا رجعة.'
                : 'پاککردنەوەی گشتی (فۆرمات): ئەم کردارە بە شێوەیەکی نەگەڕاوە و کۆتا جار هەموو کڕیارە تۆمارکراوەکان، بەکارهێنەرانی سیستەمەکە، هەژماری کارمەندەکان، باڵانسی گەنجینەکان، لۆگی حەواڵە ئاسایی و خێراکان، و گشت مامەڵە داراییەکان دەسرێتەوە بۆ هەمیشە.'}
          </p>
          <div className="flex justify-start">
            <button
              type="button"
              onClick={() => setResetConfirmOpen(true)}
              className="px-6 py-3 bg-red-600 text-white font-bold rounded-xl text-xs hover:bg-red-700 transition-all flex items-center gap-2 shadow-md shadow-red-100 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>{t.reset_data_btn}</span>
            </button>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {canManageEmployees && employeeToEdit && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in" dir={lang === 'en' ? 'ltr' : 'rtl'}>
              <div className="bg-slate-950/90 backdrop-blur-2xl border border-white/[0.12] rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.7)] w-full max-w-md overflow-hidden flex flex-col h-auto text-white">
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-white/[0.03]">
                  <h2 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Settings className="w-4 h-4 text-amber-400" />
                    <span>
                      {lang === 'en' ? 'Edit System Account' : 'دەستکاریکردنی هەژماری سیستەم'}
                    </span>
                  </h2>
                  <button onClick={() => setEmployeeToEdit(null)} className="text-slate-400 hover:text-white p-1 transition-colors cursor-pointer">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleEditEmployeeSubmit} className="p-6 space-y-4 text-right">
                  {/* Avatar upload in edit modal (Circular) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5 text-right">
                      {lang === 'en' ? 'Profile Picture (Circular)' : lang === 'ar' ? 'الصورة الشخصية (دائري)' : 'وێنەی کەسی (بازنەیی)'}
                    </label>
                    <div className="flex items-center gap-3">
                      {editEmpAvatar ? (
                        <div className="relative w-14 h-14 rounded-full border-2 border-primary/30 overflow-hidden shrink-0 group shadow-xs">
                          <img src={editEmpAvatar} alt="Avatar" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setEditEmpAvatar(undefined)}
                            className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            title={lang === 'en' ? 'Remove Photo' : 'سڕینەوەی وێنە'}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-white/[0.05] border border-dashed border-white/20 flex items-center justify-center text-slate-400 shrink-0">
                          <User className="w-6 h-6 text-slate-400" />
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <label className="cursor-pointer px-3 py-2 bg-white/[0.08] hover:bg-white/[0.14] text-slate-100 rounded-xl text-xs font-medium backdrop-blur-md transition-all flex items-center gap-1.5 border border-white/[0.15] shadow-sm">
                          <Camera className="w-3.5 h-3.5 text-primary" />
                          <span>{editEmpAvatar ? (lang === 'en' ? 'Change Photo (Crop)' : 'گۆڕینی وێنە (بازنەیی)') : (lang === 'en' ? 'Upload Photo (Crop)' : 'دانانی وێنە (بازنەیی)')}</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleImageFileSelect(
                                  file,
                                  'editEmpAvatar',
                                  'circle',
                                  lang === 'en' ? 'Crop Profile Photo (Circular)' : 'قرتاندنی وێنەی کەسی (بازنەیی)'
                                );
                                e.target.value = '';
                              }
                            }}
                          />
                        </label>

                        {editEmpAvatar && (
                          <button
                            type="button"
                            onClick={() => setEditEmpAvatar(undefined)}
                            className="px-2.5 py-2 text-xs font-bold text-red-400 hover:bg-red-500/15 rounded-xl border border-red-500/30 transition-colors cursor-pointer"
                          >
                            {lang === 'en' ? 'Remove' : 'سڕینەوە'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5 text-right">
                      {lang === 'en' ? 'Full Name' : 'ناوی تەواو'}
                    </label>
                    <input
                      type="text"
                      required
                      value={editEmpName}
                      onChange={(e) => setEditEmpName(e.target.value)}
                      className="w-full bg-white/[0.05] border border-white/[0.12] rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-400 focus:border-[#1D7AFC] focus:bg-white/[0.08] focus:outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5 text-right">
                      {lang === 'en' ? 'Email Address' : 'ئیمەیڵی چوونەژوورەوە'}
                    </label>
                    <input
                      type="email"
                      required
                      value={editEmpEmail}
                      onChange={(e) => setEditEmpEmail(e.target.value)}
                      className="w-full bg-white/[0.05] border border-white/[0.12] rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-400 focus:border-[#1D7AFC] focus:bg-white/[0.08] focus:outline-none transition-all font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5 text-right">
                      {lang === 'en' ? 'Privilege Role' : 'دەسەڵات / ڕۆڵ'}
                    </label>
                    {employeeToEdit.role === 'Owner' ? (
                      <div className="w-full bg-white/[0.05] border border-white/[0.12] rounded-xl px-3.5 py-2 text-xs font-bold text-primary flex items-center justify-between">
                        <span>{lang === 'en' ? 'Owner (Full Access)' : 'خاوەنکار (دەسەڵاتی باڵا)'}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] bg-primary text-white font-bold uppercase">{lang === 'en' ? 'Owner' : 'خاوەن'}</span>
                      </div>
                    ) : (
                      <select
                        value={editEmpRole}
                        onChange={(e) => {
                          const newRole = e.target.value as any;
                          setEditEmpRole(newRole);
                          if (onEditEmployee && employeeToEdit) {
                            onEditEmployee(employeeToEdit.id, { role: newRole });
                          }
                        }}
                        className="w-full bg-slate-950/50 border border-white/[0.12] rounded-xl px-3.5 py-2 text-xs text-white focus:border-[#1D7AFC] focus:outline-none font-bold"
                      >
                        <option value="Manager" className="bg-[#0B0F19] text-white">{lang === 'en' ? 'Manager' : lang === 'ar' ? 'مدير' : 'بەڕێوەبەر'}</option>
                        <option value="Admin" className="bg-[#0B0F19] text-white">{lang === 'en' ? 'Admin' : lang === 'ar' ? 'أدمن' : 'ئادمین'}</option>
                        <option value="Teller" className="bg-[#0B0F19] text-white">{lang === 'en' ? 'Member (Teller)' : lang === 'ar' ? 'عضو (تيلر)' : 'مێمبەر (کارمەند)'}</option>
                      </select>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5 text-right">
                      {lang === 'en' ? 'Password' : 'وشەی تێپەڕ'}
                    </label>
                    <input
                      type="password"
                      required
                      value={editEmpPassword}
                      onChange={(e) => setEditEmpPassword(e.target.value)}
                      className="w-full bg-white/[0.05] border border-white/[0.12] rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-400 focus:border-[#1D7AFC] focus:bg-white/[0.08] focus:outline-none transition-all font-mono"
                    />
                  </div>

                  {/* Monthly Salary Input in Edit Modal */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-right">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5 text-right">
                        {lang === 'en' ? 'Monthly Salary' : lang === 'ar' ? 'الراتب الشهري' : 'مووچەی مانگانە'}
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder={lang === 'en' ? 'e.g. 800' : 'بڕی مووچە (نموونە: ٨٠٠)'}
                        value={editEmpSalary}
                        onChange={(e) => setEditEmpSalary(e.target.value)}
                        className="w-full bg-white/[0.05] border border-white/[0.12] rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-400 focus:border-[#1D7AFC] focus:bg-white/[0.08] focus:outline-none transition-all font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5 text-right">
                        {lang === 'en' ? 'Salary Currency' : lang === 'ar' ? 'عملة الراتب' : 'دراوی مووچە'}
                      </label>
                      <select
                        value={editEmpSalaryCurrency}
                        onChange={(e) => setEditEmpSalaryCurrency(e.target.value)}
                        className="w-full bg-slate-950/50 border border-white/[0.12] rounded-xl px-3.5 py-2 text-xs text-white focus:border-[#1D7AFC] focus:outline-none font-bold"
                      >
                        <option value="USD" className="bg-[#0B0F19] text-white">$ - دۆلاری ئەمریکی (USD)</option>
                        <option value="IQD" className="bg-[#0B0F19] text-white">د.ع - دیناری عێراقی (IQD)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end border-t border-white/[0.08] pt-3">
                    <button
                      type="button"
                      onClick={() => setEmployeeToEdit(null)}
                      className="px-4 py-2 border border-white/[0.15] rounded-xl text-xs hover:bg-white/[0.08] text-slate-200 font-medium transition-colors cursor-pointer"
                    >
                      {lang === 'en' ? 'Cancel' : 'پاشگەزبوونەوە'}
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs shadow-sm flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>{lang === 'en' ? 'Save Changes' : 'پاشەکەوتکردنی گۆڕانکاری'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

      {/* Delete Employee Custom Confirm Modal */}
      <ConfirmModal
        isOpen={employeeToDelete !== null}
        title={
          lang === 'en' 
            ? 'Delete Employee Account' 
            : lang === 'ar' 
              ? 'حذف حساب الموظف' 
              : 'سڕینەوەی هەژماری کارمەند'
        }
        message={
          lang === 'en'
            ? `Are you sure you want to delete employee "${employeeToDelete?.name}"?`
            : lang === 'ar'
              ? `هل أنت متأكد من حذف الموظف "${employeeToDelete?.name}"؟`
              : `ئایا دڵنیایت لە سڕینەوەی کارمەند "${employeeToDelete?.name}"؟`
        }
        lang={lang}
        onConfirm={() => {
          if (employeeToDelete) {
            onDeleteEmployee(employeeToDelete.id);
            setEmployeeToDelete(null);
          }
        }}
        onCancel={() => setEmployeeToDelete(null)}
      />

      {/* Database Reset Custom Confirm Modal */}
      <ConfirmModal
        isOpen={resetConfirmOpen}
        title={
          lang === 'en' 
            ? 'Factory Reset Database (Step 1/2)' 
            : lang === 'ar' 
              ? 'إعادة ضبط قاعدة البيانات بالكامل (خطوة 1/2)' 
              : 'پاککردنەوەی گشتی داتابەیس (هەنگاوی ١/٢)'
        }
        message={
          translations[lang]?.reset_data_confirm || (
            lang === 'en'
              ? 'Are you absolutely sure you want to completely erase all data? This cannot be undone. We will ask for a final owner confirmation next.'
              : lang === 'ar'
                ? 'هل أنت متأكد تماماً من رغبتك في حذف كافة البيانات؟ لا يمكن التراجع عن هذا الإجراء. سنطلب تأكید المالك النهائي بعد ذلك.'
                : 'ئایا بە تەواوی دڵنیایت لە سڕینەوەی گشت داتاکان؟ ئەم کارە ناگەڕێتەوە دواوە. لە هەنگاوی داهاتوودا داوای دووپاتکردنەوەی کۆتایی لە خاوەنەکە دەکەین.'
          )
        }
        confirmText={
          lang === 'en' 
            ? 'Proceed to Final Step' 
            : lang === 'ar' 
              ? 'الذهاب للخطوة الأخيرة' 
              : 'بەردەوامبە بۆ هەنگاوی کۆتایی'
        }
        lang={lang}
        onConfirm={() => {
          setResetConfirmOpen(false);
          // Small safety delay before opening the second severe double confirm dialog
          setTimeout(() => {
            setDoubleConfirmOpen(true);
          }, 150);
        }}
        onCancel={() => setResetConfirmOpen(false)}
      />

      {/* Phase 2: Double Confirmation Modal for the Owner */}
      <ConfirmModal
        isOpen={doubleConfirmOpen}
        title={
          lang === 'en' 
            ? '🔴 ABSOLUTE FINAL WARNING FOR THE OWNER' 
            : lang === 'ar' 
              ? '🔴 تحذير نهائي مطلق للمالك' 
              : '🔴 ئاگاداری فەرمی و کۆتایی بۆ خاوەنی نووسینگە'
        }
        message={
          lang === 'en'
            ? 'Dear Owner: Performing this factory reset will permanently erase every single transaction, customer record, and safe balance. This action IS IRREVERSIBLE. Are you 100% sure you want to completely wipe the system database?'
            : lang === 'ar'
              ? 'عزيزي المالك: إجراء هذا المسح الشامل سيؤدي إلى حذف كل حركات الأموال، وبيانات العملاء، وأرصدة الصناديق نهائياً ولا يمكن التراجع عنها مطلقاً. هل أنت متأكد 100٪ من رغبتك في مسح النظام بالكامل؟'
              : 'خاوەنی بەڕێز: بە پاککردنەوەی گشتی داتابەیس، هەموو مامەڵەکان، تەلەرەکان، حیساباتی کڕیاران و گشت گەنجینەکان بە تەواوی دەسڕێنەوە بۆ هەمیشە و ناگەڕێتەوە دواوە. ئایا بە تەواوی دڵنیایت کە دەتەوێت داتابەیسی سیستەمەکە بسڕیتەوە؟'
        }
        confirmText={
          lang === 'en' 
            ? 'Yes, WIPE SYSTEM FOREVER' 
            : lang === 'ar' 
              ? 'نعم، امسح النظام لِلأبد' 
              : 'بەڵێ، داتابەیسەکە بسڕەوە بۆ هەمیشە'
        }
        cancelText={
          lang === 'en' 
            ? 'No, KEEP MY DATA' 
            : lang === 'ar' 
              ? 'لا، احتفظ بالبيانات' 
              : 'نەخێر، کارەکە ڕاگرە'
        }
        lang={lang}
        onConfirm={() => {
          onResetAllData();
          setDoubleConfirmOpen(false);
        }}
        onCancel={() => setDoubleConfirmOpen(false)}
      />

      {/* Image Cropper Modal */}
      <ImageCropperModal
        isOpen={cropperModalOpen}
        imageSrc={cropperImageSrc}
        cropShape={cropperShape}
        title={cropperTitle}
        lang={lang}
        onCrop={handleCropperComplete}
        onClose={() => setCropperModalOpen(false)}
      />

      {/* Full Image Lightbox Viewer Modal */}
      <ImageViewerModal
        isOpen={!!viewingImage}
        imageSrc={viewingImage?.src || null}
        title={viewingImage?.title}
        lang={lang}
        onClose={() => setViewingImage(null)}
      />

      {/* Employee Information & Details Modal */}
      <EmployeeInfoModal
        isOpen={!!selectedEmployeeForInfo}
        employee={selectedEmployeeForInfo}
        lang={lang}
        onClose={() => setSelectedEmployeeForInfo(null)}
        onEdit={(emp) => {
          setSelectedEmployeeForInfo(null);
          startEditingEmployee(emp);
        }}
        onViewAvatar={(avatarUrl, name) => {
          setViewingImage({
            src: avatarUrl,
            title: `${name} - ${lang === 'en' ? 'Employee Photo' : 'وێنەی کارمەند'}`
          });
        }}
      />
    </div>
  );
}
