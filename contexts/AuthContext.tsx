import React, { createContext, useState, useContext, ReactNode, useEffect, useRef, useCallback } from 'react';
import { User, Coach, Participant, Admin, Permission, UserRole } from '../types';
import { MOCK_USERS, MOCK_ROLES } from '../services/mockData';
import { auth } from '../services/firebase';
import { onIdTokenChanged, onAuthStateChanged, signOut, deleteUser as firebaseDeleteUser, sendPasswordResetEmail } from 'firebase/auth';
import { onSnapshot, doc, updateDoc, getDocFromServer } from 'firebase/firestore';
import { db } from '../services/firebase';
import { userService, sanitizeData } from '../services/userService';
import { triggerHaptic, hapticPatterns } from '../utils/haptics';

type AuthContextType = {
  user: User | Coach | Participant | Admin | null;
  activeRole: UserRole; // The currently active view mode (Member vs Coach)
  loading: boolean; // Added loading state
  mustVerifyEmail: boolean; // Track if the user needs email verification
  isEmailUnverified: boolean; // True if email is unverified (even if deferred)
  isDeferred: boolean; // True if email verification has been deferred
  deferVerification: () => void; // Defer/skip verification for this session
  resetVerificationDeferral: () => void; // Reset deferral to force verification
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
  const [user, setUser] = useState<User | Coach | Participant | Admin | null>(() => {
    try {
      const cached = localStorage.getItem('vectorise_cached_user');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [activeRole, setActiveRole] = useState<UserRole>(() => {
    const stored = localStorage.getItem('vectorise_active_role');
    return (stored as UserRole) || UserRole.PARTICIPANT;
  });
  const [loading, setLoading] = useState(() => {
    try {
      const cached = localStorage.getItem('vectorise_cached_user');
      return cached ? false : true;
    } catch {
      return true;
    }
  });
  const [actualMustVerifyEmail, setActualMustVerifyEmail] = useState(false);
  const [isDeferred, setIsDeferred] = useState(localStorage.getItem('vectorise_verify_deferred') === 'true');
  const [forceTrigger, setForceTrigger] = useState(0);

  const mustVerifyEmail = actualMustVerifyEmail && !isDeferred;

  const deferVerification = () => {
    localStorage.setItem('vectorise_verify_deferred', 'true');
    setIsDeferred(true);
  };

  const resetVerificationDeferral = () => {
    localStorage.removeItem('vectorise_verify_deferred');
    setIsDeferred(false);
  };

  // Token Keep-Alive & Auto-Refresh mechanism to prevent sudden logout after 1 hour of inactivity
  useEffect(() => {
    const keepTokenAlive = async () => {
      if (auth.currentUser) {
        try {
          // Force silent token check / renewal so token never reaches 1-hour expiry unnoticed
          await auth.currentUser.getIdToken(false);
        } catch (err) {
          console.warn("[AuthContext] Token keep-alive verification:", err);
        }
      }
    };

    // Check token every 10 minutes
    const keepAliveInterval = setInterval(keepTokenAlive, 10 * 60 * 1000);

    // Refresh immediately when user returns to tab or comes back online
    const handleVisibilityOrOnline = () => {
      if (document.visibilityState === 'visible' || navigator.onLine) {
        keepTokenAlive();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityOrOnline);
    window.addEventListener('online', handleVisibilityOrOnline);
    window.addEventListener('focus', handleVisibilityOrOnline);

    return () => {
      clearInterval(keepAliveInterval);
      document.removeEventListener('visibilitychange', handleVisibilityOrOnline);
      window.removeEventListener('online', handleVisibilityOrOnline);
      window.removeEventListener('focus', handleVisibilityOrOnline);
    };
  }, []);

  // Listen for Firebase Auth & ID Token changes
  useEffect(() => {
    let unsubscribeSnapshot: (() => void) | null = null;
    let snapshotRetryTimer: any = null;
    let hasFetchedFromServer = false;
    let isSubscribed = true;

    const setupUserSnapshot = (firebaseUser: any) => {
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = null;
      }
      if (snapshotRetryTimer) {
        clearTimeout(snapshotRetryTimer);
        snapshotRetryTimer = null;
      }

      if (!isSubscribed || !firebaseUser) return;

      const userRef = doc(db, 'users', firebaseUser.uid);

      unsubscribeSnapshot = onSnapshot(userRef, { includeMetadataChanges: true }, async (docSnap) => {
        if (!isSubscribed) return;
        try {
          if (docSnap.exists()) {
            if (docSnap.metadata.fromCache && hasFetchedFromServer) {
              return;
            }

            let dbUser = sanitizeData(docSnap.data()) as User | Participant | Coach;

            const isGoogle = firebaseUser.providerData?.some((p: any) => p.providerId === 'google.com');
            const isDbVerified = docSnap.data()?.emailVerifiedConfirmed || docSnap.data()?.emailVerifiedOverride;

            if (isGoogle || isDbVerified) {
              setActualMustVerifyEmail(false);
            } else {
              setActualMustVerifyEmail(true);
            }

            // Automatic Role Healing/Recovery for the owner/admin
            if (dbUser.email && dbUser.email.toLowerCase().trim() === 'vectorise.io@gmail.com' && dbUser.role !== UserRole.ADMIN) {
              console.log("Root Cause Corrected: Healing Admin account role in the database.");
              dbUser.role = UserRole.ADMIN;
              await userService.updateUserDocument(dbUser.id, { role: UserRole.ADMIN });
            }

            setUser(dbUser);
            try {
              localStorage.setItem('vectorise_cached_user', JSON.stringify(dbUser));
            } catch (err) {
              console.error("Failed to cache user", err);
            }
            
            if (!docSnap.metadata.fromCache) {
              hasFetchedFromServer = true;
            }
            
            // Determine active role
            const storedRole = localStorage.getItem('vectorise_active_role') as UserRole;
            const dbRole = dbUser.role as UserRole;
            
            const isCoachApproved = dbRole === UserRole.COACH && (
                (dbUser as any).coachApplicationApproved === true || 
                (dbUser as any).approved === true
            );
            
            let roleToSet = dbRole;
            if (dbRole === UserRole.COACH && !isCoachApproved) {
                roleToSet = UserRole.PARTICIPANT;
            } else if (storedRole) {
                const isCoach = ((dbUser as Coach).hasCoachProfile || dbRole === UserRole.COACH) && isCoachApproved;
                const isAdmin = dbRole === UserRole.ADMIN;
                
                if (storedRole === dbRole) {
                    roleToSet = (dbRole === UserRole.COACH && !isCoachApproved) ? UserRole.PARTICIPANT : storedRole;
                } else if (storedRole === UserRole.COACH && isCoach) {
                    roleToSet = UserRole.COACH;
                } else if (isAdmin) {
                    roleToSet = storedRole;
                }
            }
            
            setActiveRole(roleToSet);
            localStorage.setItem('vectorise_active_role', roleToSet);
          } else {
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
          if (isSubscribed) setLoading(false);
        }
      }, (error) => {
        console.warn("[AuthContext] User snapshot encountered error (will auto-reconnect):", error);
        if (isSubscribed) {
          setLoading(false);
          // Auto-reconnect snapshot listener if user is still logged in
          if (auth.currentUser && auth.currentUser.uid === firebaseUser.uid) {
            snapshotRetryTimer = setTimeout(() => {
              if (isSubscribed && auth.currentUser?.uid === firebaseUser.uid) {
                console.log("[AuthContext] Re-attaching user document listener after snapshot error...");
                setupUserSnapshot(auth.currentUser);
              }
            }, 3000);
          }
        }
      });
    };

    const handleAuthStateChange = async (firebaseUser: any) => {
      if (!isSubscribed) return;

      if (firebaseUser) {
        // Expose emailVerified status helper
        const isGoogleUser = firebaseUser.providerData?.some((p: any) => p.providerId === 'google.com');
        setActualMustVerifyEmail(!isGoogleUser && !firebaseUser.emailVerified);

        const hasCache = !!localStorage.getItem('vectorise_cached_user');
        if (!hasCache) {
          setLoading(true);
        }
        const userRef = doc(db, 'users', firebaseUser.uid);

        // Core Requirement: Every time the app loads, fetch user data from Firestore server directly as primary source of truth
        try {
          const fetchPromise = getDocFromServer(userRef);
          const timeoutPromise = new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error("Server fetch timeout")), 2500)
          );

          const serverSnap = await Promise.race([
            fetchPromise,
            timeoutPromise
          ]);

          if (serverSnap.exists() && isSubscribed) {
            let dbUser = sanitizeData(serverSnap.data()) as User | Participant | Coach;

            const isGoogle = firebaseUser.providerData?.some((p: any) => p.providerId === 'google.com');
            const isDbVerified = serverSnap.data()?.emailVerifiedConfirmed || serverSnap.data()?.emailVerifiedOverride;

            if (isGoogle || isDbVerified) {
              setActualMustVerifyEmail(false);
            } else {
              setActualMustVerifyEmail(true);
            }

            // Automatic Role Healing/Recovery for the owner/admin
            if (dbUser.email && dbUser.email.toLowerCase().trim() === 'vectorise.io@gmail.com' && dbUser.role !== UserRole.ADMIN) {
                console.log("Root Cause Corrected: Healing Admin account role in the database.");
                dbUser.role = UserRole.ADMIN;
                await userService.updateUserDocument(dbUser.id, { role: UserRole.ADMIN });
            }

            setUser(dbUser);
            try {
              localStorage.setItem('vectorise_cached_user', JSON.stringify(dbUser));
            } catch (err) {
              console.error("Failed to cache user", err);
            }
            hasFetchedFromServer = true;
            
            // Determine active role
            const dbRole = dbUser.role as UserRole;
            let roleToSet = dbRole;
            
            if (dbRole === UserRole.COACH) {
                const isApproved = (dbUser as any).approved || (dbUser as any).coachApplicationApproved;
                if (dbUser.defaultLoginMode === 'COACH' && isApproved) {
                    roleToSet = UserRole.COACH;
                } else {
                    roleToSet = UserRole.PARTICIPANT;
                }
            } else if (dbRole === UserRole.ADMIN) {
                if (dbUser.defaultLoginMode === 'PARTICIPANT') {
                    roleToSet = UserRole.PARTICIPANT;
                } else {
                    roleToSet = UserRole.ADMIN;
                }
            } else {
                const storedRole = localStorage.getItem('vectorise_active_role') as UserRole;
                if (storedRole) {
                    roleToSet = storedRole;
                }
            }
            
            setActiveRole(roleToSet);
            localStorage.setItem('vectorise_active_role', roleToSet);
          }
        } catch (serverErr) {
          console.warn("[AuthContext] Primary server fetch failed or user is offline. Relying on cache/real-time sync as secondary.", serverErr);
        }

        // Connect real-time snapshot
        setupUserSnapshot(firebaseUser);
      } else {
        // If firebaseUser is null, double check if auth is truly signed out
        if (!auth.currentUser) {
          hasFetchedFromServer = false;
          if (unsubscribeSnapshot) {
            unsubscribeSnapshot();
            unsubscribeSnapshot = null;
          }
          if (snapshotRetryTimer) {
            clearTimeout(snapshotRetryTimer);
            snapshotRetryTimer = null;
          }
          setUser(null);
          setLoading(false);
        }
      }
    };

    // onIdTokenChanged listens to sign-in, sign-out, AND every ID token refresh event
    const unsubscribeToken = onIdTokenChanged(auth, handleAuthStateChange);

    return () => {
      isSubscribed = false;
      unsubscribeToken();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
      if (snapshotRetryTimer) clearTimeout(snapshotRetryTimer);
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
        localStorage.removeItem('vectorise_cached_user');
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
    const isApprovedCoach = ((user as Coach).hasCoachProfile || user.role === UserRole.COACH) && ((user as any).approved || (user as any).coachApplicationApproved);
    const isAdmin = user.role === UserRole.ADMIN;
    
    if (role === user.role || role === UserRole.PARTICIPANT || (role === UserRole.COACH && isApprovedCoach) || isAdmin) {
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
        setActualMustVerifyEmail(false);
        setForceTrigger(prev => prev + 1);
        return true;
      }
    }
    return false;
  };

  return (
    <AuthContext.Provider value={{ user, activeRole, loading, mustVerifyEmail, isEmailUnverified: actualMustVerifyEmail, isDeferred, deferVerification, resetVerificationDeferral, login, signup, logout, forgotPassword, hasPermission, switchRole, completeCoachOnboarding, updateProfile, deleteAccount, checkVerification }}>
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
