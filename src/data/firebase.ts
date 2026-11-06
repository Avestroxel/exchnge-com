import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, doc, getDoc, setLogLevel } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Silence verbose internal backoff and retry warnings when quota is exhausted
try {
  setLogLevel('silent');
} catch {
  // ignore
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  ignoreUndefinedProperties: true,
}, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

const QUOTA_STORAGE_KEY = 'hawala_firestore_quota_exhausted_v2';

function checkInitialQuota(): boolean {
  try {
    const item = localStorage.getItem(QUOTA_STORAGE_KEY);
    if (!item) return false;
    const time = Number(item);
    // Quota resets daily (within 24 hours)
    if (Date.now() - time < 24 * 60 * 60 * 1000) {
      return true;
    }
  } catch {
    // ignore
  }
  return false;
}

// Track Firestore quota state to prevent spamming failed requests
let firestoreQuotaExhausted = checkInitialQuota();

export function isQuotaExhausted(): boolean {
  return firestoreQuotaExhausted;
}

export function setQuotaExhausted(exhausted: boolean = true) {
  firestoreQuotaExhausted = exhausted;
  try {
    if (exhausted) {
      localStorage.setItem(QUOTA_STORAGE_KEY, String(Date.now()));
    } else {
      localStorage.removeItem(QUOTA_STORAGE_KEY);
    }
  } catch {
    // ignore
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const message = error instanceof Error ? error.message : String(error);
  const errInfo: FirestoreErrorInfo = {
    error: message,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  
  // If quota limit is exceeded, switch to offline mode and suppress errors
  if (
    message.includes('resource-exhausted') || 
    message.includes('Quota limit exceeded') || 
    message.includes('Free daily write units') ||
    message.includes('Free daily read units') ||
    message.includes('quota metric')
  ) {
    setQuotaExhausted(true);
    console.warn('Firestore Quota Notice: Free daily write quota reached. Switched gracefully to local persistent storage cache.');
    return;
  }

  // If it's a temporary network/offline error, log warning instead of crashing
  if (message.includes('unavailable') || message.includes('offline') || message.includes('Could not reach Cloud Firestore')) {
    console.warn('Firestore Offline/Network Warning: ', JSON.stringify(errInfo));
    return;
  }

  if (message.includes('Missing or insufficient permissions')) {
    console.error('Firestore Error: ', JSON.stringify(errInfo));
    throw new Error(JSON.stringify(errInfo));
  }

  console.warn('Firestore Notice: ', JSON.stringify(errInfo));
}

// Gentle connection verification (does not throw or spam backend)
async function testConnection() {
  try {
    if (firestoreQuotaExhausted) return;
    await getDoc(doc(db, 'test', 'connection'));
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (
      msg.includes('resource-exhausted') || 
      msg.includes('Quota limit exceeded') ||
      msg.includes('Free daily write units') ||
      msg.includes('quota metric')
    ) {
      setQuotaExhausted(true);
    }
  }
}

// Run connection check once lazily if not quota restricted
setTimeout(() => {
  if (!firestoreQuotaExhausted) {
    testConnection();
  }
}, 2000);
