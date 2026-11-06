import { Currency, Transaction } from './types';

/**
 * Format money values using thousand separators and proper Kurdish/Eastern currency signs.
 */
export function formatMoney(amount: number, currency: Currency): string {
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  
  const formattedNumber = absAmount.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  const sign = isNegative ? '-' : '';

  switch (currency) {
    case 'USD':
      return `${sign}$${formattedNumber}`;
    case 'IQD':
      return `${sign}${formattedNumber} د.ع`;
    case 'IRR':
      return `${sign}${formattedNumber} ﷼`;
    default:
      return `${sign}${formattedNumber}`;
  }
}

/**
 * Format string or number for input fields with thousand separators (commas).
 * e.g., "1000000" -> "1,000,000"
 * e.g., "1000000.5" -> "1,000,000.5"
 */
export function formatInputValue(val: string | number): string {
  if (val === undefined || val === null || val === '') return '';
  const rawStr = String(val);
  
  const isNegative = rawStr.startsWith('-');
  const cleanStr = isNegative ? rawStr.slice(1) : rawStr;

  const parts = cleanStr.split('.');
  const integerPart = parts[0].replace(/[^0-9]/g, '');
  
  const formattedInteger = integerPart ? integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '';
  
  let result = isNegative ? `-${formattedInteger}` : formattedInteger;
  
  if (parts.length > 1) {
    const decimalPart = parts[1].replace(/[^0-9]/g, '');
    result += `.${decimalPart}`;
  }
  
  return result;
}

/**
 * Remove commas from formatted input string to get clean numeric string for state/calculations.
 * e.g., "1,000,000.5" -> "1000000.5"
 */
export function parseInputValue(formattedVal: string): string {
  if (!formattedVal) return '';
  return formattedVal.replace(/,/g, '');
}

/**
 * Generate unique tracking code for fast transfers (e.g., HW-0001)
 */
export function generateTrackingCode(existingCount: number, prefix: string = 'HW'): string {
  const nextNum = existingCount + 1;
  const padded = nextNum.toString().padStart(4, '0');
  return `${prefix}-${padded}`;
}

/**
 * Generate unique ID for transaction logs (e.g., TRX-8920)
 */
export function generateTransactionId(type: 'TRX' | 'EXC' | 'SAFE' | 'INT'): string {
  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  return `${type}-${randomDigits}`;
}

/**
 * Deduplicate transaction logs that might have been accidentally created multiple times 
 * (such as due to Strict Mode updaters running twice).
 */
export function deduplicateTransactions(transactions: Transaction[]): Transaction[] {
  const result: Transaction[] = [];
  for (const tx of transactions) {
    if (!tx) continue;
    const isDuplicate = result.some(item => {
      const sameId = item.id === tx.id;
      if (sameId) return true;

      const sameCustomer = item.customerId === tx.customerId;
      const sameType = item.type === tx.type;
      const sameAmount = item.amount === tx.amount;
      const sameCurrency = item.currency === tx.currency;
      const sameNotes = item.notes === tx.notes;
      
      let closeTime = false;
      if (item.timestamp && tx.timestamp) {
        const diffMs = Math.abs(new Date(item.timestamp).getTime() - new Date(tx.timestamp).getTime());
        closeTime = diffMs < 15000; // 15 seconds threshold
      }
      return sameCustomer && sameType && sameAmount && sameCurrency && sameNotes && closeTime;
    });

    if (!isDuplicate) {
      result.push(tx);
    }
  }
  return result;
}

/**
 * Safely format Kurdish Central (Sorani) Relative Dates and DateTime strings.
 */
export function formatKurdishDateTime(dateTimeStr: string): string {
  try {
    const d = new Date(dateTimeStr);
    if (isNaN(d.getTime())) return dateTimeStr;
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    
    return `${year}-${month}-${day} ${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
  } catch {
    return dateTimeStr;
  }
}
