
import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.tsx';
import Button from '../../components/Button.tsx';
import { auth } from '../../services/firebase.ts';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { sprintService } from '../../services/sprintService.ts';
import { UserRole } from '../../types.ts';

const LoginPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Intent capture from payment success flow
  const targetSprintId = location.state?.targetSprintId;

  useEffect(() => {
      const handleUserRedirect = async () => {
          if (user) {
              if (user.role === UserRole.PARTICIPANT) {
                  try {
                      // 1. Check for payment-driven enrollment intent
                      if (targetSprintId) {
                          const sprint = await sprintService.getSprintById(targetSprintId);
                          if (sprint) {
                              const enrollment = await sprintService.enrollUser(user.id, targetSprintId, sprint.duration);
                              navigate(`/participant/sprint/${enrollment.id}`);
                              return;
                          }
                      }

                      // 2. Resume active journey
                      const enrollments = await sprintService.getUserEnrollments(user.id);
                      const active = enrollments.find(e => e.progress.some(p => !p.completed));
                      if (active) {
                          navigate(`/participant/sprint/${active.id}`);
                          return;
                      }

                      // 3. Last enrolled fallback
                      if (enrollments.length > 0) {
                          const latest = [...enrollments].sort((a,b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())[0];
                          navigate(`/participant/sprint/${latest.id}`);
                          return;
                      }
                  } catch (e) {
                      console.error("Redirect tracking error", e);
                  }
              }
              navigate('/dashboard');
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
        await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (error: any) {
        setEmailError('Authentication failed. Check credentials.');
        setIsLoading(false);
    }
  };

  return (
    <div className="h-[100dvh] w-screen bg-[#FAFAFA] flex items-center justify-center px-6 overflow-hidden font-sans">
      <div className="w-full max-w-sm flex flex-col items-center animate-fade-in">
        <div className="w-full bg-white p-8 rounded-[2rem] shadow-2xl border border-gray-100 relative">
            <div className="text-center mb-6">
                <h2 className="text-xl font-black text-gray-900 tracking-tight leading-none mb-1">Welcome Back</h2>
                <p className="text-gray-400 font-bold text-[9px] uppercase tracking-widest">Registry Access</p>
            </div>
            
            <form onSubmit={handleLogin} className="space-y-4">
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-50 rounded-xl outline-none font-bold text-sm" placeholder="Email Address" />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-50 rounded-xl outline-none font-bold text-sm" placeholder="Password" />
                
                {emailError && <p className="text-[10px] text-red-600 font-black uppercase text-center">{emailError}</p>}

                <Button type="submit" isLoading={isLoading} className="w-full py-3.5 bg-primary text-white rounded-full text-[10px] font-black uppercase tracking-[0.2em]">
                    Log In & Resume
                </Button>
            </form>
            
            <p className="mt-8 text-center text-[9px] font-black text-gray-300 uppercase tracking-widest leading-none">
                New here? <Link to="/onboarding/welcome" className="text-primary hover:underline">Start your rise</Link>
            </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
