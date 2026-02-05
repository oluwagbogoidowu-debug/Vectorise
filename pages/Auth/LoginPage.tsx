
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.tsx';
import Button from '../../components/Button.tsx';
import { MOCK_USERS } from '../../services/mockData.ts';
import { auth } from '../../services/firebase.ts';
import { signInWithEmailAndPassword, signOut, sendEmailVerification, sendPasswordResetEmail } from 'firebase/auth';

const LoginPage: React.FC = () => {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');
    const cleanEmail = email.trim();

    if (!cleanEmail || !password) {
        setEmailError('Required fields empty.');
        return;
    }

    if (!validateEmail(cleanEmail)) {
      setEmailError('Invalid email format.');
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
            }, 600);
            return;
        } else {
            setEmailError('Auth mismatch.');
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
        setEmailError('Authentication failed.');
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
          setResetMessage('Required.');
          setResetStatus('error');
          return;
      }
      setResetStatus('sending');
      try {
          await sendPasswordResetEmail(auth, resetEmail);
          setResetStatus('sent');
          setResetMessage(`Check inbox.`);
      } catch (error: any) {
          setResetStatus('error');
          setResetMessage('Reset failed.');
      }
  };

  return (
    <div className="h-[100dvh] w-screen bg-[#FAFAFA] flex items-center justify-center px-6 overflow-hidden selection:bg-primary/10 font-sans">
      
      <div className="w-full max-w-sm flex flex-col items-center animate-fade-in">
        <div className="w-full bg-white p-7 md:p-8 rounded-[2rem] shadow-[0_20px_40px_-10px_rgba(0,0,0,0.05)] border border-gray-100 relative overflow-hidden">
            {!showForgotPassword ? (
                <>
                    <div className="text-center mb-6">
                        <h2 className="text-xl font-black text-gray-900 tracking-tight leading-none mb-1">Continue your rise</h2>
                        <p className="text-gray-400 font-bold text-[9px] uppercase tracking-widest">Growth Registry Access</p>
                    </div>
                    
                    <form onSubmit={handleLogin} className="space-y-3.5">
                        <div>
                            <label className="block text-[8px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1 ml-1">Account Email</label>
                            <input 
                                type="email" 
                                value={email}
                                onChange={(e) => { setEmail(e.target.value); if (emailError) setEmailError(''); }}
                                className={`w-full px-4 py-3 bg-gray-50 border rounded-xl focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/20 transition-all font-bold text-gray-900 text-sm placeholder-gray-300 ${emailError ? 'border-red-100 bg-red-50/20' : 'border-gray-50'}`}
                                placeholder="name@email.com"
                            />
                        </div>
                        <div>
                            <div className="flex justify-between items-center mb-1 px-1">
                                <label className="block text-[8px] font-black text-gray-400 uppercase tracking-[0.2em]">Password</label>
                                <button type="button" onClick={() => setShowForgotPassword(true)} className="text-[8px] text-primary hover:text-primary-hover font-black uppercase tracking-widest">Forgot?</button>
                            </div>
                            <div className="relative">
                                <input 
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => { setPassword(e.target.value); if (emailError) setEmailError(''); }}
                                    className={`w-full px-4 py-3 bg-gray-50 border rounded-xl focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/20 transition-all font-bold text-gray-900 text-sm pr-10 placeholder-gray-300 ${emailError ? 'border-red-100 bg-red-50/20' : 'border-gray-50'}`}
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-300 hover:text-primary transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                </button>
                            </div>
                        </div>
                        
                        {emailError && (
                            <div className="bg-red-50 rounded-lg py-2 px-3 flex items-center gap-2">
                                <div className="w-1 h-1 bg-red-400 rounded-full"></div>
                                <p className="text-[9px] text-red-600 font-black uppercase tracking-widest">{emailError}</p>
                            </div>
                        )}

                        <Button 
                            type="submit" 
                            isLoading={isLoading} 
                            className="w-full py-3.5 bg-primary text-white rounded-full shadow-md text-[10px] font-black uppercase tracking-[0.2em] transition-all hover:scale-[1.01] active:scale-95"
                        >
                            Log In
                        </Button>
                    </form>
                </>
            ) : (
                <div className="animate-fade-in">
                    <button onClick={() => setShowForgotPassword(false)} className="flex items-center gap-1.5 text-gray-400 hover:text-primary transition-colors mb-4 text-[8px] font-black uppercase tracking-widest">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
                        Back to Login
                    </button>
                    <div className="text-center mb-6">
                        <h2 className="text-xl font-black text-gray-900 tracking-tight leading-none mb-1.5">Reset access</h2>
                        <p className="text-gray-400 font-bold text-[9px] uppercase tracking-widest leading-relaxed">Registry Recovery</p>
                    </div>
                    <form onSubmit={handleSendResetLink} className="space-y-4">
                        <div>
                            <label className="block text-[8px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1 ml-1">Email</label>
                            <input 
                                type="email"
                                value={resetEmail}
                                onChange={(e) => setResetEmail(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/20 transition-all font-bold text-gray-900 text-sm"
                                placeholder="your@email.com"
                            />
                        </div>
                        {resetMessage && (
                            <div className={`py-2 px-3 rounded-lg border text-[9px] font-black uppercase tracking-widest ${resetStatus === 'sent' ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
                                {resetMessage}
                            </div>
                        )}
                        <Button 
                            type="submit" 
                            isLoading={resetStatus === 'sending'}
                            className="w-full py-3.5 bg-primary text-white rounded-full shadow-md text-[10px] font-black uppercase tracking-[0.2em]"
                        >
                            Send Recovery
                        </Button>
                    </form>
                </div>
            )}
            
            <div className="mt-6 flex flex-col items-center gap-4">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-300 font-bold tracking-tight">New to Vectorise?</span>
                    <Link to="/onboarding/welcome" className="text-primary font-black text-[9px] uppercase tracking-widest hover:underline">Start your rise</Link>
                </div>
                <div className="w-full h-px bg-gray-50"></div>
                <Link to="/onboarding/coach/welcome" className="group flex items-center gap-2 text-gray-300 hover:text-primary transition-colors">
                    <span className="text-[8px] font-black uppercase tracking-[0.2em]">Coach Access</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-2 w-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                </Link>
            </div>
        </div>

        {showVerifyModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-gray-900/95 backdrop-blur-sm animate-fade-in">
                <div className="bg-white rounded-[2rem] p-8 max-w-xs w-full text-center shadow-2xl">
                    <div className="w-12 h-12 bg-primary/5 text-primary rounded-2xl flex items-center justify-center mx-auto mb-5">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    </div>
                    <h3 className="text-lg font-black text-gray-900 mb-1">Verify Registry</h3>
                    <p className="text-gray-400 font-medium mb-6 text-xs leading-relaxed italic">Check your inbox to activate.</p>
                    
                    <div className="space-y-2">
                        <Button 
                            onClick={handleResendVerification}
                            isLoading={resendStatus === 'sending'}
                            variant="secondary"
                            className="w-full py-3 bg-gray-50 text-gray-500 font-black uppercase tracking-widest text-[9px] rounded-xl"
                        >
                            Resend Link
                        </Button>
                        <button 
                            onClick={handleCloseVerification}
                            className="w-full py-2 text-primary font-black uppercase tracking-widest text-[8px] hover:underline"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
};

export default LoginPage;
