import { Customer, AppUser, Transaction, FastTransferDetails, StandardTransferDetails, SystemSettings, CurrencyBalance, DeletedRecord } from '../types';

export const INITIAL_USER: AppUser = {
  id: 'usr-1',
  name: 'خاوەن',
  email: 'owner@hawala.com',
  role: 'Owner',
  password: 'owner123',
  isOnline: false,
  lastActiveAt: new Date().toISOString()
};

export const SAMPLE_EMPLOYEES: AppUser[] = [
  {
    id: 'usr-2',
    name: 'دارا ڕەسوڵ',
    email: 'dara@exchange.com',
    role: 'Admin',
    password: 'dara123',
    salary: 800,
    salaryCurrency: 'USD',
    isOnline: false,
    lastActiveAt: new Date().toISOString(),
    createdAt: '2026-01-10T09:00:00Z'
  },
  {
    id: 'usr-3',
    name: 'شیلان عومەر',
    email: 'shilan@exchange.com',
    role: 'Teller',
    password: 'shilan123',
    salary: 650,
    salaryCurrency: 'USD',
    isOnline: false,
    lastActiveAt: new Date().toISOString(),
    createdAt: '2026-02-01T10:30:00Z'
  },
  {
    id: 'usr-4',
    name: 'ڕێبین مەحمود',
    email: 'rebin@exchange.com',
    role: 'Teller',
    password: 'rebin123',
    salary: 600,
    salaryCurrency: 'USD',
    isOnline: false,
    lastActiveAt: new Date().toISOString(),
    createdAt: '2026-03-05T08:15:00Z'
  }
];

export const SAMPLE_CUSTOMERS: Customer[] = [
  {
    id: 'system-expenses',
    name: 'خەرجی',
    phone: 'expenses',
    password: 'expenses-system-lock-no-login',
    balances: {
      USD: 0,
      IQD: 0
    },
    notes: 'هەژماری تایبەت بە خەرجییەکانی سیستەم (تەنها خوێندنەوە)',
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'system-exchange',
    name: 'گۆڕینەوەی دراو',
    phone: 'exchange',
    password: 'exchange-system-lock-no-login',
    balances: {
      USD: 0,
      IQD: 0
    },
    notes: 'هەژماری تایبەت بە گۆڕینەوەی دراو (تەنها خوێندنەوە)',
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'system-transfer-fee',
    name: 'کرێی حەواڵە',
    phone: 'transfer-fee',
    password: 'transfer-fee-system-lock-no-login',
    balances: {
      USD: 0,
      IQD: 0
    },
    notes: 'هەژماری تایبەت بە کرێی حەواڵە (تەنها خوێندنەوە)',
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'system-profit',
    name: 'قازانج',
    phone: 'profit',
    password: 'profit-system-lock-no-login',
    balances: {
      USD: 0,
      IQD: 0
    },
    notes: 'هەژماری تایبەت بە قازانجی سیستەم (تەنها خوێندنەوە)',
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'cust-1',
    name: 'محەمەد قادر ڕەسوڵ',
    phone: '07501234567',
    password: '123',
    balances: {
      USD: 15450,
      IQD: 145000000
    },
    notes: 'کڕیاری کۆن، بازرگانە لە عەلوەی سلێمانی',
    createdAt: '2026-01-10T10:00:00Z'
  },
  {
    id: 'cust-2',
    name: 'فەرمان عەلی مستەفا',
    phone: '07709876543',
    password: '123',
    balances: {
      USD: 1200,
      IQD: 180000000
    },
    notes: 'پەیوەندی باشە، خاوەن دوکانی ئۆتۆمبێل',
    createdAt: '2026-02-15T11:30:00Z'
  },
  {
    id: 'cust-3',
    name: 'کۆمپانیای زاگرۆس',
    phone: '07501112222',
    password: '123',
    balances: {
      USD: 45200,
      IQD: -1500000
    },
    notes: 'گرووپی هاوردەکردنی کەلوپەل',
    createdAt: '2026-03-01T09:15:00Z'
  },
  {
    id: 'cust-4',
    name: 'نەوزاد کەریم',
    phone: '07701113333',
    password: '123',
    balances: {
      USD: -340,
      IQD: 5000000
    },
    notes: 'کارمەندی سستمی گشتی',
    createdAt: '2026-03-25T14:45:00Z'
  }
];

