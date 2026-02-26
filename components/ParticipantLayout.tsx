
import React from 'react';
import Header from './Header';
import BottomNav from './BottomNav';
import { Outlet } from 'react-router-dom';

interface ParticipantLayoutProps {
  children?: React.ReactNode;
}

const ParticipantLayout: React.FC<ParticipantLayoutProps> = ({ children }) => {
  return (
    <div className="h-[100dvh] w-full bg-light overflow-hidden flex flex-col">
      {/* Main content area: overflow-y-auto enables scrolling for the whole view */}
      <Header />
      <main className="flex-1 bg-light relative overflow-y-auto custom-scrollbar pt-24 pb-24">
        {children || <Outlet />}
      </main>
      <BottomNav />
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default ParticipantLayout;