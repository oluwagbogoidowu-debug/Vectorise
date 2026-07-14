import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { Sprint, DailyContent, UserRole, Participant } from '../../types';
import { sprintService } from '../../services/sprintService';
import FormattedText from '../../components/FormattedText';
import LocalLogo from '../../components/LocalLogo';
import { useAuth } from '../../contexts/AuthContext';
import { createPortal } from 'react-dom';
import { auth, db } from '../../services/firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  updateProfile as updateFbProfile, 
  sendEmailVerification, 
  GoogleAuthProvider, 
  signInWithPopup 
} from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { userService } from '../../services/userService';

import { toast } from 'sonner';

const AutoGrowingTextarea: React.FC<{
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}> = ({ value, onChange, placeholder = "What's on your mind...", className = "" }) => {
  const ref = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = () => {
    const el = ref.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`text-gray-950 ${className} overflow-y-auto min-h-[80px]`}
      style={{ maxHeight: "180px" }}
    />
  );
};

const TagInput: React.FC<{
  value: string;
  onChange: (newVal: string) => void;
  maxTags?: number;
  placeholder?: string;
  onNext?: () => void;
}> = ({ value, onChange, maxTags = 10, placeholder = "Type and press Enter...", onNext }) => {
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const tags = useMemo<string[]>(() => {
    if (!value) return [];
    if (value.startsWith("[")) {
      try {
        return JSON.parse(value);
      } catch (err) {
        return [];
      }
    }
    return value.split(",").filter(Boolean);
  }, [value]);

  const addTag = (tag: string) => {
    const cleaned = tag.trim().replace(/^[,\s;]+|[,\s;]+$/g, "");
    if (!cleaned) return;
    
    if (tags.length >= maxTags) {
      setError(`Maximum of ${maxTags} tags allowed`);
      toast.error(`You can only add up to ${maxTags} tags.`);
      return;
    }

    if (tags.some(t => t.toLowerCase() === cleaned.toLowerCase())) {
      setError("This tag is already added");
      return;
    }

    const newTags = [...tags, cleaned];
    onChange(JSON.stringify(newTags));
    setInputValue("");
    setError(null);
  };

  const removeTag = (tIndex: number) => {
    const newTags = [...tags];
    newTags.splice(tIndex, 1);
    onChange(JSON.stringify(newTags));
    setError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "," || e.key === ";") {
      e.preventDefault();
      const val = inputValue.trim();
      if (val) {
        addTag(val);
      } else if (e.key === "Enter" && onNext) {
        onNext();
      }
    } else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text");
    if (!text) return;

    const rawTokens = text.split(/[,;\n]+/).map(t => t.trim()).filter(Boolean);
    if (rawTokens.length === 0) return;

    let addedCount = 0;
    const currentTags = [...tags];

    for (const token of rawTokens) {
      if (currentTags.length >= maxTags) {
        setError(`Maximum of ${maxTags} tags allowed. Paste truncated.`);
        toast.error(`You can only add up to ${maxTags} tags.`);
        break;
      }
      if (!currentTags.some(t => t.toLowerCase() === token.toLowerCase())) {
        currentTags.push(token);
        addedCount++;
      }
    }

    if (addedCount > 0) {
      onChange(JSON.stringify(currentTags));
      setInputValue("");
      setError(null);
    }
  };

  return (
    <div className="w-full text-left">
      <div className="w-full bg-white border border-gray-200 focus-within:ring-4 focus-within:ring-primary/5 focus-within:border-primary transition-all duration-200 rounded-2xl p-3 flex flex-wrap gap-2 items-center">
        {tags.map((tag, tIndex) => (
          <span
            key={tIndex}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black tracking-tight bg-primary/5 text-primary border border-primary/10 hover:bg-primary/10 transition-colors select-none"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tIndex)}
              className="text-primary/40 hover:text-primary transition-colors hover:bg-primary/15 rounded-full p-0.5"
              title={`Remove ${tag}`}
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </span>
        ))}
        
        <input
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={tags.length === 0 ? placeholder : "Add tag..."}
          disabled={tags.length >= maxTags}
          className="flex-1 min-w-[145px] px-2 py-1 text-sm font-medium text-gray-900 outline-none bg-transparent disabled:opacity-50"
        />
      </div>

      {error && (
        <div className="mt-2 px-1 text-[10px] font-black uppercase tracking-widest text-red-500 font-bold lowercase first-letter:uppercase animate-fade-in">
          {error}
        </div>
      )}
    </div>
  );
};

interface SectionHeadingProps {
  children: React.ReactNode;
  color?: string;
  showDot?: boolean;
}

const SectionHeading: React.FC<SectionHeadingProps> = ({
  children,
  color = "primary",
  showDot = false,
}) => (
  <h2
    className={`text-[8px] font-black text-${color} uppercase tracking-[0.4em] mb-4 flex items-center gap-2`}
  >
    {showDot && (
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
    )}
    <span>{children}</span>
  </h2>
);

