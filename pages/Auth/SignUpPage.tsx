
import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/Button';
import { MOCK_PARTICIPANT_SPRINTS, MOCK_SPRINTS, MOCK_USERS } from '../../services/mockData';
import { Participant, UserRole } from '../../types';
import { auth } from '../../services/firebase';
import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification, signOut } from 'firebase/auth';
import { userService } from '../../services/userService';

const SignUpPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Retrieve the sprint ID and profile data selected during onboarding
  const { sprintId: selectedSprintId, persona, answers, recommendedPlan, occupation, incomeRange } = location.state || {};
  
  const sprintDetails = selectedSprintId ? MOCK_SPRINTS.find(s => s.id === selectedSprintId) : null;

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          setPhoto(file);
          setPhotoPreview(URL.createObjectURL(file));
      }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !firstName || !lastName || !password || !confirmPassword) {
        setError('Please fill in all fields.');
        return;
    }

    if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
    }

    if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
    }

    // Check against existing mock users to prevent duplicates with predefined accounts
    if (MOCK_USERS.some(u => u.email.toLowerCase() === email.toLowerCase())) {
        setError('User already exists. Sign in instead.');
        return;
    }

    setIsLoading(true);

    try {
        // 1. Create User in Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        const fullName = `${firstName} ${lastName}`.trim();
        const photoURL = photoPreview || `https://ui-avatars.com/api/?name=${fullName}&background=0E7850&color=fff`;

        // 2. Update Profile in Firebase Auth
        await updateProfile(user, {
            displayName: fullName,
            photoURL: photoURL
        });

        // 3. Create rich Participant object for Firestore
        const newUser: Participant = {
            id: user.uid, // Use Firebase UID
            name: fullName,
            email: email,
            role: UserRole.PARTICIPANT,
            profileImageUrl: photoURL,
            bio: "I'm ready to grow!",
            followers: 0,
            following: 0,
            savedSprintIds: [],
            enrolledSprintIds: [], // New Field
            shinePostIds: [], // New Field
            shineCommentIds: [], // New Field
            hasCoachProfile: false,
            walletBalance: 30, // Default 30 coins for new accounts
            impactStats: { peopleHelped: 0, streak: 0 },
            // Map onboarding data
            persona: persona || 'User',
            onboardingAnswers: answers || {},
            occupation: occupation as any,
            incomeBracket: incomeRange === 'Under ₦50,000' ? 'low' : incomeRange?.includes('150,000') ? 'mid' : 'high',
            subscription: recommendedPlan ? {
                planId: recommendedPlan,
                active: false,
                renewsAt: new Date().toISOString()
            } : undefined
        };

        // SAVE TO FIRESTORE
        await userService.createUserDocument(user.uid, newUser);

        // Also Update MOCK_USERS for legacy components that rely on it immediately
        MOCK_USERS.push(newUser);

        // 4. Handle Sprint Enrollment if selected (Mock DB Update - Future: Move to Firestore subcollection)
        if (selectedSprintId && sprintDetails) {
            const newEnrollmentId = `enrollment_${Date.now()}`;
            const newEnrollment = {
                id: newEnrollmentId,
                sprintId: selectedSprintId,
                participantId: user.uid,
                startDate: new Date().toISOString(),
                progress: Array.from({ length: sprintDetails.duration }, (_, i) => ({
                    day: i + 1,
                    completed: false
                }))
            };
            MOCK_PARTICIPANT_SPRINTS.push(newEnrollment);
        }

        // 5. Send Verification Email
        await sendEmailVerification(user);

        // 6. Sign out immediately to enforce verification flow
        await signOut(auth);

        // 7. Navigate to Verification Screen
        navigate('/verify-email', { state: { email } });

    } catch (err: any) {
        console.error("Signup error:", err);
        if (err.code === 'auth/email-already-in-use') {
            setError('User already exists. Sign in instead.');
        } else if (err.code === 'auth/weak-password') {
            setError('Password should be at least 6 characters.');
        } else {
            setError('Failed to create account. Please try again.');
        }
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl">
        <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Create Account</h2>
            {sprintDetails ? (
                <p className="mt-2 text-primary font-medium">To join: {sprintDetails.title}</p>
            ) : (
                <p className="mt-2 text-gray-500">Start your growth journey</p>
            )}
        </div>
        
        <form onSubmit={handleSignUp} className="space-y-4">
            {/* Profile Photo Upload */}
            <div className="flex flex-col items-center mb-6">
                <div className="w-24 h-24 rounded-full bg-gray-100 mb-3 overflow-hidden border-2 border-dashed border-gray-300 flex items-center justify-center relative">
                    {photoPreview ? (
                        <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    )}
                    <input 
                        type="file" 
                        accept="image/*"
                        onChange={handlePhotoChange}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                </div>
                <span className="text-xs text-gray-500">Upload Profile Photo</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                    <input 
                        type="text" 
                        id="firstName"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-white"
                        placeholder="First Name"
                    />
                </div>
                <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                    <input 
                        type="text" 
                        id="lastName"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-white"
                        placeholder="Last Name"
                    />
                </div>
            </div>

            <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <input 
                    type="email" 
                    id="email"
                    value={email}
                    onChange={(e) => {
                        setEmail(e.target.value);
                        setError('');
                    }}
                    className={`w-full px-4 py-3 border rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-white ${error && error.includes('User') ? 'border-red-500' : 'border-gray-200'}`}
                    placeholder="Enter your email"
                />
            </div>
            <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <div className="relative">
                    <input 
                        type={showPassword ? "text" : "password"} 
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-white pr-10"
                        placeholder="Create a password (min 6 chars)"
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                    >
                        {showPassword ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                        )}
                    </button>
                </div>
            </div>
            <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">Repeat Password</label>
                <div className="relative">
                    <input 
                        type={showConfirmPassword ? "text" : "password"} 
                        id="confirmPassword"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={`w-full px-4 py-3 border rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-white pr-10 ${error && error.includes('match') ? 'border-red-500' : 'border-gray-200'}`}
                        placeholder="Repeat password"
                    />
                    <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                    >
                        {showConfirmPassword ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                        )}
                    </button>
                </div>
            </div>

            {error && <p className={`mt-1 text-sm text-center ${error.includes('User') ? 'text-red-600 font-bold' : 'text-red-600'}`}>{error}</p>}
            
            <Button type="submit" isLoading={isLoading} className="w-full justify-center py-3.5 rounded-xl shadow-lg text-lg mt-4">
                Sign Up {selectedSprintId ? '& Start Sprint' : ''}
            </Button>
        </form>

        <div className="text-center mt-6">
            <p className="text-sm text-gray-600">
                Already have an account? <Link to="/login" className="text-primary font-bold hover:underline">Sign In</Link>
            </p>
        </div>
      </div>
    </div>
  );
};

export default SignUpPage;
