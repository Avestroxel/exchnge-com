import { 
  Customer, Transaction, AppUser, FastTransferDetails, 
  StandardTransferDetails, SystemSettings, CurrencyBalance, Currency,
  DeletedRecord, DeletedRecordCategory
} from '../types';
import { 
  INITIAL_USER, SAMPLE_EMPLOYEES, SAMPLE_CUSTOMERS, 
  INITIAL_SAFE_BALANCES, SAMPLE_TRANSACTIONS, 
  SAMPLE_FAST_TRANSFERS, SAMPLE_STANDARD_TRANSFERS, INITIAL_SETTINGS,
  SAMPLE_DELETED_RECORDS
} from './dummyData';
import { generateTransactionId, deduplicateTransactions } from '../utils';
import { syncTransaction, syncDeleteTransaction } from './firebaseSync';
import { isQuotaExhausted } from './firebase';

export interface AppState {
  users: AppUser[];
  customers: Customer[];
  safeBalances: CurrencyBalance;
  transactions: Transaction[];
  fastTransfers: FastTransferDetails[];
  standardTransfers: StandardTransferDetails[];
  deletedRecords: DeletedRecord[];
  settings: SystemSettings;
  currentUser: AppUser | Customer | null;
  currentSessionRole: 'Owner' | 'Employee' | 'Customer' | null;
  currencies: string[];
}

const STORAGE_KEY = 'hawala_exchange_system_state';

export function ensureSystemAccounts(customers: Customer[]): Customer[] {
  const result = [...(customers || [])];

  const systemAccounts: Customer[] = [
    {
      id: 'system-expenses',
      name: 'خەرجی',
      phone: 'expenses',
      password: 'expenses-system-lock-no-login',
      balances: { USD: 0, IQD: 0 },
      notes: 'هەژماری تایبەت بە خەرجییەکانی سیستەم (تەنها خوێندنەوە)',
      createdAt: '2026-01-01T00:00:00Z'
    },
    {
      id: 'system-exchange',
      name: 'گۆڕینەوەی دراو',
      phone: 'exchange',
      password: 'exchange-system-lock-no-login',
      balances: { USD: 0, IQD: 0 },
      notes: 'هەژماری تایبەت بە گۆڕینەوەی دراو (تەنها خوێندنەوە)',
      createdAt: '2026-01-01T00:00:00Z'
    },
    {
      id: 'system-transfer-fee',
      name: 'کرێی حەواڵە',
      phone: 'transfer-fee',
      password: 'transfer-fee-system-lock-no-login',
      balances: { USD: 0, IQD: 0 },
      notes: 'هەژماری تایبەت بە کرێی حەواڵە (تەنها خوێندنەوە)',
      createdAt: '2026-01-01T00:00:00Z'
    },
    {
      id: 'system-profit',
      name: 'قازانج',
      phone: 'profit',
      password: 'profit-system-lock-no-login',
      balances: { USD: 0, IQD: 0 },
      notes: 'هەژماری تایبەت بە قازانجی سیستەم (تەنها خوێندنەوە)',
      createdAt: '2026-01-01T00:00:00Z'
    },
    {
      id: 'system-fast-hawala',
      name: 'حەواڵەی خێرا',
      phone: 'fast-hawala',
      password: 'fast-hawala-system-lock-no-login',
      balances: { USD: 0, IQD: 0 },
      notes: 'هەژماری تایبەت بە حەواڵەی خێرا (تەنها خوێندنەوە)',
      createdAt: '2026-01-01T00:00:00Z'
    }
  ];

  for (const acc of systemAccounts) {
    const existingIndex = result.findIndex(c => c.id === acc.id);
    if (existingIndex >= 0) {
      result[existingIndex] = {
        ...result[existingIndex],
        name: acc.name
      };
    } else {
      result.unshift(acc);
    }
  }

  return result;
}

export function getInitialState(): AppState {
  const data = localStorage.getItem(STORAGE_KEY);
  let state: AppState | null = null;
  
  if (data) {
    try {
      const parsed = JSON.parse(data);
      // Ensure we have all necessary structures
      if (parsed.customers && parsed.safeBalances) {
        // Clean IRR and ensure currencies
        if (parsed.currencies && Array.isArray(parsed.currencies)) {
          parsed.currencies = parsed.currencies.filter((c: string) => c !== 'IRR');
        } else {
          parsed.currencies = ['USD', 'IQD'];
        }
        if (parsed.safeBalances && parsed.safeBalances.IRR !== undefined) {
          delete parsed.safeBalances.IRR;
        }
        if (!parsed.settings.language) {
          parsed.settings.language = 'ku';
        }
        
        // Sanitize and purge old owner names from existing saved state
        if (parsed.users && Array.isArray(parsed.users)) {
          parsed.users = parsed.users.map((u: any) => {
            if (u.role === 'Owner' || u.name.includes('یاقوب') || u.name.includes('خاوەنکار')) {
              return { ...u, name: 'خاوەن' };
            }
            return u;
          });
        }
        if (parsed.currentUser && (parsed.currentUser.role === 'Owner' || parsed.currentUser.name?.includes('یاقوب') || parsed.currentUser.name?.includes('خاوەنکار'))) {
          parsed.currentUser = { ...parsed.currentUser, name: 'خاوەن' };
        }

        parsed.customers = recalculateSystemCustomerBalances(
          ensureSystemAccounts(parsed.customers),
          parsed.transactions || [],
          parsed.fastTransfers || [],
          parsed.standardTransfers || []
        );

        if (!parsed.deletedRecords || !Array.isArray(parsed.deletedRecords)) {
          parsed.deletedRecords = SAMPLE_DELETED_RECORDS;
        }

        state = parsed as AppState;
        state.transactions = ensureTransferFeeTransactions(
          state.transactions || [],
          state.fastTransfers || [],
          state.standardTransfers || []
        );
        state.safeBalances = recalculateSafeBalances(state.transactions, state.currencies);
      }
    } catch (e) {
      console.error("Failed to parse storage, resetting", e);
    }
  }

  if (!state) {
    // Fallback to preloaded dummy data
    state = {
      users: [INITIAL_USER, ...SAMPLE_EMPLOYEES],
      customers: recalculateSystemCustomerBalances(
        ensureSystemAccounts(SAMPLE_CUSTOMERS),
        SAMPLE_TRANSACTIONS,
        SAMPLE_FAST_TRANSFERS,
        SAMPLE_STANDARD_TRANSFERS
      ),
      safeBalances: recalculateSafeBalances(SAMPLE_TRANSACTIONS, ['USD', 'IQD']),
      transactions: SAMPLE_TRANSACTIONS,
      fastTransfers: SAMPLE_FAST_TRANSFERS,
      standardTransfers: SAMPLE_STANDARD_TRANSFERS,
      deletedRecords: SAMPLE_DELETED_RECORDS,
      settings: { ...INITIAL_SETTINGS, language: 'ku' },
      currentUser: null, // Clear by default to prevent automatic entry on other devices
      currentSessionRole: null, // Clear by default to prevent automatic entry on other devices
      currencies: ['USD', 'IQD']
    };
  }

  // Handle Session Management based on Remember Me option
  const rememberMe = localStorage.getItem('hawala_remember_me') === 'true';
  if (!rememberMe) {
    // If not "remember me", look up active session from sessionStorage
    const sessionUserStr = sessionStorage.getItem('hawala_session_user');
    const sessionRoleStr = sessionStorage.getItem('hawala_session_role');
    if (sessionUserStr && sessionRoleStr) {
      try {
        state.currentUser = JSON.parse(sessionUserStr);
        state.currentSessionRole = sessionRoleStr as any;
      } catch (err) {
        state.currentUser = null;
        state.currentSessionRole = null;
      }
    } else {
      state.currentUser = null;
      state.currentSessionRole = null;
    }
  }

  saveState(state);
  return state;
}

let saveTimeoutId: any = null;

function roundBalance(val: number): number {
  if (isNaN(val) || !isFinite(val)) return 0;
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

export function saveState(state: AppState): void {
  // Always synchronize session immediately to avoid any lag or delay in auth state
  const rememberMe = localStorage.getItem('hawala_remember_me') === 'true';
  if (!rememberMe) {
    if (state.currentUser && state.currentSessionRole) {
      sessionStorage.setItem('hawala_session_user', JSON.stringify(state.currentUser));
      sessionStorage.setItem('hawala_session_role', state.currentSessionRole);
    } else {
      sessionStorage.removeItem('hawala_session_user');
      sessionStorage.removeItem('hawala_session_role');
    }
  }

  // Debounce the heavy full-state save to localStorage
  if (saveTimeoutId) {
    clearTimeout(saveTimeoutId);
  }
  
  saveTimeoutId = setTimeout(() => {
    try {
      if (rememberMe) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } else {
        const stateCopy = {
          ...state,
          currentUser: null,
          currentSessionRole: null
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stateCopy));
      }
    } catch (e) {
      console.error("Failed to save state to localStorage:", e);
    }
  }, 100); // 100ms fast non-blocking debounce
}

/**
 * Handle Deposit or Withdrawal
 * @returns updated state
 */
