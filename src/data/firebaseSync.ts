import { 
  collection, doc, getDocs, setDoc, deleteDoc, getDoc, writeBatch, onSnapshot
} from 'firebase/firestore';
import { signInAnonymously as firebaseSignInAnonymously } from 'firebase/auth';
import { db, auth, handleFirestoreError, OperationType, isQuotaExhausted, setQuotaExhausted } from './firebase';
import { AppState, ensureSystemAccounts } from './stateManager';
import { AppUser, Customer, Transaction, FastTransferDetails, StandardTransferDetails, SystemSettings, CurrencyBalance, DeletedRecord } from '../types';

export async function authenticateSession(): Promise<string | null> {
  if (isQuotaExhausted()) return null;
  try {
    const userCredential = await firebaseSignInAnonymously(auth);
    return userCredential.user.uid;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('resource-exhausted') || msg.includes('Quota limit exceeded')) {
      setQuotaExhausted(true);
    }
    return null;
  }
}

export function cleanUndefinedForFirestore<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(cleanUndefinedForFirestore) as unknown as T;
  }
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const key of Object.keys(obj as any)) {
      const val = (obj as any)[key];
      if (val !== undefined) {
        cleaned[key] = cleanUndefinedForFirestore(val);
      }
    }
    return cleaned as T;
  }
  return obj;
}

const INITIAL_USER: AppUser = {
  id: 'usr-1',
  name: 'خاوەن',
  email: 'admin@exchange.com',
  role: 'Owner',
  isOnline: false,
  lastActiveAt: new Date().toISOString()
};

const SAMPLE_EMPLOYEES: AppUser[] = [
  { id: 'usr-2', name: 'دارا ڕەسوڵ', email: 'dara@exchange.com', role: 'Admin', isOnline: false, lastActiveAt: new Date().toISOString() },
  { id: 'usr-3', name: 'شیلان عومەر', email: 'shilan@exchange.com', role: 'Teller', isOnline: false, lastActiveAt: new Date().toISOString() },
  { id: 'usr-4', name: 'ڕێبین مەحمود', email: 'rebin@exchange.com', role: 'Teller', isOnline: false, lastActiveAt: new Date().toISOString() }
];

export async function seedInitialCleanState(): Promise<AppState> {
  const defaultSettings: SystemSettings = {
    officeName: 'نووسینگەی ئاڵوگۆڕ',
    themeColor: 'emerald',
    defaultCurrency: 'USD',
    fontSize: 'md',
    language: 'ku'
  };

  const defaultCurrencies = ['USD', 'IQD'];
  const defaultSafe: CurrencyBalance = {
    USD: 0,
    IQD: 0
  };

  const allStarterUsers = [INITIAL_USER, ...SAMPLE_EMPLOYEES];
  const fallbackState: AppState = {
    users: allStarterUsers,
    customers: [],
    currencies: defaultCurrencies,
    safeBalances: defaultSafe,
    transactions: [],
    fastTransfers: [],
    standardTransfers: [],
    deletedRecords: [],
    settings: defaultSettings,
    currentUser: null,
    currentSessionRole: null
  };

  if (isQuotaExhausted()) {
    return fallbackState;
  }

  try {
    // Write configurations to Firestore only if quota not reached
    try {
      await setDoc(doc(db, 'settings', 'config'), cleanUndefinedForFirestore(defaultSettings));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('resource-exhausted') || msg.includes('Quota limit exceeded')) {
        setQuotaExhausted(true);
        return fallbackState;
      }
      handleFirestoreError(err, OperationType.WRITE, 'settings/config');
    }

    if (isQuotaExhausted()) return fallbackState;

    try {
      await setDoc(doc(db, 'currencies', 'state'), cleanUndefinedForFirestore({
        currencies: defaultCurrencies,
        safeBalances: defaultSafe
      }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('resource-exhausted') || msg.includes('Quota limit exceeded')) {
        setQuotaExhausted(true);
        return fallbackState;
      }
      handleFirestoreError(err, OperationType.WRITE, 'currencies/state');
    }

    if (isQuotaExhausted()) return fallbackState;

    // Write initial owner and employees
    for (const u of allStarterUsers) {
      if (isQuotaExhausted()) break;
      try {
        await setDoc(doc(db, 'users', u.id), cleanUndefinedForFirestore(u));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('resource-exhausted') || msg.includes('Quota limit exceeded')) {
          setQuotaExhausted(true);
          return fallbackState;
        }
        handleFirestoreError(err, OperationType.WRITE, `users/${u.id}`);
      }
    }

    return fallbackState;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('resource-exhausted') || msg.includes('Quota limit exceeded')) {
      setQuotaExhausted(true);
    }
    return fallbackState;
  }
}

