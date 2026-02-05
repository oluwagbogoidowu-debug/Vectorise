import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LocalLogo from './LocalLogo';

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 md:px-6 py-2 flex justify-between items-center">
        <Link to="/" className="flex items-center gap-2">
            <LocalLogo type="green" className="h-7 w-auto object-contain" />
        </Link>
        <nav className="flex items-center space-x-4">
          {user ? (
            <>
              <Link to="/dashboard" className="text-gray-600 hover:text-primary hidden sm:block font-bold text-[10px] uppercase tracking-widest">Dashboard</Link>
              <Link to="/discover" className="text-gray-600 hover:text-primary hidden sm:block font-bold text-[10px] uppercase tracking-widest">Discover</Link>
              <div className="flex items-center space-x-3">
                <img src={user.profileImageUrl} alt={user.name} className="w-8 h-8 rounded-full object-cover border border-primary/10 shadow-sm"/>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all text-[9px] font-black uppercase tracking-widest"
                >
                  Logout
                </button>
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="text-gray-600 hover:text-primary font-bold text-[10px] uppercase tracking-widest">Login</Link>
              <Link
                to="/onboarding/welcome"
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-black text-[9px] uppercase tracking-widest shadow-md shadow-primary/10"
              >
                Get Started
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;