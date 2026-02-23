
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { ARCHETYPES } from '../../../constants';
import { Participant } from '../../../types';
import ArchetypeAvatar from '../../../components/ArchetypeAvatar';

const EditProfile: React.FC = () => {
  const navigate = useNavigate();
  const { user, updateProfile } = useAuth();
  
  const [name, setName] = useState(user?.name || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isSelectingAvatar, setIsSelectingAvatar] = useState(false);

  if (!user) return null;
  const p = user as Participant;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateProfile({ name });
      navigate(-1);
    } catch (err) {
      alert("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectArchetype = async (archetypeId: string) => {
    try {
      await updateProfile({ archetype: archetypeId });
      setIsSelectingAvatar(false);
    } catch (e) {
      alert("Failed to update archetype.");
    }
  };

  return (
    <div className="bg-[#FDFDFD] h-screen w-full font-sans overflow-hidden flex flex-col animate-fade-in">
      <header className="bg-white px-6 pt-12 pb-6 border-b border-gray-50 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-400 hover:text-gray-900 transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h1 className="text-lg font-black text-gray-900 uppercase tracking-widest">Edit Profile</h1>
        <div className="w-10"></div>
      </header>

      <main className="flex-1 overflow-y-auto p-8 space-y-10">
        <div className="flex flex-col items-center gap-4">
          <button 
            onClick={() => setIsSelectingAvatar(true)}
            className="relative group"
          >
            <ArchetypeAvatar 
              archetypeId={p.archetype} 
              profileImageUrl={p.profileImageUrl} 
              size="xl" 
            />
            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-[8px] font-black text-white uppercase tracking-widest">Change</span>
            </div>
          </button>
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Tap to change archetype</p>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest px-1">Full Name</label>
            <input 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white border border-gray-100 rounded-2xl px-5 py-4 text-xs font-bold text-gray-900 outline-none focus:border-primary transition-colors shadow-sm"
              placeholder="Your name"
            />
          </div>

          <div className="space-y-2 opacity-50">
            <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest px-1">Email Address</label>
            <input 
              disabled
              value={p.email}
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-xs font-bold text-gray-400 outline-none cursor-not-allowed"
            />
          </div>
        </div>

        <div className="pt-4">
          <button 
            onClick={handleSave}
            disabled={isSaving || !name.trim()}
            className="w-full py-5 bg-primary text-white font-black uppercase tracking-[0.2em] text-[10px] rounded-3xl shadow-xl shadow-primary/20 active:scale-95 transition-all disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </main>

      {/* Avatar Selection Modal */}
      {isSelectingAvatar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsSelectingAvatar(false)}></div>
          <div className="relative w-full max-w-sm bg-white rounded-[3rem] shadow-2xl overflow-hidden animate-slide-up">
            <div className="p-8">
              <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-2">Choose Archetype</h2>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-8">Select the energy you want to embody.</p>
              
              <div className="grid grid-cols-1 gap-3">
                {ARCHETYPES.map((arch) => (
                  <button 
                    key={arch.id}
                    onClick={() => handleSelectArchetype(arch.id)}
                    className={`flex items-center gap-4 p-4 rounded-3xl border transition-all active:scale-95 ${p.archetype === arch.id ? 'bg-primary/5 border-primary/20' : 'bg-gray-50 border-gray-100 hover:border-gray-200'}`}
                  >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl bg-gradient-to-br ${arch.color} shadow-lg`}>
                      {arch.icon}
                    </div>
                    <div className="text-left">
                      <h4 className="text-xs font-black text-gray-900">{arch.name}</h4>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{arch.energy}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <button 
              onClick={() => setIsSelectingAvatar(false)}
              className="w-full py-5 bg-gray-900 text-white font-black uppercase tracking-[0.3em] text-[10px]"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditProfile;
