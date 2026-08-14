import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../services/firebase';
import { collection, doc, getDocs, updateDoc, addDoc, query, orderBy, limit } from 'firebase/firestore';
import { userService, safeClone } from '../../services/userService';
import { sprintService } from '../../services/sprintService';
import { Participant, ParticipantSprint, Sprint, DailyContent } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

export interface ProposedRepair {
  id: string; // unique ID for preview row
  enrollmentId: string;
  sprintId: string;
  sprintTitle: string;
  day: number;
  stepIndex: number;
  actionStepId: string;
  actionStepPrompt: string;
  currentDbValue: string;
  correctValue: string;
  changeReason: string;
  confidence: 'high' | 'low';
  status: 'Ready for Repair' | 'Needs Review';
  selected: boolean;
}

export interface RepairAuditLog {
  id: string;
  recordId: string;
  enrollmentId: string;
  userId: string;
  userEmail?: string;
  day: number;
  actionStepId: string;
  actionStepPrompt: string;
  oldValue: string;
  newValue: string;
  timestamp: string;
  adminEmail?: string;
}

export function getActionStepId(sprintId: string, day: number, stepIndex: number, prompt: string, dayContent?: DailyContent): string {
  if (dayContent?.taskStepIds?.[stepIndex]) {
    return dayContent.taskStepIds[stepIndex];
  }
  const promptSlug = prompt
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 35) || `step_${stepIndex}`;
  return `${sprintId}_d${day}_${promptSlug}`;
}

interface AdminRepairResponsesProps {
  initialUserId?: string;
}

