
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Using a clean placeholder to avoid syntax errors with massive Base64 strings
  const logoSrc = "https://ui-avatars.com/api/?name=Vectorise&background=0E7850&color=fff&length=1&font-size=0.5";

  return (
    <header className="bg-white shadow-md">
      <div className="container mx-auto px-4 md:px-6 py-4 flex justify-between items-center">
        <Link to="/" className="flex items-center gap-2">
            <img src={logoSrc} alt="Vectorise Logo" className="h-8 w-8 rounded-md" />
            <span className="font-bold text-xl text-primary tracking-tight">Vectorise</span>
        </Link>
        <nav className="flex items-center space-x-4">
          {user ? (
            <>
              <Link to="/dashboard" className="text-gray-600 hover:text-primary hidden sm:block">Dashboard</Link>
              {user.role === UserRole.PARTICIPANT && <Link to="/discover" className="text-gray-600 hover:text-primary hidden sm:block">Discover</Link>}
              <div className="flex items-center space-x-3">
                <img src={user.profileImageUrl} alt={user.name} className="w-10 h-10 rounded-full object-cover"/>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors text-sm"
                >
                  Logout
                </button>
              </div>
            </>
          ) : (
            <>
              <Link to="/discover" className="text-gray-600 hover:text-primary">Discover</Link>
              <Link to="/login" className="text-gray-600 hover:text-primary">Login</Link>
              <Link
                to="/discover"
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover transition-colors"
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
