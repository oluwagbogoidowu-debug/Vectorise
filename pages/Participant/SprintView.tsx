import React, { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import {
  ParticipantSprint,
  Sprint,
  DailyContent,
  GlobalOrchestrationSettings,
  MicroSelector,
  MicroSelectorStep,
  CoachingComment,
} from "../../types";
import { useAuth } from "../../contexts/AuthContext";
import { sprintService } from "../../services/sprintService";
import { analyticsService } from "../../services/analyticsService";
import { analyticsTracker } from "../../services/analyticsTracker";
import { chatService } from "../../services/chatService";
import { pushNotificationService } from "../../services/pushNotificationService";
import { doc, updateDoc } from "firebase/firestore";
import { toast } from "sonner";
import { db } from "../../services/firebase";
import FormattedText from "../../components/FormattedText";
import LocalLogo from "../../components/LocalLogo";
import SprintCompletionModal from "../../components/SprintCompletionModal";
import PushPermissionModal from "../../components/PushPermissionModal";
import ConfirmModal from "../../components/ConfirmModal";
import { Participant } from "../../types";

import { PushToggle } from "../../components/PushToggle";
import { BookOpen } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { createPortal } from "react-dom";

const DayCompletionModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  day: number;
}> = ({ isOpen, onClose, day }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-[2.5rem] shadow-2xl p-10 max-w-sm w-full text-center relative overflow-hidden animate-slide-up border border-gray-100">
        <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6 text-green-500 relative">
          <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-20"></div>
          <svg
            className="w-12 h-12 relative z-10"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h3 className="text-3xl font-black text-gray-900 tracking-tight mb-2">
          Great Job!
        </h3>
        <p className="text-gray-500 font-medium mb-8">
          You've successfully completed Day {day} of the sprint. Keep up the
          momentum!
        </p>
        <button
          onClick={onClose}
          className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-gray-800 transition-colors shadow-lg active:scale-95"
        >
          Continue
        </button>
      </div>
    </div>
  );
};

interface MirrorReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  day: number;
  dayContent: any;
  answers: string[];
}

const MirrorReportModal: React.FC<MirrorReportModalProps> = ({ isOpen, onClose, day, dayContent, answers }) => {
  if (!isOpen) return null;

  const introText = dayContent?.mirrorIntro || "Here is a mirror of your reflections and alignments from today's sprint action steps:";
  const prompts = dayContent?.taskPrompts || [dayContent?.taskPrompt];

  const renderSubmittedAnswer = (answer: string) => {
    if (!answer) return <span className="text-gray-400 italic">No response submitted</span>;
    
    if (answer.startsWith("[") && answer.endsWith("]")) {
      try {
        const tags = JSON.parse(answer);
        if (Array.isArray(tags)) {
          return (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag, i) => (
                <span key={i} className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                  {tag}
                </span>
              ))}
            </div>
          );
        }
      } catch(e) {}
    }
    
    return <p className="text-gray-800 text-sm font-black leading-relaxed">{answer}</p>;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md animate-fade-in">
      <div className="bg-white rounded-[2.5rem] shadow-2xl p-8 max-w-2xl w-full max-h-[85vh] overflow-y-auto border border-gray-100 flex flex-col animate-slide-up">
        {/* Header */}
        <div className="flex items-start gap-4 mb-6 pb-4 border-b border-gray-100">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/10">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <div>
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">Your Mirror Report</h3>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">Day {day} Reflection & Alignment</p>
          </div>
        </div>

        {/* Coach Intro Text */}
        <div className="mb-6 bg-emerald-500/5 p-4 rounded-2xl border border-emerald-500/10">
          <p className="text-xs font-black text-emerald-800 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Coach Note
          </p>
          <p className="text-gray-750 text-sm font-semibold leading-relaxed">
            {introText}
          </p>
        </div>

        {/* Steps and responses */}
        <div className="space-y-6 flex-1 pr-1 overflow-y-auto">
          {prompts.map((prompt: string, index: number) => {
            if (!prompt || !prompt.trim()) return null;
            const framing = dayContent?.mirrorFraming?.[index];
            const answer = answers[index] || "";

            return (
              <div key={index} className="space-y-2 border-l-2 border-gray-100 pl-4 py-1.5 animate-fade-in">
                {/* Framing just above the participant's response */}
                {framing ? (
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{framing}</p>
                ) : (
                  <p className="text-xs font-bold text-gray-300 uppercase tracking-widest italic">[Framing Statement]</p>
                )}

                {/* Participant's Response */}
                <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100 mt-1">
                  {renderSubmittedAnswer(answer)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-gray-800 transition-colors shadow-lg active:scale-95"
          >
            Got it, Let's Continue
          </button>
        </div>
      </div>
    </div>
  );
};

const SprintSettingsModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  notificationsEnabled: boolean;
  onToggleNotifications: (state: boolean) => void;
}> = ({
  isOpen,
  onClose,
  soundEnabled,
  onToggleSound,
  notificationsEnabled,
  onToggleNotifications,
}) => {
  if (!isOpen) return null;

  const Toggle = ({
    enabled,
    onToggle,
    label,
  }: {
    enabled: boolean;
    onToggle: () => void;
    label: string;
  }) => (
    <div className="flex items-center justify-between py-4 border-b border-gray-50 last:border-0">
      <span className="text-xs font-black text-gray-700 uppercase tracking-widest">
        {label}
      </span>
      <button
        onClick={onToggle}
        className={`w-12 h-6 rounded-full transition-all duration-300 relative ${enabled ? "bg-primary" : "bg-gray-200"}`}
      >
        <div
          className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${enabled ? "right-1" : "left-1"}`}
        />
      </button>
    </div>
  );

  return (
    <div className="modal-overlay animate-fade-in" onClick={onClose}>
      <div className="modal-content-wrapper" onClick={onClose}>
        <div
          className="modal-content w-full max-w-sm bg-white rounded-[2.5rem] overflow-hidden animate-slide-up flex flex-col max-h-[80vh] border border-gray-100"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-8 pb-4 flex justify-between items-center flex-shrink-0">
            <h3 className="text-xl font-black text-gray-900 tracking-tight">
              Sprint Settings
            </h3>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-dark transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-8 py-2 min-h-0 custom-scrollbar">
            <Toggle
              enabled={soundEnabled}
              onToggle={onToggleSound}
              label="Completion Sound"
            />
            <div className="py-2.5 border-b border-gray-50 last:border-0">
              <PushToggle
                label="Unlock Notifications"
                showSubLabel={false}
                labelClassName="text-xs font-black text-gray-700 uppercase tracking-widest"
                onToggleSuccess={(state) => onToggleNotifications(state)}
              />
            </div>
          </div>

          <div className="p-8 pt-4 flex-shrink-0">
            <button
              onClick={onClose}
              className="w-full bg-dark text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const CoachingChatModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  sprintId: string;
  participantId: string;
  day: number;
  sprintTitle: string;
}> = ({ isOpen, onClose, sprintId, participantId, day, sprintTitle }) => {
  const [messages, setMessages] = useState<CoachingComment[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      const fetchMessages = async () => {
        const conversation = await chatService.getConversation(
          sprintId,
          participantId,
          day,
        );
        setMessages(conversation);
        // Mark as read
        await chatService.markMessagesAsRead(
          sprintId,
          participantId,
          day,
          participantId,
        );
      };
      fetchMessages();
    }
  }, [isOpen, sprintId, participantId, day]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || isSending) return;
    setIsSending(true);
    try {
      const msg = await chatService.sendMessage({
        sprintId,
        participantId,
        authorId: participantId,
        content: newMessage.trim(),
        day,
        timestamp: new Date().toISOString(),
        read: false,
      });
      setMessages((prev) => [...prev, msg]);
      setNewMessage("");
    } catch (error) {
      console.error("Failed to send message", error);
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay animate-fade-in" onClick={onClose}>
      <div className="modal-content-wrapper" onClick={onClose}>
        <div
          className="modal-content w-full max-w-md bg-white rounded-[2.5rem] overflow-hidden flex flex-col animate-slide-up h-[70vh] max-h-[80vh] border border-gray-100"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-white flex-shrink-0">
            <div>
              <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1">
                Private Coaching Chat
              </h3>
              <p className="text-sm font-black text-gray-900 truncate max-w-[200px]">
                {sprintTitle}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-gray-50 px-3 py-1.5 rounded-full">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Day {day}
                </span>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-dark transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#FAFAFA] min-h-0 custom-scrollbar"
          >
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-40">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <svg
                    className="w-6 h-6 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                  No messages yet
                </p>
                <p className="text-[9px] font-medium text-gray-400 mt-2">
                  Start the conversation with your coach.
                </p>
              </div>
            ) : (
              messages.map((msg, idx) => {
                const isMe = msg.authorId === participantId;
                return (
                  <div
                    key={msg.id || idx}
                    className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] p-4 rounded-2xl text-sm ${
                        isMe
                          ? "bg-primary text-white rounded-tr-none shadow-lg shadow-primary/10"
                          : "bg-white text-gray-800 rounded-tl-none border border-gray-100 shadow-sm"
                      }`}
                    >
                      <p className="font-medium leading-relaxed">
                        {msg.content}
                      </p>
                      <p
                        className={`text-[8px] mt-2 font-black uppercase tracking-widest opacity-40 ${isMe ? "text-white text-right" : "text-gray-400"}`}
                      >
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Input */}
          <div className="p-6 bg-white border-t border-gray-50 flex-shrink-0">
            <div className="relative flex items-center gap-2">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Type your message..."
                className="flex-1 bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 text-sm font-medium focus:bg-white focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none transition-all resize-none max-h-32"
                rows={1}
              />
              <button
                onClick={handleSend}
                disabled={!newMessage.trim() || isSending}
                className="w-12 h-12 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 active:scale-95 disabled:opacity-50 disabled:grayscale transition-all"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 10l7-7m0 0l7 7m-7-7v18"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface SectionHeadingProps {
  children: React.ReactNode;
  color?: string;
}

const SectionHeading: React.FC<SectionHeadingProps> = ({
  children,
  color = "primary",
}) => (
  <h2
    className={`text-[8px] font-black text-${color} uppercase tracking-[0.4em] mb-4`}
  >
    {children}
  </h2>
);

const AutoGrowingTextarea: React.FC<{
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}> = ({ value, onChange, placeholder = "What's on your mind...", className = "" }) => {
  const ref = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = () => {
    const el = ref.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`${className} overflow-y-auto min-h-[80px]`}
      style={{ maxHeight: "180px" }}
    />
  );
};

