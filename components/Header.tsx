
import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LocalLogo from './LocalLogo';

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isLinkActive = (path: string) => location.pathname === path;

  return (
    <header className="fixed top-0 left-0 w-full z-[100] bg-white/95 backdrop-blur-xl border-b border-gray-100">
      <div className="max-w-7xl mx-auto flex justify-between items-center px-6 py-4">
        {/* LOGO CONTAINER */}
        <div className="flex items-center group transition-all">
          <Link to="/" className="flex items-center">
            <LocalLogo type="green" className="h-8 w-auto object-contain transition-transform group-hover:scale-105" />
          </Link>
        </div>

        {/* NAVIGATION / AUTH CONTAINER */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-2">
              <div className="flex px-4 gap-8 mr-2 hidden md:flex">
                <Link 
                  to="/dashboard" 
                  className={`text-[10px] font-black uppercase tracking-[0.2em] transition-colors ${isLinkActive('/dashboard') ? 'text-primary' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  Focus
                </Link>
                <Link 
                  to="/discover" 
                  className={`text-[10px] font-black uppercase tracking-[0.2em] transition-colors ${isLinkActive('/discover') ? 'text-primary' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  Registry
                </Link>
              </div>
              
              <div className="h-8 w-px bg-gray-100 hidden md:block mr-2"></div>

              <div className="flex items-center gap-2">
                <Link to="/profile" className="flex items-center gap-2 group">
                  <img 
                    src={user.profileImageUrl} 
                    alt={user.name} 
                    className="w-9 h-9 rounded-xl object-cover border border-gray-100 shadow-sm group-hover:ring-2 group-hover:ring-primary/10 transition-all"
                  />
                  <span className="hidden lg:block text-[10px] font-black text-gray-700 uppercase tracking-widest pr-2">
                    {user.name.split(' ')[0]}
                  </span>
                </Link>
                
                <button
                  onClick={handleLogout}
                  className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                  title="Logout"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/onboarding/welcome"
                className="px-8 py-3 bg-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
              >
                Join
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