export async function fetchAppStateFromFirebase(): Promise<AppState | null> {
  if (isQuotaExhausted()) {
    return null;
  }
  try {
    // Check if initial settings exist
    const settingsSnap = await getDoc(doc(db, 'settings', 'config'));
    if (!settingsSnap.exists()) {
      return null;
    }

    const settings = settingsSnap.data() as SystemSettings;

    // Fetch currencies list and physical balances registers
    const currencySnap = await getDoc(doc(db, 'currencies', 'state'));
    let currencies = ['USD', 'IQD'];
    let safeBalances: CurrencyBalance = { USD: 0, IQD: 0 };
    if (currencySnap.exists()) {
      const curData = currencySnap.data();
      if (curData.currencies) currencies = curData.currencies.filter((c: string) => c !== 'IRR');
      if (curData.safeBalances) {
        safeBalances = { ...curData.safeBalances };
        delete safeBalances.IRR;
      }
    }

    // Fetch collections
    const usersSnap = await getDocs(collection(db, 'users'));
    const users: AppUser[] = [];
    usersSnap.forEach(doc => {
      users.push(doc.data() as AppUser);
    });

    const customersSnap = await getDocs(collection(db, 'customers'));
    const customers: Customer[] = [];
    customersSnap.forEach(doc => {
      customers.push(doc.data() as Customer);
    });

    const transactionsSnap = await getDocs(collection(db, 'transactions'));
    const transactions: Transaction[] = [];
    transactionsSnap.forEach(doc => {
      transactions.push(doc.data() as Transaction);
    });
    // Sort transactions newest first
    transactions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const fastSnap = await getDocs(collection(db, 'fastTransfers'));
    const fastTransfers: FastTransferDetails[] = [];
    fastSnap.forEach(doc => {
      fastTransfers.push(doc.data() as FastTransferDetails);
    });
    fastTransfers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const standardSnap = await getDocs(collection(db, 'standardTransfers'));
    const standardTransfers: StandardTransferDetails[] = [];
    standardSnap.forEach(doc => {
      standardTransfers.push(doc.data() as StandardTransferDetails);
    });
    standardTransfers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const deletedSnap = await getDocs(collection(db, 'deletedRecords'));
    const deletedRecords: DeletedRecord[] = [];
    deletedSnap.forEach(doc => {
      deletedRecords.push(doc.data() as DeletedRecord);
    });
    deletedRecords.sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());

    return {
      users,
      customers: ensureSystemAccounts(customers),
      currencies,
      safeBalances,
      transactions,
      fastTransfers,
      standardTransfers,
      deletedRecords,
      settings,
      currentUser: null,
      currentSessionRole: null
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'fetchAppState');
    return null;
  }
}

// ASYNC PERSISTENCE INJECTORS

export async function syncSettings(settings: SystemSettings) {
  if (isQuotaExhausted()) return;
  try {
    await setDoc(doc(db, 'settings', 'config'), cleanUndefinedForFirestore(settings));
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('resource-exhausted') || msg.includes('Quota limit exceeded') || msg.includes('Free daily write units')) {
      setQuotaExhausted(true);
      return;
    }
    handleFirestoreError(error, OperationType.WRITE, 'settings/config');
  }
}

export async function syncCurrenciesState(currencies: string[], safeBalances: CurrencyBalance) {
  if (isQuotaExhausted()) return;
  try {
    await setDoc(doc(db, 'currencies', 'state'), cleanUndefinedForFirestore({ currencies, safeBalances }));
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('resource-exhausted') || msg.includes('Quota limit exceeded') || msg.includes('Free daily write units')) {
      setQuotaExhausted(true);
      return;
    }
    handleFirestoreError(error, OperationType.WRITE, 'currencies/state');
  }
}

