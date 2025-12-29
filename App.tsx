
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Transaction, LedgerGroup, User, ViewType, TransactionType, 
  ThemePreset, AppFont, UserPreferences, ActivityLog, Reminder, UserProfile, DailyNote, Receivable 
} from './types';
import { 
  INITIAL_LEDGERS, MOCK_SMS_TEMPLATES, THEME_PRESETS, FONT_MAP, PRESETS,
  UNCATEGORIZED_GROUP_ID, SKIPPED_SUB_ID 
} from './constants';
import { parseSmsWithGemini } from './services/geminiService';
import Dashboard from './components/Dashboard';
import LedgerSetup from './components/LedgerSetup';
import StatementView from './components/StatementView';
import DailyNotes from './components/DailyNotes';

// Robust local date string generator (YYYY-MM-DD)
const getLocalDateStr = (d: Date = new Date()) => {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const NavItem: React.FC<{ 
  label: string; icon: string; active: boolean; onClick: () => void; isMobile?: boolean; themeClass: string; isDark: boolean;
}> = ({ label, icon, active, onClick, isMobile, themeClass, isDark }) => {
  const activeBg = isDark ? 'bg-indigo-500' : 'bg-indigo-600';

  if (isMobile) {
    return (
      <button onClick={onClick} className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${active ? 'text-indigo-500' : isDark ? 'text-slate-500' : 'text-slate-400'}`}>
        <span className="text-xl">{icon}</span>
        <span className="text-[10px] font-bold uppercase">{label}</span>
      </button>
    );
  }

  return (
    <button onClick={onClick} className={`w-full flex items-center px-4 py-3 rounded-xl transition-all ${active ? `${activeBg} text-white shadow-lg` : isDark ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-100'}`}>
      <span className="mr-3 text-xl">{icon}</span>
      <span className="font-bold text-sm">{label}</span>
    </button>
  );
};

const App: React.FC = () => {
  // --- Auth & Data Persistence ---
  const [allUsers, setAllUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('ss_v3_users');
    const initialAdmin: User = { 
      id: 'admin-0', username: 'admin', email: 'admin@admin.com', passwordHash: 'admin123', role: 'admin', 
      preferences: { theme: 'Classic White', font: 'inter' },
      profile: {
        fullName: 'System Administrator',
        petName: 'Admin',
        dob: '1990-01-01',
        occupation: 'System Architect',
        email: 'admin@spendsense.com',
        mobile: '+1234567890'
      }
    };
    return saved ? JSON.parse(saved) : [initialAdmin];
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('ss_v3_session');
    return saved ? JSON.parse(saved) : null;
  });

  const [authId, setAuthId] = useState('');
  const [authPass, setAuthPass] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  const [ledgers, setLedgers] = useState<LedgerGroup[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [notes, setNotes] = useState<DailyNote[]>([]);
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [isProcessingSms, setIsProcessingSms] = useState(false);
  const [pendingTx, setPendingTx] = useState<Partial<Transaction> | null>(null);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [alertDismissed, setAlertDismissed] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  useEffect(() => localStorage.setItem('ss_v3_users', JSON.stringify(allUsers)), [allUsers]);
  useEffect(() => localStorage.setItem('ss_v3_session', JSON.stringify(currentUser)), [currentUser]);

  useEffect(() => {
    if (currentUser) {
      const uId = currentUser.id;
      setLedgers(JSON.parse(localStorage.getItem(`ss_data_ledgers_${uId}`) || JSON.stringify(INITIAL_LEDGERS)));
      setTransactions(JSON.parse(localStorage.getItem(`ss_data_txs_${uId}`) || '[]'));
      setLogs(JSON.parse(localStorage.getItem(`ss_data_logs_${uId}`) || '[]'));
      setNotes(JSON.parse(localStorage.getItem(`ss_data_notes_${uId}`) || '[]'));
      setReceivables(JSON.parse(localStorage.getItem(`ss_data_recs_${uId}`) || '[]'));
      setAlertDismissed(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      const uId = currentUser.id;
      localStorage.setItem(`ss_data_ledgers_${uId}`, JSON.stringify(ledgers));
      localStorage.setItem(`ss_data_txs_${uId}`, JSON.stringify(transactions));
      localStorage.setItem(`ss_data_logs_${uId}`, JSON.stringify(logs));
      localStorage.setItem(`ss_data_notes_${uId}`, JSON.stringify(notes));
      localStorage.setItem(`ss_data_recs_${uId}`, JSON.stringify(receivables));
    }
  }, [ledgers, transactions, logs, notes, receivables, currentUser]);

  const addLog = (action: ActivityLog['action'], entity: ActivityLog['entity'], details: string, data?: any) => {
    const newLog: ActivityLog = { id: `log-${Date.now()}-${Math.random()}`, action, entity, details, timestamp: Date.now(), data };
    setLogs(prev => [newLog, ...prev]);
  };

  const handleAuth = () => {
    if (authMode === 'login') {
      const user = allUsers.find(u => (u.username === authId || u.email === authId) && u.passwordHash === authPass);
      if (user) {
        setCurrentUser(user);
        addLog('EDIT', 'USER', `Successful login: ${user.username}`);
      }
      else alert('Invalid Credentials');
    } else {
      if (allUsers.find(u => u.username === authId)) return alert('User ID taken');
      const newUser: User = {
        id: `u-${Date.now()}`,
        username: authId,
        email: authId + "@spendsense.com",
        passwordHash: authPass,
        role: 'user',
        preferences: { theme: 'Light Blue', font: 'inter' },
        profile: {
          fullName: '',
          petName: authId,
          dob: '',
          occupation: '',
          email: authId + "@spendsense.com",
          mobile: ''
        }
      };
      setAllUsers(prev => [...prev, newUser]);
      setCurrentUser(newUser);
      addLog('ADD', 'USER', `New account created: ${authId}`);
    }
  };

  const logout = () => {
    addLog('EDIT', 'USER', 'Secure session ended (Logout)');
    setCurrentUser(null);
    setCurrentView('dashboard');
    localStorage.removeItem('ss_v3_session');
  };

  const updateProfile = (updatedProfile: UserProfile) => {
    if (!currentUser) return;
    const updatedUser = { ...currentUser, profile: updatedProfile };
    setCurrentUser(updatedUser);
    setAllUsers(prev => prev.map(u => u.id === currentUser.id ? updatedUser : u));
    setIsEditingProfile(false);
    addLog('EDIT', 'USER', 'Updated personal profile details');
  };

  const addNote = (note: Omit<DailyNote, 'id' | 'timestamp'>) => {
    const newNote: DailyNote = {
      ...note,
      id: `note-${Date.now()}`,
      timestamp: Date.now()
    };
    setNotes(prev => [newNote, ...prev]);
    addLog('ADD', 'TRANSACTION', `New note: ${note.title || 'Untitled'}`);
  };

  const deleteNote = (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
    addLog('DELETE', 'TRANSACTION', 'Deleted entry from Note Pad');
  };

  const addReceivable = (rec: Omit<Receivable, 'id' | 'timestamp' | 'isSettled'>) => {
    const newRec: Receivable = {
      ...rec,
      id: `rec-${Date.now()}`,
      isSettled: false,
      timestamp: Date.now()
    };
    setReceivables(prev => [newRec, ...prev]);
    addLog('ADD', 'TRANSACTION', `New receivable from ${rec.debtorName}: ₹${rec.amount}`);
  };

  const deleteReceivable = (id: string) => {
    const rec = receivables.find(r => r.id === id);
    setReceivables(prev => prev.filter(r => r.id !== id));
    addLog('DELETE', 'TRANSACTION', `Deleted receivable record for ${rec?.debtorName}`);
  };

  const toggleReceivableSettled = (id: string) => {
    const rec = receivables.find(r => r.id === id);
    setReceivables(prev => prev.map(r => r.id === id ? { ...r, isSettled: !r.isSettled } : r));
    addLog('EDIT', 'TRANSACTION', `Updated settlement status for ${rec?.debtorName}`);
  };

  const deleteTransaction = (id: string) => {
    if (confirm('Permanently delete this transaction?')) {
      const tx = transactions.find(t => t.id === id);
      setTransactions(prev => prev.filter(t => t.id !== id));
      addLog('DELETE', 'TRANSACTION', `Deleted transaction: ₹${tx?.amount}`, tx);
    }
  };

  const saveManualOrEdit = (tx: Partial<Transaction>) => {
    if (editingTx?.id) {
      setTransactions(prev => prev.map(t => t.id === editingTx.id ? { ...t, ...tx } as Transaction : t));
      addLog('EDIT', 'TRANSACTION', `Modified record: ${tx.merchant} ₹${tx.amount}`);
    } else {
      const newTx = { ...tx, id: `tx-${Date.now()}-${Math.random()}` } as Transaction;
      setTransactions(prev => [newTx, ...prev]);
      addLog('ADD', 'TRANSACTION', `Manual entry: ${newTx.merchant} ₹${newTx.amount}`);
    }
    setEditingTx(null);
  };

  const processImport = async () => {
    setIsProcessingSms(true);
    const sms = MOCK_SMS_TEMPLATES[Math.floor(Math.random() * MOCK_SMS_TEMPLATES.length)];
    const parsed = await parseSmsWithGemini(sms);
    if (parsed) setPendingTx({ ...parsed, rawSms: sms });
    setIsProcessingSms(false);
  };

  const handleSkip = () => {
    if (!pendingTx) return;
    handleSaveImport(UNCATEGORIZED_GROUP_ID, SKIPPED_SUB_ID, pendingTx.suggestedPurpose || 'Skipped categorization');
    addLog('ADD', 'TRANSACTION', 'AI Import (Skipped Categorization)');
  };

  const handleSaveImport = (groupId: string, subgroupId: string, purpose: string) => {
    if (!pendingTx) return;
    const finalTx: Transaction = {
      id: `tx-${Date.now()}-${Math.random()}`,
      date: pendingTx.date || getLocalDateStr(),
      bankName: pendingTx.bankName || 'Unknown',
      type: pendingTx.type || TransactionType.DEBIT,
      refNo: pendingTx.refNo || 'N/A',
      groupId,
      subgroupId,
      purpose,
      amount: pendingTx.amount || 0,
      merchant: pendingTx.merchant || 'Unknown'
    };
    setTransactions(prev => [finalTx, ...prev]);
    setPendingTx(null);
    addLog('ADD', 'TRANSACTION', `AI Import confirmed: ${finalTx.merchant} ₹${finalTx.amount}`);
  };

  const updatePreference = (prefs: UserPreferences) => {
    if (!currentUser) return;
    const updated = { ...currentUser, preferences: prefs };
    setCurrentUser(updated);
    setAllUsers(prev => prev.map(u => u.id === currentUser.id ? updated : u));
    addLog('EDIT', 'USER', 'Updated UI preferences (theme/font)');
  };

  const exportToExcel = () => {
    const headers = ['Date', 'Bank', 'Type', 'Ref No', 'Group', 'Sub-group', 'Purpose', 'Amount'];
    const rows = transactions.map(t => [
      t.date, t.bankName, t.type, t.refNo, 
      ledgers.find(l => l.id === t.groupId)?.name || 'N/A',
      ledgers.find(l => l.id === t.groupId)?.subgroups.find(s => s.id === t.subgroupId)?.name || 'N/A',
      t.purpose, t.amount
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map(e => e.join(",")).join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `SpendSense_Report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addLog('EXPORT', 'TRANSACTION', 'Exported financial data to CSV');
  };

  const orphanedTransactions = useMemo(() => {
    return transactions.filter(t => {
      const group = ledgers.find(l => l.id === t.groupId);
      const subgroup = group?.subgroups.find(s => s.id === t.subgroupId);
      return !group || !subgroup;
    });
  }, [transactions, ledgers]);

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl w-full max-w-md border border-slate-200">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-black text-indigo-900 italic tracking-tighter">SPEND SENSE</h1>
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-1">Smart Vault Access</p>
          </div>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2">User ID / Email</label>
              <input type="text" placeholder="admin" value={authId} onChange={e => setAuthId(e.target.value)} className="w-full p-4 bg-slate-50 border rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Password</label>
              <input type="password" placeholder="admin123" value={authPass} onChange={e => setAuthPass(e.target.value)} className="w-full p-4 bg-slate-50 border rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <button onClick={handleAuth} className="w-full bg-indigo-600 text-white p-4 rounded-2xl font-black text-lg hover:bg-indigo-700 shadow-xl transition-all">
              {authMode === 'login' ? 'LOGIN' : 'SIGN UP'}
            </button>
            <button onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} className="w-full text-indigo-600 font-bold text-xs uppercase tracking-widest pt-2">
              {authMode === 'login' ? 'Create Account' : 'Back to Login'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const themeClass = THEME_PRESETS[currentUser.preferences.theme];
  const fontClass = FONT_MAP[currentUser.preferences.font];
  const isDark = currentUser.preferences.theme === 'Dark Mode';
  
  // Theme-aware UI Classes
  const bgClass = isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900';
  const cardClass = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';
  const headerClass = isDark ? 'bg-slate-900/80 border-slate-800 text-white' : 'bg-white/80 border-slate-200 text-slate-800';
  const inputClass = isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900';

  return (
    <div className={`min-h-screen ${fontClass} ${bgClass} flex flex-col md:flex-row pb-20 md:pb-0`}>
      {/* Orphans Alert */}
      {orphanedTransactions.length > 0 && !alertDismissed && (
        <div className="fixed top-20 right-4 left-4 md:left-auto md:w-96 z-50 animate-in slide-in-from-right duration-500">
          <div className="bg-amber-600 text-white p-5 rounded-[2rem] shadow-2xl relative border-l-8 border-amber-400">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-black uppercase tracking-tight">⚠️ Ledger Sync Alert</span>
                  <span className="bg-white/20 px-2 py-0.5 rounded-full text-[9px] font-black">{orphanedTransactions.length} Items</span>
                </div>
                <p className="text-[10px] font-medium leading-relaxed opacity-90 pr-4">
                  Some transactions are missing categorization groups. Assign them now to fix your analytics and reports.
                </p>
                <div className="flex gap-2 mt-4">
                  <button 
                    onClick={() => setCurrentView('transactions')} 
                    className="flex-1 bg-white text-amber-600 p-2 rounded-xl text-[10px] font-black uppercase transition-all shadow-md hover:scale-105 active:scale-95"
                  >
                    🚀 Resolve Now
                  </button>
                  <button 
                    onClick={() => setAlertDismissed(true)} 
                    className="px-4 bg-white/10 hover:bg-white/20 p-2 rounded-xl text-[10px] font-black uppercase transition-all"
                  >
                    Later
                  </button>
                </div>
              </div>
              <button 
                onClick={() => setAlertDismissed(true)} 
                className="ml-3 p-2 bg-black/10 hover:bg-black/20 rounded-full transition-colors"
                title="Dismiss"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar Navigation */}
      <aside className={`hidden md:flex w-64 ${isDark ? 'bg-slate-950 border-slate-900' : 'bg-white border-slate-200'} border-r flex-col p-6 space-y-8 sticky top-0 h-screen`}>
        <div className="text-center">
          <h1 className={`text-2xl font-black italic tracking-tighter ${isDark ? 'text-indigo-400' : 'text-indigo-900'}`}>SPEND SENSE</h1>
        </div>
        <nav className="flex-1 space-y-2">
          <NavItem label="Dashboard" icon="📊" active={currentView === 'dashboard'} onClick={() => setCurrentView('dashboard')} themeClass={themeClass} isDark={isDark} />
          <NavItem label="Expenses" icon="💸" active={currentView === 'transactions'} onClick={() => setCurrentView('transactions')} themeClass={themeClass} isDark={isDark} />
          <NavItem label="Ledgers" icon="📔" active={currentView === 'ledger'} onClick={() => setCurrentView('ledger')} themeClass={themeClass} isDark={isDark} />
          <NavItem label="Reports" icon="📈" active={currentView === 'statement'} onClick={() => setCurrentView('statement')} themeClass={themeClass} isDark={isDark} />
          <NavItem label="Notes" icon="📝" active={currentView === 'notes'} onClick={() => setCurrentView('notes')} themeClass={themeClass} isDark={isDark} />
          <NavItem label="Settings" icon="🎨" active={currentView === 'settings'} onClick={() => setCurrentView('settings')} themeClass={themeClass} isDark={isDark} />
          {currentUser.role === 'admin' && <NavItem label="Admin" icon="🔐" active={currentView === 'admin'} onClick={() => setCurrentView('admin')} themeClass={themeClass} isDark={isDark} />}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        <header className={`sticky top-0 z-20 backdrop-blur-md border-b p-4 md:p-6 flex justify-between items-center ${headerClass}`}>
          <h2 className="text-xl font-bold capitalize">{currentView}</h2>
          <div className="flex gap-2">
            <button onClick={processImport} disabled={isProcessingSms} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg shadow-indigo-100/20">
              {isProcessingSms ? '⌛ Processing...' : '📩 Import SMS'}
            </button>
            <button onClick={() => setEditingTx({} as any)} className={`${isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'} px-4 py-2 rounded-xl text-xs font-bold`}>➕ Add Entry</button>
          </div>
        </header>

        <div className="p-4 md:p-8 flex-1 overflow-y-auto">
          {currentView === 'dashboard' && <Dashboard transactions={transactions} ledgers={ledgers} />}
          {currentView === 'ledger' && <LedgerSetup ledgers={ledgers} setLedgers={setLedgers} />}
          {currentView === 'statement' && <StatementView transactions={transactions} ledgers={ledgers} onExport={exportToExcel} />}
          {currentView === 'notes' && (
            <DailyNotes 
              notes={notes} 
              onAdd={addNote} 
              onDelete={deleteNote}
              receivables={receivables}
              onAddReceivable={addReceivable}
              onDeleteReceivable={deleteReceivable}
              onToggleSettled={toggleReceivableSettled}
            />
          )}
          
          {currentView === 'transactions' && (
            <div className={`${cardClass} rounded-[2.5rem] border shadow-sm overflow-hidden overflow-x-auto`}>
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className={`${isDark ? 'bg-slate-800/50' : 'bg-slate-50'} border-b text-[10px] font-black text-slate-400 uppercase tracking-widest`}>
                  <tr>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">From Bank</th>
                    <th className="px-6 py-4">Receipt / Payment</th>
                    <th className="px-6 py-4">Reference No</th>
                    <th className="px-6 py-4">Group Name</th>
                    <th className="px-6 py-4">Sub-Group Name</th>
                    <th className="px-6 py-4">Purpose</th>
                    <th className="px-6 py-4 text-right">Amount</th>
                    <th className="px-6 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-100'}`}>
                  {transactions.map(t => (
                    <tr key={t.id} className={`${isDark ? 'hover:bg-slate-800/30 text-slate-300' : 'hover:bg-slate-50 text-slate-700'}`}>
                      <td className="px-6 py-4 text-xs font-medium">{t.date}</td>
                      <td className={`px-6 py-4 font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{t.bankName}</td>
                      <td className={`px-6 py-4 font-black ${t.type === TransactionType.CREDIT ? 'text-emerald-500' : 'text-rose-500'}`}>{t.type === TransactionType.CREDIT ? 'Receipt' : 'Payment'}</td>
                      <td className="px-6 py-4 font-mono text-xs opacity-50">{t.refNo}</td>
                      <td className="px-6 py-4 font-bold">{ledgers.find(l => l.id === t.groupId)?.name || 'N/A'}</td>
                      <td className="px-6 py-4 opacity-70">{ledgers.find(l => l.id === t.groupId)?.subgroups.find(s => s.id === t.subgroupId)?.name || 'N/A'}</td>
                      <td className="px-6 py-4 italic opacity-80 truncate max-w-[150px]">{t.purpose}</td>
                      <td className={`px-6 py-4 text-right font-black ${t.type === TransactionType.CREDIT ? 'text-emerald-500' : 'text-rose-500'}`}>₹{t.amount.toLocaleString()}</td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center gap-3">
                          <button onClick={() => setEditingTx(t)} className="text-blue-500 hover:scale-125 transition-transform">✏️</button>
                          <button onClick={() => deleteTransaction(t.id)} className="text-rose-500 hover:scale-125 transition-transform">🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {transactions.length === 0 && <tr><td colSpan={9} className="p-20 text-center italic opacity-30">Vault is empty.</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {currentView === 'settings' && (
            <div className="max-w-4xl mx-auto space-y-10 pb-20">
              {/* Profile Section */}
              <div className={`${cardClass} p-8 rounded-[3rem] border shadow-sm`}>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <span className={`p-2 rounded-lg ${isDark ? 'bg-slate-800 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>👤</span>
                    User Profile
                  </h3>
                  {!isEditingProfile ? (
                    <button 
                      onClick={() => setIsEditingProfile(true)}
                      className={`text-xs font-black uppercase px-4 py-2 rounded-xl transition-colors ${isDark ? 'bg-slate-800 text-indigo-400 hover:bg-slate-700' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}
                    >
                      Edit Profile
                    </button>
                  ) : null}
                </div>

                {!isEditingProfile ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[
                      { label: 'Full Name', value: currentUser.profile?.fullName },
                      { label: 'Pet Name', value: currentUser.profile?.petName },
                      { label: 'Date of Birth', value: currentUser.profile?.dob },
                      { label: 'Occupation', value: currentUser.profile?.occupation },
                      { label: 'Email Address', value: currentUser.profile?.email },
                      { label: 'Mobile Number', value: currentUser.profile?.mobile },
                    ].map(field => (
                      <div key={field.label} className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                        <p className="text-[10px] font-black uppercase text-slate-400 mb-1">{field.label}</p>
                        <p className={`text-sm font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{field.value || 'Not set'}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <form 
                    className="space-y-6"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const fd = new FormData(e.currentTarget);
                      updateProfile({
                        fullName: fd.get('fullName') as string,
                        petName: fd.get('petName') as string,
                        dob: fd.get('dob') as string,
                        occupation: fd.get('occupation') as string,
                        email: fd.get('email') as string,
                        mobile: fd.get('mobile') as string,
                      });
                    }}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {['fullName', 'petName', 'dob', 'occupation', 'email', 'mobile'].map(name => (
                        <div key={name} className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-slate-400 ml-2">{name.replace(/([A-Z])/g, ' $1')}</label>
                          <input 
                            name={name} 
                            type={name === 'dob' ? 'date' : name === 'email' ? 'email' : 'text'}
                            defaultValue={currentUser.profile?.[name as keyof UserProfile]} 
                            className={`w-full p-4 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 ${inputClass}`}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-3">
                      <button type="submit" className="flex-1 bg-indigo-600 text-white font-black p-4 rounded-2xl uppercase text-xs tracking-widest shadow-lg shadow-indigo-100/20">Save Changes</button>
                      <button type="button" onClick={() => setIsEditingProfile(false)} className={`px-8 font-bold p-4 rounded-2xl uppercase text-xs ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>Cancel</button>
                    </div>
                  </form>
                )}
              </div>

              <div className={`${cardClass} p-8 rounded-[3rem] border shadow-sm`}>
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <span className={`p-2 rounded-lg ${isDark ? 'bg-slate-800 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>🎨</span>
                  Interface Options
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Theme Preset</label>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.keys(THEME_PRESETS).map((t) => (
                        <button 
                          key={t}
                          onClick={() => updatePreference({ ...currentUser.preferences, theme: t as any })}
                          className={`p-3 rounded-xl border text-[10px] font-bold uppercase transition-all ${currentUser.preferences.theme === t ? 'border-indigo-600 bg-indigo-500 text-white shadow-md' : isDark ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-slate-50 hover:bg-slate-100 text-slate-500 border-slate-200'}`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2">App Font</label>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.keys(FONT_MAP).map((f) => (
                        <button 
                          key={f}
                          onClick={() => updatePreference({ ...currentUser.preferences, font: f as any })}
                          className={`p-3 rounded-xl border text-[10px] font-bold uppercase transition-all ${currentUser.preferences.font === f ? 'border-indigo-600 bg-indigo-500 text-white shadow-md' : isDark ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-slate-50 hover:bg-slate-100 text-slate-500 border-slate-200'}`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Activity Log Section */}
              <div className={`${cardClass} p-8 rounded-[3rem] border shadow-sm`}>
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <span className={`p-2 rounded-lg ${isDark ? 'bg-slate-800 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>🛡️</span>
                  Security & Activity Log
                </h3>
                <div className="max-h-96 overflow-y-auto pr-2 space-y-3">
                  {logs.length > 0 ? (
                    logs.map(log => (
                      <div key={log.id} className={`p-4 rounded-2xl border flex items-start gap-4 transition-colors ${isDark ? 'bg-slate-800/50 border-slate-700 hover:bg-slate-800' : 'bg-slate-50 border-slate-100 hover:bg-slate-100/50'}`}>
                        <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                          log.action === 'ADD' ? 'bg-emerald-500' : 
                          log.action === 'DELETE' ? 'bg-rose-500' : 
                          log.action === 'EXPORT' ? 'bg-indigo-500' : 'bg-blue-500'
                        }`}></span>
                        <div className="flex-1">
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                              {log.action} • {log.entity}
                            </span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase">
                              {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className={`text-xs font-bold leading-snug ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{log.details}</p>
                          <p className="text-[9px] text-slate-400 mt-1 uppercase font-black">{new Date(log.timestamp).toLocaleDateString()}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center py-10 opacity-30 italic text-sm">No activity records found.</p>
                  )}
                </div>
              </div>

              <div className={`p-8 flex flex-col items-center border-t mt-10 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                 <button onClick={logout} className="w-full max-sm p-4 bg-rose-500/10 text-rose-500 font-black rounded-2xl uppercase text-xs tracking-widest hover:bg-rose-500/20 transition-all shadow-sm">🚪 Exit Secure Session</button>
                 <p className="text-[10px] text-slate-400 font-bold uppercase mt-4">Safe Vault Logout</p>
              </div>
            </div>
          )}

          {currentView === 'admin' && currentUser.role === 'admin' && (
            <div className={`${cardClass} p-8 rounded-[3rem] border shadow-sm overflow-hidden`}>
               <h3 className="text-xl font-bold mb-6">User Management Panel</h3>
               <div className="overflow-x-auto">
                 <table className="w-full text-left text-sm whitespace-nowrap">
                   <thead className={`${isDark ? 'bg-slate-800/50' : 'bg-slate-50'} border-b text-[10px] font-black text-slate-400 uppercase tracking-widest`}>
                     <tr>
                       <th className="px-6 py-4">Internal User ID</th>
                       <th className="px-6 py-4">Login ID</th>
                       <th className="px-6 py-4">Permission</th>
                       <th className="px-6 py-4 text-right">Vault Entry</th>
                     </tr>
                   </thead>
                   <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-100'}`}>
                     {allUsers.map(u => (
                       <tr key={u.id} className={`${isDark ? 'hover:bg-slate-800/30 text-slate-300' : 'hover:bg-slate-50 text-slate-600'} transition-colors`}>
                         <td className="px-6 py-4 font-mono text-xs opacity-40">{u.id}</td>
                         <td className={`px-6 py-4 font-bold uppercase tracking-tighter ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{u.username}</td>
                         <td className="px-6 py-4"><span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'}`}>{u.role}</span></td>
                         <td className="px-6 py-4 text-right">
                           <button onClick={() => { setCurrentUser(u); setCurrentView('dashboard'); }} className="text-indigo-500 text-[10px] font-black hover:underline uppercase tracking-widest">Login as user</button>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </div>
          )}
        </div>
      </main>

      {/* Manual Entry Popup */}
      {editingTx && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className={`${isDark ? 'bg-slate-900 border border-slate-800' : 'bg-white'} w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-200`}>
            <div className="p-8 bg-indigo-600 text-white flex justify-between items-center">
              <h3 className="text-xl font-black italic">{editingTx.id ? 'Modify Record' : 'Create Record'}</h3>
              <button onClick={() => setEditingTx(null)}>✕</button>
            </div>
            <form className="p-8 space-y-4" onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.target as HTMLFormElement);
              const subId = fd.get('subgroupId') as string;
              const group = ledgers.find(g => g.subgroups.some(s => s.id === subId));
              saveManualOrEdit({
                date: fd.get('date') as string,
                bankName: fd.get('bankName') as string,
                type: fd.get('type') as TransactionType,
                amount: parseFloat(fd.get('amount') as string),
                merchant: fd.get('merchant') as string,
                groupId: group?.id || '',
                subgroupId: subId,
                purpose: fd.get('purpose') as string,
                refNo: fd.get('refNo') as string || `REF-${Date.now()}`
              });
            }}>
              <div className="grid grid-cols-2 gap-4">
                <input type="date" name="date" required defaultValue={editingTx.date || getLocalDateStr()} className={`p-4 rounded-2xl outline-none ${inputClass}`} />
                <input type="text" name="bankName" required placeholder="Bank (HDFC...)" defaultValue={editingTx.bankName} className={`p-4 rounded-2xl outline-none ${inputClass}`} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <select name="type" required defaultValue={editingTx.type || TransactionType.DEBIT} className={`p-4 rounded-2xl outline-none font-bold ${inputClass}`}>
                  <option value={TransactionType.DEBIT}>Expense</option><option value={TransactionType.CREDIT}>Income</option>
                </select>
                <input type="number" name="amount" step="0.01" required placeholder="Amount (₹)" defaultValue={editingTx.amount} className={`p-4 rounded-2xl outline-none font-black ${inputClass}`} />
              </div>
              <input type="text" name="merchant" required placeholder="Merchant Name" defaultValue={editingTx.merchant} className={`w-full p-4 rounded-2xl outline-none ${inputClass}`} />
              <input type="text" name="refNo" placeholder="Ref Number" defaultValue={editingTx.refNo} className={`w-full p-4 rounded-2xl outline-none font-mono ${inputClass}`} />
              <select name="subgroupId" required defaultValue={editingTx.subgroupId} className={`w-full p-4 rounded-2xl outline-none font-bold ${inputClass}`}>
                <option value="">Link to Category...</option>
                {ledgers.map(g => (
                  <optgroup key={g.id} label={g.name} className={isDark ? 'bg-slate-900' : 'bg-white'}>{g.subgroups.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</optgroup>
                ))}
              </select>
              <input type="text" name="purpose" placeholder="Purpose..." defaultValue={editingTx.purpose} className={`w-full p-4 rounded-2xl outline-none ${inputClass}`} />
              <button type="submit" className="w-full p-5 bg-indigo-600 text-white font-black rounded-3xl uppercase tracking-widest shadow-xl">Commit Transaction</button>
            </form>
          </div>
        </div>
      )}

      {/* AI Process Notification */}
      {pendingTx && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className={`${isDark ? 'bg-slate-900 border border-slate-800' : 'bg-white'} w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300`}>
            <div className={`p-8 ${pendingTx.type === TransactionType.CREDIT ? 'bg-emerald-600' : 'bg-rose-600'} text-white`}>
              <h3 className="text-xl font-black italic">✨ AI Detection Found Record</h3>
              <p className="text-[10px] font-bold opacity-80 uppercase mt-1 tracking-widest">Source: {pendingTx.bankName}</p>
            </div>
            <div className="p-10 space-y-8">
              <div className="text-center">
                <span className="text-[10px] font-black text-slate-400 uppercase block mb-2 tracking-widest">Value</span>
                <h2 className={`text-6xl font-black tracking-tighter ${isDark ? 'text-white' : 'text-slate-800'}`}>₹{pendingTx.amount?.toLocaleString()}</h2>
                <div className={`mt-4 inline-block px-4 py-1 rounded-full font-mono text-[9px] uppercase tracking-widest ${isDark ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-500'}`}>REF: {pendingTx.refNo}</div>
              </div>

              <div className="space-y-4">
                <select id="ai-sub-sel" className={`w-full p-4 rounded-[2rem] outline-none font-bold text-sm ${inputClass}`}>
                  <option value="">Choose Ledger...</option>
                  {ledgers.filter(g => g.type === pendingTx.type).map(g => (
                    <optgroup key={g.id} label={g.name} className={isDark ? 'bg-slate-900' : 'bg-white'}>{g.subgroups.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</optgroup>
                  ))}
                </select>
                <input id="ai-p" placeholder="Purpose..." defaultValue={pendingTx.suggestedPurpose} className={`w-full p-4 rounded-[2rem] outline-none text-sm font-medium ${inputClass}`} />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <button onClick={() => {
                  const subId = (document.getElementById('ai-sub-sel') as HTMLSelectElement).value;
                  const purp = (document.getElementById('ai-p') as HTMLInputElement).value;
                  const group = ledgers.find(g => g.subgroups.some(s => s.id === subId));
                  if (group && subId) handleSaveImport(group.id, subId, purp);
                  else alert('Select a category');
                }} className="p-5 bg-indigo-600 text-white font-black rounded-3xl uppercase text-[10px] tracking-widest shadow-lg">Confirm</button>
                <button onClick={handleSkip} className={`p-5 font-black rounded-3xl uppercase text-[10px] tracking-widest ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>Skip</button>
                <button onClick={() => setPendingTx(null)} className="p-5 bg-rose-500/10 text-rose-500 font-black rounded-3xl uppercase text-[10px] tracking-widest">Discard</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Navigation */}
      <nav className={`md:hidden fixed bottom-0 left-0 right-0 border-t flex justify-around p-2 safe-area-bottom z-40 shadow-2xl ${isDark ? 'bg-slate-900/90 backdrop-blur-lg border-slate-800' : 'bg-white/90 backdrop-blur-lg border-slate-200'}`}>
        <NavItem label="Vault" icon="🏢" active={currentView === 'dashboard'} onClick={() => setCurrentView('dashboard')} isMobile themeClass={themeClass} isDark={isDark} />
        <NavItem label="Entry" icon="💸" active={currentView === 'transactions'} onClick={() => setCurrentView('transactions')} isMobile themeClass={themeClass} isDark={isDark} />
        <NavItem label="Notes" icon="📝" active={currentView === 'notes'} onClick={() => setCurrentView('notes')} isMobile themeClass={themeClass} isDark={isDark} />
        <NavItem label="More" icon="⚙️" active={currentView === 'settings'} onClick={() => setCurrentView('settings')} isMobile themeClass={themeClass} isDark={isDark} />
      </nav>
    </div>
  );
};

export default App;
