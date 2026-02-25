import React, { useState, useEffect } from 'react';
import { PartnerApplication } from '../../types';
import { partnerService } from '../../services/partnerService';

const AdminPartners: React.FC = () => {
  const [partnerApps, setPartnerApps] = useState<PartnerApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPartners = async () => {
      setIsLoading(true);
      try {
        const fetched = await partnerService.getApplications();
        setPartnerApps(fetched);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPartners();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-8">
      <h3 className="text-2xl font-black text-gray-900 italic">Partner Applications</h3>
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-left">
          <thead><tr className="bg-gray-50 border-b border-gray-100"><th className="px-8 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">Partner</th><th className="px-8 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th></tr></thead>
          <tbody>{partnerApps.map(app => (
              <tr key={app.id} className="hover:bg-gray-50/50"><td className="px-8 py-5"><p className="font-bold text-gray-900 text-sm">{app.fullName}</p><p className="text-[10px] text-gray-400 uppercase">{app.email}</p></td><td className="px-8 py-5 text-center"><span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-[8px] font-black uppercase">{app.status}</span></td></tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminPartners;