export function handleDepositWithdrawal(
  state: AppState,
  customerId: string,
  type: 'Deposit' | 'Withdrawal',
  currency: Currency,
  amount: number,
  notes: string,
  operatorName: string
): AppState {
  const safeAmount = roundBalance(Number(amount) || 0);
  const updatedCustomers = state.customers.map(c => {
    if (c.id === customerId) {
      const newBalances = { ...c.balances };
      const current = Number(newBalances[currency]) || 0;
      if (type === 'Deposit') {
        newBalances[currency] = roundBalance(current + safeAmount);
      } else {
        newBalances[currency] = roundBalance(current - safeAmount);
      }
      return { ...c, balances: newBalances };
    }
    return c;
  });

  const updatedSafe = { ...state.safeBalances };
  const currentSafe = Number(updatedSafe[currency]) || 0;
  if (type === 'Deposit') {
    updatedSafe[currency] = roundBalance(currentSafe + safeAmount);
  } else {
    updatedSafe[currency] = roundBalance(currentSafe - safeAmount);
  }

  const customer = state.customers.find(c => c.id === customerId);
  const newTx: Transaction = {
    id: generateTransactionId('TRX'),
    type,
    timestamp: new Date().toISOString(),
    performedBy: operatorName,
    customerId,
    customerName: customer ? customer.name : (customerId === 'system-expenses' ? 'خەرجی' : customerId === 'system-profit' ? 'قازانج' : customerId === 'system-transfer-fee' ? 'کرێی حەواڵە' : 'Unknown'),
    amount: type === 'Deposit' ? safeAmount : -safeAmount,
    currency,
    notes
  };

  const allTx = [newTx, ...state.transactions];
  const finalCustomers = recalculateSystemCustomerBalances(
    updatedCustomers,
    allTx,
    state.fastTransfers,
    state.standardTransfers
  );

  const newState: AppState = {
    ...state,
    customers: finalCustomers,
    safeBalances: recalculateSafeBalances(allTx, state.currencies),
    transactions: allTx
  };

  saveState(newState);
  return newState;
}

/**
 * Filter out any synthetic transaction records so ghost transactions never exist or persist
 */
export function ensureTransferFeeTransactions(
  transactions: Transaction[],
  _fastTransfers: FastTransferDetails[] = [],
  _standardTransfers: StandardTransferDetails[] = []
): Transaction[] {
  if (!transactions) return [];
  
  // Clean out any synthetic TRX-FEE- or INT-FEE- transactions that might have been created previously
  const cleanTxs: Transaction[] = [];
  for (const tx of transactions) {
    if (tx.id?.startsWith('TRX-FEE-') || tx.id?.startsWith('INT-FEE-')) {
      // Async clean up from Firestore if present
      if (!isQuotaExhausted()) {
        try { syncDeleteTransaction(tx.id); } catch (e) {}
      }
      continue;
    }
    cleanTxs.push(tx);
  }
  return cleanTxs;
}

/**
 * Recalculate balances for system accounts (exchange, expenses, transfer fee, profit) based on state history
 */
export function recalculateSystemCustomerBalances(
  customers: Customer[],
  transactions: Transaction[],
  fastTransfers: FastTransferDetails[] = [],
  standardTransfers: StandardTransferDetails[] = []
): Customer[] {
  const exchangeBalances: Record<string, number> = { USD: 0, IQD: 0 };
  const expenseBalances: Record<string, number> = { USD: 0, IQD: 0 };
  const transferFeeBalances: Record<string, number> = { USD: 0, IQD: 0 };
  const profitBalances: Record<string, number> = { USD: 0, IQD: 0 };
  const fastHawalaBalances: Record<string, number> = { USD: 0, IQD: 0 };

  const cleanTxs = ensureTransferFeeTransactions(transactions, fastTransfers, standardTransfers);

  // 1. Accumulate from real user transactions
  for (const tx of cleanTxs) {
    if (tx.type === 'Exchange') {
      const targetCur = tx.targetCurrency || 'IQD';
      if (tx.customerId === 'system-profit') {
        const cur = tx.currency || 'USD';
        profitBalances[cur] = roundBalance((profitBalances[cur] || 0) + (tx.amount || 0));
      } else if (tx.customerId === 'system-transfer-fee') {
        const cur = tx.currency || 'USD';
        transferFeeBalances[cur] = roundBalance((transferFeeBalances[cur] || 0) + (tx.amount || 0));
      } else {
        // Exchange counter account (system-exchange) gets +tx.amount and +tx.targetAmount for all exchanges
        exchangeBalances.USD = roundBalance((exchangeBalances.USD || 0) + (tx.amount || 0));
        exchangeBalances[targetCur] = roundBalance((exchangeBalances[targetCur] || 0) + (tx.targetAmount || 0));
      }
    } else if (tx.type === 'Expense' || tx.customerId === 'system-expenses') {
      const cur = tx.currency || 'USD';
      expenseBalances[cur] = roundBalance((expenseBalances[cur] || 0) + (tx.amount || 0));
    } else if (tx.customerId === 'system-transfer-fee') {
      const cur = tx.currency || 'USD';
      transferFeeBalances[cur] = roundBalance((transferFeeBalances[cur] || 0) + (tx.amount || 0));
    } else if (tx.customerId === 'system-profit') {
      const cur = tx.currency || 'USD';
      profitBalances[cur] = roundBalance((profitBalances[cur] || 0) + (tx.amount || 0));
    } else if (tx.customerId === 'system-exchange') {
      const cur = tx.currency || 'USD';
      exchangeBalances[cur] = roundBalance((exchangeBalances[cur] || 0) + (tx.amount || 0));
    } else if (tx.customerId === 'system-fast-hawala' && tx.type !== 'FastTransfer') {
      const cur = tx.currency || 'USD';
      fastHawalaBalances[cur] = roundBalance((fastHawalaBalances[cur] || 0) + (tx.amount || 0));
    }
  }

  // 2. Add pending fast transfers to system-fast-hawala holding balance
  for (const ft of (fastTransfers || [])) {
    if (ft.status === 'Pending') {
      const cur = ft.currency || 'USD';
      fastHawalaBalances[cur] = roundBalance((fastHawalaBalances[cur] || 0) + ft.amount);
    }
  }

  // 3. Add transfer fees dynamically from Fast Transfers
  for (const ft of (fastTransfers || [])) {
    if (ft.fee && ft.fee > 0 && ft.status !== 'Cancelled') {
      const cur = ft.currency || 'USD';
      transferFeeBalances[cur] = roundBalance((transferFeeBalances[cur] || 0) + ft.fee);
    }
  }

  // 4. Add transfer fees/profits dynamically from Standard Transfers to system-transfer-fee
  for (const st of (standardTransfers || [])) {
    if (st.status !== 'Cancelled') {
      let profit = st.profitIQD;
      if (profit === undefined || isNaN(profit)) {
        profit = (st.receiverIQDDeducted - st.senderIQDAdded) || (st.sellRate - st.buyRate) || 0;
      }
      if (profit !== 0) {
        const cur = st.currency || 'USD';
        transferFeeBalances[cur] = roundBalance((transferFeeBalances[cur] || 0) + profit);
      }
    }
  }

  return customers.map(c => {
    if (c.id === 'system-exchange') {
      return { ...c, balances: { ...c.balances, ...exchangeBalances } };
    }
    if (c.id === 'system-expenses') {
      return { ...c, balances: { ...c.balances, ...expenseBalances } };
    }
    if (c.id === 'system-transfer-fee') {
      return { ...c, balances: { ...c.balances, ...transferFeeBalances } };
    }
    if (c.id === 'system-profit') {
      return { ...c, balances: { ...c.balances, ...profitBalances } };
    }
    if (c.id === 'system-fast-hawala') {
      return { ...c, balances: { ...c.balances, ...fastHawalaBalances } };
    }
    return c;
  });
}

/**
 * Recalculate safe/treasury balances strictly based on all real transactions history.
 * Guarantees that the physical safe balance is ALWAYS 100% in sync with transaction logs,
 * reports, dashboard widgets, and Firestore.
 */
export function recalculateSafeBalances(
  transactions: Transaction[],
  currencies: string[] = ['USD', 'IQD', 'EUR']
): CurrencyBalance {
  const balances: CurrencyBalance = {};
  for (const c of currencies) {
    balances[c] = 0;
  }

  const isSafeParty = (tx: Transaction) => (
    !tx.customerId || 
    tx.customerId === 'safe' || 
    tx.customerId === 'system-exchange' || 
    tx.customerName === 'خانەی گەنجینە' ||
    tx.customerId === 'system-fast-hawala'
  );

  const cleanTxs = deduplicateTransactions(transactions || []);

  for (const tx of cleanTxs) {
    const cur = tx.currency || 'USD';
    if (tx.type === 'SafeAdjustment') {
      balances[cur] = roundBalance((balances[cur] || 0) + (tx.amount || 0));
    } else if (tx.type === 'Deposit' || tx.type === 'Withdrawal') {
      balances[cur] = roundBalance((balances[cur] || 0) + (tx.amount || 0));
    } else if (tx.type === 'Exchange') {
      if (isSafeParty(tx)) {
        const usdAmount = tx.amount || 0;
        balances['USD'] = roundBalance((balances['USD'] || 0) + usdAmount);
        const targetCur = tx.targetCurrency || 'IQD';
        const targetAmt = tx.targetAmount || 0;
        balances[targetCur] = roundBalance((balances[targetCur] || 0) + targetAmt);
      }
    } else if (tx.type === 'FastTransfer') {
      if (!tx.customerId || isSafeParty(tx)) {
        balances[cur] = roundBalance((balances[cur] || 0) - Math.abs(tx.amount || 0));
      }
    } else if (tx.type === 'Expense' || tx.customerId === 'system-expenses') {
      balances[cur] = roundBalance((balances[cur] || 0) + (tx.amount || 0));
    } else if (isSafeParty(tx)) {
      balances[cur] = roundBalance((balances[cur] || 0) + (tx.amount || 0));
    }
  }

  return balances;
}

