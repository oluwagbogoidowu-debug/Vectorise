
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import LocalLogo from '../../../components/LocalLogo';
import { PushToggle } from '../../../components/PushToggle';

const AccountSettings: React.FC = () => {
  const navigate = useNavigate();
  const { logout, isEmailUnverified, resetVerificationDeferral } = useAuth();

  const [isDarkMode, setIsDarkMode] = useState(() => {
    return document.documentElement.classList.contains('dark');
  });

  const toggleDarkMode = () => {
    const nextVal = !isDarkMode;
    setIsDarkMode(nextVal);
    if (nextVal) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  return (
    <div className="bg-[#FDFDFD] dark:bg-[#121111] h-screen w-full font-sans overflow-hidden flex flex-col animate-fade-in transition-colors duration-300">
      <header className="bg-white dark:bg-zinc-900 px-6 pt-12 pb-6 border-b border-gray-50 dark:border-zinc-800 flex items-center justify-between transition-colors duration-300">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-200 transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h1 className="text-lg font-black text-gray-900 dark:text-gray-100 uppercase tracking-widest">Account</h1>
        <div className="w-10"></div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 space-y-4">
        {isEmailUnverified && (
          <div className="p-5 bg-amber-500/10 dark:bg-amber-500/5 border border-amber-500/20 rounded-3xl shadow-sm flex items-center justify-between transition-colors duration-300">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/15 flex items-center justify-center text-lg">✉️</div>
              <div>
                <span className="text-[10px] font-black text-amber-800 dark:text-amber-400 uppercase tracking-widest block">Email Unverified</span>
                <span className="text-[8px] text-amber-600/80 dark:text-amber-500/80 font-bold uppercase tracking-wider block mt-0.5">Secure your rise from the bottom</span>
              </div>
            </div>
            
            <button 
              onClick={() => {
                resetVerificationDeferral();
                navigate('/verify-email');
              }}
              className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-full text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 cursor-pointer shadow-sm"
            >
              Verify Now
            </button>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-[8px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.3em] mb-3 px-1">Settings</p>
          
          <Link to="/profile/settings/edit" className="flex items-center justify-between p-5 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl shadow-sm group active:scale-[0.98] transition-all">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-primary/5 dark:bg-primary/10 flex items-center justify-center text-lg">👤</div>
              <span className="text-xs font-black text-gray-900 dark:text-gray-100 uppercase tracking-widest">Edit Profile</span>
            </div>
            <svg className="w-4 h-4 text-gray-300 group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
          </Link>

          <Link to="/profile/settings/identity" className="flex items-center justify-between p-5 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl shadow-sm group active:scale-[0.98] transition-all">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-primary/5 dark:bg-primary/10 flex items-center justify-center text-lg">🧬</div>
              <span className="text-xs font-black text-gray-900 dark:text-gray-100 uppercase tracking-widest">Identity Settings</span>
            </div>
            <svg className="w-4 h-4 text-gray-300 group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
          </Link>

          {/* Dark Mode toggle before push notification */}
          <div className="p-5 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl shadow-sm flex items-center justify-between transition-colors duration-300">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-[#0E7850]/5 dark:bg-[#0E7850]/10 flex items-center justify-center text-lg">
                {isDarkMode ? '🌙' : '☀️'}
              </div>
              <div>
                <span className="text-xs font-black text-gray-900 dark:text-gray-100 uppercase tracking-widest block">Dark Mode</span>
                <span className="text-[9px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">{isDarkMode ? 'Enabled' : 'Disabled'}</span>
              </div>
            </div>
            
            <button 
              onClick={toggleDarkMode}
              className={`w-12 h-6 rounded-full transition-all duration-300 relative ${isDarkMode ? "bg-[#0E7850] shadow-lg shadow-[#0E7850]/20" : "bg-gray-200"}`}
            >
              <div 
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-sm ${isDarkMode ? "right-1" : "left-1"}`}
              />
            </button>
          </div>

          <div className="p-5 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl shadow-sm">
            <PushToggle />
          </div>
        </div>

        <div className="pt-8">
          <button 
            onClick={logout}
            className="w-full py-5 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 text-rose-600 dark:text-rose-400 font-black uppercase tracking-[0.2em] text-[10px] rounded-3xl active:scale-95 transition-all"
          >
            Sign Out
          </button>
        </div>
      </main>

      <footer className="p-10 flex justify-center opacity-10 dark:opacity-20">
        <LocalLogo type="green" className="h-6 w-auto" />
      </footer>
    </div>
  );
};

export default AccountSettings;
