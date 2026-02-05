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
    <header className="bg-white shadow-md">
      <div className="container mx-auto px-4 md:px-6 py-4 flex justify-between items-center">
        <Link to="/" className="flex items-center gap-2">
            <LocalLogo type="green" className="h-10 w-auto object-contain" />
        </Link>
        <nav className="flex items-center space-x-4">
          {user ? (
            <>
              <Link to="/dashboard" className="text-gray-600 hover:text-primary hidden sm:block font-bold text-sm uppercase tracking-widest">Dashboard</Link>
              <Link to="/discover" className="text-gray-600 hover:text-primary hidden sm:block font-bold text-sm uppercase tracking-widest">Discover</Link>
              <div className="flex items-center space-x-3">
                <img src={user.profileImageUrl} alt={user.name} className="w-10 h-10 rounded-full object-cover border-2 border-primary/10 shadow-sm"/>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors text-xs font-black uppercase tracking-widest"
                >
                  Logout
                </button>
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="text-gray-600 hover:text-primary font-bold text-sm uppercase tracking-widest">Login</Link>
              <Link
                to="/onboarding/welcome"
                className="px-6 py-2.5 bg-primary text-white rounded-xl hover:bg-primary-hover transition-colors font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20"
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