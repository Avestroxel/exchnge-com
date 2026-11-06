export type Currency = string;

export interface CurrencyBalance {
  [currencyCode: string]: number;
}

export type UserRole = 'Owner' | 'Manager' | 'Admin' | 'Teller';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  password?: string;
  avatar?: string;
  isOnline?: boolean;
  lastActiveAt?: string;
  salary?: number;
  salaryCurrency?: string;
  createdAt?: string;
}

export interface Customer {
  id: string;
  name: string; // Nav
  phone: string; // Mobile (used as login username)
  password?: string; // set by owner for login
  balances: CurrencyBalance;
  notes?: string;
  createdAt: string;
}

export type TransactionType = 
  | 'Deposit'       // پارە دانان
  | 'Withdrawal'    // ڕاکێشان
  | 'Exchange'      // ئاڵوگۆڕ
  | 'FastTransfer'  // حەواڵەی خێرا
  | 'StandardTransfer' // حەواڵەی ئاسایی
  | 'InternalTransfer' // حەواڵەی ناوخۆیی
  | 'SafeAdjustment'  // گۆڕینی لایەنەکان
  | 'Expense';        // خەرجی

export interface Transaction {
  id: string;
  type: TransactionType;
  timestamp: string; // بەروار و کات
  performedBy: string; // Name/Email of User who entered it
  customerId?: string; // Optional (e.g. if associated with a customer)
  customerName?: string;
  amount: number;
  currency: Currency;
  rate?: number; // Optional Exchange rate
  targetAmount?: number; // Calculated exchange amount
  targetCurrency?: Currency; // Calculated exchange currency
  profitInIQD?: number; // for hawala spread
  notes?: string; // تێبینی
}

export type TransferStatus = 'Pending' | 'Delivered' | 'Cancelled';

export interface FastTransferDetails {
  id: string; // HW-0001
  senderId: string;
  senderName: string;
  receiverName: string; // full name of cash recipient
  receiverPhone: string;
  amount: number;
  currency: Currency;
  fee: number;
  status: TransferStatus;
  notes?: string;
  createdAt: string;
  deliveredAt?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  cancelReason?: string;
  isOfficeDelivery?: boolean;
  officeName?: string;
  deliveryReceiverName?: string;
  deliveryReceiverPhone?: string;
}

export interface StandardTransferDetails {
  id: string; // HW-S0001
  senderId: string;
  senderName: string;
  receiverId: string;
  receiverName: string;
  beneficiaryName: string; // beneficiary full name if different from receiver customer
  deliveryLocation: string; // destination/location
  amountUSD: number; // core hawala is USD
  buyRate: number; // IQD per 1 USD (sender side)
  sellRate: number; // IQD per 1 USD (receiver side)
  senderIQDAdded: number; // amountUSD * buyRate
  receiverIQDDeducted: number; // amountUSD * sellRate
  profitIQD: number; // (sellRate - buyRate) * amountUSD
  status: TransferStatus;
  createdAt: string;
  notes?: string;
  currency?: Currency;
}

export type DeletedRecordCategory = 'Exchange' | 'Transfer' | 'Customer' | 'SafeTransaction';

export interface DeletedRecord {
  id: string;
  category: DeletedRecordCategory;
  originalId: string;
  title: string;
  deletedAt: string;
  deletedBy: string;
  currency?: Currency;
  amount?: number;
  notes?: string;
  details: Record<string, any>;
}

export interface SystemSettings {
  themeColor: 'blue' | 'indigo' | 'slate' | 'emerald' | 'teal' | 'purple' | 'amber' | 'rose' | 'violet' | 'cyan';
  themeMode?: 'light' | 'dark' | 'midnight' | 'sepia' | 'navy' | 'sky_light' | 'soft_cream';
  defaultCurrency: Currency;
  fontSize: 'sm' | 'md' | 'lg';
  officeName: string;
  officeLogo?: string;
  language: 'ku' | 'en' | 'ar';
  locations?: string[];
}