export async function syncUser(user: AppUser) {
  if (isQuotaExhausted()) return;
  try {
    await setDoc(doc(db, 'users', user.id), cleanUndefinedForFirestore(user));
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('resource-exhausted') || msg.includes('Quota limit exceeded') || msg.includes('Free daily write units')) {
      setQuotaExhausted(true);
      return;
    }
    handleFirestoreError(error, OperationType.WRITE, `users/${user.id}`);
  }
}

export async function syncDeleteUser(userId: string) {
  if (isQuotaExhausted()) return;
  try {
    await deleteDoc(doc(db, 'users', userId));
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('resource-exhausted') || msg.includes('Quota limit exceeded') || msg.includes('Free daily write units')) {
      setQuotaExhausted(true);
      return;
    }
    handleFirestoreError(error, OperationType.DELETE, `users/${userId}`);
  }
}

export async function syncCustomer(customer: Customer) {
  if (isQuotaExhausted()) return;
  try {
    await setDoc(doc(db, 'customers', customer.id), cleanUndefinedForFirestore(customer));
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('resource-exhausted') || msg.includes('Quota limit exceeded') || msg.includes('Free daily write units')) {
      setQuotaExhausted(true);
      return;
    }
    handleFirestoreError(error, OperationType.WRITE, `customers/${customer.id}`);
  }
}

export async function syncDeleteCustomer(customerId: string) {
  if (isQuotaExhausted()) return;
  try {
    await deleteDoc(doc(db, 'customers', customerId));
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('resource-exhausted') || msg.includes('Quota limit exceeded') || msg.includes('Free daily write units')) {
      setQuotaExhausted(true);
      return;
    }
    handleFirestoreError(error, OperationType.DELETE, `customers/${customerId}`);
  }
}

export async function syncTransaction(transaction: Transaction) {
  if (isQuotaExhausted()) return;
  try {
    await setDoc(doc(db, 'transactions', transaction.id), cleanUndefinedForFirestore(transaction));
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('resource-exhausted') || msg.includes('Quota limit exceeded') || msg.includes('Free daily write units')) {
      setQuotaExhausted(true);
      return;
    }
    handleFirestoreError(error, OperationType.WRITE, `transactions/${transaction.id}`);
  }
}

export async function syncDeleteTransaction(transactionId: string) {
  if (isQuotaExhausted()) return;
  try {
    await deleteDoc(doc(db, 'transactions', transactionId));
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('resource-exhausted') || msg.includes('Quota limit exceeded') || msg.includes('Free daily write units')) {
      setQuotaExhausted(true);
      return;
    }
    handleFirestoreError(error, OperationType.DELETE, `transactions/${transactionId}`);
  }
}

export async function syncFastTransfer(transfer: FastTransferDetails) {
  if (isQuotaExhausted()) return;
  try {
    await setDoc(doc(db, 'fastTransfers', transfer.id), cleanUndefinedForFirestore(transfer));
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('resource-exhausted') || msg.includes('Quota limit exceeded') || msg.includes('Free daily write units')) {
      setQuotaExhausted(true);
      return;
    }
    handleFirestoreError(error, OperationType.WRITE, `fastTransfers/${transfer.id}`);
  }
}

export async function syncDeleteFastTransfer(fastTransferId: string) {
  if (isQuotaExhausted()) return;
  try {
    await deleteDoc(doc(db, 'fastTransfers', fastTransferId));
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('resource-exhausted') || msg.includes('Quota limit exceeded') || msg.includes('Free daily write units')) {
      setQuotaExhausted(true);
      return;
    }
    handleFirestoreError(error, OperationType.DELETE, `fastTransfers/${fastTransferId}`);
  }
}

export async function syncStandardTransfer(transfer: StandardTransferDetails) {
  if (isQuotaExhausted()) return;
  try {
    await setDoc(doc(db, 'standardTransfers', transfer.id), cleanUndefinedForFirestore(transfer));
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('resource-exhausted') || msg.includes('Quota limit exceeded') || msg.includes('Free daily write units')) {
      setQuotaExhausted(true);
      return;
    }
    handleFirestoreError(error, OperationType.WRITE, `standardTransfers/${transfer.id}`);
  }
}

export async function syncDeleteStandardTransfer(standardTransferId: string) {
  if (isQuotaExhausted()) return;
  try {
    await deleteDoc(doc(db, 'standardTransfers', standardTransferId));
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('resource-exhausted') || msg.includes('Quota limit exceeded') || msg.includes('Free daily write units')) {
      setQuotaExhausted(true);
      return;
    }
    handleFirestoreError(error, OperationType.DELETE, `standardTransfers/${standardTransferId}`);
  }
}

