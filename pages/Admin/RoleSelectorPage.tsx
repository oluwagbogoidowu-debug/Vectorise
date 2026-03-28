
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types';
import LocalLogo from '../../components/LocalLogo';
import Button from '../../components/Button';
import { Shield, Users } from 'lucide-react';

const RoleSelectorPage: React.FC = () => {
  const { user, switchRole } = useAuth();
  const navigate = useNavigate();

  if (!user || user.role !== UserRole.ADMIN) {
    navigate('/dashboard');
    return null;
  }

  const handleSelectRole = (role: UserRole) => {
    switchRole(role);
    if (role === UserRole.ADMIN) {
      navigate('/admin/dashboard');
    } else {
      navigate('/coach/dashboard');
    }
  };

  return (
    <div className="h-[100dvh] w-screen bg-[#FAFAFA] flex items-center justify-center px-6 overflow-hidden font-sans">
      <div className="w-full max-w-md flex flex-col items-center animate-fade-in">
        <div className="w-full bg-white p-10 rounded-[3rem] shadow-2xl border border-gray-100 text-center">
          <LocalLogo type="green" className="h-12 w-auto mx-auto mb-8" />
          
          <h1 className="text-3xl font-black text-gray-900 tracking-tight leading-none italic mb-2">
            Choose Your Mode
          </h1>
          <p className="text-gray-400 text-sm font-medium mb-10">
            Select how you want to proceed for this session.
          </p>

          <div className="grid grid-cols-1 gap-4">
            <button
              onClick={() => handleSelectRole(UserRole.ADMIN)}
              className="group relative flex flex-col items-center p-8 bg-gray-50 border-2 border-transparent hover:border-primary rounded-[2rem] transition-all active:scale-95"
            >
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-white transition-colors">
                <Shield className="w-8 h-8" />
              </div>
              <span className="text-sm font-black text-gray-900 uppercase tracking-widest">Admin Mode</span>
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter mt-1">Full System Control</span>
            </button>

            <button
              onClick={() => handleSelectRole(UserRole.COACH)}
              className="group relative flex flex-col items-center p-8 bg-gray-50 border-2 border-transparent hover:border-primary rounded-[2rem] transition-all active:scale-95"
            >
              <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                <Users className="w-8 h-8" />
              </div>
              <span className="text-sm font-black text-gray-900 uppercase tracking-widest">Coach Mode</span>
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter mt-1">Manage Participants & Sprints</span>
            </button>
          </div>

          <p className="mt-10 text-[10px] font-black text-gray-300 uppercase tracking-widest leading-none">
            You can switch back at any time from your profile.
          </p>
        </div>
      </div>
    </div>
  );
};

export default RoleSelectorPage;
