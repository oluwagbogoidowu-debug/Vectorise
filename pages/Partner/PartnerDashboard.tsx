import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import LocalLogo from '../../components/LocalLogo';
import Button from '../../components/Button';
import { Participant } from '../../types';
import { partnerService } from '../../services/partnerService';

type PartnerTab = 'overview' | 'links' | 'earnings' | 'referrals' | 'settings';

const PartnerDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<PartnerTab>('overview');
  const [realTimeMetrics, setRealTimeMetrics] = useState({ totalClicks: 0 });

  const p = user as Participant;
  const referralCode = p?.referralCode || 'PARTNER';
  
  // Real-time metrics subscription
  useEffect(() => {
    if (referralCode) {
      const unsubscribe = partnerService.subscribeToMetrics(referralCode, (data) => {
        setRealTimeMetrics(data);
      });
      return () => unsubscribe();
    }
  }, [referralCode]);

  // referral links now strictly follow: domain.com/?ref=CODE#/
  const partnerLink = `${window.location.origin}/?ref=${referralCode}#/`;

  // Mock data for the partner metrics (except clicks which is now real)
  const stats = {
    revenue: 125000,
    earnings: 37500,
    paidOut: 20000,
    pending: 17500,
    activeLinks: 4,
    purchases: 12,
    completions: 8
  };

  const sprintLinks = [
    { name: '5-Day Clarity Sprint', price: 5000, share: 1500, id: 'clarity-sprint' },
    { name: 'LinkedIn Personal Brand', price: 10000, share: 3000, id: 'linkedin-sprint' },
    { name: 'Productivity Architect', price: 7500, share: 2250, id: 'prod-sprint' }
  ];

  const transactions = [
    { date: '2026-01-12', sprint: 'LinkedIn Personal Brand', price: 10000, share: 3000, status: 'Paid' },
    { date: '2026-01-10', sprint: '5-Day Clarity Sprint', price: 5000, share: 1500, status: 'Pending' },
    { date: '2026-01-08', sprint: 'Productivity Architect', price: 7500, share: 2250, status: 'Paid' }
  ];

  const referrals = [
    { user: 'Musa Abubakar', sprint: 'Clarity Sprint', stage: 'Direction', status: 'In Progress', earned: 0 },
    { user: 'Chioma Okafor', sprint: 'LinkedIn Brand', stage: 'Positioning', status: 'Completed', earned: 3000 },
    { user: 'Tunde Afolayan', sprint: 'Clarity Sprint', stage: 'Foundation', status: 'Completed', earned: 1500 }
  ];

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Link copied to clipboard!');
  };

  const TabButton = ({ id, label }: { id: PartnerTab, label: string }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative ${
        activeTab === id ? 'text-primary' : 'text-gray-400 hover:text-gray-600'
      }`}
    >
      {label}
      {activeTab === id && (
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-full"></div>
      )}
    </button>
  );

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col font-sans">
      {/* Top Nav */}
      <header className="bg-white border-b border-gray-100 px-6 py-5 flex justify-between items-center sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <Link to="/">
            <LocalLogo type="green" className="h-7 w-auto" />
          </Link>
          <div className="w-px h-5 bg-gray-100"></div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Partner Portal</p>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => logout()} className="p-2.5 bg-gray-50 text-gray-400 hover:text-red-500 rounded-xl border border-gray-100 transition-all active:scale-90">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          </button>
        </div>
      </header>

      {/* Tab bar */}
      <div className="bg-white border-b border-gray-100 px-6 sticky top-[69px] z-20">
        <div className="max-w-screen-xl mx-auto flex overflow-x-auto no-scrollbar">
          <TabButton id="overview" label="Overview" />
          <TabButton id="links" label="Links" />
          <TabButton id="earnings" label="Earnings" />
          <TabButton id="referrals" label="Referrals" />
          <TabButton id="settings" label="Settings" />
        </div>
      </div>

      <main className="flex-1 p-6 md:p-10 max-w-screen-xl mx-auto w-full">
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="animate-fade-in space-y-10">
            <div>
              <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-1 italic">Welcome back.</h2>
              <p className="text-gray-500 font-medium text-sm">Here’s your partner activity at a glance.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden group">
                <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-2">Real-time Clicks</p>
                <h3 className="text-3xl font-black text-gray-900 tracking-tight">{realTimeMetrics.totalClicks.toLocaleString()}</h3>
                <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-primary/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
              </div>
              <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden group">
                <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-2">Your Earnings</p>
                <h3 className="text-3xl font-black text-gray-900 tracking-tight">₦{stats.earnings.toLocaleString()}</h3>
                <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-primary/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
              </div>
              <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Paid Out</p>
                <h3 className="text-3xl font-black text-gray-900 tracking-tight">₦{stats.paidOut.toLocaleString()}</h3>
              </div>
              <div className="bg-dark p-8 rounded-[2rem] shadow-xl text-white">
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Pending Balance</p>
                <h3 className="text-3xl font-black tracking-tight italic text-primary">₦{stats.pending.toLocaleString()}</h3>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <section className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm">
                <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-[0.3em] mb-8 border-b border-gray-50 pb-4">Performance Metrics</h4>
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-bold text-gray-500">Total Link Clicks</p>
                    <p className="text-lg font-black text-primary animate-pulse">{realTimeMetrics.totalClicks.toLocaleString()}</p>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-bold text-gray-500">Purchases via Link</p>
                    <p className="text-lg font-black text-gray-900">{stats.purchases}</p>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-bold text-gray-500">Sprint Completions</p>
                    <p className="text-lg font-black text-primary">{stats.completions}</p>
                  </div>
                </div>
              </section>

              <section className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm">
                <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-[0.3em] mb-8 border-b border-gray-50 pb-4">Quick Actions</h4>
                <div className="grid grid-cols-1 gap-3">
                  <button onClick={() => copyToClipboard(partnerLink)} className="w-full py-4 bg-gray-50 hover:bg-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">Copy Partner Link</button>
                  <button onClick={() => setActiveTab('earnings')} className="w-full py-4 bg-gray-50 hover:bg-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">View Earnings</button>
                  <button onClick={() => setActiveTab('referrals')} className="w-full py-4 bg-gray-50 hover:bg-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">View Referrals</button>
                </div>
              </section>
            </div>
          </div>
        )}

        {/* TAB 2: LINKS */}
        {activeTab === 'links' && (
          <div className="animate-fade-in space-y-10">
            <div>
              <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-1 italic">Links.</h2>
              <p className="text-gray-500 font-medium text-sm">Share sprints you believe in. Every purchase through your link is tracked.</p>
            </div>

            <div className="bg-white rounded-[2.5rem] p-10 border border-primary/20 shadow-xl relative overflow-hidden">
              <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-6">Main Partner Link</p>
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                <div className="flex-1 bg-gray-50 px-6 py-4 rounded-2xl border border-gray-100 w-full">
                  <code className="text-xs font-bold text-gray-600 truncate block">{partnerLink}</code>
                </div>
                <button onClick={() => copyToClipboard(partnerLink)} className="px-10 py-4 bg-primary text-white font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-lg active:scale-95 transition-all w-full sm:w-auto">
                  Copy Link
                </button>
              </div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-10 py-6 border-b border-gray-50 bg-gray-50/30">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Sprint-Specific Links</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white border-b border-gray-50">
                      <th className="px-10 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">Sprint Name</th>
                      <th className="px-10 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">Price</th>
                      <th className="px-10 py-5 text-[9px] font-black text-primary uppercase tracking-widest">Your Share</th>
                      <th className="px-10 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {sprintLinks.map((s) => (
                      <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-10 py-5 font-bold text-gray-900 text-sm">{s.name}</td>
                        <td className="px-10 py-5 text-gray-500 font-medium text-sm">₦{s.price.toLocaleString()}</td>
                        <td className="px-10 py-5 text-primary font-black text-sm italic">₦{s.share.toLocaleString()}</td>
                        <td className="px-10 py-5 text-right">
                          {/* Correct structure: domain.com/?ref=CODE&sprintId=ID#/ */}
                          <button onClick={() => copyToClipboard(`${window.location.origin}/?ref=${referralCode}&sprintId=${s.id}#/`)} className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline">Copy Link</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-8 bg-gray-900 rounded-[2.5rem] text-white flex items-center gap-8 relative overflow-hidden">
              <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-3xl">💡</div>
              <div className="relative z-10">
                <h5 className="font-black text-lg mb-1 italic">Usage Tip</h5>
                <p className="text-sm text-white/50 font-medium italic leading-relaxed max-w-lg">"Recommend sprints based on real need, not popularity. Alignment creates better completion rates and higher rewards."</p>
              </div>
              <div className="absolute bottom-0 right-0 w-48 h-48 bg-primary/20 rounded-full blur-3xl pointer-events-none"></div>
            </div>
          </div>
        )}

        {/* TAB 3: EARNINGS */}
        {activeTab === 'earnings' && (
          <div className="animate-fade-in space-y-10">
            <div>
              <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-1 italic">Earnings.</h2>
              <p className="text-gray-500 font-medium text-sm">Full transparency on every transaction in your portfolio.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm text-center">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Total Revenue</p>
                <h3 className="text-4xl font-black text-gray-900 tracking-tighter">₦{stats.revenue.toLocaleString()}</h3>
              </div>
              <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm text-center">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Platform Share</p>
                <h3 className="text-4xl font-black text-gray-300 tracking-tighter">₦{(stats.revenue - stats.earnings).toLocaleString()}</h3>
              </div>
              <div className="bg-white p-8 rounded-[2rem] border border-primary/20 shadow-xl text-center">
                <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-2">Your Share</p>
                <h3 className="text-4xl font-black text-primary tracking-tighter">₦{stats.earnings.toLocaleString()}</h3>
              </div>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-10 py-6 border-b border-gray-50 bg-gray-50/30">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Transaction Ledger</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white border-b border-gray-50">
                      <th className="px-10 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                      <th className="px-10 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">Sprint</th>
                      <th className="px-10 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">Gross</th>
                      <th className="px-10 py-5 text-[9px] font-black text-primary uppercase tracking-widest">Your Share</th>
                      <th className="px-10 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {transactions.map((t, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition-colors">
                        <td className="px-10 py-5 text-gray-400 text-xs font-bold uppercase">{new Date(t.date).toLocaleDateString([], {month:'short', day:'numeric'})}</td>
                        <td className="px-10 py-5 font-bold text-gray-900 text-sm">{t.sprint}</td>
                        <td className="px-10 py-5 text-gray-400 font-medium text-sm">₦{t.price.toLocaleString()}</td>
                        <td className="px-10 py-5 text-primary font-black text-sm italic">₦{t.share.toLocaleString()}</td>
                        <td className="px-10 py-5 text-right">
                          <span className={`px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${t.status === 'Paid' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>
                            {t.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-gray-50 p-10 rounded-[2.5rem] border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-8">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Payout Engine</p>
                <h4 className="text-xl font-black text-gray-900">₦{stats.pending.toLocaleString()} Available</h4>
                <p className="text-[10px] font-medium text-gray-400 italic">Minimum payout threshold: ₦10,000</p>
              </div>
              <button disabled={stats.pending < 10000} className="px-12 py-5 bg-dark text-white font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-xl active:scale-95 transition-all disabled:opacity-30">
                Request Payout
              </button>
            </div>
          </div>
        )}

        {/* TAB 4: REFERRALS */}
        {activeTab === 'referrals' && (
          <div className="animate-fade-in space-y-10">
            <div>
              <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-1 italic">Referrals.</h2>
              <p className="text-gray-500 font-medium text-sm">Track who joined through you and their progression status.</p>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-100">
                      <th className="px-10 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">Participant</th>
                      <th className="px-10 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">Sprint Purchased</th>
                      <th className="px-10 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">Current Stage</th>
                      <th className="px-10 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">Completion</th>
                      <th className="px-10 py-5 text-[9px] font-black text-primary uppercase tracking-widest text-right">Earnings Earned</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {referrals.map((r, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition-colors">
                        <td className="px-10 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-xs">👤</div>
                            <span className="font-bold text-gray-900 text-sm">{r.user}</span>
                          </div>
                        </td>
                        <td className="px-10 py-5 text-gray-600 font-medium text-xs">{r.sprint}</td>
                        <td className="px-10 py-5">
                          <span className="text-[10px] font-black uppercase text-primary bg-primary/5 px-2 py-0.5 rounded-md">{r.stage}</span>
                        </td>
                        <td className="px-10 py-5">
                          <span className={`text-[9px] font-bold ${r.status === 'Completed' ? 'text-green-600' : 'text-blue-500'}`}>{r.status}</span>
                        </td>
                        <td className="px-10 py-5 text-right font-black text-gray-900 text-sm">
                          {r.earned > 0 ? `₦${r.earned.toLocaleString()}` : <span className="text-gray-300">Awaiting Completion</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-blue-50 p-8 rounded-[2.5rem] border border-blue-100 flex items-center gap-6">
              <span className="text-2xl">⚖️</span>
              <p className="text-xs font-bold text-blue-800 italic">
                Only completed paid sprints are eligible for partner earnings. This ensures alignment between your recommendations and participant success.
              </p>
            </div>
          </div>
        )}

        {/* TAB 5: SETTINGS */}
        {activeTab === 'settings' && (
          <div className="animate-fade-in space-y-12">
            <div>
              <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-1 italic">Settings.</h2>
              <p className="text-gray-500 font-medium text-sm">Manage your partner account identity and payout preferences.</p>
            </div>

            <section className="bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-sm space-y-8">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-lg font-black text-gray-900 mb-1">Account Status</h4>
                  <p className="text-xs text-gray-500 font-medium italic">Your current registry standing.</p>
                </div>
                <span className="bg-green-100 text-green-700 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Active</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-gray-50">
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Payout Details</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[8px] font-black text-gray-300 uppercase mb-1 ml-1">Payment Method</label>
                      <input type="text" readOnly value="Bank Transfer (Nigeria)" className="w-full bg-gray-50 border border-gray-100 p-4 rounded-xl text-sm font-bold text-gray-700 outline-none" />
                    </div>
                    <div>
                      <label className="block text-[8px] font-black text-gray-300 uppercase mb-1 ml-1">Account Information</label>
                      <input type="text" readOnly value="Access Bank • **** 1234" className="w-full bg-gray-50 border border-gray-100 p-4 rounded-xl text-sm font-bold text-gray-700 outline-none" />
                    </div>
                  </div>
                  <button className="text-[9px] font-black text-primary uppercase tracking-widest hover:underline mt-2">Edit Payout Details &rarr;</button>
                </div>

                <div className="bg-primary/5 p-8 rounded-[2rem] border border-primary/10">
                  <h4 className="text-[10px] font-black text-primary uppercase tracking-widest mb-4">Progression Path</h4>
                  <p className="text-sm font-black text-gray-900 mb-2">Apply to become a Coach</p>
                  <p className="text-xs text-gray-500 font-medium leading-relaxed mb-6 italic">Move from recommending sprints to building them. Eligibility: 50+ successful referrals.</p>
                  <button className="w-full py-4 bg-white border border-primary/20 text-primary font-black uppercase tracking-widest text-[9px] rounded-xl shadow-sm opacity-50 cursor-not-allowed">
                    Requirements Not Met
                  </button>
                </div>
              </div>
            </section>

            <section className="text-center py-10">
              <h4 className="text-[10px] font-black text-gray-300 uppercase tracking-[0.4em] mb-6">Need Assistance?</h4>
              <button className="px-12 py-5 bg-white border border-gray-100 text-gray-600 font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-sm hover:bg-gray-50 transition-all active:scale-95">
                Contact Partner Support
              </button>
            </section>
          </div>
        )}
      </main>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { opacity: 1; transform: translateY(0); } }
        .animate-slide-up { animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

export default PartnerDashboard;