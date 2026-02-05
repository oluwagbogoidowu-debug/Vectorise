
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
  logout: () => void;
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
        // CRITICAL: Block unverified users from entering the app context
        if (!firebaseUser.emailVerified) {
            console.log("Unverified user detected. Blocking session.");
            await signOut(auth);
            setUser(null);
            setLoading(false);
            return;
        }

        try {
            // 1. Try to get data from Firestore first
            let dbUser = await userService.getUserDocument(firebaseUser.uid);

            if (dbUser) {
                // MIGRATION CHECK FOR EXISTING USERS
                // Ensure new fields exist; if not, patch the document.
                const updates: any = {};
                const pUser = dbUser as Participant; // Type assertion to check fields

                if (!pUser.enrolledSprintIds) updates.enrolledSprintIds = [];
                if (!pUser.shinePostIds) updates.shinePostIds = [];
                if (!pUser.shineCommentIds) updates.shineCommentIds = [];
                if (!pUser.referralCode) updates.referralCode = firebaseUser.uid.substring(0, 8).toUpperCase();

                if (Object.keys(updates).length > 0) {
                    console.log("Migrating user profile: Adding missing tracking fields...");
                    await userService.updateUserDocument(dbUser.id, updates);
                    // Merge updates into local state immediately
                    dbUser = { ...dbUser, ...updates };
                }
            }

            // 2. If not in Firestore, check if it's a legacy/sync issue and create it
            if (!dbUser) {
                console.log("User not in Firestore, creating sync record...");
                // Construct basic profile from Firebase Auth data
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
                    walletBalance: 30, // Default 30 coins for new synced accounts
                    impactStats: { peopleHelped: 0, streak: 0 }
                };
                
                await userService.createUserDocument(firebaseUser.uid, newUserProfile);
                dbUser = newUserProfile as Participant;
            }

            // Set state
            setUser(dbUser);
            
            // Restore active role
            const storedRole = localStorage.getItem('vectorise_active_role');
            if (storedRole) {
                setActiveRole(storedRole as UserRole);
            } else {
                setActiveRole(dbUser.role);
            }

        } catch (err) {
            console.error("Auth State Sync Error", err);
            // Fallback to Mock Data lookup if Firestore fails (e.g. for purely offline/demo accounts if any)
            let foundUser = MOCK_USERS.find(u => u.email.toLowerCase() === firebaseUser.email?.toLowerCase());
            if (foundUser) {
                setUser(foundUser);
            }
        }

      } else {
        // User is signed out.
        setUser(null);
        setActiveRole(UserRole.PARTICIPANT);
        localStorage.removeItem('vectorise_user_id');
        localStorage.removeItem('vectorise_active_role');
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Persist active role changes
  useEffect(() => {
      if (user) {
        localStorage.setItem('vectorise_active_role', activeRole);
      }
  }, [activeRole, user]);


  // Helper for manual mock login (still useful for demo buttons)
  const login = (userIdOrEmail: string): boolean => {
    const userToLogin = MOCK_USERS.find(u => 
        u.id === userIdOrEmail || u.email.toLowerCase() === userIdOrEmail.toLowerCase()
    );

    if (userToLogin) {
      setUser(userToLogin);
      setActiveRole(userToLogin.role);
      localStorage.setItem('vectorise_user_id', userToLogin.id);
      return true;
    }
    return false;
  };

  const signup = (newUser: Participant | Coach) => {
      // Legacy mock push - now handled by userService in SignUpPage, but kept for type compatibility
      MOCK_USERS.push(newUser);
      setUser(newUser);
      setActiveRole(newUser.role);
  };

  const logout = async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Error signing out: ", error);
    }
  };

  const switchRole = (role: UserRole) => {
    setActiveRole(role);
  };

  const updateProfile = async (data: Partial<Participant | Coach>) => {
      if (!user) return;
      try {
          await userService.updateUserDocument(user.id, data);
          // Optimistic update
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
          // 1. Delete from Firestore
          await userService.deleteUserDocument(uid);
          // 2. Delete from Auth
          await firebaseDeleteUser(auth.currentUser);
          // State cleanup handled by onAuthStateChanged
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
              // Fix: Cast permissions to string array and permission to string to ensure type compatibility during includes check.
              return (roleDef.permissions as string[]).includes(permission as string);
          }
      }

      const roleToCheck = activeRole === UserRole.COACH ? UserRole.COACH : user.role;

      switch (roleToCheck) {
          case 'ADMIN': return true;
          case 'COACH': 
              // Fix: Cast array literal to string array and permission to string to resolve string assignability issues.
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
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
