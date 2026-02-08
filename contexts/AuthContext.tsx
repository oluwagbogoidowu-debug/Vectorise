
import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { User, Coach, Participant, Admin, Permission, UserRole } from '../types';
import { MOCK_USERS, MOCK_ROLES } from '../services/mockData';
import { auth } from '../services/firebase';
import { onAuthStateChanged, signOut, deleteUser as firebaseDeleteUser } from 'firebase/auth';
import { userService } from '../services/userService';

type AuthContextType = {
  user: User | Coach | Participant | Admin | null;
  activeRole: UserRole; // The currently active view mode (Member vs Coach)
  loading: boolean; // Added loading state
  login: (userIdOrEmail: string) => boolean; // Kept for legacy/mock compatibility
  signup: (newUser: Participant | Coach) => void;
  logout: () => Promise<void>;
  hasPermission: (permission: Permission) => boolean;
  switchRole: (role: UserRole) => void;
  completeCoachOnboarding: (bio: string, niche: string) => void;
  updateProfile: (data: Partial<Participant | Coach>) => Promise<void>;
  deleteAccount: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | Coach | Participant | Admin | null>(null);
  const [activeRole, setActiveRole] = useState<UserRole>(UserRole.PARTICIPANT);
  const [loading, setLoading] = useState(true);

  // Listen for Firebase Auth changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        try {
            // 1. Try to get data from Firestore first
            let dbUser = await userService.getUserDocument(firebaseUser.uid);

            if (dbUser) {
                const updates: any = {};
                const pUser = dbUser as Participant;

                if (!pUser.enrolledSprintIds) updates.enrolledSprintIds = [];
                if (!pUser.shinePostIds) updates.shinePostIds = [];
                if (!pUser.shineCommentIds) updates.shineCommentIds = [];
                if (!pUser.referralCode) updates.referralCode = firebaseUser.uid.substring(0, 8).toUpperCase();

                if (Object.keys(updates).length > 0) {
                    await userService.updateUserDocument(dbUser.id, updates);
                    dbUser = { ...dbUser, ...updates };
                }
            }

            if (!dbUser) {
                const newUserProfile: Partial<Participant> = {
                    id: firebaseUser.uid,
                    name: firebaseUser.displayName || 'User',
                    email: firebaseUser.email || '',
                    role: UserRole.PARTICIPANT,
                    profileImageUrl: firebaseUser.photoURL || `https://ui-avatars.com/api/?name=${firebaseUser.displayName || 'User'}&background=0E7850&color=fff`,
                    bio: "Ready to grow.",
                    followers: 0,
                    following: 0,
                    savedSprintIds: [],
                    enrolledSprintIds: [],
                    shinePostIds: [],
                    shineCommentIds: [],
                    referralCode: firebaseUser.uid.substring(0, 8).toUpperCase(),
                    walletBalance: 50, // Updated from 30 to 50
                    impactStats: { peopleHelped: 0, streak: 0 }
                };
                
                await userService.createUserDocument(firebaseUser.uid, newUserProfile);
                dbUser = newUserProfile as Participant;
            }

            setUser(dbUser);
            
            const storedRole = localStorage.getItem('vectorise_active_role');
            if (storedRole) {
                setActiveRole(storedRole as UserRole);
            } else {
                setActiveRole(dbUser.role);
            }

        } catch (err) {
            console.error("Auth State Sync Error", err);
            let foundUser = MOCK_USERS.find(u => u.email.toLowerCase() === firebaseUser.email?.toLowerCase());
            if (foundUser) {
                setUser(foundUser);
            }
        }

      } else {
        // Only clear if we don't have a demo user set (to prevent race conditions on startup)
        // If setUser was called by demo login, auth.currentUser is null, so this fires.
        // We use a small check or just let logout handle it.
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
      if (user) {
        localStorage.setItem('vectorise_active_role', activeRole);
      }
  }, [activeRole, user]);


  const login = (userIdOrEmail: string): boolean => {
    const userToLogin = MOCK_USERS.find(u => 
        u.id === userIdOrEmail || u.email.toLowerCase() === userIdOrEmail.toLowerCase()
    );

    if (userToLogin) {
      setUser(userToLogin);
      setActiveRole(userToLogin.role);
      localStorage.setItem('vectorise_user_id', userToLogin.id);
      localStorage.setItem('vectorise_active_role', userToLogin.role);
      return true;
    }
    return false;
  };

  const signup = (newUser: Participant | Coach) => {
      MOCK_USERS.push(newUser);
      setUser(newUser);
      setActiveRole(newUser.role);
  };

  const logout = async () => {
    try {
        // 1. Sign out from Firebase if applicable
        if (auth.currentUser) {
            await signOut(auth);
        }
        
        // 2. Clear local state and storage (Critical for Demo Accounts & instant UI response)
        setUser(null);
        setActiveRole(UserRole.PARTICIPANT);
        localStorage.removeItem('vectorise_user_id');
        localStorage.removeItem('vectorise_active_role');
        
        console.log("Registry Access Revoked Successfully.");
    } catch (error) {
        console.error("Error during logout process:", error);
    }
  };

  const switchRole = (role: UserRole) => {
    setActiveRole(role);
  };

  const updateProfile = async (data: Partial<Participant | Coach>) => {
      if (!user) return;
      try {
          await userService.updateUserDocument(user.id, data);
          setUser(prev => prev ? { ...prev, ...data } as any : null);
      } catch (error) {
          console.error("Failed to update profile", error);
          throw error;
      }
  };

  const deleteAccount = async () => {
      if (!user || !auth.currentUser) return;
      try {
          const uid = user.id;
          await userService.deleteUserDocument(uid);
          await firebaseDeleteUser(auth.currentUser);
      } catch (error) {
          console.error("Failed to delete account", error);
          throw error;
      }
  };

  const completeCoachOnboarding = (bio: string, niche: string) => {
      if (user && user.role === UserRole.PARTICIPANT) {
          const updates = {
              hasCoachProfile: true,
              coachBio: bio,
              coachNiche: niche,
              coachApproved: false 
          };
          updateProfile(updates);
      }
  };

  const hasPermission = (permission: Permission): boolean => {
      if (!user) return false;
      
      if (user.roleDefinitionId) {
          const roleDef = MOCK_ROLES.find(r => r.id === user.roleDefinitionId);
          if (roleDef) {
              return (roleDef.permissions as string[]).includes(permission as string);
          }
      }

      const roleToCheck = activeRole === UserRole.COACH ? UserRole.COACH : user.role;

      switch (roleToCheck) {
          case 'ADMIN': return true;
          case 'COACH': 
              return (['sprint:create', 'sprint:edit', 'sprint:publish', 'analytics:view', 'community:moderate'] as string[]).includes(permission as string);
          case 'PARTICIPANT': return false;
          default: return false;
      }
  };

  return (
    <AuthContext.Provider value={{ user, activeRole, loading, login, signup, logout, hasPermission, switchRole, completeCoachOnboarding, updateProfile, deleteAccount }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('AuthContext must be used within an AuthProvider');
  }
  return context;
};
