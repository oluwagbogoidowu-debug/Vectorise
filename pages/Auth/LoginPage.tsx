
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/Button';
import { MOCK_USERS } from '../../services/mockData';
import { UserRole } from '../../types';
import { auth } from '../../services/firebase';
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

  // Auto-redirect if user is already logged in
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

    if (!cleanEmail) {
        setEmailError('Email is required.');
        return;
    }
    if (!password) {
        setEmailError('Password is required.');
        return;
    }

    if (!validateEmail(cleanEmail)) {
      setEmailError('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);

    // 1. CHECK FOR MOCK USER (DEMO MODE)
    const mockUser = MOCK_USERS.find(u => u.email.toLowerCase() === cleanEmail.toLowerCase());
    
    // Heuristic: Predefined mock users have short IDs.
    const isDemoAccount = mockUser && mockUser.id.length < 20;

    if (isDemoAccount) {
        if (password === 'password') {
            // Correct Demo Credentials
            setTimeout(() => {
                login(mockUser.id);
                navigate('/dashboard');
                setIsLoading(false);
            }, 800);
            return;
        } else {
            // Wrong Demo Password - Fail locally
            setEmailError('Password or Email Incorrect');
            setIsLoading(false);
            return;
        }
    }

    // 2. CHECK FIREBASE USER (REAL MODE)
    try {
        const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
        const user = userCredential.user;

        // CHECK EMAIL VERIFICATION
        if (!user.emailVerified) {
            // Keep user temporarily signed in to allow sending email, but block access via modal
            setUnverifiedUser(user);
            setShowVerifyModal(true);
            setIsLoading(false);
            return;
        }

        // If verification passed, the AuthContext listener will pick up the state change
        // and the useEffect above will handle the navigation to dashboard.
    } catch (error: any) {
        // Suppress console error for expected user login failures to keep console clean
        if (error.code !== 'auth/invalid-credential' && error.code !== 'auth/user-not-found' && error.code !== 'auth/wrong-password') {
             console.error("Login error", error);
        }
        
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
             setEmailError('Password or Email Incorrect');
        } else if (error.code === 'auth/too-many-requests') {
             setEmailError('Too many failed attempts. Please try again later.');
        } else {
             setEmailError('Failed to sign in. Please check your connection.');
        }
    } finally {
        // Only set loading false if we didn't trigger the modal (modal handles its own state)
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
          console.error("Resend error", error);
          setResendStatus('error');
      }
  };

  const handleCloseVerification = async () => {
      // Sign out to clean up state since they are not allowed in yet
      await signOut(auth);
      setShowVerifyModal(false);
      setUnverifiedUser(null);
      setResendStatus('idle');
      setIsLoading(false);
  };

  // Forgot Password Handlers
  const handleForgotPasswordClick = () => {
      setResetEmail(email); // Pre-fill with user input
      setShowForgotPassword(true);
      setResetStatus('idle');
      setResetMessage('');
  };

  const handleSendResetLink = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!resetEmail) {
          setResetMessage('Please enter your email address.');
          setResetStatus('error');
          return;
      }
      
      setResetStatus('sending');
      try {
          await sendPasswordResetEmail(auth, resetEmail);
          setResetStatus('sent');
          setResetMessage(`We sent you a password change link to ${resetEmail}`);
      } catch (error: any) {
          console.error("Reset password error", error);
          setResetStatus('error');
          if (error.code === 'auth/user-not-found') {
               setResetMessage('No user found with this email address.');
          } else if (error.code === 'auth/invalid-email') {
               setResetMessage('Invalid email address.');
          } else {
               setResetMessage('Failed to send reset email. Please try again.');
          }
      }
  };

  // Keep Demo Login for testing roles quickly via buttons
  const handleDemoLogin = (userId: string) => {
    login(userId);
    navigate('/dashboard');
  };
  
  const coach = MOCK_USERS.find(u => u.role === UserRole.COACH && (u as any).approved);
  const participant = MOCK_USERS.find(u => u.role === UserRole.PARTICIPANT);
  const admin = MOCK_USERS.find(u => u.role === UserRole.ADMIN);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">Welcome Back</h2>
        
        {/* Placeholder Social Login */}
        <button 
            type="button"
            className="w-full flex items-center justify-center gap-3 bg-white border border-gray-200 text-gray-700 font-semibold py-3.5 px-4 rounded-xl hover:bg-gray-50 transition-all hover:shadow-md mb-6 group opacity-50 cursor-not-allowed"
            title="Google Sign In coming soon"
        >
            <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            <span className="group-hover:text-gray-900">Sign in with Google</span>
        </button>

        <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white text-gray-500">Or sign in with email</span>
            </div>
        </div>

        <form onSubmit={handleLogin} className="mb-8 space-y-4">
            <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <input 
                    type="email" 
                    id="email"
                    value={email}
                    onChange={(e) => {
                        setEmail(e.target.value);
                        if (emailError) setEmailError('');
                    }}
                    className={`w-full px-4 py-3 border rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-white ${emailError ? 'border-red-500' : 'border-gray-200'}`}
                    placeholder="Enter your email"
                />
            </div>
            <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <div className="relative">
                    <input 
                        type={showPassword ? "text" : "password"}
                        id="password"
                        value={password}
                        onChange={(e) => {
                            setPassword(e.target.value);
                            if (emailError) setEmailError('');
                        }}
                        className={`w-full px-4 py-3 border rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-white pr-10 ${emailError ? 'border-red-500' : 'border-gray-200'}`}
                        placeholder="Enter your password"
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                    >
                        {showPassword ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
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
            
            {emailError && <p className="mt-1 text-sm text-red-600 text-center font-medium">{emailError}</p>}
            
            <div className="flex justify-end">
                <button
                    type="button"
                    onClick={handleForgotPasswordClick}
                    className="text-sm text-primary hover:underline font-medium"
                >
                    Forgot password?
                </button>
            </div>

            <Button type="submit" isLoading={isLoading} className="w-full justify-center py-3.5 rounded-xl shadow-lg text-lg">Sign In</Button>
        </form>

        <div className="text-center mt-4">
            <p className="text-sm text-gray-600">
                Don't have an account? <Link to="/signup" className="text-primary font-bold hover:underline">Sign Up</Link>
            </p>
        </div>

        {/* Demo Section for Development Convenience */}
        <div className="mt-8 pt-6 border-t border-gray-100">
            <p className="text-xs text-center text-gray-400 mb-4 uppercase tracking-widest font-semibold">Demo Accounts (Pass: 'password')</p>
            <div className="grid grid-cols-1 gap-3">
                {coach && (
                    <button
                    type="button"
                    onClick={() => handleDemoLogin(coach.id)}
                    className="w-full px-4 py-2 text-sm text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left flex items-center justify-between group"
                    >
                        <span>Coach Demo</span>
                        <span className="text-xs text-gray-400 group-hover:text-primary">Login &rarr;</span>
                    </button>
                )}
                {participant && (
                    <button
                    type="button"
                    onClick={() => handleDemoLogin(participant.id)}
                    className="w-full px-4 py-2 text-sm text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left flex items-center justify-between group"
                    >
                        <span>Participant Demo</span>
                        <span className="text-xs text-gray-400 group-hover:text-primary">Login &rarr;</span>
                    </button>
                )}
                 {admin && (
                    <button
                    type="button"
                    onClick={() => handleDemoLogin(admin.id)}
                    className="w-full px-4 py-2 text-sm text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left flex items-center justify-between group"
                    >
                        <span>Admin Demo</span>
                        <span className="text-xs text-gray-400 group-hover:text-primary">Login &rarr;</span>
                    </button>
                )}
            </div>
        </div>
      </div>

      {/* VERIFICATION MODAL */}
      {showVerifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center transform transition-all scale-100">
                <div className="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Email Verification Required</h3>
                <p className="text-gray-600 text-sm mb-6">
                    Please verify your email address <strong>{unverifiedUser?.email}</strong> to access your account.
                </p>
                
                {resendStatus === 'sent' && (
                    <div className="bg-green-50 border border-green-100 text-green-700 p-3 rounded-lg text-sm mb-4">
                        Verification email sent! Please check your inbox and spam folder.
                    </div>
                )}
                
                {resendStatus === 'error' && (
                    <div className="bg-red-50 border border-red-100 text-red-700 p-3 rounded-lg text-sm mb-4">
                        Failed to send email. You might need to wait a moment before trying again.
                    </div>
                )}

                <div className="space-y-3">
                    <Button 
                        onClick={handleResendVerification} 
                        disabled={resendStatus === 'sending' || resendStatus === 'sent'}
                        className="w-full justify-center"
                    >
                        {resendStatus === 'sending' ? 'Sending...' : 'Resend Verification Email'}
                    </Button>
                    <button 
                        onClick={handleCloseVerification}
                        className="text-gray-500 text-sm font-medium hover:text-gray-700 hover:underline"
                    >
                        Back to Login
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* FORGOT PASSWORD MODAL */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center transform transition-all scale-100">
                {resetStatus === 'sent' ? (
                    <>
                        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Check your email</h3>
                        <p className="text-gray-600 text-sm mb-6">
                            {resetMessage}
                        </p>
                        <Button 
                            onClick={() => setShowForgotPassword(false)}
                            className="w-full justify-center"
                        >
                            Back to Sign In
                        </Button>
                    </>
                ) : (
                    <>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Reset Password</h3>
                        <p className="text-gray-600 text-sm mb-6">
                            Enter your email address and we'll send you a link to reset your password.
                        </p>
                        
                        <form onSubmit={handleSendResetLink}>
                            <div className="mb-4">
                                <input 
                                    type="email" 
                                    value={resetEmail}
                                    onChange={(e) => setResetEmail(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-white"
                                    placeholder="Enter your email"
                                    required
                                />
                            </div>
                            
                            {resetStatus === 'error' && (
                                <p className="text-red-600 text-sm mb-4">{resetMessage}</p>
                            )}

                            <div className="space-y-3">
                                <Button 
                                    type="submit" 
                                    isLoading={resetStatus === 'sending'}
                                    className="w-full justify-center"
                                >
                                    Get Reset Link
                                </Button>
                                <button 
                                    type="button"
                                    onClick={() => setShowForgotPassword(false)}
                                    className="text-gray-500 text-sm font-medium hover:text-gray-700 hover:underline block w-full"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </>
                )}
            </div>
        </div>
      )}
      
      <style>{`
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        .animate-fade-in {
            animation: fadeIn 0.2s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default LoginPage;
