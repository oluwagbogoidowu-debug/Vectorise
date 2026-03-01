import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Sprint } from '../../types';
import { sprintService } from '../../services/sprintService';
import Button from '../../components/Button';

type SprintFilter = 'all' | 'active' | 'core' | 'pending' | 'rejected';

const AdminSprints: React.FC = () => {
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sprintFilter, setSprintFilter] = useState<SprintFilter>('all');

  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = sprintService.subscribeToAdminSprints((data) => {
      setSprints(data);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filteredSprints = useMemo(() => {
    switch (sprintFilter) {
      case 'active': return sprints.filter(s => s.approvalStatus === 'approved');
      case 'core': return sprints.filter(s => s.category === 'Core Platform Sprint' || s.category === 'Growth Fundamentals');
      case 'pending': return sprints.filter(s => s.approvalStatus === 'pending_approval');
      case 'rejected': return sprints.filter(s => s.approvalStatus === 'rejected');
      default: return sprints;
    }
  }, [sprints, sprintFilter]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h3 className="text-2xl font-black text-gray-900 tracking-tight italic">Registry Catalog</h3>
        </div>
        <Link to="/admin/sprint/new"><Button className="px-8 py-3.5 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20">+ Launch Platform Sprint</Button></Link>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar border-b border-gray-50">
        {['all', 'active', 'core', 'pending', 'rejected'].map(f => (
          <button key={f} onClick={() => setSprintFilter(f as SprintFilter)} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all whitespace-nowrap border ${sprintFilter === f ? 'bg-primary text-white border-primary shadow-md' : 'bg-white text-gray-400 border-gray-100 hover:border-primary/20 hover:text-primary'}`}>{f.replace('_', ' ')}</button>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4">
        {filteredSprints.map(s => (
          <div key={s.id} className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center gap-6 hover:shadow-md transition-all">
            <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 bg-gray-50"><img src={s.coverImageUrl} className="w-full h-full object-cover" alt="" /></div>
            <div className="flex-1 min-w-0 text-center sm:text-left">
              <h3 className="font-black text-gray-900 text-lg truncate tracking-tight">{s.title}</h3>
              <div className="flex flex-wrap justify-center sm:justify-start items-center gap-3 text-[9px] font-black text-gray-400 mt-2 uppercase tracking-widest">
                <span className="px-2 py-1 bg-gray-50 rounded-lg">{s.duration} Days</span>
                <span className="px-2 py-1 bg-gray-50 rounded-lg">{s.category}</span>
                <span className={`px-2 py-1 rounded-lg ${s.approvalStatus === 'approved' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-500'}`}>{s.approvalStatus.replace('_', ' ')}</span>
              </div>
            </div>
            <Link to={`/coach/sprint/edit/${s.id}`}><button className="px-8 py-3 bg-white border border-gray-100 text-gray-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:text-primary transition-all">Edit</button></Link>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminSprints;
