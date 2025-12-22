
import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { MOCK_SPRINTS, MOCK_USERS, MOCK_NOTIFICATIONS } from '../../services/mockData';
import { Sprint } from '../../types';
import Button from '../../components/Button';

const SprintReviewPage: React.FC = () => {
  const { sprintId } = useParams<{ sprintId: string }>();
  const navigate = useNavigate();
  const sprint = MOCK_SPRINTS.find(s => s.id === sprintId);
  const coach = MOCK_USERS.find(u => u.id === sprint?.coachId);

  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectionModal, setShowRejectionModal] = useState(false);

  const handleApproval = (approved: boolean) => {
    if (!sprint) return;

    const idx = MOCK_SPRINTS.findIndex(s => s.id === sprintId);
    if (idx !== -1) {
      MOCK_SPRINTS[idx].approvalStatus = approved ? 'approved' : 'rejected';
      MOCK_SPRINTS[idx].published = approved;
      
      MOCK_NOTIFICATIONS.unshift({
          id: `notif_sprint_review_${Date.now()}`,
          type: 'sprint_update',
          text: approved 
              ? `✅ Your sprint "${sprint.title}" has been approved and is now live!` 
              : `❌ Your sprint "${sprint.title}" was rejected. Reason: ${rejectionReason || 'No reason provided.'}`,
          timestamp: new Date().toISOString(),
          read: false
      });

      setShowRejectionModal(false);
      navigate('/admin/dashboard');
    }
  };

  if (!sprint || !coach) {
    return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
            <h1 className="text-2xl font-bold text-gray-700 mb-4">Sprint or Coach not found.</h1>
            <Link to="/admin/dashboard">
                <Button>Back to Dashboard</Button>
            </Link>
        </div>
    );
  }

  const renderMetric = (label: string, value: any) => (
    <div className="bg-gray-100 rounded-lg p-3">
      <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">{label}</p>
      <p className="text-lg font-semibold text-gray-900">{value}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-8">
            <Link to="/admin/dashboard" className="text-sm font-semibold text-primary hover:underline mb-4 inline-block">
                &larr; Back to Dashboard
            </Link>
            <h1 className="text-4xl font-extrabold text-gray-900">Sprint Review</h1>
            <p className="text-lg text-gray-500">Reviewing "{sprint.title}"</p>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Left Column: Sprint Details */}
          <div className="md:col-span-2 bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
            <div className="mb-6 border-b pb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">{sprint.title}</h2>
              <p className="text-gray-600">{sprint.description}</p>
            </div>

            <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Sprint Structure</h3>
                <div className="space-y-4">
                    {sprint.dailyContent.map((content, index) => (
                        <div key={index} className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                            <p className="font-bold text-gray-800">Day {content.day}</p>
                            <p className="text-sm text-gray-600">{content.lessonText}</p>
                             <p className="text-xs text-gray-500 mt-2 font-semibold">Task: {content.taskPrompt}</p>
                        </div>
                    ))}
                </div>
            </div>
          </div>

          {/* Right Column: Metadata & Actions */}
          <div className="md:col-span-1 space-y-6">
             <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Details</h3>
                <div className="space-y-3">
                    {renderMetric('Price', `₦${sprint.price.toLocaleString()}`)}
                    {renderMetric('Duration', `${sprint.duration} days`)}
                    {renderMetric('Category', sprint.category)}
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                 <h3 className="text-lg font-bold text-gray-800 mb-4">Coach</h3>
                <div className="flex items-center space-x-3">
                    <img src={coach.profileImageUrl} alt={coach.name} className="w-12 h-12 rounded-full object-cover"/>
                    <div>
                        <p className="font-bold text-gray-900">{coach.name}</p>
                        <p className="text-sm text-gray-500">{coach.email}</p>
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border-yellow-300 border-2">
                 <h3 className="text-lg font-bold text-yellow-900 mb-4">Approval Action</h3>
                <div className="space-y-3">
                    <Button onClick={() => handleApproval(true)} variant="primary" className="w-full bg-green-600 hover:bg-green-700">Approve & Publish</Button>
                    <Button onClick={() => setShowRejectionModal(true)} variant="danger" className="w-full">Reject</Button>
                </div>
            </div>
          </div>
        </div>
      </div>

      {/* Rejection Modal */}
      {showRejectionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl transform transition-transform scale-100">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Reject Sprint</h2>
                <p className="text-gray-600 mb-6">Please provide a reason for rejecting this sprint. This will be sent to the coach.</p>
                <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full p-3 border rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary mb-6"
                    rows={4}
                    placeholder="Example: The sprint description needs more detail about the target audience..."
                />
                <div className="flex gap-3">
                    <Button onClick={() => handleApproval(false)} variant="danger">Confirm Rejection</Button>
                    <Button onClick={() => setShowRejectionModal(false)} variant="secondary">Cancel</Button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default SprintReviewPage; 
