
import React from 'react';
import { Outlet } from 'react-router-dom';

interface ParticipantLayoutProps {
  children?: React.ReactNode;
}

const ParticipantLayout: React.FC<ParticipantLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main content area with padding bottom to prevent content being hidden behind nav */}
      <div className="pb-24">
        {children || <Outlet />}
      </div>
    </div>
  );
};

export default ParticipantLayout;
