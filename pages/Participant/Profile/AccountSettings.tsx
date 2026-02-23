
import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import LocalLogo from '../../../components/LocalLogo';

const AccountSettings: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  return (
    <div className="bg-[#FDFDFD] h-screen w-full font-sans overflow-hidden flex flex-col animate-fade-in">
      <header className="bg-white px-6 pt-12 pb-6 border-b border-gray-50 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-400 hover:text-gray-900 transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h1 className="text-lg font-black text-gray-900 uppercase tracking-widest">Account</h1>
        <div className="w-10"></div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 space-y-4">
        <div className="space-y-2">
          <p className="text-[8px] font-black text-gray-400 uppercase tracking-[0.3em] mb-3 px-1">Settings</p>
          
          <Link to="/profile/settings/edit" className="flex items-center justify-between p-5 bg-white border border-gray-100 rounded-3xl shadow-sm group active:scale-[0.98] transition-all">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-primary/5 flex items-center justify-center text-lg">👤</div>
              <span className="text-xs font-black text-gray-900 uppercase tracking-widest">Edit Profile</span>
            </div>
            <svg className="w-4 h-4 text-gray-300 group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
          </Link>

          <Link to="/profile/settings/identity" className="flex items-center justify-between p-5 bg-white border border-gray-100 rounded-3xl shadow-sm group active:scale-[0.98] transition-all">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-primary/5 flex items-center justify-center text-lg">🧬</div>
              <span className="text-xs font-black text-gray-900 uppercase tracking-widest">Identity Settings</span>
            </div>
            <svg className="w-4 h-4 text-gray-300 group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
          </Link>
        </div>

        <div className="pt-8">
          <button 
            onClick={logout}
            className="w-full py-5 bg-rose-50 border border-rose-100 text-rose-600 font-black uppercase tracking-[0.2em] text-[10px] rounded-3xl active:scale-95 transition-all"
          >
            Sign Out
          </button>
        </div>
      </main>

      <footer className="p-10 flex justify-center opacity-10">
        <LocalLogo type="green" className="h-6 w-auto" />
      </footer>
    </div>
  );
};

export default AccountSettings;