/**
 * Currency Exchange (USD bought or sold against IQD/IRR)
 */
export function handleCurrencyExchange(
  state: AppState,
  sourceType: 'Safe' | string, // 'Safe' or customerId
  action: 'BuyUSD' | 'SellUSD',
  otherCurrency: string,
  usdAmount: number,
  exchangeRate: number,
  notes: string,
  operatorName: string
): AppState {
  // calculate secondary counter currency value
  const otherAmount = Math.round(usdAmount * exchangeRate);

  let updatedCustomers = [...state.customers];
  let updatedSafe = { ...state.safeBalances };
  let sourceName = 'خانەی گەنجینە';

  const usdChange = action === 'BuyUSD' ? usdAmount : -usdAmount;
  const otherChange = action === 'BuyUSD' ? -otherAmount : otherAmount;

  // Only update physical Safe if source is 'Safe'
  if (sourceType === 'Safe') {
    updatedSafe.USD = (updatedSafe.USD || 0) + usdChange;
    updatedSafe[otherCurrency] = (updatedSafe[otherCurrency] || 0) + otherChange;
    sourceName = 'خانەی گەنجینە';
  } else {
    sourceName = state.customers.find(c => c.id === sourceType)?.name || 'Unknown';
  }

  const targetCustId = sourceType === 'Safe' ? 'system-exchange' : sourceType;

  updatedCustomers = state.customers.map(c => {
    if (c.id === targetCustId) {
      const newBalances = { ...c.balances };
      newBalances.USD -= usdChange;
      newBalances[otherCurrency] -= otherChange;
      return { ...c, balances: newBalances };
    }
    return c;
  });

  const newTx: Transaction = {
    id: generateTransactionId('EXC'),
    type: 'Exchange',
    timestamp: new Date().toISOString(),
    performedBy: operatorName,
    customerId: sourceType === 'Safe' ? 'system-exchange' : sourceType,
    customerName: sourceName,
    amount: usdChange,
    currency: 'USD',
    rate: exchangeRate,
    targetAmount: otherChange,
    targetCurrency: otherCurrency,
    notes: `${action === 'BuyUSD' ? 'کڕینی دۆلار' : 'فرۆشتنی دۆلار'} - سەرچاوە: ${sourceName}. ${notes}`
  };

  const allTx = [newTx, ...state.transactions];
  updatedCustomers = recalculateSystemCustomerBalances(updatedCustomers, allTx);

  const newState: AppState = {
    ...state,
    customers: updatedCustomers,
    safeBalances: recalculateSafeBalances(allTx, state.currencies),
    transactions: allTx
  };

  saveState(newState);
  return newState;
}

/**
 * Edit an existing Currency Exchange transaction, reverting old balances first.
 */
export function handleEditCurrencyExchange(
  state: AppState,
  transactionId: string,
  newSourceType: 'Safe' | string,
  newAction: 'BuyUSD' | 'SellUSD',
  newOtherCurrency: string,
  newUsdAmount: number,
  newExchangeRate: number,
  newNotes: string,
  operatorName: string
): AppState {
  const oldTx = state.transactions.find(t => t.id === transactionId);
  if (!oldTx || oldTx.type !== 'Exchange') return state;

  let updatedCustomers = [...state.customers];
  let updatedSafe = { ...state.safeBalances };

  // 1. REVERT OLD TRANSACTION BALANCES
  const oldSource = oldTx.customerId || 'Safe';
  const oldUsdAmount = oldTx.amount; // pos or neg
  const oldOtherAmount = oldTx.targetAmount || 0; // pos or neg
  const oldOtherCurrency = oldTx.targetCurrency || 'IQD';

  const isOldSafe = !oldTx.customerId || oldTx.customerId === 'system-exchange' || oldTx.customerName === 'خانەی گەنجینە';
  if (isOldSafe) {
    updatedSafe.USD = (updatedSafe.USD || 0) - oldUsdAmount;
    updatedSafe[oldOtherCurrency] = (updatedSafe[oldOtherCurrency] || 0) - oldOtherAmount;
  }

  const oldTargetCustId = oldSource;
  updatedCustomers = updatedCustomers.map(c => {
    if (c.id === oldTargetCustId) {
      const newBalances = { ...c.balances };
      newBalances.USD = (newBalances.USD || 0) + oldUsdAmount;
      newBalances[oldOtherCurrency] = (newBalances[oldOtherCurrency] || 0) + oldOtherAmount;
      return { ...c, balances: newBalances };
    }
    return c;
  });

  // 2. APPLY NEW TRANSACTION BALANCES
  const newOtherAmount = Math.round(newUsdAmount * newExchangeRate);
  const newAmountUSD = newAction === 'BuyUSD' ? newUsdAmount : -newUsdAmount;
  const newTargetAmount = newAction === 'BuyUSD' ? -newOtherAmount : newOtherAmount;
  let newSourceName = 'خانەی گەنجینە';

  if (newSourceType === 'Safe') {
    updatedSafe.USD = (updatedSafe.USD || 0) + newAmountUSD;
    updatedSafe[newOtherCurrency] = (updatedSafe[newOtherCurrency] || 0) + newTargetAmount;
    newSourceName = 'خانەی گەنجینە';
  } else {
    newSourceName = updatedCustomers.find(c => c.id === newSourceType)?.name || 'Unknown';
  }

  const newTargetCustId = newSourceType === 'Safe' ? 'system-exchange' : newSourceType;

  updatedCustomers = updatedCustomers.map(c => {
    if (c.id === newTargetCustId) {
      const newBalances = { ...c.balances };
      newBalances.USD -= newAmountUSD;
      newBalances[newOtherCurrency] -= newTargetAmount;
      return { ...c, balances: newBalances };
    }
    return c;
  });

  // 3. UPDATE THE TRANSACTION
  const updatedTransactions = state.transactions.map(t => {
    if (t.id === transactionId) {
      return {
        ...t,
        performedBy: operatorName,
        customerId: newSourceType === 'Safe' ? 'system-exchange' : newSourceType,
        customerName: newSourceName,
        amount: newAmountUSD,
        currency: 'USD',
        rate: newExchangeRate,
        targetAmount: newTargetAmount,
        targetCurrency: newOtherCurrency,
        notes: `${newAction === 'BuyUSD' ? 'کڕینی دۆلار' : 'فرۆشتنی دۆلار'} - سەرچاوە: ${newSourceName}. ${newNotes}`
      };
    }
    return t;
  });

  updatedCustomers = recalculateSystemCustomerBalances(updatedCustomers, updatedTransactions);

  const newState: AppState = {
    ...state,
    customers: updatedCustomers,
    safeBalances: updatedSafe,
    transactions: updatedTransactions
  };

  saveState(newState);
  return newState;
}

/**
 * Fast Transfer: sender sends money + fee to a physical recipient
 */
export function handleFastTransferCreate(
  state: AppState,
  senderId: string,
  receiverName: string,
  receiverPhone: string,
  amount: number,
  currency: Currency,
  fee: number,
  notes: string,
  operatorName: string
): AppState {
  const sender = state.customers.find(c => c.id === senderId);
  if (!sender) return state;

  const totalDeduction = amount + fee;

  let updatedCustomers = state.customers.map(c => {
    if (c.id === senderId) {
      const newBalances = { ...c.balances };
      const current = Number(newBalances[currency]) || 0;
      newBalances[currency] = roundBalance(current - totalDeduction);
      return { ...c, balances: newBalances };
    }
    return c;
  });

  const nextId = `HW-${String(state.fastTransfers.length + 1).padStart(4, '0')}`;
  const newTransfer: FastTransferDetails = {
    id: nextId,
    senderId,
    senderName: sender.name,
    receiverName,
    receiverPhone,
    amount,
    currency,
    fee,
    status: 'Pending',
    notes,
    createdAt: new Date().toISOString()
  };

  const allFastTransfers = [newTransfer, ...state.fastTransfers];

  // Add transaction log
  const newTx: Transaction = {
    id: generateTransactionId('TRX'),
    type: 'FastTransfer',
    timestamp: new Date().toISOString(),
    performedBy: operatorName,
    customerId: senderId,
    customerName: sender.name,
    amount: -totalDeduction,
    currency,
    notes: `حەواڵەی خێرا بە کۆدی ${nextId} بۆ وەرگر ${receiverName}. کرێی حەواڵە: ${fee}`
  };

  const allTransactions = [newTx, ...state.transactions];

  updatedCustomers = recalculateSystemCustomerBalances(
    updatedCustomers,
    allTransactions,
    allFastTransfers,
    state.standardTransfers
  );

  const newState: AppState = {
    ...state,
    customers: updatedCustomers,
    fastTransfers: allFastTransfers,
    transactions: allTransactions
  };

  saveState(newState);
  return newState;
}

/**
 * Deliver a fast transfer to recipient
 */
