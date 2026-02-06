
import React from 'react';
import { Outlet } from 'react-router-dom';

interface ParticipantLayoutProps {
  children?: React.ReactNode;
}

const ParticipantLayout: React.FC<ParticipantLayoutProps> = ({ children }) => {
  return (
    <div className="h-[100dvh] w-full bg-light overflow-hidden flex flex-col">
      {/* Main content area: flex-1 allows it to take up all space between header/nav if they exist */}
      <div className="flex-1 bg-light relative overflow-hidden">
        {children || <Outlet />}
      </div>
    </div>
  );
};

export default ParticipantLayout;
