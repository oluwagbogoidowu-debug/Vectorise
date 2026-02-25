import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Sprint, Coach } from '../../types';
import { sprintService } from '../../services/sprintService';
import ArchetypeAvatar from '../../components/ArchetypeAvatar';

const CoachProfile: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      setIsLoading(true);
      try {
        const coachSprints = await sprintService.getCoachSprints(user.id);
        setSprints(coachSprints);
      } catch (err) {
        console.error("Profile sync failed:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [user]);

  if (!user) return null;
  const p = user as Coach;

  const SectionLabel = ({ text }: { text: string }) => (
    <h2 className="text-[8px] font-black text-gray-400 uppercase tracking-[0.3em] mb-4 px-1">
      {text}
    </h2>
  );

  return (
    <div className="bg-[#FDFDFD] h-screen w-full font-sans overflow-hidden flex flex-col animate-fade-in">
      <header className="bg-white px-6 pt-8 pb-6 border-b border-gray-50 flex-shrink-0">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-400 hover:text-gray-900 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h1 className="text-lg font-black text-gray-900 uppercase tracking-widest">Coach Profile</h1>
          <Link to="/coach/profile/settings" className="p-2 -mr-2 text-gray-400 hover:text-gray-900 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </Link>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-10">
        {/* Hero Section */}
        <section className="text-center">
          <ArchetypeAvatar profileImageUrl={p.profileImageUrl} size="xl" />
          <h1 className="text-3xl font-black text-gray-900 tracking-tight mt-4">{p.name}</h1>
          <p className="text-sm font-bold text-gray-500 mt-1">{p.niche}</p>
          <div className="mt-4 flex justify-center gap-2">
            <button className="px-8 py-3 bg-primary text-white rounded-full text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/20">View Sprints</button>
            <button className="px-6 py-3 bg-white border border-gray-200 text-gray-800 rounded-full text-xs font-black uppercase tracking-widest">Follow</button>
          </div>
        </section>

        {/* Proof Bar */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-2xl font-black text-gray-900">0</p>
            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Participants</p>
          </div>
          <div>
            <p className="text-2xl font-black text-gray-900">0%</p>
            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Completion</p>
          </div>
          <div>
            <p className="text-2xl font-black text-gray-900">{sprints.length}</p>
            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Active Sprints</p>
          </div>
          <div>
            <p className="text-2xl font-black text-gray-900">0</p>
            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Rise Earned</p>
          </div>
        </section>

        {/* Active Sprints */}
        <section>
          <SectionLabel text="Active Sprints" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {sprints.map(sprint => (
              <div key={sprint.id} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                <h3 className="font-black text-gray-900 text-lg">{sprint.title}</h3>
                <p className="text-xs text-gray-500 mt-1">{sprint.subtitle}</p>
                <div className="mt-4 flex items-center justify-between text-xs font-bold">
                  <span>{sprint.duration} Days</span>
                  <Link to={`/sprint/${sprint.id}`} className="px-6 py-2 bg-primary/5 text-primary rounded-full text-[10px] uppercase tracking-widest">View Sprint</Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Coach Philosophy */}
        <section>
          <SectionLabel text="My Philosophy" />
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
            <p className="text-sm text-gray-700">{p.bio}</p>
          </div>
        </section>

        {/* Results and Impact */}
        <section>
          <SectionLabel text="Results & Impact" />
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm text-center">
            <p className="text-sm font-bold text-gray-400">More impact stats coming soon.</p>
          </div>
        </section>

      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.03); border-radius: 10px; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
};

export default CoachProfile;
