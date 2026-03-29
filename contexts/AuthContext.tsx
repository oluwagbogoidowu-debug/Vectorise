import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { User, Coach, Participant, Admin, Permission, UserRole } from '../types';
import { MOCK_USERS, MOCK_ROLES } from '../services/mockData';
import { auth } from '../services/firebase';
import { onAuthStateChanged, signOut, deleteUser as firebaseDeleteUser, sendPasswordResetEmail } from 'firebase/auth';
import { onSnapshot, doc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { userService, sanitizeData } from '../services/userService';

type AuthContextType = {
  user: User | Coach | Participant | Admin | null;
  activeRole: UserRole; // The currently active view mode (Member vs Coach)
  loading: boolean; // Added loading state
  login: (userIdOrEmail: string) => boolean; // Kept for legacy/mock compatibility
  signup: (newUser: Participant | Coach) => void;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
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
    let unsubscribeSnapshot: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = null;
      }

      if (firebaseUser) {
        setLoading(true);
        const userRef = doc(db, 'users', firebaseUser.uid);
        
        unsubscribeSnapshot = onSnapshot(userRef, async (docSnap) => {
          try {
            if (docSnap.exists()) {
              let dbUser = sanitizeData(docSnap.data()) as User | Participant | Coach;

              setUser(dbUser);
              
              // Determine active role
              const storedRole = localStorage.getItem('vectorise_active_role') as UserRole;
              const dbRole = dbUser.role as UserRole;
              
              let roleToSet = dbRole;
              if (storedRole) {
                  const isCoach = (dbUser as Coach).hasCoachProfile || dbRole === UserRole.COACH;
                  const isAdmin = dbRole === UserRole.ADMIN;
                  
                  if (storedRole === dbRole) {
                      roleToSet = storedRole;
                  } else if (storedRole === UserRole.COACH && isCoach) {
                      roleToSet = UserRole.COACH;
                  } else if (isAdmin) {
                      roleToSet = storedRole;
                  }
              }
              
              setActiveRole(roleToSet);
              localStorage.setItem('vectorise_active_role', roleToSet);
            } else {
              // Document doesn't exist yet, create it
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
                  wishlistSprintIds: [],
                  shinePostIds: [],
                  shineCommentIds: [],
                  referralCode: (firebaseUser.uid || '').substring(0, 8).toUpperCase(),
                  walletBalance: 0,
                  impactStats: { peopleHelped: 0, streak: 0 },
                  createdAt: new Date().toISOString(),
              };
              
              await userService.createUserDocument(firebaseUser.uid, newUserProfile);
              // Snapshot will trigger again
            }
          } catch (err) {
            console.error("Auth State Sync Error", err);
          } finally {
            setLoading(false);
          }
        }, (error) => {
          console.error("Snapshot Error", error);
          setLoading(false);
        });
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
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
        if (auth.currentUser) {
            await signOut(auth);
        }
        setUser(null);
        setActiveRole(UserRole.PARTICIPANT);
        localStorage.removeItem('vectorise_user_id');
        localStorage.removeItem('vectorise_last_sprint');
        localStorage.removeItem('vectorise_active_role');
        console.log("Registry Access Revoked Successfully.");
    } catch (error) {
        console.error("Error during logout process:", error);
    }
  };

  const forgotPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim().toLowerCase());
  };

  const switchRole = (role: UserRole) => {
    if (!user) return;
    
    // Basic validation
    const isCoach = (user as Coach).hasCoachProfile || user.role === UserRole.COACH;
    const isAdmin = user.role === UserRole.ADMIN;
    
    if (role === user.role || (role === UserRole.COACH && isCoach) || isAdmin) {
        setActiveRole(role);
        localStorage.setItem('vectorise_active_role', role);
    } else {
        console.warn(`Unauthorized role switch attempt to ${role}`);
    }
  };

  const updateProfile = async (data: Partial<Participant | Coach>) => {
      if (!user) return;
      try {
          await userService.updateUserDocument(user.id, data);
          setUser(prev => prev ? sanitizeData({ ...prev, ...data }) as any : null);
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
    <AuthContext.Provider value={{ user, activeRole, loading, login, signup, logout, forgotPassword, hasPermission, switchRole, completeCoachOnboarding, updateProfile, deleteAccount }}>
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
