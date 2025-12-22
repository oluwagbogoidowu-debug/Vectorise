
import React from 'react';

const MockChat: React.FC = () => {
  return (
    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 h-full flex flex-col">
      <h3 className="text-lg font-bold text-gray-900 mb-4">Your Tribe</h3>
      <div className="flex-1 overflow-y-auto">
        {/* Mock chat messages */}
        <div className="flex items-start gap-2.5 mb-4">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-300"></div>
          <div className="bg-gray-100 p-3 rounded-lg">
            <p className="text-sm text-gray-800">Hey everyone! Just finished Day 5, feeling great!</p>
          </div>
        </div>
        <div className="flex items-start gap-2.5 mb-4 justify-end">
          <div className="bg-primary p-3 rounded-lg text-white">
            <p className="text-sm">That's awesome! Keep it up!</p>
          </div>
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-300"></div>
        </div>
        <div className="flex items-start gap-2.5">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-300"></div>
          <div className="bg-gray-100 p-3 rounded-lg">
            <p className="text-sm text-gray-800">Anyone have tips for the reflection exercise?</p>
          </div>
        </div>
      </div>
      <div className="mt-4">
        <input
          type="text"
          placeholder="Send a message..."
          className="w-full p-2 border border-gray-300 rounded-lg"
        />
      </div>
    </div>
  );
};

export default MockChat;
