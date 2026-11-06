import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import gsap from 'gsap';
import { 
  LayoutDashboard, Vault, Users, ArrowLeftRight, Send, 
  BarChart3, Settings, LogOut, X, Lock, Unlock, Trash2, PlusCircle,
  Coins, ShieldAlert, Sun, Moon
} from 'lucide-react';
import { AppUser, Customer, SystemSettings } from '../types';
import { translations } from '../data/translations';

export type SidebarTab = 
  | 'dashboard' 
  | 'universal_entry'
  | 'safe' 
  | 'customers' 
  | 'exchange' 
  | 'transfers' 
  | 'reports' 
  | 'deleted_records'
  | 'settings';

interface RightSidebarProps {
  activeTab: SidebarTab;
  setActiveTab: (tab: SidebarTab) => void;
  currentUser: AppUser | Customer | null;
  sessionRole: 'Owner' | 'Employee' | 'Customer' | null;
  onLogout: () => void;
  settings: SystemSettings;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  onSelectSettingsSection?: (section: 'all' | 'general' | 'currencies' | 'employees' | 'data') => void;
  onThemeModeChange?: (mode: 'sky_light' | 'midnight') => void;
}

export default function RightSidebar({
  activeTab,
  setActiveTab,
  currentUser,
  sessionRole,
  onLogout,
  settings,
  isOpenMobile = false,
  onCloseMobile,
  onSelectSettingsSection,
  onThemeModeChange
}: RightSidebarProps) {
  
  const isCustomer = sessionRole === 'Customer';
  const isEmployee = sessionRole === 'Employee';
  const isOwner = sessionRole === 'Owner';

  const userRole = currentUser && 'role' in currentUser ? currentUser.role : null;
  const canViewReports = isOwner || userRole === 'Manager' || userRole === 'Admin';
  const canManageEmployees = isOwner || userRole === 'Manager';

  const lang = settings.language || 'ku';
  const t = translations[lang];
  const isEn = lang === 'en';

  const menuItems = [
    { id: 'dashboard' as const, label: t.dashboard, icon: LayoutDashboard, visible: true },
    { id: 'universal_entry' as const, label: t.universal_entry, icon: PlusCircle, visible: isOwner || isEmployee },
    { id: 'safe' as const, label: t.safe, icon: Vault, visible: isOwner || isEmployee },
    { id: 'customers' as const, label: t.customers, icon: Users, visible: isOwner || isEmployee },
    { id: 'exchange' as const, label: t.exchange, icon: ArrowLeftRight, visible: isOwner || isEmployee },
    { id: 'transfers' as const, label: t.transfers, icon: Send, visible: isOwner || isEmployee },
    { id: 'reports' as const, label: t.reports, icon: BarChart3, visible: canViewReports },
    { id: 'deleted_records' as const, label: t.deleted_records, icon: Trash2, visible: !isEmployee && !isCustomer },
  ];

  // GSAP Liquid Sliding Pill references with Caterpillar Anchored Stretch Physics
  const activePillRef = useRef<HTMLDivElement>(null);
  const navContainerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const prevRectRef = useRef<{ top: number; height: number } | null>(null);

  useLayoutEffect(() => {
    const pill = activePillRef.current;
    const container = navContainerRef.current;
    const targetEl = itemRefs.current[activeTab];
    if (!pill || !container) return;

    if (!targetEl) {
      gsap.to(pill, { opacity: 0, duration: 0.2 });
      prevRectRef.current = null;
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const targetRect = targetEl.getBoundingClientRect();
    const targetY = targetRect.top - containerRect.top;
    const targetH = targetRect.height;

    // First render initialization
    if (!prevRectRef.current) {
      gsap.set(pill, { y: targetY, height: targetH, opacity: 1 });
      prevRectRef.current = { top: targetY, height: targetH };
      return;
    }

    const startY = prevRectRef.current.top;
    const startH = prevRectRef.current.height;
    prevRectRef.current = { top: targetY, height: targetH };

    if (Math.abs(targetY - startY) < 2) {
      gsap.set(pill, { y: targetY, height: targetH, opacity: 1 });
      return;
    }

    // Calculate bounding box spanning BOTH old item and new item
    const spanTop = Math.min(startY, targetY);
    const spanBottom = Math.max(startY + startH, targetY + targetH);
    const fullStretchHeight = spanBottom - spanTop;

    gsap.killTweensOf(pill);
    gsap.set(pill, { opacity: 1 });

    const tl = gsap.timeline();
    // Phase 1: Anchor to the old item while stretching continuously across intermediate items to reach the new item
    tl.to(pill, {
      y: spanTop,
      height: fullStretchHeight,
      duration: 0.22,
      ease: 'power2.out',
    })
    // Phase 2: Smoothly retract the trailing edge into the new target item
    .to(pill, {
      y: targetY,
      height: targetH,
      duration: 0.36,
      ease: 'expo.out',
    }, '-=0.06');
  }, [activeTab]);

  let roleLabel = '';
  let roleBadgeClass = '';

  if (isOwner) {
    roleLabel = lang === 'en' ? 'Owner' : lang === 'ar' ? 'المالك' : 'خاوەن';
    roleBadgeClass = 'bg-[#1D7AFC]/20 text-[#60A5FA] border border-[#1D7AFC]/30';
  } else if (isEmployee) {
    if (userRole === 'Manager') {
      roleLabel = lang === 'en' ? 'Manager' : lang === 'ar' ? 'مدير' : 'بەڕێوەبەر';
      roleBadgeClass = 'bg-purple-500/20 text-purple-300 border border-purple-500/30';
    } else if (userRole === 'Admin') {
      roleLabel = lang === 'en' ? 'Admin' : lang === 'ar' ? 'أدمن' : 'ئادمین';
      roleBadgeClass = 'bg-[#1D7AFC]/20 text-[#60A5FA] border border-[#1D7AFC]/30';
    } else if (userRole === 'Teller') {
      roleLabel = lang === 'en' ? 'Teller' : lang === 'ar' ? 'تيلر' : 'تەلەر';
      roleBadgeClass = 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30';
    } else {
      roleLabel = lang === 'en' ? 'Staff' : lang === 'ar' ? 'موظف' : 'کارمەند';
      roleBadgeClass = 'bg-blue-500/20 text-blue-300 border border-blue-500/30';
    }
  } else {
    roleLabel = lang === 'en' ? 'Customer' : lang === 'ar' ? 'زبون' : 'کڕیار';
    roleBadgeClass = 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
  }

  // Settings Hover Flyout Logic
  const [isSettingsFlyoutOpen, setIsSettingsFlyoutOpen] = useState<boolean>(false);
  const settingsHoverTimer = useRef<NodeJS.Timeout | null>(null);

  const [isFloatingFlyoutOpen, setIsFloatingFlyoutOpen] = useState<boolean>(false);
  const floatingHoverTimer = useRef<NodeJS.Timeout | null>(null);

  const handleSettingsMouseEnter = () => {
    if (settingsHoverTimer.current) {
      clearTimeout(settingsHoverTimer.current);
      settingsHoverTimer.current = null;
    }
    setIsSettingsFlyoutOpen(true);
  };

  const handleSettingsMouseLeave = () => {
    settingsHoverTimer.current = setTimeout(() => {
      setIsSettingsFlyoutOpen(false);
    }, 450);
  };

  const handleFloatingMouseEnter = () => {
    if (floatingHoverTimer.current) {
      clearTimeout(floatingHoverTimer.current);
      floatingHoverTimer.current = null;
    }
    setIsFloatingFlyoutOpen(true);
  };

  const handleFloatingMouseLeave = () => {
    floatingHoverTimer.current = setTimeout(() => {
      setIsFloatingFlyoutOpen(false);
    }, 450);
  };

  useEffect(() => {
    return () => {
      if (settingsHoverTimer.current) clearTimeout(settingsHoverTimer.current);
      if (floatingHoverTimer.current) clearTimeout(floatingHoverTimer.current);
    };
  }, []);

  const handleSectionClick = (secId: 'general' | 'currencies' | 'employees' | 'data') => {
    setActiveTab('settings');
    onSelectSettingsSection?.(secId);
    setIsSettingsFlyoutOpen(false);
    setIsFloatingFlyoutOpen(false);
    if (!isPinned) setIsHovered(false);
    if (onCloseMobile) onCloseMobile();
    setTimeout(() => {
      const el = document.getElementById(`settings-section-${secId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 70);
  };

  const handleSettingsMainClick = () => {
    setActiveTab('settings');
    onSelectSettingsSection?.('all');
    setIsSettingsFlyoutOpen(false);
    setIsFloatingFlyoutOpen(false);
    if (!isPinned) setIsHovered(false);
    if (onCloseMobile) onCloseMobile();
    setTimeout(() => {
      const mainEl = document.querySelector('main');
      if (mainEl) mainEl.scrollTo({ top: 0, behavior: 'smooth' });
      else window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 50);
  };

  const settingsSections = [
    {
      id: 'general' as const,
      num: '١',
      numEn: '1',
      title: lang === 'en' ? 'General Settings' : lang === 'ar' ? 'الإعدادات العامة' : 'ڕێکخستنی گشتی',
      icon: Settings,
      color: 'text-[#1D7AFC] bg-[#1D7AFC]/10 border-[#1D7AFC]/20',
      visible: true
    },
    {
      id: 'currencies' as const,
      num: '٢',
      numEn: '2',
      title: lang === 'en' ? 'Currencies & Locations' : lang === 'ar' ? 'العملات والمواقع' : 'دراو و شوێن',
      icon: Coins,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      visible: isOwner
    },
    {
      id: 'employees' as const,
      num: '٣',
      numEn: '3',
      title: lang === 'en' ? 'Staff' : lang === 'ar' ? 'الموظفين' : 'کارمەند',
      icon: Users,
      color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
      visible: canManageEmployees
    },
    {
      id: 'data' as const,
      num: '٤',
      numEn: '4',
      title: lang === 'en' ? 'Data & Information' : lang === 'ar' ? 'البيانات والمعلومات' : 'داتا و زانیاری',
      icon: ShieldAlert,
      color: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
      visible: isOwner
    }
  ];

  const flyoutItems = [
    ...settingsSections.filter(s => s.visible).map(sec => ({
      id: sec.id,
      type: 'section' as const,
      num: isEn ? sec.numEn : sec.num,
      title: sec.title,
      icon: sec.icon,
      color: sec.color,
      onClick: () => handleSectionClick(sec.id),
      isLogout: false,
    })),
    {
      id: 'logout',
      type: 'logout' as const,
      num: isEn ? '5' : '٥',
      title: t.logout || (lang === 'en' ? 'Log Out' : lang === 'ar' ? 'تسجيل الخروج' : 'چوونە دەرەوە'),
      icon: LogOut,
      color: 'text-rose-400 bg-rose-500/15 border-rose-500/25',
      onClick: onLogout,
      isLogout: true,
    }
  ];

  // Interactive Hovering & Pinning logic
  const [isPinned, setIsPinned] = useState<boolean>(() => {
    const saved = localStorage.getItem('sidebar_pinned');
    return saved !== null ? saved === 'true' : true; 
  });
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const hoverTimeout = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (hoverTimeout.current) {
      clearTimeout(hoverTimeout.current);
      hoverTimeout.current = null;
    }
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    if (isPinned) return;
    hoverTimeout.current = setTimeout(() => {
      setIsHovered(false);
    }, 350);
  };

  useEffect(() => {
    return () => {
      if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    };
  }, []);

  const isDrawerOpen = isOpenMobile || isPinned || isHovered;

  const renderFlyoutMenu = (onMouseEnter: () => void, onMouseLeave: () => void) => (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`absolute bottom-full mb-2 ${isEn ? 'left-0' : 'right-0'} flex flex-col gap-1.5 z-50 w-64 p-2 rounded-2xl bg-slate-950/80 backdrop-blur-2xl border border-white/[0.12] shadow-[0_20px_50px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.2)] before:absolute before:inset-x-0 before:-bottom-4 before:h-6 before:content-['']`}
      dir={isEn ? 'ltr' : 'rtl'}
    >
      {flyoutItems.map((item) => {
        const IconComp = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              item.onClick();
              setIsSettingsFlyoutOpen(false);
              setIsFloatingFlyoutOpen(false);
            }}
            className={`w-full group/item flex items-center gap-2.5 p-2.5 rounded-xl cursor-pointer transition-colors duration-200 ${
              item.isLogout 
                ? 'hover:bg-rose-500/15 text-rose-300' 
                : 'hover:bg-white/[0.08] text-slate-200 hover:text-white'
            } ${isEn ? 'text-left' : 'text-right'}`}
          >
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border transition-transform duration-200 ease-out group-hover/item:scale-110 ${item.color}`}>
              <IconComp className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <span className={`font-mono text-xs font-bold shrink-0 ${item.isLogout ? 'text-rose-400' : 'text-[#1D7AFC]'}`}>{item.num}.</span>
              <span className="text-xs font-semibold tracking-wide truncate">
                {item.title}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );

  return (
    <>
      {/* Spacer zone: reserves 250px on desktop when pinned */}
      <div 
        className={`hidden md:block transition-all duration-300 shrink-0 no-print ${
          isPinned ? 'w-[250px]' : 'w-0'
        }`}
      />

      {/* Edge hover trigger area for sliding out the sidebar when unpinned */}
      {!isPinned && !isFloatingFlyoutOpen && (
        <div
          onMouseEnter={handleMouseEnter}
          className={`hidden md:block fixed top-0 bottom-24 ${isEn ? 'left-0' : 'right-0'} w-5 z-30 cursor-pointer group/edge`}
          title={lang === 'en' ? 'Slide to open menu' : lang === 'ar' ? 'تمرير لفتح القائمة' : 'بۆ کردنەوەی مێنۆ'}
        >
          <div className={`absolute top-1/2 -translate-y-1/2 ${isEn ? 'left-1' : 'right-1'} w-1 h-14 rounded-full bg-[#1D7AFC]/30 group-hover/edge:bg-[#1D7AFC]/70 group-hover/edge:h-20 transition-all duration-300 ease-out`} />
        </div>
      )}

      {/* Floating Settings & Theme button when menu is closed */}
      {!isPinned && (
        <div 
          className={`hidden md:flex flex-col gap-2.5 items-center fixed bottom-5 ${isEn ? 'left-5' : 'right-5'} z-40 transition-all duration-300 ease-out ${
            !isHovered || isFloatingFlyoutOpen
              ? 'opacity-100 translate-y-0 pointer-events-auto' 
              : 'opacity-0 translate-y-3 pointer-events-none'
          }`}
        >
          <div
            className="relative"
            onMouseEnter={handleFloatingMouseEnter}
            onMouseLeave={handleFloatingMouseLeave}
          >
            {isFloatingFlyoutOpen && renderFlyoutMenu(handleFloatingMouseEnter, handleFloatingMouseLeave)}

            <button
              type="button"
              onClick={handleSettingsMainClick}
              title={t.settings_title || 'ڕێکخستنەکان'}
              className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-300 ease-out cursor-pointer backdrop-blur-xl border border-white/[0.15] shadow-[0_10px_30px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.2)] ${
                activeTab === 'settings'
                  ? 'bg-[#1D7AFC] text-white shadow-[0_4px_20px_rgba(29,122,252,0.5)] scale-105'
                  : 'bg-slate-950/60 text-slate-300 hover:text-white hover:bg-slate-900/80 hover:scale-105'
              }`}
            >
              <Settings className={`w-4 h-4 transition-transform duration-300 ${activeTab === 'settings' ? 'rotate-90 text-white' : 'hover:rotate-45'}`} />
            </button>
          </div>

          {onThemeModeChange && (
            <button
              type="button"
              onClick={() => {
                const nextMode = (settings.themeMode === 'midnight' || settings.themeMode === 'dark') ? 'sky_light' : 'midnight';
                onThemeModeChange(nextMode);
              }}
              className="w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-300 ease-out cursor-pointer backdrop-blur-xl bg-slate-950/60 border border-white/[0.15] text-slate-300 hover:text-white hover:bg-slate-900/80 hover:scale-105 shadow-[0_10px_30px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.2)]"
            >
              {(settings.themeMode === 'midnight' || settings.themeMode === 'dark') ? (
                <Sun className="w-4 h-4 text-amber-400 hover:rotate-45 transition-transform duration-300" />
              ) : (
                <Moon className="w-4 h-4 text-cyan-300 hover:-rotate-12 transition-transform duration-300" />
              )}
            </button>
          )}
        </div>
      )}

      {/* Main Glass Sidebar Drawer */}
      <aside 
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`fixed top-3 bottom-3 ${isEn ? 'left-3' : 'right-3'} z-50 md:z-45 w-[250px] flex flex-col rounded-2xl bg-slate-950/35 backdrop-blur-2xl backdrop-saturate-150 border border-white/[0.12] shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.22),inset_0_0_24px_rgba(255,255,255,0.03),0_20px_50px_rgba(0,0,0,0.45)] no-print transition-all duration-300 ease-out overflow-hidden ${
          isDrawerOpen 
            ? 'opacity-100 translate-x-0 pointer-events-auto' 
            : isEn ? '-translate-x-[280px] opacity-0 pointer-events-none' : 'translate-x-[280px] opacity-0 pointer-events-none'
        }`}
      >
        {/* Specular Inner Glint line */}
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/35 to-transparent pointer-events-none z-30" />

        {/* Header containing brand and pin lock */}
        <div className="py-4 px-4 border-b border-white/[0.08] flex items-center justify-between relative z-10 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {settings.officeLogo ? (
              <div className="w-8 h-8 rounded-xl overflow-hidden shrink-0 flex items-center justify-center border border-white/[0.1] bg-white/[0.05]">
                <img src={settings.officeLogo} alt="Logo" className="w-full h-full object-contain" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-xl shrink-0 flex items-center justify-center border border-[#1D7AFC]/30 bg-[#1D7AFC]/15 text-[#1D7AFC] shadow-[0_0_15px_rgba(29,122,252,0.3)]">
                <Vault className="w-4 h-4" />
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-white tracking-tight truncate">
                {settings.officeName || t.settings_title}
              </h1>
              <p className="text-[10px] text-slate-400 truncate mt-0.5">{t.system_monitoring}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Desktop Pin Lock */}
            <button
              onClick={() => {
                const nextPin = !isPinned;
                setIsPinned(nextPin);
                localStorage.setItem('sidebar_pinned', String(nextPin));
                if (nextPin) setIsHovered(false);
              }}
              title={isPinned ? 'Unpin menu' : 'Pin menu'}
              className={`hidden md:inline-flex p-1.5 rounded-lg transition-all duration-200 border cursor-pointer ${
                isPinned 
                  ? 'bg-[#1D7AFC]/20 text-[#60A5FA] border-[#1D7AFC]/30 shadow-[0_0_10px_rgba(29,122,252,0.25)]' 
                  : 'bg-white/[0.05] text-slate-400 border-white/[0.1] hover:text-white hover:bg-white/[0.1]'
              }`}
            >
              {isPinned ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            </button>

            {onCloseMobile && (
              <button 
                onClick={onCloseMobile}
                className="md:hidden p-1.5 rounded-lg bg-white/[0.05] border border-white/[0.1] text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Navigation list with GSAP Liquid Sliding Pill */}
        <div className="flex-1 p-2.5 overflow-y-auto relative z-10 scrollbar-none">
          <div ref={navContainerRef} className="relative flex flex-col gap-1">
            {/* The single floating liquid GSAP pill */}
            <div 
              ref={activePillRef} 
              className="absolute left-0 right-0 rounded-xl bg-[#1D7AFC] shadow-[0_4px_20px_rgba(29,122,252,0.45),inset_0_1px_0_rgba(255,255,255,0.35)] pointer-events-none z-0" 
            />

            {menuItems.map((item) => {
              if (!item.visible) return null;
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              
              return (
                <button
                  key={item.id}
                  ref={(el) => {
                    itemRefs.current[item.id] = el;
                  }}
                  onClick={() => {
                    setActiveTab(item.id);
                    if (!isPinned) setIsHovered(false);
                  }}
                  className={`w-full relative z-10 flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors duration-200 select-none ${
                    isEn ? 'text-left' : 'text-right'
                  } ${
                    isActive 
                      ? 'text-white font-semibold' 
                      : 'text-slate-300 hover:text-white hover:bg-white/[0.05]'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
                    isActive ? 'text-white scale-110' : 'text-slate-400'
                  }`} />
                  <span className="flex-1 text-xs tracking-wide truncate">
                    {item.label}
                  </span>
                  {isActive && (
                    <div className="w-1.5 h-1.5 rounded-full bg-white shrink-0 shadow-[0_0_8px_white]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer profile & settings action bar */}
        <div className="p-3 border-t border-white/[0.08] bg-slate-950/40 relative z-10 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {currentUser && 'avatar' in currentUser && currentUser.avatar ? (
                <img 
                  src={currentUser.avatar} 
                  alt={currentUser.name} 
                  className="w-8 h-8 rounded-full object-cover shrink-0 border border-white/[0.15]" 
                />
              ) : (
                <div className="w-8 h-8 rounded-xl bg-[#1D7AFC]/20 border border-[#1D7AFC]/30 flex items-center justify-center shrink-0 text-[#60A5FA] font-bold text-xs shadow-[0_0_12px_rgba(29,122,252,0.25)]">
                  {currentUser?.name ? currentUser.name.charAt(0) : 'K'}
                </div>
              )}
              <div className={`min-w-0 flex-1 ${isEn ? 'text-left' : 'text-right'}`}>
                <h2 className="text-xs font-semibold text-white truncate">
                  {currentUser?.name}
                </h2>
                <div className="flex items-center gap-1 mt-0.5 justify-start">
                  <span className={`inline-block px-1.5 py-0.2 rounded-full text-[9px] font-medium tracking-wide ${roleBadgeClass}`}>
                    {roleLabel}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {/* Theme Mode Toggle (Sun / Moon) */}
              {onThemeModeChange && (
                <button
                  type="button"
                  onClick={() => {
                    const nextMode = (settings.themeMode === 'midnight' || settings.themeMode === 'dark') ? 'sky_light' : 'midnight';
                    onThemeModeChange(nextMode);
                  }}
                  className="w-8 h-8 rounded-lg transition-all duration-200 cursor-pointer flex items-center justify-center shrink-0 bg-white/[0.05] border border-white/[0.1] text-slate-300 hover:text-white hover:bg-white/[0.1]"
                  title="Toggle Theme"
                >
                  {(settings.themeMode === 'midnight' || settings.themeMode === 'dark') ? (
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                  ) : (
                    <Moon className="w-3.5 h-3.5 text-cyan-300" />
                  )}
                </button>
              )}

              {/* Settings button with hover flyout trigger */}
              <div
                onMouseEnter={handleSettingsMouseEnter}
                onMouseLeave={handleSettingsMouseLeave}
                className="relative"
              >
                {isSettingsFlyoutOpen && renderFlyoutMenu(handleSettingsMouseEnter, handleSettingsMouseLeave)}

                <button
                  type="button"
                  onClick={handleSettingsMainClick}
                  title={t.settings_title || 'ڕێکخستنەکان'}
                  className={`w-8 h-8 rounded-lg transition-all duration-200 cursor-pointer flex items-center justify-center shrink-0 border ${
                    activeTab === 'settings'
                      ? 'bg-[#1D7AFC] text-white border-[#1D7AFC] shadow-[0_0_12px_rgba(29,122,252,0.4)]'
                      : 'bg-white/[0.05] border-white/[0.1] text-slate-300 hover:text-white hover:bg-white/[0.1]'
                  }`}
                >
                  <Settings className={`w-3.5 h-3.5 transition-transform duration-300 ${activeTab === 'settings' ? 'rotate-90 text-white' : ''}`} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
