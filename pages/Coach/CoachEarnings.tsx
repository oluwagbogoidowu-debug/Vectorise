
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { MOCK_PAYOUTS, LIFECYCLE_SLOTS } from '../../services/mockData';
import { sprintService } from '../../services/sprintService';
import { userService } from '../../services/userService';
import { Sprint, ParticipantSprint, Participant, LifecycleStage } from '../../types';
import { useNavigate } from 'react-router-dom';

interface EarningEntry {
  enrollmentId: string;
  studentName: string;
  studentAvatar: string;
  sprintTitle: string;
  amount: number;
  platformCutPercent: number | null; // Null if untagged
  netEarning: number;
  date: string;
  appliedStage: string | null;
}

const STAGE_CUTS: Record<string, number> = {
    'Foundation': 40,
    'Direction': 35,
    'Execution': 30,
    'Proof': 25,
    'Positioning': 20,
    'Stability': 20,
    'Expansion': 15
};

const CoachEarnings: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [earningHistory, setEarningHistory] = useState<EarningEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchEarningsData = async () => {
      if (!user) return;
      setIsLoading(true);
      try {
        // 1. Get Orchestration Mapping for Stage Lookups
        const orchestration = await sprintService.getOrchestration();
        const sprintToStageMap: Record<string, string> = {};
        
        Object.entries(orchestration).forEach(([slotId, mapping]) => {
            const slot = LIFECYCLE_SLOTS.find(s => s.id === slotId);
            if (slot && mapping.sprintId) {
                sprintToStageMap[mapping.sprintId] = slot.stage;
            }
        });

        // 2. Get coach's sprints
        const coachSprints = await sprintService.getCoachSprints(user.id);
        const cashSprints = coachSprints.filter(s => s.pricingType === 'cash' && s.price > 0);
        
        if (cashSprints.length === 0) {
          setEarningHistory([]);
          setIsLoading(false);
          return;
        }

        const sprintIds = cashSprints.map(s => s.id);

        // 3. Get all enrollments for these sprints
        const enrollments = await sprintService.getEnrollmentsForSprints(sprintIds);
        
        if (enrollments.length === 0) {
          setEarningHistory([]);
          setIsLoading(false);
          return;
        }

        // 4. Get student data
        const studentIds = Array.from(new Set(enrollments.map(e => e.participantId)));
        const students = await userService.getUsersByIds(studentIds);

        // 5. Transform into Earning Entries
        const entries: EarningEntry[] = enrollments.map(enrol => {
          const sprint = cashSprints.find(s => s.id === enrol.sprintId);
          const student = students.find(s => s.id === enrol.participantId);
          
          // Logic: Strictly use Orchestrator tagging
          const detectedStage = sprintToStageMap[enrol.sprintId] || null;
          const cutPercent = detectedStage ? (STAGE_CUTS[detectedStage] || 30) : null;
          
          const grossAmount = sprint?.price || 0;
          // If untagged, we don't calculate net yet
          const netEarning = cutPercent !== null ? grossAmount * (1 - cutPercent / 100) : 0;

          return {
            enrollmentId: enrol.id,
            studentName: student?.name || 'Anonymous Sprinter',
            studentAvatar: student?.profileImageUrl || `https://ui-avatars.com/api/?name=User&background=0E7850&color=fff`,
            sprintTitle: sprint?.title || 'Growth Sprint',
            amount: grossAmount,
            platformCutPercent: cutPercent,
            netEarning: netEarning,
            date: enrol.startDate,
            appliedStage: detectedStage
          };
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        setEarningHistory(entries);
      } catch (error) {
        console.error("Failed to load earnings:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEarningsData();
  }, [user]);

  const stats = useMemo(() => {
    return earningHistory.reduce((acc, curr) => ({
      gross: acc.gross + curr.amount,
      net: acc.net + curr.netEarning
    }), { gross: 0, net: 0 });
  }, [earningHistory]);

  const myPayouts = MOCK_PAYOUTS.filter(p => p.coachId === user?.id);
  const pendingPayouts = myPayouts.filter(p => p.status === 'pending').reduce((acc, curr) => acc + curr.amount, 0);

  if (!user) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 pb-32 animate-fade-in font-sans">
      <header className="mb-10">
        <button 
            onClick={() => navigate('/coach/dashboard')} 
            className="group flex items-center text-gray-400 hover:text-primary transition-colors mb-6 text-xs font-black uppercase tracking-widest"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
        </button>
        <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-2 italic">Earnings & Payouts</h1>
        <p className="text-gray-500 font-medium text-sm md:text-base">Tracking your commercial impact across orchestrated lifecycle stages.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 relative overflow-hidden group">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Net Take-Home</p>
              <h2 className="text-4xl font-black text-gray-900 tracking-tighter">₦{stats.net.toLocaleString()}</h2>
              <p className="text-[9px] font-bold text-gray-400 mt-1 uppercase">Gross: ₦{stats.gross.toLocaleString()}</p>
              <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-primary/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
          </div>
           <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 relative overflow-hidden group">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">In Transit</p>
              <h2 className="text-4xl font-black text-orange-600 tracking-tighter">₦{pendingPayouts.toLocaleString()}</h2>
              <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-orange-500/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
          </div>
           <div className="bg-gray-900 p-8 rounded-[2rem] shadow-xl border border-gray-800 text-white relative overflow-hidden group">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Settlement Cycle</p>
              <h2 className="text-3xl font-black italic tracking-tight">Next Payout</h2>
              <p className="text-primary font-black uppercase text-xs mt-1">October 15, 2026</p>
          </div>
      </div>

      {/* EARNING HISTORY */}
      <section className="mb-12">
          <div className="flex items-center gap-3 mb-6 px-2">
              <div className="w-1.5 h-6 bg-primary rounded-full"></div>
              <h2 className="text-xl font-black text-gray-900 uppercase tracking-widest">Earning History</h2>
          </div>
          
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
              {isLoading ? (
                  <div className="p-20 text-center flex flex-col items-center">
                      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                      <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Compiling Ledger...</p>
                  </div>
              ) : earningHistory.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="px-8 py-5 text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Participant</th>
                                <th className="px-8 py-5 text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Sprint (Stage)</th>
                                <th className="px-8 py-5 text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Date</th>
                                <th className="px-8 py-5 text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] text-right">Gross Value</th>
                                <th className="px-8 py-5 text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] text-right">Cut %</th>
                                <th className="px-8 py-5 text-[9px] font-black text-primary uppercase tracking-[0.2em] text-right">Actual Earning</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {earningHistory.map((entry) => (
                                <tr key={entry.enrollmentId} className="hover:bg-gray-50/50 transition-colors group">
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-4">
                                            <img src={entry.studentAvatar} className="w-9 h-9 rounded-xl object-cover border-2 border-white shadow-sm" alt="" />
                                            <span className="text-sm font-bold text-gray-900">{entry.studentName}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <p className="text-xs font-black text-gray-900 uppercase tracking-tight">{entry.sprintTitle}</p>
                                        <p className={`text-[9px] font-bold uppercase tracking-widest ${entry.appliedStage ? 'text-primary' : 'text-gray-300'}`}>
                                            {entry.appliedStage || 'UNTAGGED'}
                                        </p>
                                    </td>
                                    <td className="px-8 py-5 text-[11px] text-gray-400 font-bold uppercase tracking-tighter">
                                        {new Date(entry.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <span className="text-sm font-medium text-gray-400">₦{entry.amount.toLocaleString()}</span>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <span className={`text-[10px] font-black px-2 py-1 rounded-md ${entry.platformCutPercent === null ? 'bg-orange-50 text-orange-400' : 'bg-gray-100 text-gray-500'}`}>
                                            {entry.platformCutPercent === null ? 'PENDING' : `${entry.platformCutPercent}%`}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        {entry.platformCutPercent === null ? (
                                            <span className="text-xs font-bold text-gray-300 italic uppercase">Awaiting Registry Tag</span>
                                        ) : (
                                            <span className="text-sm font-black text-primary italic">₦{entry.netEarning.toLocaleString()}</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                  </div>
              ) : (
                  <div className="p-20 text-center">
                      <p className="text-gray-400 font-bold uppercase tracking-widest text-xs italic">No commercial enrollments recorded yet.</p>
                  </div>
              )}
          </div>
      </section>

      {/* TRANSACTION HISTORY (Payouts) */}
      <section>
          <div className="flex items-center gap-3 mb-6 px-2">
              <div className="w-1.5 h-6 bg-gray-300 rounded-full"></div>
              <h2 className="text-xl font-black text-gray-400 uppercase tracking-widest">Payout History</h2>
          </div>
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
              {myPayouts.length > 0 ? (
                  <div className="divide-y divide-gray-50">
                      {myPayouts.map(payout => (
                          <div key={payout.id} className="px-8 py-6 flex justify-between items-center hover:bg-gray-50 transition-colors">
                              <div className="flex items-center gap-5">
                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${payout.status === 'completed' ? 'bg-green-50 text-green-600' : 'bg-yellow-50 text-yellow-600'}`}>
                                      {payout.status === 'completed' ? '✓' : '⏳'}
                                  </div>
                                  <div>
                                      <p className="font-black text-gray-900 text-sm uppercase tracking-tight">Settlement to Bank</p>
                                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{new Date(payout.date).toLocaleDateString([], { month: 'long', day: 'numeric' })}</p>
                                  </div>
                              </div>
                              <div className="text-right">
                                  <p className="font-black text-lg text-gray-900 leading-none mb-1">₦{payout.amount.toLocaleString()}</p>
                                  <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${payout.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                      {payout.status}
                                  </span>
                              </div>
                          </div>
                      ))}
                  </div>
              ) : (
                  <div className="p-20 text-center">
                      <p className="text-gray-400 font-bold uppercase tracking-widest text-xs italic">No payouts processed to date.</p>
                  </div>
              )}
          </div>
      </section>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
};

export default CoachEarnings;
