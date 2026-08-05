import React from 'react';
import { useParams } from 'react-router-dom';
import SprintView from './SprintView';

const SprintPreview: React.FC = () => {
    const { sprintId } = useParams<{ sprintId: string }>();

    return <SprintView isPreview={true} previewSprintId={sprintId} />;
};

export default SprintPreview;
