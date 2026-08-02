import React from 'react';
import { useParams } from 'react-router-dom';
import CoachSprintView from './CoachSprintView';

const SprintPreviewPage: React.FC = () => {
  const { sprintId } = useParams<{ sprintId: string }>();

  if (!sprintId) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#FAFAFA]">
        <p className="text-sm text-gray-400 font-bold uppercase tracking-wider">No sprint selected to preview</p>
      </div>
    );
  }

  return (
    <CoachSprintView />
  );
};

export default SprintPreviewPage;