export function handleFastTransferDeliver(
  state: AppState,
  transferId: string,
  operatorName: string,
  deliveryDetails?: {
    isOfficeDelivery?: boolean;
    officeName?: string;
    receiverName?: string;
    receiverPhone?: string;
  }
): AppState {
  const transfer = state.fastTransfers.find(t => t.id === transferId);
  if (!transfer || transfer.status !== 'Pending') return state;

  const rxName = deliveryDetails?.receiverName || transfer.receiverName;
  const rxPhone = deliveryDetails?.receiverPhone || transfer.receiverPhone;
  const isOffice = deliveryDetails?.isOfficeDelivery || false;
  const offName = isOffice ? (deliveryDetails?.officeName || '') : undefined;

  const updatedTransfers = state.fastTransfers.map(t => {
    if (t.id === transferId) {
      return { 
        ...t, 
        status: 'Delivered' as const, 
        deliveredAt: new Date().toISOString(),
        receiverName: rxName,
        receiverPhone: rxPhone,
        isOfficeDelivery: isOffice,
        officeName: offName,
        deliveryReceiverName: isOffice ? rxName : undefined,
        deliveryReceiverPhone: isOffice ? rxPhone : undefined
      };
    }
    return t;
  });

  const updatedSafe = {
    ...state.safeBalances,
    [transfer.currency]: (state.safeBalances[transfer.currency] || 0) - transfer.amount
  };

  const feeInfo = transfer.fee ? ` (بڕی حەواڵە: ${transfer.amount} ${transfer.currency} - کرێ: ${transfer.fee} ${transfer.currency})` : ` (بڕی حەواڵە: ${transfer.amount} ${transfer.currency})`;
  const deliveryNotes = isOffice 
    ? `تەسلیمکردنی حەواڵەی خێرا بە کۆدی ${transferId} بۆ نووسینگەی ${offName} (وەرگرتن لەلایەن: ${rxName})${feeInfo}`
    : `تەسلیمکردنی حەواڵەی خێرا بە کۆدی ${transferId} بە کەسی (وەرگرتن لەلایەن: ${rxName})${feeInfo}`;

  const newTx: Transaction = {
    id: generateTransactionId('TRX'),
    type: 'FastTransfer',
    timestamp: new Date().toISOString(),
    performedBy: operatorName,
    customerId: 'system-fast-hawala',
    customerName: 'حەواڵەی خێرا',
    amount: -transfer.amount,
    currency: transfer.currency,
    notes: deliveryNotes
  };

  const allTx = [newTx, ...state.transactions];
  const finalCustomers = recalculateSystemCustomerBalances(
    state.customers,
    allTx,
    updatedTransfers,
    state.standardTransfers
  );

  const newState: AppState = {
    ...state,
    customers: finalCustomers,
    safeBalances: recalculateSafeBalances(allTx, state.currencies),
    fastTransfers: updatedTransfers,
    transactions: allTx
  };

  saveState(newState);
  return newState;
}

/**
 * Cancel a fast transfer and refund amount (+ fee) back to sender's account
 */
export function handleFastTransferCancel(
  state: AppState,
  transferId: string,
  operatorName: string,
  reason?: string
): AppState {
  const transfer = state.fastTransfers.find(t => t.id === transferId);
  if (!transfer || transfer.status === 'Cancelled') return state;

  const refundTotal = roundBalance(transfer.amount + (transfer.fee || 0));

  // 1. Update customer balance (refund to sender)
  let updatedCustomers = state.customers.map(c => {
    if (c.id === transfer.senderId) {
      const currentBal = Number(c.balances[transfer.currency]) || 0;
      return {
        ...c,
        balances: {
          ...c.balances,
          [transfer.currency]: roundBalance(currentBal + refundTotal)
        }
      };
    }
    return c;
  });

  // 2. If it was already delivered, restore safe balance
  const updatedSafe = { ...state.safeBalances };
  if (transfer.status === 'Delivered') {
    updatedSafe[transfer.currency] = roundBalance((updatedSafe[transfer.currency] || 0) + transfer.amount);
  }

  // 3. Mark transfer status as Cancelled
  const updatedTransfers = state.fastTransfers.map(t => {
    if (t.id === transferId) {
      const cancelNote = reason ? ` [هەڵوەشاوەتەوە: ${reason}]` : ' [هەڵوەشاوەتەوە]';
      return {
        ...t,
        status: 'Cancelled' as const,
        cancelledAt: new Date().toISOString(),
        cancelledBy: operatorName,
        cancelReason: reason || undefined,
        notes: (t.notes || '') + cancelNote
      };
    }
    return t;
  });

  // 4. Create refund transaction log
  const cancelTxId = generateTransactionId('TRX');
  const cancelTx: Transaction = {
    id: cancelTxId,
    type: 'FastTransfer',
    timestamp: new Date().toISOString(),
    performedBy: operatorName,
    customerId: transfer.senderId,
    customerName: transfer.senderName,
    amount: refundTotal,
    currency: transfer.currency,
    notes: `هەڵوەشاندنەوەی حەواڵەی خێرا بە کۆدی ${transferId} بۆ ${transfer.receiverName} و گەڕاندنەوەی بڕی ${refundTotal.toLocaleString()} ${transfer.currency} بۆ سەر هەژماری ${transfer.senderName}${reason ? ` (هۆکار: ${reason})` : ''}`
  };

  const allTx = [cancelTx, ...state.transactions];

  // 5. Recalculate system accounts
  updatedCustomers = recalculateSystemCustomerBalances(
    updatedCustomers,
    allTx,
    updatedTransfers,
    state.standardTransfers
  );

  const newState: AppState = {
    ...state,
    customers: updatedCustomers,
    safeBalances: recalculateSafeBalances(allTx, state.currencies),
    fastTransfers: updatedTransfers,
    transactions: allTx
  };

  saveState(newState);
  return newState;
}

/**
 * Standard Transfer (Hawala) Spread based operation between two exists customers
 */
export function handleStandardTransfer(
  state: AppState,
  senderId: string,
  receiverId: string,
  amountUSD: number,
  buyRate: number,
  sellRate: number,
  beneficiaryName: string,
  deliveryLocation: string,
  notes: string,
  operatorName: string,
  currency: Currency = 'USD'
): AppState {
  const sender = state.customers.find(c => c.id === senderId);
  const receiver = state.customers.find(c => c.id === receiverId);
  if (!sender || !receiver) return state;

  const senderAddedComm = amountUSD + buyRate;
  const receiverDeductedComm = amountUSD + sellRate;
  const profit = receiverDeductedComm - senderAddedComm; // sellRate - buyRate

  // Update customer balances:
  // - Buying Customer (Sender): Credited with (amountUSD + buyRate) in selected currency.
  // - Selling / Receiving Customer (Receiver): Debited with (amountUSD + sellRate) in selected currency.
  // - System Transfer Fee Account: Credited with transfer fee profit (sellRate - buyRate).
  let updatedCustomers = state.customers.map(c => {
    if (c.id === senderId) {
      const currentBaseBal = c.balances[currency] || 0;
      return {
        ...c,
        balances: {
          ...c.balances,
          [currency]: roundBalance(currentBaseBal + senderAddedComm)
        }
      };
    }
    if (c.id === receiverId) {
      const currentBaseBal = c.balances[currency] || 0;
      return {
        ...c,
        balances: {
          ...c.balances,
          [currency]: roundBalance(currentBaseBal - receiverDeductedComm)
        }
      };
    }
    return c;
  });

  const nextId = `HW-S${String(state.standardTransfers.length + 1).padStart(4, '0')}`;
  const newTransfer: StandardTransferDetails = {
    id: nextId,
    senderId,
    senderName: sender.name,
    receiverId,
    receiverName: receiver.name,
    beneficiaryName: beneficiaryName || receiver.name,
    deliveryLocation,
    amountUSD,
    buyRate,
    sellRate,
    senderIQDAdded: senderAddedComm, // store the calculated sender value
    receiverIQDDeducted: receiverDeductedComm, // store the calculated receiver value
    profitIQD: profit, // store profit in selected currency under the same property
    status: 'Delivered', // standard hawala of this kind processes instantly
    createdAt: new Date().toISOString(),
    notes,
    currency
  };

  const allStandardTransfers = [newTransfer, ...state.standardTransfers];

  // Create double entry transaction logs
  const senderTxId = generateTransactionId('INT');
  const receiverTxId = senderTxId + '-REC';

  const newTxSender: Transaction = {
    id: senderTxId,
    type: 'StandardTransfer',
    timestamp: new Date().toISOString(),
    performedBy: operatorName,
    customerId: senderId,
    customerName: sender.name,
    amount: senderAddedComm,
    currency,
    rate: buyRate,
    profitInIQD: profit,
    notes: `کڕینی حەواڵەی ستاندارد ${nextId} بۆ ${receiver.name} (وەرگرتن: ${beneficiaryName || receiver.name}، شوێن: ${deliveryLocation} بە دراوی ${currency}). قازانج: +${profit.toLocaleString()} ${currency}`
  };

  const newTxReceiver: Transaction = {
    id: receiverTxId,
    type: 'StandardTransfer',
    timestamp: new Date().toISOString(),
    performedBy: operatorName,
    customerId: receiverId,
    customerName: receiver.name,
    amount: -receiverDeductedComm,
    currency,
    rate: sellRate,
    profitInIQD: 0, // profit is registered on the sender side to avoid double-counting
    notes: `فرۆشتنی حەواڵەی ستاندارد ${nextId} لە لایەن ${sender.name}ەوە (وەرگرتن: ${beneficiaryName || receiver.name}، شوێن: ${deliveryLocation} بە دراوی ${currency})`
  };

  const allTransactions = [newTxSender, newTxReceiver, ...state.transactions];

  updatedCustomers = recalculateSystemCustomerBalances(
    updatedCustomers,
    allTransactions,
    state.fastTransfers,
    allStandardTransfers
  );

  const newState: AppState = {
    ...state,
    customers: updatedCustomers,
    safeBalances: state.safeBalances,
    standardTransfers: allStandardTransfers,
    transactions: allTransactions
  };

  saveState(newState);
  return newState;
}

/**
 * Delete a fast transfer and revert balances/transactions
 */
