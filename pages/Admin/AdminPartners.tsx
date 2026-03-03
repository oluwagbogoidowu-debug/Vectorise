import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PartnerApplication, Participant, Sprint } from '../../types';
import { partnerService } from '../../services/partnerService';
import { sprintService } from '../../services/sprintService';
import { Settings, Users, FileText, CheckCircle, XCircle, BarChart3, ChevronRight, ExternalLink } from 'lucide-react';
import Button from '../../components/Button';

const AdminPartners: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'partners' | 'applications'>('partners');
  const [partnerApps, setPartnerApps] = useState<PartnerApplication[]>([]);
  const [partners, setPartners] = useState<Participant[]>([]);
  const [allSprints, setAllSprints] = useState<Sprint[]>([]);
  const [partnerMetrics, setPartnerMetrics] = useState<Record<string, { clicks: number; signups: number; paidSprints: number }>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPartner, setSelectedPartner] = useState<Participant | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [apps, pts, sprints] = await Promise.all([
          partnerService.getApplications(),
          partnerService.getPartners(),
          sprintService.getAdminSprints()
        ]);
        setPartnerApps(apps);
        setPartners(pts);
        setAllSprints(sprints);

        // Fetch metrics for all partners
        const metrics: Record<string, any> = {};
        await Promise.all(pts.map(async (p: Participant) => {
          const m = await partnerService.getPartnerMetrics(p.referralCode || '', p.id);
          metrics[p.id] = m;
        }));
        setPartnerMetrics(metrics);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleApprove = async (app: PartnerApplication) => {
    if (!window.confirm(`Approve ${app.fullName} as a partner?`)) return;
    try {
      await partnerService.updateApplicationStatus(app.id, 'approved');
      // In a real app, you'd also update the user's role to PARTNER here
      // For now, we just refresh the list
      const updatedApps = await partnerService.getApplications();
      setPartnerApps(updatedApps);
    } catch (err) {
      alert("Failed to approve application");
    }
  };

  const handleReject = async (app: PartnerApplication) => {
    if (!window.confirm(`Reject ${app.fullName}'s application?`)) return;
    try {
      await partnerService.updateApplicationStatus(app.id, 'rejected');
      const updatedApps = await partnerService.getApplications();
      setPartnerApps(updatedApps);
    } catch (err) {
      alert("Failed to reject application");
    }
  };

  const handleUpdateSprints = async (partnerId: string, sprintIds: string[]) => {
    try {
      await partnerService.updatePartnerSprints(partnerId, sprintIds);
      // Update local state
      setPartners(prev => prev.map(p => 
        p.id === partnerId 
          ? { ...p, partnerData: { ...p.partnerData, selectedSprintIds: sprintIds } } 
          : p
      ));
      setIsSettingsOpen(false);
      setSelectedPartner(null);
    } catch (err) {
      alert("Failed to update sprints");
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-8 pb-20">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h3 className="text-3xl font-black text-gray-900 tracking-tight">Partner Ecosystem</h3>
          <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mt-1">Growth & Distribution Control</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-gray-100 p-1 rounded-2xl">
            <button 
              onClick={() => setActiveTab('partners')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'partners' ? 'bg-white text-primary shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <Users className="w-3.5 h-3.5" />
              Partners
            </button>
            <button 
              onClick={() => setActiveTab('applications')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'applications' ? 'bg-white text-primary shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <FileText className="w-3.5 h-3.5" />
              Applications
              {partnerApps.filter(a => a.status === 'pending').length > 0 && (
                <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
              )}
            </button>
          </div>

          <button 
            onClick={() => navigate('/admin/sprints')}
            className="flex items-center gap-2 px-6 py-3.5 bg-dark text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-800 transition-all shadow-lg shadow-dark/10"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Overall Sprints
          </button>
        </div>
      </div>

      {activeTab === 'partners' ? (
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-8 py-6 text-[9px] font-black text-gray-400 uppercase tracking-widest">Partner Identity</th>
                  <th className="px-8 py-6 text-[9px] font-black text-gray-400 uppercase tracking-widest">Tracking Code</th>
                  <th className="px-8 py-6 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Clicks</th>
                  <th className="px-8 py-6 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Signups</th>
                  <th className="px-8 py-6 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Paid Sprints</th>
                  <th className="px-8 py-6 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {partners.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-8 py-12 text-center text-gray-400 font-bold uppercase tracking-widest text-xs">No active partners found</td>
                  </tr>
                ) : (
                  partners.map(partner => (
                    <tr key={partner.id} className="hover:bg-gray-50/30 transition-colors group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <img src={partner.profileImageUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${partner.email}`} className="w-10 h-10 rounded-2xl object-cover bg-gray-100 border border-gray-100" alt="" />
                          <div>
                            <p className="font-black text-gray-900 text-sm">{partner.name}</p>
                            <p className="text-[10px] text-gray-400 font-bold">{partner.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-xl text-[10px] font-black tracking-widest uppercase border border-gray-200">
                          {partner.referralCode || 'N/A'}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <p className="text-sm font-black text-gray-900">{partnerMetrics[partner.id]?.clicks || 0}</p>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <p className="text-sm font-black text-gray-900">{partnerMetrics[partner.id]?.signups || 0}</p>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <p className="text-sm font-black text-primary">{partnerMetrics[partner.id]?.paidSprints || 0}</p>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => {
                              setSelectedPartner(partner);
                              setIsSettingsOpen(true);
                            }}
                            className="p-2.5 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                            title="Sprint Settings"
                          >
                            <Settings className="w-4 h-4" />
                          </button>
                          <button className="p-2.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all">
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-8 py-6 text-[9px] font-black text-gray-400 uppercase tracking-widest">Applicant</th>
                  <th className="px-8 py-6 text-[9px] font-black text-gray-400 uppercase tracking-widest">Platform</th>
                  <th className="px-8 py-6 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                  <th className="px-8 py-6 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {partnerApps.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-8 py-12 text-center text-gray-400 font-bold uppercase tracking-widest text-xs">No applications found</td>
                  </tr>
                ) : (
                  partnerApps.map(app => (
                    <tr key={app.id} className="hover:bg-gray-50/30 transition-colors">
                      <td className="px-8 py-6">
                        <p className="font-black text-gray-900 text-sm">{app.fullName}</p>
                        <p className="text-[10px] text-gray-400 font-bold">{app.email}</p>
                      </td>
                      <td className="px-8 py-6">
                        <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">{app.primaryPlatform}</p>
                        <a href={app.platformLink} target="_blank" rel="noreferrer" className="text-[9px] text-primary hover:underline font-bold">View Profile &rarr;</a>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                          app.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                          app.status === 'rejected' ? 'bg-red-100 text-red-700' :
                          'bg-orange-100 text-orange-700'
                        }`}>
                          {app.status}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        {app.status === 'pending' && (
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => handleApprove(app)}
                              className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all"
                            >
                              <CheckCircle className="w-5 h-5" />
                            </button>
                            <button 
                              onClick={() => handleReject(app)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            >
                              <XCircle className="w-5 h-5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sprint Selection Modal */}
      {isSettingsOpen && selectedPartner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[3rem] shadow-2xl border border-gray-100 w-full max-w-2xl overflow-hidden animate-slide-up">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h4 className="text-xl font-black text-gray-900">Sprint Distribution</h4>
                <p className="text-[10px] font-black text-primary uppercase tracking-widest mt-1">Selecting for {selectedPartner.name}</p>
              </div>
              <button onClick={() => setIsSettingsOpen(false)} className="p-2 text-gray-400 hover:text-gray-900 transition-all">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-8 max-h-[60vh] overflow-y-auto no-scrollbar">
              <div className="grid grid-cols-1 gap-3">
                {allSprints.map(sprint => {
                  const isSelected = selectedPartner.partnerData?.selectedSprintIds?.includes(sprint.id);
                  return (
                    <button 
                      key={sprint.id}
                      onClick={() => {
                        const current = selectedPartner.partnerData?.selectedSprintIds || [];
                        const next = isSelected 
                          ? current.filter((id: string) => id !== sprint.id)
                          : [...current, sprint.id];
                        setSelectedPartner({
                          ...selectedPartner,
                          partnerData: { ...selectedPartner.partnerData, selectedSprintIds: next }
                        });
                      }}
                      className={`flex items-center justify-between p-4 rounded-2xl border transition-all text-left ${
                        isSelected 
                          ? 'bg-primary/5 border-primary shadow-sm' 
                          : 'bg-white border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${
                          isSelected ? 'bg-primary text-white' : 'bg-gray-100 text-gray-400'
                        }`}>
                          {sprint.duration}d
                        </div>
                        <div>
                          <p className="font-black text-gray-900 text-sm">{sprint.title}</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{sprint.category}</p>
                        </div>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                        isSelected ? 'bg-primary border-primary' : 'border-gray-200'
                      }`}>
                        {isSelected && <CheckCircle className="w-4 h-4 text-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-8 bg-gray-50 border-t border-gray-100 flex justify-end gap-4">
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-gray-600"
              >
                Cancel
              </button>
              <Button 
                onClick={() => handleUpdateSprints(selectedPartner.id, selectedPartner.partnerData?.selectedSprintIds || [])}
                className="px-10 py-3 rounded-2xl shadow-xl shadow-primary/10"
              >
                Save Configuration
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPartners;
