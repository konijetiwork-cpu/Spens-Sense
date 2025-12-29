
export enum TransactionType {
  DEBIT = 'DEBIT',
  CREDIT = 'CREDIT'
}

export interface LedgerSubgroup {
  id: string;
  name: string;
  parentId: string;
}

export interface LedgerGroup {
  id: string;
  name: string;
  type: TransactionType;
  subgroups: LedgerSubgroup[];
}

export interface Transaction {
  id: string;
  date: string;
  bankName: string;
  type: TransactionType; // Receipt (Credit) or Payment (Debit)
  refNo: string;
  groupId: string;
  subgroupId: string;
  purpose: string;
  amount: number;
  merchant: string;
  rawSms?: string;
  suggestedPurpose?: string;
}

export interface ActivityLog {
  id: string;
  action: 'ADD' | 'DELETE' | 'EDIT' | 'EXPORT' | 'PASSWORD_CHANGE';
  entity: 'TRANSACTION' | 'GROUP' | 'USER';
  details: string;
  timestamp: number;
  data?: any;
  undone?: boolean;
}

export interface DailyNote {
  id: string;
  date: string;
  title: string;
  content: string;
  timestamp: number;
}

export interface Receivable {
  id: string;
  date: string;
  debtorName: string;
  amount: number;
  purpose: string;
  dueDate: string;
  isSettled: boolean;
  timestamp: number;
}

export interface Reminder {
  id: string;
  message: string;
  frequency: 'Daily' | 'Weekly' | 'Monthly';
  active: boolean;
  triggerTime?: number;
  completed?: boolean;
}

export interface UserProfile {
  fullName: string;
  petName: string;
  dob: string;
  occupation: string;
  email: string;
  mobile: string;
}

export type ThemePreset = 'Light Blue' | 'Dark Mode' | 'Green' | 'Purple' | 'Classic White';
export type AppFont = 'inter' | 'roboto' | 'serif' | 'rounded' | 'mono';

export interface UserPreferences {
  theme: ThemePreset;
  font: AppFont;
}

export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  role: 'user' | 'admin';
  preferences: UserPreferences;
  profile?: UserProfile;
}

export type ViewType = 'dashboard' | 'transactions' | 'ledger' | 'statement' | 'notes' | 'settings' | 'admin';
