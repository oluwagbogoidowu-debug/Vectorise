
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/Button';
import { useNavigate, Link } from 'react-router-dom';
import { Participant, ParticipantSprint } from '../../types';
import { sprintService } from '../../services/sprintService';
import { auth } from '../../services/firebase';
import { sendEmailVerification } from 'firebase/auth';

const Profile: React.FC = () => {
  const { user, logout, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [intention, setIntention] = useState('');
  const [enrollments, setEnrollments] = useState<ParticipantSprint[]>([]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

  useEffect(() => {
      if (user) {
          setName(user.name);
          const p = user as Participant;
          setIntention(p.intention || 'Building consistency.');
          sprintService.getUserEnrollments(user.id).then(setEnrollments);
      }
  }, [user]);

  if (!user) return null;
  const participant = user as Participant;
  const isEmailVerified = auth.currentUser?.emailVerified;

  const handleEditToggle = async () => {
      if (isEditing) {
          setIsEditing(false);
          try { await updateProfile({ name, intention }); } catch (error) { alert("Update failed."); }
      } else {
          setIsEditing(true);
      }
  };

  const handleResendVerification = async () => {
      if (!auth.currentUser || isVerifying) return;
      setIsVerifying(true);
      try {
          await sendEmailVerification(auth.currentUser);
          setVerificationSent(true);
          setTimeout(() => setVerificationSent(false), 5000);
      } catch (err) {
          console.error("Verification resend failed:", err);
      } finally {
          setIsVerifying(false);
      }
  };

  return (
    <div className="bg-[#FDFDFD] h-screen w-full text-base animate-fade-in overflow-hidden flex flex-col font-sans">
        {/* Banner Area - Highly Aesthetic Gradient */}
        <div className="h-40 md:h-60 bg-gradient-to-br from-[#0E7850] via-[#0B6040] to-[#111827] relative flex-shrink-0 overflow-hidden">
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>
            <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-[#FDFDFD] to-transparent" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/5 font-black text-[12vw] pointer-events-none uppercase tracking-tighter italic select-none">Vectorise.</div>
        </div>

        {/* Scrollable Content Deck */}
        <div className="flex-1 overflow-y-auto px-6 pb-40 pt-4 custom-scrollbar">
            <div className="max-w-screen-lg mx-auto">
                
                {/* UNVERIFIED WARNING BANNER */}
                {!isEmailVerified && (
                    <div className="mb-6 bg-orange-50 border border-orange-100 p-4 rounded-2xl flex items-center justify-between animate-slide-up relative z-20">
                        <div className="flex items-center gap-3">
                            <span className="text-xl">⚠️</span>
                            <div>
                                <p className="text-[10px] font-black text-orange-800 uppercase tracking-widest leading-none mb-1">Unverified Registry</p>
                                <p className="text-[11px] text-orange-600 font-medium italic">Check your inbox to secure your account permanently.</p>
                            </div>
                        </div>
                        <button 
                            onClick={handleResendVerification}
                            disabled={isVerifying || verificationSent}
                            className="text-[9px] font-black text-primary uppercase tracking-widest hover:underline disabled:text-gray-400"
                        >
                            {verificationSent ? 'Link Sent' : isVerifying ? 'Sending...' : 'Resend Link'}
                        </button>
                    </div>
                )}

                {/* Profile Identity Block */}
                <div className="flex flex-col md:flex-row items-center md:items-end gap-8 -mt-24 md:-mt-32 mb-12 relative z-10">
                    <div className="w-32 h-32 md:w-44 md:h-44 rounded-[3.5rem] border-[6px] border-white bg-white shadow-2xl overflow-hidden flex-shrink-0 group">
                        <img src={user.profileImageUrl} alt={user.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                    </div>
                    <div className="flex-1 text-center md:text-left pb-2">
                        {isEditing ? (
                            <input value={name} onChange={e => setName(e.target.value)} className="text-3xl font-black text-gray-900 bg-transparent border-b-4 border-primary outline-none mb-2 text-center md:text-left w-full tracking-tight" />
                        ) : (
                            <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tighter leading-none mb-2 italic">{user.name}.</h1>
                        )}
                        <p className="text-gray-400 font-black uppercase tracking-[0.4em] text-[10px]">Growth Registry Profile No. {user.id.substring(0,6)}</p>
                    </div>
                    <div className="flex gap-3 pb-2">
                        <button 
                            onClick={handleEditToggle}
                            className={`px-8 py-3 rounded-[1.25rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all active:scale-95 shadow-lg ${
                                isEditing 
                                ? 'bg-primary text-white shadow-primary/20' 
                                : 'bg-white border border-gray-100 text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            {isEditing ? 'Save Registry' : 'Edit Profile'}
                        </button>
                        <button onClick={() => { logout(); navigate('/login'); }} className="p-3.5 bg-white text-red-400 rounded-2xl shadow-md border border-gray-50 hover:bg-red-50 hover:text-red-500 transition-all active:scale-90 group" title="Logout">
                            <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                    <div className="md:col-span-8 space-y-8">
                        {/* Intention Card */}
                        <section className="bg-white rounded-[3rem] p-8 md:p-12 border border-gray-100 shadow-[0_10px_30px_-15px_rgba(0,0,0,0.05)] relative overflow-hidden">
                            <div className="relative z-10">
                                <h2 className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-6">Manifest Intention</h2>
                                {isEditing ? (
                                    <textarea value={intention} onChange={e => setIntention(e.target.value)} className="w-full text-xl font-bold text-gray-800 bg-gray-50 p-6 rounded-[2rem] outline-none border-2 border-primary/5 italic resize-none shadow-inner" rows={3} />
                                ) : (
                                    <p className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight leading-tight italic">"{intention}"</p>
                                )}
                            </div>
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                        </section>

                        {/* Impact & Momentum Grids */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <Link to="/impact" className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm hover:shadow-2xl hover:border-primary/20 transition-all duration-500 group relative overflow-hidden">
                                <div className="relative z-10">
                                    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-400 mb-6 group-hover:text-primary transition-colors">Global Influence</p>
                                    <h3 className="text-4xl font-black text-gray-900 mb-2">{participant.impactStats?.peopleHelped || 0} Assisted</h3>
                                    <p className="text-[10px] font-black text-primary uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Impact Analysis &rarr;</p>
                                </div>
                                <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-primary/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-1000"></div>
                            </Link>
                            <Link to="/growth" className="bg-[#111827] rounded-[2.5rem] p-8 text-white shadow-xl hover:shadow-primary/10 transition-all duration-500 group relative overflow-hidden">
                                <div className="relative z-10">
                                    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40 mb-6 group-hover:text-primary transition-colors">Active Momentum</p>
                                    <h3 className="text-4xl font-black mb-2 italic tracking-tighter">{enrollments.length} cycles</h3>
                                    <p className="text-[10px] font-black text-primary uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Full Portfolio &rarr;</p>
                                </div>
                                <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-primary/20 rounded-full blur-3xl pointer-events-none"></div>
                            </Link>
                        </div>
                    </div>

                    {/* Sidebar / Wallet */}
                    <div className="md:col-span-4 space-y-8">
                        <section className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm sticky top-24">
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-8 text-center">Currency Registry</h3>
                            <div className="flex flex-col items-center gap-2 mb-8">
                                <div className="w-20 h-20 bg-gray-50 rounded-[2rem] flex items-center justify-center text-4xl shadow-inner mb-2 border border-gray-100/50 transition-transform hover:rotate-12">🪙</div>
                                <p className="text-5xl font-black text-gray-900 tracking-tighter">{participant.walletBalance || 0}</p>
                                <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] opacity-60">Growth Credits</p>
                            </div>
                            <Link to="/impact/rewards">
                                <button className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.25em] shadow-xl hover:bg-gray-800 transition-all active:scale-95">
                                    Audit Ledger
                                </button>
                            </Link>
                            <p className="mt-6 text-[9px] font-bold text-gray-300 text-center uppercase tracking-widest leading-relaxed">Credits are earned via consistency and impact.</p>
                        </section>
                    </div>
                </div>
            </div>
        </div>
        <style>{`
            .custom-scrollbar::-webkit-scrollbar { width: 4px; }
            .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
            .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }
            @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            .animate-fade-in { animation: fadeIn 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
            .animate-slide-up { animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        `}</style>
    </div>
  );
};

export default Profile;
