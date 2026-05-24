
import React from 'react';
import { ARCHETYPES } from '../constants';

interface ArchetypeAvatarProps {
  archetypeId?: string;
  profileImageUrl?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  isVerified?: boolean;
}

const ArchetypeAvatar: React.FC<ArchetypeAvatarProps> = ({ 
  archetypeId, 
  profileImageUrl, 
  size = 'md',
  className = '',
  isVerified = false
}) => {
  const archetype = ARCHETYPES.find(a => a.id === archetypeId);
  
  const sizeClasses = {
    sm: 'w-8 h-8 rounded-lg text-sm border',
    md: 'w-10 h-10 rounded-xl text-xl border-2',
    lg: 'w-12 h-12 rounded-2xl text-2xl border-2',
    xl: 'w-20 h-20 rounded-[2rem] text-3xl border-4'
  };

  const badgeStyle = {
    sm: 'w-[9px] h-[9px] -top-0.5 -right-0.5',
    md: 'w-[11px] h-[11px] -top-0.5 -right-0.5',
    lg: 'w-[13px] h-[13px] -top-0.5 -right-0.5',
    xl: 'w-[15px] h-[15px] -top-0.5 -right-0.5'
  };

  const checkSize = {
    sm: 'w-[5px] h-[5px]',
    md: 'w-[6px] h-[6px]',
    lg: 'w-[7px] h-[7px]',
    xl: 'w-[8px] h-[8px]'
  };

  return (
    <div className="relative inline-block">
      <div className={`${sizeClasses[size]} overflow-hidden border-white shadow-md flex items-center justify-center bg-gradient-to-br transition-all duration-500 ${archetype?.color || 'from-gray-100 to-gray-200'} ${className}`}>
        {archetype ? (
          <span className="select-none">{archetype.icon}</span>
        ) : (
          <img src={profileImageUrl || 'https://picsum.photos/200'} className="w-full h-full object-cover" alt="" />
        )}
      </div>
      {isVerified && (
        <div className={`absolute ${badgeStyle[size]} bg-[#0E7850] text-white rounded-full flex items-center justify-center ring-1 ring-white shadow-sm z-10`}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" className={checkSize[size]}>
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      )}
    </div>
  );
};

export default ArchetypeAvatar;