export async function syncDeletedRecord(record: DeletedRecord) {
  if (isQuotaExhausted()) return;
  try {
    await setDoc(doc(db, 'deletedRecords', record.id), cleanUndefinedForFirestore(record));
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('resource-exhausted') || msg.includes('Quota limit exceeded') || msg.includes('Free daily write units')) {
      setQuotaExhausted(true);
      return;
    }
    handleFirestoreError(error, OperationType.WRITE, `deletedRecords/${record.id}`);
  }
}

export async function resetFirestoreDatabase(currencies: string[]) {
  if (isQuotaExhausted()) return;
  try {
    const emptySafe: CurrencyBalance = {};
    currencies.forEach(cur => {
      emptySafe[cur] = 0;
    });

    await setDoc(doc(db, 'currencies', 'state'), cleanUndefinedForFirestore({
      currencies,
      safeBalances: emptySafe
    }));

    // Clear ledger entries
    const txSnap = await getDocs(collection(db, 'transactions'));
    for (const snap of txSnap.docs) {
      if (isQuotaExhausted()) break;
      await deleteDoc(doc(db, 'transactions', snap.id));
    }

    const fastSnap = await getDocs(collection(db, 'fastTransfers'));
    for (const snap of fastSnap.docs) {
      if (isQuotaExhausted()) break;
      await deleteDoc(doc(db, 'fastTransfers', snap.id));
    }

    const standardSnap = await getDocs(collection(db, 'standardTransfers'));
    for (const snap of standardSnap.docs) {
      if (isQuotaExhausted()) break;
      await deleteDoc(doc(db, 'standardTransfers', snap.id));
    }

    const deletedSnap = await getDocs(collection(db, 'deletedRecords'));
    for (const snap of deletedSnap.docs) {
      if (isQuotaExhausted()) break;
      await deleteDoc(doc(db, 'deletedRecords', snap.id));
    }

    // Reset customers balances
    const custSnap = await getDocs(collection(db, 'customers'));
    for (const snap of custSnap.docs) {
      if (isQuotaExhausted()) break;
      const c = snap.data() as Customer;
      const emptyBalances: CurrencyBalance = {};
      currencies.forEach(cur => {
        emptyBalances[cur] = 0;
      });
      await setDoc(doc(db, 'customers', c.id), cleanUndefinedForFirestore({
        ...c,
        balances: emptyBalances
      }));
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('resource-exhausted') || msg.includes('Quota limit exceeded') || msg.includes('Free daily write units')) {
      setQuotaExhausted(true);
      return;
    }
    handleFirestoreError(error, OperationType.WRITE, 'resetFirestoreDatabase');
  }
}

export function listenToUsers(onUpdate: (users: AppUser[]) => void) {
  if (isQuotaExhausted()) return () => {};
  try {
    return onSnapshot(collection(db, 'users'), (snapshot) => {
      const users: AppUser[] = [];
      snapshot.forEach(doc => {
        users.push(doc.data() as AppUser);
      });
      onUpdate(users);
    }, (error) => {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('resource-exhausted') || msg.includes('Quota limit exceeded')) {
        setQuotaExhausted(true);
        return;
      }
      handleFirestoreError(error, OperationType.GET, 'users_realtime');
    });
  } catch {
    return () => {};
  }
}

export function listenToSettings(onUpdate: (settings: SystemSettings) => void) {
  if (isQuotaExhausted()) return () => {};
  try {
    return onSnapshot(doc(db, 'settings', 'config'), (snap) => {
      if (snap.exists()) {
        onUpdate(snap.data() as SystemSettings);
      }
    }, (error) => {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('resource-exhausted') || msg.includes('Quota limit exceeded')) {
        setQuotaExhausted(true);
        return;
      }
      handleFirestoreError(error, OperationType.GET, 'settings_realtime');
    });
  } catch {
    return () => {};
  }
}

