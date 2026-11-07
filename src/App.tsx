import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { Menu, Loader2, Database, Coins, Sparkles, Globe, Sun, Moon } from 'lucide-react';
import { translations } from './data/translations';
import { 
  getInitialState, saveState, AppState, ensureSystemAccounts,
  handleDepositWithdrawal, handleCurrencyExchange, handleEditCurrencyExchange,
  handleFastTransferCreate, handleFastTransferDeliver, handleFastTransferCancel,
  handleStandardTransfer, handleInternalTransfer, 
  handleDeleteFastTransfer, handleDeleteStandardTransfer,
  handleEditFastTransfer, handleEditStandardTransfer,
  handleSaveCustomer, handleDeleteCustomer, 
  handleSaveSettings, handleSaveEmployee, handleEditEmployee, handleDeleteEmployee,
  handleAddCurrency, handleDeleteCurrency, handleResetAllData, handleDeleteTransaction, handleEditExpense,
  recalculateSystemCustomerBalances, recalculateSafeBalances, handleEditTransactionNotes, handleEditVaultTransaction,
  ensureTransferFeeTransactions
} from './data/stateManager';
import { 
  authenticateSession, fetchAppStateFromFirebase, seedInitialCleanState,
  syncSettings, syncCurrenciesState, syncUser, syncDeleteUser,
  syncCustomer, syncDeleteCustomer, syncTransaction, syncFastTransfer,
  syncStandardTransfer, resetFirestoreDatabase, syncDeletedRecord,
  syncDeleteTransaction, syncDeleteFastTransfer, syncDeleteStandardTransfer,
  listenToUsers, listenToSettings, listenToCurrenciesState,
  listenToCustomers, listenToTransactions, listenToFastTransfers, listenToStandardTransfers,
  listenToDeletedRecords
} from './data/firebaseSync';
import { isQuotaExhausted } from './data/firebase';
import { AppUser, Customer, Currency, SystemSettings } from './types';
import { generateTransactionId } from './utils';
import ConfirmModal from './components/ConfirmModal';

// View Imports
import RightSidebar, { SidebarTab } from './components/RightSidebar';
import AppLoader from './components/AppLoader';
import LoginView from './components/LoginView';
import DashboardView from './components/DashboardView';
import UniversalEntryView from './components/UniversalEntryView';
import SafeView from './components/SafeView';
import CustomersView from './components/CustomersView';
import ExchangeView from './components/ExchangeView';
import TransfersView from './components/TransfersView';
import ReportsView from './components/ReportsView';
import SettingsView from './components/SettingsView';
import DeletedRecordsView from './components/DeletedRecordsView';
import ReceiptPrint from './components/ReceiptPrint';

const THEME_VARIABLES: Record<string, { dark: string; primary: string; light: string }> = {
  blue: { dark: '#1e3a8a', primary: '#1d4ed8', light: '#eff6ff' },
  indigo: { dark: '#312e81', primary: '#4338ca', light: '#e0e7ff' },
  slate: { dark: '#1e293b', primary: '#475569', light: '#f1f5f9' },
  emerald: { dark: '#064e3b', primary: '#059669', light: '#ecfdf5' },
  teal: { dark: '#134e4a', primary: '#0d9488', light: '#ccfbf1' },
  purple: { dark: '#581c87', primary: '#7e22ce', light: '#f3e8ff' },
  amber: { dark: '#78350f', primary: '#d97706', light: '#fef3c7' },
  rose: { dark: '#881337', primary: '#e11d48', light: '#ffe4e6' },
  violet: { dark: '#4c1d95', primary: '#6d28d9', light: '#ede9fe' },
  cyan: { dark: '#164e63', primary: '#0891b2', light: '#cffaff' }
};

