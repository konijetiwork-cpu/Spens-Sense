
import { LedgerGroup, TransactionType, ThemePreset, AppFont } from './types';

export const UNCATEGORIZED_GROUP_ID = 'system-uncat';
export const SKIPPED_SUB_ID = 'system-skipped';

export const INITIAL_LEDGERS: LedgerGroup[] = [
  {
    id: UNCATEGORIZED_GROUP_ID,
    name: 'UNCATEGORIZED',
    type: TransactionType.DEBIT,
    subgroups: [{ id: SKIPPED_SUB_ID, name: 'SKIPPED', parentId: UNCATEGORIZED_GROUP_ID }]
  },
  {
    id: 'grp-house',
    name: 'HOUSEHOLD',
    type: TransactionType.DEBIT,
    subgroups: [
      { id: 'sub-rent', name: 'Rent', parentId: 'grp-house' },
      { id: 'sub-grocery', name: 'Groceries', parentId: 'grp-house' }
    ]
  },
  {
    id: 'grp-inc',
    name: 'INCOME',
    type: TransactionType.CREDIT,
    subgroups: [
      { id: 'sub-sal', name: 'Salary', parentId: 'grp-inc' }
    ]
  }
];

export const MOCK_SMS_TEMPLATES = [
  "HDFC Bank: Rs. 1,250 debited at STARBUCKS. Ref: 40515923. Bal: 45,200",
  "ICICI Bank: A/c XXXXX123 Credited with Rs. 75,000 via NEFT Salary. Ref: SAL-9921. Avl Bal: 1,20,200",
  "SBI: Paid Rs. 450 to AMZ-ORDER-123. Ref: UPI-882211.",
  "AXIS Bank: Debited INR 3,200 for FUEL. Ref: FL-1122."
];

export const THEME_PRESETS: Record<ThemePreset, string> = {
  'Light Blue': 'bg-sky-500 text-sky-900 border-sky-100 ring-sky-500',
  'Dark Mode': 'bg-slate-900 text-slate-100 border-slate-800 ring-slate-400',
  'Green': 'bg-emerald-600 text-emerald-900 border-emerald-100 ring-emerald-500',
  'Purple': 'bg-violet-600 text-violet-900 border-violet-100 ring-violet-500',
  'Classic White': 'bg-white text-slate-900 border-slate-200 ring-slate-400'
};

export const FONT_MAP: Record<AppFont, string> = {
  inter: 'font-sans',
  roboto: 'font-sans tracking-tight',
  serif: 'font-serif',
  rounded: 'font-sans rounded-fonts',
  mono: 'font-mono'
};

export const PRESETS: { name: ThemePreset; font: AppFont }[] = [
  { name: 'Light Blue', font: 'inter' },
  { name: 'Dark Mode', font: 'roboto' },
  { name: 'Green', font: 'serif' },
  { name: 'Purple', font: 'rounded' },
  { name: 'Classic White', font: 'mono' }
];