export function handleDeleteFastTransfer(state: AppState, transferId: string): AppState {
  const ft = state.fastTransfers.find(t => t.id === transferId);
  if (!ft) return state;

  // 1. Revert sender balance
  let updatedCustomers = state.customers.map(c => {
    if (c.id === ft.senderId) {
      const current = Number(c.balances[ft.currency]) || 0;
      return {
        ...c,
        balances: {
          ...c.balances,
          [ft.currency]: roundBalance(current + (ft.amount + ft.fee))
        }
      };
    }
    return c;
  });

  // 2. If delivered, restore safe balance
  const updatedSafe = { ...state.safeBalances };
  if (ft.status === 'Delivered') {
    updatedSafe[ft.currency] = roundBalance((updatedSafe[ft.currency] || 0) + ft.amount);
  }

  // 3. Remove FastTransfer entry
  const remainingFastTransfers = state.fastTransfers.filter(t => t.id !== transferId);

  // 4. Remove matching transactions (notes containing ft.id)
  const remainingTransactions = state.transactions.filter(tx => !tx.notes?.includes(transferId));

  // 5. Create deleted record entry
  const deletedRecord: DeletedRecord = {
    id: `DEL-${Date.now()}`,
    category: 'Transfer',
    originalId: transferId,
    title: `حەواڵەی خێرا ${transferId} سڕایەوە`,
    deletedAt: new Date().toISOString(),
    deletedBy: state.currentUser?.name || 'خاوەنکار',
    currency: ft.currency || 'USD',
    amount: ft.amount || 0,
    notes: ft.notes || '',
    details: {
      'کۆدی حەواڵە': transferId,
      'وەرگر': ft.receiverName || ''
    }
  };
  const updatedDeletedRecords = [deletedRecord, ...(state.deletedRecords || [])];

  // 6. Recalculate system customer balances
  updatedCustomers = recalculateSystemCustomerBalances(
    updatedCustomers,
    remainingTransactions,
    remainingFastTransfers,
    state.standardTransfers
  );

  const newState: AppState = {
    ...state,
    customers: updatedCustomers,
    safeBalances: updatedSafe,
    fastTransfers: remainingFastTransfers,
    transactions: remainingTransactions,
    deletedRecords: updatedDeletedRecords
  };

  saveState(newState);
  return newState;
}

/**
 * Delete a standard transfer and revert customer balances/transactions
 */
export function handleDeleteStandardTransfer(state: AppState, transferId: string): AppState {
  const st = state.standardTransfers.find(t => t.id === transferId);
  if (!st) return state;

  const currency = st.currency || 'USD';

  // 1. Revert sender and receiver balances
  let updatedCustomers = state.customers.map(c => {
    if (c.id === st.senderId) {
      const current = Number(c.balances[currency]) || 0;
      return {
        ...c,
        balances: {
          ...c.balances,
          [currency]: roundBalance(current - st.senderIQDAdded)
        }
      };
    }
    if (c.id === st.receiverId) {
      const current = Number(c.balances[currency]) || 0;
      return {
        ...c,
        balances: {
          ...c.balances,
          [currency]: roundBalance(current + st.receiverIQDDeducted)
        }
      };
    }
    return c;
  });

  // 2. Remove StandardTransfer entry
  const remainingStandardTransfers = state.standardTransfers.filter(t => t.id !== transferId);

  // 3. Remove matching transactions
  const remainingTransactions = state.transactions.filter(tx => !tx.notes?.includes(transferId));

  // 4. Create deleted record entry
  const deletedRecord: DeletedRecord = {
    id: `DEL-${Date.now()}`,
    category: 'Transfer',
    originalId: transferId,
    title: `حەواڵەی ستاندارد ${transferId} سڕایەوە`,
    deletedAt: new Date().toISOString(),
    deletedBy: state.currentUser?.name || 'خاوەنکار',
    currency: st.currency || 'USD',
    amount: st.amountUSD || 0,
    notes: st.notes || '',
    details: {
      'کۆدی حەواڵە': transferId
    }
  };
  const updatedDeletedRecords = [deletedRecord, ...(state.deletedRecords || [])];

  // 5. Recalculate system customer balances
  updatedCustomers = recalculateSystemCustomerBalances(
    updatedCustomers,
    remainingTransactions,
    state.fastTransfers,
    remainingStandardTransfers
  );

  const newState: AppState = {
    ...state,
    customers: updatedCustomers,
    standardTransfers: remainingStandardTransfers,
    transactions: remainingTransactions,
    deletedRecords: updatedDeletedRecords
  };

  saveState(newState);
  return newState;
}

/**
 * Edit a fast transfer
 */
export function handleEditFastTransfer(
  state: AppState,
  transferId: string,
  updates: {
    senderId: string;
    receiverName: string;
    receiverPhone: string;
    amount: number;
    currency: Currency;
    fee: number;
    notes: string;
    officeName?: string;
    isOfficeDelivery?: boolean;
  }
): AppState {
  const oldFt = state.fastTransfers.find(t => t.id === transferId);
  if (!oldFt) return state;

  const newSender = state.customers.find(c => c.id === updates.senderId);
  if (!newSender) return state;

  // 1. Revert old sender balance & safe balance (if delivered)
  let updatedCustomers = state.customers.map(c => {
    if (c.id === oldFt.senderId) {
      const cur = Number(c.balances[oldFt.currency]) || 0;
      return {
        ...c,
        balances: {
          ...c.balances,
          [oldFt.currency]: roundBalance(cur + (oldFt.amount + oldFt.fee))
        }
      };
    }
    return c;
  });

  const updatedSafe = { ...state.safeBalances };
  if (oldFt.status === 'Delivered') {
    updatedSafe[oldFt.currency] = roundBalance((updatedSafe[oldFt.currency] || 0) + oldFt.amount);
  }

  // 2. Apply new sender balance & safe balance (if delivered)
  const newTotalDeduction = updates.amount + updates.fee;
  updatedCustomers = updatedCustomers.map(c => {
    if (c.id === updates.senderId) {
      const cur = Number(c.balances[updates.currency]) || 0;
      return {
        ...c,
        balances: {
          ...c.balances,
          [updates.currency]: roundBalance(cur - newTotalDeduction)
        }
      };
    }
    return c;
  });

  if (oldFt.status === 'Delivered') {
    updatedSafe[updates.currency] = roundBalance((updatedSafe[updates.currency] || 0) - updates.amount);
  }

  // 3. Update FastTransferDetails entry
  const updatedFastTransfers = state.fastTransfers.map(t => {
    if (t.id === transferId) {
      return {
        ...t,
        senderId: updates.senderId,
        senderName: newSender.name,
        receiverName: updates.receiverName,
        receiverPhone: updates.receiverPhone,
        amount: updates.amount,
        currency: updates.currency,
        fee: updates.fee,
        notes: updates.notes,
        officeName: updates.officeName !== undefined ? updates.officeName : t.officeName,
        isOfficeDelivery: updates.isOfficeDelivery !== undefined ? updates.isOfficeDelivery : t.isOfficeDelivery
      };
    }
    return t;
  });

  // 4. Update matching transactions
  const updatedTransactions = state.transactions.map(tx => {
    if (tx.notes?.includes(transferId)) {
      if (tx.amount < 0) {
        // Creation transaction for sender
        return {
          ...tx,
          customerId: updates.senderId,
          customerName: newSender.name,
          amount: -newTotalDeduction,
          currency: updates.currency,
          notes: `حەواڵەی خێرا بە کۆدی ${transferId} بۆ وەرگر ${updates.receiverName}. کرێی حەواڵە: ${updates.fee}`
        };
      } else {
        // Delivery transaction
        return {
          ...tx,
          amount: updates.amount,
          currency: updates.currency,
          notes: `تەسلیمکردنی حەواڵەی خێرا بە کۆدی ${transferId} بۆ ${updates.receiverName}`
        };
      }
    }
    return tx;
  });

  // 5. Recalculate system customer balances
  updatedCustomers = recalculateSystemCustomerBalances(
    updatedCustomers,
    updatedTransactions,
    updatedFastTransfers,
    state.standardTransfers
  );

  const newState: AppState = {
    ...state,
    customers: updatedCustomers,
    safeBalances: updatedSafe,
    fastTransfers: updatedFastTransfers,
    transactions: updatedTransactions
  };

  saveState(newState);
  return newState;
}

/**
 * Edit a standard transfer
 */
