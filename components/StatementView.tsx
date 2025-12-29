
import React, { useMemo } from 'react';
import { Transaction, LedgerGroup, TransactionType } from '../types';

interface Props {
  transactions: Transaction[];
  ledgers: LedgerGroup[];
  onExport: () => void;
}

const StatementView: React.FC<Props> = ({ transactions, ledgers, onExport }) => {
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
          <p className="text-xs text-slate-400 font-black uppercase tracking-widest mt-1">Hierarchical Financial Report</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {renderHierarchySection(TransactionType.CREDIT)}
        {renderHierarchySection(TransactionType.DEBIT)}
      </div>
    </div>
  );
};

export default StatementView;
