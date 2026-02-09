import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../services/firebase';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import LocalLogo from '../../components/LocalLogo';
import Button from '../../components/Button';
import { Participant, Sprint } from '../../types';
import { sprintService } from '../../services/sprintService';

type PartnerTab = 'overview' | 'links' | 'earnings' | 'referrals' | 'settings';

const PartnerDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<PartnerTab>('overview');
  
  // Real-time states
  const [realTimeReferrals, setRealTimeReferrals] = useState<any[]>([]);
  const [realTimeSprints, setRealTimeSprints] = useState<Sprint[]>([]);
  const [linkStats, setLinkStats] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);

  const p = user as Participant;
  const referralCode = p?.referralCode || 'PARTNER';
  const partnerLink = `${window.location.origin}/?ref=${referralCode}#/`;

  // 1. Real-time Subscription to referred users, sprints, and telemetry
  useEffect(() => {
    if (!user) return;

    // A. Listen for users where referrerId matches our code
    const usersQuery = query(collection(db, 'users'), where('referrerId', '==', referralCode));
    const unsubscribeUsers = onSnapshot(usersQuery, async (snapshot) => {
      const referralsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const userIds = referralsData.map(r => r.id);
      if (userIds.length > 0) {
        const enrollQuery = query(collection(db, 'enrollments'), where('participantId', 'in', userIds.slice(0, 30)));
        const enrollSnap = await getDocs(enrollQuery);
        const enrollments = enrollSnap.docs.map(d => d.data());

        const merged = referralsData.map(refUser => {
          const userEnrollments = enrollments.filter(e => e.participantId === refUser.id);
          return {
            ...refUser,
            enrollments: userEnrollments,
            hasPurchased: userEnrollments.some((e: any) => e.isCommissionTrigger)
          };
        });
        setRealTimeReferrals(merged);
      } else {
        setRealTimeReferrals([]);
      }
      setIsLoading(false);
    });

    // B. Fetch available sprints
    const sprintsQuery = query(collection(db, 'sprints'), where('published', '==', true));
    const unsubscribeSprints = onSnapshot(sprintsQuery, (snapshot) => {
      setRealTimeSprints(snapshot.docs.map(doc => doc.data() as Sprint));
    });

    // C. Subscribe to Link Click Telemetry
    const unsubscribeLinkStats = sprintService.subscribeToLinkStats(referralCode, (stats) => {
        setLinkStats(stats);
    });

    return () => {
      unsubscribeUsers();
      unsubscribeSprints();
      unsubscribeLinkStats();
    };
  }, [user, referralCode]);

  // Derived real-time stats
  const stats = useMemo(() => {
    const totalPurchases = realTimeReferrals.filter(r => r.hasPurchased).length;
    let totalRevenue = 0;
    
    /**
     * ENFORCED LOGIC: One user -> one partner -> one paid sprint.
     * We only calculate revenue from the enrollment explicitly marked as 'isCommissionTrigger'.
     */
    realTimeReferrals.forEach(r => {
      const commissionEnrollment = (r.enrollments || []).find((e: any) => e.isCommissionTrigger);
      if (commissionEnrollment) {
        const sprint = realTimeSprints.find(s => s.id === commissionEnrollment.sprintId);
        if (sprint) totalRevenue += (sprint.price || 0);
      }
    });

    const earnings = totalRevenue * 0.3; 
    const totalClicks = Object.values(linkStats).reduce((acc: number, curr: number) => acc + curr, 0);

    const completions = realTimeReferrals.reduce((acc: number, r: any) => {
      const completedCount = (r.enrollments || []).filter((e: any) => e.progress.every((p: any) => p.completed)).length;
      return acc + completedCount;
    }, 0);

    return {
      revenue: totalRevenue,
      earnings: earnings,
      paidOut: 0, 
      pending: earnings,
      activeLinks: realTimeSprints.length,
      purchases: totalPurchases,
      completions: completions,
      totalClicks
    };
  }, [realTimeReferrals, realTimeSprints, linkStats]);

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
        {activeTab === 'overview' && (
          <div className="animate-fade-in space-y-10">
            <div className="flex justify-between items-end">
              <div>
                <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-1 italic">Welcome back.</h2>
                <p className="text-gray-500 font-medium text-sm">Here’s your partner activity in real-time.</p>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-600 rounded-full border border-green-100 animate-pulse">
                <div className="w-1.5 h-1.5 bg-green-600 rounded-full"></div>
                <span className="text-[8px] font-black uppercase tracking-widest">Live Sync</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden group">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Commissionable Revenue</p>
                <h3 className="text-3xl font-black text-gray-900 tracking-tight">₦{stats.revenue.toLocaleString()}</h3>
                <p className="text-[8px] font-bold text-gray-300 mt-1 uppercase">1st Sale/User Only</p>
              </div>
              <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden group">
                <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-2">Real-Time Earnings</p>
                <h3 className="text-3xl font-black text-gray-900 tracking-tight">₦{stats.earnings.toLocaleString()}</h3>
                <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-primary/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
              </div>
              <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Paid Out</p>
                <h3 className="text-3xl font-black text-gray-900 tracking-tight">₦{stats.paidOut.toLocaleString()}</h3>
              </div>
              <div className="bg-dark p-8 rounded-[2rem] shadow-xl text-white">
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Available for Withdrawal</p>
                <h3 className="text-3xl font-black tracking-tight italic text-primary">₦{stats.pending.toLocaleString()}</h3>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <section className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm">
                <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-[0.3em] mb-8 border-b border-gray-50 pb-4">Performance Metrics</h4>
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-bold text-gray-500">Active Links</p>
                    <p className="text-lg font-black text-gray-900">{stats.activeLinks}</p>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-bold text-gray-500">Total Click Count</p>
                    <p className="text-lg font-black text-gray-900">{stats.totalClicks}</p>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-bold text-gray-500">Unique Users Converted</p>
                    <p className="text-lg font-black text-gray-900">{stats.purchases}</p>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-bold text-gray-500">New User Conversion</p>
                    <p className="text-lg font-black text-primary">
                        {stats.totalClicks > 0 ? ((stats.purchases / stats.totalClicks) * 100).toFixed(1) : 0}%
                    </p>
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

        {activeTab === 'links' && (
          <div className="animate-fade-in space-y-10">
            <div>
              <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-1 italic">Links.</h2>
              <p className="text-gray-500 font-medium text-sm">Share sprints you believe in. Every interaction through your link is tracked in real-time.</p>
            </div>

            <div className="bg-white rounded-[2.5rem] p-10 border border-primary/20 shadow-xl relative overflow-hidden">
              <div className="flex justify-between items-start mb-6">
                <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Main Partner Link</p>
                <div className="bg-primary/10 px-3 py-1 rounded-lg">
                    <span className="text-[10px] font-black text-primary uppercase tracking-widest">{linkStats['main'] || 0} CLICKS</span>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                <div className="flex-1 bg-gray-50 px-6 py-4 rounded-2xl border border-gray-100 w-full">
                  <code className="text-xs font-bold text-gray-600 truncate block">{partnerLink}</code>
                </div>
                <button onClick={() => copyToClipboard(partnerLink)} className="px-8 py-4 bg-primary text-white font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-lg active:scale-95 transition-all w-full sm:w-auto flex items-center justify-center gap-3">
                  <span className="bg-white/20 px-2 py-0.5 rounded-md">{linkStats['main'] || 0}</span>
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
                      <th className="px-10 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Clicks</th>
                      <th className="px-10 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">Price</th>
                      <th className="px-10 py-5 text-[9px] font-black text-primary uppercase tracking-widest">Your Share</th>
                      <th className="px-10 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {realTimeSprints.map((s) => (
                      <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-10 py-5 font-bold text-gray-900 text-sm">{s.title}</td>
                        <td className="px-10 py-5 text-center">
                            <span className={`px-2 py-1 rounded-md text-[10px] font-black ${linkStats[s.id] ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-400'}`}>
                                {linkStats[s.id] || 0}
                            </span>
                        </td>
                        <td className="px-10 py-5 text-gray-500 font-medium text-sm">₦{s.price?.toLocaleString()}</td>
                        <td className="px-10 py-5 text-primary font-black text-sm italic">₦{((s.price || 0) * 0.3).toLocaleString()}</td>
                        <td className="px-10 py-5 text-right">
                          <button onClick={() => copyToClipboard(`${window.location.origin}/?ref=${referralCode}&sprintId=${s.id}#/`)} className="px-4 py-2 bg-white border border-gray-100 rounded-xl text-[9px] font-black text-gray-400 hover:text-primary hover:border-primary/20 transition-all flex items-center gap-2 ml-auto">
                            <span className="text-primary font-bold">{linkStats[s.id] || 0}</span>
                            Copy Link
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'referrals' && (
          <div className="animate-fade-in space-y-10">
            <div>
              <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-1 italic">Referrals.</h2>
              <p className="text-gray-500 font-medium text-sm">Users locked to your registry via the 'First Paid Sprint' protocol.</p>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-100">
                      <th className="px-10 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">Participant</th>
                      <th className="px-10 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                      <th className="px-10 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Comm. Status</th>
                      <th className="px-10 py-5 text-[9px] font-black text-primary uppercase tracking-widest text-right">Earning Locked</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {realTimeReferrals.map((r) => {
                      let potential = 0;
                      const commissionEnrollment = (r.enrollments || []).find((e: any) => e.isCommissionTrigger);
                      if (commissionEnrollment) {
                        const sprint = realTimeSprints.find(s => s.id === commissionEnrollment.sprintId);
                        if (sprint) potential += (sprint.price || 0) * 0.3;
                      }

                      return (
                        <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-10 py-5">
                            <div className="flex items-center gap-3">
                              <img src={r.profileImageUrl} alt="" className="w-8 h-8 rounded-lg object-cover" />
                              <span className="font-bold text-gray-900 text-sm">{r.name}</span>
                            </div>
                          </td>
                          <td className="px-10 py-5">
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${r.hasPurchased ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-400'}`}>
                                {r.hasPurchased ? 'Mastered First Cycle' : 'In Onboarding'}
                            </span>
                          </td>
                          <td className="px-10 py-5 text-center font-bold text-gray-500 text-xs uppercase tracking-tighter">
                            {r.partnerCommissionClosed ? 'Closed (Paid)' : 'Awaiting First Buy'}
                          </td>
                          <td className="px-10 py-5 text-right font-black text-gray-900 text-sm italic">
                            ₦{potential.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                    {realTimeReferrals.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-20 text-center">
                          <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">No catalysts tracked yet.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

export default PartnerDashboard;