import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.tsx';
import Button from '../../components/Button.tsx';
import LocalLogo from '../../components/LocalLogo.tsx';
import { auth } from '../../services/firebase.ts';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { sprintService } from '../../services/sprintService.ts';
import { UserRole } from '../../types.ts';

const LoginPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Accept prefilled email from location state
  const initialEmail = location.state?.prefilledEmail || '';
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Intent capture from payment success flow
  const targetSprintId = location.state?.targetSprintId;

  useEffect(() => {
      // Sync state if initialEmail changes
      if (initialEmail && !email) {
          setEmail(initialEmail);
      }
  }, [initialEmail]);

  useEffect(() => {
      const handleUserRedirect = async () => {
          if (user) {
              if (user.role === UserRole.PARTICIPANT) {
                  try {
                      // 1. Check for payment-driven enrollment intent - Use replace: true
                      if (targetSprintId) {
                          const sprint = await sprintService.getSprintById(targetSprintId);
                          if (sprint) {
                              const enrollment = await sprintService.enrollUser(user.id, targetSprintId, sprint.duration);
                              navigate(`/participant/sprint/${enrollment.id}`, { replace: true });
                              return;
                          }
                      }

                      // 2. Resume active journey - Use replace: true
                      const enrollments = await sprintService.getUserEnrollments(user.id);
                      const active = enrollments.find(e => e.progress.some(p => !p.completed));
                      if (active) {
                          navigate(`/participant/sprint/${active.id}`, { replace: true });
                          return;
                      }

                      // 3. Fallback to dashboard
                  } catch (e) {
                      console.error("Redirect tracking error", e);
                  }
              }
              navigate('/dashboard', { replace: true });
          }
      };
      handleUserRedirect();
  }, [user, navigate, targetSprintId]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
        setEmailError('Required fields empty.');
        return;
    }
    setIsLoading(true);

    try {
        await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
    } catch (error: any) {
        setEmailError('Authentication failed. Check your credentials.');
        setIsLoading(false);
    }
  };

  return (
    <div className="h-[100dvh] w-screen bg-[#FAFAFA] flex items-center justify-center px-6 overflow-hidden font-sans">
      <div className="w-full max-w-sm flex flex-col items-center animate-fade-in">
        <div className="w-full bg-white p-8 rounded-[2rem] shadow-2xl border border-gray-100 relative overflow-hidden">
            {/* Home Icon Button */}
            <Link to="/" className="absolute top-6 right-6 text-gray-300 hover:text-primary transition-all duration-300 active:scale-90">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
            </Link>

            <header className="text-center mb-8 pt-4">
                <LocalLogo type="green" className="h-10 w-auto mx-auto mb-4" />
                <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none italic">
                    Continue your rise
                </h1>
            </header>

            <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1">
                    <label className="block text-[8px] font-black text-gray-300 uppercase tracking-widest ml-1">Email Address</label>
                    <input 
                      type="email" 
                      value={email} 
                      readOnly={!!initialEmail}
                      onChange={(e) => setEmail(e.target.value)} 
                      className={`w-full px-4 py-3 bg-gray-50 border border-gray-50 rounded-xl outline-none font-bold text-sm transition-all ${initialEmail ? 'opacity-60 bg-gray-100' : 'focus:ring-4 focus:ring-primary/5'}`} 
                      placeholder="Email Address" 
                    />
                </div>
                <div className="space-y-1">
                    <label className="block text-[8px] font-black text-gray-300 uppercase tracking-widest ml-1">Password</label>
                    <input 
                      type="password" 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-50 rounded-xl outline-none focus:ring-4 focus:ring-primary/5 font-bold text-sm" 
                      placeholder="Password" 
                    />
                </div>
                
                {emailError && <p className="text-[10px] text-red-600 font-black uppercase text-center">{emailError}</p>}

                <Button type="submit" isLoading={isLoading} className="w-full py-4 bg-primary text-white rounded-full text-[10px] font-black uppercase tracking-[0.2em]">
                    Log In & Resume
                </Button>
            </form>
            
            <p className="mt-8 text-center text-[9px] font-black text-gray-300 uppercase tracking-widest leading-none">
                New here? <Link to="/" className="text-primary hover:underline">Start your rise</Link>
            </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;