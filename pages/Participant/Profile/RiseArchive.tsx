import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { sprintService } from '../../../services/sprintService';
import { ParticipantSprint, Sprint } from '../../../types';
import { ChevronLeft, ChevronDown, ChevronUp, Lock, CheckCircle2, BookOpen } from 'lucide-react';
import FormattedText from '../../../components/FormattedText';

// Fallback sample sprint for preview/demo if user has no enrollments yet
const FALLBACK_SPRINT: Sprint = {
  id: 'sample-clarity-sprint',
  title: 'GAIN CLARITY FIRST',
  category: 'CLARITY',
  duration: 5,
  description: 'Evaluate where your focus and attention went over the past 24 hours.',
  coverImageUrl: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800&q=80',
  coachId: 'sample-coach',
  price: 0,
  currency: 'USD',
  published: true,
  approvalStatus: 'approved',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  dailyContent: [
    {
      day: 1,
      lessonText: 'Welcome to Day 1 of Gain Clarity First. Before changing any habit, you must build honest awareness of your baseline behaviors.',
      taskPrompt: 'Which of these best describes your last 24 hours?',
      taskPrompts: ['Which of these best describes your last 24 hours?'],
      taskNotes: ['Select everything that actually happened.'],
      taskInputTypes: ['poll'],
      taskPollOptions: [
        JSON.stringify([
          'CHECKING YOUR PHONE WITHIN MINUTES OF WAKING UP',
          'SPENDING FOCUSED TIME ON SOMETHING IMPORTANT (STUDY, TRAINING, WORK)',
          'OPENING WHATSAPP OR MESSAGES DURING SMALL GAPS',
          'HANDLING ROUTINE TASKS (EATING, CHORES, BASIC UPKEEP)',
          'SCROLLING SOCIAL MEDIA LONGER THAN YOU INTENDED'
        ])
      ]
    },
    {
      day: 2,
      lessonText: 'Day 2 focuses on identifying your primary energy drains and friction points throughout the day.',
      taskPrompt: 'What was your biggest energy drain today?',
      taskPrompts: ['What was your biggest energy drain today?'],
      taskNotes: ['Select the primary friction source.'],
      taskInputTypes: ['poll'],
      taskPollOptions: [
        JSON.stringify([
          'UNNECESSARY NOTIFICATIONS',
          'PROCRASTINATING ON DIFFICULT TASKS',
          'LACK OF CLEAR PRIORITIES',
          'MULTITASKING ACROSS MULTIPLE APPS'
        ])
      ]
    },
    {
      day: 3,
      lessonText: 'Day 3: Designing your morning anchor to prevent reactive phone checking.',
      taskPrompt: 'Choose your non-negotiable morning anchor:',
      taskPrompts: ['Choose your non-negotiable morning anchor:'],
      taskNotes: ['Pick one action to do before opening your screen.'],
      taskInputTypes: ['poll'],
      taskPollOptions: [
        JSON.stringify([
          '10 MINUTES OF DEEP BREATHING OR MEDITATION',
          'DRINKING A FULL GLASS OF WATER & HYDRATING',
          'REVIEWING YOUR TOP 3 PRIORITIES FOR THE DAY',
          'LIGHT PHYSICAL STRETCHING OR MOVEMENT'
        ])
      ]
    }
  ]
};

const FALLBACK_ENROLLMENT: ParticipantSprint = {
  id: 'sample-enrollment-id',
  user_id: 'sample-user',
  sprint_id: 'sample-clarity-sprint',
  coach_id: 'sample-coach',
  started_at: new Date().toISOString(),
  price_paid: 0,
  currency: 'USD',
  payment_source: 'free',
  status: 'active',
  progress: [
    {
      day: 1,
      completed: true,
      completedAt: new Date().toISOString(),
      answers: [
        JSON.stringify([
          'SPENDING FOCUSED TIME ON SOMETHING IMPORTANT (STUDY, TRAINING, WORK)',
          'SCROLLING SOCIAL MEDIA LONGER THAN YOU INTENDED'
        ])
      ]
    }
  ]
};

