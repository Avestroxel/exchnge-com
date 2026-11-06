import { useState, FormEvent } from 'react';
import { Lock, Mail, Phone, Shield, ArrowRight, Globe, Eye, EyeOff, Sun, Moon } from 'lucide-react';
import { AppUser, Customer } from '../types';
import { AppState } from '../data/stateManager';

interface LoginViewProps {
  appState: AppState;
  onLoginSuccess: (user: AppUser | Customer, role: 'Owner' | 'Employee' | 'Customer', rememberMe: boolean) => void;
  onLocalLangChange?: (newLang: 'ku' | 'en' | 'ar') => void;
  onThemeModeChange?: (mode: 'light' | 'dark' | 'midnight' | 'sepia' | 'navy' | 'sky_light' | 'soft_cream') => void;
}

export default function LoginView({ appState, onLoginSuccess, onLocalLangChange, onThemeModeChange }: LoginViewProps) {
  const { users, customers, settings } = appState;
  const lang = settings.language || 'ku';
  const currentMode = settings.themeMode || 'light';
  
  const [isAdminPortal, setIsAdminPortal] = useState(() => {
    const saved = localStorage.getItem('hawala_last_portal_mode');
    return saved ? saved === 'admin' : true;
  }); // toggle between Admin/Employee vs Customer
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);

  // Inputs
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem('hawala_remember_me') === 'true';
  });
  const [errorMsg, setErrorMsg] = useState('');

  const isDark = currentMode === 'midnight' || currentMode === 'dark';

  const handleLoginSubmit = (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (isAdminPortal) {
      // Look up app users (Owner/Admin/Teller)
      let foundUser = users.find(u => u.email.toLowerCase() === emailOrPhone.toLowerCase().trim());
      
      // Dynamic fallback/assurance for the production Owner account
      if (!foundUser && emailOrPhone.toLowerCase().trim() === 'owner@hawala.com') {
        foundUser = {
          id: 'usr-1',
          name: 'خاوەن',
          email: 'owner@hawala.com',
          role: 'Owner',
          password: 'owner123'
        };
      }

      if (foundUser) {
        const correctPassword = foundUser.password || 'owner123';
        if (password === correctPassword) {
          const actualRole = foundUser.role === 'Owner' ? 'Owner' : 'Employee';
          onLoginSuccess(foundUser, actualRole, rememberMe);
          return;
        }
      }
    } else {
      // Look up customers using phone
      const foundCustomer = customers.find(c => c.phone.trim() === emailOrPhone.trim());
      if (foundCustomer) {
        const correctPassword = foundCustomer.password || '123';
        if (password === correctPassword) {
          onLoginSuccess(foundCustomer, 'Customer', rememberMe);
          return;
        }
      }
    }

    setErrorMsg(
      lang === 'en' 
        ? 'Sorry, user not found or credentials are incorrect. Please try again.' 
        : lang === 'ar'
          ? 'عذراً، لم يتم العثور على المستخدم أو البيانات غير صحيحة. يرجى المحاولة مرة أخرى.'
          : 'ببورە، بەکارهێنەر نەدۆزرایەوە یان زانیارییەکان هەڵەن. تکایە دووبارە تاقیبکەرەوە.'
    );
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 text-right relative overflow-hidden text-slate-100 select-none">
      {/* Fallback ambient orbs */}
      <div className="fixed inset-0 -z-30 pointer-events-none select-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/30 rounded-full blur-[140px]" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-cyan-600/25 rounded-full blur-[140px]" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-amber-600/25 rounded-full blur-[140px]" />
      </div>

      {/* Full-Bleed Ambient Background Image */}
      <img 
        src="/assets/aistudio/pexels-steve-34062650_8633e506.jpg" 
        alt="Ambient background"
        className="fixed inset-0 w-full h-full object-cover object-center -z-20 pointer-events-none select-none" 
      />

      {/* Subtle Dark Contrast Overlay */}
      <div className="fixed inset-0 bg-[#05070B]/35 -z-10 pointer-events-none" />

      {/* Floating Language & Theme Mode Controls */}
      <div className="flex items-center gap-3 mb-6 z-20 no-print" dir={lang === 'en' ? 'ltr' : 'rtl'}>
        {/* Language Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setLangDropdownOpen(!langDropdownOpen);
            }}
            className="flex items-center gap-2.5 px-4 py-2 bg-slate-950/40 backdrop-blur-xl border border-white/[0.12] hover:border-white/[0.2] rounded-full shadow-lg text-xs font-semibold text-slate-200 hover:text-white transition-all duration-200 cursor-pointer"
          >
            <Globe className="w-4 h-4 text-[#1D7AFC] transition-transform duration-500 hover:rotate-45" />
            <span>
              {lang === 'ku' ? 'کوردی' : lang === 'ar' ? 'العربية' : 'English'}
            </span>
            <span className="text-slate-400 text-[10px] select-none">▼</span>
          </button>

          {langDropdownOpen && (
            <>
              <div 
                className="fixed inset-0 z-10 cursor-default" 
                onClick={() => setLangDropdownOpen(false)}
              />
              
              <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-36 bg-slate-950/80 backdrop-blur-2xl border border-white/[0.12] rounded-2xl shadow-2xl py-1.5 z-20 animate-fade-in text-center overflow-hidden">
                {[
                  { code: 'ku', name: 'کوردی' },
                  { code: 'en', name: 'English' },
                  { code: 'ar', name: 'العربية' }
                ].map((opt) => (
                  <button
                    key={opt.code}
                    type="button"
                    onClick={() => {
                      if (onLocalLangChange) {
                        onLocalLangChange(opt.code as any);
                      }
                      setLangDropdownOpen(false);
                    }}
                    className={`w-full px-4 py-2 text-xs font-semibold transition-all hover:bg-white/[0.08] flex items-center justify-center gap-2 cursor-pointer ${
                      lang === opt.code
                        ? 'text-[#60A5FA] bg-[#1D7AFC]/15 font-bold'
                        : 'text-slate-300'
                    }`}
                  >
                    {lang === opt.code && (
                      <div className="w-1.5 h-1.5 rounded-full bg-[#1D7AFC] shrink-0" />
                    )}
                    {opt.name}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Theme Modes Toggle */}
        <div className="flex items-center p-1 bg-slate-950/40 backdrop-blur-xl border border-white/[0.12] rounded-full shadow-lg gap-1">
          <button
            type="button"
            onClick={() => onThemeModeChange?.('sky_light')}
            title="Sky Blue Mode"
            className={`w-8 h-8 flex items-center justify-center rounded-full transition-all duration-300 cursor-pointer ${
              !isDark
                ? 'bg-[#1D7AFC] text-white shadow-[0_0_12px_rgba(29,122,252,0.4)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onThemeModeChange?.('midnight')}
            title="Midnight Black Mode"
            className={`w-8 h-8 flex items-center justify-center rounded-full transition-all duration-300 cursor-pointer ${
              isDark
                ? 'bg-[#1D7AFC] text-white shadow-[0_0_12px_rgba(29,122,252,0.4)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Moon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Glassmorphic Login Card */}
      <div className="w-full max-w-md bg-slate-950/40 backdrop-blur-2xl backdrop-saturate-150 rounded-3xl border border-white/[0.12] shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.22),inset_0_0_24px_rgba(255,255,255,0.03),0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden z-10 relative">
        {/* Specular line */}
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none" />

        {/* Header decoration */}
        <div className="p-8 pb-5 text-center space-y-2 border-b border-white/[0.08] bg-white/[0.02]">
          <div className="w-16 h-16 rounded-3xl bg-[#1D7AFC]/20 border border-[#1D7AFC]/30 flex items-center justify-center text-white font-extrabold mx-auto text-xl shadow-[0_0_25px_rgba(29,122,252,0.35)] overflow-hidden p-0.5">
            {settings.officeLogo ? (
              <img src={settings.officeLogo} alt="Office Logo" className="w-full h-full object-cover rounded-[22px]" />
            ) : (
              isAdminPortal ? <Shield className="w-8 h-8 text-[#1D7AFC]" /> : <Lock className="w-8 h-8 text-[#1D7AFC]" />
            )}
          </div>
          <h1 className="text-xl font-bold text-white pt-2 tracking-tight">
            {settings.officeName || (lang === 'en' ? 'Exchange System' : lang === 'ar' ? 'نظام الصرافة' : 'سیستەمی ئاڵوگۆڕ')}
          </h1>
          <p className="text-xs text-slate-400">
            {isAdminPortal 
              ? (lang === 'en' ? 'Sign in for employees and office owner' : lang === 'ar' ? 'تسجيل الدخول للموظفين ومالك المكتب' : 'چوونە ژوورەوە بۆ فەرمانبەران و خاوەنکار') 
              : (lang === 'en' ? 'Exclusive portal for our valued customers' : lang === 'ar' ? 'بوابة خاصة لزبائننا الكرام' : 'دەروازەی تایبەت بە کڕیارانی بەڕێز')}
          </p>
        </div>

        {/* Input Form card */}
        <form onSubmit={handleLoginSubmit} className="p-7 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-500/15 text-rose-300 border border-rose-500/25 rounded-xl text-xs font-semibold leading-relaxed">
              {errorMsg}
            </div>
          )}

          {/* Email / Phone input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">
              {isAdminPortal 
                ? (lang === 'en' ? 'Employee Email or Phone' : lang === 'ar' ? 'البريد الإلكتروني أو هاتف الموظف' : 'ئیمەیڵ یان مۆبایلی فەرمانبەر') 
                : (lang === 'en' ? 'Customer Phone Number' : lang === 'ar' ? 'رقم هاتف الزبون' : 'ژمارەی تەلەفۆنی کڕیار')}
            </label>
            <div className="relative flex items-center">
              <input
                type={isAdminPortal ? 'text' : 'tel'}
                required
                placeholder={isAdminPortal ? 'username@email.com' : '0750XXXXXXX'}
                value={emailOrPhone}
                onChange={(e) => setEmailOrPhone(e.target.value)}
                className="w-full bg-white/[0.05] border border-white/[0.1] text-white placeholder:text-slate-500 rounded-xl px-10 py-3 text-xs focus:ring-2 focus:ring-[#1D7AFC]/30 focus:border-[#1D7AFC] outline-none font-mono text-left backdrop-blur-md transition-all"
              />
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none flex items-center">
                {isAdminPortal ? <Mail className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
              </span>
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <label className="block font-semibold text-slate-300">
                {lang === 'en' ? 'Password' : lang === 'ar' ? 'كلمة المرور' : 'وشەی نهێنی (Password)'}
              </label>
              <span className="text-[10px] text-slate-400 font-mono">
                {lang === 'en' ? 'Secured' : lang === 'ar' ? 'مؤمن' : 'پارێزراوە'}
              </span>
            </div>
            <div className="relative flex items-center">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="• • • • • •"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/[0.05] border border-white/[0.1] text-white placeholder:text-slate-500 rounded-xl pl-10 pr-10 py-3 text-xs focus:ring-2 focus:ring-[#1D7AFC]/30 focus:border-[#1D7AFC] outline-none font-mono text-left backdrop-blur-md transition-all"
              />
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none flex items-center">
                <Lock className="w-4 h-4" />
              </span>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors p-1 rounded cursor-pointer flex items-center justify-center"
              >
                {showPassword ? <EyeOff className="w-4 h-4 text-[#60A5FA]" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Remember Me Checkbox */}
          <div className="flex items-center justify-start py-1">
            <label className="flex items-center gap-2 cursor-pointer select-none group">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded text-[#1D7AFC] border-white/[0.2] bg-white/[0.05] focus:ring-[#1D7AFC] cursor-pointer accent-[#1D7AFC]"
              />
              <span className="text-xs text-slate-400 group-hover:text-white transition-colors">
                {settings.language === 'en' 
                  ? 'Keep me logged in on this device' 
                  : settings.language === 'ar'
                    ? 'تذكرني على هذا الجهاز'
                    : 'لەسەر ئەم ئامێرە بمهێڵەوە (منت بیربێت)'}
              </span>
            </label>
          </div>
          
          {/* Login button */}
          <button
            type="submit"
            className="w-full py-3 bg-[#1D7AFC] hover:bg-blue-500 text-white font-semibold rounded-xl text-xs shadow-[0_4px_20px_rgba(29,122,252,0.4),inset_0_1px_0_rgba(255,255,255,0.3)] transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <span>{lang === 'en' ? 'Sign In' : lang === 'ar' ? 'تسجيل الدخول' : 'چوونە ژوورەوە'}</span>
            <ArrowRight className="w-4 h-4 transform rotate-180" />
          </button>
        </form>

        {/* Change gate option footer */}
        <div className="p-4 bg-white/[0.02] border-t border-white/[0.08] flex justify-center text-xs">
          {isAdminPortal ? (
            <button
              onClick={() => {
                setIsAdminPortal(false);
                localStorage.setItem('hawala_last_portal_mode', 'customer');
                setEmailOrPhone('');
                setPassword('');
                setErrorMsg('');
              }}
              className="text-[#60A5FA] hover:text-white hover:underline font-semibold cursor-pointer transition-colors"
            >
              {lang === 'en' ? 'Are you a customer? Open customer portal ➔' : lang === 'ar' ? 'هل أنت زبون؟ افتح بوابة العملاء ➔' : 'کڕیاریت و دەتەوێت هەژمارەکەت ببینیت پۆرتالی کڕیار بکەرەوە ➔'}
            </button>
          ) : (
            <button
              onClick={() => {
                setIsAdminPortal(true);
                localStorage.setItem('hawala_last_portal_mode', 'admin');
                setEmailOrPhone('');
                setPassword('');
                setErrorMsg('');
              }}
              className="text-[#60A5FA] hover:text-white hover:underline font-semibold cursor-pointer transition-colors"
            >
              {lang === 'en' ? 'Are you staff? Return to admin portal ➔' : lang === 'ar' ? 'هل أنت موظف؟ العودة إلى بوابة الإدارة ➔' : 'فەرمانبەریت؟ گەڕانەوە بۆ پۆرتالی سەرەکی بەڕێوەبەرایەتی ➔'}
            </button>
          )}
        </div>
      </div>

      <div className="text-slate-400 text-[11px] font-medium mt-6 text-center z-10">
        {lang === 'en' ? 'Developed for ' : lang === 'ar' ? 'تم التطوير لصالح ' : 'گەشەپێدراوە بۆ '}
        <strong className="text-slate-300">{settings.officeName || (lang === 'en' ? 'Exchange Office' : lang === 'ar' ? 'مكتب الصيرفة' : 'سیستەمی ئاڵوگۆڕ')}</strong> • {lang === 'en' ? 'Refractive Dark Glassmorphic Ledger' : lang === 'ar' ? 'سجل العمليات الصيرفية الزجاجي' : 'دەفتەری حیساباتی کریستالی ئاڵوگۆڕ و حەواڵە'}
      </div>
    </div>
  );
}
