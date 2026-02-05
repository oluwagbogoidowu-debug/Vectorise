
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/Button';
import { useNavigate, Link } from 'react-router-dom';
import { Participant, ParticipantSprint, UserRole } from '../../types';
import { sprintService } from '../../services/sprintService';
import FirstTimeGuide from '../../components/FirstTimeGuide';

const BANNER_IMAGES = [
    "https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2029&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=2070&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=2070&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?q=80&w=1887&auto=format&fit=crop"
];

const Modal = ({ title, onClose, children }: { title: string, onClose: () => void, children?: React.ReactNode }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
        <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-gray-50 bg-gray-50/50">
                <h3 className="text-xl font-black text-gray-900 tracking-tight">{title}</h3>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-white transition-all shadow-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar">{children}</div>
        </div>
    </div>
);

const Profile: React.FC = () => {
  const { user, logout, updateProfile, deleteAccount, switchRole, activeRole } = useAuth();
  const navigate = useNavigate();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [intention, setIntention] = useState('');
  const [bannerUrl, setBannerUrl] = useState(BANNER_IMAGES[0]);
  const [showBannerMenu, setShowBannerMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showExtendedContent, setShowExtendedContent] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  
  const [enrollments, setEnrollments] = useState<ParticipantSprint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
      if (user) {
          setName(user.name);
          const p = user as Participant;
          setBio(p.bio || '');
          setIntention(p.intention || 'Working on consistency in my daily practice.');
          setBannerUrl(BANNER_IMAGES[user.name.length % BANNER_IMAGES.length]);

          const fetchData = async () => {
              setIsLoading(true);
              try {
                  const userEnrollments = await sprintService.getUserEnrollments(user.id);
                  setEnrollments(userEnrollments);
              } catch (err) {
                  console.error(err);
              } finally {
                  setIsLoading(false);
              }
          };
          fetchData();
      }
  }, [user]);

  const currentSprint = useMemo(() => {
    return enrollments
        .filter(e => e.progress.some(p => !p.completed))
        .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())[0];
  }, [enrollments]);

  if (!user) return null;

  const participant = user as Participant;

  const handleLogout = () => { logout(); navigate('/login'); };

  const handleEditToggle = async () => {
      if (isEditing) {
          setIsEditing(false);
          try { await updateProfile({ name, bio, intention }); } catch (error) { alert("Failed to update profile."); }
      } else {
          setIsEditing(true);
      }
  };

  const SettingsOption = ({ icon, label, onClick, color = "text-gray-700", subLabel }: any) => (
      <button 
        onClick={onClick}
        className="w-full flex items-center justify-between p-3.5 rounded-2xl hover:bg-gray-50 transition-all group active:scale-[0.98]"
      >
          <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl bg-white border border-gray-100 shadow-sm flex items-center justify-center text-lg group-hover:scale-110 transition-transform ${color}`}>
                {icon}
              </div>
              <div className="text-left">
                  <p className={`text-sm font-bold tracking-tight ${color}`}>{label}</p>
                  {subLabel && <p className="text-[10px] text-gray-400 font-medium">{subLabel}</p>}
              </div>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-300 group-hover:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
      </button>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-24 animate-fade-in overflow-x-hidden">
      {showGuide && <FirstTimeGuide onClose={() => setShowGuide(false)} />}
      
      {showSettings && (
          <Modal title="Settings" onClose={() => setShowSettings(false)}>
              <div className="space-y-6">
                  {/* Account Section */}
                  <div>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em] mb-3 ml-1">Account & Access</p>
                      <div className="space-y-0.5">
                          <SettingsOption 
                            icon="👤" 
                            label="Profile Information" 
                            subLabel={user.email}
                            onClick={() => {}} 
                          />
                          {participant.hasCoachProfile && (
                              <SettingsOption 
                                icon="🧠" 
                                label={activeRole === UserRole.COACH ? "Switch to Participant" : "Switch to Coach View"}
                                subLabel="Toggle dashboard perspectives"
                                onClick={() => {
                                    switchRole(activeRole === UserRole.COACH ? UserRole.PARTICIPANT : UserRole.COACH);
                                    setShowSettings(false);
                                    navigate(activeRole === UserRole.COACH ? '/dashboard' : '/coach/dashboard');
                                }} 
                              />
                          )}
                          <SettingsOption 
                            icon="💳" 
                            label="Subscription Plan" 
                            subLabel={participant.subscription?.planId ? `${participant.subscription.planId.toUpperCase()} Active` : "Free Tier"}
                            onClick={() => {}} 
                          />
                      </div>
                  </div>

                  {/* Knowledge Section */}
                  <div>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em] mb-3 ml-1">Learning & Platform</p>
                      <div className="space-y-0.5">
                          <SettingsOption 
                            icon="📖" 
                            label="Platform Guide" 
                            subLabel="How Vectorise works"
                            onClick={() => {
                                setShowSettings(false);
                                setShowGuide(true);
                            }} 
                          />
                          <SettingsOption 
                            icon="💬" 
                            label="Help & Support" 
                            onClick={() => {}} 
                          />
                      </div>
                  </div>

                  {/* Actions Section */}
                  <div className="pt-4 border-t border-gray-100">
                      <div className="space-y-0.5">
                          <SettingsOption 
                            icon="🚪" 
                            label="Sign Out" 
                            color="text-orange-600"
                            onClick={handleLogout} 
                          />
                          <SettingsOption 
                            icon="⚠️" 
                            label="Delete Account" 
                            color="text-red-500"
                            onClick={() => { setShowSettings(false); setShowDeleteConfirm(true); }} 
                          />
                      </div>
                  </div>
              </div>
          </Modal>
      )}

      {showDeleteConfirm && (
          <Modal title="Delete Account" onClose={() => setShowDeleteConfirm(false)}>
              <div className="text-center py-4">
                  <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  </div>
                  <h4 className="text-lg font-bold text-gray-900 mb-2">Are you absolutely sure?</h4>
                  <p className="text-gray-500 text-sm mb-8 leading-relaxed">This action is irreversible. Your progress, earned credits, and growth data will be permanently deleted.</p>
                  <div className="flex gap-4">
                      <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-4 bg-gray-50 text-gray-500 font-bold rounded-2xl hover:bg-gray-100 transition-all text-sm">Cancel</button>
                      <Button variant="danger" onClick={async () => { await deleteAccount(); navigate('/login'); }} className="flex-1 py-4 rounded-2xl shadow-xl shadow-red-500/20 text-sm">Delete Forever</Button>
                  </div>
              </div>
          </Modal>
      )}

      <div className="relative h-28 md:h-32 w-full group overflow-hidden">
        <img src={bannerUrl} alt="Cover" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
        <div className="absolute inset-0 bg-black/5"></div>
        <div className="absolute top-4 right-4 z-20">
            <button onClick={() => setShowBannerMenu(!showBannerMenu)} className="bg-black/30 hover:bg-black/50 text-white px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest backdrop-blur-md border border-white/10 transition-all">
                Cover
            </button>
            {showBannerMenu && (
                <div className="absolute right-0 mt-3 w-64 bg-white rounded-2xl shadow-2xl p-4 z-30 border border-gray-50">
                    <div className="grid grid-cols-4 gap-2">
                        {BANNER_IMAGES.map((url, idx) => (
                            <button key={idx} onClick={() => { setBannerUrl(url); setShowBannerMenu(false); }} className="aspect-square rounded-lg border-2 border-transparent hover:border-primary overflow-hidden transition-all">
                                <img src={url} className="w-full h-full object-cover" alt=""/>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 relative">
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-6 md:p-8 -mt-24 relative z-10">
            <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-white shadow-lg overflow-hidden bg-white mb-3">
                    <img src={user.profileImageUrl} alt={user.name} className="w-full h-full object-cover" />
                </div>
                
                {isEditing ? (
                    <input 
                        type="text" 
                        value={name} 
                        onChange={(e) => setName(e.target.value)} 
                        className="text-xl font-bold text-gray-900 border-b-2 border-primary/20 focus:border-primary outline-none bg-transparent w-full text-center pb-1 mb-2 animate-pulse" 
                        autoFocus 
                    />
                ) : (
                    <h1 className="text-xl font-bold text-gray-900 mb-1">{name}</h1>
                )}

                <div className="mb-4 max-w-sm">
                    {isEditing ? (
                        <input
                            type="text"
                            value={intention}
                            onChange={(e) => setIntention(e.target.value)}
                            className="text-sm text-gray-600 border-b border-gray-100 focus:border-primary outline-none bg-transparent w-full text-center py-1"
                            placeholder="Growth intention..."
                        />
                    ) : (
                        <p className="text-sm text-gray-500 font-medium italic leading-snug px-4">"{intention}"</p>
                    )}
                </div>

                <div className="grid grid-cols-3 gap-2 py-3 w-full max-w-xs mb-4 border-y border-gray-50">
                    <div className="text-center">
                        <p className="text-lg font-bold text-gray-900">{enrollments.length}</p>
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Sprints</p>
                    </div>
                    <div className="text-center border-x border-gray-50 px-2">
                        <p className="text-lg font-bold text-gray-900">{participant.followers || 0}</p>
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Click</p>
                    </div>
                    <div className="text-center">
                        <p className="text-lg font-bold text-gray-900">{participant.following || 0}</p>
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Following</p>
                    </div>
                </div>

                <div className="flex gap-2 mb-8">
                    <Button onClick={handleEditToggle} variant={isEditing ? 'primary' : 'secondary'} className="rounded-full px-6 py-2 shadow-sm text-xs">
                        {isEditing ? 'Save' : 'Edit Profile'}
                    </Button>
                    <button onClick={() => setShowSettings(true)} className="p-2 bg-gray-50 text-gray-400 rounded-full hover:bg-gray-100 hover:text-gray-600 transition-all border border-gray-100">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Link to="/impact/rewards" className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-100 rounded-2xl hover:bg-yellow-100 transition-all shadow-sm group">
                    <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center text-lg shadow-sm group-hover:scale-105 transition-transform">🪙</div>
                    <div className="flex-1">
                        <p className="text-[8px] font-black text-yellow-700 uppercase tracking-widest mb-0.5">Wallet</p>
                        <p className="text-xs font-bold text-gray-900">{participant.walletBalance || 0} Credits</p>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                </Link>

                <Link to="/impact" className="flex items-center gap-3 p-4 bg-green-50 border border-green-100 rounded-2xl hover:bg-green-100 transition-all shadow-sm group">
                    <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center text-lg shadow-sm group-hover:scale-105 transition-transform">🌍</div>
                    <div className="flex-1">
                        <p className="text-[8px] font-black text-green-700 uppercase tracking-widest mb-0.5">Impact</p>
                        <p className="text-xs font-bold text-gray-900">{participant.impactStats?.peopleHelped || 0} Assisted</p>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                </Link>
                
                <Link to="/impact/badges" className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-100 rounded-2xl hover:bg-yellow-100 transition-all shadow-sm group md:col-span-2">
                    <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center text-lg shadow-sm group-hover:scale-105 transition-transform">🏅</div>
                    <div className="flex-1">
                        <p className="text-[8px] font-black text-yellow-700 uppercase tracking-widest mb-0.5">Achievements</p>
                        <p className="text-xs font-bold text-gray-900">Hall of Rise Progress</p>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                </Link>
            </div>

            <div className="flex justify-center mt-2">
                <button 
                    onClick={() => setShowExtendedContent(!showExtendedContent)}
                    className="p-3 text-gray-300 hover:text-primary transition-all duration-300 hover:scale-110"
                    title={showExtendedContent ? "Compact view" : "Expand growth details"}
                >
                    <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className={`h-5 w-5 transition-transform duration-500 ${showExtendedContent ? 'rotate-180' : ''}`} 
                        fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>
            </div>

            {showExtendedContent && (
                <div className="space-y-10 animate-slide-down pb-4 mt-4">
                    {isEditing && (
                        <section className="bg-gray-50 p-5 rounded-2xl border border-gray-100 animate-fade-in">
                             <h2 className="text-[8px] font-black uppercase tracking-[0.2em] text-gray-400 mb-3">Narrative Edit</h2>
                             <textarea 
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                                className="w-full bg-white border border-gray-200 rounded-xl p-4 text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium"
                                rows={4}
                                placeholder="Your growth story..."
                             />
                        </section>
                    )}

                    {!isEditing && bio && (
                        <section>
                            <h2 className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 mb-4 flex items-center gap-2">
                                <div className="w-1 h-3 bg-blue-500 rounded-full"></div>
                                Bio
                            </h2>
                            <p className="text-gray-600 text-sm leading-relaxed font-medium bg-white p-5 rounded-2xl border border-gray-50 shadow-sm">{bio}</p>
                        </section>
                    )}

                    <section>
                        <h2 className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 mb-4 flex items-center gap-2">
                            <div className="w-1 h-3 bg-primary rounded-full"></div>
                            Current Goal
                        </h2>
                        {currentSprint ? (
                            <Link to={`/participant/sprint/${currentSprint.id}`} className="block bg-gray-50 rounded-2xl p-5 border border-gray-100 hover:border-primary transition-all group shadow-sm">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="text-[8px] font-bold text-primary uppercase tracking-widest mb-1">Ongoing</p>
                                        <h3 className="text-sm font-bold text-gray-900 group-hover:text-primary transition-colors">{enrollments.find(e => e.id === currentSprint.id)?.id.includes('sprint1') ? '7-Day Clarity Challenge' : 'Active Growth Sprint'}</h3>
                                    </div>
                                    <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-primary shadow-sm group-hover:scale-105 transition-transform border border-gray-100">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                </div>
                            </Link>
                        ) : (
                            <p className="text-xs text-gray-400 italic bg-gray-50 p-5 rounded-2xl border border-dashed border-gray-200 text-center">No active sprints. <Link to="/discover" className="text-primary font-bold hover:underline">Start &rarr;</Link></p>
                        )}
                    </section>
                </div>
            )}
        </div>
      </div>
      <style>{`
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideDown {
            from { opacity: 0; transform: translateY(-8px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
            animation: fadeIn 0.4s ease-out forwards;
        }
        .animate-slide-down {
            animation: slideDown 0.4s ease-out forwards;
        }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default Profile;