export function listenToCurrenciesState(onUpdate: (data: { currencies: string[], safeBalances: CurrencyBalance }) => void) {
  if (isQuotaExhausted()) return () => {};
  try {
    return onSnapshot(doc(db, 'currencies', 'state'), (snap) => {
      if (snap.exists()) {
        const curData = snap.data();
        const cleanCurrencies = (curData.currencies || ['USD', 'IQD']).filter((c: string) => c !== 'IRR');
        const cleanSafe = { ...(curData.safeBalances || { USD: 0, IQD: 0 }) };
        delete cleanSafe.IRR;
        onUpdate({
          currencies: cleanCurrencies,
          safeBalances: cleanSafe
        });
      }
    }, (error) => {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('resource-exhausted') || msg.includes('Quota limit exceeded')) {
        setQuotaExhausted(true);
        return;
      }
      handleFirestoreError(error, OperationType.GET, 'currencies_realtime');
    });
  } catch {
    return () => {};
  }
}

export function listenToCustomers(onUpdate: (customers: Customer[]) => void) {
  if (isQuotaExhausted()) return () => {};
  try {
    return onSnapshot(collection(db, 'customers'), (snapshot) => {
      const customers: Customer[] = [];
      snapshot.forEach(doc => {
        customers.push(doc.data() as Customer);
      });
      onUpdate(ensureSystemAccounts(customers));
    }, (error) => {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('resource-exhausted') || msg.includes('Quota limit exceeded')) {
        setQuotaExhausted(true);
        return;
      }
      handleFirestoreError(error, OperationType.GET, 'customers_realtime');
    });
  } catch {
    return () => {};
  }
}

export function listenToTransactions(onUpdate: (transactions: Transaction[]) => void) {
  if (isQuotaExhausted()) return () => {};
  try {
    return onSnapshot(collection(db, 'transactions'), (snapshot) => {
      const transactions: Transaction[] = [];
      snapshot.forEach(doc => {
        transactions.push(doc.data() as Transaction);
      });
      // Sort transactions newest first
      transactions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      onUpdate(transactions);
    }, (error) => {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('resource-exhausted') || msg.includes('Quota limit exceeded')) {
        setQuotaExhausted(true);
        return;
      }
      handleFirestoreError(error, OperationType.GET, 'transactions_realtime');
    });
  } catch {
    return () => {};
  }
}

export function listenToFastTransfers(onUpdate: (transfers: FastTransferDetails[]) => void) {
  if (isQuotaExhausted()) return () => {};
  try {
    return onSnapshot(collection(db, 'fastTransfers'), (snapshot) => {
      const fastTransfers: FastTransferDetails[] = [];
      snapshot.forEach(doc => {
        fastTransfers.push(doc.data() as FastTransferDetails);
      });
      fastTransfers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onUpdate(fastTransfers);
    }, (error) => {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('resource-exhausted') || msg.includes('Quota limit exceeded')) {
        setQuotaExhausted(true);
        return;
      }
      handleFirestoreError(error, OperationType.GET, 'fastTransfers_realtime');
    });
  } catch {
    return () => {};
  }
}

export function listenToStandardTransfers(onUpdate: (transfers: StandardTransferDetails[]) => void) {
  if (isQuotaExhausted()) return () => {};
  try {
    return onSnapshot(collection(db, 'standardTransfers'), (snapshot) => {
      const standardTransfers: StandardTransferDetails[] = [];
      snapshot.forEach(doc => {
        standardTransfers.push(doc.data() as StandardTransferDetails);
      });
      standardTransfers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onUpdate(standardTransfers);
    }, (error) => {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('resource-exhausted') || msg.includes('Quota limit exceeded')) {
        setQuotaExhausted(true);
        return;
      }
      handleFirestoreError(error, OperationType.GET, 'standardTransfers_realtime');
    });
  } catch {
    return () => {};
  }
}

export function listenToDeletedRecords(onUpdate: (records: DeletedRecord[]) => void) {
  if (isQuotaExhausted()) return () => {};
  try {
    return onSnapshot(collection(db, 'deletedRecords'), (snapshot) => {
      const deletedRecords: DeletedRecord[] = [];
      snapshot.forEach(doc => {
        deletedRecords.push(doc.data() as DeletedRecord);
      });
      deletedRecords.sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());
      onUpdate(deletedRecords);
    }, (error) => {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('resource-exhausted') || msg.includes('Quota limit exceeded')) {
        setQuotaExhausted(true);
        return;
      }
      handleFirestoreError(error, OperationType.GET, 'deletedRecords_realtime');
    });
  } catch {
    return () => {};
  }
}
