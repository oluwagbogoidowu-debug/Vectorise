
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { sprintService } from '../../../services/sprintService';
import { userService } from '../../../services/userService';
import { ParticipantSprint, Sprint, Coach } from '../../../types';
import { Share2, ChevronRight, ChevronLeft, Lock, CheckCircle2, Calendar, Award, Zap, Sparkles, BookOpen } from 'lucide-react';
import SprintShareModal from '../../../components/SprintShareModal';

const RiseArchive: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<{ enrollment: ParticipantSprint; sprint: Sprint; coach: Coach | null }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedShareSprint, setSelectedShareSprint] = useState<string | null>(null);
  const [selectedSprintDetails, setSelectedSprintDetails] = useState<{
    enrollment: ParticipantSprint;
    sprint: Sprint;
  } | null>(null);
  const [selectedDay, setSelectedDay] = useState<number>(1);

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

  const completedEntries = useMemo(() => enrollments.filter(e => e.enrollment.progress.length > 0 && e.enrollment.progress.every(p => p.completed)), [enrollments]);

  const allArchiveEntries = useMemo(() => {
    return enrollments.filter(e => e.enrollment.status === 'completed' || e.enrollment.status === 'active' || e.enrollment.progress.some(p => p.completed));
  }, [enrollments]);

  const filteredReflections = useMemo(() => [], []);

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
    <div className="bg-[#FDFDFD] h-screen w-full font-sans overflow-hidden flex flex-col animate-fade-in relative">
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
          <div className="space-y-4 px-1">
            {allArchiveEntries.length > 0 ? (
              allArchiveEntries.map(({ enrollment, sprint }) => {
                const completedDaysCount = enrollment.progress?.filter(p => p.completed).length || 0;
                const isFoundational = sprint.sprintType === 'Foundational' || 
                                       sprint.sprintType === 'Fundamentals' ||
                                       sprint.sprintType === 'Core' ||
                                       sprint.sprintType === 'Expert' ||
                                       sprint.category === 'Core Platform Sprint' || 
                                       sprint.category === 'Growth Fundamentals';
                const isCompleted = enrollment.status === 'completed' || completedDaysCount >= (sprint.duration || 5);
                const isActive = enrollment.status === 'active';

                return (
                  <div 
                    key={enrollment.id}
                    onClick={() => {
                      setSelectedSprintDetails({ enrollment, sprint });
                      // Find default tab selected index (highest completed or 1)
                      const completedDayNums = enrollment.progress?.filter(p => p.completed).map(p => p.day) || [];
                      const maxCompleted = completedDayNums.length > 0 ? Math.max(...completedDayNums) : 0;
                      const activeDay = maxCompleted > 0 ? maxCompleted : 1;
                      setSelectedDay(activeDay);
                    }}
                    className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden p-4 flex items-center justify-between cursor-pointer group hover:shadow-md hover:border-emerald-200 transition-all duration-300"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border border-gray-50 shadow-sm relative">
                        <img 
                          src={sprint.coverImageUrl || `https://picsum.photos/seed/${sprint.id}/300/300`} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                          alt="" 
                          referrerPolicy="no-referrer"
                        />
                        {isCompleted && (
                          <div className="absolute inset-0 bg-emerald-500/10 flex items-center justify-center">
                            <span className="text-white drop-shadow bg-emerald-600/90 rounded-full p-1"><CheckCircle2 className="w-4 h-4 text-white" /></span>
                          </div>
                        )}
                      </div>
                      <div className="text-left min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                          {isFoundational && (
                            <span className="px-1.5 py-0.5 bg-[#0E7850]/10 text-[#0E7850] text-[7px] font-black uppercase tracking-widest rounded flex items-center gap-0.5">
                              FOUNDATIONAL
                            </span>
                          )}
                          <span className="px-1.5 py-0.5 bg-gray-50 text-gray-400 text-[7px] font-black uppercase tracking-widest rounded">{sprint.category}</span>
                          <span className="text-[7px] font-black text-primary uppercase tracking-widest">{sprint.duration} Days</span>
                          {isCompleted ? (
                            <span className="px-1.5 py-0.5 bg-emerald-50 text-[#0E7850] text-[7px] font-black uppercase tracking-widest rounded">Completed</span>
                          ) : isActive ? (
                            <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 text-[7px] font-black uppercase tracking-widest rounded animate-pulse">Active • Day {completedDaysCount + 1}</span>
                          ) : (
                            <span className="px-1.5 py-0.5 bg-gray-100 text-gray-400 text-[7px] font-black uppercase tracking-widest rounded">Enrolled</span>
                          )}
                        </div>
                        <h4 className="text-sm md:text-base font-black text-gray-900 tracking-tight group-hover:text-primary transition-colors leading-tight line-clamp-1">{sprint.title}</h4>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedShareSprint(sprint.title);
                        }}
                        className="p-1.5 bg-gray-50 hover:bg-primary/10 hover:text-primary text-gray-400 rounded-lg transition-all"
                        title="Share Sprint"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                      <div className="p-2 rounded-xl bg-gray-50 text-gray-400 group-hover:bg-primary/10 group-hover:text-primary transition-all flex-shrink-0">
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="w-full py-8 text-center text-gray-300 text-[9px] bg-white border border-gray-100 rounded-[2rem] shadow-sm">Empty Archive</div>
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

      {/* Full-Bleed Action Step Detail Overlay */}
      {selectedSprintDetails && (
        <div className="fixed inset-0 z-50 bg-[#FDFDFD] flex flex-col overflow-hidden animate-fade-in font-sans">
          {/* Header */}
          <header className="bg-white px-6 pt-12 pb-5 border-b border-gray-50 flex items-center justify-between shadow-sm flex-shrink-0">
            <button 
              onClick={() => setSelectedSprintDetails(null)} 
              className="p-2 -ml-2 text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-1 text-[11px] font-black uppercase tracking-widest"
            >
              <ChevronLeft className="w-5 h-5 text-gray-800" />
              <span>Back</span>
            </button>
            <div className="text-center flex-1 mx-4 min-w-0">
              <span className="text-[7px] font-black bg-emerald-50 text-[#0E7850] px-1.5 py-0.5 rounded-md uppercase tracking-wider">{selectedSprintDetails.sprint.category}</span>
              <h2 className="text-xs md:text-sm font-black text-gray-900 tracking-tight leading-tight uppercase mt-0.5 truncate">{selectedSprintDetails.sprint.title}</h2>
            </div>
            <button
              onClick={() => setSelectedShareSprint(selectedSprintDetails.sprint.title)}
              className="p-2 bg-gray-50 hover:bg-primary/5 text-gray-500 hover:text-primary rounded-xl transition-all"
              title="Share report"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </header>

          {/* Days Sub-Header Navigation Selector Bar */}
          <div className="bg-white border-b border-gray-50 px-6 py-4 flex-shrink-0">
            <h3 className="text-[9px] font-black text-gray-400 uppercase tracking-[0.25em] mb-2 px-1">Curriculum Days</h3>
            <div className="flex gap-2.5 overflow-x-auto no-scrollbar py-1">
              {(() => {
                const completedDayNumbers = selectedSprintDetails.enrollment.progress?.filter(p => p.completed).map(p => p.day) || [];
                const maxCompleted = completedDayNumbers.length > 0 ? Math.max(...completedDayNumbers) : 0;
                
                return Array.from({ length: selectedSprintDetails.sprint.duration || 5 }, (_, i) => i + 1).map((dayNum) => {
                  const isCompleted = selectedSprintDetails.enrollment.progress?.some(p => p.day === dayNum && p.completed);
                  const isSelected = selectedDay === dayNum;
                  // Present day navigable <= maxCompleted + 1 OR full sprint completed
                  const isUnlocked = dayNum <= maxCompleted + 1 || selectedSprintDetails.enrollment.status === 'completed';

                  return (
                    <button
                      key={dayNum}
                      disabled={!isUnlocked}
                      onClick={() => setSelectedDay(dayNum)}
                      className={`flex-shrink-0 relative flex items-center gap-1.5 px-4 py-2.5 rounded-full border text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${
                        isSelected
                          ? 'bg-primary border-primary text-white shadow-md shadow-primary/20 scale-[1.03]'
                          : isCompleted
                          ? 'bg-emerald-50/65 border-emerald-100 text-[#0E7850]'
                          : isUnlocked
                          ? 'bg-white border-gray-100 text-gray-700 hover:bg-gray-50'
                          : 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed opacity-60'
                      }`}
                    >
                      <span>Day {dayNum}</span>
                      {isCompleted ? (
                        <CheckCircle2 className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-emerald-500'}`} />
                      ) : isUnlocked ? (
                        <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-[#0E7850] animate-pulse'}`} />
                      ) : (
                        <Lock className="w-3 h-3 text-gray-300" />
                      )}
                    </button>
                  );
                });
              })()}
            </div>
          </div>

          {/* Scrollable Report Content Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-[#FAFBFD]">
            {(() => {
              const dayContent = selectedSprintDetails.sprint.dailyContent?.find(d => d.day === selectedDay);
              const progressRecord = selectedSprintDetails.enrollment.progress?.find(p => p.day === selectedDay);
              const isCompleted = !!progressRecord?.completed;
              
              const completedDayNumbers = selectedSprintDetails.enrollment.progress?.filter(p => p.completed).map(p => p.day) || [];
              const maxCompleted = completedDayNumbers.length > 0 ? Math.max(...completedDayNumbers) : 0;
              const isUnlocked = selectedDay <= maxCompleted + 1 || selectedSprintDetails.enrollment.status === 'completed';

              if (!isUnlocked) {
                return (
                  <div className="h-64 flex flex-col items-center justify-center text-center p-8 bg-white rounded-[2rem] border border-gray-100 shadow-sm animate-fade-in mt-4">
                    <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 mb-4 border border-gray-100">
                      <Lock className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-black text-gray-900 uppercase tracking-wider">Day Locked</h3>
                    <p className="text-xs text-gray-400 max-w-xs mt-1.5 leading-relaxed font-semibold">
                      Complete previous days in your active workspace first to unlock this daily report.
                    </p>
                  </div>
                );
              }

              if (!isCompleted) {
                return (
                  <div className="space-y-6 animate-fade-in mt-2">
                    <div className="p-6 bg-white rounded-[2rem] border border-gray-100 shadow-sm space-y-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                          <Zap className="w-4 h-4 text-amber-600" />
                        </div>
                        <h3 className="font-black text-gray-800 text-[10px] uppercase tracking-widest leading-none">Present Day Task Active</h3>
                      </div>
                      <div className="border-l-2 border-amber-200 pl-4 py-1">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] mb-1">Today's Focus Prompt</p>
                        <p className="text-sm font-black text-gray-900 leading-tight">
                          {dayContent?.taskPrompt || "Check your current focus in the main workout view."}
                        </p>
                      </div>
                      <div className="pt-2">
                        <p className="text-xs text-gray-500 font-medium leading-relaxed">
                          You haven't completed this step yet. Return to your dashboard and select <span className="font-black text-[#0E7850]">Today's Focus</span> to execute and log your progress.
                        </p>
                      </div>
                    </div>
                  </div>
                );
              }

              // Rendering Day Report completed values
              const prompts = dayContent?.taskPrompts || (dayContent?.taskPrompt ? [dayContent.taskPrompt] : []);
              const answers = progressRecord?.answers || [];
              const submission = progressRecord?.submission || "";
              const proofSelection = progressRecord?.proofSelection || "";
              const completedAt = progressRecord?.completedAt;

              return (
                <div className="space-y-6 animate-fade-in mt-1">
                  {/* Completion Date Badge */}
                  <div className="flex flex-wrap items-center justify-between p-4 bg-[#0E7850]/5 border border-[#0E7850]/10 rounded-[1.5rem] gap-2">
                    <div className="flex items-center gap-2.5">
                      <Award className="w-5 h-5 text-[#0E7850]" />
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-[#0E7850] leading-none">Daily Action Completed</p>
                        <p className="text-[11px] font-bold text-gray-600 mt-1">Consistency momentum logged successfully.</p>
                      </div>
                    </div>
                    {completedAt && (
                      <span className="text-[8px] font-black bg-[#0E7850]/15 text-[#0E7850] px-2 py-1 rounded-lg uppercase tracking-wider flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    )}
                  </div>

                  {/* Micro Decision Selected Highlight Column */}
                  {proofSelection && (
                    <div className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm relative overflow-hidden group">
                      <div className="absolute right-0 top-0 translate-x-2 -translate-y-2 w-16 h-16 bg-[#0E7850]/5 rounded-full blur-xl pointer-events-none"></div>
                      <span className="px-2 py-0.5 bg-primary/10 text-primary text-[8px] font-black uppercase tracking-[0.15em] rounded-md inline-block mb-3">Micro Decision Selected</span>
                      <p className="text-base font-black text-gray-900 leading-tight italic">
                        "{proofSelection}"
                      </p>
                    </div>
                  )}

                  {/* Submission Text Block */}
                  {submission && (
                    <div className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm relative overflow-hidden group">
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[8px] font-black uppercase tracking-[0.15em] rounded-md inline-block mb-3">Core Submission</span>
                      <p className="text-sm font-black text-gray-855 leading-relaxed whitespace-pre-line">{submission}</p>
                    </div>
                  )}

                  {/* Detailed Action Step Prompts & Answers */}
                  {prompts.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-[0.25em] px-1">Action Report Details</h4>
                      
                      {prompts.map((promptText, idx) => {
                        if (!promptText || !promptText.trim()) return null;
                        const answer = answers[idx] || "";
                        
                        // Check if answer is serialised tags array
                        const isJsonTags = typeof answer === 'string' && answer.trim().startsWith('[') && answer.trim().endsWith(']');
                        let parsedTags: string[] | null = null;
                        if (isJsonTags) {
                          try {
                            const pTags = JSON.parse(answer);
                            if (Array.isArray(pTags)) parsedTags = pTags;
                          } catch(err) {}
                        }

                        return (
                          <div key={idx} className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm space-y-3 relative">
                            <div className="flex items-start gap-2.5">
                              <span className="w-5 h-5 rounded-full bg-gray-50 flex items-center justify-center text-[10px] font-black text-gray-400 border border-gray-100">{idx + 1}</span>
                              <p className="text-xs font-black text-gray-400 uppercase tracking-wider flex-1 mt-0.5 leading-normal">{promptText}</p>
                            </div>

                            <div className="border-l-2 border-[#0E7850]/70 pl-4 py-1 bg-gray-50/50 rounded-r-xl p-3">
                              {parsedTags ? (
                                <div className="flex flex-wrap gap-1.5">
                                  {parsedTags.map((tagValue, tagIdx) => (
                                    <span key={tagIdx} className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black bg-[#0E7850]/10 text-[#0E7850] border border-[#0E7850]/10 uppercase tracking-widest">
                                      {tagValue}
                                    </span>
                                  ))}
                                </div>
                              ) : answer ? (
                                <p className="text-sm font-black text-gray-800 leading-relaxed">{answer}</p>
                              ) : (
                                <span className="text-xs text-gray-400 italic font-semibold">No response logged</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Submission File attachment if existing */}
                  {progressRecord?.submissionFileUrl && (
                    <div className="p-4 bg-white rounded-2xl border border-gray-100 text-left flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                          <BookOpen className="w-4 h-4 text-indigo-600" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-0.5">Attachment Submitted</p>
                          <p className="text-xs font-bold text-gray-800">Uploaded Evidence Doc</p>
                        </div>
                      </div>
                      <a 
                        href={progressRecord.submissionFileUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="px-3 py-1.5 bg-gray-50 hover:bg-indigo-50 hover:text-indigo-600 border border-gray-100 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all"
                      >
                        View Doc
                      </a>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      <SprintShareModal
        isOpen={!!selectedShareSprint}
        onClose={() => setSelectedShareSprint(null)}
        sprintTitle={selectedShareSprint || ""}
      />
    </div>
  );
};

export default RiseArchive;
