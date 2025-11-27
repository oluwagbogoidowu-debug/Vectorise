
import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { MOCK_PAYOUTS } from '../../services/mockData';

const CoachEarnings: React.FC = () => {
  const { user } = useAuth();
  
  if (!user) return null;

  const myPayouts = MOCK_PAYOUTS.filter(p => p.coachId === user.id);
  const totalEarnings = myPayouts.reduce((acc, curr) => acc + curr.amount, 0);
  const pendingPayouts = myPayouts.filter(p => p.status === 'pending').reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Earnings & Payouts</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <p className="text-gray-500 font-medium mb-1">Total Earnings</p>
              <h2 className="text-3xl font-bold text-gray-900">₦{totalEarnings.toLocaleString()}</h2>
          </div>
           <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <p className="text-gray-500 font-medium mb-1">Pending Payout</p>
              <h2 className="text-3xl font-bold text-yellow-600">₦{pendingPayouts.toLocaleString()}</h2>
          </div>
           <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <p className="text-gray-500 font-medium mb-1">Next Payout Date</p>
              <h2 className="text-3xl font-bold text-gray-900">Oct 15</h2>
          </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h3 className="font-bold text-gray-900">Transaction History</h3>
          </div>
          {myPayouts.length > 0 ? (
              <div className="divide-y divide-gray-100">
                  {myPayouts.map(payout => (
                      <div key={payout.id} className="px-6 py-4 flex justify-between items-center">
                          <div>
                              <p className="font-bold text-gray-900">Payout to Bank Account</p>
                              <p className="text-sm text-gray-500">{new Date(payout.date).toLocaleDateString()}</p>
                          </div>
                          <div className="text-right">
                              <p className="font-bold text-gray-900">+₦{payout.amount.toLocaleString()}</p>
                              <span className={`text-xs font-bold uppercase ${payout.status === 'completed' ? 'text-green-600' : 'text-yellow-600'}`}>
                                  {payout.status}
                              </span>
                          </div>
                      </div>
                  ))}
              </div>
          ) : (
              <div className="p-10 text-center text-gray-500">No transactions yet.</div>
          )}
      </div>
    </div>
  );
};

export default CoachEarnings;