export function handleEditStandardTransfer(
  state: AppState,
  transferId: string,
  updates: {
    senderId: string;
    receiverId: string;
    beneficiaryName: string;
    deliveryLocation: string;
    amountUSD: number;
    buyRate: number;
    sellRate: number;
    notes: string;
    currency?: Currency;
  }
): AppState {
  const oldSt = state.standardTransfers.find(t => t.id === transferId);
  if (!oldSt) return state;

  const sender = state.customers.find(c => c.id === updates.senderId);
  const receiver = state.customers.find(c => c.id === updates.receiverId);
  if (!sender || !receiver) return state;

  const oldCurrency = oldSt.currency || 'USD';
  const newCurrency = updates.currency || 'USD';

  // 1. Revert old balances
  let updatedCustomers = state.customers.map(c => {
    if (c.id === oldSt.senderId) {
      const cur = Number(c.balances[oldCurrency]) || 0;
      return {
        ...c,
        balances: {
          ...c.balances,
          [oldCurrency]: roundBalance(cur - oldSt.senderIQDAdded)
        }
      };
    }
    if (c.id === oldSt.receiverId) {
      const cur = Number(c.balances[oldCurrency]) || 0;
      return {
        ...c,
        balances: {
          ...c.balances,
          [oldCurrency]: roundBalance(cur + oldSt.receiverIQDDeducted)
        }
      };
    }
    return c;
  });

  // 2. Calculate new values
  const senderAddedComm = updates.amountUSD + updates.buyRate;
  const receiverDeductedComm = updates.amountUSD + updates.sellRate;
  const profit = receiverDeductedComm - senderAddedComm;

  // 3. Apply new balances
  updatedCustomers = updatedCustomers.map(c => {
    if (c.id === updates.senderId) {
      const cur = Number(c.balances[newCurrency]) || 0;
      return {
        ...c,
        balances: {
          ...c.balances,
          [newCurrency]: roundBalance(cur + senderAddedComm)
        }
      };
    }
    if (c.id === updates.receiverId) {
      const cur = Number(c.balances[newCurrency]) || 0;
      return {
        ...c,
        balances: {
          ...c.balances,
          [newCurrency]: roundBalance(cur - receiverDeductedComm)
        }
      };
    }
    return c;
  });

  // 4. Update StandardTransferDetails entry
  const updatedStandardTransfers = state.standardTransfers.map(t => {
    if (t.id === transferId) {
      return {
        ...t,
        senderId: updates.senderId,
        senderName: sender.name,
        receiverId: updates.receiverId,
        receiverName: receiver.name,
        beneficiaryName: updates.beneficiaryName || receiver.name,
        deliveryLocation: updates.deliveryLocation,
        amountUSD: updates.amountUSD,
        buyRate: updates.buyRate,
        sellRate: updates.sellRate,
        senderIQDAdded: senderAddedComm,
        receiverIQDDeducted: receiverDeductedComm,
        profitIQD: profit,
        notes: updates.notes,
        currency: newCurrency
      };
    }
    return t;
  });

  // 5. Update matching transactions
  const updatedTransactions = state.transactions.map(tx => {
    if (tx.notes?.includes(transferId)) {
      if (tx.amount > 0) {
        // Sender transaction
        return {
          ...tx,
          customerId: updates.senderId,
          customerName: sender.name,
          amount: senderAddedComm,
          currency: newCurrency,
          rate: updates.buyRate,
          profitInIQD: profit,
          notes: `کڕینی حەواڵەی ستاندارد ${transferId} بۆ ${receiver.name} (وەرگرتن: ${updates.beneficiaryName || receiver.name}، شوێن: ${updates.deliveryLocation} بە دراوی ${newCurrency}). قازانج: +${profit.toLocaleString()} ${newCurrency}`
        };
      } else {
        // Receiver transaction
        return {
          ...tx,
          customerId: updates.receiverId,
          customerName: receiver.name,
          amount: -receiverDeductedComm,
          currency: newCurrency,
          rate: updates.sellRate,
          notes: `فرۆشتنی حەواڵەی ستاندارد ${transferId} لە لایەن ${sender.name}ەوە (وەرگرتن: ${updates.beneficiaryName || receiver.name}، شوێن: ${updates.deliveryLocation} بە دراوی ${newCurrency})`
        };
      }
    }
    return tx;
  });

  // 6. Recalculate system customer balances
  updatedCustomers = recalculateSystemCustomerBalances(
    updatedCustomers,
    updatedTransactions,
    state.fastTransfers,
    updatedStandardTransfers
  );

  const newState: AppState = {
    ...state,
    customers: updatedCustomers,
    standardTransfers: updatedStandardTransfers,
    transactions: updatedTransactions
  };

  saveState(newState);
  return newState;
}

/**
 * Direct Internal Account Transfer (Same currency, no fee/rate)
 */
export function handleInternalTransfer(
  state: AppState,
  senderId: string,
  receiverId: string,
  currency: Currency,
  amount: number,
  notes: string,
  operatorName: string
): AppState {
  const isSenderSafe = senderId === 'safe';
  const isReceiverSafe = receiverId === 'safe';

  const sender = isSenderSafe ? null : state.customers.find(c => c.id === senderId);
  const receiver = isReceiverSafe ? null : state.customers.find(c => c.id === receiverId);

  if ((!isSenderSafe && !sender) || (!isReceiverSafe && !receiver)) return state;

  const senderName = isSenderSafe ? 'خانەی گەنجینە' : sender!.name;
  const receiverName = isReceiverSafe ? 'خانەی گەنجینە' : receiver!.name;

  // 1. Update Safe balances
  const updatedSafe = { ...state.safeBalances };
  if (isSenderSafe) {
    updatedSafe[currency] = (updatedSafe[currency] || 0) - amount;
  }
  if (isReceiverSafe) {
    updatedSafe[currency] = (updatedSafe[currency] || 0) + amount;
  }

  // 2. Update Customer balances
  const updatedCustomers = state.customers.map(c => {
    if (!isSenderSafe && c.id === senderId) {
      return {
        ...c,
        balances: {
          ...c.balances,
          [currency]: (c.balances[currency] || 0) - amount
        }
      };
    }
    if (!isReceiverSafe && c.id === receiverId) {
      return {
        ...c,
        balances: {
          ...c.balances,
          [currency]: (c.balances[currency] || 0) + amount
        }
      };
    }
    return c;
  });

  const txId = generateTransactionId('INT');
  const receiverTxId = txId + '-REC';

  const newTxSender: Transaction = {
    id: txId,
    type: 'InternalTransfer',
    timestamp: new Date().toISOString(),
    performedBy: operatorName,
    customerId: isSenderSafe ? undefined : senderId,
    customerName: senderName,
    amount: -amount,
    currency,
    notes: `حەواڵەی ناوخۆیی ڕاستەوخۆ بۆ ${receiverName}. تێبینی: ${notes}`
  };

  const newTxReceiver: Transaction = {
    id: receiverTxId,
    type: 'InternalTransfer',
    timestamp: new Date().toISOString(),
    performedBy: operatorName,
    customerId: isReceiverSafe ? undefined : receiverId,
    customerName: receiverName,
    amount: amount,
    currency,
    notes: `حەواڵەی ناوخۆیی ڕاستەوخۆ لە لایەن ${senderName}ەوە. تێبینی: ${notes}`
  };

  const allTx = [newTxSender, newTxReceiver, ...state.transactions];
  const finalCustomers = recalculateSystemCustomerBalances(
    updatedCustomers,
    allTx,
    state.fastTransfers,
    state.standardTransfers
  );

  const newState: AppState = {
    ...state,
    customers: finalCustomers,
    safeBalances: updatedSafe,
    transactions: allTx
  };

  saveState(newState);
  return newState;
}

/**
 * Create or Edit Customer Account
 */
export function handleSaveCustomer(
  state: AppState,
  customerData: Partial<Customer>
): AppState {
  let updatedCustomers = [...state.customers];
  if (customerData.id) {
    // Edit
    updatedCustomers = state.customers.map(c => {
      if (c.id === customerData.id) {
        return {
          ...c,
          name: customerData.name || c.name,
          phone: customerData.phone || c.phone,
          password: customerData.password || c.password,
          notes: customerData.notes || c.notes,
        };
      }
      return c;
    });
  } else {
    // Create
    const nextId = `cust-${state.customers.length + 1}`;
    const initBalances: Record<string, number> = {};
    state.currencies.forEach(cur => { initBalances[cur] = 0; });
    const newCustomer: Customer = {
      id: nextId,
      name: customerData.name || '',
      phone: customerData.phone || '',
      password: customerData.password || '123',
      balances: initBalances,
      notes: customerData.notes || '',
      createdAt: new Date().toISOString()
    };
    updatedCustomers = [...updatedCustomers, newCustomer];
  }

  const newState: AppState = {
    ...state,
    customers: updatedCustomers
  };

  saveState(newState);
  return newState;
}

/**
 * Create employee
 */
export function handleSaveEmployee(
  state: AppState,
  employeeData: Omit<AppUser, 'id'>
): AppState {
  const nextId = `usr-${Date.now()}`;
  const newEmployee: AppUser = {
    id: nextId,
    isOnline: false,
    lastActiveAt: new Date().toISOString(),
    ...employeeData
  };

  const newState: AppState = {
    ...state,
    users: [...state.users, newEmployee]
  };

  saveState(newState);
  return newState;
}

/**
 * Edit employee
 */
export function handleEditEmployee(
  state: AppState,
  employeeId: string,
  updatedFields: Partial<AppUser>
): AppState {
  const updatedUsers = state.users.map(u => {
    if (u.id === employeeId) {
      return {
        ...u,
        ...updatedFields
      };
    }
    return u;
  });

  const isSelf = state.currentUser && state.currentUser.id === employeeId;
  const isCredentialsChanged = isSelf && (
    (updatedFields.password !== undefined && updatedFields.password !== (state.currentUser as AppUser).password) ||
    (updatedFields.email !== undefined && updatedFields.email !== (state.currentUser as AppUser).email)
  );

  let updatedCurrentUser = state.currentUser;
  let updatedRole = state.currentSessionRole;

  if (isSelf) {
    if (isCredentialsChanged && (state.currentUser as AppUser).role !== 'Owner') {
      // Non-owner changed their login credentials; force re-login
      updatedCurrentUser = null;
      updatedRole = null;
      localStorage.removeItem('hawala_remember_me');
      sessionStorage.removeItem('hawala_session_user');
      sessionStorage.removeItem('hawala_session_role');
    } else {
      updatedCurrentUser = { ...state.currentUser, ...updatedFields } as AppUser;
      sessionStorage.setItem('hawala_session_user', JSON.stringify(updatedCurrentUser));
    }
  }

  const newState: AppState = {
    ...state,
    users: updatedUsers,
    currentUser: updatedCurrentUser,
    currentSessionRole: updatedRole
  };

  saveState(newState);
  return newState;
}

