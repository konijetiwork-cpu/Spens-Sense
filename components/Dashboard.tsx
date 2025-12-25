
import React, { useMemo } from 'react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip, Legend as ReLegend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts';
import { Transaction, LedgerGroup, TransactionType } from '../types';

interface Props {
  transactions: Transaction[];
  ledgers: LedgerGroup[];
}

const Dashboard: React.FC<Props> = ({ transactions, ledgers }) => {
  const stats = useMemo(() => {
    const expenses = transactions.filter(t => t.type === TransactionType.DEBIT).reduce((acc, curr) => acc + curr.amount, 0);
    const income = transactions.filter(t => t.type === TransactionType.CREDIT).reduce((acc, curr) => acc + curr.amount, 0);
    return { expenses, income, balance: income - expenses };
  }, [transactions]);

  const recentTxs = useMemo(() => transactions.slice(0, 5), [transactions]);

  const pieData = useMemo(() => {
    const spendMap: Record<string, number> = {};
    transactions
      .filter(t => t.type === TransactionType.DEBIT)
      .forEach(t => {
        const group = ledgers.find(l => l.id === t.groupId);
        const name = group ? group.name : 'Uncategorized';
        spendMap[name] = (spendMap[name] || 0) + t.amount;
      });
    return Object.entries(spendMap).map(([name, value]) => ({ name, value }));
  }, [transactions, ledgers]);

  const barData = useMemo(() => {
    const data = [];
    const now = new Date();
    
    // Iterate over the last 7 days including today
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      
      // Explicit Local Date String for matching (YYYY-MM-DD)
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      
      const daySpending = transactions
        .filter(t => t.type === TransactionType.DEBIT && t.date === dateStr)
        .reduce((sum, t) => sum + t.amount, 0);

      data.push({
        label: d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' }),
        Spending: daySpending,
        key: dateStr // Stability key for chart
      });
    }
    return data;
  }, [transactions]);

  const COLORS = ['#6366f1', '#10b981', '#f43f5e', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899'];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full max-w-7xl mx-auto">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden group border border-slate-800">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/5 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
          <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Vault Net Balance</p>
          <h2 className="text-4xl font-black tracking-tighter">₹{stats.balance.toLocaleString()}</h2>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm flex flex-col justify-center border-emerald-100">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Receipts (In)</p>
          <h2 className="text-3xl font-black text-emerald-600 tracking-tighter">₹{stats.income.toLocaleString()}</h2>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm flex flex-col justify-center border-rose-100">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Payments (Out)</p>
          <h2 className="text-3xl font-black text-rose-600 tracking-tighter">₹{stats.expenses.toLocaleString()}</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Bar Chart: Last 7 Days Spending */}
        <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm h-[480px] flex flex-col">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-8 text-center">Daily Spending (Last 7 Days)</h3>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="label" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 9, fontWeight: 800, fill: '#94a3b8' }} 
                />
                <YAxis hide />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }} 
                  contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }} 
                  formatter={(val: number) => [`₹${val.toLocaleString()}`, 'Spending']}
                />
                <Bar 
                  name="Spending" 
                  dataKey="Spending" 
                  fill="#f43f5e" 
                  radius={[6, 6, 0, 0]} 
                  barSize={24} 
                  animationDuration={1500}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart: Payment Groups */}
        <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm h-[480px] flex flex-col">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-8 text-center">Payment Breakdown by Group</h3>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={pieData} 
                  cx="50%" 
                  cy="50%" 
                  innerRadius={80} 
                  outerRadius={105} 
                  paddingAngle={5} 
                  dataKey="value"
                  animationDuration={1500}
                >
                  {pieData.map((e, i) => (<Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} stroke="none" />))}
                </Pie>
                <ReTooltip contentStyle={{ borderRadius: '1.5rem', border: 'none' }} formatter={(val: number) => `₹${val.toLocaleString()}`} />
                <ReLegend iconType="circle" verticalAlign="bottom" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 'bold' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 px-4">Recent Vault Activity</h3>
        <div className="bg-white rounded-[2.5rem] border shadow-sm overflow-hidden overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50 border-b text-[9px] font-black text-slate-400 uppercase tracking-widest">
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
            <tbody className="divide-y text-slate-600 font-bold">
              {recentTxs.map(t => (
                <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-slate-400 text-[10px] font-medium">{t.date}</td>
                  <td className="px-6 py-4 text-slate-800">{t.bankName}</td>
                  <td className={`px-6 py-4 tracking-tighter ${t.type === TransactionType.CREDIT ? 'text-emerald-500' : 'text-rose-500'}`}>{t.type === TransactionType.CREDIT ? 'RECEIPT' : 'PAYMENT'}</td>
                  <td className="px-6 py-4 font-mono text-[9px] opacity-40">{t.refNo}</td>
                  <td className="px-6 py-4">{ledgers.find(l => l.id === t.groupId)?.name || 'N/A'}</td>
                  <td className="px-6 py-4 font-normal text-slate-400">{ledgers.find(l => l.id === t.groupId)?.subgroups.find(s => s.id === t.subgroupId)?.name || 'N/A'}</td>
                  <td className="px-6 py-4 italic truncate max-w-[120px] font-normal text-slate-500">{t.purpose}</td>
                  <td className={`px-6 py-4 text-right font-black ${t.type === TransactionType.CREDIT ? 'text-emerald-600' : 'text-rose-600'}`}>₹{t.amount.toLocaleString()}</td>
                </tr>
              ))}
              {recentTxs.length === 0 && <tr><td colSpan={8} className="p-16 text-center italic text-slate-300">No recent vault activity.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
