
import React from 'react';
import { Transaction, LedgerGroup, TransactionType } from '../types';

interface Props {
  transactions: Transaction[];
  ledgers: LedgerGroup[];
  onExport: () => void;
}

const StatementView: React.FC<Props> = ({ transactions, ledgers, onExport }) => {
  const getSubgroupTotal = (subgroupId: string) => transactions.filter(t => t.subgroupId === subgroupId).reduce((sum, t) => sum + t.amount, 0);
  const getGroupTotal = (group: LedgerGroup) => group.subgroups.reduce((sum, sub) => sum + getSubgroupTotal(sub.id), 0);

  const net = ledgers.filter(g => g.type === TransactionType.CREDIT).reduce((sum, g) => sum + getGroupTotal(g), 0) -
              ledgers.filter(g => g.type === TransactionType.DEBIT).reduce((sum, g) => sum + getGroupTotal(g), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Financial Audit Statement</h1>
          <p className="text-sm text-slate-400 font-bold uppercase tracking-widest mt-1">Full transaction ledger summary</p>
        </div>
        <div className="flex gap-2">
           <button onClick={onExport} className="bg-emerald-600 text-white px-5 py-3 rounded-2xl font-bold text-[10px] flex items-center gap-2 uppercase tracking-widest shadow-lg shadow-emerald-50">📥 EXCEL EXPORT</button>
           <div className={`px-6 py-3 rounded-2xl font-black text-lg text-white shadow-xl ${net >= 0 ? 'bg-indigo-600 shadow-indigo-100' : 'bg-rose-600 shadow-rose-100'}`}>NET SAVINGS: ₹{net.toLocaleString()}</div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-slate-50 border-b text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <tr>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">From Bank</th>
              <th className="px-6 py-4">Receipt / Payment</th>
              <th className="px-6 py-4">Reference No</th>
              <th className="px-6 py-4">Group Name</th>
              <th className="px-6 py-4">Sub-Group Name</th>
              <th className="px-6 py-4">Purpose</th>
              <th className="px-6 py-4 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y text-slate-700">
            {transactions.map(t => (
              <tr key={t.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 text-xs font-medium">{t.date}</td>
                <td className="px-6 py-4 font-bold">{t.bankName}</td>
                <td className={`px-6 py-4 font-black ${t.type === TransactionType.CREDIT ? 'text-emerald-500' : 'text-rose-500'}`}>{t.type === TransactionType.CREDIT ? 'RECEIPT' : 'PAYMENT'}</td>
                <td className="px-6 py-4 font-mono text-[10px] opacity-60">{t.refNo}</td>
                <td className="px-6 py-4 font-bold">{ledgers.find(l => l.id === t.groupId)?.name || 'N/A'}</td>
                <td className="px-6 py-4 text-slate-400">{ledgers.find(l => l.id === t.groupId)?.subgroups.find(s => s.id === t.subgroupId)?.name || 'N/A'}</td>
                <td className="px-6 py-4 italic text-slate-500 truncate max-w-[150px]">{t.purpose}</td>
                <td className={`px-6 py-4 text-right font-black ${t.type === TransactionType.CREDIT ? 'text-emerald-600' : 'text-rose-600'}`}>₹{t.amount.toLocaleString()}</td>
              </tr>
            ))}
            {transactions.length === 0 && (
              <tr><td colSpan={8} className="p-20 text-center italic text-slate-300">Statement records empty.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StatementView;
