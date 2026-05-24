import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/Button';
import { auth, db } from '../../services/firebase';
import { signInWithEmailAndPassword, sendEmailVerification, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { sprintService } from '../../services/sprintService';
import { UserRole } from '../../types';
import { toast } from 'sonner';

const LoginPage: React.FC = () => {
  const { user, forgotPassword, checkVerification, mustVerifyEmail } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Verification Overlay / Modal States
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verificationChecking, setVerificationChecking] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);

  const handleIHaveVerified = async () => {
    setVerificationChecking(true);
    try {
      const isVerified = await checkVerification();
      if (isVerified) {
        toast.success("Email verified successfully! Welcome.");
        setShowVerifyModal(false);
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
    setIsLoading(true);
    try {
      await signInWithPopup(auth, provider);
      toast.success("Connected with Google successfully!");
    } catch (error: any) {
      console.error("Google SSO Failure:", error);
      if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
        toast.error("Google authentication failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // Accept prefilled email from location state
  const initialEmail = location.state?.prefilledEmail || '';
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Intent capture from payment success flow
  const targetSprintId = location.state?.targetSprintId;
  const targetTrackId = location.state?.targetTrackId;
  const tx_ref = location.state?.tx_ref;
  const authMessage = location.state?.authMessage;

  useEffect(() => {
      // Sync state if initialEmail changes
      if (initialEmail && !email) {
          setEmail(initialEmail);
      }
  }, [initialEmail]);

  useEffect(() => {
      const handleUserRedirect = async () => {
          if (user) {
              if (mustVerifyEmail) {
                  navigate('/verify-email', { replace: true });
                  return;
              }

              // 1. Admin Redirection
              if (user.role === UserRole.ADMIN) {
                  navigate('/admin/dashboard', { replace: true });
                  return;
              }

              // 2. Coach Redirection
              if (user.role === UserRole.COACH) {
                  navigate('/coach/dashboard', { replace: true });
                  return;
              }

              // 3. Partner Redirection
              if (user.role === UserRole.PARTNER) {
                  navigate('/partner/dashboard', { replace: true });
                  return;
              }

              // 4. Participant Redirection (with complex resume logic)
              if (user.role === UserRole.PARTICIPANT) {
                  try {
                      const enrollments = await sprintService.getUserEnrollments(user.id);

                      // 0. Claim payment if applicable
                      if (tx_ref) {
                          try {
                              const paymentRef = doc(db, 'payments', tx_ref);
                              await updateDoc(paymentRef, {
                                  userId: user.id,
                                  claimedAt: new Date().toISOString()
                              });
                          } catch (claimError) {
                              console.error("Failed to claim payment:", claimError);
                          }
                      }

                      // 1. Check for payment-driven enrollment intent - Use replace: true
                      if (targetTrackId) {
                          navigate('/participant/dashboard', { replace: true });
                          return;
                      } else if (targetSprintId) {
                          const pendingFirstActionRaw = localStorage.getItem('pending_first_action');
                          let pendingFirstAction = null;
                          try {
                              if (pendingFirstActionRaw) {
                                  pendingFirstAction = JSON.parse(pendingFirstActionRaw);
                              }
                          } catch (err) {
                              console.error("Error parsing pending_first_action:", err);
                          }

                          if (pendingFirstAction && pendingFirstAction.sprintId === targetSprintId) {
                              if (pendingFirstAction.pricingType === 'cash') {
                                  const sprint = await sprintService.getSprintById(targetSprintId);
                                  navigate('/onboarding/sprint-payment', { state: { sprint: sprint, prefilledEmail: user.email } });
                                  return;
                              } else {
                                  // Coin-based sprint target => redirect to dashboard where the coin award/unlock popup will trigger
                                  navigate('/dashboard', { replace: true });
                                  return;
                              }
                          }

                          const existing = enrollments.find(e => e.sprint_id === targetSprintId);
                          
                          if (existing) {
                              if (existing.status === 'active') {
                                  navigate(`/participant/sprint/${existing.id}`, { replace: true });
                                  return;
                              } else if (existing.status === 'queued') {
                                  navigate('/my-sprints', { replace: true });
                                  return;
                              }
                          }

                          const sprint = await sprintService.getSprintById(targetSprintId);
                          if (sprint) {
                              const isFoundational = sprint.sprintType === 'Foundational' || 
                                                     sprint.sprintType === 'Fundamentals' ||
                                                     sprint.sprintType === 'Core' ||
                                                     sprint.sprintType === 'Expert' ||
                                                     sprint.category === 'Core Platform Sprint' || 
                                                     sprint.category === 'Growth Fundamentals';
                              if (isFoundational || sprint.price === 0) {
                                  const enrollment = await sprintService.enrollUser(user.id, targetSprintId, sprint.duration, {
                                      firstActionInput: pendingFirstAction?.firstActionInput
                                  });
                                  if (enrollment.status === 'queued') {
                                      toast.success("Added to waitlist since you have another active sprint! Progress saved.");
                                  }
                                  localStorage.removeItem('pending_first_action');
                                  navigate(`/participant/sprint/${enrollment.id}`, { replace: true });
                                  return;
                              }
                              
                              navigate('/onboarding/sprint-payment', { state: { sprint: sprint, prefilledEmail: user.email } });
                              return;
                          }
                      }

                      // 2. Resume active journey
                      const active = enrollments.find(e => e.status === 'active' && e.progress.some(p => !p.completed));
                      if (active) {
                          navigate(`/participant/sprint/${active.id}`, { replace: true });
                          return;
                      }

                      // 3. Check for queued sprints
                      const queued = enrollments.find(e => e.status === 'queued');
                      if (queued) {
                          navigate('/dashboard', { replace: true, state: { showNextSprintPopup: true } });
                          return;
                      }

                      // 4. No active or queued sprints - go to explore
                      navigate('/explore', { replace: true });
                      return;
                  } catch (e) {
                      console.error("Redirect tracking error", e);
                  }
              }

              // Default fallback
              navigate('/dashboard', { replace: true });
          }
      };
      handleUserRedirect();
  }, [user, mustVerifyEmail, navigate, targetSprintId, targetTrackId, tx_ref]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    if (!email || !password) {
        setEmailError('Required fields empty.');
        return;
    }
    setIsLoading(true);
    setEmailError('');

    try {
        await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
        localStorage.removeItem('vectorise_active_role');
        // Success - AuthContext will update and trigger redirect
        // We set isLoading to false so the button doesn't spin forever if redirect is slow
        setIsLoading(false);
    } catch (error: any) {
        setEmailError('Authentication failed. Check your credentials.');
        setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
        setEmailError("Enter your email address first.");
        return;
    }
    try {
        setIsLoading(true);
        await forgotPassword(email);
        setResetSent(true);
        setEmailError('');
        setTimeout(() => setResetSent(false), 5000);
    } catch (err: any) {
        setEmailError("Failed to send reset link. User not found?");
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="h-[100dvh] w-screen bg-[#FAFAFA] flex items-center justify-center px-6 overflow-hidden font-sans">
      <div className="w-full max-w-sm flex flex-col items-center animate-fade-in">
        <div className="w-full bg-white p-8 rounded-[2.5rem] shadow-2xl border border-gray-100 relative overflow-hidden">
            <header className="text-center mb-10 pt-4">
                <h1 className="text-5xl font-black leading-[0.95] text-center tracking-tighter text-gray-900">
                    Continue<br/><span className="text-primary italic pb-1">your rise</span>
                </h1>
            </header>

            <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1">
                    <label className="block text-[8px] font-black text-gray-300 uppercase tracking-widest ml-1">Email Address</label>
                    <input 
                      type="email" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-50 rounded-xl outline-none font-bold text-sm text-black transition-all focus:ring-4 focus:ring-primary/5" 
                      placeholder="Email Address" 
                    />
                </div>
                <div className="space-y-1">
                    <label className="block text-[8px] font-black text-gray-300 uppercase tracking-widest ml-1">Password</label>
                    <div className="relative">
                      <input 
                        type={showPassword ? 'text' : 'password'}
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-50 rounded-xl outline-none focus:ring-4 focus:ring-primary/5 font-bold text-sm text-black pr-12" 
                        placeholder="Password" 
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-primary transition-colors focus:outline-none"
                      >
                        {showPassword ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                </div>

                <div className="flex justify-end pr-1">
                    <button 
                      type="button" 
                      onClick={handleForgotPassword}
                      className="text-[9px] font-black text-primary uppercase tracking-widest hover:underline"
                    >
                      Forgot Password?
                    </button>
                </div>
                
                {emailError && <p className="text-[10px] text-red-600 font-black uppercase text-center">{emailError}</p>}
                {resetSent && <p className="text-[10px] text-green-600 font-black uppercase text-center">Reset link sent to your inbox.</p>}
                {authMessage && !emailError && !resetSent && (
                    <div className="p-3 bg-primary/5 border border-primary/10 rounded-xl text-[10px] text-primary font-black uppercase tracking-widest text-center animate-pulse">
                        {authMessage}
                    </div>
                )}

                <Button type="submit" isLoading={isLoading} className="w-full py-4 bg-primary text-white rounded-full text-[10px] font-black uppercase tracking-[0.2em]">
                    Log In & Resume
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
              disabled={isLoading}
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
            
            <p className="mt-8 text-center text-[9px] font-black text-gray-300 uppercase tracking-widest leading-none">
                New here? <Link to="/welcome" className="text-primary hover:underline">Start your rise</Link>
            </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;