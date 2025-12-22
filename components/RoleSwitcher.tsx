
import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';

const RoleSwitcher: React.FC = () => {
  const { user, activeRole, switchRole } = useAuth();

  // A non-coach user or a user who hasn't finished coach onboarding shouldn't see the switcher.
  // We infer they have coach capabilities if the `hasCoachProfile` flag is true.
  if (!user || !(user as any).hasCoachProfile) {
    return null;
  }

  const handleRoleChange = (newRole: UserRole) => {
    if (newRole !== activeRole) {
      switchRole(newRole);
    }
  };

  return (
    <div className="flex items-center bg-gray-200 rounded-full p-1 text-sm">
      <button
        onClick={() => handleRoleChange(UserRole.PARTICIPANT)}
        className={`px-3 py-1 font-semibold rounded-full transition-colors duration-300 ease-in-out ${
          activeRole === UserRole.PARTICIPANT
            ? 'bg-primary text-white shadow-sm'
            : 'text-gray-600 hover:bg-gray-300'
        }`}
      >
        Learner
      </button>
      <button
        onClick={() => handleRoleChange(UserRole.COACH)}
        className={`px-3 py-1 font-semibold rounded-full transition-colors duration-300 ease-in-out ${
          activeRole === UserRole.COACH
            ? 'bg-primary text-white shadow-sm'
            : 'text-gray-600 hover:bg-gray-300'
        }`}
      >
        Coach
      </button>
    </div>
  );
};

export default RoleSwitcher;
