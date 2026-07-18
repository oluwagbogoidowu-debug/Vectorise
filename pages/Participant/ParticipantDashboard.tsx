import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../contexts/AuthContext';
import { ParticipantSprint, Sprint, Notification, Participant, Referral, Coach, UserRole } from '../../types';
import { sprintService } from '../../services/sprintService';
import { analyticsService } from '../../services/analyticsService';
import { userService } from '../../services/userService';
import { assetService } from '../../services/assetService';
import { notificationService } from '../../services/notificationService';
import { pushNotificationService } from '../../services/pushNotificationService';
import { toast } from 'sonner';
import { db } from '../../services/firebase';
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore';
import { X, History, Sparkles, Heart, ChevronLeft, ChevronRight } from 'lucide-react';
import LocalLogo from '../../components/LocalLogo';
import ArchetypeAvatar from '../../components/ArchetypeAvatar';
import { ARCHETYPES, GROWTH_AREAS, RISE_PATHWAYS } from '../../constants';
import { CATEGORY_TO_STAGE_MAP, FOCUS_OPTIONS } from '../../services/mockData';
import NextSprintModal from '../../components/NextSprintModal';
import ConfirmModal from '../../components/ConfirmModal';
import FormattedText from '../../components/FormattedText';
import { streakService } from '../../services/streakService';
import { blogService } from '../../services/blogService';
import { paymentService } from '../../services/paymentService';
import { MILESTONES } from '../../services/milestoneConstants';

/**
 * Calculates if a day is locked based on the "Next Midnight" logic.
 * A day is only accessible if the previous day is complete AND it is at least the next calendar day.
 */
const getDayStatus = (enrollment: ParticipantSprint, sprint: Sprint, now: number) => {
    if (!enrollment || !enrollment.progress || !sprint) return { day: 1, isCompleted: false, isLocked: false };
    
    const currentDayIndex = enrollment.progress.findIndex(p => !p.completed);
    
    // If all days are completed
    if (currentDayIndex === -1) {
        return { 
            day: sprint.duration, 
            isCompleted: true, 
            isLocked: false, 
            content: Array.isArray(sprint.dailyContent) ? sprint.dailyContent[sprint.dailyContent.length - 1] : null
        };
    }

    const currentDay = enrollment.progress[currentDayIndex].day;
    const content = Array.isArray(sprint.dailyContent) ? sprint.dailyContent.find(c => c.day === currentDay) : null;

    let isLocked = false;
    let unlockTime = 0;

    if (currentDay > 1) {
        const prevDay = enrollment.progress.find(p => p.day === currentDay - 1);
        if (prevDay?.completedAt) {
            const completedDate = new Date(prevDay.completedAt);
            // Lock until midnight of the next day
            const nextMidnight = new Date(
                completedDate.getFullYear(),
                completedDate.getMonth(),
                completedDate.getDate() + 1,
                0, 0, 0
            ).getTime();
            
            unlockTime = nextMidnight;
            if (now < nextMidnight) isLocked = true;
        }
    }

    return { day: currentDay, isCompleted: false, isLocked, unlockTime, content };
};

const DAY_TEXTS: Record<number, { firstCard: { title: string; subtitle?: string }; secondCard?: { title: string; subtitle?: string } }> = {
  1: {
    firstCard: { title: "Day 1 is ready", subtitle: "Start your Rise." }
  },
  2: {
    firstCard: { title: "Day 2 is ready" },
    secondCard: { title: "You came back.", subtitle: "Keep rising." }
  },
  3: {
    firstCard: { title: "Day 3 is ready" },
    secondCard: { title: "Don't stop now." }
  },
  4: {
    firstCard: { title: "Day 4 is ready" },
    secondCard: { title: "You're building momentum." }
  },
  5: {
    firstCard: { title: "Day 5 is ready" },
    secondCard: { title: "Stay locked in." }
  },
  6: {
    firstCard: { title: "Day 6 is ready" },
    secondCard: { title: "You're almost there." }
  },
  7: {
    firstCard: { title: "Day 7 is ready" },
    secondCard: { title: "Finish what you started." }
  }
};

const ParticipantDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mySprints, setMySprints] = useState<{ enrollment: ParticipantSprint; sprint: Sprint }[]>([]);
  const [enrichedSprints, setEnrichedSprints] = useState<{ enrollment: ParticipantSprint; sprint: Sprint }[]>([]);
  const [queuedSprints, setQueuedSprints] = useState<{ enrollment: ParticipantSprint; sprint: Sprint }[]>([]);
  const [allEnrollments, setAllEnrollments] = useState<ParticipantSprint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [timeToMidnight, setTimeToMidnight] = useState<string>('00:00:00');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isNextSprintModalOpen, setIsNextSprintModalOpen] = useState(false);
  const [isStartingNext, setIsStartingNext] = useState(false);
  const [checkInSprints, setCheckInSprints] = useState<{ enrollment: ParticipantSprint; sprint: Sprint }[]>([]);
  const [confirmCheckIn, setConfirmCheckIn] = useState<{ enrollmentId: string, day: number } | null>(null);
  const autoOpenedRef = useRef(false);
  const [activeSlide, setActiveSlide] = useState<'timer' | 'days'>('timer');
  const [dashboardReferrals, setDashboardReferrals] = useState<Referral[]>([]);
  const [showInviteBanner, setShowInviteBanner] = useState(false);
  const [ignitePosts, setIgnitePosts] = useState<Sprint[]>([]);
  const [blogPosts, setBlogPosts] = useState<Sprint[]>([]);
  const [publishedSprints, setPublishedSprints] = useState<Sprint[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [orchestration, setOrchestration] = useState<Record<string, any>>({});
  const [activePlayIgnite, setActivePlayIgnite] = useState<Sprint | null>(null);
  const [showPulse, setShowPulse] = useState(false);
  const [checkedIgnites, setCheckedIgnites] = useState<Record<string, boolean>>({});
  const [showFloatingIgnite, setShowFloatingIgnite] = useState(true);
  const [showOverviewSheet, setShowOverviewSheet] = useState(false);
  const [overviewStep, setOverviewStep] = useState<'overview' | 'commitment'>('overview');
  const [isCommitted, setIsCommitted] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'coins' | 'card'>('coins');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showStreakText, setShowStreakText] = useState(false);
  const [unlockedUnclaimedMilestone, setUnlockedUnclaimedMilestone] = useState<any | null>(null);
  const [nextToUnlockMilestone, setNextToUnlockMilestone] = useState<any | null>(null);

  const [cardSettings, setCardSettings] = useState<any>({
    blog: true,
    explore: true,
    growth: true,
    impact: true,
    archive: true,
    ignite: true,
    profile: true,
    hallOfRise: true,
  });

  useEffect(() => {
    const docRef = doc(db, 'settings', 'participant_dashboard');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setCardSettings({
          blog: data.blog !== false,
          explore: data.explore !== false,
          growth: data.growth !== false,
          impact: data.impact !== false,
          archive: data.archive !== false,
          ignite: data.ignite !== false,
          profile: data.profile !== false,
          hallOfRise: data.hallOfRise !== false,
        });
      }
    }, (err) => {
      console.error("Error subscribing to cardSettings:", err);
    });
    return () => unsubscribe();
  }, []);

  // Mark active Ignite as checked when opened
  useEffect(() => {
    if (activePlayIgnite) {
      localStorage.setItem(`ignite_checked_${activePlayIgnite.id}`, 'true');
    }
  }, [activePlayIgnite]);

  // Read checked state for all ignites
  useEffect(() => {
    const checkedMap: Record<string, boolean> = {};
    ignitePosts.forEach(post => {
      checkedMap[post.id] = localStorage.getItem(`ignite_checked_${post.id}`) === 'true';
    });
    setCheckedIgnites(checkedMap);
  }, [ignitePosts, activePlayIgnite]);

  const getLocalYYYYMMDD = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const processedIgnitePosts = useMemo(() => {
    if (ignitePosts.length === 0) return [];
    const todayStr = getLocalYYYYMMDD();
    
    // Filter out future-scheduled ignites
    const available = ignitePosts.filter(post => {
      if (!post.igniteDate) return true; // not tagged -> always live
      return post.igniteDate <= todayStr; // tagged -> live once that day arrives
    });

    if (available.length === 0) return [];

    // Prioritize today's specific tagged ignite if one exists
    const todayIgnite = available.find(post => post.igniteDate === todayStr);
    if (todayIgnite) {
      return [todayIgnite, ...available.filter(p => p.id !== todayIgnite.id)];
    }

    return available;
  }, [ignitePosts]);

  const activeIgnite = processedIgnitePosts[0];
  const isIgniteChecked = activeIgnite ? checkedIgnites[activeIgnite.id] : true;

  const lastCompletedStep = useMemo(() => {
    const completedSteps: {
      sprintId: string;
      sprintTitle: string;
      day: number;
      taskPrompt: string;
      submission: string;
      completedAt: number;
    }[] = [];

    for (const item of enrichedSprints) {
      const { enrollment, sprint } = item;
      if (!enrollment || !enrollment.progress || !sprint) continue;
      
      for (const p of enrollment.progress) {
        if (p.completed) {
          const dayContent = Array.isArray(sprint.dailyContent) 
            ? sprint.dailyContent.find(d => d.day === p.day) 
            : null;
          const prompt = dayContent?.taskPrompt || sprint.description || "Daily Focus Step";
          
          const rawSubmission = p.submission || (p.answers && p.answers[0]) || "";
          let cleanedSubmission = rawSubmission;
          if (rawSubmission) {
            const parts = rawSubmission.split(" | ").map(x => x.trim()).filter(Boolean);
            if (parts.length > 0) {
              let lastPart = parts[parts.length - 1];
              if (lastPart.startsWith('[') && lastPart.endsWith(']')) {
                try {
                  const parsed = JSON.parse(lastPart);
                  if (Array.isArray(parsed)) {
                    lastPart = parsed.join(", ");
                  }
                } catch (e) {}
              }
              cleanedSubmission = lastPart
                .replace(/^\[|\]$/g, '')
                .replace(/^["']|["']$/g, '')
                .replace(/["']/g, '')
                .replace(/\\/g, '')
                .trim();
            }
          }

          completedSteps.push({
            sprintId: sprint.id,
            sprintTitle: sprint.title,
            day: p.day,
            taskPrompt: prompt,
            submission: cleanedSubmission,
            completedAt: p.completedAt ? new Date(p.completedAt).getTime() : 0,
          });
        }
      }
    }

    completedSteps.sort((a, b) => b.completedAt - a.completedAt);
    return completedSteps[0] || null;
  }, [enrichedSprints]);

  const recommendedNextSprint = useMemo(() => {
    if (publishedSprints.length === 0) return null;
    const enrolledSprintIds = new Set(allEnrollments.map(e => e.sprint_id));
    const participant = user as Participant;
    const list: Sprint[] = [];
    const seenIds = new Set<string>();

    const addSprint = (sprint: Sprint | undefined) => {
      if (sprint && !enrolledSprintIds.has(sprint.id) && !seenIds.has(sprint.id)) {
        list.push(sprint);
        seenIds.add(sprint.id);
      }
    };

    // 0. Include sprints that override orchestrator
    const overrideSprintsActive = publishedSprints
      .filter(s => s.overrideOrchestrator && !enrolledSprintIds.has(s.id))
      .sort((a, b) => (a.overrideOrder || 0) - (b.overrideOrder || 0));
    overrideSprintsActive.forEach(s => {
      addSprint(s);
    });

    const userFocus = (participant?.onboardingAnswers as any)?.selected_focus || 
                     Object.values(participant?.onboardingAnswers || {}).find(val => FOCUS_OPTIONS.includes(String(val)));

    // 1. Prioritization list from the orchestrator in direction session (slot_dir_sprint) first
    const directionMapping = orchestration['slot_dir_sprint'];
    if (directionMapping) {
      const focusMap = directionMapping.sprintFocusMap || {};
      const prioritiesMap = directionMapping.focusOptionPriorityMap || {};
      const assignedIds = directionMapping.sprintIds || (directionMapping.sprintId ? [directionMapping.sprintId] : []);

      if (userFocus) {
        // Sprints mapped to slot_dir_sprint that have the user's active focus tag
        const matches = assignedIds.filter((id: string) => focusMap[id]?.includes(userFocus));
        const priorities = prioritiesMap[userFocus] || [];
        if (matches.length > 0) {
          matches.sort((a: string, b: string) => {
            const idxA = priorities.indexOf(a);
            const idxB = priorities.indexOf(b);
            if (idxA > -1 && idxB > -1) return idxA - idxB;
            if (idxA > -1) return -1;
            if (idxB > -1) return 1;
            return 0;
          });
          
          matches.forEach((sId: string) => {
            const s = publishedSprints.find(sp => sp.id === sId);
            if (s) addSprint(s);
          });
        }
      }

      // Fallback: If space permits, add any other assigned sprint ids from slot_dir_sprint in original priority order
      assignedIds.forEach((sId: string) => {
        const s = publishedSprints.find(sp => sp.id === sId);
        if (s) addSprint(s);
      });
    }

    // Fallback: any unenrolled sprint or first available
    const unenrolled = publishedSprints.filter(s => !enrolledSprintIds.has(s.id));
    unenrolled.forEach(s => addSprint(s));

    return list[0] || publishedSprints[0] || null;
  }, [publishedSprints, allEnrollments, user, orchestration]);

  // Set default payment method when overview sheet is shown
  useEffect(() => {
    if (showOverviewSheet && recommendedNextSprint) {
      const userBalance = (user as Participant)?.walletBalance || 0;
      const neededCoins = recommendedNextSprint.pointCost || 10;
      if (userBalance >= neededCoins) {
        setPaymentMethod('coins');
      } else {
        setPaymentMethod('card');
      }
    }
  }, [showOverviewSheet, user, recommendedNextSprint]);

  const latestBlogPost = useMemo(() => {
    const staticPosts = blogService.getPosts();
    const approvedDbBlogs = blogPosts.filter(s => s.approvalStatus === 'approved');

    const mappedDbPosts = approvedDbBlogs.map((sprint) => {
      const coach = coaches.find(c => c.id === sprint.coachId);
      const words = (sprint.blogBody || sprint.description || '').split(/\s+/).length;
      const readTimeMin = Math.max(1, Math.round(words / 200));
      
      let publishedAt = 'Recently';
      if (sprint.createdAt) {
        try {
          const date = new Date(sprint.createdAt);
          if (!isNaN(date.getTime())) {
            publishedAt = date.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            });
          }
        } catch (e) {
          console.error(e);
        }
      }

      return {
        id: sprint.id,
        title: sprint.title,
        excerpt: sprint.subtitle || (sprint.description && sprint.description.slice(0, 150) + '...') || 'No description provided.',
        content: sprint.blogBody || sprint.description || '',
        category: (sprint.category as any) || 'Execution',
        readTime: `${readTimeMin} min read`,
        publishedAt,
        author: {
          name: coach?.name || 'Rise Coach',
          role: coach?.niche || coach?.coachNiche || 'Performance Coach',
          avatar: coach?.profileImageUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80'
        },
        coverImage: sprint.blogImage || sprint.coverImageUrl || 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80',
        likes: (sprint as any).likes || 0,
        createdAt: sprint.createdAt || new Date().toISOString()
      };
    });

    const allPosts = [
      ...mappedDbPosts,
      ...staticPosts.map(p => ({
        ...p,
        createdAt: new Date(p.publishedAt).toISOString()
      }))
    ];

    allPosts.sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return timeB - timeA;
    });

    return allPosts[0] || null;
  }, [blogPosts, coaches]);

  // Load published sprints, ignites and blogs in real-time
  useEffect(() => {
    const unsubscribe = sprintService.subscribeToPublishedSprints((published) => {
      // Filter out sprints/blogs/ignites tagged with "Coach" unless the user is a coach or admin
      const allowedSprints = published.filter(s => {
        const isCoachSprint = s.audience && s.audience.includes("Coach");
        if (isCoachSprint) {
          return user?.role === UserRole.COACH || user?.role === UserRole.ADMIN;
        }
        return true;
      });

      const ignites = allowedSprints.filter(s => s.contentType === 'ignite');
      setIgnitePosts(ignites);
      const blogs = allowedSprints.filter(s => s.contentType === 'blog');
      setBlogPosts(blogs);
      const regular = allowedSprints.filter(s => s.contentType !== 'ignite' && s.contentType !== 'blog');
      setPublishedSprints(regular);
    }, (err) => {
      console.error("Failed to load published sprints", err);
    });
    return () => unsubscribe();
  }, [user]);

  // Fetch coaches and orchestration on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dbCoaches, mapping] = await Promise.all([
          userService.getCoaches(),
          sprintService.getOrchestration()
        ]);
        setCoaches(dbCoaches || []);
        setOrchestration(mapping || {});
      } catch (err) {
        console.error("Failed to load coaches/orchestration data", err);
      }
    };
    fetchData();
  }, []);

  const recommendedNextSprintCoach = useMemo(() => {
    if (!recommendedNextSprint) return null;
    const isFoundational = recommendedNextSprint.sprintType === 'Foundational' || 
                          recommendedNextSprint.sprintType === 'Fundamentals' ||
                          recommendedNextSprint.sprintType === 'Core' ||
                          recommendedNextSprint.sprintType === 'Expert' ||
                          recommendedNextSprint.category === 'Growth Fundamentals' || 
                          recommendedNextSprint.category === 'Core Platform Sprint';
    
    const coach = coaches.find(c => c.id === recommendedNextSprint.coachId);
    if (isFoundational) {
        return {
            name: 'Vectorise',
            profileImageUrl: 'https://lh3.googleusercontent.com/d/1jdtxp_51VdLMYNHsmyN-yNFTPN5GFjBd'
        };
    }
    return coach || {
        name: 'Vectorise',
        profileImageUrl: 'https://lh3.googleusercontent.com/d/1jdtxp_51VdLMYNHsmyN-yNFTPN5GFjBd'
    };
  }, [recommendedNextSprint, coaches]);

  useEffect(() => {
    if (!user) return;
    const isDismissed = localStorage.getItem(`invite_banner_dismissed_${user.id}`) === 'true';
    if (!isDismissed) {
      setShowInviteBanner(true);
    }
  }, [user]);

  const handleDismissInviteBanner = () => {
    if (user) {
      localStorage.setItem(`invite_banner_dismissed_${user.id}`, 'true');
    }
    setShowInviteBanner(false);
  };

  useEffect(() => {
    if (!user) return;
    const qRef = query(collection(db, 'users', user.id, 'referrals'));
    const unsubRef = onSnapshot(qRef, (snap) => {
      setDashboardReferrals(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Referral));
    });
    return () => unsubRef();
  }, [user]);

  useEffect(() => {
    const slideTimer = setInterval(() => {
      setActiveSlide(prev => (prev === 'timer' ? 'days' : 'timer'));
    }, 5000);
    return () => clearInterval(slideTimer);
  }, []);

  const isIdentitySet = userService.isIdentitySet(user as Participant);

  const handleExploreClick = (e: React.MouseEvent) => {
    if (!isIdentitySet) {
      e.preventDefault();
      toast.error("Explore Locked", {
        description: "Set your identity in your profile to unlock the Explore page.",
        action: {
          label: "Set Identity",
          onClick: () => navigate('/profile')
        }
      });
    }
  };

  useEffect(() => {
    if (location.state?.showNextSprintPopup) {
        setIsNextSprintModalOpen(true);
        // Clear state to prevent re-opening on refresh
        navigate(location.pathname, { replace: true, state: {} });
    } else if (!isLoading && mySprints.length === 0 && queuedSprints.length > 0 && !isNextSprintModalOpen && !autoOpenedRef.current) {
        // Automatically show modal if no active sprint but queued exists
        setIsNextSprintModalOpen(true);
        autoOpenedRef.current = true;
    }
  }, [location.state, navigate, isLoading, mySprints.length, queuedSprints.length, isNextSprintModalOpen]);

  useEffect(() => {
    if (!user) return;
    
    const checkOtherMilestones = async () => {
      const p = user as Participant;
      const completedSprints = mySprints.filter(e => e.enrollment.progress.every(day => day.completed)).length;
      const daysSinceJoin = Math.max(1, Math.ceil((Date.now() - new Date(p.createdAt || Date.now()).getTime()) / (1000 * 60 * 60 * 24)));
      
      let peopleHelpedCount = p.impactStats?.peopleHelped || 0;
      try {
        const { getDocs, collection, query } = await import('firebase/firestore');
        const snap = await getDocs(query(collection(db, 'users', user.id, 'referrals')));
        peopleHelpedCount = snap.docs.length;
      } catch (err) {
        console.error("Error fetching referrals count on dashboard:", err);
      }

      const stats = {
        completed: completedSprints,
        reflectionsCount: p.shinePostIds?.length || 0,
        streak: p.impactStats?.streak || 0,
        daysActive: daysSinceJoin,
        meaningfulReflections: 0, // Simplified for now
        peopleHelped: peopleHelpedCount
      };

      await userService.checkAndNotifyMilestones(user.id, stats, p.claimedMilestoneIds || []);

      const manualMilestones = MILESTONES.filter(m => !m.isAutoClaim);
      const getStatValue = (id: string) => {
          switch(id) {
              case 's2': return stats.completed;
              case 's4': return stats.completed;
              case 'cm1': return stats.daysActive;
              case 'cm2': return stats.daysActive;
              case 'r1': return stats.meaningfulReflections;
              case 'r2': return stats.meaningfulReflections;
              case 'i1':
              case 'i3':
              case 'i5':
              case 'i10':
              case 'i20':
              case 'i30': return stats.peopleHelped;
              default: return 0;
          }
      };

      const unclaimed = manualMilestones.find(m => {
          const isUnlocked = getStatValue(m.id) >= m.targetValue;
          const isClaimed = (p.claimedMilestoneIds || []).includes(m.id);
          return isUnlocked && !isClaimed;
      });

      setUnlockedUnclaimedMilestone(unclaimed || null);

      const lockedMilestones = manualMilestones.filter(m => {
          const isUnlocked = getStatValue(m.id) >= m.targetValue;
          const isClaimed = (p.claimedMilestoneIds || []).includes(m.id);
          return !isUnlocked && !isClaimed;
      }).map(m => {
          const val = getStatValue(m.id);
          const progress = Math.min(100, (val / m.targetValue) * 100);
          return { ...m, currentValue: val, progress };
      });

      const sortedLocked = lockedMilestones.sort((a, b) => b.progress - a.progress);
      setNextToUnlockMilestone(sortedLocked[0] || null);
    };

    if (!isLoading) {
      checkOtherMilestones();
    }
  }, [user, mySprints.length, isLoading]);

  useEffect(() => {
    if (!user || isLoading || allEnrollments.length === 0) return;
    const checkStreaks = async () => {
      await streakService.checkStreakMilestones(user as Participant, allEnrollments);
    };
    checkStreaks();
  }, [user, allEnrollments, isLoading]);

  useEffect(() => {
    if (!user) return;
    const unsubscribeEnrollments = sprintService.subscribeToUserEnrollments(user.id, async (enrollments) => {
        try {
            const enriched = await Promise.all(enrollments.map(async (enrollment) => {
                const sprint = await sprintService.getSprintById(enrollment.sprint_id);
                return (sprint && enrollment) ? { enrollment, sprint } : null;
            }));
            
            const activeOnly = enriched.filter((item): item is { enrollment: ParticipantSprint; sprint: Sprint } => {
                return item !== null && item.enrollment.status === 'active';
            });
            
            const queuedOnly = enriched.filter((item): item is { enrollment: ParticipantSprint; sprint: Sprint } => {
                return item !== null && item.enrollment.status === 'queued';
            });

            const checkInOnly = enriched.filter((item): item is { enrollment: ParticipantSprint; sprint: Sprint } => {
                return item !== null && item.enrollment.checkInReminderEnabled === true;
            });

             const validEnriched = enriched.filter((x): x is { enrollment: ParticipantSprint; sprint: Sprint } => x !== null);
             setEnrichedSprints(validEnriched);
             setMySprints(activeOnly);
             setQueuedSprints(queuedOnly);
             setCheckInSprints(checkInOnly);
             setAllEnrollments(enrollments);
        } catch (err) {
            console.error("Error enriching enrollments:", err);
        } finally {
            setIsLoading(false);
        }
    }, (error) => {
        console.error("Enrollment subscription error:", error);
        setIsLoading(false);
    });

    const timerInterval = setInterval(() => {
        const currentTime = Date.now();
        setNow(currentTime);
    }, 1000);

    const unsubscribeNotifs = notificationService.subscribeToNotifications(user.id, (newNotifs) => {
        setNotifications(newNotifs);
    });

    return () => {
        clearInterval(timerInterval);
        unsubscribeEnrollments();
        unsubscribeNotifs();
    };
  }, [user]);

  const activeSprintsData = useMemo(() => {
      return mySprints
        .map(item => ({ ...item, status: getDayStatus(item.enrollment, item.sprint, now) }))
        .sort((a, b) => (a.status.isLocked ? 1 : 0) - (b.status.isLocked ? 1 : 0));
  }, [mySprints, now]);

  const tasksReady = activeSprintsData.filter(item => !item.status.isLocked);
  const mainTask = tasksReady[0] || activeSprintsData[0];
  const hasActiveSprints = mySprints.length > 0;
  const allTasksDoneToday = hasActiveSprints && tasksReady.length === 0;

  useEffect(() => {
    if (mainTask?.status?.isLocked && mainTask.status.unlockTime) {
        const diff = mainTask.status.unlockTime - now;
        if (diff > 0) {
            const h = Math.floor(diff / (1000 * 60 * 60));
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((diff % (1000 * 60)) / 1000);
            setTimeToMidnight(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
        } else {
            setTimeToMidnight('00:00:00');
        }
    }
  }, [mainTask, now]);

  const isStepUpLocked = hasActiveSprints && tasksReady.length > 0;

  useEffect(() => {
    if (hasActiveSprints && tasksReady.length === 0) {
      const currentDayKey = mainTask ? `${mainTask.enrollment.id}_${mainTask.enrollment.progress?.length || 0}` : 'generic';
      const sessionKey = `unlocked_pulse_seen_${currentDayKey}`;
      const seen = sessionStorage.getItem(sessionKey);
      
      if (!seen) {
        setShowPulse(true);
        const timer = setTimeout(() => {
          setShowPulse(false);
          sessionStorage.setItem(sessionKey, 'true');
        }, 6500);
        return () => clearTimeout(timer);
      }
    } else {
      setShowPulse(false);
    }
  }, [hasActiveSprints, tasksReady.length, mainTask]);
  
  const isNoProgress = useMemo(() => {
      const completedEvents = allEnrollments.filter(e => e.status === 'completed' || e.progress?.every(p => p.completed));
      if (completedEvents.length > 0) {
          const sortedCompleted = [...completedEvents].sort((a, b) => {
              const dateA = a.completed_at ? new Date(a.completed_at).getTime() : new Date(a.started_at).getTime();
              const dateB = b.completed_at ? new Date(b.completed_at).getTime() : new Date(b.started_at).getTime();
              return dateA - dateB;
          });
          const firstFinished = sortedCompleted[0];
          const finishTime = firstFinished.completed_at ? new Date(firstFinished.completed_at).getTime() : null;
          if (finishTime !== null && !isNaN(finishTime)) {
              const otherSprints = allEnrollments.filter(e => e.id !== firstFinished.id);
              const hasProceeded = otherSprints.length > 0;
              const timeSinceFinish = Date.now() - finishTime;
              const oneDay = 24 * 60 * 60 * 1000;
              if (!hasProceeded && timeSinceFinish >= oneDay) {
                  return true;
              }
          }
      }
      return false;
  }, [allEnrollments]);

  const overallProgress = useMemo(() => {
      if (isNoProgress) return 0;
      if (mySprints.length === 0) return 0;
      const totalDays = mySprints.reduce((acc, curr) => acc + (curr.sprint?.duration || 0), 0);
      const completedDays = mySprints.reduce((acc, curr) => acc + (curr.enrollment?.progress?.filter(p => p.completed).length || 0), 0);
      return totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;
  }, [mySprints, isNoProgress]);

  const overallCompletedDays = useMemo(() => {
      if (isNoProgress) return 0;
      return mySprints.reduce((acc, curr) => acc + (curr.enrollment?.progress?.filter(p => p.completed).length || 0), 0);
  }, [mySprints, isNoProgress]);

  const overallTotalDays = useMemo(() => {
      if (isNoProgress) return 0;
      return mySprints.reduce((acc, curr) => acc + (curr.sprint?.duration || 0), 0);
  }, [mySprints, isNoProgress]);

  const completedDays = useMemo(() => {
    return mainTask?.enrollment?.progress?.filter(p => p.completed).length || 0;
  }, [mainTask]);

  const totalDays = useMemo(() => {
    return mainTask?.sprint?.duration || 0;
  }, [mainTask]);

  const isAfterDay1OfFirstSprint = useMemo(() => {
      return mySprints.some(item => 
          item.enrollment.progress.some(p => p.day === 1 && p.completed) ||
          item.enrollment.progress.some(p => p.day > 1 && p.completed)
      );
  }, [mySprints]);

  const firstCardText = useMemo(() => {
      const day = mainTask?.status?.day || 1;
      return DAY_TEXTS[day]?.firstCard || { title: `Day ${day} is ready`, subtitle: "Start your Rise." };
  }, [mainTask]);

  const secondCardText = useMemo(() => {
      const day = mainTask?.status?.day || 1;
      return DAY_TEXTS[day]?.secondCard || null;
  }, [mainTask]);

  if (!user) return null;

  const isMainTaskLocked = mainTask?.status?.isLocked;
  const mainTaskProgress = mainTask ? Math.round(((mainTask.enrollment?.progress?.filter(p => p.completed).length || 0) / (mainTask.sprint?.duration || 1)) * 100) : 0;

  const cardState = useMemo(() => {
    if (allEnrollments.length === 0 || allEnrollments.every(e => e.status === 'queued')) {
        return 'start_rising';
    } else if (allEnrollments.length > 0 && mySprints.length === 0) {
        return 'keep_rising';
    } else if (hasActiveSprints && tasksReady.length === 0) {
        return 'well_done';
    } else {
        return 'task_ready';
    }
  }, [allEnrollments, mySprints, hasActiveSprints, tasksReady]);

  const completedDaysCount = useMemo(() => {
    return mainTask?.enrollment?.progress?.filter(p => p.completed).length || 1;
  }, [mainTask]);

  const headingText = useMemo(() => {
    if (cardState === 'start_rising') return "First Move";
    if (cardState === 'keep_rising') return "Next Move";
    if (cardState === 'well_done') return `Day ${completedDaysCount} Done`;
    return "Today's Focus";
  }, [cardState, completedDaysCount]);

  const isEligibleForCoachRequest = useMemo(() => {
    if (user?.role === UserRole.COACH) return true;
    return enrichedSprints.some(item => 
      item.sprint?.audience && item.sprint.audience.includes('Coach')
    );
  }, [user, enrichedSprints]);

  // Alternate streak text and come back tomorrow text in well_done state
  useEffect(() => {
    if (cardState === 'well_done') {
      setShowStreakText(false);
      const interval = setInterval(() => {
        setShowStreakText(prev => !prev);
      }, 4000);
      return () => clearInterval(interval);
    } else {
      setShowStreakText(false);
    }
  }, [cardState]);

  const p = user as Participant;
  const currentArchetype = ARCHETYPES.find(a => a.id === p.archetype);

  const handleStartNextSprint = async () => {
    console.log("[Dashboard] handleStartNextSprint clicked. User:", user?.id, "Queued count:", queuedSprints.length);
    if (!user || queuedSprints.length === 0 || isStartingNext) {
        console.log("[Dashboard] handleStartNextSprint early return:", { user: !!user, queuedCount: queuedSprints.length, isStartingNext });
        return;
    }
    
    setIsStartingNext(true);
    try {
        console.log("[Dashboard] Calling sprintService.startNextQueuedSprint...");
        const nextEnrollmentId = await sprintService.startNextQueuedSprint(user.id);
        console.log("[Dashboard] Result from startNextQueuedSprint:", nextEnrollmentId);
        
        if (nextEnrollmentId) {
            navigate(`/participant/sprint/${nextEnrollmentId}`);
        } else {
            userService.queueNotification('error', "Could not start the next sprint. Please try again or contact support.", { duration: 3000 });
        }
    } catch (err) {
        console.error("[Dashboard] Failed to start next sprint", err);
    } finally {
        setIsStartingNext(false);
        setIsNextSprintModalOpen(false);
    }
  };

  const handleCheckIn = async (enrollmentId: string, day: number) => {
    if (!user) return;
    setConfirmCheckIn({ enrollmentId, day });
  };

  const executeCheckIn = async (enrollmentId: string, day: number) => {
    console.log("[Dashboard] executing check-in for enrollment:", enrollmentId, "day:", day);
    const enrollmentItem = checkInSprints.find(s => s.enrollment.id === enrollmentId);
    if (!enrollmentItem) {
      console.error("[Dashboard] enrollment item not found for check-in");
      return;
    }

    const isAlreadyCheckedIn = enrollmentItem.enrollment.checkInHistory?.some(h => h.day === day);
    if (isAlreadyCheckedIn) return;

    try {
        const newHistory = [...(enrollmentItem.enrollment.checkInHistory || []), { day, timestamp: new Date().toISOString() }];
        await sprintService.updateEnrollment(enrollmentId, { checkInHistory: newHistory });
        toast.success(`Day ${day} Check-in confirmed!`);
        if (user?.id) {
            analyticsService.logUserActivity(user.id, enrollmentItem.enrollment.sprint_id, 'check_in').catch(e => console.error("Streak tracking failed:", e));
            pushNotificationService.triggerUpdate(user.id).catch(e => console.error("Push trigger failed:", e));
        }
    } catch (err) {
        console.error("Check-in failed:", err);
        toast.error("Failed to check in. Please try again.");
    }
  };

  const handleStartSprint = async () => {
    if (!user || !recommendedNextSprint || !isCommitted) return;
    
    setIsProcessing(true);
    try {
        if (paymentMethod === 'coins') {
            const userBalance = (user as Participant).walletBalance || 0;
            const neededCoins = recommendedNextSprint.pointCost || 10;
            if (userBalance < neededCoins) {
                toast.error(`Insufficient coins. Please select another payment method or purchase more coins.`);
                setIsProcessing(false);
                return;
            }

            // 1. Process wallet transaction
            await userService.processWalletTransaction(user.id, {
                amount: -neededCoins,
                type: 'purchase',
                description: `Unlocked ${recommendedNextSprint.title} via Credits`,
                auditId: recommendedNextSprint.id
            });

            // 2. Enroll user
            const enrollment = await sprintService.enrollUser(
                user.id, 
                recommendedNextSprint.id, 
                recommendedNextSprint.duration || 7, 
                {
                    coachId: recommendedNextSprint.coachId,
                    pricePaid: 0,
                    currency: recommendedNextSprint.currency || 'NGN',
                    source: 'coin'
                }
            );

            toast.success("Sprint started successfully!");
            setShowOverviewSheet(false);
            
            // Navigate to the newly enrolled sprint
            navigate(`/participant/sprint/${enrollment.id}`);
        } else {
            // Pay via Card (Flutterwave)
            const payload = {
                userId: user.id,
                email: user.email.toLowerCase().trim(),
                sprintId: recommendedNextSprint.id,
                amount: recommendedNextSprint.price || 1000,
                currency: "NGN",
                name: user.name || 'Vectorise User'
            };

            const checkoutUrl = await paymentService.initializeFlutterwave(payload);
            window.location.href = checkoutUrl;
        }
    } catch (err: any) {
        console.error("Error starting sprint:", err);
        toast.error(err.message || "Failed to start sprint. Please try again.");
        setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen w-full bg-[#FDFDFD] font-sans">
        <div className="flex-1 px-4 md:px-6 pt-4 md:pt-6">
          <div className="max-w-screen-md mx-auto w-full flex flex-col">
            {/* Top Cards Skeleton */}
            <div className="grid grid-cols-2 gap-3 md:gap-4 mb-8">
              <div className="h-28 bg-gray-100/70 border border-gray-100/40 rounded-[1.3rem] animate-pulse relative overflow-hidden flex flex-col justify-center p-5">
                <div className="w-24 h-4 bg-gray-200 rounded mb-2" />
                <div className="w-16 h-3 bg-gray-200 rounded" />
              </div>
              <div className="h-28 bg-gray-100/70 border border-gray-100/40 rounded-[1.3rem] animate-pulse relative overflow-hidden flex flex-col justify-center p-5">
                <div className="w-24 h-4 bg-gray-200 rounded mb-2" />
                <div className="w-16 h-3 bg-gray-200 rounded" />
              </div>
            </div>

            {/* Main Action Card Skeleton */}
            <div className="mb-8">
              <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-6 md:p-10 lg:p-12 h-64 flex flex-col justify-between animate-pulse">
                <div className="space-y-3">
                  <div className="w-20 h-2 bg-gray-200 rounded-full" />
                  <div className="w-2/3 h-6 bg-gray-200 rounded-lg" />
                  <div className="w-32 h-2.5 bg-gray-200 rounded-full" />
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="w-12 h-2 bg-gray-200 rounded-full" />
                    <div className="w-24 h-2.5 bg-gray-200 rounded-full" />
                  </div>
                  <div className="h-2 w-full bg-gray-100 rounded-full" />
                  <div className="w-full h-12 bg-gray-200 rounded-2xl md:rounded-3xl" />
                </div>
              </div>
            </div>

            {/* Step Up Your Rise Header Skeleton */}
            <div className="mb-2 px-1">
              <div className="w-28 h-2.5 bg-gray-200 rounded-full animate-pulse" />
            </div>

            {/* Step Up Your Rise List Skeleton */}
            <div className="flex gap-4 overflow-x-auto pb-4 pt-1 px-1 scrollbar-none">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex-shrink-0 w-52 h-20 bg-white border border-gray-100 rounded-[1.2rem] px-4 shadow-sm flex items-center gap-3 animate-pulse">
                  <div className="w-8.5 h-8.5 bg-gray-100 rounded-lg flex-shrink-0" />
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="w-24 h-3 bg-gray-200 rounded" />
                    <div className="w-16 h-2 bg-gray-200 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen w-full bg-[#FDFDFD] font-sans">
      <div className="flex-1 px-4 md:px-6 pt-4 md:pt-6">
          <div className="max-w-screen-md mx-auto w-full flex flex-col">
            
            {cardState === 'task_ready' ? (
                <div className="grid grid-cols-2 gap-3 md:gap-4 mb-8">
                    <div className={`py-3.5 px-4 md:py-4 md:px-5 rounded-[1.3rem] flex flex-col justify-center relative overflow-hidden transition-transform active:scale-[0.98] bg-[#0E7850] text-white shadow-lg ${
                        secondCardText ? 'col-span-1' : 'col-span-2'
                    }`}>
                        <div className="relative z-10 min-w-0 text-left">
                            <p className="text-sm sm:text-base md:text-lg font-black uppercase tracking-tight text-white leading-tight">
                                {firstCardText.title}
                            </p>
                            {firstCardText.subtitle && (
                                <p className="text-[10px] sm:text-xs font-bold text-white/95 mt-1 leading-snug">
                                    {firstCardText.subtitle}
                                </p>
                            )}
                        </div>
                        <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>
                    </div>
                    
                    {secondCardText && (
                        <div className="bg-white border border-gray-100 py-3.5 px-4 md:py-4 md:px-5 rounded-[1.3rem] shadow-sm flex flex-col justify-center relative overflow-hidden transition-transform active:scale-[0.98] col-span-1">
                            <div className="relative z-10 min-w-0 text-left">
                                <p className="text-sm sm:text-base md:text-lg font-black text-gray-950 uppercase tracking-tight leading-tight">
                                    {secondCardText.title}
                                </p>
                                {secondCardText.subtitle && (
                                    <p className="text-[10px] sm:text-xs font-bold text-[#0E7850] mt-1 leading-snug uppercase tracking-wider">
                                        {secondCardText.subtitle}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            ) : cardState === 'well_done' ? (
                <div className="grid grid-cols-2 gap-3 md:gap-4 mb-8">
                    <div className="py-3.5 px-4 md:py-4 md:px-5 rounded-[1.3rem] flex flex-col justify-center relative overflow-hidden transition-transform active:scale-[0.98] bg-[#159E6A] text-white shadow-lg col-span-1">
                        <div className="relative z-10 min-w-0 text-left animate-fade-in">
                            <p className="text-sm sm:text-base md:text-lg font-black uppercase tracking-tight text-white leading-tight">
                                Day {completedDaysCount} Done
                            </p>
                        </div>
                        <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>
                    </div>
                    
                    <div className="bg-white border border-gray-100 py-3.5 px-4 md:py-4 md:px-5 rounded-[1.3rem] shadow-sm flex flex-col justify-center relative overflow-hidden transition-transform active:scale-[0.98] col-span-1 min-h-[72px] md:min-h-[84px]">
                        <div className="relative z-10 min-w-0 text-left w-full">
                            <AnimatePresence mode="wait">
                                {!showStreakText ? (
                                    <motion.div
                                        key="come_back"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.3, ease: "easeOut" }}
                                    >
                                        <p className="text-sm sm:text-base md:text-lg font-black text-gray-950 uppercase tracking-tight leading-tight">
                                            Come back tomorrow.
                                        </p>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="streak_text"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.3, ease: "easeOut" }}
                                    >
                                        <p className="text-sm sm:text-base md:text-lg font-black text-[#0E7850] uppercase tracking-tight leading-tight">
                                            Don’t break the streak.
                                        </p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-3 md:gap-4 mb-8">
                    {/* Your Next Sprint Card */}
                    <Link to="/explore" onClick={handleExploreClick} className="py-3.5 px-4 md:py-4 md:px-5 rounded-[1.3rem] flex flex-col justify-center relative overflow-hidden transition-transform active:scale-[0.98] bg-[#0E7850] text-white shadow-lg col-span-1">
                        <div className="flex items-center gap-2 mb-1.5">
                            <div className="w-5 h-5 md:w-6 md:h-6 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                                <svg className="w-2.5 h-2.5 md:w-3.5 md:h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                                </svg>
                            </div>
                        </div>
                        <div className="relative z-10 min-w-0 text-left">
                            <p className="text-sm sm:text-base md:text-lg font-black uppercase tracking-tight text-white leading-tight">
                                Your<br/>Next Sprint
                            </p>
                        </div>
                        <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>
                    </Link>
                    
                    {/* Keep/Start Rising Card */}
                    <div className="bg-white border border-gray-100 py-3.5 px-4 md:py-4 md:px-5 rounded-[1.3rem] shadow-sm flex flex-col justify-center relative overflow-hidden transition-transform active:scale-[0.98] col-span-1">
                        <div className="flex items-center gap-2 mb-1.5">
                            <div className="w-5 h-5 md:w-6 md:h-6 bg-[#0E7850]/10 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                                {cardState === 'start_rising' ? (
                                    <svg className="w-2.5 h-2.5 md:w-3.5 md:h-3.5 text-[#0E7850]" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                ) : (
                                    <svg className="w-2.5 h-2.5 md:w-3.5 md:h-3.5 text-[#0E7850]" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                    </svg>
                                )}
                            </div>
                        </div>
                        <div className="relative z-10 min-w-0 text-left">
                            <p className="text-sm sm:text-base md:text-lg font-black text-gray-950 uppercase tracking-tight leading-tight">
                                {cardState === 'start_rising' ? (
                                    <>Start<br/>Rising</>
                                ) : (
                                    <>Keep<br/>Rising</>
                                )}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div className="mb-8">
                {isLoading ? (
                    <div className="bg-white rounded-[2.5rem] h-64 animate-pulse border border-gray-100 shadow-sm"></div>
                ) : mainTask && mainTask.sprint ? (
                    <Link to={`/participant/sprint/${mainTask.enrollment.id}`} className="block group">
                        <div className="bg-white rounded-[2.5rem] shadow-[0_20px_50px_-20px_rgba(0,0,0,0.1)] border border-gray-100 relative overflow-hidden flex animate-fade-in group-hover:shadow-xl transition-all duration-500">
                            <div className={`w-2 md:w-3 flex-shrink-0 transition-colors duration-500 ${isMainTaskLocked ? 'bg-amber-400' : 'bg-[#159E6A]'}`}></div>
                            
                            <div className="flex-1 p-6 md:p-10 lg:p-12 flex flex-col">
                                <div className={isMainTaskLocked ? "mb-3 md:mb-4" : "mb-6 md:mb-8"}>
                                    <p className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-[0.1em]">{mainTask.sprint.category}</p>
                                    <h3 className="text-xl md:text-2xl lg:text-3xl font-black text-gray-900 leading-tight tracking-tight mt-1">{mainTask.sprint.title}</h3>
                                    <p className="text-[9px] md:text-[10px] font-black text-gray-500 uppercase tracking-widest mt-2">Day {mainTask.status.day} of {mainTask.sprint.duration}</p>
                                </div>

                                <div className={`mt-auto ${isMainTaskLocked ? 'pt-3 md:pt-4' : 'pt-8'}`}>
                                    {isMainTaskLocked && (
                                        <div className="relative py-6 my-1 overflow-hidden flex items-center min-h-[58px]">
                                            <AnimatePresence mode="wait">
                                                {activeSlide === 'timer' ? (
                                                    <motion.div
                                                        key="timer"
                                                        initial={{ opacity: 0, x: 20 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        exit={{ opacity: 0, x: -20 }}
                                                        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                                                        className="w-full flex items-center justify-start"
                                                    >
                                                        <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-100/60 text-amber-800 px-3 py-1.5 rounded-xl">
                                                            <svg className="w-3.5 h-3.5 animate-pulse text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                                            </svg>
                                                            <span className="text-[10px] sm:text-xs font-black uppercase tracking-wide">
                                                                Next step unlocks in <span className="font-mono text-[11px] sm:text-[13px]">{timeToMidnight}</span>
                                                            </span>
                                                        </div>
                                                    </motion.div>
                                                ) : (
                                                    <motion.div
                                                        key="days"
                                                        initial={{ opacity: 0, x: 20 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        exit={{ opacity: 0, x: -20 }}
                                                        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                                                        className="w-full"
                                                    >
                                                        <div className="flex flex-row flex-nowrap gap-2 items-center overflow-x-auto whitespace-nowrap scrollbar-none">
                                                            {(() => {
                                                                const total = mainTask.sprint.duration || 3;
                                                                const current = mainTask.status.day || 1;
                                                                let visibleDays: number[] = [];
                                                                if (total <= 3) {
                                                                    visibleDays = Array.from({ length: total }, (_, idx) => idx + 1);
                                                                } else {
                                                                    if (current === 1) {
                                                                        visibleDays = [1, 2, 3];
                                                                    } else if (current === total) {
                                                                        visibleDays = [total - 2, total - 1, total];
                                                                    } else {
                                                                        visibleDays = [current - 1, current, current + 1];
                                                                    }
                                                                }
                                                                return visibleDays.map((dayNum) => {
                                                                    if (dayNum < current) {
                                                                        return (
                                                                            <span key={dayNum} className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 border border-emerald-100 text-[#0E7850] rounded-xl text-[10px] md:text-[11px] font-black uppercase tracking-wider flex-shrink-0">
                                                                                Day {dayNum} ✅
                                                                             </span>
                                                                        );
                                                                    } else if (dayNum === current) {
                                                                        return (
                                                                            <span key={dayNum} className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl text-[10px] md:text-[11px] font-black uppercase tracking-wider animate-pulse flex-shrink-0">
                                                                                Day {dayNum} 🔒
                                                                             </span>
                                                                        );
                                                                    } else {
                                                                        return (
                                                                            <span key={dayNum} className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-50 border border-gray-100 text-gray-400 rounded-xl text-[10px] md:text-[11px] font-black uppercase tracking-wider flex-shrink-0">
                                                                                Day {dayNum} 🔒
                                                                             </span>
                                                                        );
                                                                    }
                                                                });
                                                            })()}
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    )}

                                    <div className="flex justify-between items-center mb-1">
                                        <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Progress</p>
                                        <p className="text-xs font-black text-gray-900">{completedDays} of {totalDays} days complete</p>
                                    </div>
                                    <div className={`h-2 w-full bg-gray-100 rounded-full overflow-hidden ${isMainTaskLocked ? 'mb-2 md:mb-3' : 'mb-6'}`}>
                                        <div className="h-full bg-[#0E7850] rounded-full" style={{ width: `${mainTaskProgress}%` }}></div>
                                    </div>
                                    {!isMainTaskLocked && (
                                        <div className="w-full py-4 md:py-5 bg-[#0E7850] text-white rounded-2xl md:rounded-3xl font-black uppercase tracking-[0.3em] text-[10px] md:text-[12px] shadow-2xl shadow-emerald-900/30 flex items-center justify-center gap-3 md:gap-4 group-hover:scale-[1.02] transition-transform active:scale-[0.98]">
                                            Start Day {mainTask.status.day}
                                            <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                            </svg>
                                        </div>
                                    )}
                                </div>


                            </div>
                        </div>
                    </Link>
                ) : (
                    <div 
                        onClick={() => {
                            if (recommendedNextSprint) {
                                setShowOverviewSheet(true);
                                setOverviewStep('overview');
                                setIsCommitted(false);
                            } else {
                                navigate("/explore");
                            }
                        }}
                        className="block group animate-fade-in cursor-pointer text-left"
                    >
                        <div className="bg-white rounded-[2.5rem] shadow-[0_20px_50px_-20px_rgba(0,0,0,0.1)] border border-gray-150 relative overflow-hidden flex flex-col md:flex-row transition-all duration-500 group-hover:shadow-xl min-h-[220px]">
                            {/* Left Image Section */}
                            <div className="w-full md:w-2/5 h-28 md:h-auto relative overflow-hidden">
                                <img 
                                    src={recommendedNextSprint?.coverImageUrl || assetService.URLS.DEFAULT_SPRINT_COVER} 
                                    alt="" 
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                                    onError={(e) => { e.currentTarget.src = assetService.URLS.DEFAULT_SPRINT_COVER; }} 
                                    referrerPolicy="no-referrer"
                                 />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
                                {/* Tag Overlay on the Image */}
                                <div className="absolute top-4 left-4 text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-md bg-rose-50 text-rose-700 border border-rose-100/40 z-20">
                                    See what's next
                                </div>
                                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between z-10">
                                    <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-white/20 text-white backdrop-blur-sm truncate max-w-[110px]">
                                        {recommendedNextSprint?.category || "Growth"}
                                    </span>
                                    <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-rose-500/80 text-white backdrop-blur-sm shrink-0">
                                        {recommendedNextSprint?.duration || 7} Days
                                    </span>
                                </div>
                            </div>
                            
                            {/* Right Content Section */}
                            <div className="flex-1 p-6 md:p-8 flex flex-col justify-between">
                                <div className="mb-4 text-left">
                                    <h3 className="text-xl md:text-2xl lg:text-3xl font-black text-gray-900 leading-tight tracking-tight">{recommendedNextSprint?.title || "Growth Foundations"}</h3>
                                    <p className="text-xs md:text-sm text-gray-500 font-medium leading-relaxed mt-3 line-clamp-3">
                                        {recommendedNextSprint?.description || recommendedNextSprint?.subtitle || "Unlock consistency and start your rise with templates."}
                                    </p>
                                </div>
                                
                                <div className="w-full py-4 bg-[#0E7850] text-white rounded-2xl md:rounded-3xl font-black uppercase tracking-[0.3em] text-[10px] md:text-[11px] shadow-2xl shadow-emerald-900/30 flex items-center justify-center gap-3 md:gap-4 group-hover:scale-[1.01] transition-transform active:scale-[0.98]">
                                    Start This Sprint
                                    <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7-7 7m7-7H3" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {(isAfterDay1OfFirstSprint || !hasActiveSprints) && (
                <div className="mb-8">
                    <style>{`
                        .no-scrollbar::-webkit-scrollbar {
                            display: none;
                        }
                        .no-scrollbar {
                            -ms-overflow-style: none;
                            scrollbar-width: none;
                        }
                        @keyframes unlockPulse {
                            0%, 100% {
                                opacity: 1;
                                filter: grayscale(0%) saturate(100%);
                            }
                            50% {
                                opacity: 0.45;
                                filter: grayscale(40%) saturate(30%);
                            }
                        }
                        .animate-unlock-pulse-card {
                            animation: unlockPulse 1.8s ease-in-out infinite;
                        }
                    `}</style>
                    <div className="flex gap-6 overflow-x-auto pb-4 pt-4 px-1.5 snap-x snap-mandatory no-scrollbar relative items-center">

                        {/* Complete Your Profile Card OR Request Coach Account Card */}
                        {cardSettings.profile && (
                            isEligibleForCoachRequest ? (
                                !(user as any).coachApplicationSubmitted ? (
                                    <Link 
                                        to="/onboarding/coach/welcome"
                                        className="flex-shrink-0 w-60 h-60 bg-white border border-emerald-100 rounded-[2rem] p-5 shadow-sm hover:shadow-md hover:border-emerald-500/20 cursor-pointer flex flex-col justify-between group snap-start animate-fade-in relative"
                                    >
                                        <div className="absolute -top-3 left-6 text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-md bg-emerald-50 text-emerald-700 border border-emerald-100/40 z-20">
                                            Coach Onboarding
                                        </div>

                                        <div className="flex-1 flex flex-col justify-between pt-2">
                                            <div className="space-y-2 mt-2 text-left">
                                                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-100/50 shadow-sm">
                                                    <span>🎓</span>
                                                </div>
                                                <div>
                                                    <h4 className="text-[11px] font-black text-gray-950 leading-tight">
                                                        Request your coach account
                                                    </h4>
                                                    <p className="text-[10px] font-medium text-gray-500 mt-1 leading-snug">
                                                        Request a full coach account to design high-impact sprints and help others rise.
                                                    </p>
                                                </div>
                                            </div>

                                            <div>
                                                <div className="w-full py-2 bg-[#0E7850] hover:bg-[#13a372] text-white rounded-xl text-center font-black uppercase tracking-widest text-[9px] shadow-sm transition-all active:scale-[0.98] mt-2 group-hover:scale-[1.01]">
                                                    [ Request Coach Account ]
                                                </div>
                                                <div className="text-center mt-1.5">
                                                    <span className="text-[9px] font-bold text-gray-400">
                                                        Unlock coaching capabilities
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                ) : (
                                    <div 
                                        className="flex-shrink-0 w-60 h-60 bg-white border border-amber-100 rounded-[2rem] p-5 shadow-sm flex flex-col justify-between snap-start animate-fade-in relative"
                                    >
                                        <div className="absolute -top-3 left-6 text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-md bg-amber-50 text-amber-700 border border-amber-100/40 z-20">
                                            Coach Request Pending
                                        </div>

                                        <div className="flex-1 flex flex-col justify-center pt-2">
                                            <div className="space-y-2 text-left">
                                                <div className="w-10 h-10 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center border border-amber-100/50 shadow-sm animate-pulse mx-auto">
                                                    <span>⏳</span>
                                                </div>
                                                <div className="text-center">
                                                    <h4 className="text-[11px] font-black text-gray-950 leading-tight">
                                                        Application Submitted
                                                    </h4>
                                                    <p className="text-[10px] font-medium text-gray-500 mt-1 leading-snug">
                                                        We are reviewing your application. This usually takes 4 to 5 working days.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            ) : (
                                !isIdentitySet && (
                                    <Link 
                                        to={isStepUpLocked ? "#" : "/profile/settings/identity"} 
                                        onClick={(e) => isStepUpLocked && e.preventDefault()}
                                        className={`flex-shrink-0 w-60 h-60 bg-white border border-gray-150 rounded-[2rem] p-5 shadow-sm transition-all duration-300 flex flex-col justify-between group snap-start animate-fade-in relative ${
                                            isStepUpLocked 
                                            ? 'opacity-40 grayscale pointer-events-none cursor-not-allowed' 
                                            : 'hover:shadow-md hover:border-primary/20 cursor-pointer border-rose-100'
                                        }`}
                                    >
                                        {/* Tag positioned nicely */}
                                        <div className="absolute -top-3 left-6 text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-md bg-rose-50 text-rose-700 border border-rose-100/40 z-20">
                                            Complete Your Profile
                                        </div>

                                        <div className="flex-1 flex flex-col justify-between pt-2">
                                            <div className="space-y-2 mt-2 text-left">
                                                <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center border border-rose-100/50 shadow-sm">
                                                    <span>👤</span>
                                                </div>
                                                <div>
                                                    <h4 className="text-[11px] font-black text-gray-950 leading-tight">
                                                        You’re not fully set up yet
                                                    </h4>
                                                    <p className="text-[10px] font-medium text-gray-500 mt-1 leading-snug">
                                                        Your identity is incomplete. This helps us recommend the right sprint for you.
                                                    </p>
                                                </div>
                                            </div>

                                            <div>
                                                <div className="w-full py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-center font-black uppercase tracking-widest text-[9px] shadow-sm transition-all active:scale-[0.98] mt-2 group-hover:scale-[1.01]">
                                                    [ Complete Identity ]
                                                </div>
                                                <div className="text-center mt-1.5">
                                                    <span className="text-[9px] font-bold text-gray-400">
                                                        Takes less than 1 minute
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                )
                            )
                        )}

                        {/* 1. Read RiseBlog */}
                        {cardSettings.blog && (
                            <Link 
                                to={isStepUpLocked ? "#" : "/blog"} 
                                onClick={(e) => isStepUpLocked && e.preventDefault()}
                                className={`flex-shrink-0 w-60 h-60 bg-white border border-gray-150 rounded-[2rem] shadow-sm transition-all duration-300 flex flex-col justify-between group snap-start animate-fade-in relative ${
                                    isStepUpLocked 
                                    ? 'opacity-40 grayscale pointer-events-none cursor-not-allowed' 
                                    : 'hover:shadow-md hover:border-emerald-500/20 cursor-pointer'
                                } ${showPulse ? 'animate-unlock-pulse-card' : ''}`}
                            >
                                {/* Tag positioned nicely like the impact page milestone cards */}
                                <div className="absolute -top-3 left-6 text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-md bg-emerald-50 text-emerald-700 border border-emerald-100/40 z-20">
                                    Read RiseBlog
                                </div>

                                {latestBlogPost ? (
                                    <div className="flex-1 flex flex-col justify-between h-full">
                                        {/* Top part has the cover image */}
                                        <div className="h-28 w-full relative overflow-hidden rounded-t-[1.95rem]">
                                            <img 
                                                src={latestBlogPost.coverImage} 
                                                alt={latestBlogPost.title} 
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent"></div>
                                            <span className="absolute bottom-2 left-4 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-white/20 text-white backdrop-blur-sm">
                                                {latestBlogPost.category}
                                            </span>
                                        </div>

                                        {/* Bottom part has details */}
                                        <div className="p-4 flex-1 flex flex-col justify-between">
                                            <div className="space-y-1.5 text-left">
                                                <p className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">
                                                    {latestBlogPost.publishedAt} • {latestBlogPost.readTime}
                                                </p>
                                                <h4 className="text-[11px] font-black text-gray-950 tracking-tight leading-snug group-hover:text-primary transition-colors line-clamp-2">
                                                    {latestBlogPost.title}
                                                </h4>
                                            </div>

                                            <div className="flex items-center justify-between pt-2 border-t border-gray-50 mt-2">
                                                <div className="flex items-center gap-1.5">
                                                    <img 
                                                        src={latestBlogPost.author.avatar} 
                                                        alt={latestBlogPost.author.name} 
                                                        className="w-4 h-4 rounded-full object-cover"
                                                    />
                                                    <span className="text-[8px] font-black text-gray-600 uppercase tracking-wider truncate max-w-[100px]">
                                                        {latestBlogPost.author.name}
                                                    </span>
                                                </div>
                                                <span className="text-[9px] font-black uppercase text-[#0E7850] inline-flex items-center gap-0.5">
                                                    Read
                                                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                                                    </svg>
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex-1 flex flex-col justify-center items-center p-6 text-center">
                                        <p className="text-xs font-semibold text-gray-400">No releases found</p>
                                    </div>
                                )}
                            </Link>
                        )}

                        {/* 2. See what's next (only shown if there's an active sprint, to avoid duplicate card when there's no active sprint) */}
                        {cardSettings.explore && hasActiveSprints && (
                            recommendedNextSprint ? (
                                <div 
                                    className={`flex-shrink-0 w-60 h-60 bg-white border border-gray-150 rounded-[2rem] shadow-sm transition-all duration-300 flex flex-col justify-between group snap-start animate-fade-in relative ${
                                        isStepUpLocked 
                                        ? 'opacity-40 grayscale pointer-events-none cursor-not-allowed' 
                                        : 'hover:shadow-md hover:border-rose-500/20'
                                    } ${showPulse ? 'animate-unlock-pulse-card' : ''}`}
                                >
                                    {/* Tag: See what's next */}
                                    <div className="absolute -top-3 left-6 text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-md bg-rose-50 text-rose-700 border border-rose-100/40 z-20">
                                        See what's next
                                    </div>

                                    <div 
                                        onClick={(e) => {
                                            if (isStepUpLocked) return;
                                            navigate(`/sprint/${recommendedNextSprint.id}`);
                                        }}
                                        className="flex-1 flex flex-col justify-between cursor-pointer"
                                    >
                                        {/* Top part: Cover Image stretching to fill */}
                                        <div className="h-28 w-full relative overflow-hidden rounded-t-[1.95rem]">
                                            <img 
                                                src={recommendedNextSprint.coverImageUrl || assetService.URLS.DEFAULT_SPRINT_COVER} 
                                                alt="" 
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                                                onError={(e) => { e.currentTarget.src = assetService.URLS.DEFAULT_SPRINT_COVER; }} 
                                                referrerPolicy="no-referrer"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
                                            
                                            {/* Category & Duration Overlay on the Image */}
                                            <div className="absolute bottom-2 left-4 right-4 flex items-center justify-between z-10">
                                                <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-white/20 text-white backdrop-blur-sm truncate max-w-[110px]">
                                                    {recommendedNextSprint.category || "Growth"}
                                                </span>
                                                <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-rose-500/80 text-white backdrop-blur-sm shrink-0">
                                                    {recommendedNextSprint.duration || 7} Days
                                                </span>
                                            </div>
                                        </div>

                                        {/* Bottom part: Title, Subtitle & Action link inside padding */}
                                        <div className="p-4 pt-3 flex-1 flex flex-col justify-between min-h-0">
                                            <div className="space-y-1 text-left">
                                                <p className="text-[11px] font-black text-gray-950 leading-tight line-clamp-1 group-hover:text-primary transition-colors">
                                                    {recommendedNextSprint.title}
                                                </p>
                                                <p className="text-[9px] text-gray-400 leading-snug line-clamp-3 font-medium">
                                                    {recommendedNextSprint.description || recommendedNextSprint.subtitle || "Unlock consistency and start your rise with templates."}
                                                </p>
                                            </div>

                                            <div 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (isStepUpLocked) return;
                                                    navigate("/explore");
                                                }}
                                                className="pt-2 border-t border-gray-50 flex items-center justify-between cursor-pointer mt-2"
                                            >
                                                <span className="text-[9px] font-black uppercase text-rose-600 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                                                    Explore sprints
                                                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                                                    </svg>
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div 
                                    className={`flex-shrink-0 w-60 h-60 bg-white border border-gray-150 rounded-[2rem] shadow-sm transition-all duration-300 flex flex-col justify-between group snap-start animate-fade-in relative ${
                                        isStepUpLocked 
                                        ? 'opacity-40 grayscale pointer-events-none cursor-not-allowed' 
                                        : 'hover:shadow-md hover:border-rose-500/20'
                                    } ${showPulse ? 'animate-unlock-pulse-card' : ''}`}
                                >
                                    {/* Tag: See what's next */}
                                    <div className="absolute -top-3 left-6 text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-md bg-rose-50 text-rose-700 border border-rose-100/40 z-20">
                                        See what's next
                                    </div>

                                    <div 
                                        onClick={(e) => {
                                            if (isStepUpLocked) return;
                                            navigate("/explore");
                                        }}
                                        className="flex-1 flex flex-col justify-between cursor-pointer"
                                    >
                                        {/* Top part: Cover Image stretching to fill */}
                                        <div className="h-28 w-full relative overflow-hidden rounded-t-[1.95rem]">
                                            <img 
                                                src={assetService.URLS.DEFAULT_SPRINT_COVER} 
                                                alt="" 
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                                                referrerPolicy="no-referrer"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
                                            
                                            {/* Category & Duration Overlay on the Image */}
                                            <div className="absolute bottom-2 left-4 right-4 flex items-center justify-between z-10">
                                                <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-white/20 text-white backdrop-blur-sm">
                                                    GROWTH
                                                </span>
                                                <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-rose-500/80 text-white backdrop-blur-sm shrink-0">
                                                    7 Days
                                                </span>
                                            </div>
                                        </div>

                                        {/* Bottom part: Title, Subtitle & Action link inside padding */}
                                        <div className="p-4 pt-3 flex-1 flex flex-col justify-between min-h-0">
                                            <div className="space-y-1 text-left">
                                                <p className="text-[11px] font-black text-gray-950 leading-tight line-clamp-1 group-hover:text-primary transition-colors">
                                                    Growth Foundations
                                                </p>
                                                <p className="text-[9px] text-gray-400 leading-snug line-clamp-3 font-medium">
                                                    Unlock consistency and start your rise with templates.
                                                </p>
                                            </div>

                                            <div 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (isStepUpLocked) return;
                                                    navigate("/explore");
                                                }}
                                                className="pt-2 border-t border-gray-50 flex items-center justify-between cursor-pointer mt-2"
                                            >
                                                <span className="text-[9px] font-black uppercase text-rose-600 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                                                    Explore sprints
                                                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                                                    </svg>
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        )}

                        {/* Hall of Rise Coins / Next to Unlock Card */}
                        {cardSettings.hallOfRise && (
                            unlockedUnclaimedMilestone ? (
                                <Link 
                                    to={isStepUpLocked ? "#" : "/profile/hall-of-rise"} 
                                    onClick={(e) => isStepUpLocked && e.preventDefault()}
                                    className={`flex-shrink-0 w-60 h-60 bg-white border rounded-[2rem] p-5 shadow-sm transition-all duration-300 flex flex-col justify-between group snap-start animate-fade-in relative ${
                                        isStepUpLocked 
                                        ? 'opacity-40 grayscale pointer-events-none cursor-not-allowed border-gray-150' 
                                        : 'hover:shadow-md hover:border-amber-500/20 cursor-pointer border-amber-200'
                                    }`}
                                >
                                    {/* Tag */}
                                    <div className="absolute -top-3 left-6 text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-md bg-amber-50 text-amber-700 border border-amber-100/40 z-20">
                                        Unclaimed Reward
                                    </div>

                                    <div className="flex-1 flex flex-col justify-between pt-2">
                                        <div className="space-y-2 mt-2 text-left">
                                            <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center border border-amber-100/50 shadow-sm animate-bounce">
                                                <span>🎁</span>
                                            </div>
                                            <div>
                                                <h4 className="text-xs font-black text-gray-950 leading-tight uppercase tracking-tight">
                                                    You have unclaimed coins!
                                                </h4>
                                                <p className="text-[10px] font-bold text-gray-500 mt-1">
                                                    {unlockedUnclaimedMilestone.title}
                                                </p>
                                                <p className="text-[9px] font-medium text-amber-600 mt-0.5">
                                                    Claim it in the Hall of Rise
                                                </p>
                                            </div>
                                        </div>

                                        <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
                                            <span className="text-[9px] font-black uppercase text-amber-600 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                                                Claim Reward
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </span>
                                            <span className="text-[10px] font-mono font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100/50">
                                                +{unlockedUnclaimedMilestone.points} pts
                                            </span>
                                        </div>
                                    </div>
                                </Link>
                            ) : nextToUnlockMilestone ? (
                                <Link 
                                    to={isStepUpLocked ? "#" : "/profile/hall-of-rise"} 
                                    onClick={(e) => isStepUpLocked && e.preventDefault()}
                                    className={`flex-shrink-0 w-60 h-60 bg-white border rounded-[2rem] p-5 shadow-sm transition-all duration-300 flex flex-col justify-between group snap-start animate-fade-in relative ${
                                        isStepUpLocked 
                                        ? 'opacity-40 grayscale pointer-events-none cursor-not-allowed border-gray-150' 
                                        : 'hover:shadow-md hover:border-emerald-500/20 cursor-pointer border-gray-150'
                                    }`}
                                >
                                    {/* Tag */}
                                    <div className="absolute -top-3 left-6 text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-md bg-emerald-50 text-emerald-700 border border-emerald-100/40 z-20">
                                        Next to Unlock
                                    </div>

                                    <div className="flex-1 flex flex-col justify-between pt-2">
                                        <div className="space-y-2 mt-2 text-left">
                                            <div className="w-10 h-10 bg-emerald-50 text-[#0E7850] rounded-xl flex items-center justify-center border border-emerald-100/50 shadow-sm">
                                                <span className="text-lg">{nextToUnlockMilestone.icon || '🏆'}</span>
                                            </div>
                                            <div>
                                                <h4 className="text-xs font-black text-gray-950 leading-tight uppercase tracking-tight line-clamp-1">
                                                    {nextToUnlockMilestone.title}
                                                </h4>
                                                <p className="text-[10px] font-medium text-gray-500 line-clamp-2 mt-0.5">
                                                    {nextToUnlockMilestone.description}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="space-y-2 text-left">
                                            <div className="flex justify-between items-end">
                                                <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">
                                                    Progress
                                                </span>
                                                <span className="text-[9px] font-mono font-black text-[#0E7850]">
                                                    {nextToUnlockMilestone.progress.toFixed(0)}%
                                                </span>
                                            </div>
                                            <div className="h-1.5 w-full bg-gray-50 border border-gray-100/50 rounded-full overflow-hidden">
                                                <div className="h-full bg-[#0E7850] rounded-full transition-all duration-1000" style={{ width: `${nextToUnlockMilestone.progress}%` }}></div>
                                            </div>
                                            <div className="flex justify-between items-center text-[8px] font-bold text-gray-400">
                                                <span>Value: {nextToUnlockMilestone.currentValue} / {nextToUnlockMilestone.targetValue}</span>
                                                <span className="text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100/30">+{nextToUnlockMilestone.points} Coins</span>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ) : (
                                <Link 
                                    to={isStepUpLocked ? "#" : "/profile/hall-of-rise"} 
                                    onClick={(e) => isStepUpLocked && e.preventDefault()}
                                    className={`flex-shrink-0 w-60 h-60 bg-white border border-gray-150 rounded-[2rem] p-5 shadow-sm transition-all duration-300 flex flex-col justify-between group snap-start animate-fade-in relative ${
                                        isStepUpLocked 
                                        ? 'opacity-40 grayscale pointer-events-none cursor-not-allowed' 
                                        : 'hover:shadow-md hover:border-emerald-500/20 cursor-pointer'
                                    }`}
                                >
                                    {/* Tag */}
                                    <div className="absolute -top-3 left-6 text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-md bg-emerald-50 text-emerald-700 border border-emerald-100/40 z-20">
                                        Hall of Rise
                                    </div>

                                    <div className="flex-1 flex flex-col justify-between pt-2">
                                        <div className="space-y-2 mt-2 text-left">
                                            <div className="w-10 h-10 bg-emerald-50 text-[#0E7850] rounded-xl flex items-center justify-center border border-emerald-100/50 shadow-sm">
                                                <span>👑</span>
                                            </div>
                                            <div>
                                                <h4 className="text-xs font-black text-gray-950 leading-tight uppercase tracking-tight">
                                                    Hall of Rise Complete!
                                                </h4>
                                                <p className="text-[10px] font-bold text-gray-400 mt-1">
                                                    You claimed all active milestones!
                                                </p>
                                            </div>
                                        </div>

                                        <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
                                            <span className="text-[9px] font-black uppercase text-emerald-600 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                                                View Badges
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </span>
                                        </div>
                                    </div>
                                </Link>
                            )
                        )}

                        {/* 3. See your rise analysis */}
                        {cardSettings.growth && (
                            <Link 
                                to={isStepUpLocked ? "#" : "/growth"} 
                                onClick={(e) => isStepUpLocked && e.preventDefault()}
                                className={`flex-shrink-0 w-60 h-60 bg-white border border-gray-150 rounded-[2rem] p-5 shadow-sm transition-all duration-300 flex flex-col justify-between group snap-start animate-fade-in relative ${
                                    isStepUpLocked 
                                    ? 'opacity-40 grayscale pointer-events-none cursor-not-allowed' 
                                    : 'hover:shadow-md hover:border-emerald-500/20 cursor-pointer'
                                } ${showPulse ? 'animate-unlock-pulse-card' : ''}`}
                            >
                                {/* Tag positioned nicely like the impact page milestone cards */}
                                <div className="absolute -top-3 left-6 text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-md bg-emerald-50 text-[#0E7850] border border-emerald-100/40 z-10">
                                    See your rise analysis
                                </div>

                                {/* Content of the card */}
                                <div className="flex-1 flex flex-col justify-between pt-2">
                                    <div className="space-y-2 mt-2 text-left">
                                        <div className="w-10 h-10 bg-emerald-50 text-[#0E7850] rounded-xl flex items-center justify-center border border-emerald-100/50 shadow-sm">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-black text-gray-950 leading-tight group-hover:text-[#0E7850] transition-colors">
                                                See your rise analysis
                                            </h4>
                                            <p className="text-[10px] font-bold text-gray-400 mt-1">
                                                Track your overall performance and sprint metrics.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5 text-left">
                                        <div className="flex justify-between items-end">
                                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                                Overall
                                            </span>
                                            <span className="text-[11px] font-mono font-black text-[#0E7850]">
                                                {overallProgress}%
                                            </span>
                                        </div>
                                        <div className="h-1.5 w-full bg-gray-50 border border-gray-100/50 rounded-full overflow-hidden">
                                            <div className="h-full bg-[#0E7850] rounded-full transition-all duration-1000" style={{ width: `${overallProgress}%` }}></div>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        )}

                        {/* 4. Become a Catalyst */}
                        {cardSettings.impact && (
                            <Link 
                                to={isStepUpLocked ? "#" : "/impact"} 
                                onClick={(e) => isStepUpLocked && e.preventDefault()}
                                className={`flex-shrink-0 w-60 h-60 bg-white border border-gray-150 rounded-[2rem] p-5 shadow-sm transition-all duration-300 flex flex-col justify-between group snap-start animate-fade-in relative ${
                                    isStepUpLocked 
                                    ? 'opacity-40 grayscale pointer-events-none cursor-not-allowed' 
                                    : 'hover:shadow-md hover:border-emerald-500/20 cursor-pointer'
                                } ${showPulse ? 'animate-unlock-pulse-card' : ''}`}
                            >
                                {/* Tag positioned nicely like the impact page milestone cards */}
                                <div className="absolute -top-3 left-6 text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-md bg-emerald-50 text-emerald-700 border border-emerald-100/40 z-10">
                                    Become a Catalyst
                                </div>

                                {/* Content of the card */}
                                <div className="flex-1 flex flex-col justify-between pt-2">
                                    <div className="space-y-2 mt-2 text-left">
                                        <div className="w-10 h-10 bg-emerald-50 text-[#0E7850] rounded-xl flex items-center justify-center border border-emerald-100/50 shadow-sm">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                            </svg>
                                        </div>
                                        <p className="text-sm font-black text-gray-950 leading-tight">
                                            Help someone to start their growth journey today and be rewarded for it.
                                        </p>
                                    </div>

                                    <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
                                        <span className="text-[10px] font-black uppercase text-[#0E7850] group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                                            Learn More
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        )}

                        {/* 5. Revisit your Rise */}
                        {cardSettings.archive && (
                            <Link 
                                to={isStepUpLocked ? "#" : (lastCompletedStep ? `/profile/archive?sprintId=${lastCompletedStep.sprintId}` : "/profile/archive")} 
                                onClick={(e) => isStepUpLocked && e.preventDefault()}
                                className={`flex-shrink-0 w-60 h-60 bg-white border border-gray-150 rounded-[2rem] p-5 shadow-sm transition-all duration-300 flex flex-col justify-between group snap-start animate-fade-in relative ${
                                    isStepUpLocked 
                                    ? 'opacity-40 grayscale pointer-events-none cursor-not-allowed' 
                                    : 'hover:shadow-md hover:border-indigo-500/20 cursor-pointer'
                                } ${showPulse ? 'animate-unlock-pulse-card' : ''}`}
                            >
                                {/* Tag positioned nicely like the impact page milestone cards */}
                                <div className="absolute -top-3 left-6 text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-md bg-indigo-50 text-indigo-700 border border-indigo-100/40 z-10">
                                    Revisit your Rise
                                </div>

                                {/* Content of the card */}
                                <div className="flex-1 flex flex-col justify-between pt-2">
                                    {lastCompletedStep ? (
                                        <div className="flex-1 flex flex-col min-h-0">
                                            <div className="flex-1 flex flex-col min-w-0 text-left min-h-0">
                                                <p className="text-[9px] font-black text-indigo-600 uppercase tracking-wider truncate">
                                                    {lastCompletedStep.sprintTitle} • Day {lastCompletedStep.day}
                                                </p>
                                                <p className="text-[11px] font-black text-gray-950 leading-tight line-clamp-2 mt-1">
                                                    {lastCompletedStep.taskPrompt}
                                                </p>
                                                <p className="flex-1 text-[11px] text-gray-500 italic leading-snug bg-gray-50 p-2.5 rounded-xl border border-gray-100/50 mt-2 font-medium overflow-y-auto">
                                                    {lastCompletedStep.submission}
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex-1 flex flex-col justify-center items-center text-center py-4">
                                            <p className="text-xs font-semibold text-gray-400 max-w-[160px]">
                                                No daily steps completed yet. Complete your focus to start your archive!
                                            </p>
                                        </div>
                                    )}

                                    <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
                                        <span className="text-[10px] font-black uppercase text-indigo-600 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                                            Explore your archive
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        )}
                    </div>
                    {isStepUpLocked && (
                        <div className="flex justify-center mt-2 animate-fade-in select-none">
                            <span className="text-[7.5px] md:text-[8px] font-black text-gray-400 bg-gray-50/80 px-2.5 py-1 rounded-full uppercase tracking-[0.15em] flex items-center gap-1.5 border border-gray-100 shadow-sm">
                                <svg className="w-2.5 h-2.5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                </svg>
                                Locked until Daily Action Complete
                            </span>
                        </div>
                    )}
                </div>
            )}

            {checkInSprints.length > 0 && (
                <div className="mb-8 space-y-4">
                    {checkInSprints.map(({ enrollment, sprint }) => (
                        <div key={enrollment.id} className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm animate-fade-in">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <Link to={`/participant/sprint/${enrollment.id}?day=${sprint.duration}`} className="group/title block">
                                        <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1 group-hover/title:text-primary/70 transition-colors">Daily Check-in: {sprint.title}</h3>
                                    </Link>
                                    <p className="text-sm font-black text-gray-900">Active for {sprint.checkInReminderDays || 0} days</p>
                                </div>
                                <div className="text-right max-w-[150px]">
                                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Last Sprint Submission</p>
                                    <p className="text-[10px] font-bold text-gray-600 line-clamp-2 italic">
                                        "{(() => {
                                            const lastDayProg = enrollment.progress.find(p => p.day === sprint.duration);
                                            return lastDayProg?.submission || 'No submission recorded';
                                        })()}"
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {Array.from({ length: sprint.checkInReminderDays || 0 }, (_, i) => i + 1).map((day) => {
                                    const isCheckedIn = enrollment.checkInHistory?.some(h => h.day === day);
                                    return (
                                        <button
                                            key={day}
                                            onClick={() => handleCheckIn(enrollment.id, day)}
                                            disabled={isCheckedIn}
                                            className={`px-3 py-2 rounded-xl text-[10px] font-black transition-all active:scale-95 ${
                                                isCheckedIn 
                                                ? 'bg-primary/10 text-primary border border-primary/20' 
                                                : 'bg-gray-50 text-gray-400 border border-gray-100 hover:border-primary/30'
                                            }`}
                                        >
                                            Day {day} {isCheckedIn ? '✓' : ''}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Overview / Commitment / Payment Bottom Sheet Modal */}
            <AnimatePresence>
                {showOverviewSheet && recommendedNextSprint && (
                    <>
                        <div 
                            className="fixed inset-0 bg-black/60 z-[100] backdrop-blur-sm transition-opacity duration-300 animate-fade-in-quick"
                            onClick={() => !isProcessing && setShowOverviewSheet(false)}
                        />
                        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white rounded-t-[2.5rem] shadow-[0_-15px_40px_rgba(0,0,0,0.15)] border-t border-gray-100 z-[101] p-5 sm:p-6 overflow-y-auto max-h-[60vh] sm:max-h-[55vh] pb-6 animate-slide-up-quick text-left">
                            {/* Drag Handle indicator */}
                            <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-4"></div>
                            
                            {overviewStep === 'overview' ? (
                                // Step 1: Overview
                                <div>
                                    {/* Close button */}
                                    <button 
                                        onClick={() => setShowOverviewSheet(false)}
                                        className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>

                                    {/* Category / Duration */}
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#0E7850] bg-[#0E7850]/5 px-2.5 py-1 rounded-lg">
                                            {recommendedNextSprint.category || "Growth"}
                                        </span>
                                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg">
                                            {recommendedNextSprint.duration || 7} Days
                                        </span>
                                    </div>

                                    {/* Sprint Title */}
                                    <h3 className="text-xl font-black tracking-tight leading-tight text-gray-900 mb-3">
                                        {recommendedNextSprint.title}
                                    </h3>

                                    {/* Description */}
                                    <div className="text-xs text-gray-600 font-medium leading-relaxed mb-4">
                                        <FormattedText text={recommendedNextSprint.description || recommendedNextSprint.subtitle || "Unlock consistency and start your rise."} />
                                    </div>

                                    {/* Action button */}
                                    <button 
                                        onClick={() => setOverviewStep('commitment')}
                                        className="w-full py-3.5 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] sm:text-[11px] shadow-xl hover:scale-[1.01] active:scale-95 transition-all text-center flex items-center justify-center gap-2"
                                    >
                                        Continue
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7-7 7m7-7H3" />
                                        </svg>
                                    </button>
                                </div>
                            ) : (
                                // Step 2: Commitment & Payment
                                <div>
                                    {/* Back button */}
                                    <button 
                                        onClick={() => !isProcessing && setOverviewStep('overview')}
                                        className="absolute top-5 left-5 p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1 text-[9px] font-black uppercase tracking-wider"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                        Back
                                    </button>

                                    {/* Stay in your rise header */}
                                    <h3 className="text-lg sm:text-xl font-black tracking-tight leading-tight text-center text-gray-900 italic mt-3 mb-4">
                                        Stay in your rise
                                    </h3>

                                    {/* Commitments List */}
                                    <div className="space-y-2 my-4 max-w-xs mx-auto">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 text-center mb-0.5">You'll</p>
                                        {[
                                          "Show up daily",
                                          "Pay attention to what works",
                                          "Finish what you start"
                                        ].map((text, i) => (
                                          <div key={i} className="flex items-center gap-2.5 pl-4">
                                            <span className="text-[#0E7850] text-sm leading-none">•</span>
                                            <span className="text-xs font-bold tracking-tight text-gray-800">{text}</span>
                                          </div>
                                        ))}
                                    </div>

                                    <p className="text-[10px] text-gray-400 font-bold text-center mb-4 px-4">
                                        Small actions daily builds real momentum over time.
                                    </p>

                                    {/* Commitment Radio Button */}
                                    <button 
                                        onClick={() => !isProcessing && setIsCommitted(!isCommitted)}
                                        disabled={isProcessing}
                                        className={`w-full flex items-center gap-3.5 p-3.5 rounded-2xl transition-all border-2 mb-4 text-left ${
                                            isCommitted 
                                            ? 'bg-[#0E7850]/5 border-[#0E7850] text-[#0E7850]' 
                                            : 'bg-gray-50 border-gray-100 hover:border-gray-200 text-gray-400 hover:bg-white'
                                        }`}
                                    >
                                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                                            isCommitted ? 'border-[#0E7850] bg-[#0E7850]' : 'border-gray-300 bg-white'
                                        }`}>
                                            {isCommitted && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                                        </div>
                                        <span className={`text-[11px] font-bold tracking-tight ${isCommitted ? 'text-gray-950' : 'text-gray-400'}`}>
                                            I commit to showing up and finishing this
                                        </span>
                                    </button>

                                    {/* WALLET / PRICING SECTION */}
                                    <div className="bg-gray-50 rounded-2xl p-3.5 border border-gray-100 mb-4 space-y-2.5">
                                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-gray-400">
                                            <span>Your Balance</span>
                                            <span className="text-gray-900">{(user as Participant)?.walletBalance ?? 0} COINS</span>
                                        </div>
                                        <div className="h-[1px] bg-gray-200 w-full"></div>
                                        <div className="space-y-2">
                                            {/* Option 1: Coins */}
                                            <label className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                                                paymentMethod === 'coins' 
                                                ? 'bg-[#0E7850]/5 border-[#0E7850] text-[#0E7850]' 
                                                : 'bg-white border-gray-150 text-gray-500'
                                            } ${((user as Participant)?.walletBalance ?? 0) < (recommendedNextSprint.pointCost || 10) ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                                <div className="flex items-center gap-2">
                                                    <input 
                                                        type="radio" 
                                                        name="dashboard_payment_method" 
                                                        checked={paymentMethod === 'coins'} 
                                                        onChange={() => ((user as Participant)?.walletBalance ?? 0) >= (recommendedNextSprint.pointCost || 10) && setPaymentMethod('coins')}
                                                        disabled={((user as Participant)?.walletBalance ?? 0) < (recommendedNextSprint.pointCost || 10) || isProcessing}
                                                        className="text-[#0E7850] focus:ring-[#0E7850] h-3.5 w-3.5"
                                                    />
                                                    <span className="text-[11px] font-black uppercase text-gray-800">Use {recommendedNextSprint.pointCost || 10} Coins</span>
                                                </div>
                                                {((user as Participant)?.walletBalance ?? 0) < (recommendedNextSprint.pointCost || 10) && (
                                                    <span className="text-[8px] font-black text-rose-500 bg-rose-50 px-2 py-0.5 rounded uppercase">Insufficient</span>
                                                )}
                                            </label>

                                            {/* Option 2: Card (Naira) */}
                                            <label className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                                                paymentMethod === 'card' 
                                                ? 'bg-[#0E7850]/5 border-[#0E7850] text-[#0E7850]' 
                                                : 'bg-white border-gray-150 text-gray-500'
                                            }`}>
                                                <div className="flex items-center gap-2">
                                                    <input 
                                                        type="radio" 
                                                        name="dashboard_payment_method" 
                                                        checked={paymentMethod === 'card'} 
                                                        onChange={() => setPaymentMethod('card')}
                                                        disabled={isProcessing}
                                                        className="text-[#0E7850] focus:ring-[#0E7850] h-3.5 w-3.5"
                                                    />
                                                    <span className="text-[11px] font-black uppercase text-gray-800">Pay with Card</span>
                                                </div>
                                                <span className="text-xs font-black text-gray-900">₦{recommendedNextSprint.price || 1000}</span>
                                            </label>
                                        </div>

                                        <div className="text-center pt-0.5">
                                            <span className="text-[9px] font-semibold text-gray-400">
                                                Need more coins? <span className="underline cursor-pointer text-[#0E7850]" onClick={() => navigate('/buy-coins')}>Buy coins here</span>
                                            </span>
                                        </div>
                                    </div>

                                    {/* Start Day 1 Button */}
                                    <button 
                                        onClick={handleStartSprint}
                                        disabled={!isCommitted || isProcessing}
                                        className={`w-full py-3.5 rounded-2xl shadow-xl transition-all text-[10px] font-black tracking-[0.2em] uppercase text-center flex items-center justify-center gap-2 ${
                                            isCommitted && !isProcessing
                                            ? 'bg-gray-900 text-white hover:scale-[1.01] active:scale-95 shadow-gray-900/15' 
                                            : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                                        }`}
                                    >
                                        {isProcessing ? "Processing..." : "Start Day 1 Now"}
                                    </button>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </AnimatePresence>

          </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 0, 0, 0.05); border-radius: 10px; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>

      {/* Global Modals */}
      <ConfirmModal
        isOpen={!!confirmCheckIn}
        onClose={() => {
          console.log("[Dashboard] Closing ConfirmModal");
          setConfirmCheckIn(null);
        }}
        onConfirm={() => {
          if (confirmCheckIn) {
            console.log("[Dashboard] ConfirmModal Action:", confirmCheckIn);
            executeCheckIn(confirmCheckIn.enrollmentId, confirmCheckIn.day);
          }
        }}
        title="Check-in Confirmation"
        message={`Ready to log your consistency for Day ${confirmCheckIn?.day || ''}? This helps you stay aligned with your growth journey.`}
        confirmText="Confirm Check-in"
        cancelText="Not Yet"
        variant="success"
      />
      {queuedSprints[0] && (
          <NextSprintModal 
            isOpen={isNextSprintModalOpen}
            sprint={queuedSprints[0].sprint}
            onStart={handleStartNextSprint}
            onClose={() => setIsNextSprintModalOpen(false)}
          />
      )}
      {activePlayIgnite && (
        <IgnitePlayer 
          ignite={activePlayIgnite}
          onClose={() => setActivePlayIgnite(null)}
        />
      )}

      {/* Floating Ignite Button on Scroll */}
      <AnimatePresence>
        {showFloatingIgnite && !isStepUpLocked && cardSettings.ignite && (
          <div className="fixed bottom-[5.5rem] left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-xs z-50 pointer-events-none">
            <div className="relative w-full h-0">
              <div className="absolute right-[29px] bottom-0 pointer-events-auto">
                <motion.button
                  key="floating-ignite-btn"
                  initial={{ scale: 0, opacity: 0, y: 10 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0, opacity: 0, y: 10 }}
                  onClick={() => {
                      if (processedIgnitePosts && processedIgnitePosts.length > 0) {
                          setActivePlayIgnite(processedIgnitePosts[0]);
                      } else {
                          setActivePlayIgnite({
                              id: 'default_ignite',
                              title: 'Ignite Post',
                              description: 'Daily Spark.',
                              igniteBgColor: '#6D28D9',
                              igniteBody: "Consistency is not about perfection. It’s about returning to the practice day after day.\n\n" +
                                          "Be the Catalyst. Your momentum is contagious, inspire your circle to act.\n\n" +
                                          "The secret to growing is to never grow alone. Bring others along and lift everyone together."
                          } as any);
                      }
                  }}
                  className="w-12 h-12 rounded-full shadow-xl hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center cursor-pointer border-2 border-white bg-[#0E7850] overflow-hidden group relative"
                  style={{ borderRadius: '50%' }}
                  title="Daily Ignite"
                >
                  <img 
                      src={processedIgnitePosts[0]?.coverImageUrl || processedIgnitePosts[0]?.blogImage || 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1350&q=80'}
                      alt="" 
                      className="absolute inset-0 w-full h-full object-cover rounded-full brightness-[0.45] group-hover:scale-110 transition-transform duration-500"
                      style={{ borderRadius: '50%' }}
                      referrerPolicy="no-referrer"
                  />
                  <div className="relative z-10 flex flex-col items-center justify-center w-full h-full">
                      <span className="text-[10px] font-black uppercase tracking-[0.12em] text-white text-center leading-none select-none drop-shadow-md">
                          Ignite
                      </span>
                  </div>
                  {!isIgniteChecked && (
                      <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border border-white ring-2 ring-rose-500/35 animate-pulse z-20" />
                  )}
                </motion.button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Beautiful fullscreen immersive custom Ignite player
const IgnitePlayer: React.FC<{
  ignite: Sprint;
  onClose: () => void;
}> = ({ ignite, onClose }) => {
  const text = ignite.igniteBody || ignite.description || '';
  const bgColor = ignite.igniteBgColor || '#6D28D9';

  const slides = React.useMemo(() => {
    return text.split(/\r?\n\s*\r?\n/).map(s => s.trim()).filter(Boolean);
  }, [text]);

  const activeSlides = slides.length > 0 ? slides : ["Type some inspiration to preview!"];
  
  const [activeSlide, setActiveSlide] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Persistence of Liked Ignite
  const [isLiked, setIsLiked] = useState(() => {
    return localStorage.getItem(`ignite_liked_${ignite.id}`) === 'true';
  });

  const handleToggleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newLiked = !isLiked;
    setIsLiked(newLiked);
    localStorage.setItem(`ignite_liked_${ignite.id}`, newLiked ? 'true' : 'false');
    if (newLiked) {
      toast.success("Added to your Liked sparks!", { icon: "❤️" });
    }
  };

  const formattedDate = React.useMemo(() => {
    // Custom date formatting function "Thursday, 12th July"
    let d: Date;
    if (ignite.igniteDate) {
      try {
        const parts = ignite.igniteDate.split('-');
        if (parts.length === 3) {
          d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        } else {
          d = new Date();
        }
      } catch {
        d = new Date();
      }
    } else {
      d = new Date();
    }

    if (isNaN(d.getTime())) {
      d = new Date();
    }

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    
    const dayName = days[d.getDay()];
    const monthName = months[d.getMonth()];
    const dayNum = d.getDate();
    
    let suffix = 'th';
    if (dayNum === 1 || dayNum === 21 || dayNum === 31) suffix = 'st';
    else if (dayNum === 2 || dayNum === 22) suffix = 'nd';
    else if (dayNum === 3 || dayNum === 23) suffix = 'rd';
    
    return `${dayName}, ${dayNum}${suffix} ${monthName}`;
  }, [ignite.igniteDate]);

  useEffect(() => {
    setProgress(0);
  }, [activeSlide]);

  useEffect(() => {
    if (isPaused) return;

    const slideDuration = 4500; // 4.5 seconds per slide
    const intervalTime = 50; // tick every 50ms
    const step = (intervalTime / slideDuration) * 100;

    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          setActiveSlide(curr => (curr + 1) % activeSlides.length);
          return 0;
        }
        return prev + step;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [activeSlides.length, activeSlide, isPaused]);

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveSlide(curr => (curr + 1) % activeSlides.length);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveSlide(curr => (curr - 1 + activeSlides.length) % activeSlides.length);
  };

  const handlePageClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a')) {
      return;
    }
    setIsPaused(prev => !prev);
  };

  return (
    <div 
      className="fixed inset-0 z-[400] flex flex-col justify-between p-6 select-none animate-fade-in text-white font-sans cursor-pointer"
      style={{ backgroundColor: bgColor }}
      onClick={handlePageClick}
    >
      {/* Date above indicators */}
      <div className="absolute top-3.5 left-0 right-0 text-center z-[410] text-[10px] font-black tracking-[0.25em] text-white/90 uppercase drop-shadow-sm select-none">
        {formattedDate}
      </div>

      {/* Bars at the top */}
      <div className="absolute top-9 left-6 right-6 flex gap-1 z-[410]">
        {activeSlides.map((_, idx) => (
          <div key={idx} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white rounded-full"
              style={{
                width: idx < activeSlide ? '100%' : idx === activeSlide ? `${progress}%` : '0%',
                transition: idx === activeSlide ? 'none' : 'width 0.05s linear'
              }}
            />
          </div>
        ))}
      </div>

      {/* Love/Like Icon (the other side of cancel icon) */}
      <button 
        type="button"
        onClick={handleToggleLike} 
        className="absolute top-13 left-6 z-[420] bg-black/40 hover:bg-black/60 p-2.5 rounded-full transition-all text-white/93 font-bold active:scale-90 cursor-pointer flex items-center justify-center outline-none border-none shadow-md"
        title={isLiked ? "Unlike Spark" : "Like Spark"}
      >
        <Heart className={`h-5 w-5 transition-transform duration-300 ${isLiked ? 'fill-rose-500 text-rose-500 scale-110 animate-pulse' : 'text-white'}`} strokeWidth={2.5} />
      </button>

      {/* Close button */}
      <button 
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }} 
        className="absolute top-13 right-6 z-[420] bg-black/40 hover:bg-black/60 p-2.5 rounded-full transition-all text-white/90 font-bold active:scale-90 cursor-pointer flex items-center justify-center outline-none border-none shadow-md"
        title="Exit Fullscreen"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Main slide display - split clickable regions for left/right nav */}
      <div className="relative flex-1 flex items-center justify-center px-4 md:px-12 my-12">
        {/* Left click catcher */}
        <div 
          onClick={handlePrev}
          className="absolute left-0 top-0 bottom-0 w-16 cursor-w-resize z-[420] flex items-center justify-center text-white/30 hover:text-white transition-colors"
          title="Previous Slide"
        >
          <ChevronLeft className="h-6 w-6 stroke-[3px]" />
        </div>
        
        {/* Main large text content */}
        <div className="z-10 text-center select-none pointer-events-none max-w-3xl px-4 flex flex-col items-center">
          <p className="text-3xl md:text-5xl font-extrabold leading-relaxed tracking-wide text-white drop-shadow-md whitespace-pre-wrap animate-slide-up">
            {activeSlides[activeSlide]}
          </p>
          <p className="text-[10px] uppercase tracking-widest font-black text-white/40 mt-6 animate-pulse select-none">
            {isPaused ? "Tap background to resume" : "Tap background to pause"}
          </p>
        </div>

        {/* Right click catcher */}
        <div 
          onClick={handleNext}
          className="absolute right-0 top-0 bottom-0 w-16 cursor-e-resize z-[420] flex items-center justify-center text-white/30 hover:text-white transition-colors"
          title="Next Slide"
        >
          <ChevronRight className="h-6 w-6 stroke-[3px]" />
        </div>
      </div>

      {/* Bottom info */}
      <div className="flex justify-between items-center z-[410] px-4 font-black tracking-widest text-[10px] text-white/60 uppercase">
        <div className="flex items-center gap-1.5">
          <span>Ignite Post</span>
          {isPaused && (
            <span className="px-1 rounded bg-white/20 text-white text-[8px] tracking-normal font-black animate-pulse">PAUSED</span>
          )}
        </div>
        <span>Slide {activeSlide + 1} of {activeSlides.length}</span>
      </div>
    </div>
  );
};

export default ParticipantDashboard;