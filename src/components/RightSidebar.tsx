import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import gsap from 'gsap';
import { 
  LayoutDashboard, Vault, Users, ArrowLeftRight, Send, 
  BarChart3, Settings, LogOut, X, Trash2, PlusCircle,
  Coins, ShieldAlert, Sun, Moon,
  PanelRightClose, PanelRightOpen, PanelLeftClose, PanelLeftOpen
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

  // Click-only expand/collapse state (persisted to localStorage)
  const [isExpanded, setIsExpanded] = useState<boolean>(() => {
    const saved = localStorage.getItem('sidebar_expanded');
    return saved !== null ? saved === 'true' : true; 
  });

  const [isLogoHovered, setIsLogoHovered] = useState<boolean>(false);

  const toggleSidebar = () => {
    setIsExpanded((prev) => {
      const next = !prev;
      localStorage.setItem('sidebar_expanded', String(next));
      return next;
    });
  };

  const effectiveExpanded = Boolean(isOpenMobile || isExpanded);
  const sidebarRef = useRef<HTMLElement>(null);
  const isInitialMount = useRef<boolean>(true);

  // Cirrel Smooth Folding GSAP Motion (locked to exact 256px / 68px)
  useLayoutEffect(() => {
    const sidebar = sidebarRef.current;
    if (!sidebar) return;

    if (isInitialMount.current) {
      isInitialMount.current = false;
      if (effectiveExpanded) {
        gsap.set(sidebar, { width: 256 });
        gsap.set('.sidebar-text-wrap', { opacity: 1, x: 0, width: 'auto', pointerEvents: 'auto' });
      } else {
        gsap.set(sidebar, { width: 68 });
        gsap.set('.sidebar-text-wrap', { opacity: 0, x: -10, width: 0, pointerEvents: 'none' });
      }
      return;
    }

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { overwrite: 'auto', force3D: true }
      });

      if (effectiveExpanded) {
        // 1. Smoothly expand the glass sidebar container width
        tl.to(sidebar, {
          width: 256,
          duration: 0.55,
          ease: 'expo.out',
        }, 0)
        // 2. Softly unfold & glide text labels into view
        .fromTo(
          '.sidebar-text-wrap',
          { opacity: 0, x: -12, width: 0 },
          {
            opacity: 1,
            x: 0,
            width: 'auto',
            duration: 0.45,
            stagger: 0.015,
            ease: 'expo.out',
          },
          0.06
        );
      } else {
        // 1. Smoothly fold text labels into each other and fade out
        tl.to('.sidebar-text-wrap', {
          opacity: 0,
          x: -10,
          width: 0,
          duration: 0.35,
          ease: 'power3.inOut',
        }, 0)
        // 2. Smoothly contract sidebar width around the stationary icons
        .to(sidebar, {
          width: 68,
          duration: 0.5,
          ease: 'expo.inOut',
        }, 0.02);
      }
    }, sidebar);

    return () => ctx.revert();
  }, [effectiveExpanded]);

  // Active Blue GSAP Pill positioning & animated caterpillar stretching (triggered strictly by activeTab)
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
      gsap.set(pill, { 
        y: targetY, 
        height: targetH, 
        opacity: 1 
      });
      prevRectRef.current = { top: targetY, height: targetH };
      return;
    }

    const startY = prevRectRef.current.top;
    const startH = prevRectRef.current.height;
    prevRectRef.current = { top: targetY, height: targetH };

    gsap.killTweensOf(pill);
    gsap.set(pill, { opacity: 1 });

    if (Math.abs(targetY - startY) > 2) {
      // Phase 1: Anchor & stretch across intermediate items
      const spanTop = Math.min(startY, targetY);
      const spanBottom = Math.max(startY + startH, targetY + targetH);
      const fullStretchHeight = spanBottom - spanTop;

      const tl = gsap.timeline();
      tl.to(pill, {
        y: spanTop,
        height: fullStretchHeight,
        duration: 0.24,
        ease: 'power2.out',
      })
      // Phase 2: Smoothly retract trailing edge into new target
      .to(pill, {
        y: targetY,
        height: targetH,
        duration: 0.38,
        ease: 'expo.out',
      }, '-=0.06');
    } else {
      gsap.to(pill, {
        y: targetY,
        height: targetH,
        duration: 0.3,
        ease: 'power3.out',
      });
    }
  }, [activeTab]);

  // Handle window resize & font-size changes safely without killing active caterpillar tweens
  useEffect(() => {
    const updatePillStatic = () => {
      const pill = activePillRef.current;
      const container = navContainerRef.current;
      const targetEl = itemRefs.current[activeTab];
      if (!pill || !container || !targetEl) return;

      // Never cancel or interrupt an in-flight caterpillar stretch
      if (gsap.isTweening(pill)) return;

      const containerRect = container.getBoundingClientRect();
      const targetRect = targetEl.getBoundingClientRect();
      const targetY = targetRect.top - containerRect.top;
      const targetH = targetRect.height;

      prevRectRef.current = { top: targetY, height: targetH };
      gsap.set(pill, { y: targetY, height: targetH });
    };

    window.addEventListener('resize', updatePillStatic);
    return () => window.removeEventListener('resize', updatePillStatic);
  }, [activeTab, settings.fontSize]);

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

  const handleSettingsMouseEnter = () => {
    if (settingsHoverTimer.current) {
      clearTimeout(settingsHoverTimer.current);
      settingsHoverTimer.current = null;
    }
    setIsSettingsFlyoutOpen(true);
  };

  const handleSettingsMouseLeave = () => {
    if (settingsHoverTimer.current) clearTimeout(settingsHoverTimer.current);
    settingsHoverTimer.current = setTimeout(() => {
      setIsSettingsFlyoutOpen(false);
    }, 150);
  };

  useEffect(() => {
    return () => {
      if (settingsHoverTimer.current) clearTimeout(settingsHoverTimer.current);
    };
  }, []);

  const handleSectionClick = (secId: 'general' | 'currencies' | 'employees' | 'data') => {
    setActiveTab('settings');
    onSelectSettingsSection?.(secId);
    setIsSettingsFlyoutOpen(false);
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

  const renderFlyoutMenu = (onMouseEnter: () => void, onMouseLeave: () => void) => (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`absolute bottom-full mb-2 ${isEn ? 'left-0' : 'right-0'} flex flex-col gap-1.5 z-50 w-64 max-h-[75vh] overflow-y-auto p-2 rounded-2xl bg-slate-950/90 backdrop-blur-2xl backdrop-saturate-150 border border-white/[0.15] shadow-[0_20px_50px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.22)] before:absolute before:-inset-3 before:content-[''] before:-z-10 settings-popover-animated transform-gpu`}
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

  const mobileTranslateClass = isOpenMobile
    ? 'max-md:translate-x-0 max-md:opacity-100 max-md:pointer-events-auto'
    : isEn
      ? 'max-md:-translate-x-[130%] max-md:opacity-0 max-md:pointer-events-none'
      : 'max-md:translate-x-[130%] max-md:opacity-0 max-md:pointer-events-none';

  return (
    <>
      {/* Spacer zone: reserves 256px on desktop when expanded, 68px when collapsed */}
      <div 
        className={`hidden md:block transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] shrink-0 no-print ${
          effectiveExpanded ? 'w-[256px]' : 'w-[68px]'
        }`}
      />

      {/* Main Glass Sidebar Drawer */}
      <aside 
        ref={sidebarRef}
        style={{ width: effectiveExpanded ? 256 : 68 }}
        className={`fixed top-3 bottom-3 ${isEn ? 'left-3' : 'right-3'} z-50 md:z-45 flex flex-col rounded-2xl bg-slate-950/40 backdrop-blur-2xl backdrop-saturate-150 border border-white/[0.12] shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.22),inset_0_0_24px_rgba(255,255,255,0.03),0_20px_50px_rgba(0,0,0,0.45)] no-print transform-gpu overflow-hidden transition-[transform,opacity] duration-300 md:transition-none ${mobileTranslateClass}`}
      >
        {/* Specular Inner Glint line */}
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/35 to-transparent pointer-events-none z-30" />

        {/* 1. Top Brand Header: Stationary 44px Icon Slot + Folding Text / Collapse Button */}
        <div className="px-[12px] py-[12px] flex items-center gap-[8px] border-b border-white/[0.08] relative z-10 shrink-0">
          {/* Fixed 44px x 44px Icon Slot (Always at exactly 12px from edge) */}
          <div className="w-[44px] h-[44px] min-w-[44px] shrink-0 flex items-center justify-center">
            <button
              type="button"
              onClick={!effectiveExpanded ? toggleSidebar : undefined}
              onMouseEnter={() => setIsLogoHovered(true)}
              onMouseLeave={() => setIsLogoHovered(false)}
              title={!effectiveExpanded ? (lang === 'en' ? 'Open sidebar' : lang === 'ar' ? 'توسيع القائمة' : 'کردنەوەی مێنۆ') : undefined}
              className={`w-[38px] h-[38px] rounded-[12px] border border-white/[0.1] bg-white/[0.05] flex items-center justify-center overflow-hidden relative shadow-[0_0_15px_rgba(29,122,252,0.2)] ${
                !effectiveExpanded ? 'cursor-pointer hover:border-[#1D7AFC]/50 hover:bg-[#1D7AFC]/15 transition-all' : 'cursor-default'
              }`}
            >
              {/* Normal Logo */}
              <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${
                !effectiveExpanded && isLogoHovered ? 'opacity-0 scale-75 rotate-12' : 'opacity-100 scale-100 rotate-0'
              }`}>
                {settings.officeLogo ? (
                  <img src={settings.officeLogo} alt="Logo" className="w-full h-full object-contain p-1" />
                ) : (
                  <Vault size={18} className="text-[#1D7AFC]" />
                )}
              </div>

              {/* Open Sidebar icon on hover when collapsed */}
              {!effectiveExpanded && (
                <div className={`absolute inset-0 flex items-center justify-center bg-[#1D7AFC]/30 transition-all duration-300 ${
                  isLogoHovered ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-75 -rotate-12'
                }`}>
                  {isEn ? (
                    <PanelLeftOpen size={18} className="text-white animate-pulse" />
                  ) : (
                    <PanelRightOpen size={18} className="text-white animate-pulse" />
                  )}
                </div>
              )}
            </button>
          </div>

          {/* Folding Text Wrap (Brand Title + Collapse Toggle) */}
          <div className="sidebar-text-wrap flex-1 flex items-center justify-between min-w-0 overflow-hidden whitespace-nowrap">
            <div className="min-w-0 flex-1">
              <h1 className="text-sm font-bold text-white tracking-tight truncate">
                {settings.officeName || t.settings_title}
              </h1>
              <p className="text-[10px] text-slate-400 truncate mt-0.5">{t.system_monitoring}</p>
            </div>

            <button
              type="button"
              onClick={toggleSidebar}
              title={lang === 'en' ? 'Collapse sidebar' : lang === 'ar' ? 'طي الشريط الجانبي' : 'شاردنەوەی سایدبار'}
              className="w-[32px] h-[32px] rounded-[8px] bg-white/[0.05] hover:bg-white/[0.12] border border-white/[0.1] flex items-center justify-center text-slate-300 hover:text-white transition-all cursor-pointer shrink-0 ms-[8px] active:scale-95"
            >
              {isEn ? <PanelLeftClose size={16} /> : <PanelRightClose size={16} />}
            </button>
          </div>

          {/* Mobile Close Button */}
          {onCloseMobile && (
            <button 
              onClick={onCloseMobile}
              className="md:hidden p-2 rounded-xl bg-white/[0.05] border border-white/[0.1] text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* 2. Navigation List: Fixed 44px Icon Slots + Folding Labels + Synchronous Liquid Pill */}
        <div className="flex-1 w-full overflow-y-auto relative z-10 scrollbar-none py-[8px]">
          <div 
            ref={navContainerRef} 
            className="relative w-full flex flex-col gap-[6px] px-[12px]"
          >
            {/* The single floating liquid GSAP pill (exact 44px when collapsed, 232px when expanded) */}
            <div 
              ref={activePillRef} 
              className="absolute top-0 left-[12px] right-[12px] rounded-[12px] bg-[#1D7AFC] shadow-[0_4px_20px_rgba(29,122,252,0.45),inset_0_1px_0_rgba(255,255,255,0.35)] pointer-events-none z-0" 
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
                  }}
                  title={!effectiveExpanded ? item.label : undefined}
                  className={`w-full h-[44px] flex items-center rounded-[12px] cursor-pointer select-none transition-colors duration-200 relative z-10 ${
                    isActive 
                      ? 'text-white font-semibold' 
                      : 'text-slate-300 hover:text-white hover:bg-white/[0.05]'
                  }`}
                >
                  {/* Fixed Non-Shrinking 44px Icon Slot */}
                  <div className="w-[44px] h-[44px] min-w-[44px] shrink-0 flex items-center justify-center">
                    <Icon size={18} className={`transition-transform duration-200 ${
                      isActive ? 'text-white scale-110' : 'text-slate-400'
                    }`} />
                  </div>

                  {/* Folding Label Wrap */}
                  <div className={`sidebar-text-wrap flex-1 flex items-center justify-between min-w-0 overflow-hidden whitespace-nowrap pe-[8px] ${isEn ? 'text-left' : 'text-right'}`}>
                    <span className="text-xs font-medium tracking-wide truncate">
                      {item.label}
                    </span>

                    {isActive && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white shrink-0 shadow-[0_0_8px_white] ms-2" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Bottom Profile & Settings: Stationary 44px Avatar Slot + Folding Controls */}
        <div className="px-[12px] py-[12px] flex items-center gap-[8px] border-t border-white/[0.08] bg-slate-950/40 relative z-20 shrink-0 rounded-b-2xl overflow-visible">
          {/* Fixed 44px x 44px Avatar Slot (Always at exactly 12px from edge) */}
          <div className="w-[44px] h-[44px] min-w-[44px] shrink-0 flex items-center justify-center">
            <button
              type="button"
              onClick={!effectiveExpanded ? toggleSidebar : undefined}
              title={!effectiveExpanded ? (currentUser?.name || 'User') : undefined}
              className={`w-[38px] h-[38px] rounded-[12px] text-[15px] border border-white/[0.15] bg-[#1D7AFC]/20 text-[#60A5FA] font-bold shadow-[0_0_12px_rgba(29,122,252,0.25)] flex items-center justify-center overflow-hidden ${
                !effectiveExpanded ? 'cursor-pointer hover:scale-105 transition-transform' : 'cursor-default'
              }`}
            >
              {currentUser && 'avatar' in currentUser && currentUser.avatar ? (
                <img 
                  src={currentUser.avatar} 
                  alt={currentUser.name} 
                  className="w-full h-full object-cover" 
                />
              ) : (
                <span className="font-mono">
                  {currentUser?.name ? currentUser.name.charAt(0) : 'خ'}
                </span>
              )}
            </button>
          </div>

          {/* Folding User Info & Action Controls */}
          <div className="sidebar-text-wrap flex-1 flex items-center justify-between min-w-0 overflow-hidden whitespace-nowrap">
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

            <div className="flex items-center gap-[4px] shrink-0 ms-[8px]">
              {/* Theme Mode Toggle (Sun / Moon) */}
              {onThemeModeChange && (
                <button
                  type="button"
                  onClick={() => {
                    const nextMode = (settings.themeMode === 'midnight' || settings.themeMode === 'dark') ? 'sky_light' : 'midnight';
                    onThemeModeChange(nextMode);
                  }}
                  className="w-[32px] h-[32px] rounded-[8px] transition-all duration-200 cursor-pointer flex items-center justify-center shrink-0 bg-white/[0.05] border border-white/[0.1] text-slate-300 hover:text-white hover:bg-white/[0.1]"
                  title="Toggle Theme"
                >
                  {(settings.themeMode === 'midnight' || settings.themeMode === 'dark') ? (
                    <Sun size={14} className="text-amber-400" />
                  ) : (
                    <Moon size={14} className="text-cyan-300" />
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
                  className={`w-[32px] h-[32px] rounded-[8px] transition-all duration-200 cursor-pointer flex items-center justify-center shrink-0 border ${
                    activeTab === 'settings'
                      ? 'bg-[#1D7AFC] text-white border-[#1D7AFC] shadow-[0_0_12px_rgba(29,122,252,0.4)]'
                      : 'bg-white/[0.05] border-white/[0.1] text-slate-300 hover:text-white hover:bg-white/[0.1]'
                  }`}
                >
                  <Settings size={14} className={`transition-transform duration-300 ${activeTab === 'settings' ? 'rotate-90 text-white' : ''}`} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