export default function App() {
  const [appState, setAppState] = useState<AppState>(getInitialState);

  // Ensure system accounts (خەرجی, گۆڕینەوەی دراو, کرێی حەواڵە, قازانج) always exist in customers list
  useEffect(() => {
    setAppState(prev => {
      const updatedCustomers = ensureSystemAccounts(prev.customers);
      if (updatedCustomers.length !== prev.customers.length) {
        const nextState = { ...prev, customers: updatedCustomers };
        saveState(nextState);
        return nextState;
      }
      return prev;
    });
  }, []);
  const [localLang, setLocalLang] = useState<'ku' | 'en' | 'ar'>(() => {
    const saved = localStorage.getItem('hawala_local_lang') as 'ku' | 'en' | 'ar' | null;
    return saved || 'ku';
  });
  const [activeTab, setActiveTab] = useState<SidebarTab>('dashboard');
  const [settingsSection, setSettingsSection] = useState<'all' | 'general' | 'currencies' | 'employees' | 'data'>('all');
  const [isLoadingFirebase, setIsLoadingFirebase] = useState(true);
  const [showStartupLoader, setShowStartupLoader] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [txToDelete, setTxToDelete] = useState<string | null>(null);
  
  // Receipt data modal trigger state
  const [printData, setPrintData] = useState<{
    type: 'Fast' | 'Standard' | 'Transaction';
    data: any;
  } | null>(null);

  // Individual user theme preferences: Sky Blue (sky_light) or Midnight Black (midnight)
  const [userThemeMode, setUserThemeMode] = useState<'sky_light' | 'midnight' | 'light' | 'dark' | 'sepia' | 'navy' | 'soft_cream'>(() => {
    const savedGlobal = localStorage.getItem('hawala_current_theme_mode');
    if (savedGlobal) {
      if (savedGlobal === 'light') return 'sky_light';
      if (savedGlobal === 'dark') return 'midnight';
      return savedGlobal as any;
    }
    const initialUser = getInitialState().currentUser;
    const userId = initialUser?.id || 'guest';
    const saved = localStorage.getItem(`hawala_pref_mode_${userId}`) || localStorage.getItem('hawala_pref_mode_guest');
    if (saved === 'light') return 'sky_light';
    if (saved === 'dark') return 'midnight';
    return (saved as any) || 'sky_light';
  });

  const [userThemeColor, setUserThemeColor] = useState<'blue' | 'indigo' | 'slate' | 'emerald' | 'teal'>(() => {
    const initialUser = getInitialState().currentUser;
    const userId = initialUser?.id || 'guest';
    const saved = localStorage.getItem(`hawala_pref_color_${userId}`) || localStorage.getItem('hawala_pref_color_guest');
    return (saved as any) || 'teal';
  });

  const [userFontSize, setUserFontSize] = useState<'sm' | 'md' | 'lg'>(() => {
    const initialUser = getInitialState().currentUser;
    const userId = initialUser?.id || 'guest';
    const saved = localStorage.getItem(`hawala_pref_fontsize_${userId}`) || localStorage.getItem('hawala_pref_fontsize_guest');
    return (saved as 'sm' | 'md' | 'lg' | null) || 'md';
  });

  // Load preferences of the newly logged-in user or guest
  useEffect(() => {
    const userId = appState.currentUser?.id || 'guest';
    const savedGlobal = localStorage.getItem('hawala_current_theme_mode');
    let savedMode = savedGlobal || localStorage.getItem(`hawala_pref_mode_${userId}`) || localStorage.getItem('hawala_pref_mode_guest') || 'sky_light';
    if (savedMode === 'light') savedMode = 'sky_light';
    if (savedMode === 'dark') savedMode = 'midnight';
    const savedColor = localStorage.getItem(`hawala_pref_color_${userId}`) || localStorage.getItem('hawala_pref_color_guest') || 'teal';
    const savedFontSize = localStorage.getItem(`hawala_pref_fontsize_${userId}`) || localStorage.getItem('hawala_pref_fontsize_guest') || 'md';

    setUserThemeMode(savedMode as any);
    setUserThemeColor(savedColor as any);
    setUserFontSize(savedFontSize as any);
  }, [appState.currentUser?.id]);

  const viewContainerRef = useRef<HTMLDivElement>(null);

  // Silky Multi-Layered GSAP Entrance Choreography (On Section / Tab Switch)
  useLayoutEffect(() => {
    if (!viewContainerRef.current) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { force3D: true, ease: 'expo.out' }
      });

      // Stage 1: Section Header & Top Action Bar glide in
      tl.fromTo(
        '[data-animate="header"], header, .view-header',
        { opacity: 0, y: -14 },
        { opacity: 1, y: 0, duration: 0.4, clearProps: 'transform' },
        0
      );

      // Stage 2: Main Cards, Widgets & Panels cascade in with soft spring physics
      tl.fromTo(
        '[data-animate="card"], .bento-card, .glass-card, .stat-card',
        {
          opacity: 0,
          y: 28,
          scale: 0.95,
        },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.52,
          stagger: {
            each: 0.045,
            from: 'start',
          },
          ease: 'back.out(1.25)',
          clearProps: 'transform',
        },
        0.04
      );

      // Stage 3: Table Rows, List Items & Form Fields ripple in smoothly
      tl.fromTo(
        'tbody tr, [data-animate="row"], .list-item-row',
        {
          opacity: 0,
          y: 12,
        },
        {
          opacity: 1,
          y: 0,
          duration: 0.38,
          stagger: 0.02,
          ease: 'power3.out',
          clearProps: 'transform',
        },
        0.1
      );
    }, viewContainerRef);

    return () => ctx.revert();
  }, [activeTab, appState.currentUser?.id]);

  const handleUpdateThemeMode = (mode: 'light' | 'dark' | 'midnight' | 'sepia' | 'navy' | 'sky_light' | 'soft_cream') => {
    const normalizedMode = mode === 'light' ? 'sky_light' : mode === 'dark' ? 'midnight' : mode;
    const userId = appState.currentUser?.id || 'guest';
    setUserThemeMode(normalizedMode);
    localStorage.setItem('hawala_current_theme_mode', normalizedMode);
    localStorage.setItem(`hawala_pref_mode_${userId}`, normalizedMode);
    localStorage.setItem('hawala_pref_mode_guest', normalizedMode);
  };

  const handleUpdateThemeColor = (color: SystemSettings['themeColor']) => {
    const userId = appState.currentUser?.id || 'guest';
    setUserThemeColor(color);
    localStorage.setItem(`hawala_pref_color_${userId}`, color);
    if (userId === 'guest') {
      localStorage.setItem('hawala_pref_color_guest', color);
    }
  };

  const handleUpdateFontSize = (size: 'sm' | 'md' | 'lg') => {
    const userId = appState.currentUser?.id || 'guest';
    setUserFontSize(size);
    localStorage.setItem(`hawala_pref_fontsize_${userId}`, size);
    if (userId === 'guest') {
      localStorage.setItem('hawala_pref_fontsize_guest', size);
    }
  };

  // Derived state with overridden local language and individual user theme preferences
  const appStateWithLocalLang = {
    ...appState,
    settings: {
      ...appState.settings,
      language: localLang,
      themeColor: userThemeColor,
      themeMode: userThemeMode,
      fontSize: userFontSize
    }
  };

  const handleLocalLangChange = (newLang: 'ku' | 'en' | 'ar') => {
    setLocalLang(newLang);
    localStorage.setItem('hawala_local_lang', newLang);
  };

  // Synchronize dynamic theme colors, document direction, and font size class on language/theme changes
  useEffect(() => {
    const colors = THEME_VARIABLES[userThemeColor] || THEME_VARIABLES.teal;
    document.documentElement.style.setProperty('--theme-primary-dark', colors.dark);
    document.documentElement.style.setProperty('--theme-primary', colors.primary);
    
    // Toggle theme mode classes on document element
    document.documentElement.classList.remove('dark', 'midnight', 'sepia', 'navy', 'sky_light', 'soft_cream');
    
    if (userThemeMode === 'midnight' || userThemeMode === 'dark' || userThemeMode === 'navy') {
      document.documentElement.classList.add('midnight', 'dark');
      document.documentElement.style.setProperty('--theme-primary-light', colors.primary + '1e');
    } else {
      document.documentElement.classList.add('sky_light');
      document.documentElement.style.setProperty('--theme-primary-light', colors.light);
    }
    
    // Apply font size class on document element
    document.documentElement.classList.remove('text-size-sm', 'text-size-md', 'text-size-lg');
    document.documentElement.classList.add(`text-size-${userFontSize}`);
    
    // Also set document direction
    const lang = localLang;
    document.documentElement.dir = lang === 'en' ? 'ltr' : 'rtl';
  }, [userThemeColor, localLang, userThemeMode, userFontSize]);

  // Sync state changes with localStorage (local mirror/fallback)
  useEffect(() => {
    saveState(appState);
  }, [appState]);

  // Firebase Real-time Initialization and sync on mount
  useEffect(() => {
    let unsubscribes: (() => void)[] = [];

    async function initFirebase() {
      try {
        if (isQuotaExhausted()) {
          setIsLoadingFirebase(false);
          return;
        }
        await authenticateSession();
        if (isQuotaExhausted()) {
          setIsLoadingFirebase(false);
          return;
        }
        let fetched = await fetchAppStateFromFirebase();
        if (!fetched) {
          // No settings found, seed clean state in Firestore only if quota not reached
          if (!isQuotaExhausted()) {
            fetched = await seedInitialCleanState();
          }
        }
        if (!fetched) {
          setIsLoadingFirebase(false);
          return;
        }

        setAppState(prev => {
          let validatedCurrentUser = prev.currentUser;
          let validatedRole = prev.currentSessionRole;

          if (validatedCurrentUser) {
            if ('role' in validatedCurrentUser) {
              // Verify staff member exists in fetched users AND credentials match
              const currentStaff = validatedCurrentUser as AppUser;
              const match = fetched!.users.find(u => u.id === currentStaff.id);
              const isMatchValid = match && 
                match.password === currentStaff.password && 
                match.email === currentStaff.email;

              if (!isMatchValid) {
                // Staff member has been deleted or credentials changed! Wipe session immediately
                validatedCurrentUser = null;
                validatedRole = null;
                localStorage.removeItem('hawala_remember_me');
                sessionStorage.removeItem('hawala_session_user');
                sessionStorage.removeItem('hawala_session_role');
              } else {
                validatedCurrentUser = match;
              }
            } else {
              // Verify customer exists in fetched customers AND credentials match
              const currentCust = validatedCurrentUser as Customer;
              const match = fetched!.customers.find(c => c.id === currentCust.id);
              const isMatchValid = match &&
                (!currentCust.password || match.password === currentCust.password) &&
                (!currentCust.phone || match.phone === currentCust.phone);

              if (!isMatchValid) {
                // Customer has been deleted or credentials changed! Wipe session immediately
                validatedCurrentUser = null;
                validatedRole = null;
                localStorage.removeItem('hawala_remember_me');
                sessionStorage.removeItem('hawala_session_user');
                sessionStorage.removeItem('hawala_session_role');
              } else {
                validatedCurrentUser = match;
              }
            }
          }

          const calculatedSafe = recalculateSafeBalances(fetched!.transactions || [], fetched!.currencies || ['USD', 'IQD']);
          return {
            ...prev,
            ...fetched,
            safeBalances: calculatedSafe,
            currentUser: validatedCurrentUser,
            currentSessionRole: validatedRole
          };
        });

        // 1. Users real-time listener
        const unsubUsers = listenToUsers((realtimeUsers) => {
          setAppState(prev => {
            let updatedCurrentUser = prev.currentUser;
            let updatedSessionRole = prev.currentSessionRole;

            if (prev.currentUser && 'role' in prev.currentUser) {
              const currentStaff = prev.currentUser as AppUser;
              const match = realtimeUsers.find(u => u.id === currentStaff.id);
              
              const isDeleted = !match;
              const isCredentialsChanged = match && (
                match.password !== currentStaff.password ||
                match.email !== currentStaff.email
              );

              if (isDeleted || isCredentialsChanged) {
                // The staff user was deleted or their password/email was changed! Kick them out immediately
                updatedCurrentUser = null;
                updatedSessionRole = null;
                localStorage.removeItem('hawala_remember_me');
                sessionStorage.removeItem('hawala_session_user');
                sessionStorage.removeItem('hawala_session_role');
                const cleanState = {
                  ...prev,
                  users: realtimeUsers,
                  currentUser: null,
                  currentSessionRole: null
                };
                saveState(cleanState);
                return cleanState;
              } else {
                updatedCurrentUser = match;
              }
            }
            return {
              ...prev,
              users: realtimeUsers,
              currentUser: updatedCurrentUser,
              currentSessionRole: updatedSessionRole
            };
          });
        });
        unsubscribes.push(unsubUsers);

        // 2. Settings real-time listener
        const unsubSettings = listenToSettings((realtimeSettings) => {
          setAppState(prev => ({
            ...prev,
            settings: realtimeSettings
          }));
        });
        unsubscribes.push(unsubSettings);

        // 3. Currencies & Safe Balances real-time listener
        const unsubCurrencies = listenToCurrenciesState(({ currencies, safeBalances }) => {
          setAppState(prev => {
            const effectiveSafe = prev.transactions && prev.transactions.length > 0
              ? recalculateSafeBalances(prev.transactions, currencies)
              : safeBalances;
            return {
              ...prev,
              currencies,
              safeBalances: effectiveSafe
            };
          });
        });
        unsubscribes.push(unsubCurrencies);

        // 4. Customers real-time listener
        const unsubCustomers = listenToCustomers((realtimeCustomers) => {
          setAppState(prev => {
            let updatedCurrentUser = prev.currentUser;
            let updatedSessionRole = prev.currentSessionRole;

            if (prev.currentUser && !('role' in prev.currentUser)) {
              const currentCust = prev.currentUser as Customer;
              const match = realtimeCustomers.find(c => c.id === currentCust.id);
              
              const isDeleted = !match;
              const isCredentialsChanged = match && (
                (Boolean(currentCust.password) && match.password !== currentCust.password) ||
                (Boolean(currentCust.phone) && match.phone !== currentCust.phone)
              );

              if (isDeleted || isCredentialsChanged) {
                // The customer account was deleted or credentials changed! Wipe session immediately
                updatedCurrentUser = null;
                updatedSessionRole = null;
                localStorage.removeItem('hawala_remember_me');
                sessionStorage.removeItem('hawala_session_user');
                sessionStorage.removeItem('hawala_session_role');
                const cleanState = {
                  ...prev,
                  customers: realtimeCustomers,
                  currentUser: null,
                  currentSessionRole: null
                };
                saveState(cleanState);
                return cleanState;
              } else {
                updatedCurrentUser = match;
              }
            }
            
            let mergedCustomers = ensureSystemAccounts(realtimeCustomers);

            mergedCustomers = recalculateSystemCustomerBalances(
              mergedCustomers,
              prev.transactions,
              prev.fastTransfers,
              prev.standardTransfers
            );

            return {
              ...prev,
              customers: mergedCustomers,
              currentUser: updatedCurrentUser,
              currentSessionRole: updatedSessionRole
            };
          });
        });
        unsubscribes.push(unsubCustomers);

        // 5. Transactions real-time listener
        const unsubTx = listenToTransactions((realtimeTx) => {
          setAppState(prev => {
            const cleanTx = ensureTransferFeeTransactions(realtimeTx, prev.fastTransfers, prev.standardTransfers);
            const updatedCustomers = recalculateSystemCustomerBalances(
              prev.customers,
              cleanTx,
              prev.fastTransfers,
              prev.standardTransfers
            );
            const recalculatedSafe = recalculateSafeBalances(cleanTx, prev.currencies);
            return {
              ...prev,
              transactions: cleanTx,
              customers: updatedCustomers,
              safeBalances: recalculatedSafe
            };
          });
        });
        unsubscribes.push(unsubTx);

        // 6. Fast Transfers real-time listener
        const unsubFast = listenToFastTransfers((realtimeFast) => {
          setAppState(prev => {
            const cleanTx = ensureTransferFeeTransactions(prev.transactions, realtimeFast, prev.standardTransfers);
            const updatedCustomers = recalculateSystemCustomerBalances(
              prev.customers,
              cleanTx,
              realtimeFast,
              prev.standardTransfers
            );
            return {
              ...prev,
              fastTransfers: realtimeFast,
              transactions: cleanTx,
              customers: updatedCustomers
            };
          });
        });
        unsubscribes.push(unsubFast);

        // 7. Standard Transfers real-time listener
        const unsubStandard = listenToStandardTransfers((realtimeStandard) => {
          setAppState(prev => {
            const cleanTx = ensureTransferFeeTransactions(prev.transactions, prev.fastTransfers, realtimeStandard);
            const updatedCustomers = recalculateSystemCustomerBalances(
              prev.customers,
              cleanTx,
              prev.fastTransfers,
              realtimeStandard
            );
            return {
              ...prev,
              standardTransfers: realtimeStandard,
              transactions: cleanTx,
              customers: updatedCustomers
            };
          });
        });
        unsubscribes.push(unsubStandard);

        // 8. Deleted Records real-time listener
        const unsubDeleted = listenToDeletedRecords((realtimeDeleted) => {
          setAppState(prev => ({
            ...prev,
            deletedRecords: realtimeDeleted
          }));
        });
        unsubscribes.push(unsubDeleted);

      } catch (err) {
        console.warn("Firebase startup sync (running with offline cache):", err);
      } finally {
        setIsLoadingFirebase(false);
      }
    }
    initFirebase();

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, []);

  // Ensure IRR is purged if it existed in old session or Firestore
  useEffect(() => {
    if (appState.currencies && appState.currencies.includes('IRR')) {
      const nextState = handleDeleteCurrency(appState, 'IRR');
      setAppState(nextState);
      if (!isQuotaExhausted()) {
        syncCurrenciesState(nextState.currencies, nextState.safeBalances);
        nextState.customers.forEach(c => syncCustomer(c));
      }
    }
  }, [appState.currencies]);

  // Update online status when logged in
  useEffect(() => {
    if (isQuotaExhausted()) return;
    const isStaff = appState.currentSessionRole === 'Owner' || appState.currentSessionRole === 'Employee';
    if (isStaff && appState.currentUser && 'role' in appState.currentUser) {
      const userId = appState.currentUser.id;
      
      const setOnline = () => {
        const nowIso = new Date().toISOString();
        setAppState(prev => {
          const current = prev.users.find(u => u.id === userId);
          if (!current) {
            // User was deleted or no longer exists in users array; do not revive in Firestore
            return prev;
          }
          const onlineUser: AppUser = {
            ...current,
            isOnline: true,
            lastActiveAt: nowIso
          };
          syncUser(onlineUser);
          return {
            ...prev,
            users: prev.users.map(u => u.id === userId ? onlineUser : u),
            currentUser: prev.currentUser?.id === userId ? onlineUser : prev.currentUser
          };
        });
      };

      const setOffline = () => {
        const nowIso = new Date().toISOString();
        setAppState(prev => {
          const current = prev.users.find(u => u.id === userId);
          if (!current) {
            // User was deleted; do not revive in Firestore
            return prev;
          }
          const offlineUser: AppUser = {
            ...current,
            isOnline: false,
            lastActiveAt: nowIso
          };
          syncUser(offlineUser);
          return {
            ...prev,
            users: prev.users.map(u => u.id === userId ? offlineUser : u)
          };
        });
      };

      // Set online immediately
      setOnline();

      const handleVisibilityChange = () => {
        if (document.visibilityState === 'hidden') {
          setOffline();
        } else if (document.visibilityState === 'visible') {
          setOnline();
        }
      };

      const handleBeforeUnload = () => {
        setOffline();
      };

      const handleUnload = () => {
        setOffline();
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('beforeunload', handleBeforeUnload);
      window.addEventListener('unload', handleUnload);

      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('beforeunload', handleBeforeUnload);
        window.removeEventListener('unload', handleUnload);
        setOffline();
      };
    }
  }, [appState.currentUser?.id, appState.currentSessionRole]);

  // Session login / logout
  const handleLogin = (user: AppUser | Customer, role: 'Owner' | 'Employee' | 'Customer', rememberMe: boolean) => {
    if (rememberMe) {
      localStorage.setItem('hawala_remember_me', 'true');
    } else {
      localStorage.removeItem('hawala_remember_me');
    }

    const portalMode = role === 'Customer' ? 'customer' : 'admin';
    localStorage.setItem('hawala_last_portal_mode', portalMode);
    localStorage.setItem('hawala_current_theme_mode', userThemeMode);
    localStorage.setItem(`hawala_pref_mode_${user.id}`, userThemeMode);

    const nowIso = new Date().toISOString();
    let updatedUser = user;
    if ('role' in user) {
      updatedUser = {
        ...user,
        isOnline: true,
        lastActiveAt: nowIso
      };
      syncUser(updatedUser as AppUser);
    }

    // Save to sessionStorage immediately for non-remember me sessions
    if (!rememberMe) {
      sessionStorage.setItem('hawala_session_user', JSON.stringify(updatedUser));
      sessionStorage.setItem('hawala_session_role', role);
    } else {
      sessionStorage.removeItem('hawala_session_user');
      sessionStorage.removeItem('hawala_session_role');
    }

    setAppState(prev => ({
      ...prev,
      currentUser: updatedUser,
      currentSessionRole: role,
      users: ('role' in updatedUser)
        ? prev.users.map(u => u.id === updatedUser.id ? (updatedUser as AppUser) : u)
        : prev.users
    }));
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    if (appState.currentUser && 'role' in appState.currentUser) {
      const nowIso = new Date().toISOString();
      const userId = appState.currentUser.id;
      const current = appState.users.find(u => u.id === userId);
      if (current) {
        const offlineUser: AppUser = {
          ...current,
          isOnline: false,
          lastActiveAt: nowIso
        };
        syncUser(offlineUser);
      }
      setAppState(prev => ({
        ...prev,
        users: prev.users.map(u => u.id === userId ? { ...u, isOnline: false, lastActiveAt: nowIso } : u),
        currentUser: null,
        currentSessionRole: null
      }));
    } else {
      setAppState(prev => ({
        ...prev,
        currentUser: null,
        currentSessionRole: null
      }));
    }
    localStorage.removeItem('hawala_remember_me');
    sessionStorage.removeItem('hawala_session_user');
    sessionStorage.removeItem('hawala_session_role');
  };

  if (isLoadingFirebase && !showStartupLoader) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center select-none overflow-hidden relative bg-[#05070B]">
        <div className="w-10 h-10 border-2 border-[#1D7AFC] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!appState.currentUser || !appState.currentSessionRole) {
    return (
      <>
        {showStartupLoader && (
          <AppLoader 
            systemTitle={appStateWithLocalLang.settings.officeName}
            officeLogo={appStateWithLocalLang.settings.officeLogo}
            lang={localLang}
            onFinish={() => setShowStartupLoader(false)}
          />
        )}
        <LoginView 
          appState={appStateWithLocalLang} 
          onLoginSuccess={handleLogin} 
          onLocalLangChange={handleLocalLangChange}
          onThemeModeChange={handleUpdateThemeMode}
        />
      </>
    );
  }

  const operatorName = appState.currentUser.name;
  const isCustomer = appState.currentSessionRole === 'Customer';

  // State handlers supporting reactive view redraws + Firebase sync:
  
  const handleModifyCustomerBalance = (
    customerId: string, 
    type: 'Deposit' | 'Withdrawal', 
    currency: Currency, 
    amount: number, 
    notes: string
  ) => {
    const nextState = handleDepositWithdrawal(
      appState, 
      customerId, 
      type, 
      currency, 
      amount, 
      notes, 
      operatorName
    );
    setAppState(nextState);

    // Sync Customer
    const updatedCust = nextState.customers.find(c => c.id === customerId);
    if (updatedCust) syncCustomer(updatedCust);
    // Sync SafeBalances
    syncCurrenciesState(nextState.currencies, nextState.safeBalances);
    // Sync Transaction
    if (nextState.transactions.length > 0) {
      syncTransaction(nextState.transactions[0]);
    }
  };

  const handleModifySafeOnly = (
    type: 'Deposit' | 'Withdrawal', 
    currency: Currency, 
    amount: number, 
    notes: string
  ) => {
    // Modify Safe balance directly without touching a customer (e.g. overhead or inject capital)
    const updatedSafe = { ...appState.safeBalances };
    if (type === 'Deposit') {
      updatedSafe[currency] += amount;
    } else {
      updatedSafe[currency] -= amount;
    }

    const newTx = {
      id: generateTransactionId('SAFE'),
      type: 'SafeAdjustment' as const,
      timestamp: new Date().toISOString(),
      performedBy: operatorName,
      customerName: 'خانەی گەنجینە',
      amount: type === 'Deposit' ? amount : -amount,
      currency,
      notes
    };

    const nextState = {
      ...appState,
      safeBalances: updatedSafe,
      transactions: [newTx, ...appState.transactions]
    };
    setAppState(nextState);

    // Sync Safe register
    syncCurrenciesState(nextState.currencies, nextState.safeBalances);
    // Sync Transaction log
    syncTransaction(newTx);
  };

  const handleExecuteExchange = (
    sourceType: 'Safe' | string, 
    action: 'BuyUSD' | 'SellUSD', 
    otherCurrency: string, 
    usdAmount: number, 
    exchangeRate: number, 
    notes: string
  ) => {
    const nextState = handleCurrencyExchange(
      appState, 
      sourceType, 
      action, 
      otherCurrency, 
      usdAmount, 
      exchangeRate, 
      notes, 
      operatorName
    );
    setAppState(nextState);

    // Sync Safe physical balance register
    syncCurrenciesState(nextState.currencies, nextState.safeBalances);
    // Sync system-exchange customer balance
    const exchangeCust = nextState.customers.find(c => c.id === 'system-exchange');
    if (exchangeCust) syncCustomer(exchangeCust);
    // Sync Customer balance if source is customer
    if (sourceType !== 'Safe') {
      const updatedCust = nextState.customers.find(c => c.id === sourceType);
      if (updatedCust) syncCustomer(updatedCust);
    }
    // Sync Exchange Transaction log
    if (nextState.transactions.length > 0) {
      syncTransaction(nextState.transactions[0]);
    }
  };

  const handleEditExchange = (
    transactionId: string,
    sourceType: 'Safe' | string, 
    action: 'BuyUSD' | 'SellUSD', 
    otherCurrency: string, 
    usdAmount: number, 
    exchangeRate: number, 
    notes: string
  ) => {
    const nextState = handleEditCurrencyExchange(
      appState,
      transactionId,
      sourceType,
      action,
      otherCurrency,
      usdAmount,
      exchangeRate,
      notes,
      operatorName
    );
    setAppState(nextState);

    // Sync Safe physical balance register
    syncCurrenciesState(nextState.currencies, nextState.safeBalances);

    // Always sync system-exchange account
    const exchangeCust = nextState.customers.find(c => c.id === 'system-exchange');
    if (exchangeCust) syncCustomer(exchangeCust);

    // Sync customer balances that might have been impacted
    // Revert phase customer
    const oldTx = appState.transactions.find(t => t.id === transactionId);
    if (oldTx && oldTx.customerId) {
      const oldCust = nextState.customers.find(c => c.id === oldTx.customerId);
      if (oldCust) syncCustomer(oldCust);
    }
    // Apply phase customer
    if (sourceType !== 'Safe') {
      const newCust = nextState.customers.find(c => c.id === sourceType);
      if (newCust) syncCustomer(newCust);
    }

    // Sync the modified Transaction log
    const updatedTx = nextState.transactions.find(t => t.id === transactionId);
    if (updatedTx) {
      syncTransaction(updatedTx);
    }
  };

  const handleCreateFastTransfer = (
    senderId: string, 
    receiverName: string, 
    receiverPhone: string, 
    amount: number, 
    currency: Currency, 
    fee: number, 
    notes: string
  ) => {
    const nextState = handleFastTransferCreate(
      appState, 
      senderId, 
      receiverName, 
      receiverPhone, 
      amount, 
      currency, 
      fee, 
      notes, 
      operatorName
    );
    setAppState(nextState);

    // Sync sender customer balance
    const senderCust = nextState.customers.find(c => c.id === senderId);
    if (senderCust) syncCustomer(senderCust);
    // Sync fast transfer details
    if (nextState.fastTransfers.length > 0) {
      syncFastTransfer(nextState.fastTransfers[0]);
    }
    // Sync logged transaction
    if (nextState.transactions.length > 0) {
      syncTransaction(nextState.transactions[0]);
    }
  };

  const handleDeliverFastTransfer = (
    id: string,
    deliveryDetails?: {
      isOfficeDelivery?: boolean;
      officeName?: string;
      receiverName?: string;
      receiverPhone?: string;
    }
  ) => {
    const nextState = handleFastTransferDeliver(appState, id, operatorName, deliveryDetails);
    setAppState(nextState);

    // Sync delivered transfer status
    const ft = nextState.fastTransfers.find(t => t.id === id);
    if (ft) syncFastTransfer(ft);
    // Sync safety/currency state
    syncCurrenciesState(nextState.currencies, nextState.safeBalances);
    // Sync logged transaction
    if (nextState.transactions.length > 0) {
      syncTransaction(nextState.transactions[0]);
    }
  };

  const handleCancelFastTransferHandler = (id: string, reason?: string) => {
    const nextState = handleFastTransferCancel(appState, id, operatorName, reason);
    setAppState(nextState);

    // Sync updated transfer status
    const ft = nextState.fastTransfers.find(t => t.id === id);
    if (ft) syncFastTransfer(ft);

    // Sync sender customer balance
    if (ft) {
      const senderCust = nextState.customers.find(c => c.id === ft.senderId);
      if (senderCust) syncCustomer(senderCust);
    }

    // Sync currency & safe balances
    syncCurrenciesState(nextState.currencies, nextState.safeBalances);

    // Sync newly logged cancellation transaction
    if (nextState.transactions.length > 0) {
      syncTransaction(nextState.transactions[0]);
    }
  };

  const handleCreateStandardTransfer = (
    senderId: string, 
    receiverId: string, 
    amountUSD: number, 
    buyRate: number, 
    sellRate: number, 
    beneficiaryName: string, 
    deliveryLocation: string, 
    notes: string,
    currency: Currency = 'USD'
  ) => {
    const nextState = handleStandardTransfer(
      appState, 
      senderId, 
      receiverId, 
      amountUSD, 
      buyRate, 
      sellRate, 
      beneficiaryName, 
      deliveryLocation, 
      notes, 
      operatorName,
      currency
    );
    setAppState(nextState);

    // Sync updated Sender balances
    const senderCust = nextState.customers.find(c => c.id === senderId);
    if (senderCust) syncCustomer(senderCust);
    // Sync updated Receiver balances
    const receiverCust = nextState.customers.find(c => c.id === receiverId);
    if (receiverCust) syncCustomer(receiverCust);
    // Sync Safe spread profit register
    syncCurrenciesState(nextState.currencies, nextState.safeBalances);
    // Sync standard transfer document
    if (nextState.standardTransfers.length > 0) {
      syncStandardTransfer(nextState.standardTransfers[0]);
    }
    // Sync double entry transaction logs
    if (nextState.transactions.length > 0) {
      syncTransaction(nextState.transactions[0]);
    }
    if (nextState.transactions.length > 1) {
      syncTransaction(nextState.transactions[1]);
    }
  };

  const handleDeleteFastTransferHandler = (id: string) => {
    const nextState = handleDeleteFastTransfer(appState, id);
    setAppState(nextState);

    if (nextState.deletedRecords && nextState.deletedRecords.length > 0) {
      syncDeletedRecord(nextState.deletedRecords[0]);
    }
    syncDeleteFastTransfer(id);
    appState.transactions.forEach(oldTx => {
      if (!nextState.transactions.some(t => t.id === oldTx.id)) {
        syncDeleteTransaction(oldTx.id);
      }
    });
    syncCurrenciesState(nextState.currencies, nextState.safeBalances);
    nextState.customers.forEach(c => syncCustomer(c));
  };

  const handleDeleteStandardTransferHandler = (id: string) => {
    const nextState = handleDeleteStandardTransfer(appState, id);
    setAppState(nextState);

    if (nextState.deletedRecords && nextState.deletedRecords.length > 0) {
      syncDeletedRecord(nextState.deletedRecords[0]);
    }
    syncDeleteStandardTransfer(id);
    appState.transactions.forEach(oldTx => {
      if (!nextState.transactions.some(t => t.id === oldTx.id)) {
        syncDeleteTransaction(oldTx.id);
      }
    });
    syncCurrenciesState(nextState.currencies, nextState.safeBalances);
    nextState.customers.forEach(c => syncCustomer(c));
  };

  const handleEditFastTransferHandler = (id: string, updates: any) => {
    const nextState = handleEditFastTransfer(appState, id, updates);
    setAppState(nextState);

    const updatedFt = nextState.fastTransfers.find(t => t.id === id);
    if (updatedFt) syncFastTransfer(updatedFt);

    nextState.transactions.forEach(tx => {
      if (tx.notes?.includes(id)) syncTransaction(tx);
    });
    syncCurrenciesState(nextState.currencies, nextState.safeBalances);
    nextState.customers.forEach(c => syncCustomer(c));
  };

  const handleEditStandardTransferHandler = (id: string, updates: any) => {
    const nextState = handleEditStandardTransfer(appState, id, updates);
    setAppState(nextState);

    const updatedSt = nextState.standardTransfers.find(t => t.id === id);
    if (updatedSt) syncStandardTransfer(updatedSt);

    nextState.transactions.forEach(tx => {
      if (tx.notes?.includes(id)) syncTransaction(tx);
    });
    syncCurrenciesState(nextState.currencies, nextState.safeBalances);
    nextState.customers.forEach(c => syncCustomer(c));
  };

  const handleCreateInternalTransfer = (
    senderId: string, 
    receiverId: string, 
    currency: Currency, 
    amount: number, 
    notes: string
  ) => {
    const nextState = handleInternalTransfer(
      appState, 
      senderId, 
      receiverId, 
      currency, 
      amount, 
      notes, 
      operatorName
    );
    setAppState(nextState);

    // Sync sender
    const senderCust = nextState.customers.find(c => c.id === senderId);
    if (senderCust) syncCustomer(senderCust);
    // Sync receiver
    const receiverCust = nextState.customers.find(c => c.id === receiverId);
    if (receiverCust) syncCustomer(receiverCust);
    // Sync Safe balance if Safe is involved
    if (senderId === 'safe' || receiverId === 'safe') {
      syncCurrenciesState(nextState.currencies, nextState.safeBalances);
    }
    // Sync double entry transaction logs
    if (nextState.transactions.length > 0) {
      syncTransaction(nextState.transactions[0]);
    }
    if (nextState.transactions.length > 1) {
      syncTransaction(nextState.transactions[1]);
    }
  };

  const handleSaveCustomerHandler = (custData: Partial<Customer>) => {
    const nextState = handleSaveCustomer(appState, custData);
    setAppState(nextState);

    // Sync new/edited customer
    const targetId = custData.id || `cust-${nextState.customers.length}`;
    const c = nextState.customers.find(cust => cust.id === targetId || cust.name === custData.name);
    if (c) syncCustomer(c);
  };

  const handleDeleteCustomerHandler = (id: string) => {
    const nextState = handleDeleteCustomer(appState, id);
    setAppState(nextState);
    syncDeleteCustomer(id);

    if (nextState.deletedRecords && nextState.deletedRecords.length > 0) {
      const latestDel = nextState.deletedRecords[0];
      syncDeletedRecord(latestDel);
    }
  };

  const handleSaveSettingsHandler = (settings: SystemSettings) => {
    // 1. Save user-specific preferences locally
    if (settings.themeMode) handleUpdateThemeMode(settings.themeMode);
    if (settings.themeColor) handleUpdateThemeColor(settings.themeColor);
    if (settings.fontSize) handleUpdateFontSize(settings.fontSize);

    if (settings.language) {
      setLocalLang(settings.language);
      localStorage.setItem('hawala_local_lang', settings.language);
    }

    // 2. Save global settings (only if not customer)
    if (appState.currentSessionRole !== 'Customer') {
      const nextState = handleSaveSettings(appState, settings);
      setAppState(nextState);
      syncSettings(settings);
    } else {
      // For customer, just update local appState's settings object without syncing to firebase
      setAppState(prev => ({
        ...prev,
        settings: {
          ...prev.settings,
          ...settings
        }
      }));
    }
  };

  const handleAddEmployeeHandler = (user: Omit<AppUser, 'id'>) => {
    const nextState = handleSaveEmployee(appState, user);
    setAppState(nextState);
    if (nextState.users.length > 0) {
      syncUser(nextState.users[nextState.users.length - 1]);
    }
  };

  const handleEditEmployeeHandler = (id: string, fields: Partial<AppUser>) => {
    const nextState = handleEditEmployee(appState, id, fields);
    setAppState(nextState);
    const updatedUser = nextState.users.find(u => u.id === id);
    if (updatedUser) {
      syncUser(updatedUser);
    }
  };

  const handleDeleteEmployeeHandler = (id: string) => {
    if (appState.currentUser && appState.currentUser.id === id) {
      handleLogout();
    }
    const nextState = handleDeleteEmployee(appState, id);
    setAppState(nextState);
    syncDeleteUser(id);
  };

  const handleAddCurrencyHandler = (code: string) => {
    const nextState = handleAddCurrency(appState, code);
    setAppState(nextState);
    syncCurrenciesState(nextState.currencies, nextState.safeBalances);
    // Sync all revised customer documents containing the structure update
    nextState.customers.forEach(c => syncCustomer(c));
  };

  const handleDeleteCurrencyHandler = (code: string) => {
    const nextState = handleDeleteCurrency(appState, code);
    setAppState(nextState);
    syncCurrenciesState(nextState.currencies, nextState.safeBalances);
    nextState.customers.forEach(c => syncCustomer(c));
  };

  const handleResetAllDataHandler = () => {
    const nextState = handleResetAllData(appState);
    setAppState(nextState);
    resetFirestoreDatabase(nextState.currencies);
  };

  const executeDeleteTransaction = (transactionId: string) => {
    const nextState = handleDeleteTransaction(appState, transactionId);
    setAppState(nextState);

    // Sync newly created deleted record
    if (nextState.deletedRecords && nextState.deletedRecords.length > 0) {
      const latestDel = nextState.deletedRecords[0];
      syncDeletedRecord(latestDel);
    }

    // Sync deleted transaction(s)
    appState.transactions.forEach(oldTx => {
      const stillExists = nextState.transactions.some(t => t.id === oldTx.id);
      if (!stillExists) {
        syncDeleteTransaction(oldTx.id);
      }
    });
    syncCurrenciesState(nextState.currencies, nextState.safeBalances);

    // Sync customer balance modifications
    appState.customers.forEach(oldCust => {
      const nextCust = nextState.customers.find(c => c.id === oldCust.id);
      if (nextCust && JSON.stringify(oldCust.balances) !== JSON.stringify(nextCust.balances)) {
        syncCustomer(nextCust);
      }
    });

    // Sync fast transfer deletion or status revert
    appState.fastTransfers.forEach(oldFt => {
      const nextFt = nextState.fastTransfers.find(f => f.id === oldFt.id);
      if (!nextFt) {
        syncDeleteFastTransfer(oldFt.id);
      } else if (JSON.stringify(oldFt) !== JSON.stringify(nextFt)) {
        syncFastTransfer(nextFt);
      }
    });

    // Sync standard transfer deletion
    appState.standardTransfers.forEach(oldSt => {
      const nextSt = nextState.standardTransfers.find(s => s.id === oldSt.id);
      if (!nextSt) {
        syncDeleteStandardTransfer(oldSt.id);
      }
    });
  };

  const handleDeleteTransactionHandler = (transactionId: string) => {
    const rx = appState.transactions.find(t => t.id === transactionId);
    if (!rx) return;
    setTxToDelete(transactionId);
  };

  const handleEditExpenseHandler = (transactionId: string, newAmount: number, newCurrency: string, newNotes: string) => {
    const nextState = handleEditExpense(appState, transactionId, newAmount, newCurrency as any, newNotes);
    setAppState(nextState);

    const updatedTx = nextState.transactions.find(t => t.id === transactionId);
    if (updatedTx) {
      syncTransaction(updatedTx);
    }
    syncCurrenciesState(nextState.currencies, nextState.safeBalances);
    const expCust = nextState.customers.find(c => c.id === 'system-expenses');
    if (expCust) {
      syncCustomer(expCust);
    }
  };

  const handleEditVaultTransactionHandler = (transactionId: string, newAmount: number, newCurrency: string, newNotes: string) => {
    const nextState = handleEditVaultTransaction(appState, transactionId, newAmount, newCurrency as any, newNotes);
    setAppState(nextState);

    const updatedTx = nextState.transactions.find(t => t.id === transactionId);
    if (updatedTx) {
      syncTransaction(updatedTx);
    }
    syncCurrenciesState(nextState.currencies, nextState.safeBalances);
    if (updatedTx?.customerId) {
      const cust = nextState.customers.find(c => c.id === updatedTx.customerId);
      if (cust) syncCustomer(cust);
    }
  };

  const handleEditTransactionNotesHandler = (transactionId: string, newNotes: string) => {
    const nextState = handleEditTransactionNotes(appState, transactionId, newNotes);
    setAppState(nextState);

    const baseTxId = transactionId.endsWith('-REC') ? transactionId.slice(0, -4) : transactionId;
    const tx1 = nextState.transactions.find(t => t.id === baseTxId);
    if (tx1) syncTransaction(tx1);
    const tx2 = nextState.transactions.find(t => t.id === `${baseTxId}-REC`);
    if (tx2) syncTransaction(tx2);
  };

  // Helper to switch tabs from Dashboard quick action buttons
  const handleQuickActionTab = (act: 'deposit' | 'withdrawal' | 'exchange' | 'transfer') => {
    if (act === 'deposit' || act === 'withdrawal') {
      setActiveTab('customers');
    } else if (act === 'exchange') {
      setActiveTab('exchange');
    } else if (act === 'transfer') {
      setActiveTab('transfers');
    }
  };

  // Switch rendered view panel
  const renderMainContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardView 
            appState={appStateWithLocalLang} 
            onQuickAction={handleQuickActionTab} 
            onPrintReceipt={(type, tx) => setPrintData({ type, data: tx })}
            onLocalLangChange={handleLocalLangChange}
            onCreateFastTransfer={handleCreateFastTransfer}
            onCreateStandardTransfer={handleCreateStandardTransfer}
            onCreateInternalTransfer={handleCreateInternalTransfer}
            onModifyCustomerBalance={handleModifyCustomerBalance}
            onExecuteExchange={handleExecuteExchange}
          />
        );
      case 'universal_entry':
        return (
          <UniversalEntryView
            appState={appStateWithLocalLang}
            onCreateFastTransfer={handleCreateFastTransfer}
            onCreateStandardTransfer={handleCreateStandardTransfer}
            onCreateInternalTransfer={handleCreateInternalTransfer}
            onModifyCustomerBalance={handleModifyCustomerBalance}
            onExecuteExchange={handleExecuteExchange}
            onPrintReceipt={(type, tx) => setPrintData({ type, data: tx })}
          />
        );
      case 'safe':
        return (
          <SafeView 
            appState={appStateWithLocalLang} 
            onModifySafe={handleModifySafeOnly} 
            onModifyCustomerBalance={handleModifyCustomerBalance}
            onDeleteTransaction={handleDeleteTransactionHandler}
            onEditExpense={handleEditExpenseHandler}
            onEditVaultTransaction={handleEditVaultTransactionHandler}
            onEditTransactionNotes={handleEditTransactionNotesHandler}
          />
        );
      case 'customers':
        return (
          <CustomersView 
            appState={appStateWithLocalLang} 
            onSaveCustomer={handleSaveCustomerHandler} 
            onDeleteCustomer={handleDeleteCustomerHandler} 
            onModifyCustomerBalance={handleModifyCustomerBalance} 
            onCreateInternalTransfer={handleCreateInternalTransfer}
            onDeleteTransaction={handleDeleteTransactionHandler}
            onEditTransactionNotes={handleEditTransactionNotesHandler}
          />
        );
      case 'exchange':
        return (
          <ExchangeView 
            appState={appStateWithLocalLang} 
            onExecuteExchange={handleExecuteExchange} 
            onEditExchange={handleEditExchange}
            onPrintReceipt={(type, tx) => setPrintData({ type, data: tx })}
            onDeleteTransaction={handleDeleteTransactionHandler}
          />
        );
      case 'transfers':
        return (
          <TransfersView 
            appState={appStateWithLocalLang} 
            onCreateFastTransfer={handleCreateFastTransfer} 
            onDeliverFastTransfer={handleDeliverFastTransfer} 
            onCancelFastTransfer={handleCancelFastTransferHandler}
            onCreateStandardTransfer={handleCreateStandardTransfer} 
            onDeleteFastTransfer={handleDeleteFastTransferHandler}
            onDeleteStandardTransfer={handleDeleteStandardTransferHandler}
            onEditFastTransfer={handleEditFastTransferHandler}
            onEditStandardTransfer={handleEditStandardTransferHandler}
            onPrintReceipt={(type, val) => setPrintData({ type, data: val })}
          />
        );
      case 'reports':
        return (
          <ReportsView 
            appState={appStateWithLocalLang} 
            onDeleteTransaction={handleDeleteTransactionHandler} 
            onEditExpense={handleEditExpenseHandler}
            onDeleteFastTransfer={handleDeleteFastTransferHandler}
            onDeleteStandardTransfer={handleDeleteStandardTransferHandler}
            onEditFastTransfer={handleEditFastTransferHandler}
            onEditStandardTransfer={handleEditStandardTransferHandler}
            onPrintReceipt={(type, val) => setPrintData({ type, data: val })}
          />
        );
      case 'deleted_records':
        return (
          <DeletedRecordsView 
            deletedRecords={appStateWithLocalLang.deletedRecords || []}
            currencies={appStateWithLocalLang.currencies || ['USD', 'IQD']}
            settings={appStateWithLocalLang.settings}
          />
        );
      case 'settings':
        return (
          <SettingsView 
            appState={appStateWithLocalLang} 
            onSaveSettings={handleSaveSettingsHandler}
            onAddEmployee={handleAddEmployeeHandler}
            onEditEmployee={handleEditEmployeeHandler}
            onDeleteEmployee={handleDeleteEmployeeHandler}
            onAddCurrency={handleAddCurrencyHandler}
            onDeleteCurrency={handleDeleteCurrencyHandler}
            onResetAllData={handleResetAllDataHandler}
            targetSection={settingsSection}
            onSelectSection={setSettingsSection}
          />
        );
      default:
        return <div>نەبینراو</div>;
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden text-slate-100 select-none w-full relative" dir={localLang === 'en' ? 'ltr' : 'rtl'}>
      {/* Fallback ambient glowing orbs */}
      <div className="fixed inset-0 -z-30 pointer-events-none select-none overflow-hidden transform-gpu">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/30 rounded-full blur-[140px] pointer-events-none transform-gpu" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-cyan-600/25 rounded-full blur-[140px] pointer-events-none transform-gpu" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-amber-600/25 rounded-full blur-[140px] pointer-events-none transform-gpu" />
      </div>

      {/* Full-Bleed Ambient Background Image */}
      <img 
        src="/assets/aistudio/pexels-steve-34062650_8633e506.jpg" 
        alt="Ambient background"
        className="fixed inset-0 w-full h-full object-cover object-center -z-20 pointer-events-none select-none transform-gpu" 
      />

      {/* Subtle Dark Contrast Overlay */}
      <div className="fixed inset-0 bg-[#05070B]/35 -z-10 pointer-events-none transform-gpu" />

      {/* Mobile Top Header */}
      <header className="md:hidden bg-slate-950/50 backdrop-blur-xl border-b border-white/[0.1] px-5 py-3.5 flex items-center justify-between no-print sticky top-0 z-20 shrink-0">
        <button 
          onClick={() => setMobileSidebarOpen(true)}
          className="p-2 text-slate-300 hover:text-white rounded-xl bg-white/[0.05] border border-white/[0.1] focus:outline-none cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 max-w-[60%]">
          {appState.settings.officeLogo && (
            <div className="w-7 h-7 rounded-lg overflow-hidden border border-white/[0.15] p-0.5 bg-white/[0.05] shrink-0 flex items-center justify-center">
              <img src={appState.settings.officeLogo} alt="Logo" className="w-full h-full object-contain" />
            </div>
          )}
          <h1 className="text-sm font-bold text-white truncate">
            {appState.settings.officeName || 'نووسینگەی ئاڵوگۆڕ'}
          </h1>
        </div>
        {/* Header Right Actions: Theme Toggle & Language select */}
        <div className="flex items-center gap-1.5">
          {/* Mobile Sun / Moon Theme Toggle */}
          <button
            type="button"
            onClick={() => {
              const nextMode = (userThemeMode === 'midnight' || userThemeMode === 'dark') ? 'sky_light' : 'midnight';
              handleUpdateThemeMode(nextMode);
            }}
            title={
              (userThemeMode === 'midnight' || userThemeMode === 'dark')
                ? (localLang === 'en' ? 'Sky Blue Mode' : localLang === 'ar' ? 'الوضع السماوي الفاتح' : 'دۆخی شینی ئاسمانی')
                : (localLang === 'en' ? 'Midnight Black Mode' : localLang === 'ar' ? 'وضع سواد منتصف الليل' : 'دۆخی ڕەشی نێوەشەو')
            }
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/[0.05] border border-white/[0.1] text-slate-300 hover:text-white cursor-pointer"
          >
            {(userThemeMode === 'midnight' || userThemeMode === 'dark') ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-cyan-300" />
            )}
          </button>

          {/* Language select with Globe icon */}
          <div className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-white/[0.05] border border-white/[0.1] text-slate-300 hover:text-white cursor-pointer">
            <Globe className="w-4 h-4" />
            <select
              value={localLang}
              onChange={(e) => handleLocalLangChange(e.target.value as any)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            >
              <option value="ku" className="bg-slate-900 text-white">کوردی</option>
              <option value="en" className="bg-slate-900 text-white">English</option>
              <option value="ar" className="bg-slate-900 text-white">العربية</option>
            </select>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative z-30">
        {/* Mobile Backdrop Overlay */}
        {mobileSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden animate-fade-in"
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}
        
        {/* Right nav sidebar layout */}
        <RightSidebar 
          activeTab={activeTab} 
          setActiveTab={(tab) => {
            setActiveTab(tab);
            setMobileSidebarOpen(false); // Close sidebar after selecting tab on mobile
          }} 
          onSelectSettingsSection={(sec) => {
            setSettingsSection(sec);
            setActiveTab('settings');
            setMobileSidebarOpen(false);
          }}
          currentUser={appState.currentUser} 
          sessionRole={appState.currentSessionRole} 
          onLogout={handleLogout} 
          settings={appStateWithLocalLang.settings}
          isOpenMobile={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
          onThemeModeChange={handleUpdateThemeMode}
        />

        {/* Main content body panel */}
        <main 
          ref={viewContainerRef}
          className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth p-3 md:p-6 space-y-6 transform-gpu"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {renderMainContent()}
        </main>
      </div>

      {/* Printable Receipt Modal container */}
      {printData && (
        <ReceiptPrint 
          type={printData.type} 
          data={printData.data} 
          settings={appStateWithLocalLang.settings} 
          onClose={() => setPrintData(null)} 
        />
      )}

      {/* Custom React Confirm Modal instead of buggy browser confirm() */}
      <ConfirmModal
        isOpen={txToDelete !== null}
        title={
          localLang === 'en' 
            ? 'Delete Transaction' 
            : localLang === 'ar' 
              ? 'حذف المعاملة ومراجعة الرصيد' 
              : 'سڕینەوەی مامەڵە'
        }
        message={
          localLang === 'en'
            ? 'Are you sure you want to delete this transaction and revert all its balance changes?'
            : localLang === 'ar'
              ? 'هل أنت متأكد من حذف هذه المعاملة كلياً واسترجاع الأرصدة؟'
              : 'ئایا دڵنیایت لە سڕینەوەی ئەم مامەڵەیە بە تەواوی و گەڕاندنەوەی سەرجەم گۆڕانکارییەکانی باڵانسەکەی؟'
        }
        lang={localLang}
        onConfirm={() => {
          if (txToDelete) {
            executeDeleteTransaction(txToDelete);
            setTxToDelete(null);
          }
        }}
        onCancel={() => setTxToDelete(null)}
      />

      {showStartupLoader && (
        <AppLoader 
          systemTitle={appStateWithLocalLang.settings.officeName}
          officeLogo={appStateWithLocalLang.settings.officeLogo}
          lang={localLang}
          onFinish={() => setShowStartupLoader(false)}
        />
      )}
    </div>
  );
}