const SprintPreview: React.FC = () => {
    const { sprintId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { user, loading, checkVerification, logout, deferVerification } = useAuth();
    
    const [sprint, setSprint] = useState<Sprint | null>(location.state?.sprint || null);
    const [isLoading, setIsLoading] = useState(!location.state?.sprint);
    const [activeTaskIndex, setActiveTaskIndex] = useState(0);
    const [taskInputs, setTaskInputs] = useState<string[]>([]);
    const [showSignupModal, setShowSignupModal] = useState(false);
    const [showLockModal, setShowLockModal] = useState(false);
    const [revealedHints, setRevealedHints] = useState<Record<number, boolean>>({});
    const [isInsightExpanded, setIsInsightExpanded] = useState(true);
    const [showBottomCancelConfirm, setShowBottomCancelConfirm] = useState(false);
    
    // Auto-redirect already logged-in users so they never see the preview again
    useEffect(() => {
        if (!loading && user && !showLockModal) {
            sprintService.getUserEnrollments(user.id)
                .then(enrollments => {
                    const enrolled = enrollments.find(e => e.sprint_id === sprintId);
                    if (enrolled) {
                        navigate(`/participant/sprint/${enrolled.id}`, { replace: true });
                    } else {
                        navigate(`/sprint/${sprintId}`, { replace: true });
                    }
                })
                .catch(() => {
                    navigate(`/sprint/${sprintId}`, { replace: true });
                });
        }
    }, [user, loading, showLockModal, sprintId, navigate]);
    
    // 3-slide bottom modal bar states
    const [bottomModalStep, setBottomModalStep] = useState(1); // 1 = locked completion, 2 = signup/login, 3 = verify email
    const [authMode, setAuthMode] = useState<'signup' | 'login'>('signup');
    const [authFirstName, setAuthFirstName] = useState('');
    const [authLastName, setAuthLastName] = useState('');
    const [authEmail, setAuthEmail] = useState('');
    const [authPassword, setAuthPassword] = useState('');
    const [authError, setAuthError] = useState('');
    const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);
    const [isCheckingVerification, setIsCheckingVerification] = useState(false);
    const [resendingVerifyEmail, setResendingVerifyEmail] = useState(false);
    const [createdEnrollmentId, setCreatedEnrollmentId] = useState<string | null>(null);
    
    const previewStepsContainerRef = useRef<HTMLDivElement>(null);
    const isScrollingInternal = useRef(false);

    const prefilledEmail = location.state?.prefilledEmail || localStorage.getItem('guest_email');

    useEffect(() => {
        if (prefilledEmail) {
            setAuthEmail(prefilledEmail);
        }
    }, [prefilledEmail]);

    useEffect(() => {
        if (!showLockModal) {
            setBottomModalStep(1);
            setAuthError('');
            setAuthPassword('');
        }
    }, [showLockModal]);

    const handleGoogleSignIn = async () => {
        const provider = new GoogleAuthProvider();
        setIsSubmittingAuth(true);
        setAuthError('');
        try {
            const res = await signInWithPopup(auth, provider);
            const firebaseUser = res.user;
            toast.success("Connected with Google successfully!");

            if (sprint) {
                // Auto enroll and complete Day 1
                const enrollment = await sprintService.enrollUser(firebaseUser.uid, sprint.id, sprint.duration, {
                    firstActionInput: taskInputs[0],
                    taskInputs: taskInputs
                } as any);

                if (enrollment && enrollment.progress && enrollment.progress[0]) {
                    const updatedProgress = [...enrollment.progress];
                    updatedProgress[0] = {
                        ...updatedProgress[0],
                        completed: true,
                        completedAt: new Date().toISOString(),
                        answers: taskInputs,
                        submission: taskInputs[0]
                    };
                    const enrollmentRef = doc(db, "users", firebaseUser.uid, "enrollments", enrollment.id);
                    await updateDoc(enrollmentRef, { 
                        progress: updatedProgress,
                        last_activity_at: new Date().toISOString()
                    });
                }
                localStorage.removeItem('pending_first_action');
                setShowLockModal(false);
                navigate('/participant/day-success', { state: { day: 1, coinsUnlocked: 10 } });
            }
        } catch (error: any) {
            console.error("Google Sign-In Failure:", error);
            if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
                setAuthError("Google authentication failed. Please try again.");
            }
        } finally {
            setIsSubmittingAuth(false);
        }
    };

    const handleSignUpSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!authFirstName || !authLastName || !authEmail || !authPassword) {
            setAuthError("All fields are required.");
            return;
        }
        setAuthError('');
        setIsSubmittingAuth(true);

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, authEmail.trim().toLowerCase(), authPassword);
            const firebaseUser = userCredential.user;
            await updateFbProfile(firebaseUser, { displayName: `${authFirstName} ${authLastName}` });

            const isCoachRegistration = sprint?.audience && sprint.audience.includes("Coach");
            const newUser: Partial<any> = {
                id: firebaseUser.uid,
                name: `${authFirstName} ${authLastName}`,
                email: authEmail.trim().toLowerCase(),
                role: isCoachRegistration ? UserRole.COACH : UserRole.PARTICIPANT,
                profileImageUrl: `https://ui-avatars.com/api/?name=${authFirstName}+${authLastName}&background=0E7850&color=fff`,
                persona: isCoachRegistration ? 'Coach' : 'Seeker',
                onboardingAnswers: {},
                enrolledSprintIds: [],
                isPartner: false,
                partnerData: null,
                walletBalance: 0,
                referrerId: null,
                referralFirstTouch: null,
                defaultLoginMode: isCoachRegistration ? 'COACH' : undefined,
                coachApplicationSubmitted: isCoachRegistration ? true : undefined,
                coachApplicationApproved: isCoachRegistration ? false : undefined,
                hasCoachProfile: isCoachRegistration ? true : undefined,
                approved: isCoachRegistration ? false : undefined,
                bio: isCoachRegistration ? "Specialized Coach." : "Ready to grow.",
                niche: isCoachRegistration ? "Executive Coaching" : undefined,
            };
            await userService.createUserDocument(firebaseUser.uid, newUser);

            let enrollmentId = "";
            if (sprint) {
                // Auto enroll and complete Day 1
                const enrollment = await sprintService.enrollUser(firebaseUser.uid, sprint.id, sprint.duration, {
                    firstActionInput: taskInputs[0],
                    taskInputs: taskInputs
                } as any);

                if (enrollment && enrollment.progress && enrollment.progress[0]) {
                    const updatedProgress = [...enrollment.progress];
                    updatedProgress[0] = {
                        ...updatedProgress[0],
                        completed: true,
                        completedAt: new Date().toISOString(),
                        answers: taskInputs,
                        submission: taskInputs[0]
                    };
                    const enrollmentRef = doc(db, "users", firebaseUser.uid, "enrollments", enrollment.id);
                    await updateDoc(enrollmentRef, { 
                        progress: updatedProgress,
                        last_activity_at: new Date().toISOString()
                    });
                }
                enrollmentId = enrollment.id;
                setCreatedEnrollmentId(enrollment.id);
                localStorage.removeItem('pending_first_action');
            }

            await sendEmailVerification(firebaseUser);
            toast.success("Account created! Verification email sent.");
            setBottomModalStep(3); // Transition to verification step
        } catch (error: any) {
            console.error("Signup error:", error);
            if (error.code === 'auth/email-already-in-use') setAuthError("Email already in use. Try logging in instead.");
            else if (error.code === 'auth/weak-password') setAuthError("Password must be at least 6 characters.");
            else setAuthError("Account creation failed. Please try again.");
        } finally {
            setIsSubmittingAuth(false);
        }
    };

    const handleLoginSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!authEmail || !authPassword) {
            setAuthError("Email and Password are required.");
            return;
        }
        setAuthError('');
        setIsSubmittingAuth(true);

        try {
            const userCredential = await signInWithEmailAndPassword(auth, authEmail.trim().toLowerCase(), authPassword);
            const firebaseUser = userCredential.user;
            toast.success("Logged in successfully!");

            if (sprint) {
                // Auto enroll and complete Day 1
                const enrollment = await sprintService.enrollUser(firebaseUser.uid, sprint.id, sprint.duration, {
                    firstActionInput: taskInputs[0],
                    taskInputs: taskInputs
                } as any);

                if (enrollment && enrollment.progress && enrollment.progress[0]) {
                    const updatedProgress = [...enrollment.progress];
                    updatedProgress[0] = {
                        ...updatedProgress[0],
                        completed: true,
                        completedAt: new Date().toISOString(),
                        answers: taskInputs,
                        submission: taskInputs[0]
                    };
                    const enrollmentRef = doc(db, "users", firebaseUser.uid, "enrollments", enrollment.id);
                    await updateDoc(enrollmentRef, { 
                        progress: updatedProgress,
                        last_activity_at: new Date().toISOString()
                    });
                }
                setCreatedEnrollmentId(enrollment.id);
                localStorage.removeItem('pending_first_action');

                setShowLockModal(false);
                navigate('/participant/day-success', { state: { day: 1, coinsUnlocked: 10 } });
            }
        } catch (error: any) {
            console.error("Login error:", error);
            if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
                setAuthError("Incorrect email or password.");
            } else {
                setAuthError("Login failed. Please check your credentials.");
            }
        } finally {
            setIsSubmittingAuth(false);
        }
    };

    const handleIHaveVerifiedClick = async () => {
        setIsCheckingVerification(true);
        try {
            const isVerified = await checkVerification();
            if (isVerified) {
                toast.success("Email verified successfully! Welcome.");
                setShowLockModal(false);
                navigate('/', { replace: true });
            } else {
                toast.error("Email is not verified yet. Please click the link in your inbox first!");
            }
        } catch (err) {
            console.error("Verification error", err);
            toast.error("An error occurred during verification check.");
        } finally {
            setIsCheckingVerification(false);
        }
    };

    const handleResendVerificationClick = async () => {
        if (auth.currentUser) {
            setResendingVerifyEmail(true);
            try {
                await sendEmailVerification(auth.currentUser);
                toast.success("Verification link sent to your inbox!");
            } catch (err) {
                toast.error("Failed to resend. Please check back in a moment.");
            } finally {
                setResendingVerifyEmail(false);
            }
        }
    };

    const handleSignOutClick = async () => {
        try {
            await logout();
            setBottomModalStep(1);
            setAuthPassword('');
            setAuthError('');
            setCreatedEnrollmentId(null);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    useEffect(() => {
        if (!isLoading) {
            const timer = setTimeout(() => {
                window.scrollTo(0, 0);
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [isLoading]);

    useEffect(() => {
        if (!sprintId) return;
        
        console.log("[SprintPreview] Initializing subscription or loading static fallback for sprint ID:", sprintId);
        
        // As a reliable and direct fallback, load static sprint data.
        // This is safe from snapshot/permissions issues on Firestore for guest users.
        let active = true;
        sprintService.getSprintById(sprintId)
            .then(data => {
                if (active && data) {
                    console.log("[SprintPreview] Successfully fetched static sprint data:", data.id);
                    setSprint(data);
                    setIsLoading(false);
                }
            })
            .catch(err => {
                console.error("[SprintPreview] Error fetching static sprint data:", err);
            });

        // Also subscribe for realtime updates, wrapping in try/catch to avoid crash if permissions are missing
        let unsubscribe = () => {};
        try {
            unsubscribe = sprintService.subscribeToSprint(sprintId, (data) => {
                if (active && data) {
                    console.log("[SprintPreview] Received realtime sprint details snapshot updates.");
                    setSprint(data);
                    setIsLoading(false);
                }
            });
        } catch (err) {
            console.error("[SprintPreview] Realtime subscription failed (usually expected for guest users):", err);
        }

        return () => {
            active = false;
            unsubscribe();
        };
    }, [sprintId]);

    // Sync Horizontal Scroll Container offset on activeTaskIndex changes
    useEffect(() => {
        if (previewStepsContainerRef.current) {
            const container = previewStepsContainerRef.current;
            const cards = container.querySelectorAll('.action-step-card-item');
            const targetCard = cards[activeTaskIndex] as HTMLElement;
            if (targetCard) {
                isScrollingInternal.current = true;
                container.scrollTo({
                    left: targetCard.offsetLeft - container.offsetLeft,
                    behavior: 'smooth'
                });
                const timer = setTimeout(() => {
                    isScrollingInternal.current = false;
                }, 500);
                return () => clearTimeout(timer);
            }
        }
    }, [activeTaskIndex]);

    const handlePreviewScroll = () => {
        if (isScrollingInternal.current) return;
        if (previewStepsContainerRef.current) {
            const container = previewStepsContainerRef.current;
            const scrollLeft = container.scrollLeft;
            const cardWidth = container.clientWidth;
            if (cardWidth > 0) {
                const index = Math.round(scrollLeft / cardWidth);
                const activePrompts = day1Content?.taskPrompts?.filter(p => p && p.trim()) || (day1Content?.taskPrompt ? [day1Content.taskPrompt] : []);
                if (index >= 0 && index < activePrompts.length && index !== activeTaskIndex) {
                    setActiveTaskIndex(index);
                }
            }
        }
    };

    if (isLoading) {
        return (
            <div className="max-w-2xl mx-auto px-4 py-8 pb-32 animate-pulse space-y-6">
                {/* Back Link Placeholder */}
                <div className="flex justify-between items-center">
                    <div className="h-4 w-28 bg-gray-200 rounded"></div>
                    <div className="h-4 w-16 bg-gray-100 rounded"></div>
                </div>

                {/* Main Heading Block */}
                <div className="space-y-2">
                    <div className="h-8 w-2/3 bg-gray-200 rounded-lg"></div>
                    <div className="h-4 w-1/3 bg-gray-100 rounded"></div>
                </div>

                {/* Daily Insight Card Placeholder */}
                <div className="bg-white rounded-[2rem] border border-gray-100 p-6 flex justify-between items-center">
                    <div className="h-4 w-32 bg-gray-200 rounded"></div>
                    <div className="w-5 h-5 bg-gray-100 rounded-full"></div>
                </div>

                {/* Action Step Card Placeholder */}
                <div className="p-6 bg-[#0E7850]/5 rounded-[2rem] border border-[#0E7850]/10 space-y-4">
                    <div className="h-3.5 w-40 bg-gray-200 rounded"></div>
                    <div className="h-5 w-5/6 bg-gray-200 rounded"></div>
                    <div className="space-y-2 pt-2">
                        <div className="h-3.5 w-full bg-gray-100 rounded"></div>
                        <div className="h-3.5 w-full bg-gray-100 rounded"></div>
                    </div>
                </div>

                {/* Input Fields Placeholder */}
                <div className="bg-white rounded-[2rem] border border-gray-100 p-6 space-y-4">
                    <div className="h-4 w-36 bg-gray-200 rounded"></div>
                    <div className="h-20 w-full bg-gray-100 rounded-2xl"></div>
                </div>

                {/* Bottom Navigation controls */}
                <div className="flex justify-between items-center pt-4">
                    <div className="h-10 w-24 bg-gray-200 rounded-xl"></div>
                    <div className="h-10 w-24 bg-gray-200 rounded-xl"></div>
                </div>
            </div>
        );
    }
    if (!sprint) return <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAFAFA] p-4 text-center"><h2 className="text-base font-black mb-4">Sprint not found.</h2><button onClick={() => navigate('/discover')} className="text-primary font-black uppercase tracking-widest text-xs">Back to Discover</button></div>;

    const day1Content = Array.isArray(sprint.dailyContent) ? sprint.dailyContent.find(dc => dc.day === 1) : undefined;

    const getLinkedTagsForStep = (stepIndex: number): string[] => {
        if (!day1Content) return [];

        // 1. Check if the new taskLinkedSources tells us which steps are linked
        if (Array.isArray(day1Content.taskLinkedSources?.[stepIndex]) && day1Content.taskLinkedSources[stepIndex].length > 0) {
            const allTags: string[] = [];
            day1Content.taskLinkedSources[stepIndex].forEach(srcIndex => {
                if (srcIndex >= 0 && srcIndex < taskInputs.length && taskInputs[srcIndex]) {
                    try {
                        const val = taskInputs[srcIndex];
                        const srcType = String(day1Content.taskInputTypes?.[srcIndex] || "").trim().toLowerCase();
                        if (val.startsWith("[")) {
                            allTags.push(...JSON.parse(val));
                        } else if (srcType === "poll") {
                            allTags.push(val);
                        } else {
                            allTags.push(...val.split(",").filter(Boolean));
                        }
                    } catch (e) {
                        console.error("Error parsing tags for source in preview", srcIndex, e);
                    }
                }
            });
            return Array.from(new Set(allTags)).filter(Boolean);
        }

        // 2. Fallback to legacy structure
        let linkedSourceIndex = -1;
        for (let prevIndex = stepIndex - 1; prevIndex >= 0; prevIndex--) {
            const isLinked = 
                day1Content.taskLinkedToNext?.[prevIndex] === true ||
                (day1Content.taskLinkedToNext?.[prevIndex] as any) === "true";
            if (isLinked) {
                const inputType = String(
                    day1Content.taskInputTypes?.[prevIndex] || ""
                ).trim().toLowerCase();
                if (inputType === "tags" || inputType === "poll") {
                    linkedSourceIndex = prevIndex;
                    break;
                }
            }
        }
        // Robust fallback
        if (linkedSourceIndex === -1) {
            for (let prevIndex = stepIndex - 1; prevIndex >= 0; prevIndex--) {
                const inputType = String(
                    day1Content.taskInputTypes?.[prevIndex] || ""
                ).trim().toLowerCase();
                if (inputType === "tags" || inputType === "poll") {
                    linkedSourceIndex = prevIndex;
                    break;
                }
            }
        }

        if (linkedSourceIndex !== -1 && taskInputs[linkedSourceIndex]) {
            try {
                const val = taskInputs[linkedSourceIndex];
                const srcType = String(day1Content.taskInputTypes?.[linkedSourceIndex] || "").trim().toLowerCase();
                if (val.startsWith("[")) {
                    return JSON.parse(val);
                } else if (srcType === "poll") {
                    return [val];
                } else {
                    return val.split(",").filter(Boolean);
                }
            } catch (e) {
                return [];
            }
        }
        return [];
    };

    const isLinkedTextStep = (stepIndex: number): boolean => {
        return false;
    };

    const isMultiTextStep = (stepIndex: number): boolean => {
        if (!day1Content) return false;
        const type = String(day1Content.taskInputTypes?.[stepIndex] || "").trim().toLowerCase();
        const isText = type === "text" || type === "" || type === "undefined";
        const labels = Array.isArray(day1Content.taskMultiTextLabels?.[stepIndex])
          ? day1Content.taskMultiTextLabels[stepIndex].filter((l: any) => l && String(l).trim().length > 0)
          : [];
        return isText && labels.length > 0;
    };

    const getSpreadTextForLoadedInputs = (stepIndex: number, currentInputs: string[]): string => {
        if (!day1Content) return "";

        // 1. Check if the taskLinkedSources has sources
        if (Array.isArray(day1Content.taskLinkedSources?.[stepIndex]) && day1Content.taskLinkedSources[stepIndex].length > 0) {
            const texts: string[] = [];
            day1Content.taskLinkedSources[stepIndex].forEach(srcIndex => {
                if (srcIndex >= 0) {
                    if (srcIndex < currentInputs.length && currentInputs[srcIndex]) {
                        const val = currentInputs[srcIndex];
                        if (val) {
                            if (val.startsWith("{")) {
                                try {
                                    const parsed = JSON.parse(val);
                                    const parts = Object.values(parsed).filter(Boolean).map(v => String(v));
                                    texts.push(parts.join("\n"));
                                } catch (e) {
                                    texts.push(val);
                                }
                            } else if (val.startsWith("[")) {
                                try {
                                    const parsed = JSON.parse(val);
                                    if (Array.isArray(parsed)) {
                                        texts.push(parsed.join(", "));
                                    } else {
                                        texts.push(val);
                                    }
                                } catch (e) {
                                    texts.push(val);
                                }
                            } else {
                                texts.push(val);
                            }
                        }
                    }
                }
            });
            return texts.join("\n\n");
        }

        // 2. Fallback to legacy structure - only if taskLinkedToNext is true for stepIndex - 1
        let linkedSourceIndex = -1;
        for (let prevIndex = stepIndex - 1; prevIndex >= 0; prevIndex--) {
            const isLinked = 
                day1Content.taskLinkedToNext?.[prevIndex] === true ||
                (day1Content.taskLinkedToNext?.[prevIndex] as any) === "true";
            if (isLinked) {
                linkedSourceIndex = prevIndex;
                break;
            }
        }

        if (linkedSourceIndex !== -1 && currentInputs[linkedSourceIndex]) {
            const val = currentInputs[linkedSourceIndex];
            if (val.startsWith("{")) {
                try {
                    const parsed = JSON.parse(val);
                    const parts = Object.values(parsed).filter(Boolean).map(v => String(v));
                    return parts.join("\n");
                } catch (e) {
                    return val;
                }
            } else if (val.startsWith("[")) {
                try {
                    const parsed = JSON.parse(val);
                    if (Array.isArray(parsed)) {
                        return parsed.join(", ");
                    }
                    return val;
                } catch (e) {
                    return val;
                }
            } else {
                return val;
            }
        }

        return "";
    };

    useEffect(() => {
        if (!day1Content || !taskInputs) return;
        
        const type = String(day1Content.taskInputTypes?.[activeTaskIndex] || "").trim().toLowerCase();
        const isText = type === "text" || type === "" || type === "undefined";
        
        if (isText && !isMultiTextStep(activeTaskIndex)) {
            const currentValue = taskInputs[activeTaskIndex];
            if (!currentValue || currentValue.trim() === "") {
                const spreadValue = getSpreadTextForLoadedInputs(activeTaskIndex, taskInputs);
                if (spreadValue && spreadValue.trim() !== "") {
                    setTaskInputs(prev => {
                        if (prev[activeTaskIndex] === spreadValue) return prev;
                        const updated = [...prev];
                        updated[activeTaskIndex] = spreadValue;
                        return updated;
                    });
                }
            }
        }
    }, [activeTaskIndex, day1Content, taskInputs]);

    return (
        <div className="w-full bg-[#FAFAFA] min-h-screen flex flex-col font-sans text-dark animate-fade-in pb-24">
            <header className="px-6 pt-10 pb-4 max-w-2xl mx-auto w-full sticky top-0 z-50 bg-[#FAFAFA]/90 backdrop-blur-md">
                <div className="flex items-center justify-between">
                    <button onClick={() => navigate(-1)} className="p-2.5 bg-white border border-gray-100 rounded-2xl shadow-sm text-gray-400 active:scale-95 transition-all">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <div className="text-center flex-1 mx-4 min-w-0">
                        <h1 className="text-lg font-black text-gray-900 truncate italic">{sprint.title}</h1>
                    </div>
                    <div className="w-10"></div> {/* Spacer */}
                </div>
            </header>

            <div className="px-6 max-w-2xl mx-auto w-full space-y-6 mt-4">
                {/* Day Selector (Disabled/Preview) */}
                <div className="flex overflow-x-auto gap-4 pb-4 no-scrollbar scroll-smooth px-1 opacity-50">
                    {Array.from({ length: sprint.duration }, (_, i) => i + 1).map((day) => (
                        <div
                            key={day}
                            className={`flex-shrink-0 w-20 h-20 rounded-[1.5rem] flex flex-col items-center justify-center relative transition-all duration-300 ${
                                day === 1 ? 'bg-[#0E7850] text-white shadow-xl' : 'bg-[#F3F4F6] text-gray-400'
                            }`}
                        >
                            <span className={`text-[8px] font-black uppercase tracking-widest ${day === 1 ? 'text-white/60' : 'text-gray-300'}`}>Day</span>
                            <span className="text-3xl font-black leading-none">{day}</span>
                        </div>
                    ))}
                </div>

                <div className="space-y-2 text-left animate-slide-up">
                    <SectionHeading>Today's Insight</SectionHeading>
                    <div className="text-gray-700 font-medium text-base leading-[1.6] max-w-[60ch]">
                        <FormattedText text={day1Content?.lessonText || ""} />
                    </div>
                </div>

                <div className="space-y-6 w-full animate-slide-up relative overflow-hidden">
                    {/* Action Step */}
                    <div className="space-y-6 relative">
                        {(() => {
                            const activePrompts = day1Content?.taskPrompts?.filter(p => p && p.trim()) || (day1Content?.taskPrompt ? [day1Content.taskPrompt] : []);
                            if (activePrompts.length === 0) {
                                return (
                                    <div className="p-6 bg-primary/5 rounded-2xl border border-primary/10 relative overflow-hidden text-center text-gray-400 font-medium text-xs">
                                        No action steps defined yet for Day 1.
                                    </div>
                                );
                            }
                            
                            const prompt = activePrompts[activeTaskIndex] || activePrompts[0] || "";
                            const i = activeTaskIndex;
                            return (
                                <>
                                    <div className="p-6 bg-primary/5 rounded-2xl border border-primary/10 relative overflow-hidden animate-fade-in">
                                        <h2 className="text-[8px] font-black text-primary uppercase tracking-[0.4em] mb-4">Action Step {i + 1} of {activePrompts.length}</h2>
                                        
                                        {day1Content?.taskNotes?.[i] && (
                                            <div className="mb-4 text-left border-l-4 border-emerald-500/30 pl-4 py-1 animate-fade-in text-gray-700 font-bold text-sm sm:text-base leading-relaxed">
                                                <FormattedText text={day1Content.taskNotes[i]} />
                                            </div>
                                        )}

                                        {(() => {
                                            let notesMap: Record<string, string> = {};
                                             const dynamicNoteRawSpec = day1Content?.taskTagNotes?.[i] || '';
                                             const linkedTagsSpec = getLinkedTagsForStep(i);
                                             let isJsonSpec = false;
                                             try {
                                                 if (dynamicNoteRawSpec.trim().startsWith('{')) {
                                                     notesMap = JSON.parse(dynamicNoteRawSpec);
                                                     isJsonSpec = true;
                                                 }
                                             } catch (e) {}

                                             if (linkedTagsSpec.length > 0 && dynamicNoteRawSpec.trim()) {
                                                 if (isJsonSpec) {
                                                     const tagsWithNotesSpec = linkedTagsSpec.filter(tag => notesMap[tag] && notesMap[tag].trim() !== "");
                                                     if (tagsWithNotesSpec.length > 0) {
                                                         return (
                                                             <div className="mb-4 space-y-3 pl-4 border-l-4 border-emerald-500/30 py-1 text-left animate-fade-in">
                                                                 {tagsWithNotesSpec.map((tag, tagIndex) => (
                                                                     <div key={tagIndex} className="text-gray-700 font-bold text-xs sm:text-sm leading-relaxed space-y-1.5 mt-1">
                                                                         <div className="inline-block bg-indigo-50 text-indigo-800 border border-indigo-150 px-2.5 py-0.5 rounded-full font-black italic text-[9px] shadow-sm uppercase">
                                                                             🏷️ {tag}
                                                                         </div>
                                                                         <div className="text-gray-700 font-normal text-sm sm:text-base leading-relaxed pl-1">
                                                                             <FormattedText text={notesMap[tag]} />
                                                                         </div>
                                                                     </div>
                                                                 ))}
                                                             </div>
                                                         );
                                                     }
                                                 } else {
                                                     return (
                                                         <div className="mb-4 text-left border-l-4 border-emerald-500/30 pl-4 py-1.5 animate-fade-in space-y-1.5">
                                                             <div className="text-gray-700 font-bold text-sm sm:text-base leading-relaxed">
                                                                 <FormattedText text={dynamicNoteRawSpec} />
                                                             </div>
                                                             <div className="flex flex-wrap gap-1.5 pt-0.5">
                                                                 {linkedTagsSpec.map((tag, tagIndex) => (
                                                                     <span key={tagIndex} className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-800 border border-indigo-150 px-2.5 py-0.5 rounded-full font-black italic text-[9px] uppercase shadow-sm">
                                                                         🏷️ {tag}
                                                                     </span>
                                                                 ))}
                                                             </div>
                                                         </div>
                                                     );
                                                 }
                                             }
                                             const dummyNotUsed = true;
                                             if (false) { const dummy = day1Content; }
                                            if (day1Content?.taskTagNotes?.[i]) {
                                                try {
                                                    notesMap = JSON.parse(day1Content.taskTagNotes[i]);
                                                } catch (e) {}
                                            }
                                            
                                            const linkedTags = getLinkedTagsForStep(i);
                                            const tagsWithNotes = linkedTags.filter(tag => notesMap[tag] && notesMap[tag].trim() !== "");
                                            
                                            if (tagsWithNotes.length === 0) return null;
                                            
                                            return (
                                                <div className="mb-4 space-y-3 pl-4 border-l-4 border-emerald-500/30 py-1 text-left animate-fade-in bg-amber-500/0">
                                                    {tagsWithNotes.map((tag, tagIndex) => (
                                                        <div key={tagIndex} className="text-gray-700 font-bold text-xs sm:text-sm leading-relaxed space-y-1 mt-1">
                                                            <div className="inline-block bg-indigo-50 text-indigo-800 border border-indigo-100 px-3 py-1 rounded-full font-black italic text-[10px] shadow-sm uppercase">
                                                                {tag}
                                                            </div>
                                                            <div className="text-gray-700 font-bold text-sm sm:text-base leading-relaxed">
                                                                <FormattedText text={notesMap[tag]} />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            );
                                        })()}

                                        <div className={`text-gray-950 font-black text-lg sm:text-xl md:text-2xl leading-relaxed relative ${day1Content?.taskFootnotes?.[i] ? 'mb-2' : 'mb-4'}`}>
                                            <FormattedText text={prompt} />
                                        </div>
                                        {day1Content?.taskFootnotes?.[i] && (
                                            <div className="mb-4 text-left text-emerald-600 font-bold text-sm sm:text-base leading-relaxed animate-fade-in">
                                                <FormattedText text={day1Content.taskFootnotes[i]} />
                                            </div>
                                        )}
                                        {day1Content?.taskHints?.[i] && (
                                            <div className="mb-4">
                                                <button 
                                                    type="button"
                                                    onClick={() => setRevealedHints(prev => ({ ...prev, [i]: !prev[i] }))}
                                                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-widest transition-all ${revealedHints[i] ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-400 hover:text-primary hover:bg-primary/5'}`}
                                                >
                                                    <svg className={`w-2.5 h-2.5 transition-transform duration-300 ${revealedHints[i] ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    <span>Hint</span>
                                                </button>
                                                {revealedHints[i] && (
                                                    <div className="mt-3 p-3 bg-amber-50/50 border border-amber-100/70 rounded-xl text-[11px] sm:text-xs font-medium text-amber-900/90 animate-fade-in leading-relaxed italic">
                                                        <FormattedText text={day1Content.taskHints[i]} />
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {day1Content?.taskInputTypes?.[i] === "tags" ? (
                                            <TagInput
                                                value={taskInputs[i] || ""}
                                                onChange={(newVal) => {
                                                    const newInputs = [...taskInputs];
                                                    newInputs[i] = newVal;
                                                    setTaskInputs(newInputs);
                                                }}
                                                onNext={() => {
                                                    const tagsVal = taskInputs[i];
                                                    const isValid = !!tagsVal && tagsVal !== "[]" && tagsVal !== "";
                                                    if (isValid) {
                                                        if (i < activePrompts.length - 1) {
                                                            setActiveTaskIndex(i + 1);
                                                        } else if (!user) {
                                                            const pendingObj = {
                                                                sprintId: sprint.id,
                                                                pricingType: sprint.pricingType || 'cash',
                                                                firstActionInput: taskInputs[0],
                                                                taskInputs: taskInputs,
                                                                prefilledEmail: prefilledEmail || ''
                                                            };
                                                            localStorage.setItem('pending_first_action', JSON.stringify(pendingObj));
                                                            setShowLockModal(true);
                                                        } else {
                                                            setShowSignupModal(true);
                                                        }
                                                    }
                                                }}
                                                placeholder="Type and press Enter to add tags..."
                                            />
                                        ) : day1Content?.taskInputTypes?.[i] === "note" ? (
                                            <div className="space-y-4 animate-fade-in text-left mb-4">
                                                <div className="p-4 bg-emerald-500/10 border border-emerald-500/15 rounded-2xl flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-black text-emerald-800 uppercase tracking-widest">Informational Step Completed</p>
                                                        <p className="text-xs text-emerald-700 font-medium font-semibold">Review the notes above and click Next to continue.</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : day1Content?.taskInputTypes?.[i] === "poll" ? (
                                            <div className="space-y-2 mb-4">
                                                {(() => {
                                                    let pollOptions: string[] = [];
                                                    let customOptions: string[] = [];
                                                    if (day1Content.taskPollOptions?.[i]) {
                                                        try {
                                                            customOptions = JSON.parse(
                                                                day1Content.taskPollOptions[i],
                                                            );
                                                        } catch (e) {}
                                                    }
                                                    customOptions = customOptions.filter(Boolean);

                                                    // If Tag Note is ON, it does NOT receive tags. The poll acts like standard default.
                                                    // Always merge the dynamic tags from previous steps as choices, regardless of Tag Note active state
                                                    const linkedTags = getLinkedTagsForStep(i);
                                                    pollOptions = Array.from(new Set([...linkedTags, ...customOptions])).filter(Boolean);

                                                    const isMultiSelect = !!day1Content.taskPollMultiSelect?.[i];
                                                    let selectedOpts: string[] = [];
                                                    try {
                                                        if (taskInputs[i] && taskInputs[i].startsWith("[")) {
                                                            selectedOpts = JSON.parse(taskInputs[i]);
                                                        } else if (taskInputs[i]) {
                                                            selectedOpts = [taskInputs[i]];
                                                        }
                                                    } catch (e) {}

                                                    if (pollOptions.length > 6) {
                                                        if (isMultiSelect) {
                                                            return (
                                                                <>
                                                                    <p className="text-[10px] font-black uppercase text-primary tracking-widest pl-1 mb-2 animate-pulse flex items-center gap-1.5 overflow-hidden">
                                                                        <span>☑️ Select one or more:</span>
                                                                    </p>
                                                                    <div className="flex flex-wrap gap-1.5 w-full">
                                                                        {pollOptions
                                                                            .filter(Boolean)
                                                                            .map((opt: string, optIndex: number) => {
                                                                                const isSel = selectedOpts.includes(opt);
                                                                                return (
                                                                                    <button
                                                                                        key={optIndex}
                                                                                        type="button"
                                                                                        onClick={() => {
                                                                                            const newInputs = [...taskInputs];
                                                                                            const indexInSel = selectedOpts.indexOf(opt);
                                                                                            let newSelected: string[];
                                                                                            if (indexInSel !== -1) {
                                                                                                newSelected = selectedOpts.filter(o => o !== opt);
                                                                                            } else {
                                                                                                newSelected = [...selectedOpts, opt];
                                                                                            }
                                                                                            newInputs[i] = JSON.stringify(newSelected);
                                                                                            setTaskInputs(newInputs);
                                                                                        }}
                                                                                        className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all border ${isSel ? "bg-primary text-white border-primary shadow-md" : "bg-gray-50 border-gray-100 text-gray-400 hover:bg-gray-100 hover:text-gray-600"}`}
                                                                                    >
                                                                                        {opt}
                                                                                    </button>
                                                                                );
                                                                            })}
                                                                    </div>
                                                                </>
                                                            );
                                                        }

                                                        return (
                                                            <div className="flex flex-wrap gap-1.5 w-full">
                                                                {pollOptions
                                                                    .filter(Boolean)
                                                                    .map((opt: string, optIndex: number) => {
                                                                        const isSel = taskInputs[i] === opt;
                                                                        return (
                                                                            <button
                                                                                key={optIndex}
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    const newInputs = [...taskInputs];
                                                                                    newInputs[i] = opt;
                                                                                    setTaskInputs(newInputs);
                                                                                }}
                                                                                className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all border ${isSel ? "bg-primary text-white border-primary shadow-md" : "bg-gray-50 border-gray-100 text-gray-400 hover:bg-gray-100 hover:text-gray-600"}`}
                                                                            >
                                                                                {opt}
                                                                            </button>
                                                                        );
                                                                    })}
                                                            </div>
                                                        );
                                                    }

                                                    if (isMultiSelect) {
                                                        return (
                                                            <>
                                                                <p className="text-[10px] font-black uppercase text-primary tracking-widest pl-1 mb-2 animate-pulse flex items-center gap-1.5 overflow-hidden">
                                                                    <span>☑️ Select one or more:</span>
                                                                </p>
                                                                <div className="space-y-2 w-full">
                                                                    {pollOptions
                                                                        .filter(Boolean)
                                                                        .map((opt: string, optIndex: number) => {
                                                                            const isSel = selectedOpts.includes(opt);
                                                                            return (
                                                                                <button
                                                                                    key={optIndex}
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        const newInputs = [...taskInputs];
                                                                                        const indexInSel = selectedOpts.indexOf(opt);
                                                                                        let newSelected: string[];
                                                                                        if (indexInSel !== -1) {
                                                                                            newSelected = selectedOpts.filter(o => o !== opt);
                                                                                        } else {
                                                                                            newSelected = [...selectedOpts, opt];
                                                                                        }
                                                                                        newInputs[i] = JSON.stringify(newSelected);
                                                                                        setTaskInputs(newInputs);
                                                                                    }}
                                                                                    className={`w-full py-3 px-4 rounded-xl text-sm font-bold transition-all text-left border flex items-center justify-between ${isSel ? "bg-primary/10 border-primary text-primary" : "bg-white border-primary/10 hover:border-primary/30 text-gray-700"}`}
                                                                                >
                                                                                    <span>
                                                                                        {String.fromCharCode(65 + optIndex)}. {opt}
                                                                                    </span>
                                                                                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${isSel ? "border-primary bg-primary text-white" : "border-gray-300 bg-white"}`}>
                                                                                        {isSel && (
                                                                                            <svg className="w-2.5 h-2.5 text-white animate-fade-in" fill="none" stroke="currentColor" strokeWidth={4} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                                                                                        )}
                                                                                    </div>
                                                                                </button>
                                                                            );
                                                                        })}
                                                                </div>
                                                            </>
                                                        );
                                                    }

                                                    return pollOptions
                                                        .filter(Boolean)
                                                        .map(
                                                            (opt: string, optIndex: number) => (
                                                                <button
                                                                    key={optIndex}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const newInputs = [
                                                                            ...taskInputs,
                                                                        ];
                                                                        newInputs[i] = opt;
                                                                        setTaskInputs(newInputs);
                                                                    }}
                                                                    className={`w-full py-3 px-4 rounded-xl text-sm font-bold transition-all text-left border ${taskInputs[i] === opt ? "bg-primary/10 border-primary text-primary" : "bg-white border-primary/10 hover:border-primary/30 text-gray-700"}`}
                                                                >
                                                                    {String.fromCharCode(
                                                                        65 + optIndex,
                                                                    )}
                                                                    . {opt}
                                                                </button>
                                                            ),
                                                        );
                                                })()}
                                            </div>
                                        ) : day1Content?.taskInputTypes?.[i] === "mark" ? (
                                            <div className="space-y-4 animate-fade-in text-left mb-4">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const newInputs = [...taskInputs];
                                                        if (newInputs[i] === "Completed") {
                                                            newInputs[i] = "";
                                                        } else {
                                                            newInputs[i] = "Completed";
                                                        }
                                                        setTaskInputs(newInputs);
                                                    }}
                                                    className={`w-full p-4 rounded-2xl border flex items-center justify-between transition-all duration-200 shadow-sm cursor-pointer ${taskInputs[i] === "Completed" ? "bg-emerald-500/10 border-emerald-500/35 text-emerald-950" : "bg-white border-primary/10 hover:border-primary/20 text-gray-700 hover:bg-gray-50/50"}`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${taskInputs[i] === "Completed" ? "border-emerald-500 bg-emerald-500 text-white" : "border-gray-300 bg-white"}`}>
                                                            {taskInputs[i] === "Completed" && (
                                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                                </svg>
                                                            )}
                                                        </div>
                                                        <span className="text-sm font-bold tracking-wide">
                                                            {taskInputs[i] === "Completed" ? "Completed & Verified!" : "Mark as Completed"}
                                                        </span>
                                                    </div>
                                                    {taskInputs[i] === "Completed" && (
                                                        <span className="text-[9px] font-black text-emerald-600 bg-emerald-100 px-2.5 py-0.5 rounded-full uppercase tracking-widest shrink-0">
                                                            DONE
                                                        </span>
                                                    )}
                                                </button>
                                            </div>
                                        ) : (
                                            isLinkedTextStep(i) && getLinkedTagsForStep(i).length > 0 ? (
                                                 <div className="space-y-4 animate-fade-in text-left mb-4">
                                                     {getLinkedTagsForStep(i).map((tag, tagIndex) => {
                                                         let currentAnswers: Record<string, string> = {};
                                                         if (taskInputs[i]) {
                                                             try {
                                                                 if (taskInputs[i].startsWith("{")) {
                                                                     currentAnswers = JSON.parse(taskInputs[i]);
                                                                 } else {
                                                                     currentAnswers = { [getLinkedTagsForStep(i)[0] || "default"]: taskInputs[i] };
                                                                 }
                                                             } catch (e) {
                                                                 currentAnswers = {};
                                                             }
                                                         }
                                                         const tagVal = currentAnswers[tag] || "";
                                                         return (
                                                             <div key={tagIndex} className="space-y-1.5 pl-3 border-l-2 border-primary/20">
                                                                 <div className="flex items-center">
                                                                     <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-primary/10 text-primary">
                                                                         🏷️ {tag}
                                                                     </span>
                                                                 </div>
                                                                 <AutoGrowingTextarea
                                                                     value={tagVal}
                                                                     onChange={(val) => {
                                                                         const newAnswers = { ...currentAnswers, [tag]: val };
                                                                         const newInputs = [...taskInputs];
                                                                         newInputs[i] = JSON.stringify(newAnswers);
                                                                         setTaskInputs(newInputs);
                                                                     }}
                                                                     placeholder={`Your answer for ${tag}...`}
                                                                     className="w-full px-4 py-3 bg-white border border-primary/10 rounded-xl text-sm font-medium focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none transition-all resize-none"
                                                                 />
                                                             </div>
                                                         );
                                                     })}
                                                 </div>
                                             ) : isMultiTextStep(i) ? (
                                                 <div className="space-y-4 animate-fade-in text-left mb-4">
                                                     {(day1Content?.taskMultiTextLabels?.[i] || []).filter((l: any) => l && String(l).trim().length > 0).map((lbl, lblIndex) => {
                                                         let currentAnswers: Record<string, string> = {};
                                                         if (taskInputs[i]) {
                                                             try {
                                                                 if (taskInputs[i].startsWith("{")) {
                                                                     currentAnswers = JSON.parse(taskInputs[i]);
                                                                 } else {
                                                                     currentAnswers = { [(day1Content?.taskMultiTextLabels?.[i] || []).filter((l: any) => l && String(l).trim().length > 0)[0] || "default"]: taskInputs[i] };
                                                                 }
                                                             } catch (e) {
                                                                 currentAnswers = {};
                                                             }
                                                         }
                                                         const labelVal = currentAnswers[lbl] || "";
                                                         return (
                                                             <div key={lblIndex} className="space-y-1.5 pl-3 border-l-2 border-primary/20">
                                                                 <div className="flex items-center">
                                                                     <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-primary/10 text-primary">
                                                                         📝 {lbl}
                                                                     </span>
                                                                 </div>
                                                                 <AutoGrowingTextarea
                                                                     value={labelVal}
                                                                     onChange={(val) => {
                                                                         const newAnswers = { ...currentAnswers, [lbl]: val };
                                                                         const newInputs = [...taskInputs];
                                                                         newInputs[i] = JSON.stringify(newAnswers);
                                                                         setTaskInputs(newInputs);
                                                                     }}
                                                                     placeholder={`Your answer for ${lbl}...`}
                                                                     className="w-full px-4 py-3 bg-white border border-primary/10 rounded-xl text-sm font-medium focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none transition-all resize-none"
                                                                 />
                                                             </div>
                                                         );
                                                     })}
                                                 </div>
                                             ) : (
                                                 <AutoGrowingTextarea 
                                                value={taskInputs[i] || ''}
                                                onChange={(val) => {
                                                    const newInputs = [...taskInputs];
                                                    newInputs[i] = val;
                                                    setTaskInputs(newInputs);
                                                }}
                                                placeholder="What's on your mind..."
                                                 className="w-full px-4 py-3 bg-white border border-primary/10 rounded-xl text-sm font-medium focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none transition-all mb-4 resize-none"
                                             />
                                         ))}
                                        <div className="flex justify-between items-center gap-4 pt-4">
                                            {i > 0 ? (
                                                <button
                                                    type="button"
                                                    onClick={() => setActiveTaskIndex(i - 1)}
                                                    className="px-6 py-2.5 rounded-xl text-xs font-bold transition-all bg-white border border-gray-200 text-gray-500 hover:text-primary hover:border-primary/30 active:scale-95"
                                                >
                                                    Back
                                                </button>
                                            ) : <div />}
                                            
                                            {(() => {
                                                const isTags = day1Content?.taskInputTypes?.[i] === "tags";
                                                const isNote = day1Content?.taskInputTypes?.[i] === "note";
                                                const isMark = day1Content?.taskInputTypes?.[i] === "mark";
                                                const val = taskInputs[i];
                                                let stepCompleted = isNote;
                                                if (isMark) {
                                                    stepCompleted = val === "Completed";
                                                } else if (!isNote && val) {
                                                    if (isTags || (day1Content?.taskInputTypes?.[i] === "poll" && !!day1Content?.taskPollMultiSelect?.[i])) {
                                                        stepCompleted = val !== "[]" && val !== "";
                                                    } else if (isLinkedTextStep(i)) {
                                                        const tags = getLinkedTagsForStep(i);
                                                        if (tags.length > 0) {
                                                            try {
                                                                if (val.startsWith("{")) {
                                                                    const parsed = JSON.parse(val);
                                                                    stepCompleted = tags.every(t => parsed[t] && parsed[t].trim().length > 0);
                                                                } else {
                                                                    stepCompleted = false;
                                                                }
                                                            } catch (e) {
                                                                stepCompleted = false;
                                                            }
                                                        } else {
                                                            stepCompleted = val.trim().length > 0;
                                                        }
                                                    } else if (isMultiTextStep(i)) {
                                                        const labels = Array.isArray(day1Content?.taskMultiTextLabels?.[i])
                                                          ? day1Content.taskMultiTextLabels[i].filter((l: any) => l && String(l).trim().length > 0)
                                                          : [];
                                                        if (labels.length > 0) {
                                                            try {
                                                                if (val.startsWith("{")) {
                                                                    const parsed = JSON.parse(val);
                                                                    stepCompleted = labels.every(lbl => parsed[lbl] && parsed[lbl].trim().length > 0);
                                                                } else {
                                                                    stepCompleted = false;
                                                                }
                                                            } catch (e) {
                                                                stepCompleted = false;
                                                            }
                                                        } else {
                                                            stepCompleted = val.trim().length > 0;
                                                        }
                                                    } else {
                                                        stepCompleted = val.trim().length > 0;
                                                    }
                                                }

                                                return (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (!stepCompleted) return;
                                                            if (i < activePrompts.length - 1) {
                                                                setActiveTaskIndex(i + 1);
                                                            } else {
                                                                if (!user) {
                                                                    const pendingObj = {
                                                                        sprintId: sprint.id,
                                                                        pricingType: sprint.pricingType || 'cash',
                                                                        firstActionInput: taskInputs[0],
                                                                        prefilledEmail: prefilledEmail || ''
                                                                    };
                                                                    localStorage.setItem('pending_first_action', JSON.stringify(pendingObj));
                                                                    setShowLockModal(true);
                                                                } else {
                                                                    setShowSignupModal(true);
                                                                }
                                                            }
                                                        }}
                                                        disabled={!stepCompleted}
                                                        className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${stepCompleted ? "bg-primary text-white hover:shadow-lg hover:shadow-primary/20 cursor-pointer active:scale-95" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}
                                                    >
                                                        {i < activePrompts.length - 1 ? 'Next Step' : 'Complete Action'}
                                                    </button>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                    
                                    {activePrompts.length > 1 && (
                                        <div className="flex justify-center items-center gap-2 mt-8">
                                            {activePrompts.map((_, idx) => (
                                                <button
                                                    type="button"
                                                    key={idx} 
                                                    onClick={() => {
                                                        if (idx <= activeTaskIndex) {
                                                            setActiveTaskIndex(idx);
                                                        }
                                                    }}
                                                    className={`h-1.5 rounded-full transition-all duration-300 ${idx <= activeTaskIndex ? 'cursor-pointer' : 'cursor-not-allowed'} ${idx === activeTaskIndex ? 'w-8 bg-primary' : idx < activeTaskIndex ? 'w-2 bg-primary/40 hover:bg-primary/60' : 'w-2 bg-gray-200'}`}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </>
                            );
                        })()}
                    </div>
                </div>
            </div>

            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in { animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                .animate-slide-up { animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}</style>
            
            {showLockModal && sprint && createPortal(
                <>
                    {/* Backdrop Overlay */}
                    <div 
                        onClick={() => {
                            if (bottomModalStep !== 3) {
                                setShowLockModal(false);
                            }
                        }}
                        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-fade-in" 
                    />
                    
                    {/* Bottom Modal Sheet Container */}
                    <div className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.15)] px-6 pt-8 pb-10 max-w-md mx-auto animate-slide-up border-t border-gray-100 max-h-[92vh] overflow-y-auto no-scrollbar">
                        
                        {/* Drag Pull Indicator line */}
                        <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-6 shrink-0" />

                        {bottomModalStep === 1 && (
                            <div className="text-center animate-fade-in">
                                <div className="w-16 h-16 bg-[#0E7850]/10 rounded-full flex items-center justify-center mx-auto mb-6 text-[#0E7850]">
                                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg md:text-xl font-black text-gray-900 tracking-tight mb-3">
                                    You’ve completed the first day of your sprint.
                                </h3>
                                <p className="text-gray-500 font-semibold text-sm leading-relaxed mb-8">
                                    Create an account to save your progress.
                                </p>
                                
                                <div className="space-y-4">
                                    <button 
                                        onClick={() => {
                                            setBottomModalStep(2);
                                            setAuthMode('signup');
                                        }}
                                        className="w-full py-4 bg-[#0E7850] text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-[#0b5d3e] transition-colors shadow-lg active:scale-95 cursor-pointer"
                                    >
                                        Sign up to continue
                                    </button>
                                    <button 
                                        onClick={() => {
                                            setBottomModalStep(2);
                                            setAuthMode('login');
                                        }}
                                        className="text-[11px] font-extrabold text-[#0E7850] hover:text-[#0b5d3e] hover:underline transition-colors block mx-auto py-1 cursor-pointer"
                                    >
                                        Already have an account Login to proceed
                                    </button>
                                    <button 
                                        onClick={() => setShowLockModal(false)}
                                        className="w-full py-2 text-gray-400 rounded-2xl font-bold uppercase tracking-widest text-[9px] hover:text-gray-500 transition-colors cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}

                        {bottomModalStep === 2 && (
                            <div className="animate-fade-in text-center">
                                <form onSubmit={authMode === 'signup' ? handleSignUpSubmit : handleLoginSubmit} className="space-y-4 text-left">
                                    {authMode === 'signup' && (
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <label className="block text-[8px] font-black text-gray-300 uppercase tracking-widest ml-1">First Name</label>
                                                <input 
                                                    type="text" 
                                                    required 
                                                    value={authFirstName} 
                                                    onChange={(e) => setAuthFirstName(e.target.value)} 
                                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none font-bold text-sm focus:bg-white focus:border-primary/20 transition-all text-gray-900" 
                                                    placeholder="First Name" 
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="block text-[8px] font-black text-gray-300 uppercase tracking-widest ml-1">Last Name</label>
                                                <input 
                                                    type="text" 
                                                    required 
                                                    value={authLastName} 
                                                    onChange={(e) => setAuthLastName(e.target.value)} 
                                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none font-bold text-sm focus:bg-white focus:border-primary/20 transition-all text-gray-900" 
                                                    placeholder="Last Name" 
                                                />
                                            </div>
                                        </div>
                                    )}
                                    
                                    <div className="space-y-1">
                                        <label className="block text-[8px] font-black text-gray-300 uppercase tracking-widest ml-1">Email Address</label>
                                        <input 
                                            type="email" 
                                            required 
                                            value={authEmail} 
                                            onChange={(e) => setAuthEmail(e.target.value)} 
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none font-bold text-sm focus:bg-white focus:border-primary/20 focus:ring-4 focus:ring-primary/5 transition-all text-gray-900" 
                                            placeholder="Email Address" 
                                        />
                                    </div>
                                    
                                    <div className="space-y-1">
                                        <label className="block text-[8px] font-black text-gray-300 uppercase tracking-widest ml-1">
                                            {authMode === 'signup' ? 'Set Password' : 'Password'}
                                        </label>
                                        <input 
                                            type="password" 
                                            required 
                                            value={authPassword} 
                                            onChange={(e) => setAuthPassword(e.target.value)} 
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none font-bold text-sm focus:bg-white focus:border-primary/20 focus:ring-4 focus:ring-primary/5 transition-all text-gray-900" 
                                            placeholder="Password" 
                                        />
                                    </div>

                                    {authError && (
                                        <p className="text-[10px] text-red-600 font-black uppercase text-center mt-2 tracking-wide">
                                            {authError}
                                        </p>
                                    )}

                                    <button 
                                        type="submit" 
                                        disabled={isSubmittingAuth}
                                        className="w-full py-4 bg-primary hover:bg-[#0b5d3e] text-white rounded-2xl shadow-lg text-[10px] font-black uppercase tracking-[0.2em] mt-2 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                        {isSubmittingAuth ? (
                                            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                        ) : (
                                            <>
                                                {authMode === 'signup' ? 'Create Account' : 'Log In'} &rarr;
                                            </>
                                        )}
                                    </button>
                                </form>

                                <div className="relative flex py-3 items-center">
                                    <div className="flex-grow border-t border-gray-100"></div>
                                    <span className="flex-shrink mx-3 text-[8px] font-black text-gray-300 uppercase tracking-widest block">or continue with</span>
                                    <div className="flex-grow border-t border-gray-100"></div>
                                </div>

                                <button 
                                    type="button" 
                                    onClick={handleGoogleSignIn}
                                    disabled={isSubmittingAuth}
                                    className="w-full flex items-center justify-center gap-2.5 py-3 border border-gray-200 rounded-full hover:bg-gray-50 transition-all font-black text-[9px] uppercase tracking-[0.15em] text-gray-700 active:scale-95 disabled:opacity-50 cursor-pointer"
                                >
                                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                        <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.08H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.92l2.85-2.22.81-.6z"/>
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 6.16l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                    </svg>
                                    Google
                                </button>

                                <div className="mt-6 flex flex-col items-center gap-3">
                                    {authMode === 'signup' ? (
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                            Already have an account?{" "}
                                            <button 
                                                onClick={() => { setAuthMode('login'); setAuthError(''); }} 
                                                className="text-primary hover:underline font-extrabold cursor-pointer"
                                            >
                                                Log in
                                            </button>
                                        </p>
                                    ) : (
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                            Don't have an account?{" "}
                                            <button 
                                                onClick={() => { setAuthMode('signup'); setAuthError(''); }} 
                                                className="text-primary hover:underline font-extrabold cursor-pointer"
                                            >
                                                Sign up
                                            </button>
                                        </p>
                                    )}
                                    
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            setBottomModalStep(1);
                                            setAuthError('');
                                        }}
                                        className="text-[9px] font-black text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors cursor-pointer"
                                    >
                                        Back
                                    </button>
                                </div>
                            </div>
                        )}

                        {bottomModalStep === 3 && (
                            <div className="text-center animate-fade-in relative pt-4">
                                {/* Subtle Cancel Button */}
                                <button 
                                    type="button" 
                                    onClick={() => {
                                        setShowBottomCancelConfirm(true);
                                    }}
                                    className="absolute -top-4 left-0 flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200/60 rounded-full text-[9px] font-black text-gray-500 uppercase tracking-widest transition-all active:scale-95 cursor-pointer shadow-sm"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    Cancel
                                </button>

                                <div className="w-16 h-16 bg-primary/5 text-primary rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-[#0E7850]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                
                                <h2 className="text-xl font-black text-gray-900 mb-2 tracking-tight uppercase">
                                    VERIFY YOUR EMAIL
                                </h2>
                                
                                <p className="text-gray-500 text-xs mb-6 font-medium">
                                    We’ve sent a portal link to:<br/>
                                    <span className="text-primary font-black italic break-all">{authEmail}</span>
                                </p>

                                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 mb-6 text-[10px] text-gray-400 font-bold leading-relaxed uppercase tracking-widest text-center">
                                    CLICK THE LINK AND YOU WILL BE AUTOMATICALLY VERIFIED
                                    <span className="block mt-2 font-black text-amber-600">
                                        (YOU CAN ALSO CHECK YOUR SPAM FOR THE EMAIL IF IT HASN’T ARRIVED)
                                    </span>
                                </div>

                                <button 
                                    type="button"
                                    disabled={isCheckingVerification}
                                    onClick={handleIHaveVerifiedClick}
                                    className="w-full py-4 bg-primary hover:bg-[#0b5d3e] text-white rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-lg transition-transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    {isCheckingVerification ? (
                                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                    ) : (
                                        "I'VE CLICKED THE LINK"
                                    )}
                                </button>

                                <div className="flex justify-between gap-4 pt-4 mt-6 border-t border-gray-100">
                                    <button 
                                        type="button"
                                        disabled={resendingVerifyEmail}
                                        onClick={handleResendVerificationClick}
                                        className="text-[9px] font-black text-primary uppercase tracking-widest hover:underline disabled:opacity-50 cursor-pointer"
                                    >
                                        {resendingVerifyEmail ? 'Sending Link...' : 'RESEND EMAIL'}
                                    </button>

                                    <button 
                                        type="button"
                                        onClick={handleSignOutClick}
                                        className="text-[9px] font-black text-red-500 uppercase tracking-widest hover:underline cursor-pointer"
                                    >
                                        SIGN OUT
                                    </button>
                                </div>
                            </div>
                        )}

                    </div>
                </>,
                document.body
            )}

            {showSignupModal && createPortal(
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl p-10 max-w-sm w-full text-center relative overflow-hidden animate-slide-up border border-gray-100">
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 text-primary">
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        <h3 className="text-2xl font-black text-gray-900 tracking-tight mb-2">Unlock Full Sprint</h3>
                        <p className="text-gray-500 font-medium mb-8 text-sm">Sign up to save your progress and continue with the next daily action steps.</p>
                        
                        <div className="space-y-3">
                            <button 
                                onClick={() => navigate('/signup', { state: { prefilledEmail, targetSprintId: sprintId } })}
                                className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-primary/90 transition-colors shadow-lg active:scale-95"
                            >
                                Sign Up to Continue
                            </button>
                            <button 
                                onClick={() => setShowSignupModal(false)}
                                className="w-full py-4 text-gray-500 rounded-2xl font-black uppercase tracking-widest text-[9px] hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {showBottomCancelConfirm && createPortal(
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl p-8 sm:p-10 max-w-sm w-full text-center relative overflow-hidden border border-gray-100">
                        <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-amber-500">
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-black text-gray-900 tracking-tight mb-2">Are you sure?</h3>
                        <p className="text-gray-500 font-medium mb-8 text-sm leading-relaxed">
                            Canceling email verification may limit what you can do. Are you sure you want to continue?
                        </p>
                        
                        <div className="flex gap-4">
                            <button 
                                onClick={() => {
                                    deferVerification();
                                    setShowLockModal(false);
                                    setShowBottomCancelConfirm(false);
                                    navigate('/', { replace: true });
                                }}
                                className="flex-1 py-3 bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-primary/90 transition-colors shadow-lg active:scale-95 cursor-pointer"
                            >
                                Yes
                            </button>
                            <button 
                                onClick={() => setShowBottomCancelConfirm(false)}
                                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-gray-200 transition-colors cursor-pointer"
                            >
                                No
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default SprintPreview;
