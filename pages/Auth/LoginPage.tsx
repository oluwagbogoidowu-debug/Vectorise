import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.tsx';
import Button from '../../components/Button.tsx';
import { MOCK_USERS } from '../../services/mockData.ts';
import { auth } from '../../services/firebase.ts';
import { signInWithEmailAndPassword, signOut, sendEmailVerification, sendPasswordResetEmail } from 'firebase/auth';
import LocalLogo from '../../components/LocalLogo.tsx';

const LoginPage: React.FC = () => {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // PWA Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);

  // Verification Modal State
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [unverifiedUser, setUnverifiedUser] = useState<any>(null);
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  // Forgot Password State
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetStatus, setResetStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [resetMessage, setResetMessage] = useState('');

  useEffect(() => {
      if (user) {
          navigate('/dashboard');
      }
  }, [user, navigate]);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    });

    window.addEventListener('appinstalled', () => {
      setDeferredPrompt(null);
      setShowInstallBtn(false);
    });
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowInstallBtn(false);
    }
  };

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');
    const cleanEmail = email.trim();

    if (!cleanEmail || !password) {
        setEmailError('Enter your credentials to continue.');
        return;
    }

    if (!validateEmail(cleanEmail)) {
      setEmailError('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);

    const mockUser = MOCK_USERS.find(u => u.email.toLowerCase() === cleanEmail.toLowerCase());
    const isDemoAccount = mockUser && mockUser.id.length < 20;

    if (isDemoAccount) {
        if (password === 'password') {
            setTimeout(() => {
                login(mockUser.id);
                navigate('/dashboard');
                setIsLoading(false);
            }, 800);
            return;
        } else {
            setEmailError('Credentials mismatch. Please check again.');
            setIsLoading(false);
            return;
        }
    }

    try {
        const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
        const fbUser = userCredential.user;
        
        if (!fbUser.emailVerified) {
            setUnverifiedUser(fbUser);
            setShowVerifyModal(true);
            setIsLoading(false);
            await signOut(auth);
            return;
        }
    } catch (error: any) {
        if (error.code === 'auth/network-request-failed') {
             setEmailError('Connection lost. Check your network.');
        } else if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
             setEmailError('Invalid email or password.');
        } else {
             setEmailError('Authentication failed. Try again.');
        }
    } finally {
        if (!unverifiedUser) {
             setIsLoading(false);
        }
    }
  };

  const handleResendVerification = async () => {
      if (!unverifiedUser) return;
      setResendStatus('sending');
      try {
          await sendEmailVerification(unverifiedUser);
          setResendStatus('sent');
      } catch (error) {
          setResendStatus('error');
      }
  };

  const handleCloseVerification = async () => {
      await signOut(auth);
      setShowVerifyModal(false);
      setUnverifiedUser(null);
      setIsLoading(false);
  };

  const handleSendResetLink = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!resetEmail) {
          setResetMessage('Enter your email to reset.');
          setResetStatus('error');
          return;
      }
      setResetStatus('sending');
      try {
          await sendPasswordResetEmail(auth, resetEmail);
          setResetStatus('sent');
          setResetMessage(`Check ${resetEmail} for the link.`);
      } catch (error: any) {
          setResetStatus('error');
          setResetMessage('Unable to send reset link.');
      }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center px-6 py-12 selection:bg-primary/10">
      <div className="w-full max-w-md animate-fade-in">
        
        {/* LOGO AREA & INSTALL BUTTON */}
        <div className="flex flex-col items-center mb-12 gap-6">
            <Link to="/">
                <LocalLogo type="green" className="h-10 w-auto opacity-90 hover:opacity-100 transition-opacity" />
            </Link>
            
            {showInstallBtn && (
              <button 
                onClick={handleInstallClick}
                className="flex items-center gap-2 px-5 py-2.5 bg-white border border-primary/20 text-primary rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-95 animate-bounce-subtle"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Install Web App</span>
              </button>
            )}
        </div>

        <div className="bg-white p-10 md:p-14 rounded-[3.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.08)] border border-gray-100 relative overflow-hidden">
            {!showForgotPassword ? (
                <>
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-black text-gray-900 tracking-tight leading-none mb-3">Continue your rise</h2>
                        <p className="text-gray-400 font-medium">Welcome back to your growth path.</p>
                    </div>
                    
                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label htmlFor="email" className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 ml-1">Email Registry</label>
                            <input 
                                type="email" 
                                id="email"
                                value={email}
                                onChange={(e) => { setEmail(e.target.value); if (emailError) setEmailError(''); }}
                                className={`w-full px-7 py-5 bg-gray-50 border rounded-3xl focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/30 transition-all font-bold text-gray-900 placeholder-gray-300 ${emailError ? 'border-red-100 bg-red-50/30' : 'border-gray-50 hover:border-gray-200'}`}
                                placeholder="jamie@example.com"
                            />
                        </div>
                        <div>
                            <div className="flex justify-between items-center mb-2 px-1">
                                <label htmlFor="password" className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Password</label>
                                <button type="button" onClick={() => setShowForgotPassword(true)} className="text-[10px] text-primary hover:text-primary-hover font-black uppercase tracking-widest transition-colors">Forgot?</button>
                            </div>
                            <div className="relative group">
                                <input 
                                    type={showPassword ? "text" : "password"}
                                    id="password"
                                    value={password}
                                    onChange={(e) => { setPassword(e.target.value); if (emailError) setEmailError(''); }}
                                    className={`w-full px-7 py-5 bg-gray-50 border rounded-3xl focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/30 transition-all font-bold text-gray-900 pr-16 placeholder-gray-300 ${emailError ? 'border-red-100 bg-red-50/30' : 'border-gray-50 hover:border-gray-200'}`}
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-6 flex items-center text-gray-300 hover:text-primary transition-colors"
                                >
                                    {showPassword ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                    )}
                                </button>
                            </div>
                        </div>
                        
                        {emailError && (
                            <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center gap-3 animate-fade-in">
                                <div className="w-1.5 h-1.5 bg-red-400 rounded-full"></div>
                                <p className="text-xs text-red-600 font-bold">{emailError}</p>
                            </div>
                        )}

                        <Button 
                            type="submit" 
                            isLoading={isLoading} 
                            className="w-full justify-center py-6 bg-primary text-white rounded-full shadow-2xl shadow-primary/20 text-sm font-black uppercase tracking-[0.25em] transition-transform hover:scale-[1.02] active:scale-95"
                        >
                            Log In
                        </Button>
                    </form>
                </>
            ) : (
                <div className="animate-fade-in">
                    <button onClick={() => setShowForgotPassword(false)} className="flex items-center gap-2 text-gray-400 hover:text-primary transition-colors mb-8 text-[10px] font-black uppercase tracking-widest">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
                        Back to Login
                    </button>
                    <div className="text-center mb-10">
                        <h2 className="text-3xl font-black text-gray-900 tracking-tight leading-none mb-3">Reset access</h2>
                        <p className="text-gray-400 font-medium leading-relaxed">We'll send a recovery link to your registered email address.</p>
                    </div>
                    <form onSubmit={handleSendResetLink} className="space-y-6">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 ml-1">Account Email</label>
                            <input 
                                type="email"
                                value={resetEmail}
                                onChange={(e) => setResetEmail(e.target.value)}
                                className="w-full px-7 py-5 bg-gray-50 border border-gray-100 rounded-3xl focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/30 transition-all font-bold text-gray-900"
                                placeholder="your@email.com"
                            />
                        </div>
                        {resetMessage && (
                            <div className={`p-4 rounded-2xl border text-xs font-bold ${resetStatus === 'sent' ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
                                {resetMessage}
                            </div>
                        )}
                        <Button 
                            type="submit" 
                            isLoading={resetStatus === 'sending'}
                            className="w-full justify-center py-6 bg-primary text-white rounded-full shadow-xl text-sm font-black uppercase tracking-[0.2em]"
                        >
                            Send Recovery Link
                        </Button>
                    </form>
                </div>
            )}
            
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
        </div>

        <div className="mt-12 space-y-8">
            <div className="flex flex-col items-center gap-2">
                <p className="text-sm text-gray-400 font-medium">New to Vectorise?</p>
                <Link to="/onboarding/intro" className="text-primary font-black text-xs uppercase tracking-widest hover:underline px-4 py-2 bg-white rounded-full shadow-sm border border-gray-100 transition-all hover:scale-105 active:scale-95">
                    Start your rise here
                </Link>
            </div>

            <div className="pt-8 border-t border-gray-100 flex flex-col items-center">
                <Link to="/onboarding/coach/welcome" className="group flex items-center gap-3">
                    <span className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em] group-hover:text-primary transition-colors">I am a coach</span>
                    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-gray-400 group-hover:text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                    </div>
                </Link>
            </div>
        </div>

        {showVerifyModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-gray-900/90 backdrop-blur-xl animate-fade-in">
                <div className="bg-white rounded-[3rem] p-10 max-w-sm w-full text-center shadow-2xl border border-white/20">
                    <div className="w-20 h-20 bg-primary/10 text-primary rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-inner">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <h3 className="text-2xl font-black text-gray-900 mb-3 tracking-tight">Verify Registry</h3>
                    <p className="text-gray-500 font-medium mb-10 leading-relaxed italic">
                        Please check your inbox to activate your growth path.
                    </p>
                    
                    <div className="space-y-4">
                        <Button 
                            onClick={handleResendVerification}
                            isLoading={resendStatus === 'sending'}
                            variant="secondary"
                            className="w-full py-4 bg-gray-50 text-gray-500 font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-gray-100"
                        >
                            {resendStatus === 'sent' ? 'Link Resent' : 'Resend Link'}
                        </Button>
                        <button 
                            onClick={handleCloseVerification}
                            className="w-full py-4 text-primary font-black uppercase tracking-widest text-[10px] hover:underline"
                        >
                            Close & Continue
                        </button>
                    </div>
                </div>
            </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes bounceSubtle { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        .animate-bounce-subtle { animation: bounceSubtle 3s ease-in-out infinite; }
      `}</style>
    </div>
  );
};

export default LoginPage;