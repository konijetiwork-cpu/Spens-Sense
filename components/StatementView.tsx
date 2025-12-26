
import React, { useState, useMemo } from 'react';
import { Transaction, LedgerGroup, TransactionType } from '../types';

interface Props {
  transactions: Transaction[];
  ledgers: LedgerGroup[];
  onExport: () => void;
}

const StatementView: React.FC<Props> = ({ transactions, ledgers, onExport }) => {
  const [activeTab, setActiveTab] = useState<'hierarchy' | 'detailed'>('hierarchy');

  const getSubgroupTotal = (subgroupId: string) => 
    transactions.filter(t => t.subgroupId === subgroupId).reduce((sum, t) => sum + t.amount, 0);
  
  const getGroupTotal = (group: LedgerGroup) => 
    group.subgroups.reduce((sum, sub) => sum + getSubgroupTotal(sub.id), 0);

  const net = useMemo(() => {
    const receipts = transactions.filter(t => t.type === TransactionType.CREDIT).reduce((sum, t) => sum + t.amount, 0);
    const payments = transactions.filter(t => t.type === TransactionType.DEBIT).reduce((sum, t) => sum + t.amount, 0);
    return receipts - payments;
  }, [transactions]);

  const totalPayments = useMemo(() => 
    transactions.filter(t => t.type === TransactionType.DEBIT).reduce((sum, t) => sum + t.amount, 0),
  [transactions]);

  const renderHierarchySection = (type: TransactionType) => {
    const filteredGroups = ledgers.filter(g => g.type === type);
    const sectionTotal = filteredGroups.reduce((sum, g) => sum + getGroupTotal(g), 0);

    return (
      <div className="space-y-4">
        <div className={`flex justify-between items-end border-b-2 pb-2 ${type === TransactionType.CREDIT ? 'border-emerald-500 text-emerald-700' : 'border-rose-500 text-rose-700'}`}>
          <h3 className="text-sm font-black uppercase tracking-widest">
            {type === TransactionType.CREDIT ? '📥 RECEIPTS (INCOME)' : '📤 PAYMENTS (EXPENSES)'}
          </h3>
          <span className="text-xl font-black">₹{sectionTotal.toLocaleString()}</span>
        </div>

        <div className="space-y-4">
          {filteredGroups.map(group => {
            const groupTotal = getGroupTotal(group);
            if (groupTotal === 0 && group.subgroups.every(s => getSubgroupTotal(s.id) === 0)) return null;

            return (
              <div key={group.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 bg-slate-50 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${type === TransactionType.CREDIT ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                    <span className="font-black text-slate-800 text-xs uppercase tracking-tight">{group.name}</span>
                  </div>
                  <span className="font-bold text-slate-900">₹{groupTotal.toLocaleString()}</span>
                </div>
                <div className="px-6 py-2 divide-y divide-slate-50">
                  {group.subgroups.map(sub => {
                    const subTotal = getSubgroupTotal(sub.id);
                    if (subTotal === 0) return null;
                    const percentage = type === TransactionType.DEBIT && totalPayments > 0 
                      ? ((subTotal / totalPayments) * 100).toFixed(1) 
                      : null;

                    return (
                      <div key={sub.id} className="py-3 flex justify-between items-center group">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-600 group-hover:text-indigo-600 transition-colors">{sub.name}</span>
                          {percentage && <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{percentage}% of total spend</span>}
                        </div>
                        <span className="text-sm font-black text-slate-800">₹{subTotal.toLocaleString()}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {sectionTotal === 0 && (
            <p className="text-center py-10 text-slate-300 italic text-sm">No recorded {type.toLowerCase()} transactions.</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter">Vault Analytics</h1>
          <p className="text-xs text-slate-400 font-black uppercase tracking-widest mt-1">Hierarchical Ledger & Detailed Audit</p>
        </div>
        <div className="flex flex-wrap gap-3">
           <button onClick={onExport} className="bg-white border text-slate-600 px-5 py-3 rounded-2xl font-black text-[10px] flex items-center gap-2 uppercase tracking-widest shadow-sm hover:bg-slate-50 transition-all">
             📥 Export CSV
           </button>
           <div className={`px-8 py-3 rounded-2xl font-black text-xl text-white shadow-2xl transition-all ${net >= 0 ? 'bg-indigo-600 shadow-indigo-200' : 'bg-rose-600 shadow-rose-200'}`}>
             <span className="text-[9px] uppercase tracking-widest block opacity-70 mb-1 leading-none font-bold">Current Net Status</span>
             ₹{net.toLocaleString()}
           </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-200/50 p-1.5 rounded-[2rem] w-fit">
        <button 
          onClick={() => setActiveTab('hierarchy')}
          className={`px-8 py-3 rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'hierarchy' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Hierarchy View
        </button>
        <button 
          onClick={() => setActiveTab('detailed')}
          className={`px-8 py-3 rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'detailed' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Detailed Audit
        </button>
      </div>

      {activeTab === 'hierarchy' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {renderHierarchySection(TransactionType.CREDIT)}
          {renderHierarchySection(TransactionType.DEBIT)}
        </div>
      ) : (
        <div className="bg-white rounded-[2.5rem] border shadow-sm overflow-hidden overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <tr>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Bank Account</th>
                <th className="px-6 py-4">Transaction Type</th>
                <th className="px-6 py-4">Ref No.</th>
                <th className="px-6 py-4">Group</th>
                <th className="px-6 py-4">Sub-ledger</th>
                <th className="px-6 py-4">Purpose</th>
                <th className="px-6 py-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y text-slate-700 font-bold">
              {transactions.map(t => (
                <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-slate-400 text-[10px] font-medium">{t.date}</td>
                  <td className="px-6 py-4 text-slate-800">{t.bankName}</td>
                  <td className={`px-6 py-4 tracking-tighter ${t.type === TransactionType.CREDIT ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {t.type === TransactionType.CREDIT ? 'RECEIPT' : 'PAYMENT'}
                  </td>
                  <td className="px-6 py-4 font-mono text-[9px] opacity-40">{t.refNo}</td>
                  <td className="px-6 py-4">{ledgers.find(l => l.id === t.groupId)?.name || 'N/A'}</td>
                  <td className="px-6 py-4 font-normal text-slate-400">{ledgers.find(l => l.id === t.groupId)?.subgroups.find(s => s.id === t.subgroupId)?.name || 'N/A'}</td>
                  <td className="px-6 py-4 italic truncate max-w-[150px] font-normal text-slate-500">{t.purpose}</td>
                  <td className={`px-6 py-4 text-right font-black ${t.type === TransactionType.CREDIT ? 'text-emerald-600' : 'text-rose-600'}`}>
                    ₹{t.amount.toLocaleString()}
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr><td colSpan={8} className="p-20 text-center italic text-slate-300">No transaction records found in the vault.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default StatementView;
