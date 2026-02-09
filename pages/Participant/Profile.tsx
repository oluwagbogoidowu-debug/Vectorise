import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Participant, ParticipantSprint, Sprint, Coach, UserRole } from '../../types';
import { sprintService } from '../../services/sprintService';
import { userService } from '../../services/userService';
import LocalLogo from '../../components/LocalLogo';

const Profile: React.FC = () => {
  const { user, logout, updateProfile } = useAuth();
  const navigate = useNavigate();
  
  // Data States
  const [enrollments, setEnrollments] = useState<{ enrollment: ParticipantSprint; sprint: Sprint; coach: Coach | null }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // UI States
  const [isEditingIntent, setIsEditingIntent] = useState(false);
  const [intentInput, setIntentInput] = useState('');
  const [reflectionSearch, setReflectionSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'progress' | 'reflections' | 'decisions'>('progress');

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      setIsLoading(true);
      try {
        const userEnrollments = await sprintService.getUserEnrollments(user.id);
        const enriched = await Promise.all(userEnrollments.map(async (en) => {
          const sprint = await sprintService.getSprintById(en.sprintId);
          if (!sprint) return null;
          const coachData = await userService.getUserDocument(sprint.coachId);
          return { enrollment: en, sprint, coach: (coachData as Coach) || null };
        }));
        
        setEnrollments(enriched.filter((x): x is { enrollment: ParticipantSprint; sprint: Sprint; coach: Coach | null } => x !== null));
        setIntentInput((user as Participant).intention || '');
      } catch (err) {
        console.error("Profile sync failed:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [user]);

  if (!user) return null;
  const p = user as Participant;

  // 1. Derived Data: Current Focus
  const activeEntry = useMemo(() => {
    return enrollments.find(e => e.enrollment.progress.some(p => !p.completed));
  }, [enrollments]);

  // 2. Derived Data: Master Sprint Archive
  const completedEntries = useMemo(() => {
    return enrollments.filter(e => e.enrollment.progress.every(p => p.completed));
  }, [enrollments]);

  // 3. Derived Data: Reflection Archive
  const allReflections = useMemo(() => {
    return enrollments.flatMap(e => 
      e.enrollment.progress
        .filter(p => p.reflection && p.reflection.trim() !== '')
        .map(p => ({
          sprintTitle: e.sprint.title,
          day: p.day,
          text: p.reflection || '',
          date: p.completedAt || e.enrollment.startDate
        }))
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [enrollments]);

  const filteredReflections = useMemo(() => {
    if (!reflectionSearch.trim()) return allReflections;
    return allReflections.filter(r => 
      r.text.toLowerCase().includes(reflectionSearch.toLowerCase()) || 
      r.sprintTitle.toLowerCase().includes(reflectionSearch.toLowerCase())
    );
  }, [allReflections, reflectionSearch]);

  // 4. Derived Data: Micro Picker Archive
  const microDecisions = useMemo(() => {
    return enrollments.flatMap(e => 
      e.enrollment.progress
        .filter(p => p.proofSelection)
        .map(p => ({
          sprintTitle: e.sprint.title,
          day: p.day,
          choice: p.proofSelection,
          date: p.completedAt
        }))
    ).sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
  }, [enrollments]);

  // 5. Derived Data: Coach Access (Contextual)
  const uniqueCoaches = useMemo(() => {
    const map = new Map<string, { coach: Coach; sprints: string[] }>();
    enrollments.forEach(e => {
      if (e.coach) {
        const existing = map.get(e.coach.id) || { coach: e.coach, sprints: [] };
        if (!existing.sprints.includes(e.sprint.title)) {
          existing.sprints.push(e.sprint.title);
        }
        map.set(e.coach.id, existing);
      }
    });
    return Array.from(map.values());
  }, [enrollments]);

  const handleSaveIntent = async () => {
    try {
      await updateProfile({ intention: intentInput });
      setIsEditingIntent(false);
    } catch (e) {
      alert("Failed to update intent.");
    }
  };

  const SectionLabel = ({ text }: { text: string }) => (
    <h2 className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
      {text}
      <div className="flex-1 h-px bg-gray-100"></div>
    </h2>
  );

  return (
    <div className="bg-[#FDFDFD] min-h-screen w-full font-sans pb-32 animate-fade-in overflow-x-hidden">
      
      {/* IDENTITY SECTION */}
      <header className="relative bg-white border-b border-gray-50 pt-16 pb-12 px-6">
        <div className="max-w-screen-md mx-auto flex flex-col items-center text-center">
          <div className="relative mb-6">
            <div className="w-24 h-24 rounded-[2.5rem] overflow-hidden border-4 border-white shadow-xl bg-gray-50">
              <img src={p.profileImageUrl} className="w-full h-full object-cover" alt="" />
            </div>
            <div className="absolute -bottom-2 -right-2 bg-primary text-white w-8 h-8 rounded-xl flex items-center justify-center shadow-lg text-xs font-black italic">
              V
            </div>
          </div>

          <h1 className="text-3xl font-black text-gray-900 tracking-tight leading-none mb-4 italic">{p.name}.</h1>
          
          <div className="w-full max-w-sm">
            {isEditingIntent ? (
              <div className="space-y-3">
                <input 
                  autoFocus
                  value={intentInput}
                  onChange={(e) => setIntentInput(e.target.value)}
                  onBlur={handleSaveIntent}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveIntent()}
                  className="w-full text-center text-sm font-bold text-gray-700 bg-gray-50 p-3 rounded-xl border border-primary/20 outline-none"
                  placeholder="What are you here to build?"
                />
                <p className="text-[8px] font-black text-gray-300 uppercase tracking-widest">Press Enter to lock intent</p>
              </div>
            ) : (
              <button 
                onClick={() => setIsEditingIntent(true)}
                className="group flex flex-col items-center"
              >
                <p className="text-lg text-gray-500 font-medium italic leading-relaxed hover:text-primary transition-colors">
                  "{p.intention || 'Defining my next right move.'}"
                </p>
                <span className="text-[8px] font-black text-gray-200 uppercase tracking-widest mt-2 opacity-0 group-hover:opacity-100 transition-opacity">Edit Intent</span>
              </button>
            )}
          </div>
        </div>

        <button 
          onClick={logout}
          className="absolute top-6 right-6 p-2.5 text-gray-300 hover:text-red-400 transition-all active:scale-90"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
        </button>
      </header>

      <main className="max-w-screen-md mx-auto px-6 py-12 space-y-16">
        
        {/* CURRENT FOCUS */}
        <section>
          <SectionLabel text="Current Focus" />
          {activeEntry ? (
            <Link to={`/participant/sprint/${activeEntry.enrollment.id}`} className="block group">
              <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm hover:shadow-xl hover:border-primary/20 transition-all duration-500 relative overflow-hidden">
                <div className="flex justify-between items-start mb-6 relative z-10">
                  <div>
                    <span className="px-3 py-1 bg-primary/10 text-primary rounded-lg text-[9px] font-black uppercase tracking-widest mb-2 inline-block">
                      {p.currentStage || 'Active Journey'}
                    </span>
                    <h3 className="text-2xl font-black text-gray-900 tracking-tight italic group-hover:text-primary transition-colors">
                      {activeEntry.sprint.title}
                    </h3>
                  </div>
                  <div className="bg-gray-50 px-4 py-2 rounded-2xl border border-gray-100">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest text-center">Status</p>
                    <p className="text-sm font-black text-gray-900">Day {activeEntry.enrollment.progress.filter(x => x.completed).length + 1} of {activeEntry.sprint.duration}</p>
                  </div>
                </div>
                <div className="h-1.5 w-full bg-gray-50 rounded-full overflow-hidden relative z-10">
                  <div 
                    className="h-full bg-primary rounded-full transition-all duration-1000" 
                    style={{ width: `${(activeEntry.enrollment.progress.filter(x => x.completed).length / activeEntry.sprint.duration) * 100}%` }}
                  />
                </div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none group-hover:bg-primary/10 transition-colors"></div>
              </div>
            </Link>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-100">
              <p className="text-gray-400 font-bold text-xs italic">No active cycles in the registry.</p>
              <Link to="/discover" className="mt-4 inline-block text-[10px] font-black text-primary uppercase tracking-[0.2em] border-b-2 border-primary/20 pb-1">Discover Paths</Link>
            </div>
          )}
        </section>

        {/* REVENUE / RISE / IMPACT STATS */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#111827] rounded-[2.5rem] p-8 text-white relative overflow-hidden group">
            <div className="relative z-10">
              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40 mb-8 group-hover:text-primary transition-colors">Rise Registry</p>
              <div className="flex items-end gap-3 mb-2">
                <h3 className="text-5xl font-black italic tracking-tighter">{p.walletBalance || 0}</h3>
                <span className="text-xl mb-1.5 opacity-40">🪙</span>
              </div>
              <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Growth Credits Earned</p>
            </div>
            <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-primary/20 rounded-full blur-3xl pointer-events-none group-hover:scale-150 transition-transform duration-1000"></div>
          </div>

          <Link to="/impact" className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-500 group">
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-400 mb-8 group-hover:text-primary transition-colors">Impact Score</p>
            <h3 className="text-5xl font-black text-gray-900 tracking-tighter mb-2">{p.impactStats?.peopleHelped || 0}</h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">People Catalyzed</p>
          </Link>
        </section>

        {/* TABS FOR ARCHIVES */}
        <section className="space-y-10">
          <div className="flex gap-8 border-b border-gray-50">
            {[
              { id: 'progress', label: 'Sprint Archive' },
              { id: 'reflections', label: 'Reflections' },
              { id: 'decisions', label: 'Micro Decisions' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`pb-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative ${
                  activeTab === tab.id ? 'text-primary' : 'text-gray-300 hover:text-gray-500'
                }`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 w-full h-1 bg-primary rounded-full animate-fade-in" />
                )}
              </button>
            ))}
          </div>

          {/* MASTER SPRINT ARCHIVE */}
          {activeTab === 'progress' && (
            <div className="space-y-4 animate-fade-in">
              {completedEntries.length > 0 ? (
                completedEntries.map(({ enrollment, sprint, coach }) => (
                  <div key={enrollment.id} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex items-center gap-6">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden grayscale opacity-60">
                      <img src={sprint.coverImageUrl} className="w-full h-full object-cover" alt="" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <p className="text-[8px] font-black text-gray-300 uppercase tracking-widest">
                          {new Date(enrollment.startDate).toLocaleDateString([], { month: 'short', year: 'numeric' })}
                        </p>
                        <span className="text-[8px] font-black bg-gray-50 text-gray-400 px-2 py-0.5 rounded uppercase tracking-widest">Mastered</span>
                      </div>
                      <h4 className="font-black text-gray-900 text-sm tracking-tight mb-1">{sprint.title}</h4>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-primary italic">Clarity gained</span>
                        <span className="w-1 h-1 bg-gray-200 rounded-full"></span>
                        <span className="text-[10px] font-bold text-gray-400">Coach {coach?.name.split(' ')[0]}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-20 text-center text-gray-300 italic text-sm">No completed cycles to display.</div>
              )}
            </div>
          )}

          {/* REFLECTION ARCHIVE (PRIVATE) */}
          {activeTab === 'reflections' && (
            <div className="space-y-6 animate-fade-in">
              <div className="relative">
                <input 
                  type="text"
                  value={reflectionSearch}
                  onChange={(e) => setReflectionSearch(e.target.value)}
                  placeholder="Search your learning patterns..."
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none transition-all"
                />
                <svg className="absolute left-3.5 top-3 h-4 w-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>

              <div className="space-y-8">
                {filteredReflections.length > 0 ? (
                  filteredReflections.map((ref, idx) => (
                    <div key={idx} className="relative pl-8 border-l-2 border-primary/10">
                      <div className="absolute -left-[9px] top-0 w-4 h-4 bg-white border-2 border-primary rounded-full" />
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-[9px] font-black text-primary uppercase tracking-widest">
                          {ref.sprintTitle} • Day {ref.day}
                        </p>
                        <p className="text-[8px] font-bold text-gray-300 uppercase">
                          {new Date(ref.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                      <p className="text-sm text-gray-700 font-medium leading-relaxed italic bg-gray-50/50 p-4 rounded-2xl border border-gray-50 shadow-inner">
                        "{ref.text}"
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="py-20 text-center text-gray-300 italic text-sm">No patterns recognized yet.</div>
                )}
              </div>
            </div>
          )}

          {/* MICRO PICKER ARCHIVE */}
          {activeTab === 'decisions' && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-6 bg-yellow-50 border border-yellow-100 rounded-3xl mb-8">
                <p className="text-[9px] font-black text-yellow-800 uppercase tracking-widest mb-2">Mirror Context</p>
                <p className="text-xs text-yellow-700 font-medium leading-relaxed italic">
                  "These are the micro-decisions you made under pressure. They reflect your true filters for growth."
                </p>
              </div>
              
              <div className="grid grid-cols-1 gap-3">
                {microDecisions.length > 0 ? (
                  microDecisions.map((dec, idx) => (
                    <div key={idx} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-[8px] font-black text-gray-300 uppercase tracking-widest mb-1">{dec.sprintTitle} • Day {dec.day}</p>
                        <p className="text-sm font-black text-gray-800 leading-tight">"{dec.choice}"</p>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-xs opacity-40">⚖️</div>
                    </div>
                  ))
                ) : (
                  <div className="py-20 text-center text-gray-300 italic text-sm">No critical choices recorded in registry.</div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* COACH ACCESS (CONTEXTUAL) */}
        <section>
          <SectionLabel text="Working Registry" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {uniqueCoaches.length > 0 ? (
              uniqueCoaches.map(({ coach, sprints }) => (
                <div key={coach.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col items-center text-center">
                  <img src={coach.profileImageUrl} className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-md mb-4" alt="" />
                  <h4 className="font-black text-gray-900 text-sm tracking-tight mb-1">{coach.name}</h4>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-4">{coach.niche}</p>
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {sprints.map((s, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-primary/5 text-primary text-[8px] font-black rounded-md uppercase tracking-tighter">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-12 bg-gray-50 rounded-[2rem] text-center italic text-gray-300 text-sm">
                No direct coach relationships established yet.
              </div>
            )}
          </div>
        </section>

        {/* LOGOUT BUTTON - MOBILE BOTTOM */}
        <div className="pt-12 text-center">
            <p className="text-[8px] font-black text-gray-200 uppercase tracking-[0.4em] mb-12">Vectorise • Profile Registry 4.0</p>
        </div>

      </main>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

export default Profile;