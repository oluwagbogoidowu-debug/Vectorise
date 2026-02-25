import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Coach } from '../../types';
import { userService } from '../../services/userService';

const AdminCoachDetail: React.FC = () => {
  const { coachId } = useParams<{ coachId: string }>();
  const [coach, setCoach] = useState<Coach | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCoach = async () => {
      if (!coachId) return;
      setIsLoading(true);
      try {
        const fetchedCoach = await userService.getUserDocument(coachId);
        setCoach(fetchedCoach as Coach);
      } catch (err) {
        console.error("Failed to fetch coach:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCoach();
  }, [coachId]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!coach) {
    return <div>Coach not found</div>;
  }

  return (
    <div className="animate-fade-in space-y-8 p-10">
      <button onClick={() => navigate(-1)} className="p-3.5 bg-white text-gray-400 hover:text-primary rounded-2xl shadow-sm border border-gray-100 transition-all active:scale-90 cursor-pointer">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
      </button>
      <h3 className="text-2xl font-black text-gray-900 italic">{coach.name}'s Application</h3>
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h4 className="text-lg font-bold mb-4">Personal Information</h4>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Name</p>
                <p className="font-semibold">{coach.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-semibold">{coach.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Bio</p>
                <p className="font-semibold">{coach.bio}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Niche</p>
                <p className="font-semibold">{coach.niche}</p>
              </div>
            </div>
          </div>
          <div>
            <h4 className="text-lg font-bold mb-4">Application Details</h4>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Application Status</p>
                <p className={`font-semibold ${coach.approved ? 'text-green-600' : 'text-orange-600'}`}>{coach.approved ? 'Approved' : 'Pending'}</p>
              </div>
              {coach.applicationDetails && Object.entries(coach.applicationDetails).map(([key, value]) => (
                <div key={key}>
                  <p className="text-sm text-gray-500 capitalize">{key.replace(/([A-Z])/g, ' $1')}</p>
                  <p className="font-semibold">{String(value)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        {!coach.approved && (
          <button 
            onClick={async () => {
              if (!coachId) return;
              await userService.approveCoach(coachId);
              setCoach(prev => prev ? { ...prev, approved: true } : null);
            }}
            className="mt-4 px-4 py-2 bg-primary text-white rounded-lg"
          >
            Approve
          </button>
        )}
      </div>
    </div>
  );
};

export default AdminCoachDetail;
