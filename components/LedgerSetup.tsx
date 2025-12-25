
import React, { useState } from 'react';
import { LedgerGroup, TransactionType } from '../types';

interface Props {
  ledgers: LedgerGroup[];
  setLedgers: (l: LedgerGroup[]) => void;
}

const LedgerSetup: React.FC<Props> = ({ ledgers, setLedgers }) => {
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupType, setNewGroupType] = useState<TransactionType>(TransactionType.DEBIT);

  const addGroup = () => {
    if (!newGroupName.trim()) return;
    const newGroup: LedgerGroup = {
      id: `group-${Date.now()}`,
      name: newGroupName,
      type: newGroupType,
      subgroups: []
    };
    setLedgers([...ledgers, newGroup]);
    setNewGroupName('');
  };

  const deleteGroup = (id: string) => {
    setLedgers(ledgers.filter(g => g.id !== id));
  };

  const addSubgroup = (groupId: string, name: string) => {
    if (!name.trim()) return;
    const updated = ledgers.map(g => {
      if (g.id === groupId) {
        return {
          ...g,
          subgroups: [...g.subgroups, { id: `sub-${Date.now()}`, name, parentId: groupId }]
        };
      }
      return g;
    });
    setLedgers(updated);
  };

  const deleteSubgroup = (groupId: string, subId: string) => {
    const updated = ledgers.map(g => {
      if (g.id === groupId) {
        return {
          ...g,
          subgroups: g.subgroups.filter(s => s.id !== subId)
        };
      }
      return g;
    });
    setLedgers(updated);
  };

  const renderGroupSection = (type: TransactionType) => (
    <div className="space-y-6">
      <h2 className={`text-lg font-bold flex items-center gap-2 ${type === TransactionType.DEBIT ? 'text-rose-600' : 'text-emerald-600'}`}>
        <span className="w-2 h-6 rounded-full bg-current opacity-20"></span>
        {type === TransactionType.DEBIT ? 'Expense Ledgers' : 'Receipt Ledgers'}
      </h2>
      <div className="grid grid-cols-1 gap-4">
        {ledgers.filter(g => g.type === type).map(group => (
          <div key={group.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <div className={`p-4 flex justify-between items-center ${type === TransactionType.DEBIT ? 'bg-rose-50/50' : 'bg-emerald-50/50'}`}>
              <span className="font-bold text-slate-800">{group.name}</span>
              <button 
                onClick={() => deleteGroup(group.id)}
                className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                title="Delete Group"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>
            <div className="p-4 space-y-2">
              <div className="flex flex-wrap gap-2">
                {group.subgroups.map(sub => (
                  <div key={sub.id} className="group flex items-center bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border border-slate-200">
                    {sub.name}
                    <button 
                      onClick={() => deleteSubgroup(group.id, sub.id)}
                      className="ml-2 opacity-0 group-hover:opacity-100 hover:text-rose-500 transition-opacity"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-3">
                <input 
                  type="text" 
                  placeholder="+ Add Sub-ledger"
                  className="w-full text-xs p-2 bg-slate-50 border border-dashed border-slate-200 rounded-lg focus:outline-none focus:border-indigo-400 focus:bg-white transition-all"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      addSubgroup(group.id, (e.target as HTMLInputElement).value);
                      (e.target as HTMLInputElement).value = '';
                    }
                  }}
                />
              </div>
            </div>
          </div>
        ))}
        {ledgers.filter(g => g.type === type).length === 0 && (
          <div className="text-center py-8 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-slate-400 text-sm">
            No {type.toLowerCase()} groups defined.
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-10 pb-24">
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Structure Your Ledgers</h1>
        <p className="text-slate-500 text-sm mb-6">Create hierarchical groups to categorize your payments and receipts accurately.</p>
        
        <div className="flex flex-col md:flex-row gap-4">
          <input 
            type="text" 
            placeholder="Group Name (e.g., Food & Dining)"
            className="flex-1 border border-slate-200 p-3 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
          />
          <div className="flex gap-4">
            <select 
              className="border border-slate-200 p-3 rounded-xl text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none min-w-[120px]"
              value={newGroupType}
              onChange={(e) => setNewGroupType(e.target.value as TransactionType)}
            >
              <option value={TransactionType.DEBIT}>Payment</option>
              <option value={TransactionType.CREDIT}>Receipt</option>
            </select>
            <button 
              onClick={addGroup}
              className="bg-indigo-600 text-white px-8 py-3 rounded-xl text-sm font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-100 whitespace-nowrap"
            >
              Add Ledger Group
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {renderGroupSection(TransactionType.CREDIT)}
        {renderGroupSection(TransactionType.DEBIT)}
      </div>
    </div>
  );
};

export default LedgerSetup;
