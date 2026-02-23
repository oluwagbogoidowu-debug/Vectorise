
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Participant, ParticipantSprint, Sprint, Coach } from '../../types';
import { sprintService } from '../../services/sprintService';
import { userService } from '../../services/userService';
import LocalLogo from '../../components/LocalLogo';
import ArchetypeAvatar from '../../components/ArchetypeAvatar';
import { ARCHETYPES } from '../../constants';

const Profile: React.FC = () => {
  const { user, logout, updateProfile } = useAuth();
  const navigate = useNavigate();
  
  const [enrollments, setEnrollments] = useState<{ enrollment: ParticipantSprint; sprint: Sprint; coach: Coach | null }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingIntent, setIsEditingIntent] = useState(false);
  const [isSelectingAvatar, setIsSelectingAvatar] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [intentInput, setIntentInput] = useState('');
  const [reflectionSearch, setReflectionSearch] = useState('');
  const [editName, setEditName] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      setIsLoading(true);
      try {
        const userEnrollments = await sprintService.getUserEnrollments(user.id);
        const enriched = await Promise.all(userEnrollments.map(async (en) => {
          const sprint = await sprintService.getSprintById(en.sprint_id);
          if (!sprint) return null;
          const coachData = await userService.getUserDocument(sprint.coachId);
          return { enrollment: en, sprint, coach: (coachData as Coach) || null };
        }));
        
        setEnrollments(enriched.filter((x) => x !== null) as any);
        setIntentInput((user as Participant).intention || '');
        setEditName(user.name);
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

  const currentArchetype = useMemo(() => {
    const p = user as Participant;
    return ARCHETYPES.find(a => a.id === p.archetype);
  }, [user]);

  const activeEntry = useMemo(() => enrollments.find(e => e.enrollment.progress.some(p => !p.completed)), [enrollments]);
  const completedEntries = useMemo(() => enrollments.filter(e => e.enrollment.progress.every(p => p.completed)), [enrollments]);

  const allReflections = useMemo(() => {
    return enrollments.flatMap(e => 
      e.enrollment.progress
        .filter(p => p.reflection && p.reflection.trim() !== '')
        .map(p => ({
          sprintTitle: e.sprint.title,
          day: p.day,
          text: p.reflection || '',
          date: p.completedAt || e.enrollment.started_at
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

  const handleSelectArchetype = async (archetypeId: string) => {
    try {
      await updateProfile({ archetype: archetypeId });
      setIsSelectingAvatar(false);
    } catch (e) {
      alert("Failed to update archetype.");
    }
  };

  const handleSaveProfile = async () => {
    try {
      await updateProfile({ name: editName });
      setIsEditingProfile(false);
    } catch (e) {
      alert("Failed to update profile.");
    }
  };

  const SectionLabel = ({ text }: { text: string }) => (
    <h2 className="text-[8px] font-black text-gray-400 uppercase tracking-[0.3em] mb-2 px-1">
      {text}
    </h2>
  );

  return (
    <div className="bg-[#FDFDFD] h-screen w-full font-sans overflow-hidden flex flex-col animate-fade-in">
      
      <div className="bg-white px-6 pt-8 pb-6 border-b border-gray-50 flex-shrink-0">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-5">
            <button 
              onClick={() => setIsSelectingAvatar(true)}
              className="relative group"
            >
              <ArchetypeAvatar 
                archetypeId={p.archetype} 
                profileImageUrl={p.profileImageUrl} 
                size="xl" 
              />
              <div className="absolute -bottom-1 -right-1 bg-gray-900 text-white w-6 h-6 rounded-lg flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
              </div>
            </button>
            <div>
              {isEditingProfile ? (
                <div className="space-y-2">
                  <input 
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="text-lg font-black text-gray-900 bg-gray-50 rounded-xl px-3 py-1 outline-none w-full border border-gray-100"
                  />
                  <div className="flex gap-2">
                    <button onClick={handleSaveProfile} className="text-[8px] font-black text-primary uppercase tracking-widest">Save</button>
                    <button onClick={() => setIsEditingProfile(false)} className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <h1 className="text-2xl font-black text-gray-900 tracking-tight italic leading-none mb-1">{p.name}</h1>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{p.email}</p>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest">Joined</span>
                      <span className="text-[9px] font-bold text-gray-600 italic">{new Date(p.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                    </div>
                    <div className="w-1 h-1 rounded-full bg-gray-200"></div>
                    <button 
                      onClick={() => setIsEditingProfile(true)}
                      className="text-[9px] font-black text-primary uppercase tracking-widest hover:underline"
                    >
                      Edit Profile
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
          <button onClick={logout} className="p-2 text-gray-200 hover:text-red-400 transition-all active:scale-90">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          </button>
        </div>
        
        <div className="bg-gray-50/50 rounded-2xl p-3 border border-gray-100/50">
          <p className="text-[7px] font-black text-gray-400 uppercase tracking-[0.3em] mb-1 px-1">Current Intention</p>
          {isEditingIntent ? (
            <input 
              autoFocus
              value={intentInput}
              onChange={(e) => setIntentInput(e.target.value)}
              onBlur={handleSaveIntent}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveIntent()}
              className="text-xs font-bold text-gray-900 bg-white border border-gray-100 rounded-xl px-3 py-2 outline-none w-full shadow-sm"
            />
          ) : (
            <button onClick={() => setIsEditingIntent(true)} className="text-xs text-gray-600 font-medium italic px-1 text-left w-full hover:text-primary transition-colors">
              "{p.intention || 'Defining my next right move.'}"
            </button>
          )}
        </div>
      </div>

      <main className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4 space-y-5">
        
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            {activeEntry ? (
              <Link to={`/participant/sprint/${activeEntry.enrollment.id}`} className="block">
                <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm relative overflow-hidden flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/5 flex items-center justify-center flex-shrink-0 text-xl">🎯</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[7px] font-black text-primary uppercase tracking-widest mb-0.5">{p.currentStage || 'Active Path'}</p>
                    <h3 className="text-xs font-black text-gray-900 truncate italic">{activeEntry.sprint.title}</h3>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1 bg-gray-50 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full transition-all" 
                          style={{ width: `${(activeEntry.enrollment.progress.filter(x => x.completed).length / activeEntry.sprint.duration) * 100}%` }}
                        />
                      </div>
                      <span className="text-[8px] font-bold text-gray-400">Day {activeEntry.enrollment.progress.filter(x => x.completed).length + 1}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ) : (
              <div className="p-4 bg-gray-50 rounded-3xl border border-dashed border-gray-100 text-center">
                <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest">No active cycles</p>
              </div>
            )}
          </div>

          <div className="bg-dark rounded-3xl p-4 text-white relative overflow-hidden flex flex-col justify-center">
             <p className="text-[7px] font-black uppercase tracking-[0.3em] text-white/30 mb-1">Rise</p>
             <div className="flex items-end gap-1">
               <h3 className="text-2xl font-black italic tracking-tighter">{p.walletBalance || 0}</h3>
               <span className="text-[10px] mb-1 opacity-40">🪙</span>
             </div>
          </div>

          <Link to="/impact" className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm flex flex-col justify-center">
            <p className="text-[7px] font-black uppercase tracking-[0.3em] text-gray-400 mb-1">Impact</p>
            <h3 className="text-2xl font-black text-gray-900 tracking-tighter italic">{p.impactStats?.peopleHelped || 0}</h3>
          </Link>
        </div>

        <section>
          <SectionLabel text="Sprint Archive" />
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1 px-1">
            {completedEntries.length > 0 ? (
              completedEntries.map(({ enrollment, sprint }) => (
                <div key={enrollment.id} className="flex-shrink-0 w-36 bg-white rounded-2xl p-3 border border-gray-100 shadow-sm">
                  <div className="w-full h-20 rounded-xl overflow-hidden mb-2 grayscale opacity-60">
                    <img src={sprint.coverImageUrl} className="w-full h-full object-cover" alt="" />
                  </div>
                  <h4 className="font-black text-gray-900 text-[9px] tracking-tight leading-tight line-clamp-2 italic mb-1">{sprint.title}</h4>
                  <span className="text-[7px] font-black bg-primary/5 text-primary px-1.5 py-0.5 rounded uppercase">{sprint.outcomeTag || 'Clarity gained'}</span>
                </div>
              ))
            ) : (
              <div className="w-full py-4 text-center text-gray-300 italic text-[9px]">Empty Archive</div>
            )}
          </div>
        </section>

        <section>
          <div className="flex justify-between items-center mb-2 px-1">
            <SectionLabel text="Reflections" />
            <input 
              type="text"
              value={reflectionSearch}
              onChange={(e) => setReflectionSearch(e.target.value)}
              placeholder="Search..."
              className="text-[8px] font-bold bg-gray-50 border-none rounded-lg px-2 py-1 outline-none w-20 focus:w-32 transition-all"
            />
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1 px-1">
            {filteredReflections.length > 0 ? (
              filteredReflections.map((ref, idx) => (
                <div key={idx} className="flex-shrink-0 w-48 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm relative overflow-hidden">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-[7px] font-black text-primary uppercase tracking-widest truncate max-w-[100px]">{ref.sprintTitle}</p>
                    <p className="text-[6px] font-bold text-gray-300 uppercase">D{ref.day}</p>
                  </div>
                  <p className="text-[10px] text-gray-600 font-medium leading-relaxed italic line-clamp-3">"{ref.text}"</p>
                </div>
              ))
            ) : (
              <div className="w-full py-4 text-center text-gray-300 italic text-[9px]">No Patterns Found</div>
            )}
          </div>
        </section>

        <section>
          <SectionLabel text="Micro Decisions" />
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1 px-1">
            {microDecisions.length > 0 ? (
              microDecisions.map((dec, idx) => (
                <div key={idx} className="flex-shrink-0 w-40 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between h-20">
                  <p className="text-[7px] font-black text-gray-300 uppercase tracking-widest truncate">{dec.sprintTitle}</p>
                  <p className="text-[10px] font-black text-gray-800 leading-tight italic">"{dec.choice}"</p>
                </div>
              ))
            ) : (
              <div className="w-full py-4 text-center text-gray-300 italic text-[9px]">No Decisions Logged</div>
            )}
          </div>
        </section>

        <section className="pb-4">
          <SectionLabel text="Coach Registry" />
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1 px-1">
            {uniqueCoaches.length > 0 ? (
              uniqueCoaches.map(({ coach }) => (
                <div key={coach.id} className="flex-shrink-0 w-28 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center text-center">
                  <img src={coach.profileImageUrl} className="w-8 h-8 rounded-xl object-cover mb-2 border border-gray-50 shadow-sm" alt="" />
                  <h4 className="font-black text-gray-900 text-[8px] tracking-tight truncate w-full">{coach.name}</h4>
                  <p className="text-[7px] text-gray-400 font-bold uppercase tracking-widest truncate w-full">{coach.niche}</p>
                </div>
              ))
            ) : (
              <div className="w-full py-4 text-center text-gray-300 italic text-[9px]">No Connections</div>
            )}
          </div>
        </section>

        <footer className="text-center pt-2">
            <p className="text-[7px] font-black text-gray-200 uppercase tracking-[0.4em]">Vectorise • Profile 4.1 Dense</p>
        </footer>

      </main>

      {/* Avatar Selection Modal */}
      {isSelectingAvatar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsSelectingAvatar(false)}></div>
          <div className="relative w-full max-w-sm bg-white rounded-[3rem] shadow-2xl overflow-hidden animate-slide-up">
            <div className="p-8">
              <h2 className="text-2xl font-black text-gray-900 tracking-tight italic mb-2">Choose Archetype</h2>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-8">Select the energy you want to embody.</p>
              
              <div className="grid grid-cols-1 gap-3">
                {ARCHETYPES.map((arch) => (
                  <button 
                    key={arch.id}
                    onClick={() => handleSelectArchetype(arch.id)}
                    className={`flex items-center gap-4 p-4 rounded-3xl border transition-all active:scale-95 ${p.archetype === arch.id ? 'bg-primary/5 border-primary/20' : 'bg-gray-50 border-gray-100 hover:border-gray-200'}`}
                  >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl bg-gradient-to-br ${arch.color} shadow-lg`}>
                      {arch.icon}
                    </div>
                    <div className="text-left">
                      <h4 className="text-xs font-black text-gray-900 italic">{arch.name}</h4>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{arch.energy}</p>
                    </div>
                    {p.archetype === arch.id && (
                      <div className="ml-auto w-5 h-5 bg-primary text-white rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
            <button 
              onClick={() => setIsSelectingAvatar(false)}
              className="w-full py-5 bg-gray-900 text-white font-black uppercase tracking-[0.3em] text-[10px]"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.03); border-radius: 10px; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
};

export default Profile;
