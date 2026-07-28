import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { ARCHETYPES, GROWTH_AREAS, RISE_PATHWAYS, PERSONA_QUIZZES, INITIAL_OPTIONS } from '../../../constants';
import { Participant } from '../../../types';
import { userService, sanitizeData } from '../../../services/userService';
import { triggerHaptic, hapticPatterns } from '../../../utils/haptics';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, X, Check, Sparkles, User, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';

const IdentitySettings: React.FC = () => {
  const navigate = useNavigate();
  const { user, updateProfile } = useAuth();
  const p = user as Participant;

  const [tempPersona, setTempPersona] = useState<string | null>(p?.persona || null);
  const [tempOnboardingAnswers, setTempOnboardingAnswers] = useState<Record<string, any>>(p?.onboardingAnswers || {});
  const [tempGrowthAreas, setTempGrowthAreas] = useState<string[]>(p?.growthAreas || []);
  const [tempRisePathway, setTempRisePathway] = useState<string>(p?.risePathway || '');
  const [tempArchetype, setTempArchetype] = useState<string | null>(p?.archetype || null);
  const [currentTaskGroupIdx, setCurrentTaskGroupIdx] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  // Determine starting step (1 to 11)
  const [setupStep, setSetupStep] = useState<number>(1);

  useEffect(() => {
    if (!p) return;
    setTempPersona(p.persona || null);
    setTempOnboardingAnswers(p.onboardingAnswers || {});
    setTempGrowthAreas(p.growthAreas || []);
    setTempRisePathway(p.risePathway || '');
    setTempArchetype(p.archetype || null);

    if (!p.persona) {
      setSetupStep(1);
    } else if (!p.onboardingAnswers || Object.keys(p.onboardingAnswers || {}).length < 3) {
      const keysCount = Object.keys(p.onboardingAnswers || {}).length;
      setSetupStep(2 + keysCount);
    } else if (!p.growthAreas || p.growthAreas.length < 5) {
      const currentCount = p.growthAreas?.length || 0;
      setSetupStep(5 + currentCount);
      setCurrentTaskGroupIdx(Math.min(4, currentCount));
    } else if (!p.risePathway) {
      setSetupStep(10);
    } else if (!p.archetype) {
      setSetupStep(11);
    } else {
      setSetupStep(1); // Allow re-editing starting at step 1
    }
  }, [user]);

  if (!user) return null;

  const currentQuiz = useMemo(() => {
    if (!tempPersona || !PERSONA_QUIZZES[tempPersona]) return null;
    if (setupStep < 2 || setupStep > 4) return null;
    return PERSONA_QUIZZES[tempPersona];
  }, [tempPersona, setupStep]);

  const currentGrowthGroup = useMemo(() => {
    if (currentTaskGroupIdx < 0 || currentTaskGroupIdx >= GROWTH_AREAS.length) return null;
    return GROWTH_AREAS[currentTaskGroupIdx];
  }, [currentTaskGroupIdx]);

  const totalSteps = 11;
  const progressPercent = Math.max(5, Math.min(100, Math.round((setupStep / totalSteps) * 100)));

  const handleSelectPersona = async (persona: string) => {
    triggerHaptic(hapticPatterns.light);
    setTempPersona(persona);
    setIsSaving(true);
    try {
      await updateProfile(sanitizeData({ persona }));
      setSetupStep(2);
    } catch (e) {
      toast.error("Failed to save persona");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectQuizAnswer = async (answer: string) => {
    triggerHaptic(hapticPatterns.light);
    const qIndex = setupStep - 1; // 1, 2, or 3
    const nextAnswers = { ...tempOnboardingAnswers, [qIndex]: answer };
    setTempOnboardingAnswers(nextAnswers);
    setIsSaving(true);
    try {
      await updateProfile(sanitizeData({ onboardingAnswers: nextAnswers }));
      if (setupStep === 4) {
        setSetupStep(5);
        setCurrentTaskGroupIdx(0);
      } else {
        setSetupStep(prev => prev + 1);
      }
    } catch (e) {
      toast.error("Failed to save answer");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectGrowthArea = async (area: string) => {
    triggerHaptic(hapticPatterns.light);
    const currentGroup = GROWTH_AREAS[currentTaskGroupIdx];
    if (!currentGroup) return;

    const otherAreas = tempGrowthAreas.filter(a => !currentGroup.options.includes(a));
    const newAreas = [...otherAreas, area];
    setTempGrowthAreas(newAreas);

    setIsSaving(true);
    try {
      await updateProfile(sanitizeData({ growthAreas: newAreas }));
      if (currentTaskGroupIdx < GROWTH_AREAS.length - 1) {
        setCurrentTaskGroupIdx(prev => prev + 1);
        setSetupStep(prev => prev + 1);
      } else {
        setSetupStep(10);
      }
    } catch (e) {
      toast.error("Failed to save growth area");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectPathway = async (pathwayId: string) => {
    triggerHaptic(hapticPatterns.light);
    setTempRisePathway(pathwayId);
    setIsSaving(true);
    try {
      await updateProfile(sanitizeData({ risePathway: pathwayId }));
      setSetupStep(11);
    } catch (e) {
      toast.error("Failed to save pathway");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveFinalIdentity = async () => {
    if (!tempArchetype) {
      toast.error("Please select an Archetype to complete setup");
      return;
    }

    triggerHaptic(hapticPatterns.medium);
    setIsSaving(true);

    try {
      await updateProfile(sanitizeData({
        persona: tempPersona,
        onboardingAnswers: tempOnboardingAnswers,
        growthAreas: tempGrowthAreas,
        risePathway: tempRisePathway,
        archetype: tempArchetype,
        isIdentityComplete: true
      }));

      triggerHaptic(hapticPatterns.success);
      toast.success("Identity Setup Complete! 🎉", {
        description: "Your personalized profile has been activated."
      });

      navigate('/participant-dashboard', { replace: true });
    } catch (err) {
      console.error("Error saving identity:", err);
      toast.error("Failed to save identity. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    triggerHaptic(hapticPatterns.light);
    if (setupStep === 1) {
      navigate(-1);
    } else if (setupStep >= 5 && setupStep <= 9) {
      if (currentTaskGroupIdx > 0) {
        setCurrentTaskGroupIdx(prev => prev - 1);
        setSetupStep(prev => prev - 1);
      } else {
        setSetupStep(4);
      }
    } else if (setupStep === 10) {
      setSetupStep(9);
      setCurrentTaskGroupIdx(4);
    } else if (setupStep === 11) {
      setSetupStep(10);
    } else {
      setSetupStep(prev => prev - 1);
    }
  };

  return (
    <div className="min-h-[100dvh] w-screen bg-[#FDFDFD] flex flex-col justify-between p-6 sm:p-10 md:p-12 overflow-x-hidden relative">
      {/* Background Ambience */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-100/30 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-amber-100/30 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Top Bar / Header */}
      <div className="w-full max-w-xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <button
            onClick={handleBack}
            className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center transition-all active:scale-95 cursor-pointer"
            aria-label="Back"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="text-center">
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#0E7850]">
              Identity Setup
            </span>
            <p className="text-[11px] font-bold text-gray-400">
              Step {setupStep} of {totalSteps}
            </p>
          </div>

          <button
            onClick={() => navigate('/participant-dashboard')}
            className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center transition-all active:scale-95 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Emerald Progress Bar */}
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden relative">
          <motion.div
            className="h-full bg-gradient-to-r from-[#0E7850] to-emerald-400 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Main Form Content */}
      <div className="my-auto py-8 w-full max-w-xl mx-auto">
        <AnimatePresence mode="wait">
          {/* Step 1: Persona */}
          {setupStep === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              <div className="text-center space-y-2">
                <div className="w-14 h-14 bg-emerald-50 text-[#0E7850] rounded-2xl flex items-center justify-center mx-auto shadow-sm border border-emerald-100">
                  <User className="w-7 h-7" />
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                  Which best describes you today?
                </h2>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Select your current primary role or persona
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {INITIAL_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => handleSelectPersona(opt)}
                    disabled={isSaving}
                    className={`p-4 rounded-2xl border text-xs sm:text-sm font-bold text-left transition-all cursor-pointer flex items-center justify-between group ${
                      tempPersona === opt
                        ? 'bg-[#0E7850] text-white border-[#0E7850] shadow-md scale-[1.02]'
                        : 'bg-white border-gray-150 text-gray-800 hover:border-[#0E7850]/40 hover:bg-emerald-50/30'
                    }`}
                  >
                    <span>{opt}</span>
                    <Check
                      className={`w-4 h-4 transition-opacity ${
                        tempPersona === opt ? 'opacity-100 text-white' : 'opacity-0 group-hover:opacity-40'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Steps 2-4: Persona Quiz */}
          {setupStep >= 2 && setupStep <= 4 && tempPersona && currentQuiz && currentQuiz[setupStep - 2] && (
            <motion.div
              key={`step-${setupStep}`}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              <div className="text-center space-y-2">
                <span className="px-3 py-1 bg-emerald-50 text-[#0E7850] text-[10px] font-black uppercase tracking-widest rounded-full border border-emerald-100">
                  Question {setupStep - 1} of 3
                </span>
                <h2
                  className="text-lg sm:text-xl font-black text-gray-900 tracking-tight pt-1"
                  dangerouslySetInnerHTML={{ __html: currentQuiz[setupStep - 2].title }}
                />
              </div>

              <div className="space-y-2.5 pt-2">
                {currentQuiz[setupStep - 2].options.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => handleSelectQuizAnswer(opt)}
                    disabled={isSaving}
                    className={`w-full p-4 rounded-2xl border text-xs sm:text-sm font-bold text-left transition-all cursor-pointer flex items-center justify-between group ${
                      tempOnboardingAnswers[setupStep - 1] === opt
                        ? 'bg-[#0E7850] text-white border-[#0E7850] shadow-md'
                        : 'bg-white border-gray-150 text-gray-800 hover:border-[#0E7850]/40 hover:bg-emerald-50/30'
                    }`}
                  >
                    <span className="leading-snug">{opt}</span>
                    <Check
                      className={`w-4 h-4 flex-shrink-0 transition-opacity ${
                        tempOnboardingAnswers[setupStep - 1] === opt ? 'opacity-100 text-white' : 'opacity-0'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Steps 5-9: Growth Areas */}
          {setupStep >= 5 && setupStep <= 9 && currentGrowthGroup && (
            <motion.div
              key={`growth-${setupStep}`}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              <div className="text-center space-y-2">
                <span className="px-3 py-1 bg-amber-50 text-amber-700 text-[10px] font-black uppercase tracking-widest rounded-full border border-amber-100">
                  Growth Focus ({currentTaskGroupIdx + 1}/5)
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                  {currentGrowthGroup.group}
                </h2>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Select one priority area from this domain
                </p>
              </div>

              <div className="flex flex-wrap justify-center gap-2 pt-3">
                {currentGrowthGroup.options.map((area) => {
                  const isSelected = tempGrowthAreas.includes(area);
                  return (
                    <button
                      key={area}
                      onClick={() => handleSelectGrowthArea(area)}
                      disabled={isSaving}
                      className={`px-5 py-3 rounded-2xl text-xs sm:text-sm font-black uppercase tracking-wider transition-all cursor-pointer shadow-xs ${
                        isSelected
                          ? 'bg-[#0E7850] text-white border border-[#0E7850] shadow-md scale-105'
                          : 'bg-white border border-gray-200 text-gray-700 hover:border-[#0E7850]/50 hover:bg-emerald-50/20'
                      }`}
                    >
                      {area}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Step 10: Rise Pathway */}
          {setupStep === 10 && (
            <motion.div
              key="step-10"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              <div className="text-center space-y-2">
                <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm border border-indigo-100">
                  <Sparkles className="w-7 h-7" />
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                  Choose your Rise Pathway
                </h2>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Select the direction that aligns with your active goals
                </p>
              </div>

              <div className="space-y-3 pt-2">
                {RISE_PATHWAYS.map((path) => (
                  <button
                    key={path.id}
                    onClick={() => handleSelectPathway(path.id)}
                    disabled={isSaving}
                    className={`w-full text-left p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${
                      tempRisePathway === path.id
                        ? 'bg-[#0E7850]/5 border-[#0E7850] shadow-md ring-2 ring-[#0E7850]/20'
                        : 'bg-white border-gray-150 hover:border-[#0E7850]/40 hover:bg-emerald-50/20'
                    }`}
                  >
                    <div>
                      <h4 className="text-sm font-black text-gray-900">{path.name}</h4>
                      <p className="text-xs text-gray-500 font-medium mt-1 leading-snug">{path.description}</p>
                    </div>
                    <Check
                      className={`w-5 h-5 flex-shrink-0 transition-opacity ${
                        tempRisePathway === path.id ? 'opacity-100 text-[#0E7850]' : 'opacity-0'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Step 11: Choose Archetype */}
          {setupStep === 11 && (
            <motion.div
              key="step-11"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              <div className="text-center space-y-2">
                <span className="px-3 py-1 bg-emerald-50 text-[#0E7850] text-[10px] font-black uppercase tracking-widest rounded-full border border-emerald-100">
                  Final Step
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                  Choose your Archetype
                </h2>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Select the energy and mindset you embody
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                {ARCHETYPES.map((arch) => (
                  <button
                    key={arch.id}
                    onClick={() => {
                      triggerHaptic(hapticPatterns.light);
                      setTempArchetype(arch.id);
                    }}
                    disabled={isSaving}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between h-32 ${
                      tempArchetype === arch.id
                        ? 'bg-[#0E7850] text-white border-[#0E7850] shadow-md scale-[1.02]'
                        : 'bg-white border-gray-150 text-gray-800 hover:border-[#0E7850]/40 hover:bg-emerald-50/20'
                    }`}
                  >
                    <div>
                      <div className="text-2xl mb-1">{arch.icon}</div>
                      <h4 className="text-xs font-black truncate">{arch.name}</h4>
                    </div>
                    <p
                      className={`text-[9px] line-clamp-2 leading-tight ${
                        tempArchetype === arch.id ? 'opacity-90 text-emerald-50' : 'text-gray-400'
                      }`}
                    >
                      {arch.description}
                    </p>
                  </button>
                ))}
              </div>

              <div className="pt-4">
                <button
                  onClick={handleSaveFinalIdentity}
                  disabled={!tempArchetype || isSaving}
                  className="w-full py-4 bg-[#0E7850] hover:bg-[#0b5f3f] text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-emerald-900/10 active:scale-95 transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>{isSaving ? 'Activating Profile...' : 'Complete Identity Setup'}</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer / Step Back Button */}
      <div className="w-full max-w-xl mx-auto flex items-center justify-between pt-4">
        {setupStep > 1 && (
          <button
            onClick={handleBack}
            className="text-xs font-black uppercase tracking-wider text-gray-400 hover:text-gray-700 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous Step</span>
          </button>
        )}
        <span className="text-[10px] font-bold text-gray-400 ml-auto">
          {progressPercent}% Complete
        </span>
      </div>
    </div>
  );
};

export default IdentitySettings;