/**
 * Delete employee
 */
export function handleDeleteEmployee(state: AppState, employeeId: string): AppState {
  const isCurrent = state.currentUser?.id === employeeId;
  const newState = {
    ...state,
    users: state.users.filter(u => u.id !== employeeId),
    currentUser: isCurrent ? null : state.currentUser,
    currentSessionRole: isCurrent ? null : state.currentSessionRole
  };
  if (isCurrent) {
    localStorage.removeItem('hawala_remember_me');
    sessionStorage.removeItem('hawala_session_user');
    sessionStorage.removeItem('hawala_session_role');
  }
  saveState(newState);
  return newState;
}

/**
 * Delete Customer (only if has zero balance for basic accounting data safety, but let's allow it)
 */
export function handleDeleteCustomer(state: AppState, customerId: string): AppState {
  const custToDelete = state.customers.find(c => c.id === customerId);
  let updatedDeleted = state.deletedRecords || [];
  if (custToDelete) {
    const deletedRecord: DeletedRecord = {
      id: `DEL-${Date.now()}`,
      category: 'Customer',
      originalId: custToDelete.id,
      title: `کڕیاری سڕاوە: ${custToDelete.name}`,
      deletedAt: new Date().toISOString(),
      deletedBy: state.currentUser?.name || 'خاوەنکار',
      notes: custToDelete.notes || '',
      details: {
        'ناوی کڕیار': custToDelete.name,
        'ژمارەی مۆبایل': custToDelete.phone,
        'باڵانسی دراوەکان': Object.entries(custToDelete.balances || {}).map(([k, v]) => `${k}: ${v.toLocaleString()}`).join(' | '),
        'تێبینی': custToDelete.notes || 'بێ تێبینی',
        'کاتی تۆمارکردن': custToDelete.createdAt
      }
    };
    updatedDeleted = [deletedRecord, ...updatedDeleted];
  }

  const newState = {
    ...state,
    customers: state.customers.filter(c => c.id !== customerId),
    deletedRecords: updatedDeleted
  };
  saveState(newState);
  return newState;
}

/**
 * Update System General Settings
 */
export function handleSaveSettings(state: AppState, settings: SystemSettings): AppState {
  const newState = {
    ...state,
    settings
  };
  saveState(newState);
  return newState;
}

/**
 * Add New Custom Currency to the system
 */
export function handleAddCurrency(state: AppState, currencyCode: string): AppState {
  const code = currencyCode.trim().toUpperCase();
  if (!code || state.currencies.includes(code)) return state;

  const updatedCurrencies = [...state.currencies, code];

  // Update safeBalances (set new currency to 0 if not exists)
  const updatedSafe = { ...state.safeBalances };
  if (updatedSafe[code] === undefined) {
    updatedSafe[code] = 0;
  }

  // Update customers' currency balances
  const updatedCustomers = state.customers.map(c => {
    const newBalances = { ...c.balances };
    if (newBalances[code] === undefined) {
      newBalances[code] = 0;
    }
    return { ...c, balances: newBalances };
  });

  const newState: AppState = {
    ...state,
    currencies: updatedCurrencies,
    safeBalances: updatedSafe,
    customers: updatedCustomers
  };

  saveState(newState);
  return newState;
}

/**
 * Delete a Currency from the system
 */
export function handleDeleteCurrency(state: AppState, currencyCode: string): AppState {
  const code = currencyCode.trim().toUpperCase();
  if (!code || !state.currencies.includes(code)) return state;
  // Core currencies USD and IQD should be protected from accidental removal
  if (code === 'USD' || code === 'IQD') return state;

  const updatedCurrencies = state.currencies.filter(c => c !== code);
  const updatedSafe = { ...state.safeBalances };
  delete updatedSafe[code];

  const updatedCustomers = state.customers.map(c => {
    const newBalances = { ...c.balances };
    delete newBalances[code];
    return { ...c, balances: newBalances };
  });

  const newState: AppState = {
    ...state,
    currencies: updatedCurrencies,
    safeBalances: updatedSafe,
    customers: updatedCustomers
  };

  saveState(newState);
  return newState;
}

/**
 * Reset all active databases and start with clean empty state
 */
export function handleResetAllData(state: AppState): AppState {
  // Keep users (employees), settings, and currencies list, and clear transactions, transfers, balances
  const initialSafe: CurrencyBalance = {};
  state.currencies.forEach(cur => {
    initialSafe[cur] = 0;
  });

  const clearedCustomers = state.customers.map(c => {
    const emptyBalances: CurrencyBalance = {};
    state.currencies.forEach(cur => {
      emptyBalances[cur] = 0;
    });
    return {
      ...c,
      balances: emptyBalances
    };
  });

  const newState: AppState = {
    ...state,
    customers: clearedCustomers,
    safeBalances: initialSafe,
    transactions: [],
    fastTransfers: [],
    standardTransfers: [],
    deletedRecords: [],
  };

  saveState(newState);
  return newState;
}

/**
 * Revert and safely delete a transaction, restoring any altered balances or referenced structures.
 */
