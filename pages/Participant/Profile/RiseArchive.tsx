
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { sprintService } from '../../../services/sprintService';
import { userService } from '../../../services/userService';
import { ParticipantSprint, Sprint, Coach } from '../../../types';

const RiseArchive: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<{ enrollment: ParticipantSprint; sprint: Sprint; coach: Coach | null }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reflectionSearch, setReflectionSearch] = useState('');

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
      } catch (err) {
        console.error("Archive sync failed:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [user]);

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

  const SectionLabel = ({ text }: { text: string }) => (
    <h2 className="text-[8px] font-black text-gray-400 uppercase tracking-[0.3em] mb-2 px-1">
      {text}
    </h2>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-light">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="bg-[#FDFDFD] h-screen w-full font-sans overflow-hidden flex flex-col animate-fade-in">
      <header className="bg-white px-6 pt-12 pb-6 border-b border-gray-50 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-400 hover:text-gray-900 transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h1 className="text-lg font-black text-gray-900 uppercase tracking-widest">Rise Archive</h1>
        <div className="w-10"></div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
        <section>
          <SectionLabel text="Sprint Archive" />
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1 px-1">
            {completedEntries.length > 0 ? (
              completedEntries.map(({ enrollment, sprint }) => (
                <div key={enrollment.id} className="flex-shrink-0 w-36 bg-white rounded-2xl p-3 border border-gray-100 shadow-sm">
                  <div className="w-full h-20 rounded-xl overflow-hidden mb-2 grayscale opacity-60">
                    <img src={sprint.coverImageUrl} className="w-full h-full object-cover" alt="" />
                  </div>
                  <h4 className="font-black text-gray-900 text-[9px] tracking-tight leading-tight line-clamp-2 mb-1">{sprint.title}</h4>
                  <span className="text-[7px] font-black bg-primary/5 text-primary px-1.5 py-0.5 rounded uppercase">{sprint.outcomeTag || 'Clarity gained'}</span>
                </div>
              ))
            ) : (
              <div className="w-full py-4 text-center text-gray-300 text-[9px]">Empty Archive</div>
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
                  <p className="text-[10px] text-gray-600 font-medium leading-relaxed line-clamp-3">"{ref.text}"</p>
                </div>
              ))
            ) : (
              <div className="w-full py-4 text-center text-gray-300 text-[9px]">No Patterns Found</div>
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
                  <p className="text-[10px] font-black text-gray-800 leading-tight">"{dec.choice}"</p>
                </div>
              ))
            ) : (
              <div className="w-full py-4 text-center text-gray-300 text-[9px]">No Decisions Logged</div>
            )}
          </div>
        </section>

        <section className="pb-10">
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
              <div className="w-full py-4 text-center text-gray-300 text-[9px]">No Connections</div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default RiseArchive;
