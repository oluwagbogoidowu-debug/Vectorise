import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/Button';
import { useNavigate, Link } from 'react-router-dom';
import { Participant, ParticipantSprint } from '../../types';
import { sprintService } from '../../services/sprintService';

const Profile: React.FC = () => {
  const { user, logout, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [intention, setIntention] = useState('');
  const [enrollments, setEnrollments] = useState<ParticipantSprint[]>([]);

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

  const handleEditToggle = async () => {
      if (isEditing) {
          setIsEditing(false);
          try { await updateProfile({ name, intention }); } catch (error) { alert("Update failed."); }
      } else {
          setIsEditing(true);
      }
  };

  return (
    <div className="bg-light h-screen w-full text-sm animate-fade-in overflow-hidden flex flex-col">
        {/* Banner Area */}
        <div className="h-28 md:h-40 bg-gradient-to-br from-primary to-primary-hover relative flex-shrink-0">
            <div className="absolute inset-0 bg-black/5" />
            <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-light to-transparent" />
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-4 pb-32 pt-2 custom-scrollbar">
            <div className="max-w-screen-lg mx-auto">
                <div className="flex flex-col md:flex-row items-center md:items-end gap-5 -mt-16 mb-8 relative z-10">
                    <div className="w-24 h-24 md:w-32 md:h-32 rounded-[2rem] border-4 border-white bg-white shadow-lg overflow-hidden flex-shrink-0">
                        <img src={user.profileImageUrl} alt={user.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 text-center md:text-left pb-1">
                        {isEditing ? (
                            <input value={name} onChange={e => setName(e.target.value)} className="text-xl font-black text-dark bg-transparent border-b-2 border-primary outline-none mb-1 text-center md:text-left w-full" />
                        ) : (
                            <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight leading-none mb-1 italic">{user.name}.</h1>
                        )}
                        <p className="text-gray-400 font-bold uppercase tracking-[0.3em] text-[8px]">Growth Registry Profile</p>
                    </div>
                    <div className="flex gap-2 pb-1">
                        <Button onClick={handleEditToggle} variant={isEditing ? 'primary' : 'secondary'} className="rounded-xl px-5 py-2 text-[9px] font-black uppercase tracking-widest shadow-md">{isEditing ? 'Save' : 'Edit'}</Button>
                        <button onClick={() => { logout(); navigate('/login'); }} className="p-2.5 bg-white text-red-500 rounded-xl shadow-sm border border-gray-100 hover:bg-red-50 transition-all active:scale-95">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                    <div className="md:col-span-8 space-y-5">
                        <section className="bg-white rounded-2xl p-6 border border-gray-50 shadow-sm">
                            <h2 className="text-[9px] font-black text-primary uppercase tracking-[0.2em] mb-4">Active Intention</h2>
                            {isEditing ? (
                                <textarea value={intention} onChange={e => setIntention(e.target.value)} className="w-full text-base font-bold text-dark bg-gray-50 p-4 rounded-xl outline-none border-2 border-primary/5 italic resize-none" rows={2} />
                            ) : (
                                <p className="text-lg font-black text-dark tracking-tight leading-tight italic">"{intention}"</p>
                            )}
                        </section>

                        <div className="grid grid-cols-2 gap-4">
                            <Link to="/impact" className="bg-teal-500 rounded-2xl p-6 text-white shadow-md hover:scale-[1.02] transition-all group overflow-hidden relative">
                                <p className="text-[8px] font-black uppercase tracking-widest opacity-60 mb-1">Influence</p>
                                <h3 className="text-xl font-black mb-1">{participant.impactStats?.peopleHelped || 0} Assisted</h3>
                                <p className="text-[9px] font-bold opacity-80 group-hover:underline">Impact Scale &rarr;</p>
                                <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-white/10 rounded-full blur-xl"></div>
                            </Link>
                            <Link to="/growth" className="bg-dark rounded-2xl p-6 text-white shadow-md hover:scale-[1.02] transition-all group overflow-hidden relative">
                                <p className="text-[8px] font-black uppercase tracking-widest opacity-60 mb-1">Momentum</p>
                                <h3 className="text-xl font-black mb-1">{enrollments.length} cycles</h3>
                                <p className="text-[9px] font-bold opacity-80 group-hover:underline">Analytics &rarr;</p>
                                <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-primary/10 rounded-full blur-xl"></div>
                            </Link>
                        </div>
                    </div>

                    <div className="md:col-span-4 space-y-5">
                        <section className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                            <h3 className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-4">Registry Wallet</h3>
                            <div className="flex items-center gap-4 mb-5">
                                <div className="text-2xl">🪙</div>
                                <div>
                                    <p className="text-2xl font-black text-dark">{participant.walletBalance || 0}</p>
                                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-tight">Growth Credits</p>
                                </div>
                            </div>
                            <Link to="/impact/rewards">
                                <Button variant="secondary" className="w-full rounded-xl text-[9px] font-black uppercase tracking-widest py-3">View Ledger</Button>
                            </Link>
                        </section>
                    </div>
                </div>
            </div>
        </div>
        <style>{`
            .custom-scrollbar::-webkit-scrollbar { width: 3px; }
            .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }
            @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
            .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
        `}</style>
    </div>
  );
};

export default Profile;