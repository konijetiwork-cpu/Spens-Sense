
import React, { useState } from 'react';
import { DailyNote, Receivable } from '../types';

interface Props {
  notes: DailyNote[];
  onAdd: (note: Omit<DailyNote, 'id' | 'timestamp'>) => void;
  onDelete: (id: string) => void;
  receivables: Receivable[];
  onAddReceivable: (rec: Omit<Receivable, 'id' | 'timestamp' | 'isSettled'>) => void;
  onDeleteReceivable: (id: string) => void;
  onToggleSettled: (id: string) => void;
}

const DailyNotes: React.FC<Props> = ({ 
  notes, onAdd, onDelete, 
  receivables, onAddReceivable, onDeleteReceivable, onToggleSettled 
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'notes' | 'receivables'>('notes');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [isAddingReceivable, setIsAddingReceivable] = useState(false);

  const [newNote, setNewNote] = useState({ title: '', content: '', date: new Date().toISOString().split('T')[0] });
  const [newRec, setNewRec] = useState({ 
    date: new Date().toISOString().split('T')[0], 
    debtorName: '', 
    amount: 0, 
    purpose: '', 
    dueDate: '' 
  });

  const handleNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.content.trim()) return;
    onAdd(newNote);
    setNewNote({ title: '', content: '', date: new Date().toISOString().split('T')[0] });
    setIsAddingNote(false);
  };

  const handleRecSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRec.debtorName.trim() || newRec.amount <= 0) return;
    onAddReceivable(newRec);
    setNewRec({ 
      date: new Date().toISOString().split('T')[0], 
      debtorName: '', 
      amount: 0, 
      purpose: '', 
      dueDate: '' 
    });
    setIsAddingReceivable(false);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter">Personal Vault Ledger</h1>
          <p className="text-xs text-slate-400 font-black uppercase tracking-widest mt-1">Manage quick notes & money owed to you</p>
        </div>
        
        <div className="flex gap-1 bg-slate-200/50 p-1.5 rounded-[1.8rem]">
          <button 
            onClick={() => setActiveSubTab('notes')}
            className={`px-6 py-2.5 rounded-[1.6rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'notes' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Daily Notes
          </button>
          <button 
            onClick={() => setActiveSubTab('receivables')}
            className={`px-6 py-2.5 rounded-[1.6rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'receivables' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Receivables
          </button>
        </div>
      </div>

      {activeSubTab === 'notes' ? (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button 
              onClick={() => setIsAddingNote(true)}
              className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 hover:scale-105 transition-all"
            >
              📝 New Quick Note
            </button>
          </div>

          {isAddingNote && (
            <div className="bg-white p-8 rounded-[2.5rem] border shadow-xl animate-in zoom-in duration-200">
              <form onSubmit={handleNoteSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input 
                    type="date" 
                    value={newNote.date}
                    onChange={e => setNewNote({...newNote, date: e.target.value})}
                    className="p-4 bg-slate-50 border rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                  />
                  <input 
                    type="text" 
                    placeholder="Note Title (Optional)"
                    value={newNote.title}
                    onChange={e => setNewNote({...newNote, title: e.target.value})}
                    className="p-4 bg-slate-50 border rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                  />
                </div>
                <textarea 
                  placeholder="What's on your mind?..."
                  value={newNote.content}
                  onChange={e => setNewNote({...newNote, content: e.target.value})}
                  rows={4}
                  className="w-full p-4 bg-slate-50 border rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
                <div className="flex gap-3">
                  <button type="submit" className="flex-1 bg-indigo-600 text-white font-black p-4 rounded-2xl uppercase text-xs tracking-widest">Save Note</button>
                  <button type="button" onClick={() => setIsAddingNote(false)} className="px-8 bg-slate-100 text-slate-500 font-bold p-4 rounded-2xl uppercase text-xs">Cancel</button>
                </div>
              </form>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 pb-20">
            {notes.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-[2.5rem] border border-dashed border-slate-200">
                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">No entries in your quick note pad</p>
              </div>
            ) : (
              notes.sort((a, b) => b.timestamp - a.timestamp).map(note => (
                <div key={note.id} className="bg-white p-8 rounded-[2.5rem] border shadow-sm group relative hover:shadow-md transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full">{note.date}</span>
                      {note.title && <h3 className="text-xl font-black text-slate-800 mt-3 tracking-tight">{note.title}</h3>}
                    </div>
                    <button onClick={() => onDelete(note.id)} className="opacity-0 group-hover:opacity-100 p-2 text-rose-300 hover:text-rose-500 transition-all">🗑️</button>
                  </div>
                  <p className="text-slate-600 font-medium leading-relaxed whitespace-pre-wrap">{note.content}</p>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-amber-50 p-6 rounded-[2rem] border border-amber-100">
            <div>
              <p className="text-[10px] font-black uppercase text-amber-600 tracking-widest mb-1">Total Outstanding</p>
              <h3 className="text-3xl font-black text-amber-900 tracking-tighter">
                ₹{receivables.filter(r => !r.isSettled).reduce((sum, r) => sum + r.amount, 0).toLocaleString()}
              </h3>
            </div>
            <button 
              onClick={() => setIsAddingReceivable(true)}
              className="bg-amber-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-amber-100 hover:scale-105 transition-all"
            >
              💰 New Receivable
            </button>
          </div>

          {isAddingReceivable && (
            <div className="bg-white p-8 rounded-[2.5rem] border shadow-xl animate-in zoom-in duration-200">
              <form onSubmit={handleRecSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Debtor Name</label>
                    <input 
                      type="text" 
                      placeholder="Who owes you?"
                      value={newRec.debtorName}
                      onChange={e => setNewRec({...newRec, debtorName: e.target.value})}
                      className="w-full p-4 bg-slate-50 border rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Amount (₹)</label>
                    <input 
                      type="number" 
                      placeholder="How much?"
                      value={newRec.amount || ''}
                      onChange={e => setNewRec({...newRec, amount: parseFloat(e.target.value)})}
                      className="w-full p-4 bg-slate-50 border rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-black"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Issued Date</label>
                    <input 
                      type="date" 
                      value={newRec.date}
                      onChange={e => setNewRec({...newRec, date: e.target.value})}
                      className="w-full p-4 bg-slate-50 border rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Due Date (Optional)</label>
                    <input 
                      type="date" 
                      value={newRec.dueDate}
                      onChange={e => setNewRec({...newRec, dueDate: e.target.value})}
                      className="w-full p-4 bg-slate-50 border rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                    />
                  </div>
                </div>
                <input 
                  type="text" 
                  placeholder="Purpose (e.g., Lent for dinner, Project advance)"
                  value={newRec.purpose}
                  onChange={e => setNewRec({...newRec, purpose: e.target.value})}
                  className="w-full p-4 bg-slate-50 border rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
                <div className="flex gap-3">
                  <button type="submit" className="flex-1 bg-amber-600 text-white font-black p-4 rounded-2xl uppercase text-xs tracking-widest">Create Entry</button>
                  <button type="button" onClick={() => setIsAddingReceivable(false)} className="px-8 bg-slate-100 text-slate-500 font-bold p-4 rounded-2xl uppercase text-xs">Cancel</button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-white rounded-[2.5rem] border shadow-sm overflow-hidden overflow-x-auto pb-20">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 border-b text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <tr>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Owed By</th>
                  <th className="px-6 py-4">Purpose</th>
                  <th className="px-6 py-4">Due Date</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y text-slate-700">
                {receivables.sort((a, b) => b.timestamp - a.timestamp).map(rec => (
                  <tr key={rec.id} className={`hover:bg-slate-50 transition-colors ${rec.isSettled ? 'opacity-50 grayscale' : ''}`}>
                    <td className="px-6 py-4 text-[10px] font-bold text-slate-400">{rec.date}</td>
                    <td className="px-6 py-4 font-black text-slate-800">{rec.debtorName}</td>
                    <td className="px-6 py-4 italic text-slate-500 max-w-[150px] truncate">{rec.purpose}</td>
                    <td className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">{rec.dueDate || 'N/A'}</td>
                    <td className="px-6 py-4 font-black text-slate-900">₹{rec.amount.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => onToggleSettled(rec.id)}
                        className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${rec.isSettled ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}
                      >
                        {rec.isSettled ? 'Settled ✅' : 'Pending ⏳'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-center">
                       <button onClick={() => onDeleteReceivable(rec.id)} className="text-rose-300 hover:text-rose-500 transition-colors">🗑️</button>
                    </td>
                  </tr>
                ))}
                {receivables.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-20 text-center italic text-slate-300">No receivable records found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyNotes;