export const INITIAL_SAFE_BALANCES: CurrencyBalance = {
  USD: 1250000,
  IQD: 1875000000
};

export const SAMPLE_TRANSACTIONS: Transaction[] = [
  {
    id: 'TRX-8921',
    type: 'Deposit',
    timestamp: '2026-06-11T09:30:00Z',
    performedBy: 'دارا ڕەسوڵ',
    customerId: 'cust-1',
    customerName: 'محەمەد قادر ڕەسوڵ',
    amount: 50000,
    currency: 'USD',
    notes: 'بارمتەی کاش بۆ غەزنە'
  },
  {
    id: 'TRX-8920',
    type: 'Withdrawal',
    timestamp: '2026-06-10T14:15:00Z',
    performedBy: 'شیلان عومەر',
    customerId: 'cust-3',
    customerName: 'کۆمپانیای زاگرۆس',
    amount: 15000000,
    currency: 'IQD',
    notes: 'ڕاکێشانی نەختینەیی بۆ دابەشکردنی مووچە'
  },
  {
    id: 'EXC-4512',
    type: 'Exchange',
    timestamp: '2026-06-09T10:00:00Z',
    performedBy: 'ڕێبین مەحمود',
    customerId: 'cust-2',
    customerName: 'فەرمان عەلی مستەفا',
    amount: -1000,
    currency: 'USD',
    targetAmount: 1524000,
    targetCurrency: 'IQD',
    rate: 1524,
    notes: 'کڕینی دۆلار لە کڕیار، سەرچاوە: هەژماری کڕیار'
  },
  {
    id: 'EXC-4513',
    type: 'Exchange',
    timestamp: '2026-06-08T16:45:00Z',
    performedBy: 'دارا ڕەسوڵ',
    customerId: undefined, // Safe exchange
    customerName: 'خانەی گەنجینە',
    amount: -50000,
    currency: 'USD',
    targetAmount: 76000000,
    targetCurrency: 'IQD',
    rate: 1520,
    notes: 'ڕێکخستنی دۆلار لە خانە بە دینار بە نرخی بازاڕ'
  }
];

export const SAMPLE_FAST_TRANSFERS: FastTransferDetails[] = [
  {
    id: 'HW-0001',
    senderId: 'cust-1',
    senderName: 'محەمەد قادر ڕەسوڵ',
    receiverName: 'ئاسۆ عومەر زانا',
    receiverPhone: '07509998877',
    amount: 5000,
    currency: 'USD',
    fee: 15,
    status: 'Pending',
    notes: 'بۆ کڕینی ئامێری کارەبایی لە هەولێر',
    createdAt: '2026-06-11T12:00:00Z'
  },
  {
    id: 'HW-0002',
    senderId: 'cust-3',
    senderName: 'کۆمپانیای زاگرۆس',
    receiverName: 'دیار بەکر سابیر',
    receiverPhone: '07702114455',
    amount: 2500000,
    currency: 'IQD',
    fee: 10000,
    status: 'Delivered',
    notes: 'وەرگیراوە لە لایەن دیار بەکر لە زاخۆ',
    createdAt: '2026-06-09T09:30:00Z',
    deliveredAt: '2026-06-10T11:00:00Z'
  }
];

export const SAMPLE_STANDARD_TRANSFERS: StandardTransferDetails[] = [
  {
    id: 'HW-S0001',
    senderId: 'cust-1',
    senderName: 'محەمەد قادر ڕەسوڵ',
    receiverId: 'cust-2',
    receiverName: 'فەرمان عەلی مستەفا',
    beneficiaryName: 'هەڵکەوت نەجمەدین',
    deliveryLocation: 'دوکان - سلێمانی',
    amountUSD: 10000,
    buyRate: 1450,
    sellRate: 1460,
    senderIQDAdded: 14500000,
    receiverIQDDeducted: 14600000,
    profitIQD: 100000,
    status: 'Delivered',
    createdAt: '2026-06-11T15:30:00Z',
    notes: 'حەواڵەی گەورەی ناوخۆیی بە جیاوازی نرخ (سپرێد)'
  }
];

