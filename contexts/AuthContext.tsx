import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { User, Coach, Participant, Admin, Permission, UserRole } from '../types';
import { MOCK_USERS, MOCK_ROLES } from '../services/mockData';
import { auth } from '../services/firebase';
import { onAuthStateChanged, signOut, deleteUser as firebaseDeleteUser, sendPasswordResetEmail } from 'firebase/auth';
import { onSnapshot, doc, updateDoc, getDocFromServer } from 'firebase/firestore';
import { db } from '../services/firebase';
import { userService, sanitizeData } from '../services/userService';
import { triggerHaptic, hapticPatterns } from '../utils/haptics';

type AuthContextType = {
  user: User | Coach | Participant | Admin | null;
  activeRole: UserRole; // The currently active view mode (Member vs Coach)
  loading: boolean; // Added loading state
  mustVerifyEmail: boolean; // Track if the user needs email verification
  login: (userIdOrEmail: string) => boolean; // Kept for legacy/mock compatibility
  signup: (newUser: Participant | Coach) => void;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  hasPermission: (permission: Permission) => boolean;
  switchRole: (role: UserRole) => void;
  completeCoachOnboarding: (bio: string, niche: string) => void;
  updateProfile: (data: Partial<Participant | Coach>) => Promise<void>;
  deleteAccount: () => Promise<void>;
  checkVerification: () => Promise<boolean>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | Coach | Participant | Admin | null>(null);
  const [activeRole, setActiveRole] = useState<UserRole>(UserRole.PARTICIPANT);
  const [loading, setLoading] = useState(true);
  const [mustVerifyEmail, setMustVerifyEmail] = useState(false);
  const [forceTrigger, setForceTrigger] = useState(0);

  // Listen for Firebase Auth changes
  useEffect(() => {
    let unsubscribeSnapshot: (() => void) | null = null;
    let hasFetchedFromServer = false;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = null;
      }

      if (firebaseUser) {
        // Expose emailVerified status helper
        const isGoogleUser = firebaseUser.providerData.some(p => p.providerId === 'google.com');
        setMustVerifyEmail(!isGoogleUser && !firebaseUser.emailVerified);

        setLoading(true);
        const userRef = doc(db, 'users', firebaseUser.uid);

        // Core Requirement: Every time the app loads, fetch user data from Firestore server directly as primary source of truth
        try {
          console.log("[AuthContext] Primary Action: Fetching fresh user document directly from Firestore server...");
          const serverSnap = await getDocFromServer(userRef);
          if (serverSnap.exists()) {
            let dbUser = sanitizeData(serverSnap.data()) as User | Participant | Coach;

            const isGoogle = firebaseUser.providerData.some(p => p.providerId === 'google.com');
            const isDbVerified = serverSnap.data()?.emailVerifiedConfirmed || serverSnap.data()?.emailVerifiedOverride;

            if (isGoogle || isDbVerified) {
              setMustVerifyEmail(false);
            } else {
              setMustVerifyEmail(true);
            }

            // Automatic Role Healing/Recovery for the owner/admin
            if (dbUser.email && dbUser.email.toLowerCase().trim() === 'vectorise.io@gmail.com' && dbUser.role !== UserRole.ADMIN) {
                console.log("Root Cause Corrected: Healing Admin account role in the database.");
                dbUser.role = UserRole.ADMIN;
                await userService.updateUserDocument(dbUser.id, { role: UserRole.ADMIN });
            }

            console.log("[AuthContext] Firestore server fetch succeeded. Storing in state.");
            setUser(dbUser);
            hasFetchedFromServer = true;
            
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
            // Document doesn't exist yet, create it on the server
            console.log("[AuthContext] User document does not exist. Creating default profile...");
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
                impactStats: { peopleHelped: 0, streak: 0 },
            };
            
            await userService.createUserDocument(firebaseUser.uid, newUserProfile);
            hasFetchedFromServer = true;
          }
        } catch (serverErr) {
          console.warn("[AuthContext] Primary server fetch failed or user is offline. Relying on cache/real-time sync as secondary.", serverErr);
        }

        // Subscribe to real-time changes, with includeMetadataChanges to track cache vs server transitions
        unsubscribeSnapshot = onSnapshot(userRef, { includeMetadataChanges: true }, async (docSnap) => {
          try {
            if (docSnap.exists()) {
              // Rule: If we already have a successful server-verified fetch, ignore any cached snapshots to prevent state rollback/regression
              if (docSnap.metadata.fromCache && hasFetchedFromServer) {
                console.log("[AuthContext] Ignored cached real-time snapshot because fresh server data was already loaded.");
                return;
              }

              let dbUser = sanitizeData(docSnap.data()) as User | Participant | Coach;

              const isGoogle = firebaseUser.providerData.some(p => p.providerId === 'google.com');
              const isDbVerified = docSnap.data()?.emailVerifiedConfirmed || docSnap.data()?.emailVerifiedOverride;

              if (isGoogle || isDbVerified) {
                setMustVerifyEmail(false);
              } else {
                setMustVerifyEmail(true);
              }

              // Automatic Role Healing/Recovery for the owner/admin
              if (dbUser.email && dbUser.email.toLowerCase().trim() === 'vectorise.io@gmail.com' && dbUser.role !== UserRole.ADMIN) {
                  console.log("Root Cause Corrected: Healing Admin account role in the database.");
                  dbUser.role = UserRole.ADMIN;
                  await userService.updateUserDocument(dbUser.id, { role: UserRole.ADMIN });
              }

              console.log(`[AuthContext] User document updated from snapshot. fromCache: ${docSnap.metadata.fromCache}`);
              setUser(dbUser);
              
              if (!docSnap.metadata.fromCache) {
                hasFetchedFromServer = true;
              }
              
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
              // Creating user doc if snapshot tells us it completely doesn't exist anywhere
              if (!hasFetchedFromServer) {
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
                    impactStats: { peopleHelped: 0, streak: 0 },
                };
                
                await userService.createUserDocument(firebaseUser.uid, newUserProfile);
                hasFetchedFromServer = true;
              }
            }
          } catch (err) {
            console.error("[AuthContext] Real-time state processor error:", err);
          } finally {
            setLoading(false);
          }
        }, (error) => {
          console.error("Snapshot Error", error);
          setLoading(false);
        });
      } else {
        hasFetchedFromServer = false;
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, [forceTrigger]);

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
        triggerHaptic(hapticPatterns.light);
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

  const checkVerification = async (): Promise<boolean> => {
    if (auth.currentUser) {
      await auth.currentUser.reload();
      if (auth.currentUser.emailVerified) {
        try {
          const userRef = doc(db, 'users', auth.currentUser.uid);
          await updateDoc(userRef, {
            emailVerifiedConfirmed: true
          });
        } catch (e) {
          console.error("Failed to write verification confirmation field to firestore", e);
        }
        setMustVerifyEmail(false);
        setForceTrigger(prev => prev + 1);
        return true;
      }
    }
    return false;
  };

  return (
    <AuthContext.Provider value={{ user, activeRole, loading, mustVerifyEmail, login, signup, logout, forgotPassword, hasPermission, switchRole, completeCoachOnboarding, updateProfile, deleteAccount, checkVerification }}>
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
