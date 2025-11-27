
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/Button';
import { useNavigate, Link } from 'react-router-dom';
import { Participant, UserRole, Coach } from '../../types';
import { MOCK_PARTICIPANT_SPRINTS, MOCK_SPRINTS, MOCK_REFERRALS, SUBSCRIPTION_PLANS } from '../../services/mockData';

const BANNER_IMAGES = [
    "https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2029&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=2070&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=2070&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?q=80&w=1887&auto=format&fit=crop"
];

// Simple Modal Component
const Modal = ({ title, onClose, children }: { title: string, onClose: () => void, children?: React.ReactNode }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-5 border-b border-gray-100">
                <h3 className="text-xl font-bold text-gray-900">{title}</h3>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
            <div className="p-6 overflow-y-auto">
                {children}
            </div>
        </div>
    </div>
);

const Profile: React.FC = () => {
  const { user, logout, activeRole, switchRole, completeCoachOnboarding } = useAuth();
  const navigate = useNavigate();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [bannerUrl, setBannerUrl] = useState(BANNER_IMAGES[0]);
  const [showBannerMenu, setShowBannerMenu] = useState(false);
  
  // Extended Profile Fields
  const [location, setLocation] = useState('');
  const [website, setWebsite] = useState('');
  const [occupation, setOccupation] = useState('');
  const [showBasicInfo, setShowBasicInfo] = useState(false);
  
  const [showSettings, setShowSettings] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showCoachOnboarding, setShowCoachOnboarding] = useState(false);
  const [showPendingModal, setShowPendingModal] = useState(false);
  
  // Coach Onboarding State
  const [coachNiche, setCoachNiche] = useState('');
  const [coachBio, setCoachBio] = useState('');

  const [notifications, setNotifications] = useState({
      email: true,
      push: false,
      marketing: true
  });

  useEffect(() => {
      if (user) {
          setName(user.name);
          // Show bio based on active role if available, otherwise fallback
          if (activeRole === UserRole.COACH && 'coachBio' in user && user.coachBio) {
              setBio(user.coachBio as string);
          } else {
              setBio((user as Participant).bio || '');
          }
          
          // Initialize extended fields (mock values if undefined on user object)
          const p = user as Participant;
          setOccupation(p.occupation || '');
          setLocation('Lagos, Nigeria'); // Mock default
          setWebsite(''); 

          // Deterministic banner based on name
          setBannerUrl(BANNER_IMAGES[user.name.length % BANNER_IMAGES.length]);
      }
  }, [user, activeRole]);

  if (!user) return null;

  const participant = user as Participant;
  const currentPlan = participant.subscription?.active 
    ? SUBSCRIPTION_PLANS.find(p => p.id === participant.subscription!.planId) 
    : null;
  
  // Determine display niche based on role
  let displayNiche: string | undefined;
  if (activeRole === UserRole.COACH) {
      if (user.role === UserRole.COACH) {
          displayNiche = (user as Coach).niche;
      } else if (user.role === UserRole.PARTICIPANT) {
          displayNiche = (user as Participant).coachNiche;
      }
  }
  
  // Stats Logic
  const mySprints = MOCK_PARTICIPANT_SPRINTS.filter(ps => ps.participantId === user.id);
  const completedSprints = mySprints.filter(ps => ps.progress.every(d => d.completed)).length;
  
  // Coach Stats
  const createdSprints = MOCK_SPRINTS.filter(s => s.coachId === user.id).length;

  // Impact Stats
  const referrals = MOCK_REFERRALS.filter(r => r.referrerId === user.id);
  const latestReferral = referrals.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleEditToggle = () => {
      if (!isEditing) {
          setIsEditing(true);
          setShowBasicInfo(true); // Auto-open info when editing
      } else {
          setIsEditing(false);
          // API Call would go here to save name, bio, location, website, occupation
      }
  };

  const toggleBannerMenu = () => setShowBannerMenu(!showBannerMenu);

  const changeBanner = (url: string) => {
      setBannerUrl(url);
      setShowBannerMenu(false);
  };

  const handleSwitchAccount = () => {
      if (activeRole === UserRole.PARTICIPANT) {
          // Switching to Coach Mode
          if (user.role === UserRole.COACH) {
              // Native Coach
              switchRole(UserRole.COACH);
              navigate('/coach/dashboard');
          } else if (participant.hasCoachProfile) {
              // Participant with Coach Profile
              if (participant.coachApproved) {
                  // Approved -> Switch
                  switchRole(UserRole.COACH);
                  navigate('/coach/dashboard');
              } else {
                  // Not Approved -> Show Pending Modal
                  setShowPendingModal(true);
              }
          } else {
              // No Profile -> Trigger onboarding
              setShowCoachOnboarding(true);
          }
      } else {
          // Switching back to Member
          switchRole(UserRole.PARTICIPANT);
          navigate('/dashboard');
      }
  };

  const submitCoachOnboarding = (e: React.FormEvent) => {
      e.preventDefault();
      completeCoachOnboarding(coachBio, coachNiche);
      setShowCoachOnboarding(false);
      // Instead of switching, show the pending modal
      setShowPendingModal(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
       {/* Coach Onboarding Modal */}
       {showCoachOnboarding && (
           <Modal title="Setup Coach Profile" onClose={() => setShowCoachOnboarding(false)}>
               <form onSubmit={submitCoachOnboarding} className="space-y-4">
                   <p className="text-gray-600 mb-4">Ready to inspire others? Set up your coach profile to start creating sprints. Your profile will be reviewed by our team.</p>
                   <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">Your Coaching Niche</label>
                       <input 
                            type="text"
                            required
                            value={coachNiche}
                            onChange={(e) => setCoachNiche(e.target.value)}
                            placeholder="e.g. Productivity, Wellness, Fitness"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                       />
                   </div>
                   <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">Coach Bio</label>
                       <textarea 
                            required
                            value={coachBio}
                            onChange={(e) => setCoachBio(e.target.value)}
                            placeholder="Tell potential participants about your expertise..."
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                       />
                   </div>
                   <div className="pt-4">
                       <Button type="submit" className="w-full justify-center">Submit for Approval</Button>
                   </div>
               </form>
           </Modal>
       )}

        {/* Pending Approval Modal */}
        {showPendingModal && (
            <Modal title="Application Pending" onClose={() => setShowPendingModal(false)}>
                <div className="text-center py-4">
                    <div className="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h4 className="text-lg font-bold text-gray-900 mb-2">Review in Progress</h4>
                    <p className="text-gray-600 mb-6">
                        Thanks for applying to be a coach! Your profile is currently under review. We will notify you once it has been approved.
                        <br/><br/>
                        You can continue using Vectorise as a Member in the meantime.
                    </p>
                    <Button onClick={() => setShowPendingModal(false)} className="w-full">Okay, Got It</Button>
                </div>
            </Modal>
        )}

       {/* Settings Modal */}
       {showSettings && (
           <Modal title="Account Settings" onClose={() => setShowSettings(false)}>
                <div className="space-y-2">
                    {[
                        { label: 'Email Preferences', action: 'Notifications' },
                        { label: 'Change Password', action: 'Security' },
                        { label: 'Payment Methods', action: 'Billing' },
                        { label: 'Connected Apps', action: 'Integrations' },
                    ].map((item, i) => (
                            <button key={i} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-xl transition-colors group border border-gray-100 mb-2">
                            <span className="text-gray-700 font-medium">{item.label}</span>
                            <span className="text-gray-400 text-sm group-hover:text-primary flex items-center gap-1">
                                {item.action}
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                </svg>
                            </span>
                        </button>
                    ))}
                    <div className="pt-4 mt-4 border-t border-gray-100">
                        <Button variant="danger" onClick={handleLogout} className="w-full">
                            Sign Out
                        </Button>
                    </div>
                </div>
           </Modal>
       )}

       {/* Notifications Modal */}
       {showNotifications && (
           <Modal title="Notification Preferences" onClose={() => setShowNotifications(false)}>
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                        <div>
                            <p className="font-bold text-gray-900">Daily Reminders</p>
                            <p className="text-sm text-gray-500">Receive daily tasks via email</p>
                        </div>
                        <button 
                            onClick={() => setNotifications({...notifications, email: !notifications.email})}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${notifications.email ? 'bg-primary' : 'bg-gray-300'}`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${notifications.email ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                        <div>
                            <p className="font-bold text-gray-900">Push Notifications</p>
                            <p className="text-sm text-gray-500">Alerts on mobile device</p>
                        </div>
                        <button 
                            onClick={() => setNotifications({...notifications, push: !notifications.push})}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${notifications.push ? 'bg-primary' : 'bg-gray-300'}`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${notifications.push ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>
                </div>
           </Modal>
       )}

      {/* Banner */}
      <div className="relative h-56 md:h-72 w-full bg-gray-300 group">
        <img 
            src={bannerUrl} 
            alt="Profile Banner" 
            className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-black/40"></div>
        
        {/* Banner Controls */}
        <div className="absolute top-4 right-4 z-20">
            <button 
                onClick={toggleBannerMenu}
                className="bg-black/30 hover:bg-black/50 text-white px-4 py-2 rounded-full text-sm backdrop-blur-md flex items-center gap-2 transition-all font-medium border border-white/10"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Edit Cover
            </button>
            
            {showBannerMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl py-3 z-30 border border-gray-100 animate-fade-in origin-top-right">
                    <p className="px-4 py-1 text-xs font-bold text-gray-400 uppercase tracking-wider">Select Gradient / Image</p>
                    <div className="grid grid-cols-4 gap-2 px-4 py-2">
                        {BANNER_IMAGES.map((url, idx) => (
                            <button 
                                key={idx} 
                                onClick={() => changeBanner(url)}
                                className="aspect-square rounded-lg border-2 border-transparent hover:border-primary overflow-hidden transition-all focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                                <img src={url} className="w-full h-full object-cover" alt={`Banner ${idx}`}/>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="relative -mt-20">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sm:p-8">
                
                {/* Header Section: Avatar + Actions + Info */}
                <div className="flex flex-col md:flex-row gap-6 items-start">
                    {/* Avatar (Lifted) */}
                    <div className="relative -mt-20 md:-mt-24 mb-2 md:mb-0 flex-shrink-0 mx-auto md:mx-0">
                        <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-[6px] border-white shadow-xl overflow-hidden bg-white">
                            <img src={user.profileImageUrl} alt={user.name} className="w-full h-full object-cover" />
                        </div>
                         <button className="absolute bottom-2 right-2 bg-white text-gray-700 p-2 rounded-full shadow-lg border border-gray-100 hover:text-primary transition-colors" title="Change Avatar">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                            </svg>
                        </button>
                    </div>

                    {/* Right Side Content */}
                    <div className="flex-1 w-full">
                        {/* Top Row: Name & Actions */}
                        <div className="flex flex-col sm:flex-row justify-between items-center sm:items-start gap-4 mb-2">
                            <div className="text-center sm:text-left w-full">
                                <div className="flex items-center justify-center sm:justify-start gap-3">
                                    {isEditing ? (
                                        <input 
                                            type="text" 
                                            value={name} 
                                            onChange={(e) => setName(e.target.value)}
                                            className="text-3xl font-bold text-gray-900 border-b-2 border-gray-200 focus:border-primary focus:outline-none bg-transparent pb-1 w-full"
                                            placeholder="Your Name"
                                            autoFocus
                                        />
                                    ) : (
                                        <h1 className="text-3xl font-bold text-gray-900 leading-tight">{name}</h1>
                                    )}

                                    {/* Subscription Badge */}
                                    {(activeRole as UserRole) === UserRole.PARTICIPANT && currentPlan && (
                                        <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wider border transition-all flex items-center gap-1 ${currentPlan.id === 'premium' ? 'bg-black text-white' : 'bg-gray-100 text-gray-600'}`}>
                                            {currentPlan.name}
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center justify-center sm:justify-start gap-2 mt-1 text-gray-500 font-medium">
                                    <span>{user.email}</span>
                                    {displayNiche && (
                                        <>
                                            <span>•</span>
                                            <span>{displayNiche}</span>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Actions Row */}
                             <div className="flex items-center gap-3 flex-shrink-0">
                                <button 
                                    onClick={handleEditToggle}
                                    className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-sm whitespace-nowrap ${
                                        isEditing 
                                        ? 'bg-primary text-white hover:bg-primary-hover ring-4 ring-primary/20' 
                                        : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
                                    }`}
                                >
                                    {isEditing ? 'Save Changes' : 'Edit Profile'}
                                </button>
                                
                                <div className="h-8 w-px bg-gray-200 mx-1 hidden sm:block"></div>

                                <button 
                                    onClick={() => setShowSettings(true)}
                                    className="p-2.5 rounded-xl border border-gray-200 text-gray-500 hover:text-primary hover:border-primary hover:bg-primary/5 transition-all"
                                    title="Settings"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </button>
                                <button 
                                    onClick={() => setShowNotifications(true)}
                                    className="p-2.5 rounded-xl border border-gray-200 text-gray-500 hover:text-primary hover:border-primary hover:bg-primary/5 transition-all relative"
                                    title="Notifications"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                    </svg>
                                    <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
                                </button>
                             </div>
                        </div>

                        {/* Bio Section (Moved Up) */}
                        <div className="mb-4 text-center sm:text-left">
                            {isEditing ? (
                                <textarea
                                    value={bio}
                                    onChange={(e) => setBio(e.target.value)}
                                    rows={3}
                                    className="w-full text-gray-700 border-2 border-gray-100 rounded-xl p-3 focus:border-primary focus:ring-0 focus:outline-none resize-none transition-colors text-sm bg-white"
                                    placeholder={activeRole === UserRole.COACH ? "Describe your coaching style..." : "Tell us about yourself..."}
                                />
                            ) : (
                                <p className="text-gray-600 text-sm leading-relaxed">
                                    {bio || <span className="italic text-gray-400">Add a bio to share your story.</span>}
                                </p>
                            )}
                        </div>

                        {/* Stats & Info Toggle */}
                        <div className="flex flex-col gap-4">
                            {/* Stats Row (Inline & Compact) */}
                            <div className="flex items-center justify-center sm:justify-start gap-3 text-sm text-gray-600 mt-2 flex-wrap">
                                {(activeRole as UserRole) === UserRole.PARTICIPANT ? (
                                    <>
                                        <div className="flex items-center gap-1">
                                            <span className="font-bold text-gray-900">{completedSprints}</span>
                                            <span>Completed</span>
                                        </div>
                                        <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                                        <div className="flex items-center gap-1">
                                            <span className="font-bold text-gray-900">{participant.followers || 0}</span>
                                            <span>Followers</span>
                                        </div>
                                        <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                                        <div className="flex items-center gap-1">
                                            <span className="font-bold text-gray-900">{participant.following || 0}</span>
                                            <span>Following</span>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                         <div className="flex items-center gap-1">
                                            <span className="font-bold text-gray-900">{createdSprints}</span>
                                            <span>Created</span>
                                        </div>
                                        <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                                         <div className="flex items-center gap-1">
                                            <span className="font-bold text-gray-900">{participant.followers || 0}</span>
                                            <span>Students</span>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Basic Info Button & Collapsible Area */}
                            <div>
                                <button 
                                    onClick={() => setShowBasicInfo(!showBasicInfo)}
                                    className="text-xs font-bold text-primary hover:underline flex items-center gap-1 mb-2"
                                >
                                    {showBasicInfo ? 'Hide Details' : 'View More Info'}
                                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 transition-transform ${showBasicInfo ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>

                                {showBasicInfo && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl animate-fade-in border border-gray-100 text-sm">
                                        <div className="group">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Occupation</label>
                                            {isEditing ? (
                                                <input 
                                                    type="text"
                                                    value={occupation}
                                                    onChange={(e) => setOccupation(e.target.value)}
                                                    className="w-full p-1.5 bg-white rounded border border-gray-200 text-sm focus:border-primary focus:outline-none"
                                                    placeholder="e.g. Designer"
                                                />
                                            ) : (
                                                <p className="font-medium text-gray-900">{occupation || <span className="text-gray-400 font-normal">Not set</span>}</p>
                                            )}
                                        </div>
                                        <div className="group">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Location</label>
                                            {isEditing ? (
                                                <input 
                                                    type="text"
                                                    value={location}
                                                    onChange={(e) => setLocation(e.target.value)}
                                                    className="w-full p-1.5 bg-white rounded border border-gray-200 text-sm focus:border-primary focus:outline-none"
                                                    placeholder="City, Country"
                                                />
                                            ) : (
                                                <p className="font-medium text-gray-900">{location || <span className="text-gray-400 font-normal">Not set</span>}</p>
                                            )}
                                        </div>
                                        <div className="group">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Website</label>
                                            {isEditing ? (
                                                <input 
                                                    type="text"
                                                    value={website}
                                                    onChange={(e) => setWebsite(e.target.value)}
                                                    className="w-full p-1.5 bg-white rounded border border-gray-200 text-sm focus:border-primary focus:outline-none"
                                                    placeholder="https://"
                                                />
                                            ) : (
                                                <p className="font-medium text-blue-600 truncate">
                                                    {website ? <a href={website} target="_blank" rel="noreferrer" className="hover:underline">{website}</a> : <span className="text-gray-400 font-normal">Not set</span>}
                                                </p>
                                            )}
                                        </div>
                                        <div className="group">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Email</label>
                                            <p className="font-medium text-gray-900">{user.email}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Lower Section Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            {/* Content Cards */}
            {(activeRole as UserRole) === UserRole.PARTICIPANT ? (
                /* Member View */
                <div className="md:col-span-2 space-y-6">
                    
                    {/* Growth Impact Section - Refactored */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <div className="flex justify-between items-center mb-5">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-xl text-orange-600">
                                    🌱
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 leading-none">Growth Impact</h3>
                                    <p className="text-xs text-gray-500 mt-1 font-medium">Your influence journey</p>
                                </div>
                            </div>
                            <Link to="/impact" className="text-sm font-bold text-primary hover:text-primary-hover flex items-center gap-1 transition-colors">
                                Dashboard
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                </svg>
                            </Link>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Stat Card */}
                            <div className="bg-gradient-to-br from-orange-50 to-white border border-orange-100 rounded-2xl p-5 flex flex-col justify-between h-32 relative overflow-hidden group transition-all hover:shadow-sm">
                                <div className="relative z-10">
                                    <span className="text-4xl font-extrabold text-gray-900 block mb-1 tracking-tight">
                                        {participant.impactStats?.peopleHelped || 0}
                                    </span>
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">People Helped</span>
                                </div>
                                <div className="relative z-10 mt-auto">
                                    <div className="h-1 w-12 bg-orange-200 rounded-full"></div>
                                </div>
                                <div className="absolute top-0 right-0 w-24 h-24 bg-orange-100 rounded-full blur-2xl -mr-8 -mt-8 opacity-50 group-hover:opacity-80 transition-opacity"></div>
                            </div>

                            {/* Latest Impact Card */}
                            <div className="bg-gradient-to-br from-blue-50 to-white border border-blue-100 rounded-2xl p-5 flex flex-col justify-center h-32 relative overflow-hidden group transition-all hover:shadow-sm">
                                {latestReferral ? (
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 text-[10px] font-bold uppercase tracking-wide">Latest</span>
                                            <span className="text-xs text-gray-400">{new Date(latestReferral.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <img src={latestReferral.refereeAvatar || `https://ui-avatars.com/api/?name=${latestReferral.refereeName}&background=random`} alt="" className="w-8 h-8 rounded-full object-cover ring-2 ring-white" />
                                            <p className="text-sm text-gray-800 font-medium leading-snug line-clamp-2">
                                                <span className="font-bold text-gray-900">{latestReferral.refereeName}</span> {latestReferral.status === 'joined' ? 'joined Vectorise' : 'started a sprint'}.
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="relative z-10 flex flex-col items-center text-center">
                                        <span className="text-2xl mb-1 block">🚀</span>
                                        <p className="text-sm font-bold text-gray-900">Start your ripple</p>
                                        <Link to="/impact/share" className="text-xs text-primary font-semibold hover:underline mt-1">Invite a friend &rarr;</Link>
                                    </div>
                                )}
                                <div className="absolute bottom-0 right-0 w-24 h-24 bg-blue-100 rounded-full blur-2xl -mr-6 -mb-6 opacity-50 group-hover:opacity-80 transition-opacity"></div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                /* Coach View */
                <div className="md:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-gray-900">Coach Actions</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <button onClick={() => navigate('/coach/sprint/new')} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors text-left group">
                             <div className="bg-white p-3 rounded-full shadow-sm group-hover:scale-110 transition-transform">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                             </div>
                             <div>
                                 <p className="font-bold text-gray-900">Create New Sprint</p>
                                 <p className="text-xs text-gray-500">Launch a new program</p>
                             </div>
                        </button>
                        <button onClick={() => navigate('/coach/dashboard')} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors text-left group">
                             <div className="bg-white p-3 rounded-full shadow-sm group-hover:scale-110 transition-transform">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 01-2 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                             </div>
                             <div>
                                 <p className="font-bold text-gray-900">View Dashboard</p>
                                 <p className="text-xs text-gray-500">Manage active sprints</p>
                             </div>
                        </button>
                    </div>
                </div>
            )}

            {/* Sidebar */}
            <div className="space-y-6">
                {(activeRole as UserRole) === UserRole.PARTICIPANT ? (
                    <>
                        <div className="bg-gradient-to-br from-primary to-[#0B6040] rounded-2xl shadow-lg p-6 text-white relative overflow-hidden">
                            <div className="relative z-10">
                                <h3 className="font-bold text-xl mb-2">Upgrade Your Rise</h3>
                                <p className="text-sm opacity-90 mb-6 leading-relaxed">
                                    {currentPlan 
                                        ? `You are currently on the ${currentPlan.name} plan. Unlock more power.` 
                                        : 'Unlock unlimited sprints, advanced analytics, and exclusive coach access.'
                                    }
                                </p>
                                <Link to="/impact/rewards">
                                    <button className="w-full py-3 bg-white text-primary font-bold rounded-xl text-sm hover:bg-gray-50 transition-colors shadow-md">
                                        View Plans
                                    </button>
                                </Link>
                            </div>
                            <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                            <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full blur-xl"></div>
                        </div>
                        
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <h4 className="font-bold text-gray-900 mb-4">Community Highlights</h4>
                            <p className="text-sm text-gray-500 mb-4">See what others are achieving in the tribe.</p>
                            <div className="flex -space-x-2 overflow-hidden mb-4">
                                {[1,2,3,4].map(i => (
                                    <img key={i} className="inline-block h-8 w-8 rounded-full ring-2 ring-white" src={`https://picsum.photos/seed/${i}/100`} alt=""/>
                                ))}
                                <div className="h-8 w-8 rounded-full bg-gray-100 ring-2 ring-white flex items-center justify-center text-xs font-bold text-gray-500">+42</div>
                            </div>
                            <button onClick={() => navigate('/tribe')} className="text-primary text-sm font-semibold hover:underline">Visit Tribe &rarr;</button>
                        </div>
                    </>
                ) : (
                    /* Coach Sidebar */
                     <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <h4 className="font-bold text-gray-900 mb-4">Coach Resources</h4>
                        <ul className="space-y-3 text-sm text-gray-600">
                            <li className="flex items-center gap-2 cursor-pointer hover:text-primary">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                                Creator Playbook
                            </li>
                            <li className="flex items-center gap-2 cursor-pointer hover:text-primary">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                Coach Community
                            </li>
                        </ul>
                    </div>
                )}
            </div>
        </div>
      </div>
      
       <style>{`
            @keyframes fadeIn {
              from { opacity: 0; transform: scale(0.95); }
              to { opacity: 1; transform: scale(1); }
            }
            .animate-fade-in {
              animation: fadeIn 0.2s ease-out forwards;
            }
        `}</style>
    </div>
  );
};

export default Profile;
