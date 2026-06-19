
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { sprintService } from '../../../services/sprintService';
import { userService } from '../../../services/userService';
import { ParticipantSprint, Sprint, Coach } from '../../../types';
import { Share2, ChevronRight, ChevronLeft, Lock, CheckCircle2, Calendar, Award, Zap, Sparkles, BookOpen } from 'lucide-react';
import SprintShareModal from '../../../components/SprintShareModal';
import FormattedText from '../../../components/FormattedText';

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
                      <div className="text-left min-w-0 flex-1">
                        <h4 className="text-sm md:text-base font-black text-gray-900 tracking-tight group-hover:text-primary transition-colors leading-tight line-clamp-1 mb-1">{sprint.title}</h4>
                        <div className="flex flex-wrap items-center gap-1.5">
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
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
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

      {/* Action Step Detail Overlay (Modal) */}
      {selectedSprintDetails && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-fade-in font-sans">
          <div className="bg-[#FAFAFA] rounded-[2.5rem] border border-gray-150 shadow-2xl flex flex-col w-full max-w-2xl h-full max-h-[85vh] overflow-hidden">
            {/* Header */}
            <header className="bg-white px-6 py-5 border-b border-gray-55 flex items-center justify-between shadow-sm flex-shrink-0">
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
              <div className="w-14"></div>
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
          <div className="flex-1 overflow-y-auto px-4 md:px-12 py-8 md:py-12 custom-scrollbar bg-slate-50/50">
            <div className="w-full max-w-4xl mx-auto space-y-8 flex flex-col relative pb-16">
              {(() => {
                const dayContent = selectedSprintDetails.sprint.dailyContent?.find(d => d.day === selectedDay);
                const progressRecord = selectedSprintDetails.enrollment.progress?.find(p => p.day === selectedDay);
                const isCompleted = !!progressRecord?.completed;
                
                const completedDayNumbers = selectedSprintDetails.enrollment.progress?.filter(p => p.completed).map(p => p.day) || [];
                const maxCompleted = completedDayNumbers.length > 0 ? Math.max(...completedDayNumbers) : 0;
                const isUnlocked = selectedDay <= maxCompleted + 1 || selectedSprintDetails.enrollment.status === 'completed';

                if (!isUnlocked) {
                  return (
                    <div className="h-64 flex flex-col items-center justify-center text-center p-8 bg-white rounded-[2rem] border border-gray-150 shadow-sm animate-fade-in max-w-md mx-auto w-full mt-8">
                      <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 mb-4 border border-gray-105">
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
                    <div className="space-y-6 animate-fade-in w-full max-w-2xl mx-auto mt-4">
                      <div className="p-8 bg-white rounded-[2.5rem] border border-gray-155 shadow-sm space-y-5 text-left">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 shadow-sm">
                            <Zap className="w-5 h-5 text-amber-600" />
                          </div>
                          <h3 className="font-black text-gray-900 text-sm uppercase tracking-widest leading-none">Present Day Task Active</h3>
                        </div>
                        <div className="border-l-4 border-amber-200 pl-4 py-1">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] mb-1">Today's Focus Prompt</p>
                          <p className="text-base font-black text-gray-900 leading-tight">
                            {dayContent?.taskPrompt || "Check your current focus in the main workout view."}
                          </p>
                        </div>
                        <div className="pt-2">
                          <p className="text-sm text-gray-500 font-semibold leading-relaxed">
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
                  <div className="space-y-8 animate-fade-in w-full">
                    {/* Progress Bar styled header exactly like SprintView Full Bleed */}
                    <div className="w-full bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm space-y-4">
                      <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-[0.3em] text-[#0E7850]">
                        <span className="flex items-center gap-2.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                          Day {selectedDay} Complete
                        </span>
                        {completedAt && (
                          <span className="flex items-center gap-1.5 opacity-80 text-gray-500 font-bold">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        )}
                      </div>
                      <div className="w-full bg-emerald-500/10 rounded-full h-2 overflow-hidden shadow-inner">
                        <div className="bg-emerald-500 h-full rounded-full w-full transition-all duration-500 ease-out" />
                      </div>
                      <p className="text-xs font-semibold text-gray-500">Your logged performance results have been successfully preserved in your personal archives.</p>
                    </div>

                    {/* Lesson Prep Section if present */}
                    {dayContent?.lessonText && (
                      <div className="p-6 md:p-8 bg-white rounded-[2rem] border border-gray-100 shadow-sm text-left relative">
                        <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-[8px] font-black uppercase tracking-[0.2em] rounded-md inline-block mb-4 border border-indigo-100/50">Lesson Reading</span>
                        <div className="text-gray-805 font-medium text-sm sm:text-base leading-relaxed">
                          <FormattedText text={dayContent.lessonText} />
                        </div>
                      </div>
                    )}

                    {/* Micro Decision Selected Highlight Bar */}
                    {proofSelection && (
                      <div className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm text-left relative overflow-hidden group">
                        <div className="absolute right-0 top-0 translate-x-2 -translate-y-2 w-16 h-16 bg-[#0E7850]/5 rounded-full blur-xl pointer-events-none"></div>
                        <span className="px-2.5 py-1 bg-[#0E7850]/10 text-[#0E7850] text-[8px] font-black uppercase tracking-[0.15em] rounded-md inline-block mb-3 border border-[#0E7850]/10">Decision Lock</span>
                        <p className="text-lg font-black text-gray-900 leading-tight italic">
                          "{proofSelection}"
                        </p>
                      </div>
                    )}

                    {/* Submission text if not multiple */}
                    {submission && (!answers || answers.length === 0) && (
                      <div className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm text-left relative overflow-hidden group">
                        <span className="px-2.5 py-1 bg-gray-100 text-gray-500 text-[8px] font-black uppercase tracking-[0.15em] rounded-md inline-block mb-3 border border-gray-200/50">Core Submission</span>
                        <p className="text-sm font-semibold text-gray-800 leading-relaxed whitespace-pre-line">{submission}</p>
                      </div>
                    )}

                    {/* Detailed Action Steps content mapping */}
                    {prompts.length > 0 && (
                      <div className="space-y-6">
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] px-1">Action Report Details</h4>
                        
                        {prompts.map((promptText, idx) => {
                          if (!promptText || !promptText.trim()) return null;
                          const answer = answers[idx] || "";
                          const inputType = dayContent?.taskInputTypes?.[idx] || '';

                          // Check if it's a poll representation
                          let pollOpts: string[] = [];
                          if (dayContent?.taskPollOptions?.[idx]) {
                            try {
                              pollOpts = JSON.parse(dayContent.taskPollOptions[idx]);
                            } catch (e) {}
                          }
                          pollOpts = pollOpts.filter(Boolean);
                          const isPoll = inputType === 'poll' || pollOpts.length > 0;

                          // Parse JSON answers if applicable
                          let selectedOpts: string[] = [];
                          try {
                            if (answer && answer.trim().startsWith("[")) {
                              selectedOpts = JSON.parse(answer);
                            } else if (answer) {
                              selectedOpts = [answer];
                            }
                          } catch (e) {}

                          return (
                            <div key={idx} className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm space-y-4 text-left relative">
                              {/* Step Index Indicator */}
                              <div className="flex items-center gap-2.5 border-b border-gray-50 pb-3">
                                <span className="w-6 h-6 rounded-lg bg-[#0E7850]/10 text-[#0E7850] flex items-center justify-center text-[11px] font-black border border-[#0E7850]/15">
                                  {idx + 1}
                                </span>
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mt-0.5">Report step {idx + 1}</p>
                              </div>

                              {/* Task Notes from SprintView logic if present */}
                              {dayContent?.taskNotes?.[idx] && (
                                <div className="text-left border-l-4 border-emerald-500/20 pl-4 py-1.5 text-gray-600 font-semibold text-sm leading-relaxed">
                                  <FormattedText text={dayContent.taskNotes[idx]} />
                                </div>
                              )}

                              {/* Task Prompt styled exactly like SprintView */}
                              <div className="text-gray-950 font-black text-base sm:text-lg md:text-xl leading-relaxed mt-2">
                                <FormattedText text={promptText} />
                              </div>

                              {/* Task Footnote if present */}
                              {dayContent?.taskFootnotes?.[idx] && (
                                <div className="text-left text-emerald-600 font-bold text-xs sm:text-sm leading-relaxed">
                                  <FormattedText text={dayContent.taskFootnotes[idx]} />
                                </div>
                              )}

                              {/* Render Answer value nicely with no data string */}
                              <div className="pt-2">
                                {isPoll ? (
                                  <div className="space-y-3.5">
                                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest pl-1">
                                      📊 Poll Response
                                    </p>
                                    <div className="flex flex-wrap gap-2 w-full">
                                      {pollOpts.map((opt, optIndex) => {
                                        const isSel = selectedOpts.includes(opt);
                                        return (
                                          <span
                                            key={optIndex}
                                            className={`px-4 py-2.5 rounded-full text-xs font-black uppercase tracking-wider border flex items-center gap-2 transition-all select-none ${
                                              isSel 
                                                ? "bg-[#0E7850]/10 border-[#0E7850]/35 text-[#0E7850] shadow-sm font-black" 
                                                : "bg-gray-50/50 border-gray-150 text-gray-400 opacity-60 font-semibold"
                                            }`}
                                          >
                                            {isSel ? (
                                              <span className="w-1.5 h-1.5 rounded-full bg-[#0E7850] animate-pulse shrink-0"></span>
                                            ) : (
                                              <span className="w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0"></span>
                                            )}
                                            {opt}
                                          </span>
                                        );
                                      })}
                                    </div>
                                    {selectedOpts.length === 0 && (
                                      <p className="text-xs text-gray-400 italic pl-1">No response selected for this poll card.</p>
                                    )}
                                  </div>
                                ) : inputType === 'tags' || (answer && answer.trim().startsWith('[') && answer.trim().endsWith(']')) ? (
                                  <div className="space-y-2">
                                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest pl-1">
                                      🏷️ Tags Selection
                                    </p>
                                    <div className="flex flex-wrap gap-1.5 w-full">
                                      {selectedOpts.map((tagValue, tagIdx) => (
                                        <span key={tagIdx} className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-black bg-primary/10 text-primary border border-primary/10 uppercase tracking-widest">
                                          {tagValue}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                ) : answer && answer.trim().startsWith("{") && answer.trim().endsWith("}") ? (
                                  <div className="space-y-2.5 w-full text-left font-semibold">
                                    {(() => {
                                      try {
                                        const parsed = JSON.parse(answer);
                                        return Object.entries(parsed).map(([lbl, ans], pidx) => (
                                          <div key={pidx} className="flex flex-col gap-1 border-b border-gray-50 pb-2 last:border-0 last:pb-0 text-left">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[9px] font-black bg-primary/10 text-primary self-start uppercase tracking-wider">
                                              🔎 {lbl}
                                            </span>
                                            <p className="text-gray-800 font-bold text-sm pl-1 mt-0.5">
                                              {ans as string}
                                            </p>
                                          </div>
                                        ));
                                      } catch (e) {
                                        return <p className="text-sm font-bold text-gray-800">{answer}</p>;
                                      }
                                    })()}
                                  </div>
                                ) : answer ? (
                                  <div className="p-4 bg-gray-50/50 border border-gray-100/50 rounded-2xl">
                                    <p className="text-sm font-semibold text-gray-800 leading-relaxed whitespace-pre-line">{answer}</p>
                                  </div>
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
                      <div className="p-5 bg-white rounded-2xl border border-gray-100 text-left flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                            <BookOpen className="w-5 h-5 text-indigo-600" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-0.5">Attachment Submitted</p>
                            <p className="text-xs font-bold text-gray-900">Uploaded Evidence Doc</p>
                          </div>
                        </div>
                        <a 
                          href={progressRecord.submissionFileUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-sm shadow-indigo-100"
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
