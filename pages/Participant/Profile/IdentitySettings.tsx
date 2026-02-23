
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { GROWTH_AREAS, RISE_PATHWAYS } from '../../../constants';
import { Participant } from '../../../types';

const IdentitySettings: React.FC = () => {
  const navigate = useNavigate();
  const { user, updateProfile } = useAuth();
  
  const p = user as Participant;
  const [growthAreas, setGrowthAreas] = useState<string[]>(p?.growthAreas || []);
  const [risePathway, setRisePathway] = useState<string>(p?.risePathway || '');
  const [isSaving, setIsSaving] = useState(false);

  if (!user) return null;

  const handleToggleGrowthArea = (area: string) => {
    setGrowthAreas(prev => {
      if (prev.includes(area)) return prev.filter(a => a !== area);
      if (prev.length >= 5) return prev;
      return [...prev, area];
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateProfile({ 
        growthAreas,
        risePathway
      });
      navigate(-1);
    } catch (err) {
      alert("Failed to save identity settings");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-[#FDFDFD] h-screen w-full font-sans overflow-hidden flex flex-col animate-fade-in">
      <header className="bg-white px-6 pt-12 pb-6 border-b border-gray-50 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-400 hover:text-gray-900 transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h1 className="text-lg font-black text-gray-900 uppercase tracking-widest">Identity</h1>
        <div className="w-10"></div>
      </header>

      <main className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
        <div className="space-y-6">
          <div>
            <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-5 h-5 rounded-lg bg-primary/10 flex items-center justify-center text-[10px]">1</span>
              Growth Areas (Max 5)
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {GROWTH_AREAS.flatMap(g => g.options).map(area => (
                <button
                  key={area}
                  onClick={() => handleToggleGrowthArea(area)}
                  className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${growthAreas.includes(area) ? 'bg-primary text-white shadow-md' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
                >
                  {area}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-5 h-5 rounded-lg bg-primary/10 flex items-center justify-center text-[10px]">2</span>
              Rise Pathway
            </h3>
            <div className="space-y-2">
              {RISE_PATHWAYS.map(path => (
                <button
                  key={path.id}
                  onClick={() => setRisePathway(path.id)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all ${risePathway === path.id ? 'bg-primary/5 border-primary/20 shadow-sm' : 'bg-gray-50 border-gray-100 hover:border-gray-200'}`}
                >
                  <h4 className="text-[10px] font-black text-gray-900">{path.name}</h4>
                  <p className="text-[8px] text-gray-400 font-medium mt-0.5">{path.description}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-4 pb-10">
          <button 
            onClick={handleSave}
            disabled={isSaving || growthAreas.length === 0 || !risePathway}
            className="w-full py-5 bg-gray-900 text-white font-black uppercase tracking-[0.2em] text-[10px] rounded-3xl shadow-xl active:scale-95 transition-all disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Identity'}
          </button>
        </div>
      </main>
    </div>
  );
};

export default IdentitySettings;
