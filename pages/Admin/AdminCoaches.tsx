import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Coach } from '../../types';
import { userService } from '../../services/userService';

const AdminCoaches: React.FC = () => {
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCoaches = async () => {
      setIsLoading(true);
      try {
        const fetchedCoaches = await userService.getAllCoaches();
        setCoaches(fetchedCoaches);
      } catch (err) {
        console.error("Failed to fetch coaches:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCoaches();
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
      <h3 className="text-2xl font-black text-gray-900 italic">Coach Applications</h3>
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-8 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">Coach</th>
              <th className="px-8 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {coaches.map(coach => (
              <tr key={coach.id} className="hover:bg-gray-50/50 cursor-pointer" onClick={() => navigate(`/admin/coach/${coach.id}`)}>
                <td className="px-8 py-5">
                  <p className="font-bold text-gray-900 text-sm">{coach.name}</p>
                  <p className="text-[10px] text-gray-400 uppercase">{coach.email}</p>
                </td>
                <td className="px-8 py-5 text-center">
                  <span className={`px-2 py-1 rounded text-[8px] font-black uppercase ${coach.approved ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                    {coach.approved ? 'Approved' : 'Pending'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminCoaches;