const RiseArchive: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [enrollments, setEnrollments] = useState<{ enrollment: ParticipantSprint; sprint: Sprint }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedSprintId, setSelectedSprintId] = useState<string>('');
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [isDailyContentRevealed, setIsDailyContentRevealed] = useState<boolean>(false);

  // Selected poll option choices state per step index
  const [selectedPollAnswers, setSelectedPollAnswers] = useState<Record<number, string[]>>({});

  // Fetch real user enrollments
  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const userEnrollments = await sprintService.getUserEnrollments(user.id);
        const enriched = await Promise.all(
          userEnrollments.map(async (en) => {
            const sprint = await sprintService.getSprintById(en.sprint_id);
            if (!sprint) return null;
            return { enrollment: en, sprint };
          })
        );
        const valid = enriched.filter((x): x is { enrollment: ParticipantSprint; sprint: Sprint } => x !== null);
        setEnrollments(valid);
      } catch (err) {
        console.error('Sprint Archive sync failed:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [user]);

  // Determine active item (from URL param, state, or fallback)
  const activeItem = useMemo(() => {
    if (enrollments.length > 0) {
      const searchParams = new URLSearchParams(location.search);
      const querySprintId = searchParams.get('sprintId');
      if (querySprintId) {
        const found = enrollments.find(e => e.sprint.id === querySprintId || e.enrollment.sprint_id === querySprintId);
        if (found) return found;
      }
      if (selectedSprintId) {
        const found = enrollments.find(e => e.sprint.id === selectedSprintId || e.enrollment.sprint_id === selectedSprintId);
        if (found) return found;
      }
      return enrollments[0];
    }
    return { enrollment: FALLBACK_ENROLLMENT, sprint: FALLBACK_SPRINT };
  }, [enrollments, location.search, selectedSprintId]);

  const activeSprint = activeItem.sprint;
  const activeEnrollment = activeItem.enrollment;

  // Sync selected sprint & day default on change
  useEffect(() => {
    if (activeItem) {
      setSelectedSprintId(activeItem.sprint.id);
      const completedDayNums = activeItem.enrollment.progress?.filter(p => p.completed).map(p => p.day) || [];
      const maxCompleted = completedDayNums.length > 0 ? Math.max(...completedDayNums) : 0;
      setSelectedDay(maxCompleted > 0 ? maxCompleted : 1);
    }
  }, [activeItem.sprint.id]);

  // Find daily content & progress record for selected day
  const currentDayContent = useMemo(() => {
    return activeSprint.dailyContent?.find(d => d.day === selectedDay) || activeSprint.dailyContent?.[selectedDay - 1];
  }, [activeSprint, selectedDay]);

  const currentProgressRecord = useMemo(() => {
    return activeEnrollment.progress?.find(p => p.day === selectedDay);
  }, [activeEnrollment, selectedDay]);

  // Sync user saved answers into state when day or sprint changes
  useEffect(() => {
    setIsDailyContentRevealed(false);
    const answersObj: Record<number, string[]> = {};

    const promptsCount = currentDayContent?.taskPrompts?.length || (currentDayContent?.taskPrompt ? 1 : 1);
    for (let stepIdx = 0; stepIdx < promptsCount; stepIdx++) {
      const savedAnswer = currentProgressRecord?.answers?.[stepIdx] || (stepIdx === 0 ? currentProgressRecord?.submission : '');
      if (savedAnswer) {
        try {
          if (savedAnswer.trim().startsWith('[') && savedAnswer.trim().endsWith(']')) {
            answersObj[stepIdx] = JSON.parse(savedAnswer);
          } else {
            answersObj[stepIdx] = [savedAnswer];
          }
        } catch (e) {
          answersObj[stepIdx] = [savedAnswer];
        }
      } else if (activeSprint.id === FALLBACK_SPRINT.id && selectedDay === 1 && stepIdx === 0) {
        // Pre-select default options for demo matching screenshot
        answersObj[0] = [
          'SPENDING FOCUSED TIME ON SOMETHING IMPORTANT (STUDY, TRAINING, WORK)',
          'SCROLLING SOCIAL MEDIA LONGER THAN YOU INTENDED'
        ];
      } else {
        answersObj[stepIdx] = [];
      }
    }

    setSelectedPollAnswers(answersObj);
  }, [currentDayContent, currentProgressRecord, selectedDay, activeSprint.id]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
        <div className="w-8 h-8 border-4 border-[#0E7850] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Max completed day for progress calculations
  const completedDays = activeEnrollment.progress?.filter(p => p.completed).map(p => p.day) || [];
  const maxCompletedDay = completedDays.length > 0 ? Math.max(...completedDays) : 0;

  // Prompts array
  const taskPrompts = currentDayContent?.taskPrompts && currentDayContent.taskPrompts.length > 0
    ? currentDayContent.taskPrompts
    : [currentDayContent?.taskPrompt || 'Which of these best describes your last 24 hours?'];

  return (
    <div className="min-h-screen w-full bg-[#FAFAFA] font-sans text-gray-900 pb-28 animate-fade-in">
      {/* Top Header Navigation */}
      <header className="bg-white px-6 pt-10 pb-5 border-b border-gray-100 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-gray-800 hover:text-gray-900 transition-all cursor-pointer py-1 px-1 active:scale-95"
        >
          <ChevronLeft className="w-5 h-5 text-gray-800 stroke-[2.5]" />
          <span className="text-xs sm:text-sm font-black uppercase tracking-wider">BACK</span>
        </button>

        <div className="flex flex-col items-center justify-center text-center max-w-[200px] sm:max-w-xs">
          <h1 className="text-sm sm:text-base font-black text-gray-900 uppercase tracking-wider leading-none truncate w-full">
            {activeSprint.title}
          </h1>
          <span className="mt-1.5 px-3 py-0.5 bg-emerald-50 text-[#0E7850] text-[9px] font-black uppercase tracking-widest rounded-full border border-emerald-100/60">
            {activeSprint.category || 'CLARITY'}
          </span>
        </div>

        {/* Sprint selector dropdown if user has multiple enrolled/archived sprints */}
        {enrollments.length > 1 ? (
          <div className="relative">
            <select
              value={activeSprint.id}
              onChange={(e) => {
                setSelectedSprintId(e.target.value);
              }}
              className="bg-gray-50 border border-gray-200 text-gray-800 text-[10px] font-black uppercase tracking-wider rounded-xl px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#0E7850] cursor-pointer"
            >
              {enrollments.map(({ sprint }) => (
                <option key={sprint.id} value={sprint.id}>
                  {sprint.title}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="w-12" />
        )}
      </header>

      <main className="max-w-xl mx-auto px-4 sm:px-6 pt-6 space-y-6 text-left">
        {/* Curriculum Days Selector */}
        <section className="w-full">
          <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 px-1">
            CURRICULUM DAYS
          </h2>
          <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar py-1">
            {Array.from({ length: activeSprint.duration || 5 }, (_, i) => i + 1).map((dayNum) => {
              const isSelected = selectedDay === dayNum;
              const isCompleted = activeEnrollment.progress?.some(p => p.day === dayNum && p.completed);
              const isLocked = !isCompleted && dayNum > (maxCompletedDay + 1) && activeEnrollment.status !== 'completed';

              return (
                <button
                  key={dayNum}
                  onClick={() => setSelectedDay(dayNum)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? 'bg-[#0E7850] text-white shadow-md shadow-[#0E7850]/20 scale-[1.02]'
                      : isCompleted
                      ? 'bg-emerald-50 text-[#0E7850] border border-emerald-200'
                      : isLocked
                      ? 'bg-gray-100 text-gray-300 border border-transparent cursor-not-allowed opacity-70'
                      : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <span>DAY {dayNum}</span>
                  {isCompleted ? (
                    <CheckCircle2 className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-[#0E7850]'}`} />
                  ) : isLocked ? (
                    <Lock className="w-3 h-3 text-gray-300" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </section>

        {/* Daily Content Toggle Button (Hidden behind button by default) */}
        <section className="w-full">
          <button
            type="button"
            onClick={() => setIsDailyContentRevealed(!isDailyContentRevealed)}
            className="w-full py-3.5 px-5 bg-white border border-gray-200/80 hover:border-gray-300 rounded-2xl flex items-center justify-between text-xs font-black uppercase tracking-wider text-gray-700 shadow-xs transition-all active:scale-[0.99] cursor-pointer"
          >
            <div className="flex items-center gap-2.5 text-gray-800">
              <BookOpen className="w-4 h-4 text-[#0E7850]" />
              <span>Daily Lesson / Content</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-400 text-[10px] uppercase font-bold">
              <span>{isDailyContentRevealed ? 'Hide Content' : 'Click to Reveal'}</span>
              {isDailyContentRevealed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </button>

          {isDailyContentRevealed && (
            <div className="mt-3 p-6 bg-white rounded-2xl border border-gray-200/80 shadow-xs text-left text-sm text-gray-800 font-medium leading-relaxed animate-fade-in space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 bg-emerald-50 text-[#0E7850] text-[9px] font-black uppercase tracking-widest rounded-md border border-emerald-100">
                  Day {selectedDay} Lesson
                </span>
              </div>
              <FormattedText text={currentDayContent?.lessonText || 'No lesson content recorded for this day.'} />
            </div>
          )}
        </section>

        {/* Action Steps (Main Part) */}
        <section className="w-full space-y-6">
          {taskPrompts.map((promptText, stepIdx) => {
            const note = currentDayContent?.taskNotes?.[stepIdx] || (stepIdx === 0 ? 'Select everything that actually happened.' : '');
            
            // Extract poll options if applicable
            let pollOptions: string[] = [];
            if (currentDayContent?.taskPollOptions?.[stepIdx]) {
              try {
                pollOptions = JSON.parse(currentDayContent.taskPollOptions[stepIdx]);
              } catch (e) {}
            }
            if (pollOptions.length === 0 && (stepIdx === 0 || currentDayContent?.taskInputTypes?.[stepIdx] === 'poll')) {
              pollOptions = [
                'CHECKING YOUR PHONE WITHIN MINUTES OF WAKING UP',
                'SPENDING FOCUSED TIME ON SOMETHING IMPORTANT (STUDY, TRAINING, WORK)',
                'OPENING WHATSAPP OR MESSAGES DURING SMALL GAPS',
                'HANDLING ROUTINE TASKS (EATING, CHORES, BASIC UPKEEP)',
                'SCROLLING SOCIAL MEDIA LONGER THAN YOU INTENDED'
              ];
            }

            const currentSelections = selectedPollAnswers[stepIdx] || [];

            const toggleOption = (optionText: string) => {
              setSelectedPollAnswers(prev => {
                const existing = prev[stepIdx] || [];
                if (existing.includes(optionText)) {
                  return { ...prev, [stepIdx]: existing.filter(item => item !== optionText) };
                } else {
                  return { ...prev, [stepIdx]: [...existing, optionText] };
                }
              });
            };

            return (
              <div
                key={stepIdx}
                className="w-full bg-white rounded-[2.5rem] border border-gray-150 shadow-xs p-6 sm:p-8 text-left space-y-5 relative overflow-hidden"
              >
                {/* Prompt Title */}
                <h3 className="text-base sm:text-lg font-black text-gray-900 leading-snug">
                  <FormattedText text={promptText} />
                </h3>

                {/* Subtitle / Note */}
                {note && (
                  <p className="text-xs sm:text-sm text-gray-600 font-semibold leading-relaxed">
                    <FormattedText text={note} />
                  </p>
                )}

                {/* Type Label */}
                <div className="flex items-center gap-1.5 pt-1">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-1.5">
                    📊 POLL RESPONSE
                  </span>
                </div>

                {/* Options List */}
                <div className="space-y-3 pt-1">
                  {pollOptions.map((opt, optIdx) => {
                    const isSelected = currentSelections.includes(opt);

                    return (
                      <button
                        key={optIdx}
                        type="button"
                        onClick={() => toggleOption(opt)}
                        className={`w-full p-4 sm:p-5 rounded-[2rem] sm:rounded-full border text-xs sm:text-sm font-black uppercase tracking-wide flex items-center gap-3.5 transition-all duration-200 text-left cursor-pointer active:scale-[0.99] ${
                          isSelected
                            ? 'bg-[#E8F5E9] border-2 border-[#0E7850] text-[#0E7850] shadow-xs'
                            : 'bg-[#F8F9FA] border border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-100/60'
                        }`}
                      >
                        <span
                          className={`w-2.5 h-2.5 rounded-full shrink-0 transition-colors ${
                            isSelected ? 'bg-[#0E7850]' : 'bg-gray-300'
                          }`}
                        />
                        <span className="leading-snug">{opt}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </section>
      </main>
    </div>
  );
};

export default RiseArchive;
