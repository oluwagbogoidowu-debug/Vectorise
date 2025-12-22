import React from 'react';

const TempMessage: React.FC = () => {
  return (
    <div className="p-10 bg-blue-100 min-h-[50vh] rounded-3xl flex flex-col items-center justify-center text-center">
      <h1 className="text-4xl font-black text-blue-600 mb-4">MESSAGES COMING SOON</h1>
      <p className="text-xl text-blue-800">If you see this blue box, the routing to /messages is working perfectly!</p>
      <div className="mt-8 p-4 bg-white rounded-xl shadow-sm font-mono text-sm">
        Path: /pages/Participant/TempMessage.tsx
      </div>
    </div>
  );
};

export default TempMessage;