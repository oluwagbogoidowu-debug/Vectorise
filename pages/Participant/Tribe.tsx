
import React from 'react';

const Tribe: React.FC = () => {
  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Your Tribe</h1>
      
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
           <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Community Coming Soon</h2>
        <p className="text-gray-500">Connect with fellow sprinters, share your wins, and grow together. The tribe space is currently under construction.</p>
      </div>
    </div>
  );
};

export default Tribe;
