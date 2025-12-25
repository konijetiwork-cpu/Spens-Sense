
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Transaction, LedgerGroup, User, ViewType, TransactionType, 
  ThemePreset, AppFont, UserPreferences, ActivityLog, Reminder, UserProfile 
} from './types';
import { 
  INITIAL_LEDGERS, MOCK_SMS_TEMPLATES, THEME_PRESETS, FONT_MAP, PRESETS,
  UNCATEGORIZED_GROUP_ID, SKIPPED_SUB_ID 
} from './constants';
import { parseSmsWithGemini } from './services/geminiService';
import Dashboard from './components/Dashboard';
import LedgerSetup from './components/LedgerSetup';
import StatementView from './components/StatementView';

// Robust local date string generator (YYYY-MM-DD)
const getLocalDateStr = (d: Date = new Date()) => {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const NavItem: React.FC<{ 
  label: string; icon: string; active: boolean; onClick: () => void; isMobile?: boolean; themeClass: string 
}> = ({ label, icon, active, onClick, isMobile, themeClass }) => {
  const activeBg = themeClass.includes('bg-slate-900') ? 'bg-slate-800' : 'bg-indigo-600';

  if (isMobile) {
    return (
      <button onClick={onClick} className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${active ? 'text-indigo-600' : 'text-slate-400'}`}>
        <span className="text-xl">{icon}</span>
        <span className="text-[10px] font-bold uppercase">{label}</span>
      </button>
    );
  }

  return (
    <button onClick={onClick} className={`w-full flex items-center px-4 py-3 rounded-xl transition-all ${active ? `${activeBg} text-white shadow-lg` : 'text-slate-500 hover:bg-slate-100'}`}>
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
      setAlertDismissed(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      const uId = currentUser.id;
      localStorage.setItem(`ss_data_ledgers_${uId}`, JSON.stringify(ledgers));
      localStorage.setItem(`ss_data_txs_${uId}`, JSON.stringify(transactions));
      localStorage.setItem(`ss_data_logs_${uId}`, JSON.stringify(logs));
    }
  }, [ledgers, transactions, logs, currentUser]);

  const addLog = (action: ActivityLog['action'], entity: ActivityLog['entity'], details: string, data?: any) => {
    const newLog: ActivityLog = { id: `log-${Date.now()}-${Math.random()}`, action, entity, details, timestamp: Date.now(), data };
    setLogs(prev => [newLog, ...prev]);
  };

  const handleAuth = () => {
    if (authMode === 'login') {
      const user = allUsers.find(u => (u.username === authId || u.email === authId) && u.passwordHash === authPass);
      if (user) setCurrentUser(user);
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
      setAllUsers([...allUsers, newUser]);
      setCurrentUser(newUser);
    }
  };

  const logout = () => {
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
    } else {
      const newTx = { ...tx, id: `tx-${Date.now()}-${Math.random()}` } as Transaction;
      setTransactions(prev => [newTx, ...prev]);
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
  };

  const updatePreference = (prefs: UserPreferences) => {
    if (!currentUser) return;
    const updated = { ...currentUser, preferences: prefs };
    setCurrentUser(updated);
    setAllUsers(allUsers.map(u => u.id === currentUser.id ? updated : u));
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

  return (
    <div className={`min-h-screen ${fontClass} bg-slate-50 flex flex-col md:flex-row pb-20 md:pb-0`}>
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
      <aside className={`hidden md:flex w-64 ${themeClass.includes('bg-slate-900') ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} border-r flex-col p-6 space-y-8 sticky top-0 h-screen`}>
        <div className="text-center">
          <h1 className={`text-2xl font-black italic tracking-tighter ${themeClass.includes('bg-slate-900') ? 'text-white' : 'text-indigo-900'}`}>SPEND SENSE</h1>
        </div>
        <nav className="flex-1 space-y-2">
          <NavItem label="Dashboard" icon="📊" active={currentView === 'dashboard'} onClick={() => setCurrentView('dashboard')} themeClass={themeClass} />
          <NavItem label="Expenses" icon="💸" active={currentView === 'transactions'} onClick={() => setCurrentView('transactions')} themeClass={themeClass} />
          <NavItem label="Ledgers" icon="📔" active={currentView === 'ledger'} onClick={() => setCurrentView('ledger')} themeClass={themeClass} />
          <NavItem label="Reports" icon="📈" active={currentView === 'statement'} onClick={() => setCurrentView('statement')} themeClass={themeClass} />
          <NavItem label="Settings" icon="🎨" active={currentView === 'settings'} onClick={() => setCurrentView('settings')} themeClass={themeClass} />
          {currentUser.role === 'admin' && <NavItem label="Admin" icon="🔐" active={currentView === 'admin'} onClick={() => setCurrentView('admin')} themeClass={themeClass} />}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b p-4 md:p-6 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-800 capitalize">{currentView}</h2>
          <div className="flex gap-2">
            <button onClick={processImport} disabled={isProcessingSms} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg shadow-indigo-100">
              {isProcessingSms ? '⌛ Processing...' : '📩 Import SMS'}
            </button>
            <button onClick={() => setEditingTx({} as any)} className="bg-slate-100 text-slate-600 px-4 py-2 rounded-xl text-xs font-bold">➕ Add Entry</button>
          </div>
        </header>

        <div className="p-4 md:p-8 flex-1 overflow-y-auto">
          {currentView === 'dashboard' && <Dashboard transactions={transactions} ledgers={ledgers} />}
          {currentView === 'ledger' && <LedgerSetup ledgers={ledgers} setLedgers={setLedgers} />}
          {currentView === 'statement' && <StatementView transactions={transactions} ledgers={ledgers} onExport={exportToExcel} />}
          
          {currentView === 'transactions' && (
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
                    <th className="px-6 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-slate-700">
                  {transactions.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 text-xs font-medium">{t.date}</td>
                      <td className="px-6 py-4 font-bold">{t.bankName}</td>
                      <td className={`px-6 py-4 font-black ${t.type === TransactionType.CREDIT ? 'text-emerald-500' : 'text-rose-500'}`}>{t.type === TransactionType.CREDIT ? 'Receipt' : 'Payment'}</td>
                      <td className="px-6 py-4 font-mono text-xs opacity-50">{t.refNo}</td>
                      <td className="px-6 py-4 font-bold">{ledgers.find(l => l.id === t.groupId)?.name || 'N/A'}</td>
                      <td className="px-6 py-4 text-slate-400">{ledgers.find(l => l.id === t.groupId)?.subgroups.find(s => s.id === t.subgroupId)?.name || 'N/A'}</td>
                      <td className="px-6 py-4 italic text-slate-500 truncate max-w-[150px]">{t.purpose}</td>
                      <td className={`px-6 py-4 text-right font-black ${t.type === TransactionType.CREDIT ? 'text-emerald-600' : 'text-rose-600'}`}>₹{t.amount.toLocaleString()}</td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center gap-3">
                          <button onClick={() => setEditingTx(t)} className="text-blue-500">✏️</button>
                          <button onClick={() => deleteTransaction(t.id)} className="text-rose-500">🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {transactions.length === 0 && <tr><td colSpan={9} className="p-20 text-center italic text-slate-300">Wallet is empty.</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {currentView === 'settings' && (
            <div className="max-w-4xl mx-auto space-y-10">
              {/* Profile Section */}
              <div className="bg-white p-8 rounded-[3rem] border shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <span className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">👤</span>
                    User Profile
                  </h3>
                  {!isEditingProfile ? (
                    <button 
                      onClick={() => setIsEditingProfile(true)}
                      className="text-xs font-black uppercase text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl hover:bg-indigo-100 transition-colors"
                    >
                      Edit Profile
                    </button>
                  ) : null}
                </div>

                {!isEditingProfile ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Full Name</p>
                      <p className="text-sm font-bold text-slate-800">{currentUser.profile?.fullName || 'Not set'}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Pet Name</p>
                      <p className="text-sm font-bold text-slate-800">{currentUser.profile?.petName || 'Not set'}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Date of Birth</p>
                      <p className="text-sm font-bold text-slate-800">{currentUser.profile?.dob || 'Not set'}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Occupation</p>
                      <p className="text-sm font-bold text-slate-800">{currentUser.profile?.occupation || 'Not set'}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Email Address</p>
                      <p className="text-sm font-bold text-slate-800">{currentUser.profile?.email || 'Not set'}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Mobile Number</p>
                      <p className="text-sm font-bold text-slate-800">{currentUser.profile?.mobile || 'Not set'}</p>
                    </div>
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
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Full Name</label>
                        <input name="fullName" defaultValue={currentUser.profile?.fullName} className="w-full p-4 bg-slate-50 border rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. John Doe" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Pet Name</label>
                        <input name="petName" defaultValue={currentUser.profile?.petName} className="w-full p-4 bg-slate-50 border rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. Johnny" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Date of Birth</label>
                        <input name="dob" type="date" defaultValue={currentUser.profile?.dob} className="w-full p-4 bg-slate-50 border rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Occupation</label>
                        <input name="occupation" defaultValue={currentUser.profile?.occupation} className="w-full p-4 bg-slate-50 border rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. Software Engineer" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Email Address</label>
                        <input name="email" type="email" defaultValue={currentUser.profile?.email} className="w-full p-4 bg-slate-50 border rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. john@example.com" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Mobile Number</label>
                        <input name="mobile" defaultValue={currentUser.profile?.mobile} className="w-full p-4 bg-slate-50 border rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. +1 234 567 890" />
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button type="submit" className="flex-1 bg-indigo-600 text-white font-black p-4 rounded-2xl uppercase text-xs tracking-widest shadow-lg shadow-indigo-100">Save Changes</button>
                      <button type="button" onClick={() => setIsEditingProfile(false)} className="px-8 bg-slate-100 text-slate-500 font-bold p-4 rounded-2xl uppercase text-xs">Cancel</button>
                    </div>
                  </form>
                )}
              </div>

              <div className="bg-white p-8 rounded-[3rem] border shadow-sm">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <span className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">🎨</span>
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
                          className={`p-3 rounded-xl border text-[10px] font-bold uppercase transition-all ${currentUser.preferences.theme === t ? 'border-indigo-600 bg-indigo-50 text-indigo-600 shadow-md' : 'bg-slate-50 hover:bg-slate-100 text-slate-500 border-slate-200'}`}
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
                          className={`p-3 rounded-xl border text-[10px] font-bold uppercase transition-all ${currentUser.preferences.font === f ? 'border-indigo-600 bg-indigo-50 text-indigo-600 shadow-md' : 'bg-slate-50 hover:bg-slate-100 text-slate-500 border-slate-200'}`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 flex flex-col items-center border-t border-slate-100 mt-10">
                 <button onClick={logout} className="w-full max-w-sm p-4 bg-rose-50 text-rose-500 font-black rounded-2xl uppercase text-xs tracking-widest hover:bg-rose-100 transition-all shadow-sm">🚪 Exit Secure Session</button>
                 <p className="text-[10px] text-slate-300 font-bold uppercase mt-4">Safe Vault Logout</p>
              </div>
            </div>
          )}

          {currentView === 'admin' && currentUser.role === 'admin' && (
            <div className="bg-white p-8 rounded-[3rem] border shadow-sm overflow-hidden">
               <h3 className="text-xl font-bold mb-6">User Management Panel</h3>
               <div className="overflow-x-auto">
                 <table className="w-full text-left text-sm whitespace-nowrap">
                   <thead className="bg-slate-50 border-b text-[10px] font-black text-slate-400 uppercase tracking-widest">
                     <tr>
                       <th className="px-6 py-4">Internal User ID</th>
                       <th className="px-6 py-4">Login ID</th>
                       <th className="px-6 py-4">Permission</th>
                       <th className="px-6 py-4 text-right">Vault Entry</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y text-slate-600">
                     {allUsers.map(u => (
                       <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                         <td className="px-6 py-4 font-mono text-xs opacity-40">{u.id}</td>
                         <td className="px-6 py-4 font-bold text-slate-800 uppercase tracking-tighter">{u.username}</td>
                         <td className="px-6 py-4"><span className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-black uppercase tracking-widest">{u.role}</span></td>
                         <td className="px-6 py-4 text-right">
                           <button onClick={() => { setCurrentUser(u); setCurrentView('dashboard'); }} className="text-indigo-600 text-[10px] font-black hover:underline uppercase tracking-widest">Login as user</button>
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
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-200">
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
                <input type="date" name="date" required defaultValue={editingTx.date || getLocalDateStr()} className="p-4 bg-slate-50 border rounded-2xl outline-none" />
                <input type="text" name="bankName" required placeholder="Bank (HDFC, SBI...)" defaultValue={editingTx.bankName} className="p-4 bg-slate-50 border rounded-2xl outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <select name="type" required defaultValue={editingTx.type || TransactionType.DEBIT} className="p-4 bg-slate-50 border rounded-2xl outline-none font-bold">
                  <option value={TransactionType.DEBIT}>Expense (Payment)</option><option value={TransactionType.CREDIT}>Income (Receipt)</option>
                </select>
                <input type="number" name="amount" step="0.01" required placeholder="Amount (₹)" defaultValue={editingTx.amount} className="p-4 bg-slate-50 border rounded-2xl outline-none font-black" />
              </div>
              <input type="text" name="merchant" required placeholder="Payee / Merchant Name" defaultValue={editingTx.merchant} className="w-full p-4 bg-slate-50 border rounded-2xl outline-none" />
              <input type="text" name="refNo" placeholder="Reference Number" defaultValue={editingTx.refNo} className="w-full p-4 bg-slate-50 border rounded-2xl outline-none font-mono" />
              <select name="subgroupId" required defaultValue={editingTx.subgroupId} className="w-full p-4 bg-slate-50 border rounded-2xl outline-none font-bold">
                <option value="">Link to Category...</option>
                {ledgers.map(g => (
                  <optgroup key={g.id} label={g.name}>{g.subgroups.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</optgroup>
                ))}
              </select>
              <input type="text" name="purpose" placeholder="Brief note/purpose..." defaultValue={editingTx.purpose} className="w-full p-4 bg-slate-50 border rounded-2xl outline-none" />
              <button type="submit" className="w-full p-5 bg-indigo-600 text-white font-black rounded-3xl uppercase tracking-widest shadow-xl">Commit Transaction</button>
            </form>
          </div>
        </div>
      )}

      {/* AI Process Notification (SMS Popup) */}
      {pendingTx && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in duration-300">
            <div className={`p-8 ${pendingTx.type === TransactionType.CREDIT ? 'bg-emerald-600' : 'bg-rose-600'} text-white`}>
              <h3 className="text-xl font-black italic">✨ AI Detection Found Record</h3>
              <p className="text-[10px] font-bold opacity-80 uppercase mt-1 tracking-widest">Banking Alert Source: {pendingTx.bankName}</p>
            </div>
            <div className="p-10 space-y-8">
              <div className="text-center">
                <span className="text-[10px] font-black text-slate-400 uppercase block mb-2 tracking-widest">Transaction Value</span>
                <h2 className="text-6xl font-black text-slate-800 tracking-tighter">₹{pendingTx.amount?.toLocaleString()}</h2>
                <div className="mt-4 inline-block px-4 py-1 bg-slate-100 rounded-full font-mono text-[9px] text-slate-500 uppercase tracking-widest">REF: {pendingTx.refNo}</div>
              </div>

              <div className="space-y-4">
                <select id="ai-sub-sel" className="w-full p-4 bg-slate-50 border rounded-[2rem] outline-none font-bold text-sm">
                  <option value="">Choose Ledger Placement...</option>
                  {ledgers.filter(g => g.type === pendingTx.type).map(g => (
                    <optgroup key={g.id} label={g.name}>{g.subgroups.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</optgroup>
                  ))}
                </select>
                <input id="ai-p" placeholder="Enter transaction purpose..." defaultValue={pendingTx.suggestedPurpose} className="w-full p-4 bg-slate-50 border rounded-[2rem] outline-none text-sm font-medium" />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <button onClick={() => {
                  const subId = (document.getElementById('ai-sub-sel') as HTMLSelectElement).value;
                  const purp = (document.getElementById('ai-p') as HTMLInputElement).value;
                  const group = ledgers.find(g => g.subgroups.some(s => s.id === subId));
                  if (group && subId) handleSaveImport(group.id, subId, purp);
                  else alert('Select a category');
                }} className="p-5 bg-indigo-600 text-white font-black rounded-3xl uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-100">Confirm</button>
                <button onClick={handleSkip} className="p-5 bg-slate-100 text-slate-500 font-black rounded-3xl uppercase text-[10px] tracking-widest">Skip</button>
                <button onClick={() => setPendingTx(null)} className="p-5 bg-rose-50 text-rose-500 font-black rounded-3xl uppercase text-[10px] tracking-widest">Discard</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around p-2 safe-area-bottom z-40 shadow-2xl glass-effect">
        <NavItem label="Vault" icon="🏢" active={currentView === 'dashboard'} onClick={() => setCurrentView('dashboard')} isMobile themeClass={themeClass} />
        <NavItem label="Entry" icon="💸" active={currentView === 'transactions'} onClick={() => setCurrentView('transactions')} isMobile themeClass={themeClass} />
        <NavItem label="Setup" icon="📔" active={currentView === 'ledger'} onClick={() => setCurrentView('ledger')} isMobile themeClass={themeClass} />
        <NavItem label="More" icon="⚙️" active={currentView === 'settings'} onClick={() => setCurrentView('settings')} isMobile themeClass={themeClass} />
      </nav>
    </div>
  );
};

export default App;