export const SAMPLE_DELETED_RECORDS: DeletedRecord[] = [
  {
    id: 'DEL-1001',
    category: 'Exchange',
    originalId: 'TX-EX-9901',
    title: 'گۆڕینەوەی $5,000 بۆ عێراقی',
    deletedAt: '2026-07-20T14:30:00Z',
    deletedBy: 'خاوەن',
    currency: 'USD',
    amount: 5000,
    notes: 'بە هەڵە داخڵ کرابوو، لایەنەکان ڕاستکرایەوە',
    details: {
      'جۆری مامەڵە': 'گۆڕینەوەی دراو (Exchange)',
      'بڕی فڕۆشراو': '5,000 USD',
      'نرخی ئاڵوگۆڕ': '148.5 (1,485 IQD / $1)',
      'بڕی وەرگیراو': '7,425,000 IQD',
      'کڕیار / هەژمار': 'محەمەد قادر ڕەسوڵ',
      'ئەنجامدەر': 'دارا ڕەسوڵ',
      'کاتی تۆمارکردن': '2026-07-20T11:15:00Z',
      'ھۆکاری سڕینەوە': 'دووبارەبوونەوەی داواکارییەکە لەلایەن کڕیار'
    }
  },
  {
    id: 'DEL-1002',
    category: 'Transfer',
    originalId: 'HW-0099',
    title: 'حەواڵەی خێرا - $1,200 (کۆسار فاروق)',
    deletedAt: '2026-07-21T09:10:00Z',
    deletedBy: 'خاوەن',
    currency: 'USD',
    amount: 1200,
    notes: 'کڕیار پەشیمان بووەوە لە ناردنی حەواڵەکە',
    details: {
      'کۆدی حەواڵە': 'HW-0099',
      'جۆری حەواڵە': 'حەواڵەی خێرا (Fast Transfer)',
      'نێرەر': 'فەرمان عەلی مستەفا',
      'وەرگر': 'کۆسار فاروق',
      'ژمارەی مۆبایلی وەرگر': '07503332211',
      'بڕی حەواڵە': '1,200 USD',
      'کرێی حەواڵە': '15 USD',
      'بارودۆخ': 'سڕاوە (پەشیمانبوونەوە)',
      'کاتی تۆمارکردن': '2026-07-21T08:00:00Z'
    }
  },
  {
    id: 'DEL-1003',
    category: 'Customer',
    originalId: 'cust-temp-88',
    title: 'کڕیاری سڕاوە: تاھیر حەسەن',
    deletedAt: '2026-07-22T16:45:00Z',
    deletedBy: 'خاوەن',
    notes: 'هەژماری تاقیکاری بوو، باڵانسی ۰ بوو',
    details: {
      'ناوی کڕیار': 'تاھیر حەسەن',
      'ژمارەی مۆبایل': '07705556677',
      'باڵانسی دراوەکان': 'USD: 0 | IQD: 0',
      'تێبینییەکانی کڕیار': 'کڕیاری تاقیکاری',
      'کاتی دروستکردنی هەژمار': '2026-06-01T10:00:00Z'
    }
  },
  {
    id: 'DEL-1004',
    category: 'SafeTransaction',
    originalId: 'TX-DEP-401',
    title: 'ڕاکێشانی $2,500 لە سندوق',
    deletedAt: '2026-07-23T11:20:00Z',
    deletedBy: 'خاوەن',
    currency: 'USD',
    amount: 2500,
    notes: 'پێدانی هەڵە بوو، ڕاستەوخۆ گەڕێندرایەوە بۆ سندوق',
    details: {
      'جۆری مامەڵە': 'ڕاکێشان (Withdrawal)',
      'بڕی پارە': '2,500 USD',
      'سندوق / هەژمار': 'سندوقی سەرەکی',
      'ئەنجامدەر': 'شیلان عومەر',
      'کاتی ئەنجامدان': '2026-07-23T10:00:00Z',
      'تێبینی': 'ڕاکێشانی نەقد بۆ بژاردنی پسوولە'
    }
  }
];

export const INITIAL_SETTINGS: SystemSettings = {
  themeColor: 'blue',
  themeMode: 'light',
  defaultCurrency: 'USD',
  fontSize: 'md',
  officeName: 'نووسینگەی ئاڵوگۆڕی دۆلارینگ',
  language: 'ku'
};
