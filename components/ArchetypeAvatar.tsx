
import React from 'react';
import { ARCHETYPES } from '../constants';

interface ArchetypeAvatarProps {
  archetypeId?: string;
  profileImageUrl?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const ArchetypeAvatar: React.FC<ArchetypeAvatarProps> = ({ 
  archetypeId, 
  profileImageUrl, 
  size = 'md',
  className = ''
}) => {
  const archetype = ARCHETYPES.find(a => a.id === archetypeId);
  
  const sizeClasses = {
    sm: 'w-8 h-8 rounded-lg text-sm border',
    md: 'w-10 h-10 rounded-xl text-xl border-2',
    lg: 'w-12 h-12 rounded-2xl text-2xl border-2',
    xl: 'w-20 h-20 rounded-[2rem] text-3xl border-4'
  };

  return (
    <div className={`${sizeClasses[size]} overflow-hidden border-white shadow-md flex items-center justify-center bg-gradient-to-br transition-all duration-500 ${archetype?.color || 'from-gray-100 to-gray-200'} ${className}`}>
      {archetype ? (
        <span className="select-none">{archetype.icon}</span>
      ) : (
        <img src={profileImageUrl || 'https://picsum.photos/200'} className="w-full h-full object-cover" alt="" />
      )}
    </div>
  );
};

export default ArchetypeAvatar;