const TagInput: React.FC<{
  value: string;
  onChange: (newVal: string) => void;
  maxTags?: number;
  placeholder?: string;
  onNext?: () => void;
}> = ({ value, onChange, maxTags = 10, placeholder = "Type and press Enter...", onNext }) => {
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const tags = useMemo<string[]>(() => {
    if (!value) return [];
    if (value.startsWith("[")) {
      try {
        return JSON.parse(value);
      } catch (err) {
        return [];
      }
    }
    return value.split(",").filter(Boolean);
  }, [value]);

  const addTag = (tag: string) => {
    const cleaned = tag.trim().replace(/^[,\s;]+|[,\s;]+$/g, "");
    if (!cleaned) return;
    
    if (tags.length >= maxTags) {
      setError(`Maximum of ${maxTags} tags allowed`);
      toast.error(`You can only add up to ${maxTags} tags.`);
      return;
    }

    if (tags.some(t => t.toLowerCase() === cleaned.toLowerCase())) {
      setError("This tag is already added");
      return;
    }

    const newTags = [...tags, cleaned];
    onChange(JSON.stringify(newTags));
    setInputValue("");
    setError(null);
  };

  const removeTag = (tIndex: number) => {
    const newTags = [...tags];
    newTags.splice(tIndex, 1);
    onChange(JSON.stringify(newTags));
    setError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "," || e.key === ";") {
      e.preventDefault();
      const val = inputValue.trim();
      if (val) {
        addTag(val);
      } else if (e.key === "Enter" && onNext) {
        onNext();
      }
    } else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text");
    if (!text) return;

    const rawTokens = text.split(/[,;\n]+/).map(t => t.trim()).filter(Boolean);
    if (rawTokens.length === 0) return;

    let addedCount = 0;
    const currentTags = [...tags];

    for (const token of rawTokens) {
      if (currentTags.length >= maxTags) {
        setError(`Maximum of ${maxTags} tags allowed. Paste truncated.`);
        toast.error(`You can only add up to ${maxTags} tags.`);
        break;
      }
      if (!currentTags.some(t => t.toLowerCase() === token.toLowerCase())) {
        currentTags.push(token);
        addedCount++;
      }
    }

    if (addedCount > 0) {
      onChange(JSON.stringify(currentTags));
      setInputValue("");
      setError(null);
    }
  };

  return (
    <div className="w-full text-left">
      <div className="w-full bg-white border border-gray-200 focus-within:ring-4 focus-within:ring-primary/5 focus-within:border-primary transition-all duration-200 rounded-2xl p-3 flex flex-wrap gap-2 items-center">
        {tags.map((tag, tIndex) => (
          <span
            key={tIndex}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black tracking-tight bg-primary/5 text-primary border border-primary/10 hover:bg-primary/10 transition-colors select-none"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tIndex)}
              className="text-primary/40 hover:text-primary transition-colors hover:bg-primary/15 rounded-full p-0.5"
              title={`Remove ${tag}`}
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </span>
        ))}
        
        <input
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={tags.length === 0 ? placeholder : "Add tag..."}
          disabled={tags.length >= maxTags}
          className="flex-1 min-w-[145px] px-2 py-1 text-sm font-medium text-gray-900 outline-none bg-transparent disabled:opacity-50"
        />
      </div>

      {error && (
        <div className="mt-2 px-1 text-[10px] font-black uppercase tracking-widest text-red-500 font-bold lowercase first-letter:uppercase animate-fade-in">
          {error}
        </div>
      )}
    </div>
  );
};

