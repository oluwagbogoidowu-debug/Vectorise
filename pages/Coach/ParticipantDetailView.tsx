
import React, { useEffect, useState } from 'react';
import { CoachingComment, Participant, ParticipantSprint } from '../../types';
import { MOCK_PARTICIPANT_SPRINTS } from '../../services/mockData';
import { chatService } from '../../services/chatService';
import { useAuth } from '../../contexts/AuthContext';

interface ParticipantDetailViewProps {
  participant: Participant;
  sprintId: string;
  onClose: () => void;
}

const ParticipantDetailView: React.FC<ParticipantDetailViewProps> = ({ participant, sprintId, onClose }) => {
  const { user } = useAuth();
  const [reply, setReply] = useState('');
  const [coachingComments, setCoachingComments] = useState<CoachingComment[]>([]);

  const participantSprint = MOCK_PARTICIPANT_SPRINTS.find(
    (ps) => ps.participantId === participant.id && ps.sprintId === sprintId
  );

  const fetchConversation = async () => {
    const comments = await chatService.getConversation(sprintId, participant.id);
    setCoachingComments(comments);
  };


  useEffect(() => {
    fetchConversation();
    // Set up a polling mechanism to refresh comments every 5 seconds
    const intervalId = setInterval(fetchConversation, 5000);

    // Clear interval on component unmount
    return () => clearInterval(intervalId);
  }, [sprintId, participant.id]);

  const handleReply = async () => {
    if (reply.trim() && user) {
      const newMessage: Omit<CoachingComment, 'id'> = {
        sprintId,
        participantId: participant.id,
        authorId: user.id,
        content: reply,
        timestamp: new Date().toISOString(),
        day: participantSprint?.progress.length || 1,
        read: false,
      };
      await chatService.sendMessage(newMessage, participant);
      setReply('');
      // Refetch comments immediately after sending
      fetchConversation();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 my-8 flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold">
            {participant.name}'s Progress
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800">&times;</button>
        </div>

        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
          {/* Daily Actions */}
          <div className="mb-6">
            <h3 className="font-bold text-lg mb-2">Daily Actions</h3>
            {participantSprint?.progress.map((p) => (
              <div key={p.day} className="mb-4 p-4 rounded-lg bg-gray-50 border">
                <p className="font-bold">Day {p.day}</p>
                <p>Status: {p.completed ? 'Completed' : 'Pending'}</p>
                {p.submission && <p className="mt-2">Submission: {p.submission}</p>}
              </div>
            ))}
          </div>

          {/* Private Coaching Messages */}
          <div>
            <h3 className="font-bold text-lg mb-2">Private Coaching</h3>
            {coachingComments.map((comment) => (
              <div key={comment.id} className="mb-4 p-4 rounded-lg bg-blue-50 border">
                <p className="font-bold">{comment.authorId === participant.id ? participant.name : 'You'}</p>
                <p>{comment.content}</p>
                <p className="text-xs text-gray-500 mt-1">{new Date(comment.timestamp).toLocaleString()}</p>
              </div>
            ))}
             <div className="mt-4">
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="Reply to participant..."
              />
              <button
                onClick={handleReply}
                className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Send Reply
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParticipantDetailView;
