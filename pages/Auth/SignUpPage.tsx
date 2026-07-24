import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { auth, db } from '../../services/firebase';
import { createUserWithEmailAndPassword, updateProfile as updateFbProfile, sendEmailVerification, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, updateDoc, collection, query, where, getDocs, getDoc, setDoc } from 'firebase/firestore';
import { userService } from '../../services/userService';
import { sprintService } from '../../services/sprintService';
import { UserRole, Participant } from '../../types';
import Button from '../../components/Button';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';

const SignUpPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { checkVerification, resetVerificationDeferral } = useAuth();
  
  const onboardingState = location.state || {};
  
  // Helper to extract cookie value
  const getCookie = (name: string) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift();
    return null;
  };

  // 1. Permanent Attribution Check (Background Storage)
  // We check LocalStorage first (durable), then Cookie (backup for payment redirects)
  const storedRef = localStorage.getItem('vectorise_ref') || getCookie('vectorise_ref');
  const savedSprint = localStorage.getItem('vectorise_last_sprint');

  const { 
    persona, 
    answers, 
    recommendedPlan, 
    referrerId = storedRef, // Attribution priority
    prefilledEmail, 
    prefilledFirstName,
    prefilledLastName,
    fromPayment, 
    targetSprintId: targetSprintIdProp = savedSprint,
    sprintId: sprintIdProp,
    sprint: sprintProp,
    targetTrackId,
    tx_ref,
    isPartnerApplication,
    partnerData,
    authMessage,
    isQueued,
    allMatchedSprintIds
  } = onboardingState;

  const targetSprintId = targetSprintIdProp || sprintIdProp || sprintProp?.id || savedSprint;

  const [firstName, setFirstName] = useState(prefilledFirstName || '');
  const [lastName, setLastName] = useState(prefilledLastName || '');
  const [email, setEmail] = useState(prefilledEmail || '');
  const [password, setPassword] = useState('');
  const [regError, setRegError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Verification Overlay / Modal States
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [pendingRedirect, setPendingRedirect] = useState<{ path: string; state?: any } | null>(null);
  const [verificationChecking, setVerificationChecking] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);

  const enrollAndPrepareDaySuccess = async (uid: string, sprintId: string, customAnswers?: any) => {
    try {
      const sprint = await sprintService.getSprintById(sprintId);
      if (!sprint) return null;

      const firstInput = customAnswers?.firstActionInput || customAnswers?.taskInputs?.[0];
      const enrollment = await sprintService.enrollUser(uid, sprintId, sprint.duration, {
        firstActionInput: firstInput,
        taskInputs: customAnswers?.taskInputs || (firstInput ? [firstInput] : undefined)
      } as any);

      if (enrollment && enrollment.progress && enrollment.progress[0]) {
        const updatedProgress = [...enrollment.progress];
        updatedProgress[0] = {
          ...updatedProgress[0],
          completed: true,
          completedAt: new Date().toISOString(),
          answers: customAnswers?.taskInputs || (firstInput ? [firstInput] : []),
          submission: firstInput || ""
        };
        const enrollmentRef = doc(db, "users", uid, "enrollments", enrollment.id);
        await updateDoc(enrollmentRef, { 
          progress: updatedProgress,
          last_activity_at: new Date().toISOString()
        });
      }

      localStorage.removeItem('pending_first_action');
      localStorage.removeItem('vectorise_last_sprint');

      const d1Content = Array.isArray(sprint?.dailyContent) ? sprint.dailyContent.find((dc: any) => dc.day === 1) : undefined;
      const daySuccessState = {
        redirectToDaySuccess: true,
        day: 1,
        coinsUnlocked: 10,
        bridgeNote: d1Content?.bridgeNote,
        sprintId: sprintId,
        enrollmentId: enrollment?.id
      };

      sessionStorage.setItem('post_verify_redirect', JSON.stringify({
        path: '/participant/day-success',
        state: daySuccessState
      }));

      return daySuccessState;
    } catch (err) {
      console.error("Error in enrollAndPrepareDaySuccess:", err);
      return null;
    }
  };

  const handleIHaveVerified = async () => {
    setVerificationChecking(true);
    try {
      const isVerified = await checkVerification();
      if (isVerified) {
        toast.success("Email verified successfully! Welcome to Vectorise.");
        setShowVerifyModal(false);
        if (pendingRedirect) {
          navigate(pendingRedirect.path, { replace: true, state: pendingRedirect.state });
        } else {
          navigate('/dashboard', { replace: true });
        }
      } else {
        toast.error("Email is not verified yet. Please click the link in your inbox first!");
      }
    } catch (err) {
      console.error("Verification error", err);
      toast.error("An error occurred during verification check.");
    } finally {
      setVerificationChecking(false);
    }
  };

  const handleResendVerification = async () => {
    if (auth.currentUser) {
      setResendingEmail(true);
      try {
        await sendEmailVerification(auth.currentUser);
        toast.success("Verification link sent to your inbox!");
      } catch (err) {
        toast.error("Failed to resend. Please check back in a moment.");
      } finally {
        setResendingEmail(false);
      }
    }
  };

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    setIsSubmitting(true);
    try {
      const res = await signInWithPopup(auth, provider);
      const firebaseUser = res.user;
      toast.success("Connected with Google successfully!");

      const existingDoc = await userService.getUserDocument(firebaseUser.uid);
      if (!existingDoc) {
        const isCoachRegistration = !!(isPartnerApplication || false);
        const nameParts = (firebaseUser.displayName || 'Rise Seeker').split(' ');
        const newUser: Partial<any> = {
          id: firebaseUser.uid,
          name: firebaseUser.displayName || `${firstName || 'Rise'} ${lastName || 'Seeker'}`,
          email: firebaseUser.email || email.trim().toLowerCase(),
          role: isCoachRegistration ? UserRole.COACH : UserRole.PARTICIPANT,
          profileImageUrl: firebaseUser.photoURL || `https://ui-avatars.com/api/?name=${nameParts[0]}+${nameParts[1] || ''}&background=0E7850&color=fff`,
          persona: 'Seeker',
          onboardingAnswers: answers || {},
          enrolledSprintIds: [],
          isPartner: false,
          partnerData: null,
          walletBalance: 0,
          referrerId: referrerId || null,
          referralFirstTouch: storedRef || null
        };
        await userService.createUserDocument(firebaseUser.uid, newUser);
      }

      const pendingFirstActionRaw = localStorage.getItem('pending_first_action');
      let pendingFirstAction: any = null;
      try {
        if (pendingFirstActionRaw) pendingFirstAction = JSON.parse(pendingFirstActionRaw);
      } catch (err) {}

      const effectiveSprintId = targetSprintId || pendingFirstAction?.sprintId || savedSprint;

      if (effectiveSprintId) {
        const daySuccessState = await enrollAndPrepareDaySuccess(firebaseUser.uid, effectiveSprintId, pendingFirstAction);
        if (daySuccessState) {
          if (!firebaseUser.emailVerified) {
            navigate('/verify-email', { state: daySuccessState, replace: true });
          } else {
            navigate('/participant/day-success', { state: daySuccessState, replace: true });
          }
          return;
        }
      }
    } catch (error: any) {
      console.error("Google SSO Failure:", error);
      if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
        toast.error("Google registration failed. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (prefilledEmail) setEmail(prefilledEmail);
    if (prefilledFirstName) setFirstName(prefilledFirstName);
    if (prefilledLastName) setLastName(prefilledLastName);
  }, [prefilledEmail, prefilledFirstName, prefilledLastName]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !email || !password) {
      setRegError("All fields are required.");
      return;
    }

    setRegError('');
    setIsSubmitting(true);

    try {
      resetVerificationDeferral();
      // 1. Create Firebase Auth Account
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      const firebaseUser = userCredential.user;
      
      // Send email verification right away
      try {
        await sendEmailVerification(firebaseUser);
      } catch (vErr) {
        console.error("Immediate sendEmailVerification error:", vErr);
      }

      await updateFbProfile(firebaseUser, { displayName: `${firstName} ${lastName}` });
      
      // 2. Resolve Referrer UID and Name
      let resolvedReferrerId: string | null = null;
      if (referrerId) {
        try {
          const qCode = query(collection(db, 'users'), where('referralCode', '==', referrerId.trim().toUpperCase()));
          const snapCode = await getDocs(qCode);
          if (!snapCode.empty) {
            resolvedReferrerId = snapCode.docs[0].id;
          } else {
            const docRef = doc(db, 'users', referrerId);
            const snapDoc = await getDoc(docRef);
            if (snapDoc.exists()) {
              resolvedReferrerId = referrerId;
            }
          }
        } catch (err) {
          console.error("Failed to resolve referrer details:", err);
        }
      }

      // Check if target sprint is a Coach sprint
      let isCoachRegistration = false;
      let coachDetails: any = {};
      if (targetSprintId) {
        try {
          const spr = await sprintService.getSprintById(targetSprintId);
          if (spr && spr.audience && spr.audience.some((a: any) => typeof a === 'string' && a.toLowerCase().includes("coach"))) {
            isCoachRegistration = true;
            coachDetails = {
              approved: false, 
              coachApplicationSubmitted: false,
              coachApplicationApproved: false,
              hasCoachProfile: false,
              bio: "Specialized Coach.",
              niche: "Executive Coaching"
            };
          }
        } catch (e) {
          console.error("Error checking target sprint for coach audience:", e);
        }
      }

      // 3. Create User Document with Permanent Attribution
      const newUser: Partial<any> = {
        id: firebaseUser.uid,
        name: `${firstName} ${lastName}`,
        email: email.trim().toLowerCase(),
        role: isPartnerApplication ? UserRole.PARTNER : (isCoachRegistration ? UserRole.COACH : UserRole.PARTICIPANT),
        profileImageUrl: `https://ui-avatars.com/api/?name=${firstName}+${lastName}&background=0E7850&color=fff`,
        persona: persona || (isPartnerApplication ? 'Growth Partner' : (isCoachRegistration ? 'Coach' : 'Seeker')),
        onboardingAnswers: answers || {},
        enrolledSprintIds: [],
        isPartner: !!isPartnerApplication,
        partnerData: partnerData || null,
        walletBalance: 0, // No coin is given on signup
        
        // ATTACH REFERRAL DATA PERMANENTLY
        referrerId: resolvedReferrerId || null,
        referralFirstTouch: resolvedReferrerId ? new Date().toISOString() : null,
        ...coachDetails
      };
      
      await userService.createUserDocument(firebaseUser.uid, newUser);

      // 4. Create real-time Referral record
      if (resolvedReferrerId) {
        try {
          const referralId = `${resolvedReferrerId}_${firebaseUser.uid}`;
          const referralData = {
            id: referralId,
            referrerId: resolvedReferrerId,
            refereeId: firebaseUser.uid,
            refereeName: `${firstName} ${lastName}`,
            refereeAvatar: newUser.profileImageUrl || `https://ui-avatars.com/api/?name=${firstName}+${lastName}&background=0E7850&color=fff`,
            status: 'joined',
            timestamp: new Date().toISOString()
          };
          
          // Write top-level collection document
          const refDocRef = doc(db, 'referrals', referralId);
          await setDoc(refDocRef, referralData);
          
          // Write nested subcollection document under the referrer key
          const subRefDoc = doc(db, 'users', resolvedReferrerId, 'referrals', firebaseUser.uid);
          await setDoc(subRefDoc, referralData);
          
          // Drop a notification inside the referrer's notifications collection
          const notifId = `${resolvedReferrerId}_joined_${firebaseUser.uid}`;
          const notifRef = doc(db, 'users', resolvedReferrerId, 'notifications', notifId);
          await setDoc(notifRef, {
            id: notifId,
            userId: resolvedReferrerId,
            type: 'referral_update',
            title: 'New Referrer Connection! 🌱',
            body: `${firstName} ${lastName} has joined using your link. Start building your rising squad!`,
            actionUrl: '/impact',
            isRead: false,
            readAt: null,
            pushSent: false,
            createdAt: new Date().toISOString(),
            expiresAt: null,
            bypassActiveCheck: true,
            data: {
              title: 'New Referrer Connection! 🌱',
              body: `${firstName} ${lastName} has joined using your link. Start building your rising squad!`,
              tag: 'referral-update',
              url: '/impact'
            }
          });

          console.log(`[Referral Recorded] Saved referral document for referee ${firebaseUser.uid} under referrer ${resolvedReferrerId} and dropped a notification`);
        } catch (err) {
          console.error("Failed to record referral document:", err);
        }
      }

      // 3. Claim Payment if applicable
      if (tx_ref) {
          try {
              const paymentRef = doc(db, 'payments', tx_ref);
              await updateDoc(paymentRef, {
                  userId: firebaseUser.uid,
                  claimedAt: new Date().toISOString()
              });
          } catch (claimError) {
              console.error("Failed to claim payment:", claimError);
          }
      }

      // 4. Clean up used tracking data
      localStorage.removeItem('vectorise_ref');
      localStorage.removeItem('vectorise_last_sprint');
      document.cookie = "vectorise_ref=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

      // 5. Post-Payment, Preview, or Recommended Path Fulfillment
      const pendingFirstActionRaw = localStorage.getItem('pending_first_action');
      let pendingFirstAction: any = null;
      try {
          if (pendingFirstActionRaw) {
              pendingFirstAction = JSON.parse(pendingFirstActionRaw);
          }
      } catch (err) {
          console.error("Error parsing pending_first_action in SignUpPage:", err);
      }

      const effectiveSprintId = targetSprintId || pendingFirstAction?.sprintId || savedSprint;

      if (effectiveSprintId) {
          const daySuccessState = await enrollAndPrepareDaySuccess(firebaseUser.uid, effectiveSprintId, pendingFirstAction);
          if (daySuccessState) {
              await sendEmailVerification(firebaseUser);
              toast.success("Account created! Verification email sent.");
              navigate('/verify-email', { state: daySuccessState, replace: true });
              return;
          }
      }

      if (fromPayment || targetSprintId) {
          if (targetTrackId) {
              // For tracks, we redirect to dashboard
              await sendEmailVerification(firebaseUser);
              navigate('/verify-email', { replace: true });
              return;
          } else if (targetSprintId) {
              try {
                  const sprint = await sprintService.getSprintById(targetSprintId);
                  if (sprint) {
                      // Check if it's a foundational/free sprint or if they came from payment
                      const isFoundational = sprint.sprintType === 'Foundational' || 
                                             sprint.sprintType === 'Fundamentals' ||
                                             sprint.sprintType === 'Core' ||
                                             sprint.sprintType === 'Expert' ||
                                             sprint.category === 'Core Platform Sprint' || 
                                             sprint.category === 'Growth Fundamentals';
                      if (fromPayment || isFoundational || sprint.price === 0) {
                          const pendingFirstActionRaw = localStorage.getItem('pending_first_action');
                          let pendingFirstAction = null;
                          try {
                              if (pendingFirstActionRaw) {
                                  pendingFirstAction = JSON.parse(pendingFirstActionRaw);
                              }
                          } catch (err) {
                              console.error("Error parsing pending_first_action in SignUpPage:", err);
                          }

                          const enrollment = await sprintService.enrollUser(firebaseUser.uid, targetSprintId, sprint.duration, {
                              firstActionInput: pendingFirstAction?.firstActionInput
                          });

                          if (enrollment.status === 'queued') {
                              toast.success("Added to waitlist since you have another active sprint! Progress saved.");
                          }
                          localStorage.removeItem('pending_first_action');
                          const d1Content = Array.isArray(sprint?.dailyContent) ? sprint.dailyContent.find((dc: any) => dc.day === 1) : undefined;
                          const daySuccessState = {
                              redirectToDaySuccess: true,
                              day: 1,
                              coinsUnlocked: 10,
                              bridgeNote: d1Content?.bridgeNote,
                              sprintId: targetSprintId,
                              enrollmentId: enrollment?.id
                          };
                          sessionStorage.setItem('post_verify_redirect', JSON.stringify({
                              path: '/participant/day-success',
                              state: daySuccessState
                          }));
                          await sendEmailVerification(firebaseUser);
                          navigate('/verify-email', { state: daySuccessState, replace: true });
                          return;
                      }
                  }
              } catch (enrollError) {
                  console.error("Auto-enrollment failed:", enrollError);
              }
          }
      }
      
      if (persona && answers) {
          // Handle Recommended Path from Quiz
          try {
              const availableSprints = await sprintService.getPublishedSprints();
              
              // Recalculate path (same logic as RecommendedSprints.tsx)
              let foundational = availableSprints.find(s => 
                  s.sprintType === 'Foundational' ||
                  s.sprintType === 'Fundamentals' ||
                  s.sprintType === 'Core' ||
                  s.sprintType === 'Expert' ||
                  s.category === 'Growth Fundamentals' || 
                  s.category === 'Core Platform Sprint'
              );
              
              const registrySprints = availableSprints.filter(s => 
                  s.sprintType !== 'Foundational' &&
                  s.sprintType !== 'Fundamentals' &&
                  s.sprintType !== 'Core' &&
                  s.sprintType !== 'Expert' &&
                  s.category !== 'Growth Fundamentals' && 
                  s.category !== 'Core Platform Sprint'
              );
              
              let nextPath = registrySprints.find(s => s.id === targetSprintId);
              if (!nextPath) {
                  const { translateToTag, calculateMatchScore } = await import('../../utils/tagUtils');
                  const userProfile = {
                      persona: persona,
                      p1: translateToTag(persona, answers[1]),
                      p2: translateToTag(persona, answers[2]),
                      p3: translateToTag(persona, answers[3])
                  };
                  const scoredSprints = registrySprints
                      .map(s => ({ sprint: s, score: calculateMatchScore(userProfile, s.targeting) }))
                      .sort((a, b) => b.score - a.score);
                  if (scoredSprints.length > 0) nextPath = scoredSprints[0].sprint;
              }

              // Enroll in Foundational (Always)
              if (foundational) {
                  await sprintService.enrollUser(firebaseUser.uid, foundational.id, foundational.duration);
              }

              // Enroll in Next Path (If Queued)
              if (isQueued && nextPath) {
                  await sprintService.enrollUser(firebaseUser.uid, nextPath.id, nextPath.duration, { source: 'queued' as any });
              }

              // Enroll in remaining matched focus sprints to follow accordingly in priority order
              if (isQueued && allMatchedSprintIds && Array.isArray(allMatchedSprintIds)) {
                  for (const otherSId of allMatchedSprintIds) {
                      if (otherSId !== nextPath?.id && otherSId !== foundational?.id) {
                          const otherSprint = registrySprints.find(s => s.id === otherSId);
                          if (otherSprint) {
                              await sprintService.enrollUser(firebaseUser.uid, otherSprint.id, otherSprint.duration, { source: 'queued' as any });
                          }
                      }
                  }
              }
          } catch (pathError) {
              console.error("Recommended path enrollment failed:", pathError);
          }
      }

      await sendEmailVerification(firebaseUser);
      toast.success("Account created! Verification email sent.");
      navigate('/verify-email', { replace: true });

    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') setRegError("Email already in use. Try logging in instead.");
      else if (error.code === 'auth/weak-password') setRegError("Password must be at least 6 characters.");
      else setRegError("Account creation failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-[100dvh] w-screen bg-[#FAFAFA] flex flex-col items-center justify-center px-6 overflow-hidden font-sans relative">
      <div className="w-full max-w-sm flex flex-col items-center animate-fade-in z-10">
        <header className="text-center mb-10">
            <h1 className="text-5xl font-black leading-[0.95] text-center tracking-tighter text-gray-900">
                Start<br/><span className="text-primary italic pb-1">your rise</span>
            </h1>
            {referrerId && !isPartnerApplication && (
                <p className="text-[9px] font-black text-primary uppercase tracking-[0.2em] mt-3">
                    Referred by Catalyst: {referrerId}
                </p>
            )}
        </header>

        <div className="w-full bg-white p-8 md:p-10 rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden relative">
            <form onSubmit={handleSignUp} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <label className="block text-[8px] font-black text-gray-300 uppercase tracking-widest ml-1">First Name</label>
                        <input type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-50 rounded-xl outline-none font-bold text-sm" placeholder="First Name" />
                    </div>
                    <div className="space-y-1">
                        <label className="block text-[8px] font-black text-gray-300 uppercase tracking-widest ml-1">Last Name</label>
                        <input type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-50 rounded-xl outline-none font-bold text-sm" placeholder="Last Name" />
                    </div>
                </div>
                <div className="space-y-1">
                    <label className="block text-[8px] font-black text-gray-300 uppercase tracking-widest ml-1">Email Address</label>
                    <input 
                      type="email" 
                      required 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-50 rounded-xl outline-none font-bold text-sm transition-all focus:ring-4 focus:ring-primary/5" 
                      placeholder="Email Address" 
                    />
                </div>
                <div className="space-y-1">
                    <label className="block text-[8px] font-black text-gray-300 uppercase tracking-widest ml-1">Set Password</label>
                    <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-50 rounded-xl outline-none focus:ring-4 focus:ring-primary/5 font-bold text-sm" placeholder="Password" />
                </div>

                {regError && <p className="text-[10px] text-red-600 font-black uppercase text-center mt-2">{regError}</p>}
                {authMessage && !regError && (
                    <div className="p-3 bg-primary/5 border border-primary/10 rounded-xl text-[10px] text-primary font-black uppercase tracking-widest text-center animate-pulse">
                        {authMessage}
                    </div>
                )}

                <Button type="submit" isLoading={isSubmitting} className="w-full py-4 bg-primary text-white rounded-full shadow-lg text-[10px] font-black uppercase tracking-[0.2em] mt-2">
                    {isPartnerApplication ? 'Secure Partner Access' : 'Create Account'} &rarr;
                </Button>
            </form>

            <div className="relative flex py-3 items-center">
                <div className="flex-grow border-t border-gray-100"></div>
                <span className="flex-shrink mx-3 text-[8px] font-black text-gray-300 uppercase tracking-widest block">or continue with</span>
                <div className="flex-grow border-t border-gray-100"></div>
            </div>

            <button 
              type="button" 
              onClick={handleGoogleSignIn}
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2.5 py-3 border border-gray-200/60 rounded-full hover:bg-gray-50 transition-all font-black text-[9px] uppercase tracking-[0.15em] text-gray-700 active:scale-95 disabled:opacity-50"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.08H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.92l2.85-2.22.81-.6z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 6.16l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google
            </button>

            <p className="mt-8 text-center text-[9px] font-black text-gray-300 uppercase tracking-widest">
                Already have an account? <Link to="/login" state={{ targetSprintId, prefilledEmail: email, tx_ref }} className="text-primary hover:underline">Log in</Link>
            </p>
        </div>
      </div>

      {showVerifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 p-8 sm:p-10 text-center relative max-h-[90vh] overflow-y-auto">
            <div className="w-16 h-16 bg-primary/5 text-primary rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-[#0E7850]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>

            <h2 className="text-2xl font-black text-gray-900 mb-2 tracking-tight uppercase leading-none">Confirm Your Link</h2>
            <p className="text-gray-500 text-xs mb-6 font-medium">
              We've sent a verification link to <br/>
              <span className="text-primary font-black italic">{email}</span>
            </p>

            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 mb-6 text-[10px] text-gray-400 font-bold leading-relaxed uppercase tracking-widest">
              Please open your inbox, click the verification link to secure your path, and then tap "I have verified" below.
            </div>

            <div className="space-y-3">
              <Button 
                disabled={verificationChecking}
                onClick={handleIHaveVerified}
                className="w-full py-3.5 text-[10px] font-black uppercase tracking-[0.2em] rounded-full shadow-lg"
              >
                {verificationChecking ? 'Verifying status...' : 'I have verified ✓'}
              </Button>

              <button 
                type="button"
                disabled={resendingEmail}
                onClick={handleResendVerification}
                className="w-full text-[9px] font-black text-primary uppercase tracking-[0.2em] py-2 hover:underline disabled:opacity-50"
              >
                {resendingEmail ? 'Resending Link...' : 'Resend Verification Email'}
              </button>

              <button 
                type="button"
                onClick={async () => {
                  await auth.signOut();
                  setShowVerifyModal(false);
                }}
                className="w-full text-[9px] font-black text-red-500 uppercase tracking-[0.2em] py-2 hover:underline"
              >
                Cancel & Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SignUpPage;