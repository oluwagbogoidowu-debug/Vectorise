
import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
// FIX: Import Admin type to correctly handle admin users in the auth context.
import { User, Coach, Participant, Admin, Permission, UserRole } from '../types';
import { MOCK_USERS, MOCK_ROLES } from '../services/mockData';

type AuthContextType = {
  // FIX: Add Admin to the user type to allow for an admin to be the authenticated user.
  user: User | Coach | Participant | Admin | null;
  activeRole: UserRole; // The currently active view mode (Member vs Coach)
  login: (userId: string) => void;
  logout: () => void;
  hasPermission: (permission: Permission) => boolean;
  switchRole: (role: UserRole) => void;
  completeCoachOnboarding: (bio: string, niche: string) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // FIX: Add Admin to the user state type.
  const [user, setUser] = useState<User | Coach | Participant | Admin | null>(null);
  const [activeRole, setActiveRole] = useState<UserRole>(UserRole.PARTICIPANT);

  // Load persisted user data on mount (simulating backend persistence)
  useEffect(() => {
    const storedUserId = localStorage.getItem('vectorise_user_id');
    const storedRole = localStorage.getItem('vectorise_active_role');
    
    if (storedUserId) {
        // Find the user from MOCK_USERS
        let foundUser = MOCK_USERS.find(u => u.id === storedUserId);
        
        // If persistence exists in localStorage for this specific user object (e.g. approval status), load it
        const storedUserObj = localStorage.getItem(`vectorise_user_data_${storedUserId}`);
        if (storedUserObj && foundUser) {
             try {
                 const parsed = JSON.parse(storedUserObj);
                 // Merge stored data (like approval status) into the mock user object reference
                 Object.assign(foundUser, parsed);
             } catch (e) {
                 console.error("Failed to parse stored user data", e);
                 // Optionally clear corrupted data
                 localStorage.removeItem(`vectorise_user_data_${storedUserId}`);
             }
        }

        if (foundUser) {
            setUser(foundUser);
            if (storedRole) {
                setActiveRole(storedRole as UserRole);
            } else {
                setActiveRole(foundUser.role);
            }
        }
    }
  }, []);

  // Persist user data whenever it changes
  useEffect(() => {
      if (user) {
          localStorage.setItem('vectorise_user_id', user.id);
          localStorage.setItem(`vectorise_user_data_${user.id}`, JSON.stringify(user));
      } else {
          localStorage.removeItem('vectorise_user_id');
      }
  }, [user]);

  // Persist active role
  useEffect(() => {
      if (user) {
        localStorage.setItem('vectorise_active_role', activeRole);
      }
  }, [activeRole, user]);


  const login = (userId: string) => {
    const userToLogin = MOCK_USERS.find(u => u.id === userId);
    if (userToLogin) {
      // Check for any persisted overrides for this user ID before setting state
      const storedUserObj = localStorage.getItem(`vectorise_user_data_${userId}`);
      if (storedUserObj) {
           try {
               Object.assign(userToLogin, JSON.parse(storedUserObj));
           } catch (e) {
               console.error("Failed to parse stored user login data", e);
           }
      }

      setUser(userToLogin);
      setActiveRole(userToLogin.role);
    }
  };

  const logout = () => {
    setUser(null);
    setActiveRole(UserRole.PARTICIPANT);
    localStorage.removeItem('vectorise_user_id');
    localStorage.removeItem('vectorise_active_role');
  };

  const switchRole = (role: UserRole) => {
    setActiveRole(role);
  };

  const completeCoachOnboarding = (bio: string, niche: string) => {
      if (user && user.role === UserRole.PARTICIPANT) {
          // Update local user state to reflect coach status (Pending Approval)
          const updatedUser = { 
              ...user, 
              hasCoachProfile: true,
              coachBio: bio,
              coachNiche: niche,
              coachApproved: false // Set to pending initially
          } as Participant;
          
          setUser(updatedUser);
          
          // CRITICAL: Update the MOCK_USERS array so Admin Dashboard can see the change
          const mockUserIndex = MOCK_USERS.findIndex(u => u.id === user.id);
          if (mockUserIndex !== -1) {
              // Force update the mock object in place
              Object.assign(MOCK_USERS[mockUserIndex], updatedUser);
          }
          
          // NOTE: We do NOT switch role to COACH here anymore. 
          // The user remains in PARTICIPANT mode until approved.
      }
  };

  const hasPermission = (permission: Permission): boolean => {
      if (!user) return false;
      
      // If user has a custom role assigned
      if (user.roleDefinitionId) {
          const roleDef = MOCK_ROLES.find(r => r.id === user.roleDefinitionId);
          if (roleDef) {
              return roleDef.permissions.includes(permission);
          }
      }

      // Fallback default permissions based on active view role or base role
      // Note: If activeRole is COACH, we should grant coach permissions even if base role is PARTICIPANT (assuming onboarding done)
      const roleToCheck = activeRole === UserRole.COACH ? UserRole.COACH : user.role;

      switch (roleToCheck) {
          case 'ADMIN':
              return true; // Admin has all permissions by default
          case 'COACH':
              // Default coach permissions
              return ['sprint:create', 'sprint:edit', 'sprint:publish', 'analytics:view', 'community:moderate'].includes(permission);
          case 'PARTICIPANT':
              return false; // Participants generally don't have admin-style permissions
          default:
              return false;
      }
  };

  return (
    <AuthContext.Provider value={{ user, activeRole, login, logout, hasPermission, switchRole, completeCoachOnboarding }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