export function handleDeleteTransaction(state: AppState, transactionId: string): AppState {
  const tx = state.transactions.find(t => t.id === transactionId);
  if (!tx) return state;

  let updatedCustomers = [...state.customers];
  let updatedSafe = { ...state.safeBalances };
  let updatedFastTransfers = [...state.fastTransfers];
  let updatedStandardTransfers = [...state.standardTransfers];

  // Revert balance changes based on transaction type
  if (tx.type === 'Deposit' || tx.type === 'Withdrawal') {
    if (tx.customerId) {
      updatedCustomers = updatedCustomers.map(c => {
        if (c.id === tx.customerId) {
          const newBalances = { ...c.balances };
          newBalances[tx.currency] = (newBalances[tx.currency] || 0) - tx.amount;
          return { ...c, balances: newBalances };
        }
        return c;
      });
    }
    updatedSafe[tx.currency] = (updatedSafe[tx.currency] || 0) - tx.amount;

  } else if (tx.type === 'Exchange') {
    const targetCur = tx.targetCurrency || 'IQD';
    const targetAmt = tx.targetAmount || 0;

    const isSafeEx = !tx.customerId || tx.customerId === 'system-exchange' || tx.customerName === 'خانەی گەنجینە';
    if (isSafeEx) {
      updatedSafe.USD = (updatedSafe.USD || 0) - tx.amount;
      updatedSafe[targetCur] = (updatedSafe[targetCur] || 0) - targetAmt;
    }

    // We also revert the Customer or system-exchange balance:
    const targetCustId = tx.customerId || 'system-exchange';
    updatedCustomers = updatedCustomers.map(c => {
      if (c.id === targetCustId) {
        const newBalances = { ...c.balances };
        newBalances.USD = (newBalances.USD || 0) + tx.amount;
        newBalances[targetCur] = (newBalances[targetCur] || 0) + targetAmt;
        return { ...c, balances: newBalances };
      }
      return c;
    });

  } else if (tx.type === 'FastTransfer') {
    const hwMatch = tx.notes?.match(/HW-\d+/);
    const hwId = hwMatch ? hwMatch[0] : null;

    if (hwId) {
      const ft = state.fastTransfers.find(t => t.id === hwId);
      if (ft) {
        if (tx.amount > 0) {
          // This is a DELIVERY transaction
          // Revert status back to 'Pending'
          updatedFastTransfers = updatedFastTransfers.map(t => {
            if (t.id === hwId) {
              const { deliveredAt, ...rest } = t;
              return { ...rest, status: 'Pending' as const };
            }
            return t;
          });
          // Restore the delivered amount back to the safe
          updatedSafe[ft.currency] = (updatedSafe[ft.currency] || 0) + ft.amount;
        } else {
          // This is a CREATION transaction
          // Refund sender (amount + fee)
          updatedCustomers = updatedCustomers.map(c => {
            if (c.id === ft.senderId) {
              const newBalances = { ...c.balances };
              newBalances[ft.currency] += (ft.amount + ft.fee);
              return { ...c, balances: newBalances };
            }
            return c;
          });
          // Remove Fast Transfer
          updatedFastTransfers = updatedFastTransfers.filter(t => t.id !== hwId);
        }
      }
    }

  } else if (tx.type === 'StandardTransfer') {
    const stMatch = tx.notes?.match(/HW-S\d+/);
    const stId = stMatch ? stMatch[0] : null;

    if (stId) {
      const transfer = state.standardTransfers.find(t => t.id === stId);
      if (transfer) {
        const tCur = transfer.currency || 'USD';
        updatedCustomers = updatedCustomers.map(c => {
          if (c.id === transfer.senderId) {
            return {
              ...c,
              balances: {
                ...c.balances,
                [tCur]: (c.balances[tCur] || 0) - transfer.senderIQDAdded
              }
            };
          }
          if (c.id === transfer.receiverId) {
            return {
              ...c,
              balances: {
                ...c.balances,
                [tCur]: (c.balances[tCur] || 0) + transfer.receiverIQDDeducted
              }
            };
          }
          return c;
        });

        updatedStandardTransfers = updatedStandardTransfers.filter(t => t.id !== stId);
      }
    }

  } else if (tx.type === 'InternalTransfer') {
    const baseTxId = transactionId.endsWith('-REC') ? transactionId.slice(0, -4) : transactionId;
    const senderTx = state.transactions.find(t => t.id === baseTxId);
    const receiverTx = state.transactions.find(t => t.id === baseTxId + '-REC');

    if (senderTx && receiverTx && senderTx.customerId && receiverTx.customerId) {
      const cur = senderTx.currency;
      const amt = Math.abs(senderTx.amount);
      updatedCustomers = updatedCustomers.map(c => {
        if (c.id === senderTx.customerId) {
          return {
            ...c,
            balances: {
              ...c.balances,
              [cur]: (c.balances[cur] || 0) + amt
            }
          };
        }
        if (c.id === receiverTx.customerId) {
          return {
            ...c,
            balances: {
              ...c.balances,
              [cur]: (c.balances[cur] || 0) - amt
            }
          };
        }
        return c;
      });
    } else {
      const match = tx.notes?.match(/ڕاستەوخۆ بۆ (.*?)\./) || tx.notes?.match(/ڕاستەوخۆ لە لایەن (.*?)\./);
      const otherPartyName = match ? match[1].trim() : '';
      const otherPartyCustomer = state.customers.find(c => c.name === otherPartyName);

      if (tx.customerId && otherPartyCustomer) {
        updatedCustomers = updatedCustomers.map(c => {
          if (c.id === tx.customerId) {
            const newBalances = { ...c.balances };
            newBalances[tx.currency] += (tx.amount < 0 ? Math.abs(tx.amount) : -tx.amount);
            return { ...c, balances: newBalances };
          }
          if (c.id === otherPartyCustomer.id) {
            const newBalances = { ...c.balances };
            newBalances[tx.currency] += (tx.amount < 0 ? -Math.abs(tx.amount) : Math.abs(tx.amount));
            return { ...c, balances: newBalances };
          }
          return c;
        });
      }
    }

  } else if (tx.type === 'SafeAdjustment') {
    updatedSafe[tx.currency] = (updatedSafe[tx.currency] || 0) - tx.amount;
  }

  const stMatchForDel = tx.notes?.match(/HW-S\d+/);
  const stIdForDel = stMatchForDel ? stMatchForDel[0] : null;
  const baseTxIdForDel = transactionId.endsWith('-REC') ? transactionId.slice(0, -4) : transactionId;

  const remainingTx = state.transactions.filter(t => {
    if (t.id === baseTxIdForDel || t.id === baseTxIdForDel + '-REC') return false;
    if (stIdForDel && t.notes?.includes(stIdForDel)) return false;
    return t.id !== transactionId;
  });

  const finalCustomers = recalculateSystemCustomerBalances(updatedCustomers, remainingTx);

  let cat: DeletedRecordCategory = 'SafeTransaction';
  if (tx.type === 'Exchange') cat = 'Exchange';
  else if (tx.type === 'FastTransfer' || tx.type === 'StandardTransfer') cat = 'Transfer';
  else if (tx.type === 'InternalTransfer' || tx.type === 'Deposit' || tx.type === 'Withdrawal') cat = 'Customer';

  const deletedRecord: DeletedRecord = {
    id: `DEL-${Date.now()}`,
    category: cat,
    originalId: tx.id,
    title: `${tx.type === 'Exchange' ? 'گۆڕینەوەی' : tx.type === 'InternalTransfer' ? 'گواستنەوەی ناوخۆیی' : tx.type === 'Deposit' ? 'داخڵکردنی' : tx.type === 'Withdrawal' ? 'ڕاکێشانی' : 'مامەڵەی'} ${Math.abs(tx.amount).toLocaleString()} ${tx.currency}`,
    deletedAt: new Date().toISOString(),
    deletedBy: state.currentUser?.name || 'خاوەنکار',
    currency: tx.currency,
    amount: Math.abs(tx.amount),
    notes: tx.notes || '',
    details: {
      'کۆدی مامەڵە': tx.id,
      'جۆری مامەڵە': tx.type,
      'بڕی پارە': `${Math.abs(tx.amount).toLocaleString()} ${tx.currency}`,
      'کڕیار / هەژمار': tx.customerName || tx.customerId || 'دیاری نەکراو',
      'ئەنجامدەر': tx.performedBy,
      'بەروار و کات': tx.timestamp,
      'تێبینی': tx.notes || 'بێ تێبینی'
    }
  };

  const newState: AppState = {
    ...state,
    customers: finalCustomers,
    safeBalances: recalculateSafeBalances(remainingTx, state.currencies),
    fastTransfers: updatedFastTransfers,
    standardTransfers: updatedStandardTransfers,
    transactions: remainingTx,
    deletedRecords: [deletedRecord, ...(state.deletedRecords || [])]
  };

  saveState(newState);
  return newState;
}

/**
 * Edit an existing office expense transaction
 */
export function handleEditExpense(
  state: AppState,
  transactionId: string,
  newAmount: number,
  newCurrency: Currency,
  newNotes: string
): AppState {
  const oldTx = state.transactions.find(t => t.id === transactionId);
  if (!oldTx) return state;

  const oldAmount = Math.abs(oldTx.amount);
  const oldCurrency = oldTx.currency;
  const absNewAmount = Math.abs(newAmount);

  // 1. Revert old expense balance impact
  const updatedSafe = { ...state.safeBalances };
  updatedSafe[oldCurrency] = (updatedSafe[oldCurrency] || 0) + oldAmount;

  const updatedCustomers = state.customers.map(c => {
    if (c.id === 'system-expenses') {
      const newBals = { ...c.balances };
      newBals[oldCurrency] = (newBals[oldCurrency] || 0) + oldAmount;
      return { ...c, balances: newBals };
    }
    return c;
  });

  // 2. Apply new expense balance impact
  updatedSafe[newCurrency] = (updatedSafe[newCurrency] || 0) - absNewAmount;

  const finalCustomers = updatedCustomers.map(c => {
    if (c.id === 'system-expenses') {
      const newBals = { ...c.balances };
      newBals[newCurrency] = (newBals[newCurrency] || 0) - absNewAmount;
      return { ...c, balances: newBals };
    }
    return c;
  });

  // 3. Update transaction record
  const updatedTransactions = state.transactions.map(t => {
    if (t.id === transactionId) {
      return {
        ...t,
        amount: -absNewAmount,
        currency: newCurrency,
        notes: newNotes
      };
    }
    return t;
  });

  const updatedCustomersWithRecalc = recalculateSystemCustomerBalances(finalCustomers, updatedTransactions);

  const newState: AppState = {
    ...state,
    safeBalances: updatedSafe,
    customers: updatedCustomersWithRecalc,
    transactions: updatedTransactions
  };

  saveState(newState);
  return newState;
}

/**
 * Edit notes for an existing transaction (e.g. internal transfer or ledger log)
 */
export function handleEditTransactionNotes(
  state: AppState,
  transactionId: string,
  newNotes: string
): AppState {
  const baseTxId = transactionId.endsWith('-REC') ? transactionId.slice(0, -4) : transactionId;
  const receiverTxId = `${baseTxId}-REC`;

  const updatedTransactions = state.transactions.map(t => {
    if (t.id === baseTxId || t.id === receiverTxId) {
      return { ...t, notes: newNotes };
    }
    return t;
  });

  const newState: AppState = {
    ...state,
    transactions: updatedTransactions
  };

  saveState(newState);
  return newState;
}

/**
 * Edit an existing Vault transaction (Deposit, Withdrawal, Safe Adjustment, Expense, etc.)
 */
export function handleEditVaultTransaction(
  state: AppState,
  transactionId: string,
  newAmount: number,
  newCurrency: Currency,
  newNotes: string
): AppState {
  const oldTx = state.transactions.find(t => t.id === transactionId);
  if (!oldTx) return state;

  // If it's an Expense, delegate to handleEditExpense
  if (oldTx.customerId === 'system-expenses') {
    return handleEditExpense(state, transactionId, newAmount, newCurrency, newNotes);
  }

  const oldAmount = oldTx.amount; // signed amount (+ or -)
  const oldCurrency = oldTx.currency;
  
  // Keep original sign direction (positive deposit vs negative withdrawal)
  const isNegative = oldAmount < 0;
  const absNewAmount = Math.abs(newAmount);
  const signedNewAmount = isNegative ? -absNewAmount : absNewAmount;

  // 1. Revert old safe balance impact
  const updatedSafe = { ...state.safeBalances };
  updatedSafe[oldCurrency] = (updatedSafe[oldCurrency] || 0) - oldAmount;

  // 2. Apply new safe balance impact
  updatedSafe[newCurrency] = (updatedSafe[newCurrency] || 0) + signedNewAmount;

  // 3. If tx belonged to a customer, update customer balance too
  let updatedCustomers = [...state.customers];
  if (oldTx.customerId) {
    updatedCustomers = updatedCustomers.map(c => {
      if (c.id === oldTx.customerId) {
        const newBals = { ...c.balances };
        newBals[oldCurrency] = (newBals[oldCurrency] || 0) - oldAmount;
        newBals[newCurrency] = (newBals[newCurrency] || 0) + signedNewAmount;
        return { ...c, balances: newBals };
      }
      return c;
    });
  }

  // 4. Update transaction record
  const updatedTransactions = state.transactions.map(t => {
    if (t.id === transactionId) {
      return {
        ...t,
        amount: signedNewAmount,
        currency: newCurrency,
        notes: newNotes
      };
    }
    return t;
  });

  const finalCustomers = recalculateSystemCustomerBalances(updatedCustomers, updatedTransactions);

  const newState: AppState = {
    ...state,
    safeBalances: recalculateSafeBalances(updatedTransactions, state.currencies),
    customers: finalCustomers,
    transactions: updatedTransactions
  };

  saveState(newState);
  return newState;
}

