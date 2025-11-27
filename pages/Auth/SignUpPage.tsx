
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/Button';
import { MOCK_PARTICIPANT_SPRINTS, MOCK_SPRINTS, MOCK_USERS } from '../../services/mockData';
import { Participant } from '../../types';

const SignUpPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  // Retrieve the sprint ID and profile data selected during onboarding
  const { sprintId: selectedSprintId, persona, answers } = location.state || {};
  const sprintDetails = MOCK_SPRINTS.find(s => s.id === selectedSprintId);

  const updateUserProfile = (userId: string) => {
      // In a real app, we would send this data to the backend API.
      // Here, we update the mock user object in memory for the session.
      const user = MOCK_USERS.find(u => u.id === userId) as Participant;
      if (user) {
          if (persona) user.persona = persona;
          if (answers) user.onboardingAnswers = answers;
          // Also update name if provided
          if (name) user.name = name;
      }
  };

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !name) {
        setError('Please fill in all fields.');
        return;
    }

    // Simulate Account Creation: Use a static ID for "New User" from mock data
    const newUserId = 'participant_new'; 
    
    // Store quiz data
    updateUserProfile(newUserId);

    login(newUserId);

    if (selectedSprintId && sprintDetails) {
        // Simulate Enrollment
        const newEnrollmentId = `enrollment_${Date.now()}`;
        const newEnrollment = {
            id: newEnrollmentId,
            sprintId: selectedSprintId,
            participantId: newUserId,
            startDate: new Date().toISOString(),
            progress: Array.from({ length: sprintDetails.duration }, (_, i) => ({
                day: i + 1,
                completed: false
            }))
        };
        
        // Push to mock data (in-memory only)
        MOCK_PARTICIPANT_SPRINTS.push(newEnrollment);

        // Direct redirect to the Sprint View (Day 1)
        navigate(`/participant/sprint/${newEnrollmentId}`);
    } else {
        // Fallback if no sprint was selected, go to Home (Dashboard)
        navigate('/dashboard');
    }
  };

  const handleGoogleSignUp = () => {
      // Simulate Google Auth
      const newUserId = 'participant_new';
      
      // Store quiz data (name might be missing here, but we store what we have)
      updateUserProfile(newUserId);

      login(newUserId);

      if (selectedSprintId && sprintDetails) {
        const newEnrollmentId = `enrollment_g_${Date.now()}`;
        const newEnrollment = {
            id: newEnrollmentId,
            sprintId: selectedSprintId,
            participantId: newUserId,
            startDate: new Date().toISOString(),
            progress: Array.from({ length: sprintDetails.duration }, (_, i) => ({
                day: i + 1,
                completed: false
            }))
        };
        MOCK_PARTICIPANT_SPRINTS.push(newEnrollment);
        navigate(`/participant/sprint/${newEnrollmentId}`);
      } else {
          navigate('/dashboard');
      }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl">
        <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Sign up to access your sprint</h2>
            {sprintDetails && (
                <p className="mt-2 text-primary font-medium">You are joining: {sprintDetails.title}</p>
            )}
        </div>
        
        <button 
            type="button"
            onClick={handleGoogleSignUp}
            className="w-full flex items-center justify-center gap-3 bg-white border border-gray-200 text-gray-700 font-semibold py-3.5 px-4 rounded-xl hover:bg-gray-50 transition-all hover:shadow-md mb-6 group"
        >
            <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            <span className="group-hover:text-gray-900">Sign up with Google</span>
        </button>

        <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white text-gray-500">Or sign up with email</span>
            </div>
        </div>

        <form onSubmit={handleSignUp} className="mb-8 space-y-4">
            <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input 
                    type="text" 
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-white"
                    placeholder="Enter your name"
                />
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
                    className={`w-full px-4 py-3 border rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-white ${error ? 'border-red-500' : 'border-gray-200'}`}
                    placeholder="Enter your email"
                />
                {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
            </div>
            <Button type="submit" className="w-full justify-center py-3.5 rounded-xl shadow-lg text-lg">Sign Up & Start Sprint</Button>
        </form>
      </div>
    </div>
  );
};

export default SignUpPage;