const SprintView: React.FC = () => {
  const { user } = useAuth();
  const { enrollmentId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [enrollment, setEnrollment] = useState<ParticipantSprint | null>(null);
  const [sprint, setSprint] = useState<Sprint | null>(null);
  const [viewingDay, setViewingDay] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReflectionModalOpen, setIsReflectionModalOpen] = useState(false);
  const [isDayCompletionModalOpen, setIsDayCompletionModalOpen] =
    useState(false);
  const [isMirrorReportModalOpen, setIsMirrorReportModalOpen] = useState(false);
  const mirrorTimerRef = useRef<any>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false);
  const [isPushPermissionModalOpen, setIsPushPermissionModalOpen] =
    useState(false);
  const [confirmCheckInDay, setConfirmCheckInDay] = useState<number | null>(
    null,
  );
  const [isSubmittingPush, setIsSubmittingPush] = useState(false);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [timeToUnlock, setTimeToUnlock] = useState<string>("00:00:00");

  // Day Completion State (Task Inputs)
  const [taskInputs, setTaskInputs] = useState<string[]>(["", "", ""]);
  const [activeTaskIndex, setActiveTaskIndex] = useState(0);

  // Refs to prevent loaders from overriding active page indices when database saves trigger subscription updates
  const loadedDayRef = useRef<number | null>(null);
  const loadedEnrollmentIdRef = useRef<string | null>(null);
  const lastSavedInputsRef = useRef<string>("");

  const saveParticipantInputImmediately = async (inputsToSave: string[]) => {
    if (!enrollment || !user || !inputsToSave || dayProgress?.completed) return;
    const currentInputsStr = JSON.stringify(inputsToSave);
    if (currentInputsStr === lastSavedInputsRef.current) return;

    try {
      const timestamp = new Date().toISOString();
      let foundDay = false;
      const updatedProgress = enrollment.progress.map((p) => {
        if (p.day === viewingDay) {
          foundDay = true;
          return {
            ...p,
            answers: inputsToSave,
            submission: inputsToSave.filter((ti) => ti && ti.trim()).join(" | "),
          };
        }
        return p;
      });

      if (!foundDay) {
        updatedProgress.push({
          day: viewingDay,
          completed: false,
          answers: inputsToSave,
          submission: inputsToSave.filter((ti) => ti && ti.trim()).join(" | "),
        });
      }

      const enrollmentRef = doc(db, "enrollments", enrollment.id);
      await updateDoc(enrollmentRef, {
        progress: updatedProgress,
        last_activity_at: timestamp,
      });
      lastSavedInputsRef.current = currentInputsStr;
      console.log("Immediately autosaved participant responses on navigation.");
    } catch (err) {
      console.error("Immediately autosave failed on navigation:", err);
    }
  };

  const [isFullBleed, setIsFullBleed] = useState(false);
  const [revealedHints, setRevealedHints] = useState<Record<number, boolean>>(
    {},
  );

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [globalSettings, setGlobalSettings] =
    useState<GlobalOrchestrationSettings | null>(null);

  const dayContent = Array.isArray(sprint?.dailyContent)
    ? sprint?.dailyContent.find((dc) => dc.day === viewingDay)
    : undefined;

  const getLinkedTagsForStep = (stepIndex: number): string[] => {
    if (!dayContent) return [];

    // 1. Check if the new taskLinkedSources tells us which steps are linked
    if (Array.isArray(dayContent.taskLinkedSources?.[stepIndex]) && dayContent.taskLinkedSources[stepIndex].length > 0) {
      const allTags: string[] = [];
      dayContent.taskLinkedSources[stepIndex].forEach(srcIndex => {
        if (srcIndex >= 0) {
          if (srcIndex < taskInputs.length && taskInputs[srcIndex]) {
            try {
              const val = taskInputs[srcIndex];
              const srcType = String(dayContent.taskInputTypes?.[srcIndex] || "").trim().toLowerCase();
              if (val.startsWith("[")) {
                allTags.push(...JSON.parse(val));
              } else if (srcType === "poll") {
                allTags.push(val);
              } else {
                allTags.push(...val.split(",").filter(Boolean));
              }
            } catch (e) {
              console.error("Error parsing tags for source", srcIndex, e);
            }
          }
        } else {
          // Cross-day link!
          const absVal = Math.abs(srcIndex);
          const targetDay = Math.floor(absVal / 100);
          const targetStepIdx = absVal % 100;
          
          const targetProgress = enrollment?.progress?.find((p) => p.day === targetDay);
          const targetDayContent = Array.isArray(sprint?.dailyContent)
            ? sprint.dailyContent.find((dc) => dc.day === targetDay)
            : undefined;
            
          if (targetProgress && targetProgress.answers && Array.isArray(targetProgress.answers) && targetDayContent) {
            const val = targetProgress.answers[targetStepIdx];
            if (val) {
              try {
                const srcType = String(targetDayContent.taskInputTypes?.[targetStepIdx] || "").trim().toLowerCase();
                if (val.startsWith("[")) {
                  allTags.push(...JSON.parse(val));
                } else if (srcType === "poll") {
                  allTags.push(val);
                } else {
                  allTags.push(...val.split(",").filter(Boolean));
                }
              } catch (e) {
                console.error("Error parsing cross-day tags for source", srcIndex, e);
              }
            }
          }
        }
      });
      return Array.from(new Set(allTags)).filter(Boolean);
    }

    // 2. Fallback to legacy structure
    let linkedSourceIndex = -1;
    for (let prevIndex = stepIndex - 1; prevIndex >= 0; prevIndex--) {
      const isLinked = 
        dayContent.taskLinkedToNext?.[prevIndex] === true ||
        (dayContent.taskLinkedToNext?.[prevIndex] as any) === "true";
      if (isLinked) {
        const inputType = String(
          dayContent.taskInputTypes?.[prevIndex] || ""
        ).trim().toLowerCase();
        if (inputType === "tags" || inputType === "poll") {
          linkedSourceIndex = prevIndex;
          break;
        }
      }
    }
    // Robust fallback
    if (linkedSourceIndex === -1) {
      for (let prevIndex = stepIndex - 1; prevIndex >= 0; prevIndex--) {
        const inputType = String(
          dayContent.taskInputTypes?.[prevIndex] || ""
        ).trim().toLowerCase();
        if (inputType === "tags" || inputType === "poll") {
          linkedSourceIndex = prevIndex;
          break;
        }
      }
    }

    if (linkedSourceIndex !== -1 && taskInputs[linkedSourceIndex]) {
      try {
        const val = taskInputs[linkedSourceIndex];
        const srcType = String(dayContent.taskInputTypes?.[linkedSourceIndex] || "").trim().toLowerCase();
        if (val.startsWith("[")) {
          return JSON.parse(val);
        } else if (srcType === "poll") {
          return [val];
        } else {
          return val.split(",").filter(Boolean);
        }
      } catch (e) {
        return [];
      }
    }
    return [];
  };

  const getPreviousDayTags = (): string[] => {
    if (viewingDay <= 1 || !sprint || !enrollment) return [];
    
    const prevDay = viewingDay - 1;
    const prevDayContent = Array.isArray(sprint.dailyContent)
      ? sprint.dailyContent.find((dc) => dc.day === prevDay)
      : undefined;
      
    if (!prevDayContent) return [];
    
    const prevDayProgress = enrollment.progress?.find((p) => p.day === prevDay);
    if (!prevDayProgress) return [];
    const prevAnswers = prevDayProgress.answers;
    if (!prevAnswers || !Array.isArray(prevAnswers)) return [];
    
    const tags: string[] = [];
    prevDayContent.taskInputTypes?.forEach((type, idx) => {
      if (type === "tags" || type === "poll") {
        const ans = prevAnswers[idx];
        if (ans) {
          try {
            if (ans.startsWith("[")) {
              const parsed = JSON.parse(ans);
              if (Array.isArray(parsed)) {
                tags.push(...parsed);
              }
            } else if (type === "poll") {
              tags.push(ans);
            } else {
              const split = ans.split(",").map(t => t.trim()).filter(Boolean);
              tags.push(...split);
            }
          } catch (e) {
            tags.push(ans);
          }
        }
      }
    });
    
    return Array.from(new Set(tags)).filter(Boolean);
  };

  const isLinkedTextStep = (stepIndex: number): boolean => {
    if (!dayContent) return false;
    if (dayContent.taskTagNoteActive?.[stepIndex]) return false;
    const type = String(dayContent.taskInputTypes?.[stepIndex] || "").trim().toLowerCase();
    const isText = type === "text" || type === "" || type === "undefined";
    return isText && getLinkedTagsForStep(stepIndex).length > 0;
  };

  const dayProgress = enrollment?.progress?.find((p) => p.day === viewingDay);

  useEffect(() => {
    if (!enrollmentId) return;
    const unsubscribe = sprintService.subscribeToEnrollment(
      enrollmentId,
      async (data) => {
        if (data) {
          setEnrollment(data);
          if (data.soundDisabled !== undefined) {
            setSoundEnabled(!data.soundDisabled);
          }
          if (data.notificationsDisabled !== undefined) {
            setNotificationsEnabled(!data.notificationsDisabled);
          }
          if (!sprint) {
            const found = await sprintService.getSprintById(data.sprint_id);
            setSprint(found);

            // Handle deep linking from query params
            const params = new URLSearchParams(location.search);
            const dayParam = params.get("day");
            const openChatParam = params.get("openChat");

            if (dayParam) {
              setViewingDay(parseInt(dayParam));
              if (openChatParam === "true") {
                setIsChatModalOpen(true);
              }
            } else {
              const firstIncomplete = data.progress?.find((p) => !p.completed);
              setViewingDay(
                firstIncomplete
                  ? firstIncomplete.day
                  : data.progress?.length || 1,
              );
            }
          }
        }
      },
    );
    return () => unsubscribe();
  }, [enrollmentId, sprint, location.search]);

  // Clean viewport body scroll locking for full-bleed focus mode
  useEffect(() => {
    if (isFullBleed) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isFullBleed]);

  // Check for unread messages
  useEffect(() => {
    if (!enrollment || !user || isChatModalOpen) return;

    const checkUnread = async () => {
      const hasUnread = await chatService.hasUnreadMessages(
        enrollment.sprint_id,
        user.id,
        viewingDay,
        user.id,
      );
      setHasUnreadMessages(hasUnread);
    };

    checkUnread();
    const interval = setInterval(checkUnread, 10000); // Check every 10s
    return () => clearInterval(interval);
  }, [enrollment, user, viewingDay, isChatModalOpen]);

  useEffect(() => {
    const loadSettings = async () => {
      const settings = await sprintService.getGlobalOrchestrationSettings();
      setGlobalSettings(settings);
    };
    loadSettings();
  }, []);

  useEffect(() => {
    if (!enrollment || !sprint) return;

    // Check if we have already loaded the inputs for this specific day and enrollment to avoid resetting page indexes on subscription updates
    if (loadedDayRef.current === viewingDay && loadedEnrollmentIdRef.current === enrollment.id) {
      return;
    }

    const promptsLength = dayContent?.taskPrompts?.length || 1;
    let loaded: string[] = Array(promptsLength).fill("");

    if (dayProgress?.answers && Array.isArray(dayProgress.answers)) {
      loaded = Array.from({ length: promptsLength }, (_, idx) => dayProgress.answers?.[idx] || "");
    } else if (dayProgress?.submission) {
      const parts = dayProgress.submission.split(" | ");
      loaded = Array.from({ length: promptsLength }, (_, idx) => parts[idx] || "");
    } else {
      const pendingRaw = localStorage.getItem('pending_first_action');
      if (viewingDay === 1 && pendingRaw) {
        try {
          const pending = JSON.parse(pendingRaw);
          if (pending && pending.sprintId === sprint.id && pending.firstActionInput) {
            loaded = Array.from({ length: promptsLength }, (_, idx) => idx === 0 ? pending.firstActionInput : "");
          }
        } catch (err) {}
      }
    }

    setTaskInputs(loaded);
    setActiveTaskIndex(0);
    setIsFullBleed(false);
    setRevealedHints({});

    // Record that we have loaded for this day/enrollment
    loadedDayRef.current = viewingDay;
    loadedEnrollmentIdRef.current = enrollment.id;
    lastSavedInputsRef.current = JSON.stringify(loaded);
  }, [viewingDay, enrollment, sprint, dayProgress, dayContent]);

  // Debounced autosave hook for participant inputs
  useEffect(() => {
    if (!enrollment || !user || !taskInputs || dayProgress?.completed) return;

    const currentInputsStr = JSON.stringify(taskInputs);
    // If the inputs haven't actually changed from what is in the database or what we last saved, don't trigger save
    if (currentInputsStr === lastSavedInputsRef.current) return;
    
    // Also compare with progress answers in DB to make sure we don't overwrite if DB is identical
    const dbAnswersStr = JSON.stringify(dayProgress?.answers || []);
    if (currentInputsStr === dbAnswersStr) {
      lastSavedInputsRef.current = currentInputsStr;
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const timestamp = new Date().toISOString();
        let foundDay = false;
        const updatedProgress = enrollment.progress.map((p) => {
          if (p.day === viewingDay) {
            foundDay = true;
            return {
              ...p,
              answers: taskInputs,
              submission: taskInputs.filter((ti) => ti && ti.trim()).join(" | "),
            };
          }
          return p;
        });

        if (!foundDay) {
          updatedProgress.push({
            day: viewingDay,
            completed: false,
            answers: taskInputs,
            submission: taskInputs.filter((ti) => ti && ti.trim()).join(" | "),
          });
        }

        const enrollmentRef = doc(db, "enrollments", enrollment.id);
        const updatePayload: any = {
          progress: updatedProgress,
          last_activity_at: timestamp,
        };

        await updateDoc(enrollmentRef, updatePayload);
        lastSavedInputsRef.current = currentInputsStr;
        console.log("Autosaved intermediate participant responses.");
      } catch (err) {
        console.error("Failed intermediate autosave:", err);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [taskInputs, enrollment, user, viewingDay, dayProgress]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!notificationsEnabled || !enrollment || !sprint || !enrollment.progress)
      return;

    // Check if the next day is unlocked
    const firstIncomplete = enrollment.progress.find((p) => !p.completed);
    if (firstIncomplete && firstIncomplete.day > 1) {
      const prevDay = enrollment.progress.find(
        (p) => p.day === firstIncomplete.day - 1,
      );
      if (prevDay?.completedAt) {
        const completedDate = new Date(prevDay.completedAt);
        const nextMidnight = new Date(
          completedDate.getFullYear(),
          completedDate.getMonth(),
          completedDate.getDate() + 1,
          0,
          0,
          0,
        ).getTime();

        // If it's exactly midnight or just passed it, show a notification
        // We'll use a ref to prevent multiple notifications for the same day
        const lastNotifiedDay = localStorage.getItem(
          `last_notified_day_${enrollment.id}`,
        );
        if (
          now >= nextMidnight &&
          lastNotifiedDay !== firstIncomplete.day.toString()
        ) {
          toast.success(`Day ${firstIncomplete.day} is now unlocked!`, {
            description: "Time to take action.",
            icon: (
              <svg
                className="w-5 h-5 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            ),
          });
          localStorage.setItem(
            `last_notified_day_${enrollment.id}`,
            firstIncomplete.day.toString(),
          );
        }
      }
    }
  }, [now, notificationsEnabled, enrollment, sprint]);

  const dayLockDetails = useMemo(() => {
    if (!enrollment || !sprint || !enrollment.progress)
      return { isLocked: false, unlockTime: 0 };

    if (viewingDay === 1) return { isLocked: false, unlockTime: 0 };

    const prevDay = enrollment.progress.find((p) => p.day === viewingDay - 1);

    if (!prevDay?.completed)
      return {
        isLocked: true,
        unlockTime: 0,
        reason: "Complete previous day first.",
      };

    if (prevDay.completedAt) {
      const completedDate = new Date(prevDay.completedAt);
      const nextMidnight = new Date(
        completedDate.getFullYear(),
        completedDate.getMonth(),
        completedDate.getDate() + 1,
        0,
        0,
        0,
      ).getTime();

      const isLocked = now < nextMidnight;
      return { isLocked, unlockTime: nextMidnight };
    }

    return { isLocked: false, unlockTime: 0 };
  }, [enrollment, sprint, viewingDay, now]);

  useEffect(() => {
    if (dayLockDetails.isLocked && dayLockDetails.unlockTime) {
      const diff = dayLockDetails.unlockTime - now;
      if (diff > 0) {
        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeToUnlock(
          `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`,
        );
      } else {
        setTimeToUnlock("00:00:00");
      }
    }
  }, [dayLockDetails, now]);

  const toggleSoundState = async () => {
    if (!enrollment) return;
    const newState = !soundEnabled;
    setSoundEnabled(newState);
    try {
      const enrollmentRef = doc(db, "enrollments", enrollment.id);
      await updateDoc(enrollmentRef, { soundDisabled: !newState });
    } catch (err) {
      console.error("Toggle sound state failed", err);
    }
  };

  const toggleNotificationsState = async (forcedState?: boolean) => {
    if (!enrollment || !user) return;
    const newState =
      forcedState !== undefined ? forcedState : !notificationsEnabled;
    setNotificationsEnabled(newState);
    try {
      const enrollmentRef = doc(db, "enrollments", enrollment.id);
      await updateDoc(enrollmentRef, { notificationsDisabled: !newState });

      if (
        newState &&
        pushNotificationService.shouldShowPermissionRequest(user as Participant)
      ) {
        setIsPushPermissionModalOpen(true);
      }
    } catch (err) {
      console.error("Toggle notifications state failed", err);
    }
  };

  const handleAcceptPush = async () => {
    if (!user) return;
    setIsSubmittingPush(true);
    const toastId = toast.loading("Setting up notifications...");
    try {
      console.log("Attempting push subscription for user:", user.id);
      const sub = await pushNotificationService.subscribeUser(user.id);
      console.log("Subscription result:", sub);

      await pushNotificationService.recordPermissionResponse(
        user.id,
        user as Participant,
        "accepted",
      );
      setNotificationsEnabled(true);

      const enrollmentRef = doc(db, "enrollments", enrollment!.id);
      await updateDoc(enrollmentRef, { notificationsDisabled: false });

      toast.success("Notifications activated!", { id: toastId });

      // Trigger a test notification immediately
      await pushNotificationService.sendPush(
        user.id,
        "Notifications Active!",
        "You'll now receive timely reminders for your sprint.",
        "/participant/sprint",
        "test-notification",
      );

      setIsPushPermissionModalOpen(false);
    } catch (err: any) {
      console.error("Push subscription failed", err);
      toast.error(`Failed to activate: ${err.message || "Unknown error"}`, {
        id: toastId,
      });
    } finally {
      setIsSubmittingPush(false);
    }
  };

  const handleDeclinePush = async () => {
    if (!user) return;
    await pushNotificationService.recordPermissionResponse(
      user.id,
      user as Participant,
      "denied",
    );
    setIsPushPermissionModalOpen(false);
  };

  const handleIgnorePush = async () => {
    if (!user) return;
    await pushNotificationService.recordPermissionResponse(
      user.id,
      user as Participant,
      "ignored",
    );
    setIsPushPermissionModalOpen(false);
  };

  const handleFinishDay = async () => {
    if (!enrollment || !user || isSubmitting || !enrollment.progress) return;
    setIsSubmitting(true);
    try {
      const timestamp = new Date().toISOString();
      const isLastDay = viewingDay === enrollment.progress.length;
      const updatedProgress = enrollment.progress.map((p) =>
        p.day === viewingDay
          ? {
              ...p,
              completed: true,
              completedAt: timestamp,
              submission: taskInputs.filter((ti) => ti.trim()).join(" | "),
              answers: taskInputs,
            }
          : p,
      );

      const enrollmentRef = doc(db, "enrollments", enrollment.id);
      const updatePayload: any = {
        progress: updatedProgress,
        last_activity_at: timestamp,
      };

      if (isLastDay && updatedProgress.every((p) => p.completed)) {
        updatePayload.completed_at = timestamp;
        updatePayload.status = "completed";
      }

      await updateDoc(enrollmentRef, updatePayload);
      setIsReflectionModalOpen(false);

      // Track user participation in core & activity tables
      if (user?.id) {
        analyticsService
          .logUserActivity(user.id, enrollment.sprint_id, 'task_submission')
          .catch((e) => console.error("Streak tracking failed:", e));

        analyticsTracker.trackEvent('sprint_submission', {
          sprint_id: enrollment.sprint_id,
          day: viewingDay
        }, user.id, user.email);
      }

      // Trigger push notification for task completion
      if (user?.id) {
        pushNotificationService
          .triggerCompletedTask(user.id)
          .catch((e) => console.error("Push trigger failed:", e));
      }

      // Play completion sound if enabled
      if (soundEnabled) {
        try {
          const audio = new Audio(
            "https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3",
          );
          audio.play().catch((e) => console.error("Sound playback failed:", e));
        } catch (e) {
          console.error("Audio initialization failed:", e);
        }
      }

      if (isLastDay && updatedProgress.every((p) => p.completed)) {
        setIsCompletionModalOpen(true);
      } else {
        setIsDayCompletionModalOpen(true);
      }

      // Start 7-second automatic mirror report transition
      if (dayContent?.mirrorActive) {
        if (mirrorTimerRef.current) clearTimeout(mirrorTimerRef.current);
        mirrorTimerRef.current = setTimeout(() => {
          setIsDayCompletionModalOpen(false);
          setIsMirrorReportModalOpen(true);
        }, 7000);
      }

      // Trigger push permission request if it's the first submission or based on logic
      if (
        user &&
        pushNotificationService.shouldShowPermissionRequest(user as Participant)
      ) {
        setIsPushPermissionModalOpen(true);
      }
    } catch (err) {
      console.error("Completion failed", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompletionModalAction = async (rating: number) => {
    if (!user) return;

    try {
      // Log rating if needed, for now just proceed
      const enrollments = await sprintService.getUserEnrollments(user.id);
      const queued = enrollments.filter((e) => e.status === "queued");

      if (queued.length > 0) {
        // Activate instantly
        await sprintService.startNextQueuedSprint(user.id);
        navigate("/dashboard", { replace: true });
      } else {
        // Check for saved sprints
        const p = user as Participant;
        const hasSaved =
          (p.savedSprintIds || []).length > 0 ||
          (p.wishlistSprintIds || []).length > 0;

        if (hasSaved) {
          navigate("/participant/my-sprints", { replace: true });
        } else {
          navigate("/explore", { replace: true });
        }
      }
    } catch (err) {
      console.error("Navigation after completion failed", err);
      navigate("/dashboard", { replace: true });
    }
  };

  const handleToggleReminder = async () => {
    if (!enrollment) return;
    const newState = !enrollment.checkInReminderEnabled;
    try {
      const enrollmentRef = doc(db, "enrollments", enrollment.id);
      await updateDoc(enrollmentRef, { checkInReminderEnabled: newState });
      toast.success(
        newState ? "Daily reminders enabled" : "Daily reminders disabled",
      );
    } catch (err) {
      console.error("Toggle reminder failed", err);
      toast.error("Failed to update reminder setting");
    }
  };

  const handleCheckIn = async (day: number) => {
    if (!enrollment || !user) return;

    setConfirmCheckInDay(day);
  };

  const executeCheckIn = async (day: number) => {
    if (!enrollment || !user) return;
    console.log("[SprintView] executing check-in for day:", day);

    // Check if already checked in for this day
    if (enrollment.checkInHistory?.some((h) => h.day === day)) return;

    const newCheckIn = {
      day,
      timestamp: new Date().toISOString(),
    };

    const updatedHistory = [...(enrollment.checkInHistory || []), newCheckIn];

    try {
      const enrollmentRef = doc(db, "enrollments", enrollment.id);
      await updateDoc(enrollmentRef, { checkInHistory: updatedHistory });
      toast.success(`Checked in for Day ${day}!`);
      if (user?.id) {
        pushNotificationService
          .triggerUpdate(user.id)
          .catch((e) => console.error("Push trigger failed:", e));
      }
    } catch (err) {
      console.error("Check-in failed", err);
      toast.error("Failed to check in");
    }
  };

  const isProofMet = useMemo(() => {
    if (!dayContent) return false;

    const activePrompts =
      dayContent.taskPrompts?.filter((p) => p && p.trim()) || [];
    if (activePrompts.length === 0) return true;

    return activePrompts.every((_, i) => {
      const type = dayContent.taskInputTypes?.[i] || "text";
      if (type === "note") return true;

      const val = taskInputs[i];
      if (!val) return false;

      if (type === "mark") {
        return val === "Completed";
      }
      
      if (isLinkedTextStep(i)) {
        const tags = getLinkedTagsForStep(i);
        if (tags.length > 0) {
          try {
            if (!val.startsWith("{")) return false;
            const parsed = JSON.parse(val);
            return tags.every(t => parsed[t] && parsed[t].trim().length > 0);
          } catch (e) {
            return false;
          }
        }
      }
      return val.trim().length > 0;
    });
  }, [dayContent, taskInputs]);

  const handleQuickComplete = () => {
    handleFinishDay();
  };

  if (!enrollment || !sprint || !enrollment.progress)
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );

  return (
    <>
      <div className="page-content w-full bg-[#FAFAFA] flex flex-col font-sans text-dark animate-fade-in pb-24">
        <header className="px-6 pt-10 pb-4 max-w-2xl mx-auto w-full sticky top-0 z-50 bg-[#FAFAFA]/90 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate("/dashboard")}
              className="p-2.5 bg-white border border-gray-100 rounded-2xl shadow-sm text-gray-400 active:scale-95 transition-all"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <div className="text-center flex-1 mx-4 min-w-0">
              <h1 className="text-lg font-black text-gray-900 truncate">
                {sprint.title}
              </h1>
            </div>
            <div className="flex gap-2">
              <Link
                to={`/sprint/${sprint.id}`}
                className="p-2.5 bg-white border border-gray-100 rounded-2xl shadow-sm text-gray-400 active:scale-95 transition-all"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </Link>
              <button
                onClick={() => setIsChatModalOpen(true)}
                disabled={dayLockDetails.isLocked}
                className={`p-2.5 bg-white border border-gray-100 rounded-2xl shadow-sm transition-all relative ${dayLockDetails.isLocked ? "opacity-40 cursor-not-allowed" : "text-gray-400 active:scale-95"}`}
                title={
                  dayLockDetails.isLocked
                    ? "Complete previous day first"
                    : "Coaching Chat"
                }
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                {!dayLockDetails.isLocked && hasUnreadMessages && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white animate-pulse"></span>
                )}
              </button>
              <button
                onClick={() => setIsSettingsModalOpen(true)}
                className="p-2.5 bg-white border border-gray-100 rounded-2xl shadow-sm text-gray-400 active:scale-95 transition-all"
                title="Sprint Settings"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </button>
            </div>
          </div>
        </header>

        <div className="px-6 max-w-2xl mx-auto w-full space-y-6 mt-4">
          <div className="flex overflow-x-auto gap-4 pb-4 no-scrollbar scroll-smooth px-1">
            {Array.from({ length: sprint.duration }, (_, i) => i + 1).map(
              (day) => {
                const isActive = viewingDay === day;
                const prog = enrollment.progress?.find((p) => p.day === day);
                const isCompleted = prog?.completed;

                const firstIncomplete =
                  enrollment.progress?.find((p) => !p.completed)?.day ||
                  sprint.duration;
                const isDisabled = day > firstIncomplete;

                return (
                  <button
                    key={day}
                    disabled={isDisabled}
                    onClick={() => setViewingDay(day)}
                    className={`flex-shrink-0 w-20 h-20 rounded-[1.5rem] flex flex-col items-center justify-center relative transition-all duration-300 active:scale-95 ${
                      isActive
                        ? "bg-[#0E7850] text-white shadow-xl shadow-primary/20 scale-105"
                        : isDisabled
                          ? "bg-[#F3F4F6] text-gray-200 cursor-not-allowed opacity-50"
                          : "bg-[#F3F4F6] text-gray-400"
                    }`}
                  >
                    {isCompleted && (
                      <div
                        className={`absolute top-3 right-3 w-2 h-2 rounded-full ${isActive ? "bg-white" : "bg-[#0E7850]"}`}
                      ></div>
                    )}
                    <span
                      className={`text-[8px] font-black uppercase tracking-widest ${isActive ? "text-white/60" : "text-gray-300"}`}
                    >
                      Day
                    </span>
                    <span className="text-3xl font-black leading-none">
                      {day}
                    </span>
                  </button>
                );
              },
            )}
          </div>

          <div
            className={`rounded-3xl transition-all duration-500 ${dayLockDetails.isLocked || enrollment.status === "queued" ? "bg-transparent border-none shadow-none min-h-[70vh] animate-slide-up relative overflow-hidden" : "space-y-6 w-full"}`}
          >
            {enrollment.status === "queued" ? (
              <div className="flex flex-col items-center justify-center text-center p-8 animate-fade-in min-h-[60vh] w-full">
                <h2 className="text-3xl font-black text-gray-900 tracking-tighter mb-4">
                  In the Queue.
                </h2>
                <p className="text-sm text-gray-500 font-medium mb-12 max-w-sm leading-relaxed">
                  You have an active sprint running. This journey will
                  automatically unlock once your current focus is complete.
                </p>
                <button
                  onClick={() => navigate("/dashboard")}
                  className="px-10 py-5 bg-primary text-white rounded-[2rem] text-[10px] font-black uppercase tracking-[0.3em] shadow-2xl shadow-primary/20 active:scale-95 transition-all hover:scale-[1.02]"
                >
                  Return to Active Focus
                </button>
              </div>
            ) : dayLockDetails.isLocked ? (
              <div className="flex flex-col items-center justify-center text-center p-8 animate-fade-in min-h-[60vh] w-full">
                <div className="p-10 bg-white rounded-[3rem] border border-gray-100 shadow-xl shadow-gray-200/50 w-full max-w-sm">
                  <h2 className="text-3xl font-black text-gray-900 tracking-tighter mb-4">
                    Access Locked.
                  </h2>
                  <p className="text-sm text-gray-500 font-medium mb-12 leading-relaxed">
                    {dayLockDetails.unlockTime
                      ? `Next lesson unlocks at midnight.`
                      : dayLockDetails.reason || "Complete previous day first."}
                  </p>

                  {dayLockDetails.unlockTime && (
                    <>
                      <p className="text-[10px] font-black text-primary uppercase tracking-[0.4em] mb-6">
                        Available In
                      </p>
                      <p className="text-5xl font-black text-gray-900 tabular-nums tracking-tighter">
                        {timeToUnlock}
                      </p>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="animate-fade-in space-y-6 w-full">
                  <div className="bg-white p-6 md:p-10 border border-gray-100 shadow-sm rounded-3xl animate-slide-up relative overflow-hidden min-h-[200px]">
                    <div className="space-y-2">
                      <SectionHeading>Today's Insight</SectionHeading>
                      <div className="text-gray-700 font-medium text-base leading-[1.6] max-w-[60ch]">
                        <FormattedText text={dayContent?.lessonText || ""} />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6 w-full animate-slide-up relative overflow-hidden">
                    <div className="space-y-6">
                    {(() => {
                      const taskUI = (
                        <>
                          {dayContent?.taskPrompts &&
                          dayContent.taskPrompts.length > 1 ? (
                            <AnimatePresence mode="wait">
                              {dayContent.taskPrompts.map((prompt, i) => {
                                if (i !== activeTaskIndex) return null;
                                return (
                                  <motion.div
                              key={i}
                              initial={{ opacity: 0, x: 12 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -12 }}
                              transition={{ duration: 0.2, ease: "easeInOut" }}
                              className={isFullBleed 
                                ? "fixed inset-0 z-50 bg-transparent overflow-y-auto w-screen h-screen px-4 md:px-12 py-12 md:py-20 text-left flex flex-col items-center animate-fade-in" 
                                : "p-6 bg-primary/5 rounded-2xl border border-primary/10 relative group text-left"
                              }
                            >
                              {/* Full-bleed Focus Toggle Button in Top Right */}
                              <div className="absolute top-4 right-4 z-55 flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setIsFullBleed(!isFullBleed)}
                                  className="p-2 rounded-xl bg-white hover:bg-gray-50 text-gray-500 hover:text-primary border border-gray-200 shadow-sm transition-all cursor-pointer flex items-center justify-center active:scale-95"
                                  title={isFullBleed ? "Exit Full-bleed" : "Full-bleed Focus"}
                                >
                                  <svg 
                                    xmlns="http://www.w3.org/2000/svg" 
                                    className={`h-4.5 w-4.5 transition-transform duration-300 ${isFullBleed ? 'rotate-180' : ''}`} 
                                    fill="none" 
                                    viewBox="0 0 24 24" 
                                    stroke="currentColor"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 19V5m0 0l-7 7m7-7l7 7" />
                                  </svg>
                                </button>
                              </div>

                              <div className={isFullBleed ? "w-full max-w-4xl mx-auto space-y-6 flex flex-col relative" : "relative z-10"}>
                                <SectionHeading>
                                  Action Step <strong className="font-bold">↗</strong> {i + 1}
                                </SectionHeading>

                                {isFullBleed && (
                                  <div className="w-full mb-8">
                                    <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-widest text-emerald-600 mb-2.5">
                                      <span className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                        Momentum Monitor: Step {i + 1} of {dayContent?.taskPrompts?.length || 1}
                                      </span>
                                      <span className="font-bold">{Math.round(((i) / (dayContent?.taskPrompts?.length || 1)) * 100)}% Complete</span>
                                    </div>
                                    <div className="w-full bg-emerald-500/10 rounded-full h-2 overflow-hidden shadow-inner font-sans">
                                      <div 
                                        className="bg-emerald-500 h-full rounded-full transition-all duration-500 ease-out animate-pulse" 
                                        style={{ width: `${((i + 1) / (dayContent?.taskPrompts?.length || 1)) * 100}%` }}
                                      />
                                    </div>
                                  </div>
                                )}

                              {dayContent?.taskNotes?.[i] && (
                                <div className="mb-4 text-left border-l-4 border-emerald-500/30 pl-4 py-1 animate-fade-in text-gray-700 font-bold text-sm sm:text-base leading-relaxed">
                                  <FormattedText text={dayContent.taskNotes[i]} />
                                </div>
                              )}

                              {(() => {
                                const dynamicNoteRaw = dayContent?.taskTagNotes?.[i] || '';
                                if (!dynamicNoteRaw.trim()) return null;

                                let displayNoteText = '';
                                try {
                                  if (dynamicNoteRaw.startsWith('{')) {
                                    const parsed = JSON.parse(dynamicNoteRaw);
                                    displayNoteText = Object.values(parsed).filter(Boolean)[0] as string || '';
                                  } else {
                                    displayNoteText = dynamicNoteRaw;
                                  }
                                } catch (e) {
                                  displayNoteText = dynamicNoteRaw;
                                }

                                if (!displayNoteText.trim()) return null;

                                const linkedTags = getLinkedTagsForStep(i);
                                if (linkedTags.length === 0) return null;

                                return (
                                  <div className="mb-4 text-left border-l-4 border-emerald-500/30 pl-4 py-1.5 animate-fade-in space-y-1.5">
                                    <div className="text-gray-700 font-bold text-sm sm:text-base leading-relaxed">
                                      <FormattedText text={displayNoteText} />
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                                      {linkedTags.map((tag, tagIndex) => (
                                        <span key={tagIndex} className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-800 border border-indigo-100 px-2.5 py-0.5 rounded-full font-black italic text-[9px] uppercase shadow-sm">
                                          🏷️ {tag}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })()}

                              <div className={`text-gray-950 font-black text-lg sm:text-xl md:text-2xl leading-relaxed ${dayContent?.taskFootnotes?.[i] ? 'mb-2' : 'mb-4'}`}>
                                <FormattedText text={prompt} />
                              </div>
                              {dayContent?.taskFootnotes?.[i] && (
                                <div className="mb-4 text-left text-emerald-600 font-bold text-sm sm:text-base leading-relaxed animate-fade-in">
                                  <FormattedText text={dayContent.taskFootnotes[i]} />
                                </div>
                              )}
                              {dayContent.taskHints?.[i] && (
                                <div className="mb-4">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setRevealedHints((prev) => ({
                                        ...prev,
                                        [i]: !prev[i],
                                      }))
                                    }
                                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-widest transition-all ${revealedHints[i] ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-400 hover:text-primary hover:bg-primary/5"}`}
                                  >
                                    <svg
                                      className={`w-2.5 h-2.5 transition-transform duration-300 ${revealedHints[i] ? "rotate-180" : ""}`}
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={3}
                                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                      />
                                    </svg>
                                    <span>Hint</span>
                                  </button>
                                  {revealedHints[i] && (
                                    <div className="mt-3 p-3 bg-amber-50/50 border border-amber-100/70 rounded-xl text-[11px] sm:text-xs font-medium text-amber-900/90 animate-fade-in leading-relaxed italic">
                                      <FormattedText
                                        text={dayContent.taskHints[i]}
                                      />
                                    </div>
                                  )}
                                </div>
                              )}
                              {!dayProgress?.completed &&
                                (dayContent.taskInputTypes?.[i] === "tags" ? (
                                  <TagInput
                                    value={taskInputs[i]}
                                    onChange={(newVal) => {
                                      const newInputs = [...taskInputs];
                                      newInputs[i] = newVal;
                                      setTaskInputs(newInputs);
                                    }}
                                    onNext={() => {
                                      const tagsVal = taskInputs[i];
                                      const isValid = !!tagsVal && tagsVal !== "[]" && tagsVal !== "";
                                      if (isValid) {
                                        if (i < (dayContent.taskPrompts?.length || 0) - 1) {
                                          saveParticipantInputImmediately(taskInputs);
                                          setActiveTaskIndex(i + 1);
                                        } else if (isProofMet) {
                                          handleFinishDay();
                                        }
                                      }
                                    }}
                                    placeholder="Type and press Enter to add tags..."
                                  />
                                ) : dayContent.taskInputTypes?.[i] === "note" ? (
                                  <div className="space-y-4 animate-fade-in text-left">
                                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/15 rounded-2xl flex items-center gap-3">
                                      <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                      </div>
                                      <div>
                                        <p className="text-xs font-black text-emerald-800 uppercase tracking-widest">Informational Step Completed</p>
                                        <p className="text-xs text-emerald-700 font-medium font-semibold">Review the notes above and click Next to continue.</p>
                                      </div>
                                    </div>
                                  </div>
                                ) : dayContent.taskInputTypes?.[i] ===
                                  "poll" ? (
                                  <div className="space-y-2">
                                    {(() => {
                                      let pollOptions: string[] = [];
                                      let customOptions: string[] = [];
                                      if (dayContent.taskPollOptions?.[i]) {
                                        try {
                                          customOptions = JSON.parse(
                                            dayContent.taskPollOptions[i],
                                          );
                                        } catch (e) {}
                                      }
                                      customOptions = customOptions.filter(Boolean);

                                      // If Tag Note is ON, it does NOT receive tags. The poll acts like standard default.
                                       if (dayContent.taskTagNoteActive?.[i]) {
                                         pollOptions = customOptions;
                                       } else {
                                         // If Tag Note is OFF, merge the dynamic tags from previous steps as choices
                                         const linkedTags = getLinkedTagsForStep(i);
                                         pollOptions = Array.from(new Set([...linkedTags, ...customOptions])).filter(Boolean);
                                       }

                                      // MULTI-SELECT SUPPORTED
                                      const isMultiSelect = !!dayContent.taskPollMultiSelect?.[i];
                                      let selectedOpts: string[] = [];
                                      try {
                                        if (taskInputs[i] && taskInputs[i].startsWith("[")) {
                                          selectedOpts = JSON.parse(taskInputs[i]);
                                        } else if (taskInputs[i]) {
                                          selectedOpts = [taskInputs[i]];
                                        }
                                      } catch (e) {}

                                      if (pollOptions.length > 6) {
                                        if (isMultiSelect) {
                                          return (
                                            <>
                                              <p className="text-[10px] font-black uppercase text-primary tracking-widest pl-1 mb-2 animate-pulse flex items-center gap-1.5">
                                                <span>☑️ Select one or more:</span>
                                              </p>
                                              <div className="flex flex-wrap gap-1.5 w-full">
                                                {pollOptions
                                                  .filter(Boolean)
                                                  .map((opt: string, optIndex: number) => {
                                                    const isSel = selectedOpts.includes(opt);
                                                    return (
                                                      <button
                                                        key={optIndex}
                                                        type="button"
                                                        onClick={() => {
                                                          const newInputs = [...taskInputs];
                                                          const indexInSel = selectedOpts.indexOf(opt);
                                                          let newSelected: string[];
                                                          if (indexInSel !== -1) {
                                                            newSelected = selectedOpts.filter(o => o !== opt);
                                                          } else {
                                                            newSelected = [...selectedOpts, opt];
                                                          }
                                                          newInputs[i] = JSON.stringify(newSelected);
                                                          setTaskInputs(newInputs);
                                                        }}
                                                        className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all border ${isSel ? "bg-primary text-white border-primary shadow-md" : "bg-gray-50 border-gray-100 text-gray-400 hover:bg-gray-100 hover:text-gray-600"}`}
                                                      >
                                                        {opt}
                                                      </button>
                                                    );
                                                  })}
                                              </div>
                                            </>
                                          );
                                        }

                                        return (
                                          <div className="flex flex-wrap gap-1.5 w-full">
                                            {pollOptions
                                              .filter(Boolean)
                                              .map((opt: string, optIndex: number) => {
                                                const isSel = taskInputs[i] === opt;
                                                return (
                                                  <button
                                                    key={optIndex}
                                                    type="button"
                                                    onClick={() => {
                                                      const newInputs = [...taskInputs];
                                                      newInputs[i] = opt;
                                                      setTaskInputs(newInputs);
                                                    }}
                                                    className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all border ${isSel ? "bg-primary text-white border-primary shadow-md" : "bg-gray-50 border-gray-100 text-gray-400 hover:bg-gray-100 hover:text-gray-600"}`}
                                                  >
                                                    {opt}
                                                  </button>
                                                );
                                              })}
                                          </div>
                                        );
                                      }

                                      if (isMultiSelect) {
                                        return (
                                          <>
                                            <p className="text-[10px] font-black uppercase text-primary tracking-widest pl-1 mb-2 animate-pulse flex items-center gap-1.5">
                                              <span>☑️ Select one or more:</span>
                                            </p>
                                            <div className="space-y-2 w-full">
                                              {pollOptions
                                                .filter(Boolean)
                                                .map((opt: string, optIndex: number) => {
                                                  const isSel = selectedOpts.includes(opt);
                                                  return (
                                                    <button
                                                      key={optIndex}
                                                      type="button"
                                                      onClick={() => {
                                                        const newInputs = [...taskInputs];
                                                        const indexInSel = selectedOpts.indexOf(opt);
                                                        let newSelected: string[];
                                                        if (indexInSel !== -1) {
                                                          newSelected = selectedOpts.filter(o => o !== opt);
                                                        } else {
                                                          newSelected = [...selectedOpts, opt];
                                                        }
                                                        newInputs[i] = JSON.stringify(newSelected);
                                                        setTaskInputs(newInputs);
                                                      }}
                                                      className={`w-full py-3 px-4 rounded-xl text-sm font-bold transition-all text-left border flex items-center justify-between ${isSel ? "bg-primary/10 border-primary text-primary" : "bg-white border-primary/10 hover:border-primary/30 text-gray-700"}`}
                                                    >
                                                      <span>
                                                        {String.fromCharCode(65 + optIndex)}. {opt}
                                                      </span>
                                                      <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${isSel ? "border-primary bg-primary text-white" : "border-gray-300 bg-white"}`}>
                                                        {isSel && (
                                                          <svg className="w-2.5 h-2.5 text-white animate-fade-in" fill="none" stroke="currentColor" strokeWidth={4} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                                                        )}
                                                      </div>
                                                    </button>
                                                  );
                                                })}
                                            </div>
                                          </>
                                        );
                                      }

                                      return pollOptions
                                        .filter(Boolean)
                                        .map(
                                          (opt: string, optIndex: number) => (
                                            <button
                                              key={optIndex}
                                              type="button"
                                              onClick={() => {
                                                const newInputs = [
                                                  ...taskInputs,
                                                ];
                                                newInputs[i] = opt;
                                                setTaskInputs(newInputs);
                                              }}
                                              className={`w-full py-3 px-4 rounded-xl text-sm font-bold transition-all text-left border ${taskInputs[i] === opt ? "bg-primary/10 border-primary text-primary" : "bg-white border-primary/10 hover:border-primary/30 text-gray-700"}`}
                                            >
                                              {String.fromCharCode(
                                                65 + optIndex,
                                              )}
                                              . {opt}
                                            </button>
                                          ),
                                        );
                                    })()}
                                  </div>
                                  ) : dayContent.taskInputTypes?.[i] === "mark" ? (
                                    <div className="space-y-4 animate-fade-in text-left">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const newInputs = [...taskInputs];
                                          if (newInputs[i] === "Completed") {
                                            newInputs[i] = "";
                                          } else {
                                            newInputs[i] = "Completed";
                                          }
                                          setTaskInputs(newInputs);
                                        }}
                                        className={`w-full p-4 rounded-2xl border flex items-center justify-between transition-all duration-200 shadow-sm cursor-pointer ${taskInputs[i] === "Completed" ? "bg-emerald-500/10 border-emerald-500/35 text-emerald-950" : "bg-white border-primary/10 hover:border-primary/20 text-gray-700 hover:bg-gray-50/50"}`}
                                      >
                                        <div className="flex items-center gap-3">
                                          <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${taskInputs[i] === "Completed" ? "border-emerald-500 bg-emerald-500 text-white" : "border-gray-300 bg-white"}`}>
                                            {taskInputs[i] === "Completed" && (
                                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                              </svg>
                                            )}
                                          </div>
                                          <span className="text-sm font-bold tracking-wide">
                                            {taskInputs[i] === "Completed" ? "Completed & Verified!" : "Mark as Completed"}
                                          </span>
                                        </div>
                                        {taskInputs[i] === "Completed" && (
                                          <span className="text-[9px] font-black text-emerald-600 bg-emerald-100 px-2.5 py-0.5 rounded-full uppercase tracking-widest shrink-0">
                                            DONE
                                          </span>
                                        )}
                                      </button>
                                    </div>
                                  ) : isLinkedTextStep(i) && getLinkedTagsForStep(i).length > 0 ? (
                                    <div className="space-y-4 animate-fade-in text-left">
                                      {getLinkedTagsForStep(i).map((tag, tagIndex) => {
                                        let currentAnswers: Record<string, string> = {};
                                        if (taskInputs[i]) {
                                          try {
                                            if (taskInputs[i].startsWith("{")) {
                                              currentAnswers = JSON.parse(taskInputs[i]);
                                            } else {
                                              currentAnswers = { [getLinkedTagsForStep(i)[0] || "default"]: taskInputs[i] };
                                            }
                                          } catch (e) {
                                            currentAnswers = {};
                                          }
                                        }
                                        const tagVal = currentAnswers[tag] || "";
                                        return (
                                          <div key={tagIndex} className="space-y-1.5 pl-3 border-l-2 border-primary/20">
                                            <div className="flex items-center">
                                              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-primary/10 text-primary">
                                                🏷️ {tag}
                                              </span>
                                            </div>
                                            <AutoGrowingTextarea
                                              value={tagVal}
                                              onChange={(val) => {
                                                const newAnswers = { ...currentAnswers, [tag]: val };
                                                const newInputs = [...taskInputs];
                                                newInputs[i] = JSON.stringify(newAnswers);
                                                setTaskInputs(newInputs);
                                              }}
                                              placeholder={`Your answer for ${tag}...`}
                                              className="w-full px-4 py-3 bg-white border border-primary/10 rounded-xl text-sm font-medium focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none transition-all resize-none"
                                            />
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <AutoGrowingTextarea
                                      value={taskInputs[i] || ""}
                                      onChange={(val) => {
                                        const newInputs = [...taskInputs];
                                        newInputs[i] = val;
                                        setTaskInputs(newInputs);
                                      }}
                                      placeholder="What's on your mind..."
                                      className="w-full px-4 py-3 bg-white border border-primary/10 rounded-xl text-sm font-medium focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none transition-all resize-none animate-fade-in"
                                    />
                                  ))}
                              {dayProgress?.completed && (
                                <div className="px-4 py-3 bg-white/50 border border-primary/10 rounded-xl text-sm font-bold text-primary italic flex gap-2 overflow-hidden flex-wrap w-full items-center">
                                  <svg
                                    className="w-4 h-4 shrink-0"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                  {dayContent.taskInputTypes?.[i] === "tags"
                                    ? (taskInputs[i] &&
                                      taskInputs[i].startsWith("[")
                                        ? JSON.parse(taskInputs[i] || "[]")
                                        : taskInputs[i]
                                          ? taskInputs[i]
                                              .split(",")
                                              .filter(Boolean)
                                          : []
                                      ).map((tag: string, tIndex: number) => (
                                        <span
                                          key={tIndex}
                                          className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-primary/10 text-primary"
                                        >
                                          {tag}
                                        </span>
                                      ))
                                    : isLinkedTextStep(i) && taskInputs[i]?.startsWith("{") ? (
                                      <div className="space-y-2 w-full text-left font-medium">
                                        {(() => {
                                          try {
                                            const parsed = JSON.parse(taskInputs[i]);
                                            return Object.entries(parsed).map(([tag, ans], idx) => (
                                              <div key={idx} className="flex flex-col gap-1 border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-semibold bg-primary/10 text-primary self-start uppercase tracking-wider">
                                                  🏷️ {tag}
                                                </span>
                                                <p className="text-gray-700 font-medium text-xs pl-1">
                                                  {ans as string}
                                                </p>
                                              </div>
                                            ));
                                          } catch (e) {
                                            return taskInputs[i];
                                          }
                                        })()}
                                      </div>
                                    ) : (
                                      taskInputs[i] || "Completed"
                                    )}
                                </div>
                              )}
                              {!dayProgress?.completed && (
                                <div className="absolute top-6 right-16 w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse z-40"></div>
                              )}
                              {i === activeTaskIndex && (
                                <div className="mt-4 flex justify-between items-center gap-4">
                                  {i > 0 ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        saveParticipantInputImmediately(taskInputs);
                                        setActiveTaskIndex(i - 1);
                                      }}
                                      className="px-6 py-2.5 rounded-xl text-xs font-bold transition-all bg-white border border-gray-200 text-gray-500 hover:text-primary hover:border-primary/30"
                                    >
                                      Back
                                    </button>
                                  ) : (
                                    <div></div>
                                  )}

                                  {i <
                                    (dayContent.taskPrompts?.length || 0) - 1 &&
                                    (() => {
                                      const val = taskInputs[i];
                                      const isTags =
                                        dayContent.taskInputTypes?.[i] ===
                                        "tags";
                                      const isNote =
                                        dayContent.taskInputTypes?.[i] ===
                                        "note";
                                      const isMark =
                                        dayContent.taskInputTypes?.[i] ===
                                        "mark";
                                      
                                      let stepCompleted = isNote;
                                      if (isMark) {
                                        stepCompleted = val === "Completed";
                                      } else if (!isNote && !!val) {
                                        if (isTags) {
                                          stepCompleted = val !== "[]" && val !== "";
                                        } else if (isLinkedTextStep(i)) {
                                          const tags = getLinkedTagsForStep(i);
                                          if (tags.length > 0) {
                                            try {
                                              if (val.startsWith("{")) {
                                                const parsed = JSON.parse(val);
                                                stepCompleted = tags.every(t => parsed[t] && parsed[t].trim().length > 0);
                                              } else {
                                                stepCompleted = false;
                                              }
                                            } catch (e) {
                                              stepCompleted = false;
                                            }
                                          } else {
                                            stepCompleted = val.trim().length > 0;
                                          }
                                        } else {
                                          stepCompleted = val.trim().length > 0;
                                        }
                                      }

                                      const isValid =
                                        !!dayProgress?.completed || stepCompleted;
                                      return (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            { saveParticipantInputImmediately(taskInputs); setActiveTaskIndex(i + 1); }
                                          }
                                          disabled={!isValid}
                                          className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${isValid ? "bg-primary text-white hover:shadow-lg hover:shadow-primary/20 cursor-pointer active:scale-95" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}
                                        >
                                          Next
                                        </button>
                                      );
                                    })()}
                                </div>
                              )}
                              {isFullBleed && i === (dayContent.taskPrompts?.length || 1) - 1 && (
                                <div className="mt-8 pt-6 border-t border-gray-100/50 flex flex-col gap-4">
                                  {!dayProgress?.completed ? (
                                    <button
                                      type="button"
                                      onClick={handleFinishDay}
                                      disabled={isSubmitting || !isProofMet}
                                      className={`w-full py-4.5 rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-md transition-all ${isProofMet ? "bg-[#159E5B] text-white active:scale-95 cursor-pointer hover:shadow-lg" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}
                                    >
                                      Today's task completed
                                    </button>
                                  ) : (
                                    <div className="w-full py-4 bg-gray-50 text-gray-400 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-center border border-gray-100">
                                      Mission Complete
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                      </AnimatePresence>
                    ) : (
                      <div 
                          className={isFullBleed 
                            ? "fixed inset-0 z-50 bg-transparent overflow-y-auto w-screen h-screen px-4 md:px-12 py-12 md:py-20 text-left flex flex-col items-center animate-fade-in" 
                            : "p-6 bg-primary/5 rounded-2xl border border-primary/10 relative group text-left"
                          }
                        >
                        {/* Full-bleed Focus Toggle Button in Top Right */}
                        <div className="absolute top-4 right-4 z-55 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setIsFullBleed(!isFullBleed)}
                            className="p-2 rounded-xl bg-white hover:bg-gray-50 text-gray-500 hover:text-primary border border-gray-200 shadow-sm transition-all cursor-pointer flex items-center justify-center active:scale-95"
                            title={isFullBleed ? "Exit Full-bleed" : "Full-bleed Focus"}
                          >
                            <svg 
                              xmlns="http://www.w3.org/2000/svg" 
                              className={`h-4.5 w-4.5 transition-transform duration-300 ${isFullBleed ? 'rotate-180' : ''}`} 
                              fill="none" 
                              viewBox="0 0 24 24" 
                              stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 19V5m0 0l-7 7m7-7l7 7" />
                            </svg>
                          </button>
                        </div>

                        <div className={isFullBleed ? "w-full max-w-4xl mx-auto space-y-6 flex flex-col relative" : "relative z-10"}>
                          <SectionHeading>
                            {isFullBleed ? (
                              <>Action Step <strong className="font-bold">↗</strong> 1</>
                            ) : (
                              "Today's Action Steps"
                            )}
                          </SectionHeading>

                          {isFullBleed && (
                            <div className="w-full mb-8">
                              <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-widest text-[#0E7850] mb-2.5">
                                <span className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                  Momentum Monitor: Step 1 of 1
                                </span>
                                <span className="font-bold">{dayProgress?.completed ? "100" : "0"}% Complete</span>
                              </div>
                              <div className="w-full bg-emerald-500/10 rounded-full h-2 overflow-hidden shadow-inner font-sans">
                                <div 
                                  className="bg-emerald-500 h-full rounded-full transition-all duration-500 ease-out animate-pulse" 
                                  style={{ width: dayProgress?.completed ? "100%" : "50%" }}
                                />
                              </div>
                            </div>
                          )}
                        {dayContent?.taskNotes?.[0] && (
                          <div className="mb-4 text-left border-l-4 border-emerald-500/30 pl-4 py-1 animate-fade-in text-gray-700 font-bold text-sm sm:text-base leading-relaxed">
                            <FormattedText text={dayContent.taskNotes[0]} />
                          </div>
                        )}

                        {(() => {
                          const dynamicNoteRaw = dayContent?.taskTagNotes?.[0] || '';
                          if (!dynamicNoteRaw.trim()) return null;

                          let displayNoteText = '';
                          try {
                            if (dynamicNoteRaw.startsWith('{')) {
                              const parsed = JSON.parse(dynamicNoteRaw);
                              displayNoteText = Object.values(parsed).filter(Boolean)[0] as string || '';
                            } else {
                              displayNoteText = dynamicNoteRaw;
                            }
                          } catch (e) {
                            displayNoteText = dynamicNoteRaw;
                          }

                          if (!displayNoteText.trim()) return null;

                          const linkedTags = getLinkedTagsForStep(0);
                          if (linkedTags.length === 0) return null;

                          return (
                            <div className="mb-4 text-left border-l-4 border-emerald-500/30 pl-4 py-1.5 animate-fade-in space-y-1.5">
                              <div className="text-gray-700 font-bold text-sm sm:text-base leading-relaxed">
                                <FormattedText text={displayNoteText} />
                              </div>
                              <div className="flex flex-wrap gap-1.5 pt-0.5">
                                {linkedTags.map((tag, tagIndex) => (
                                  <span key={tagIndex} className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-800 border border-indigo-100 px-2.5 py-0.5 rounded-full font-black italic text-[9px] uppercase shadow-sm">
                                    🏷️ {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        })()}
                        <div className={`text-gray-950 font-black text-lg sm:text-xl md:text-2xl leading-relaxed ${dayContent?.taskFootnotes?.[0] ? 'mb-2' : 'mb-4'}`}>
                          <FormattedText text={dayContent?.taskPrompt || ""} />
                        </div>
                        {dayContent?.taskFootnotes?.[0] && (
                          <div className="mb-4 text-left text-emerald-600 font-bold text-sm sm:text-base leading-relaxed animate-fade-in">
                            <FormattedText text={dayContent.taskFootnotes[0]} />
                          </div>
                        )}
                        {dayContent?.taskHints?.[0] && (
                          <div className="mb-4">
                            <button
                              type="button"
                              onClick={() =>
                                setRevealedHints((prev) => ({
                                  ...prev,
                                  0: !prev[0],
                                }))
                              }
                              className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-widest transition-all ${revealedHints[0] ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-400 hover:text-primary hover:bg-primary/5"}`}
                            >
                              <svg
                                className={`w-2.5 h-2.5 transition-transform duration-300 ${revealedHints[0] ? "rotate-180" : ""}`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={3}
                                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                              <span>Hint</span>
                            </button>
                            {revealedHints[0] && (
                              <div className="mt-3 p-3 bg-amber-50/50 border border-amber-100/70 rounded-xl text-[11px] sm:text-xs font-medium text-amber-900/90 animate-fade-in leading-relaxed italic">
                                <FormattedText text={dayContent.taskHints[0]} />
                              </div>
                            )}
                          </div>
                        )}
                        {!dayProgress?.completed &&
                          (dayContent?.taskInputTypes?.[0] === "tags" ? (
                            <TagInput
                              value={taskInputs[0]}
                              onChange={(newVal) => {
                                const newInputs = [...taskInputs];
                                newInputs[0] = newVal;
                                setTaskInputs(newInputs);
                              }}
                              onNext={() => {
                                const tagsVal = taskInputs[0];
                                const isValid = !!tagsVal && tagsVal !== "[]" && tagsVal !== "";
                                if (isValid && isProofMet) {
                                  handleFinishDay();
                                }
                              }}
                              placeholder="Type and press Enter to add tags..."
                            />
                          ) : dayContent?.taskInputTypes?.[0] === "poll" ? (
                            <div className="space-y-2">
                              {(() => {
                                let pollOpts: string[] = [];
                                try {
                                  pollOpts = JSON.parse(
                                    dayContent.taskPollOptions?.[0] || "[]",
                                  );
                                } catch (e) {}
                                const isMultiSelect = !!dayContent?.taskPollMultiSelect?.[0];
                                let selectedOpts: string[] = [];
                                try {
                                  if (taskInputs[0] && taskInputs[0].startsWith("[")) {
                                    selectedOpts = JSON.parse(taskInputs[0]);
                                  } else if (taskInputs[0]) {
                                    selectedOpts = [taskInputs[0]];
                                  }
                                } catch (e) {}

                                if (pollOpts.length > 6) {
                                  if (isMultiSelect) {
                                    return (
                                      <>
                                        <p className="text-[10px] font-black uppercase text-primary tracking-widest pl-1 mb-2 animate-pulse flex items-center gap-1.5">
                                          <span>☑️ Select one or more:</span>
                                        </p>
                                        <div className="flex flex-wrap gap-1.5 w-full">
                                          {pollOpts
                                            .filter(Boolean)
                                            .map((opt, optIndex) => {
                                              const isSel = selectedOpts.includes(opt);
                                              return (
                                                <button
                                                  key={optIndex}
                                                  type="button"
                                                  onClick={() => {
                                                    const newInputs = [...taskInputs];
                                                    const indexInSel = selectedOpts.indexOf(opt);
                                                    let newSelected: string[];
                                                    if (indexInSel !== -1) {
                                                      newSelected = selectedOpts.filter(o => o !== opt);
                                                    } else {
                                                      newSelected = [...selectedOpts, opt];
                                                    }
                                                    newInputs[0] = JSON.stringify(newSelected);
                                                    setTaskInputs(newInputs);
                                                  }}
                                                  className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all border ${isSel ? "bg-primary text-white border-primary shadow-md" : "bg-gray-50 border-gray-100 text-gray-400 hover:bg-gray-100 hover:text-gray-600"}`}
                                                >
                                                  {opt}
                                                </button>
                                              );
                                            })}
                                        </div>
                                      </>
                                    );
                                  }

                                  return (
                                    <div className="flex flex-wrap gap-1.5 w-full">
                                      {pollOpts
                                        .filter(Boolean)
                                        .map((opt, optIndex) => {
                                          const isSel = taskInputs[0] === opt;
                                          return (
                                            <button
                                              key={optIndex}
                                              type="button"
                                              onClick={() => {
                                                const newInputs = [...taskInputs];
                                                newInputs[0] = opt;
                                                setTaskInputs(newInputs);
                                              }}
                                              className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all border ${isSel ? "bg-primary text-white border-primary shadow-md" : "bg-gray-50 border-gray-100 text-gray-400 hover:bg-gray-100 hover:text-gray-600"}`}
                                            >
                                              {opt}
                                            </button>
                                          );
                                        })}
                                    </div>
                                  );
                                }

                                if (isMultiSelect) {
                                  return (
                                    <>
                                      <p className="text-[10px] font-black uppercase text-primary tracking-widest pl-1 mb-2 animate-pulse flex items-center gap-1.5">
                                        <span>☑️ Select one or more:</span>
                                      </p>
                                      <div className="space-y-2 w-full">
                                        {pollOpts
                                          .filter(Boolean)
                                          .map((opt, optIndex) => {
                                            const isSel = selectedOpts.includes(opt);
                                            return (
                                              <button
                                                key={optIndex}
                                                type="button"
                                                onClick={() => {
                                                  const newInputs = [...taskInputs];
                                                  const indexInSel = selectedOpts.indexOf(opt);
                                                  let newSelected: string[];
                                                  if (indexInSel !== -1) {
                                                    newSelected = selectedOpts.filter(o => o !== opt);
                                                  } else {
                                                    newSelected = [...selectedOpts, opt];
                                                  }
                                                  newInputs[0] = JSON.stringify(newSelected);
                                                  setTaskInputs(newInputs);
                                                }}
                                                className={`w-full py-3 px-4 rounded-xl text-sm font-bold transition-all text-left border flex items-center justify-between ${isSel ? "bg-primary/10 border-primary text-primary" : "bg-white border-primary/10 hover:border-primary/30 text-gray-700"}`}
                                              >
                                                <span>
                                                  {String.fromCharCode(65 + optIndex)}. {opt}
                                                </span>
                                                <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${isSel ? "border-primary bg-primary text-white" : "border-gray-300 bg-white"}`}>
                                                  {isSel && (
                                                    <svg className="w-2.5 h-2.5 text-white animate-fade-in" fill="none" stroke="currentColor" strokeWidth={4} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                                                  )}
                                                </div>
                                              </button>
                                            );
                                          })}
                                      </div>
                                    </>
                                  );
                                }

                                return pollOpts
                                  .filter(Boolean)
                                  .map((opt, optIndex) => (
                                    <button
                                      key={optIndex}
                                      type="button"
                                      onClick={() => {
                                        const newInputs = [...taskInputs];
                                        newInputs[0] = opt;
                                        setTaskInputs(newInputs);
                                      }}
                                      className={`w-full py-3 px-4 rounded-xl text-sm font-bold transition-all text-left border ${taskInputs[0] === opt ? "bg-primary/10 border-primary text-primary" : "bg-white border-primary/10 hover:border-primary/30 text-gray-700"}`}
                                    >
                                      {String.fromCharCode(65 + optIndex)}.{" "}
                                      {opt}
                                    </button>
                                  ));
                              })()}
                            </div>
                          ) : dayContent?.taskInputTypes?.[0] === "mark" ? (
                            <div className="space-y-4 animate-fade-in text-left">
                              <button
                                type="button"
                                onClick={() => {
                                  const newInputs = [...taskInputs];
                                  if (newInputs[0] === "Completed") {
                                    newInputs[0] = "";
                                  } else {
                                    newInputs[0] = "Completed";
                                  }
                                  setTaskInputs(newInputs);
                                }}
                                className={`w-full p-4 rounded-2xl border flex items-center justify-between transition-all duration-200 shadow-sm cursor-pointer ${taskInputs[0] === "Completed" ? "bg-emerald-500/10 border-emerald-500/35 text-emerald-950" : "bg-white border-primary/10 hover:border-primary/20 text-gray-700 hover:bg-gray-50/50"}`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${taskInputs[0] === "Completed" ? "border-emerald-500 bg-emerald-500 text-white" : "border-gray-300 bg-white"}`}>
                                    {taskInputs[0] === "Completed" && (
                                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                      </svg>
                                    )}
                                  </div>
                                  <span className="text-sm font-bold tracking-wide">
                                    {taskInputs[0] === "Completed" ? "Completed & Verified!" : "Mark as Completed"}
                                  </span>
                                </div>
                                {taskInputs[0] === "Completed" && (
                                  <span className="text-[9px] font-black text-emerald-600 bg-emerald-100 px-2.5 py-0.5 rounded-full uppercase tracking-widest shrink-0">
                                    DONE
                                  </span>
                                )}
                              </button>
                            </div>
                          ) : (
                            <AutoGrowingTextarea
                              value={taskInputs[0] || ""}
                              onChange={(val) => {
                                const newInputs = [...taskInputs];
                                newInputs[0] = val;
                                setTaskInputs(newInputs);
                              }}
                              placeholder="What's on your mind..."
                              className="w-full px-4 py-3 bg-white border border-primary/10 rounded-xl text-sm font-medium focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none transition-all resize-none animate-fade-in"
                            />
                          ))}
                        {dayProgress?.completed && (
                          <div className="px-4 py-3 bg-white/50 border border-primary/10 rounded-xl text-sm font-bold text-primary italic flex gap-2 overflow-hidden flex-wrap w-full items-center">
                            <svg
                              className="w-4 h-4 shrink-0"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                            {dayContent?.taskInputTypes?.[0] === "tags"
                              ? (taskInputs[0] && taskInputs[0].startsWith("[")
                                  ? JSON.parse(taskInputs[0] || "[]")
                                  : taskInputs[0]
                                    ? taskInputs[0].split(",").filter(Boolean)
                                    : []
                                ).map((tag: string, tIndex: number) => (
                                  <span
                                    key={tIndex}
                                    className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-primary/10 text-primary"
                                  >
                                    {tag}
                                  </span>
                                ))
                              : taskInputs[0] || "Completed"}
                          </div>
                        )}
                        {!dayProgress?.completed && (
                          <div className="absolute top-6 right-16 w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse z-40"></div>
                        )}
                        {isFullBleed && (
                          <div className="mt-8 pt-6 border-t border-gray-100/50 flex flex-col gap-4">
                            {!dayProgress?.completed ? (
                              <button
                                type="button"
                                onClick={handleFinishDay}
                                disabled={isSubmitting || !isProofMet}
                                className={`w-full py-4.5 rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-md transition-all ${isProofMet ? "bg-[#159E5B] text-white active:scale-95 cursor-pointer hover:shadow-lg" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}
                              >
                                Today's task completed
                              </button>
                            ) : (
                              <div className="w-full py-4 bg-gray-50 text-gray-400 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-center border border-gray-100">
                                Mission Complete
                              </div>
                            )}
                          </div>
                        )}
                        </div>
                      </div>
                    )}
                    {dayContent?.taskPrompts &&
                      dayContent.taskPrompts.length > 1 && (
                        <div className="flex justify-center items-center gap-2 mt-8">
                          {dayContent.taskPrompts.map((_, idx) => (
                            <button
                              type="button"
                              key={idx}
                              onClick={() => {
                                if (
                                  dayProgress?.completed ||
                                  idx < activeTaskIndex
                                ) {
                                  saveParticipantInputImmediately(taskInputs);
                                  setActiveTaskIndex(idx);
                                }
                              }}
                              className={`h-1.5 rounded-full transition-all duration-300 ${dayProgress?.completed || idx < activeTaskIndex ? "cursor-pointer" : "cursor-not-allowed"} ${idx === activeTaskIndex ? "w-8 bg-primary" : idx < activeTaskIndex ? "w-2 bg-primary/40 hover:bg-primary/60" : dayProgress?.completed ? "w-2 bg-primary/40 hover:bg-primary/60" : "w-2 bg-gray-200"}`}
                            />
                          ))}
                        </div>
                      )}
                        </>
                      );
                      return isFullBleed ? createPortal(
                        <div className="fixed inset-0 z-50 bg-white w-screen h-screen overflow-hidden">
                          {taskUI}
                        </div>,
                        document.body
                      ) : taskUI;
                    })()}
                  </div>

                  {!dayProgress?.completed &&
                    (activeTaskIndex ===
                      (dayContent?.taskPrompts?.length || 1) - 1 ||
                      !dayContent?.taskPrompts ||
                      dayContent.taskPrompts.length <= 1) && (
                      <div className="mt-12 space-y-6 animate-fade-in">
                        <button
                          onClick={handleFinishDay}
                          disabled={isSubmitting || !isProofMet}
                          className={`w-full py-5 rounded-2xl text-[11px] font-black uppercase tracking-[0.25em] shadow-xl transition-all ${isProofMet ? "bg-[#159E5B] text-white shadow-primary/10 active:scale-95" : "bg-gray-100 text-gray-400 cursor-not-allowed"} disabled:opacity-50`}
                        >
                          Today's task completed
                        </button>
                      </div>
                    )}

                  {dayProgress?.completed && (
                    <div className="mt-12 space-y-6">
                      <div className="w-full py-5 bg-gray-50 text-gray-400 rounded-2xl text-[11px] font-black uppercase tracking-[0.25em] text-center border border-gray-100">
                        Mission Complete
                      </div>

                      {dayContent?.mirrorActive && (
                        <button
                          type="button"
                          onClick={() => setIsMirrorReportModalOpen(true)}
                          className="w-full py-4.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded-2xl text-[11px] font-black uppercase tracking-[0.25em] text-center border border-emerald-100 transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                        >
                          <BookOpen className="w-4 h-4 text-emerald-650 shrink-0" size={16} />
                          Submitted version
                        </button>
                      )}

                      {dayProgress.proofSelection && (
                        <div className="animate-fade-in pt-4 border-t border-gray-50">
                          <p className="text-[7px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">
                            Confirmed Outcome
                          </p>
                          <div className="bg-gray-50 rounded-[1.5rem] p-4 border border-gray-100 flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-primary"></div>
                            <p className="text-xs font-black uppercase text-gray-700">
                              {dayProgress.proofSelection}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {sprint.checkInReminder && viewingDay === sprint.duration && (
                    <div className="flex items-center justify-between py-6 border-t border-gray-50 mt-12 animate-fade-in">
                      <div>
                        <span className="text-[10px] font-black text-gray-900 uppercase tracking-widest block mb-1">
                          Daily Check-in Reminder
                        </span>
                        <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">
                          Enable to stay consistent after the sprint
                        </p>
                      </div>
                      <button
                        onClick={handleToggleReminder}
                        className={`w-12 h-6 rounded-full transition-all duration-300 relative ${enrollment.checkInReminderEnabled ? "bg-primary shadow-lg shadow-primary/20" : "bg-gray-200"}`}
                      >
                        <div
                          className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-sm ${enrollment.checkInReminderEnabled ? "right-1" : "left-1"}`}
                        />
                      </button>
                    </div>
                  )}
                </div>
              </div>

                {sprint.checkInReminder && enrollment.checkInReminderEnabled &&
                  viewingDay === sprint.duration && (
                    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm animate-fade-in mt-6">
                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <button
                            onClick={() => setViewingDay(sprint.duration)}
                            className="group/title block text-left"
                          >
                            <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1 group-hover/title:text-primary/70 transition-colors">
                              Daily Check-in
                            </h3>
                          </button>
                          <p className="text-sm font-black text-gray-900">
                            Active for {sprint.checkInReminderDays || 0} days
                          </p>
                        </div>
                        <div className="text-right max-w-[150px]">
                          <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">
                            Last Sprint Submission
                          </p>
                          <p className="text-[10px] font-bold text-gray-600 line-clamp-2 italic">
                            "
                            {(() => {
                              const lastDayProg = enrollment.progress.find(
                                (p) => p.day === sprint.duration,
                              );
                              return (
                                lastDayProg?.submission ||
                                "No submission recorded"
                              );
                            })()}
                            "
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {Array.from(
                          { length: sprint.checkInReminderDays || 0 },
                          (_, i) => i + 1,
                        ).map((day) => {
                          const isCheckedIn = enrollment.checkInHistory?.some(
                            (h) => h.day === day,
                          );
                          return (
                            <button
                              key={day}
                              onClick={() => handleCheckIn(day)}
                              disabled={isCheckedIn}
                              className={`px-3 py-2 rounded-xl text-[10px] font-black transition-all active:scale-95 ${
                                isCheckedIn
                                  ? "bg-primary/10 text-primary border border-primary/20"
                                  : "bg-gray-50 text-gray-400 border border-gray-100 hover:border-primary/30"
                              }`}
                            >
                              Day {day} {isCheckedIn ? "✓" : ""}
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-[9px] text-gray-400 mt-4 font-medium">
                        Click a day to confirm your daily check-in.
                      </p>
                    </div>
                  )}
              </>
            )}
          </div>
        </div>

        <style>{`
                .modal-overlay {
                  position: fixed;
                  top: 0;
                  left: 0;
                  width: 100%;
                  height: 100vh;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  z-index: 100;
                  background-color: transparent;
                  pointer-events: auto;
                }
                .modal-content-wrapper {
                  width: 90%;
                  height: 90vh;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  background-color: transparent;
                  border-radius: 3rem;
                  pointer-events: auto;
                }
                .modal-content {
                  box-shadow: 0 0 60px rgba(0, 0, 0, 0.15), 0 20px 40px rgba(0, 0, 0, 0.1);
                  border: 1px solid rgba(0, 0, 0, 0.05);
                }
                @media (min-width: 768px) {
                  .modal-content-wrapper {
                    width: 60%;
                    height: 80vh;
                  }
                }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #E5E7EB; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #D1D5DB; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in { animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                .animate-slide-up { animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}</style>
      </div>

      <SprintSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        soundEnabled={soundEnabled}
        onToggleSound={toggleSoundState}
        notificationsEnabled={notificationsEnabled}
        onToggleNotifications={toggleNotificationsState}
      />
      <CoachingChatModal
        isOpen={isChatModalOpen}
        onClose={() => setIsChatModalOpen(false)}
        sprintId={sprint.id}
        participantId={user?.id || ""}
        day={viewingDay}
        sprintTitle={sprint.title}
      />
      <DayCompletionModal
        isOpen={isDayCompletionModalOpen}
        onClose={() => {
          setIsDayCompletionModalOpen(false);
          if (dayContent?.mirrorActive) {
            if (mirrorTimerRef.current) clearTimeout(mirrorTimerRef.current);
            mirrorTimerRef.current = setTimeout(() => {
              setIsMirrorReportModalOpen(true);
            }, 3000);
          }
        }}
        day={viewingDay}
      />
      <MirrorReportModal
        isOpen={isMirrorReportModalOpen}
        onClose={() => setIsMirrorReportModalOpen(false)}
        day={viewingDay}
        dayContent={dayContent}
        answers={taskInputs}
      />
      <SprintCompletionModal
        isOpen={isCompletionModalOpen}
        onClose={() => navigate("/dashboard", { replace: true })}
        onStartNext={handleCompletionModalAction}
        sprintTitle={sprint?.title}
        streakCount={(user as any)?.impactStats?.streak || 0}
      />
      <PushPermissionModal
        isOpen={isPushPermissionModalOpen}
        onAccept={handleAcceptPush}
        onDecline={handleDeclinePush}
        onIgnore={handleIgnorePush}
        isLoading={isSubmittingPush}
      />
      <ConfirmModal
        isOpen={confirmCheckInDay !== null}
        onClose={() => setConfirmCheckInDay(null)}
        onConfirm={() => {
          if (confirmCheckInDay !== null) {
            executeCheckIn(confirmCheckInDay);
          }
        }}
        title="Check-in Confirmation"
        message={`Ready to log your consistency for Day ${confirmCheckInDay || ""}? Tracking your progress is a key part of your growth journey.`}
        confirmText="Confirm Check-in"
        cancelText="Wait, not yet"
        variant="success"
      />
    </>
  );
};

export default SprintView;
