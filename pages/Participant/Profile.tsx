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
    <div className="bg-light min-h-screen text-base lg:text-lg animate-fade-in pb-32">
        <div className="h-48 md:h-64 lg:h-80 bg-gradient-to-br from-primary to-primary-hover relative overflow-hidden">
            <div className="absolute inset-0 bg-black/10" />
            <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-light to-transparent" />
        </div>

        <div className="max-w-screen-xl mx-auto px-4 sm:px-8 lg:px-12 -mt-24 relative z-10">
            <div className="flex flex-col md:flex-row items-center md:items-end gap-6 md:gap-8 mb-12">
                <div className="w-40 h-40 md:w-48 md:h-48 rounded-[3rem] border-[6px] border-light bg-white shadow-xl overflow-hidden shadow-primary/5">
                    <img src={user.profileImageUrl} alt={user.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 text-center md:text-left pb-4">
                    {isEditing ? (
                        <input value={name} onChange={e => setName(e.target.value)} className="text-4xl font-black text-dark bg-transparent border-b-4 border-primary outline-none mb-2 text-center md:text-left w-full" />
                    ) : (
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-dark tracking-tighter leading-none mb-3 italic">{user.name}.</h1>
                    )}
                    <p className="text-gray-400 font-bold uppercase tracking-[0.4em] text-xs">Legacy Record</p>
                </div>
                <div className="flex gap-3 pb-4">
                    <Button onClick={handleEditToggle} variant={isEditing ? 'primary' : 'secondary'} className="rounded-2xl px-8 shadow-lg text-xs md:text-sm">{isEditing ? 'Save Profile' : 'Edit Identity'}</Button>
                    <button onClick={() => { logout(); navigate('/login'); }} className="p-4 bg-white text-red-500 rounded-2xl shadow-sm border border-gray-100 hover:bg-red-50 transition-all active:scale-95">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12">
                <div className="md:col-span-8 space-y-8">
                    <section className="bg-white rounded-[2.5rem] md:rounded-[3.5rem] p-10 md:p-14 border border-gray-50 shadow-sm">
                        <h2 className="text-xs font-black text-primary uppercase tracking-[0.3em] mb-8">Active Intention</h2>
                        {isEditing ? (
                            <textarea value={intention} onChange={e => setIntention(e.target.value)} className="w-full text-2xl font-black text-dark bg-gray-50 p-8 rounded-3xl outline-none border-2 border-primary/10 italic resize-none" rows={3} />
                        ) : (
                            <p className="text-2xl md:text-3xl lg:text-4xl font-black text-dark tracking-tight leading-tight italic">"{intention}"</p>
                        )}
                    </section>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <Link to="/impact" className="bg-teal-500 rounded-[2.5rem] p-10 text-white shadow-xl hover:scale-[1.02] transition-all group">
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">Social Magnitude</p>
                            <h3 className="text-3xl font-black mb-4">{participant.impactStats?.peopleHelped || 0} Assisted</h3>
                            <p className="text-sm font-bold opacity-80 group-hover:underline">Global Impact Dashboard &rarr;</p>
                        </Link>
                        <Link to="/growth" className="bg-dark rounded-[2.5rem] p-10 text-white shadow-xl hover:scale-[1.02] transition-all group">
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">Growth Index</p>
                            <h3 className="text-3xl font-black mb-4">{enrollments.length} Programs</h3>
                            <p className="text-sm font-bold opacity-80 group-hover:underline">Detailed Analytics &rarr;</p>
                        </Link>
                    </div>
                </div>

                <div className="md:col-span-4 space-y-8">
                    <section className="bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-sm">
                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-8">Wallet</h3>
                        <div className="flex items-center gap-6 mb-8">
                            <div className="text-4xl">🪙</div>
                            <div>
                                <p className="text-4xl font-black text-dark">{participant.walletBalance || 0}</p>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-tight">Growth Credits</p>
                            </div>
                        </div>
                        <Link to="/impact/rewards">
                            <Button variant="secondary" className="w-full rounded-2xl text-xs font-black uppercase tracking-widest py-4">Transaction Ledger</Button>
                        </Link>
                    </section>
                </div>
            </div>
        </div>
        <style>{`
            @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            .animate-fade-in { animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        `}</style>
    </div>
  );
};

export default Profile;