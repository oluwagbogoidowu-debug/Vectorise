import React from 'react';
import { Outlet } from 'react-router-dom';
import CoachBottomNavigation from './CoachBottomNavigation';

const CoachLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-light">
      {/* Main content area with padding bottom to prevent content being hidden behind nav */}
      <div className="pb-24 bg-light">
        <Outlet />
      </div>
      <CoachBottomNavigation />
    </div>
  );
};

export default CoachLayout;