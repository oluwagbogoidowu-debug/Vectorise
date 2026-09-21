import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sprint, ChallengeCategory, ChallengeType } from '../types';
import { CHALLENGE_CATEGORY_DESCRIPTIONS } from '../constants/sprintConstants';
import { Trophy, ArrowRight, Repeat, ListOrdered, Link2, Sparkles } from 'lucide-react';

interface ChallengeCardProps {
  challenge?: Sprint | null;
  recommendedFromTitle?: string;
  onTry?: () => void;
  hasStarted?: boolean;
  className?: string;
}

const ChallengeCard: React.FC<ChallengeCardProps> = ({
  challenge,
  recommendedFromTitle,
  onTry,
  hasStarted = false,
  className = '',
}) => {
  const navigate = useNavigate();

  // Extract challenge details with sensible fallbacks
  const title = challenge?.challengeData?.name || challenge?.title || 'Get Clear on What You Want';
  const rawCategory = (challenge?.challengeCategory || challenge?.challengeData?.category || challenge?.category || 'Mastery') as ChallengeCategory;
  const category = rawCategory in CHALLENGE_CATEGORY_DESCRIPTIONS ? rawCategory : 'Mastery';
  const type = (challenge?.challengeType || challenge?.challengeData?.type || 'Sequential') as ChallengeType;
  
  const categoryText = CHALLENGE_CATEGORY_DESCRIPTIONS[category] || 'Take a series of focused actions to strengthen your capabilities.';
  
  const connectedSprint = challenge?.recommendedAfterSprintTitle || 
    challenge?.challengeData?.recommendedAfterSprintTitle || 
    recommendedFromTitle || 
    'Gain Clarity First';

  const challengeId = challenge?.id;
  const started = hasStarted || (challengeId ? Boolean(localStorage.getItem(`vectorise_challenge_action_${challengeId}`)) : false);
  const buttonText = started ? 'Continue Challenge' : 'Try Challenge';

  const handleAction = () => {
    if (onTry) {
      onTry();
      return;
    }
    if (challenge && challenge.id) {
      navigate(`/challenge/${challenge.id}`, { state: { sprint: challenge, viewMode: started ? 'active' : undefined, continueChallenge: started } });
    } else {
      // Fallback navigation with structured challenge state
      const fallbackId = 'challenge_clarity_default';
      const fallbackSprint: Sprint = {
        id: fallbackId,
        coachId: 'coach_vectorise',
        title: title,
        subtitle: `${type} Challenge • ${category} • Recommended from ${connectedSprint}`,
        description: categoryText,
        contentType: 'challenge',
        category: category,
        challengeType: type,
        challengeCategory: category,
        recommendedAfterSprintTitle: connectedSprint,
        actionFromSprintPlaceholder: '{m2 step 2}',
        actionRecommendations: [
          'Gain total clarity on primary objective',
          'Practice 15 minutes of deliberate execution',
          'Review progress and adjust trajectory'
        ],
        duration: 7,
        price: 0,
        currency: 'NGN',
        coverImageUrl: 'https://images.unsplash.com/photo-1517649763962-0c623266010b?auto=format&fit=crop&w=800&q=80',
        published: true,
        approvalStatus: 'approved',
        createdAt: new Date().toISOString(),
        dailyContent: Array.from({ length: 7 }, (_, i) => ({
          day: i + 1,
          lessonText: `${category} Focus: Day ${i + 1}`,
          taskPrompt: `Complete today's milestone for ${title}.`,
          taskPrompts: [`Complete today's milestone for ${title}.`],
        })),
        challengeData: {
          name: title,
          type: type,
          category: category,
          recommendedAfterSprintTitle: connectedSprint,
          actionFromSprintPlaceholder: '{m2 step 2}',
          actionRecommendations: [
            'Gain total clarity on primary objective',
            'Practice 15 minutes of deliberate execution',
            'Review progress and adjust trajectory'
          ],
          whatToDo: `Complete the ${title} action steps.`,
          howOften: type === 'Repetition' ? 'Daily Repetition' : 'Sequential Step Progression',
          howLong: '7 Days',
          completionCriteria: 'Complete daily check-ins and reflection.',
          whyDoIt: categoryText,
        }
      };
      navigate(`/challenge/${fallbackId}`, { state: { sprint: fallbackSprint, viewMode: started ? 'active' : undefined, continueChallenge: started } });
    }
  };

  return (
    <div className={`relative overflow-hidden rounded-[2.25rem] bg-gradient-to-br from-purple-900 via-indigo-950 to-zinc-950 text-white p-7 md:p-9 shadow-xl shadow-purple-950/20 border border-purple-500/20 transition-all hover:border-purple-400/40 group ${className}`}>
      {/* Subtle decorative glow effect */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-purple-500/20 transition-all" />
      <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-40 h-40 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col justify-between h-full">
        {/* Top Header Tag */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-300 text-[10px] font-black uppercase tracking-[0.25em]">
              <Trophy className="w-3 h-3 text-purple-300" />
              Challenge
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-purple-300/80 text-[11px] font-bold">
            {type === 'Repetition' ? (
              <Repeat className="w-3.5 h-3.5 text-purple-400" />
            ) : (
              <ListOrdered className="w-3.5 h-3.5 text-purple-400" />
            )}
            <span>{category} • {type}</span>
          </div>
        </div>

        {/* Challenge Title */}
        <div className="mb-3">
          <h3 className="text-2xl md:text-3xl font-black tracking-tight text-white group-hover:text-purple-100 transition-colors">
            {title}
          </h3>
        </div>

        {/* Category Universal Text */}
        <p className="text-sm md:text-[15px] text-purple-200/90 font-medium leading-relaxed mb-6 max-w-xl">
          {categoryText}
        </p>

        {/* Footer Area: Recommended From & Action Button */}
        <div className="pt-5 border-t border-purple-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Recommended from connected sprint */}
          <div className="flex items-center gap-2 text-purple-300/80 text-xs font-semibold">
            <Link2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span>
              Recommended from <strong className="text-purple-200 font-bold">{connectedSprint}</strong>
            </span>
          </div>

          {/* Try Challenge Button */}
          <button
            onClick={handleAction}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 active:scale-95 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-purple-600/30 transition-all cursor-pointer group/btn"
          >
            <span>{buttonText}</span>
            <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChallengeCard;