export default function AdminRepairResponses({ initialUserId }: AdminRepairResponsesProps) {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<Participant[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>(initialUserId || '');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [proposedRepairs, setProposedRepairs] = useState<ProposedRepair[]>([]);
  const [analysisRan, setAnalysisRan] = useState(false);
  const [selectedRepairs, setSelectedRepairs] = useState<Record<string, boolean>>({});
  
  // Execution & Confirmation modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isExecutingRepair, setIsExecutingRepair] = useState(false);
  const [repairSuccessMessage, setRepairSuccessMessage] = useState<string | null>(null);

  // Audit Logs state
  const [auditLogs, setAuditLogs] = useState<RepairAuditLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [showLogsPanel, setShowLogsPanel] = useState(false);

  // Fetch users for dropdown
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const allUsers = await userService.getAllUsers();
        setUsers(allUsers);
        if (initialUserId) {
          setSelectedUserId(initialUserId);
        } else if (currentUser?.id && !selectedUserId) {
          setSelectedUserId(currentUser.id);
        }
      } catch (err) {
        console.error("Error loading users for repair tool:", err);
      }
    };
    loadUsers();
    fetchAuditLogs();
  }, [initialUserId, currentUser]);

  const fetchAuditLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const q = query(collection(db, 'system_repair_logs'), orderBy('timestamp', 'desc'), limit(50));
      const snap = await getDocs(q);
      const logs: RepairAuditLog[] = snap.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      } as RepairAuditLog));
      setAuditLogs(logs);
    } catch (err) {
      console.warn("Could not fetch repair audit logs from Firestore:", err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const selectedUser = useMemo(() => {
    return users.find(u => u.id === selectedUserId) || null;
  }, [users, selectedUserId]);

  // Core function: Load user responses, load sprint definitions, analyze & compare
  const handleAnalyzeResponses = async () => {
    if (!selectedUserId) return;
    setIsAnalyzing(true);
    setAnalysisRan(false);
    setProposedRepairs([]);
    setSelectedRepairs({});
    setRepairSuccessMessage(null);

    try {
      // 1. Load user database responses (enrollments)
      const userEnrollments = await sprintService.getUserEnrollments(selectedUserId);
      
      // 2. Load current sprint definitions
      const sprintMap: Record<string, Sprint> = {};
      const sprintIds = Array.from(new Set(userEnrollments.map(e => e.sprint_id).filter(Boolean)));
      
      for (const sId of sprintIds) {
        try {
          const sDef = await sprintService.getSprintById(sId);
          if (sDef) sprintMap[sId] = sDef;
        } catch (e) {
          console.warn(`Could not load sprint ${sId}:`, e);
        }
      }

      const repairs: ProposedRepair[] = [];

      // 3 & 4 & 5. Identify actionStepId, correct response, compare with current record
      for (const enrollment of userEnrollments) {
        const sprint = sprintMap[enrollment.sprint_id];
        if (!sprint || !enrollment.progress || !Array.isArray(enrollment.progress)) continue;

        for (const prog of enrollment.progress) {
          if (!prog || !prog.day) continue;
          
          const dayNum = prog.day;
          const dayContent = sprint.dailyContent?.find(d => d.day === dayNum);
          if (!dayContent) continue;

          const taskPrompts = dayContent.taskPrompts || (dayContent.taskPrompt ? [dayContent.taskPrompt] : []);
          const answers = prog.answers || [];
          const submission = prog.submission || "";
          const submissionParts = submission ? submission.split(" | ") : [];

          for (let stepIdx = 0; stepIdx < taskPrompts.length; stepIdx++) {
            const prompt = taskPrompts[stepIdx] || `Action Step ${stepIdx + 1}`;
            const actionStepId = getActionStepId(sprint.id, dayNum, stepIdx, prompt, dayContent);
            const inputType = dayContent.taskInputTypes?.[stepIdx] || 'text';
            const currentDbVal = answers[stepIdx] || "";

            let correctVal = currentDbVal;
            let changeReason = "";
            let confidence: 'high' | 'low' = 'high';
            let status: 'Ready for Repair' | 'Needs Review' = 'Ready for Repair';

            // Check poll options
            if (inputType === 'poll' && dayContent.taskPollOptions?.[stepIdx]) {
              let validPollOptions: string[] = [];
              try {
                const rawOpt = dayContent.taskPollOptions[stepIdx];
                if (typeof rawOpt === 'string') {
                  if (rawOpt.startsWith('[')) {
                    validPollOptions = JSON.parse(rawOpt);
                  } else {
                    validPollOptions = rawOpt.split(',').map(s => s.trim()).filter(Boolean);
                  }
                } else if (Array.isArray(rawOpt)) {
                  validPollOptions = rawOpt;
                }
              } catch (e) {}

              // Case A: JSON stringified array or escaped string e.g. '["Yes, often"]'
              let cleanCurrentVal = currentDbVal;
              if (currentDbVal.startsWith('[') && currentDbVal.endsWith(']')) {
                try {
                  const parsed = JSON.parse(currentDbVal);
                  if (Array.isArray(parsed) && parsed.length > 0) {
                    cleanCurrentVal = String(parsed[0]);
                  }
                } catch (e) {}
              }

              if (validPollOptions.includes(cleanCurrentVal)) {
                if (cleanCurrentVal !== currentDbVal) {
                  correctVal = cleanCurrentVal;
                  changeReason = "Unwrapped stringified JSON array to preserve exact poll option string.";
                  confidence = 'high';
                }
              } else {
                const subPart = submissionParts[stepIdx] || "";
                if (validPollOptions.includes(subPart)) {
                  correctVal = subPart;
                  changeReason = `Restored exact poll option text ('${subPart}') from submission record without comma splitting.`;
                  confidence = 'high';
                } else {
                  const matchingOpt = validPollOptions.find(opt => 
                    opt.toLowerCase() === currentDbVal.toLowerCase() ||
                    subPart.toLowerCase().includes(opt.toLowerCase()) ||
                    currentDbVal.toLowerCase().includes(opt.split(',')[0].toLowerCase())
                  );

                  if (matchingOpt) {
                    correctVal = matchingOpt;
                    changeReason = `Recombined comma-split fragment into exact full poll option text ('${matchingOpt}').`;
                    confidence = 'high';
                  } else if (currentDbVal) {
                    correctVal = currentDbVal;
                    changeReason = "Value does not match any predefined poll options. Marked for manual review.";
                    confidence = 'low';
                    status = 'Needs Review';
                  }
                }
              }
            } else if (inputType === 'tags') {
              if (currentDbVal.startsWith('[') && currentDbVal.endsWith(']')) {
                try {
                  const parsed = JSON.parse(currentDbVal);
                  if (Array.isArray(parsed)) {
                    correctVal = parsed.join(", ");
                    changeReason = "Formatted tag array into clean string value.";
                    confidence = 'high';
                  }
                } catch (e) {}
              }
            } else {
              if (!currentDbVal && submissionParts[stepIdx] && submissionParts[stepIdx].trim()) {
                correctVal = submissionParts[stepIdx];
                changeReason = "Re-aligned answer index from pipe-separated submission string.";
                confidence = 'high';
              } else if (currentDbVal.startsWith('{') || currentDbVal.startsWith('[')) {
                try {
                  const parsed = JSON.parse(currentDbVal);
                  if (typeof parsed === 'string') {
                    correctVal = parsed;
                    changeReason = "Unwrapped nested JSON string format.";
                    confidence = 'high';
                  }
                } catch (e) {}
              }
            }

            if (currentDbVal !== correctVal || status === 'Needs Review') {
              const itemKey = `${enrollment.id}_d${dayNum}_s${stepIdx}`;
              repairs.push({
                id: itemKey,
                enrollmentId: enrollment.id,
                sprintId: sprint.id,
                sprintTitle: sprint.title || 'Untitled Sprint',
                day: dayNum,
                stepIndex: stepIdx,
                actionStepId,
                actionStepPrompt: prompt,
                currentDbValue: currentDbVal || '(Empty)',
                correctValue: correctVal || '(Empty)',
                changeReason: changeReason || 'Discrepancy detected between database answers and expected value.',
                confidence,
                status,
                selected: confidence === 'high',
              });
            }
          }
        }
      }

      setProposedRepairs(repairs);
      
      const initialSelected: Record<string, boolean> = {};
      repairs.forEach(r => {
        initialSelected[r.id] = r.selected;
      });
      setSelectedRepairs(initialSelected);
      setAnalysisRan(true);

    } catch (err) {
      console.error("Error analyzing user responses:", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleRepairSelection = (repairId: string) => {
    setSelectedRepairs(prev => ({
      ...prev,
      [repairId]: !prev[repairId]
    }));
  };

  const toggleSelectAll = () => {
    const allSelected = proposedRepairs.every(r => selectedRepairs[r.id]);
    const newSelected: Record<string, boolean> = {};
    proposedRepairs.forEach(r => {
      newSelected[r.id] = !allSelected;
    });
    setSelectedRepairs(newSelected);
  };

  const selectedCount = Object.values(selectedRepairs).filter(Boolean).length;

  const handleExecuteRepair = async () => {
    if (selectedCount === 0 || !selectedUserId) return;
    setIsExecutingRepair(true);

    try {
      const userEnrollments = await sprintService.getUserEnrollments(selectedUserId);

      const selectedRepairItems = proposedRepairs.filter(r => selectedRepairs[r.id]);
      const repairsByEnrollment: Record<string, ProposedRepair[]> = {};

      selectedRepairItems.forEach(r => {
        if (!repairsByEnrollment[r.enrollmentId]) {
          repairsByEnrollment[r.enrollmentId] = [];
        }
        repairsByEnrollment[r.enrollmentId].push(r);
      });

      let repairedCount = 0;
      const newAuditLogs: RepairAuditLog[] = [];

      for (const enrollmentId of Object.keys(repairsByEnrollment)) {
        const enrollment = userEnrollments.find(e => e.id === enrollmentId);
        if (!enrollment || !enrollment.progress) continue;

        const enrollmentRepairs = repairsByEnrollment[enrollmentId];
        const updatedProgress = safeClone(enrollment.progress);

        for (const item of enrollmentRepairs) {
          const progIndex = updatedProgress.findIndex((p: any) => p.day === item.day);
          if (progIndex === -1) continue;

          if (!updatedProgress[progIndex].answers) {
            updatedProgress[progIndex].answers = [];
          }

          const oldVal = updatedProgress[progIndex].answers[item.stepIndex] || "";
          updatedProgress[progIndex].answers[item.stepIndex] = item.correctValue === '(Empty)' ? "" : item.correctValue;
          updatedProgress[progIndex].submission = updatedProgress[progIndex].answers.map((a: string) => a || "").join(" | ");

          repairedCount++;

          const auditEntry: Omit<RepairAuditLog, 'id'> = {
            recordId: item.id,
            enrollmentId: item.enrollmentId,
            userId: selectedUserId,
            userEmail: selectedUser?.email || '',
            day: item.day,
            actionStepId: item.actionStepId,
            actionStepPrompt: item.actionStepPrompt,
            oldValue: oldVal || '(Empty)',
            newValue: item.correctValue,
            timestamp: new Date().toISOString(),
            adminEmail: currentUser?.email || 'admin'
          };

          try {
            const docRef = await addDoc(collection(db, 'system_repair_logs'), auditEntry);
            newAuditLogs.unshift({ id: docRef.id, ...auditEntry });
          } catch (e) {
            console.warn("Could not save repair audit log to database:", e);
          }
        }

        const enrollmentRef = doc(db, 'users', selectedUserId, 'enrollments', enrollmentId);
        await updateDoc(enrollmentRef, { progress: updatedProgress });
      }

      setRepairSuccessMessage(`Successfully repaired ${repairedCount} response record(s) in database!`);
      setAuditLogs(prev => [...newAuditLogs, ...prev]);
      setShowConfirmModal(false);
      
      setTimeout(() => {
        handleAnalyzeResponses();
      }, 500);

    } catch (err) {
      console.error("Error executing database repair:", err);
    } finally {
      setIsExecutingRepair(false);
    }
  };

  return (
    <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 sm:p-10 shadow-sm space-y-8 text-left animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-gray-50 pb-8">
        <div className="space-y-2 text-left">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black tracking-widest text-amber-700 bg-amber-50 border border-amber-200/60 px-3 py-1.5 rounded-full uppercase">
              Debug & Audit Tool
            </span>
            <span className="text-[9px] font-black tracking-widest text-gray-400 bg-gray-100 px-3 py-1.5 rounded-full uppercase">
              Admin Only
            </span>
          </div>
          <h3 className="text-xl font-black text-gray-900 tracking-tight italic">
            Repair Responses Panel
          </h3>
          <p className="text-gray-400 text-xs font-semibold leading-relaxed max-w-2xl">
            Audit and repair incorrectly stored action-step responses for any account. This tool compares database records with current sprint definitions and exact source-of-truth values before generating a preview. No records are blindly overwritten.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowLogsPanel(!showLogsPanel)}
          className="px-4 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 self-start md:self-auto cursor-pointer"
        >
          <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>{showLogsPanel ? 'Hide Repair Logs' : `Audit Logs (${auditLogs.length})`}</span>
        </button>
      </div>

      {/* Success Notification */}
      {repairSuccessMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200/80 rounded-2xl flex items-center gap-3 text-emerald-800 text-xs font-bold animate-fade-in">
          <svg className="w-5 h-5 text-emerald-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
          <span>{repairSuccessMessage}</span>
        </div>
      )}

      {/* Target User Selector Section */}
      <div className="bg-gray-50/60 p-6 rounded-2xl border border-gray-100 space-y-4">
        <label className="block text-xs font-black text-gray-900 uppercase tracking-widest">
          1. Select Target Account to Inspect & Repair
        </label>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full pl-4 pr-10 py-3 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all cursor-pointer"
            >
              <option value="">-- Choose User Account --</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name || 'Unnamed'} ({u.email}) - ID: {u.id}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            id="repair-responses-btn"
            onClick={handleAnalyzeResponses}
            disabled={!selectedUserId || isAnalyzing}
            className="px-6 py-3 bg-primary hover:bg-primary-dark text-white shadow-md rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 cursor-pointer flex-shrink-0"
          >
            {isAnalyzing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Analyzing Database...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span>Repair Responses</span>
              </>
            )}
          </button>
        </div>

        {selectedUser && (
          <div className="flex items-center gap-3 pt-2 text-xs font-semibold text-gray-500">
            <span className="font-bold text-gray-900">{selectedUser.name}</span>
            <span>•</span>
            <span>{selectedUser.email}</span>
            <span>•</span>
            <span className="font-mono text-[10px] text-gray-400">UID: {selectedUser.id}</span>
          </div>
        )}
      </div>

      {/* Analysis & Repair Preview Section */}
      {analysisRan && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
            <div>
              <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest">
                2. Repair Preview ({proposedRepairs.length} Issue{proposedRepairs.length === 1 ? '' : 's'} Found)
              </h4>
              <p className="text-xs text-gray-400 font-semibold mt-1">
                Review proposed repairs before applying changes to the database.
              </p>
            </div>

            {proposedRepairs.length > 0 && (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="text-xs font-black text-primary hover:underline cursor-pointer"
                >
                  {proposedRepairs.every(r => selectedRepairs[r.id]) ? 'Deselect All' : 'Select All'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(true)}
                  disabled={selectedCount === 0}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md rounded-xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-40 active:scale-95 cursor-pointer"
                >
                  Apply Selected Repairs ({selectedCount})
                </button>
              </div>
            )}
          </div>

          {proposedRepairs.length === 0 ? (
            <div className="p-10 text-center bg-emerald-50/50 rounded-2xl border border-emerald-100/80 space-y-2">
              <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-xs font-black text-emerald-900 uppercase tracking-widest">
                All Responses Clean & Verified
              </p>
              <p className="text-xs text-emerald-700 font-semibold max-w-md mx-auto">
                No corrupted or misaligned responses were detected for this account. All database records match expected values cleanly.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {proposedRepairs.map((item) => (
                <div
                  key={item.id}
                  className={`p-5 rounded-2xl border transition-all space-y-4 ${
                    selectedRepairs[item.id]
                      ? 'bg-amber-50/30 border-amber-200/80 shadow-xs'
                      : 'bg-white border-gray-100 opacity-75'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={!!selectedRepairs[item.id]}
                        onChange={() => toggleRepairSelection(item.id)}
                        className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary cursor-pointer mt-0.5"
                      />
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-black text-gray-900">{item.sprintTitle}</span>
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md text-[9px] font-black uppercase">
                            Day {item.day} • Step {item.stepIndex + 1}
                          </span>
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                            item.status === 'Ready for Repair'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                              : 'bg-amber-50 text-amber-700 border border-amber-200/60'
                          }`}>
                            {item.status}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-gray-700 mt-1 italic">
                          "{item.actionStepPrompt}"
                        </p>
                        <p className="text-[10px] font-mono text-gray-400 mt-0.5">
                          actionStepId: <strong className="text-gray-700">{item.actionStepId}</strong>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Comparison Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-xl border border-gray-100 text-xs">
                    <div>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">
                        Current Database Value
                      </p>
                      <div className="p-2.5 bg-rose-50/60 border border-rose-100 rounded-lg text-rose-900 font-mono text-[11px] break-all">
                        {item.currentDbValue}
                      </div>
                    </div>

                    <div>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">
                        Proposed Correct Value
                      </p>
                      <div className="p-2.5 bg-emerald-50/60 border border-emerald-100 rounded-lg text-emerald-900 font-mono text-[11px] break-all">
                        {item.correctValue}
                      </div>
                    </div>
                  </div>

                  {/* Reason & Explanation */}
                  <div className="text-xs font-medium text-gray-500 bg-gray-50 p-3 rounded-xl border border-gray-100 flex items-start gap-2">
                    <span className="text-amber-500 font-bold">ℹ️ What will change:</span>
                    <span>{item.changeReason}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Audit Logs Section */}
      {showLogsPanel && (
        <div className="pt-6 border-t border-gray-100 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest">
              Repair Audit Execution Logs ({auditLogs.length})
            </h4>
            <button
              type="button"
              onClick={fetchAuditLogs}
              disabled={isLoadingLogs}
              className="text-xs font-bold text-primary hover:underline cursor-pointer"
            >
              Refresh Logs
            </button>
          </div>

          {isLoadingLogs ? (
            <div className="py-8 text-center text-xs text-gray-400">Loading audit trail...</div>
          ) : auditLogs.length === 0 ? (
            <div className="p-6 text-center bg-gray-50 rounded-xl border border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider">
              No repairs logged yet.
            </div>
          ) : (
            <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden text-xs bg-white">
              {auditLogs.map((log) => (
                <div key={log.id} className="p-4 space-y-2 hover:bg-gray-50/50">
                  <div className="flex items-center justify-between gap-2 flex-wrap text-[10px] text-gray-400 font-mono">
                    <span>Record ID: {log.recordId || log.id}</span>
                    <span>{new Date(log.timestamp).toLocaleString()}</span>
                  </div>
                  <p className="font-bold text-gray-800">
                    Step: {log.actionStepPrompt} <span className="font-mono text-[10px] text-gray-400">({log.actionStepId})</span>
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
                    <div className="text-rose-700 bg-rose-50 px-2.5 py-1 rounded">Old: {log.oldValue}</div>
                    <div className="text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded">New: {log.newValue}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-[2rem] max-w-md w-full p-8 shadow-2xl border border-gray-100 animate-scale-up text-left space-y-6">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>

            <div>
              <h3 className="text-lg font-black text-gray-900 tracking-tight">
                Confirm Database Repair
              </h3>
              <p className="text-xs text-gray-500 font-semibold leading-relaxed mt-2">
                You are about to update <strong className="text-gray-900">{selectedCount}</strong> selected response record(s) for user <strong className="text-gray-900">{selectedUser?.name || selectedUserId}</strong> in Firestore.
                <br /><br />
                This operation will preserve exact response strings and record a detailed audit log entry for every repair.
              </p>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={isExecutingRepair}
                className="px-5 py-3 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-xl text-xs font-black uppercase tracking-widest transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteRepair}
                disabled={isExecutingRepair}
                className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isExecutingRepair ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Writing to DB...</span>
                  </>
                ) : (
                  <span>Confirm & Apply Repair</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
