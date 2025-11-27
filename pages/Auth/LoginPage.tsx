
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/Button';
import { MOCK_USERS } from '../../services/mockData';
import { UserRole } from '../../types';

const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleEmailLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');

    if (!email) {
        setEmailError('Email is required.');
        return;
    }

    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address.');
      return;
    }

    const user = MOCK_USERS.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (user) {
      login(user.id);
      navigate('/dashboard');
    } else {
      setEmailError('No user found with this email address.');
    }
  };

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
        
        {/* Google Sign In Button */}
        <button 
            type="button"
            className="w-full flex items-center justify-center gap-3 bg-white border border-gray-200 text-gray-700 font-semibold py-3.5 px-4 rounded-xl hover:bg-gray-50 transition-all hover:shadow-md mb-6 group"
            onClick={() => participant && handleDemoLogin(participant.id)} // Mocking Google login to use participant account
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

        <form onSubmit={handleEmailLogin} className="mb-8 space-y-4">
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
                {emailError && <p className="mt-1 text-sm text-red-600">{emailError}</p>}
            </div>
            <Button type="submit" className="w-full justify-center py-3.5 rounded-xl shadow-lg text-lg">Sign In</Button>
        </form>

        {/* Demo Section for Development Convenience */}
        <div className="mt-8 pt-6 border-t border-gray-100">
            <p className="text-xs text-center text-gray-400 mb-4 uppercase tracking-widest font-semibold">Demo Accounts</p>
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
    </div>
  );
};

export default LoginPage;
