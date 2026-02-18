import React, { useState, useEffect, useMemo } from 'react';
import { PaymentRecord, FinancialStats } from '../../types';
import { paymentService } from '../../services/paymentService';

const AdminEarnings: React.FC = () => {
    const [ledger, setLedger] = useState<PaymentRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({
        status: 'all',
        sprint: 'all',
        method: 'all'
    });

    useEffect(() => {
        const unsubscribe = paymentService.subscribeToPayments((data) => {
            setLedger(data);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const stats = useMemo(() => paymentService.calculateFinancialStats(ledger), [ledger]);

    const filteredLedger = useMemo(() => {
        return ledger.filter(p => {
            const matchesSearch = p.userName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                 p.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                 p.txRef.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = filters.status === 'all' || p.status === filters.status;
            const matchesSprint = filters.sprint === 'all' || p.sprintTitle === filters.sprint;
            const matchesMethod = filters.method === 'all' || p.paymentMethod?.toLowerCase() === filters.method;
            
            return matchesSearch && matchesStatus && matchesSprint && matchesMethod;
        });
    }, [ledger, searchTerm, filters]);

    const sprintRevenue = useMemo(() => {
        const map: Record<string, number> = {};
        ledger.filter(p => p.status === 'success').forEach(p => {
            map[p.sprintTitle] = (map[p.sprintTitle] || 0) + p.amount;
        });
        return Object.entries(map).sort((a, b) => b[1] - a[1]);
    }, [ledger]);

    const SummaryCard = ({ label, value, sub, color = "gray", trend }: { label: string, value: string | number, sub?: string, color?: string, trend?: string }) => (
        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden group">
            <div className="flex justify-between items-start mb-4">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
                {trend && <span className="text-[9px] font-black text-green-500 bg-green-50 px-2 py-0.5 rounded-full">{trend}</span>}
            </div>
            <p className={`text-2xl font-black text-${color === 'primary' ? 'primary' : 'gray-900'} tracking-tight mb-1`}>{value}</p>
            {sub && <p className="text-[10px] font-bold text-gray-400 uppercase italic">{sub}</p>}
            <div className={`absolute -bottom-6 -right-6 w-16 h-16 bg-${color === 'primary' ? 'primary' : 'gray'}-500/5 rounded-full blur-xl transition-transform group-hover:scale-150`}></div>
        </div>
    );

    if (isLoading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;

    return (
        <div className="space-y-10 animate-fade-in pb-20">
            {/* TOP SUMMARY CARDS */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                <SummaryCard label="Total Rev" value={`₦${stats.totalRevenue.toLocaleString()}`} color="primary" trend="+14%" />
                <SummaryCard label="Today" value={`₦${stats.revenueToday.toLocaleString()}`} />
                <SummaryCard label="This Month" value={`₦${stats.revenueThisMonth.toLocaleString()}`} />
                <SummaryCard label="Successful" value={stats.successCount} color="green" />
                <SummaryCard label="Failed" value={stats.failedCount} color="red" />
                <SummaryCard label="Pending" value={stats.pendingCount} color="orange" />
                <SummaryCard label="Refunds" value={`₦${stats.totalRefunds.toLocaleString()}`} color="gray" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* REVENUE BREAKDOWN */}
                <section className="lg:col-span-8 bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/20">
                        <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-[0.3em]">Revenue by Program</h4>
                    </div>
                    <div className="p-8 flex-1 space-y-6">
                        {sprintRevenue.length > 0 ? sprintRevenue.map(([title, rev]) => {
                            const percent = (rev / stats.totalRevenue) * 100;
                            return (
                                <div key={title} className="space-y-2">
                                    <div className="flex justify-between items-end">
                                        <p className="text-xs font-black text-gray-700 truncate max-w-[250px]">{title}</p>
                                        <p className="text-sm font-black text-gray-900">₦{rev.toLocaleString()}</p>
                                    </div>
                                    <div className="h-2 bg-gray-50 rounded-full overflow-hidden">
                                        <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: `${percent}%` }}></div>
                                    </div>
                                </div>
                            );
                        }) : <p className="text-center py-20 text-gray-300 italic text-sm">No sales data yet.</p>}
                    </div>
                </section>

                {/* PAYMENT HEALTH */}
                <section className="lg:col-span-4 bg-gray-900 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden flex flex-col justify-between">
                    <div className="relative z-10">
                        <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-10">Payment Health</h4>
                        <div className="space-y-8">
                            <div className="flex justify-between items-center border-b border-white/5 pb-4">
                                <p className="text-xs font-bold text-white/50 italic">Success Rate</p>
                                <p className="text-2xl font-black text-primary">{stats.successRate.toFixed(1)}%</p>
                            </div>
                            <div className="flex justify-between items-center border-b border-white/5 pb-4">
                                <p className="text-xs font-bold text-white/50 italic">Failure Rate</p>
                                <p className={`text-2xl font-black ${stats.failureRate > 20 ? 'text-red-400' : 'text-white'}`}>{stats.failureRate.toFixed(1)}%</p>
                            </div>
                            <div className="flex justify-between items-center border-b border-white/5 pb-4">
                                <p className="text-xs font-bold text-white/50 italic">Drop-off Rate</p>
                                <p className="text-2xl font-black text-orange-400">{stats.dropOffRate.toFixed(1)}%</p>
                            </div>
                            <div className="flex justify-between items-center">
                                <p className="text-xs font-bold text-white/50 italic">ARPU</p>
                                <p className="text-2xl font-black text-white">₦{stats.arpu.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl"></div>
                </section>
            </div>

            {/* TRANSACTIONS TABLE */}
            <section className="space-y-6">
                <div className="sticky top-0 z-20 bg-white border border-gray-100 rounded-[1.5rem] shadow-sm p-4 flex flex-wrap gap-4 items-center justify-between">
                    <div className="flex-1 min-w-[200px] relative">
                        <input 
                            type="text" 
                            placeholder="Search email, name or ref..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs outline-none focus:ring-4 focus:ring-primary/5 transition-all"
                        />
                        <svg className="absolute left-3.5 top-3 h-4 w-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                    </div>
                    <div className="flex gap-3">
                        <select value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})} className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest outline-none">
                            <option value="all">Status: All</option>
                            <option value="success">Success</option>
                            <option value="failed">Failed</option>
                            <option value="pending">Pending</option>
                        </select>
                        <select value={filters.method} onChange={e => setFilters({...filters, method: e.target.value})} className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest outline-none">
                            <option value="all">Method: All</option>
                            <option value="card">Card</option>
                            <option value="transfer">Transfer</option>
                        </select>
                    </div>
                </div>

                <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="px-8 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">User</th>
                                <th className="px-8 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">Program</th>
                                <th className="px-8 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Amount</th>
                                <th className="px-8 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                                <th className="px-8 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">Reference</th>
                                <th className="px-8 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredLedger.map((p) => (
                                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-8 py-5">
                                        <p className="font-bold text-gray-900 text-sm truncate max-w-[150px]">{p.userName}</p>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase truncate max-w-[150px]">{p.userEmail}</p>
                                    </td>
                                    <td className="px-8 py-5">
                                        <p className="text-xs font-black text-primary uppercase truncate max-w-[150px]">{p.sprintTitle}</p>
                                    </td>
                                    <td className="px-8 py-5 text-right font-black text-gray-900">
                                        ₦{p.amount.toLocaleString()}
                                    </td>
                                    <td className="px-8 py-5 text-center">
                                        <span className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                                            p.status === 'success' ? 'bg-green-50 text-green-600' : 
                                            p.status === 'failed' ? 'bg-red-50 text-red-600' : 
                                            'bg-orange-50 text-orange-600 animate-pulse'
                                        }`}>
                                            {p.status}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5 font-mono text-[10px] text-gray-400">
                                        {p.txRef}
                                    </td>
                                    <td className="px-8 py-5 text-right text-[10px] text-gray-500 font-medium">
                                        {new Date(p.initiatedAt).toLocaleDateString()} <br/>
                                        <span className="opacity-40">{new Date(p.initiatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                    </td>
                                </tr>
                            ))}
                            {filteredLedger.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="py-20 text-center">
                                        <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">No matching records.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* SMART ALERTS */}
            {stats.failureRate > 25 && (
                <div className="bg-red-50 border border-red-100 rounded-3xl p-6 flex items-center gap-6 animate-pulse">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-sm">⚠️</div>
                    <div>
                        <h5 className="text-sm font-black text-red-900 tracking-tight">Abnormal Failure Rate</h5>
                        <p className="text-xs font-medium text-red-700 italic">Payments are failing at a rate of {stats.failureRate.toFixed(1)}%. Verify Flutterwave integration status.</p>
                    </div>
                </div>
            )}

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in { animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}</style>
        </div>
    );
};

export default AdminEarnings;