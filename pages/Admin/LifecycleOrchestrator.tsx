
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { LifecycleStage, LifecycleSlot, Sprint, SprintType, MicroSelector, MicroSelectorStep, GlobalOrchestrationSettings, OrchestrationTrigger, OrchestrationAction, LifecycleSlotAssignment, Track } from '../../types';
import { LIFECYCLE_STAGES_CONFIG, LIFECYCLE_SLOTS, FOCUS_OPTIONS, FOUNDATION_CLARITY_OPTIONS, PERSONA_HIERARCHY, PERSONAS, CATEGORY_TO_STAGE_MAP } from '../../services/mockData';
import { sprintService } from '../../services/sprintService';
import Button from '../../components/Button';

interface OrchestratorProps {
    allSprints: Sprint[];
    allTracks: Track[];
    refreshKey: number;
}

const STAGES: LifecycleStage[] = ['Foundation', 'Direction', 'Execution', 'Proof', 'Positioning', 'Stability', 'Expansion'];

const SYSTEM_DESTINATIONS = [
    { id: 'system_map', title: 'The Map', category: 'System Overview', coverImageUrl: 'https://images.unsplash.com/photo-1526628953301-3e589a6a8b74?auto=format&fit=crop&w=800&q=80', duration: 0 }
];

const getSlotDefaultOptions = (slotId: string) => {
    return slotId === 'slot_found_clarity' ? FOUNDATION_CLARITY_OPTIONS : FOCUS_OPTIONS;
};

const LifecycleOrchestrator: React.FC<OrchestratorProps> = ({ allSprints, allTracks, refreshKey }) => {
    const [selectedStage, setSelectedStage] = useState<LifecycleStage>('Foundation');
    const [assignments, setAssignments] = useState<Record<string, LifecycleSlotAssignment>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [isInitialLoading, setIsInitialLoading] = useState(true);

    const [activeSprintPicker, setActiveSprintPicker] = useState<string | null>(null);
    const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
    const [expandedSprints, setExpandedSprints] = useState<Record<string, boolean>>({});

    const [selectedPriorityPoll, setSelectedPriorityPoll] = useState<string>('');
    const [priorityPollSearch, setPriorityPollSearch] = useState<string>('');
    const [isPriorityDropdownOpen, setIsPriorityDropdownOpen] = useState<boolean>(false);

    const filteredPriorityPollOptions = useMemo(() => {
        const query = priorityPollSearch.trim().toLowerCase();
        if (!query) return FOCUS_OPTIONS;
        return FOCUS_OPTIONS.filter(opt => opt.toLowerCase().includes(query));
    }, [priorityPollSearch]);

    const prioritySprintsForSelectedPoll = useMemo(() => {
        if (!selectedPriorityPoll) return [];
        
        const results: {
            sprint: Sprint | { id: string; title: string; category: string; coverImageUrl?: string; duration?: number } | Track;
            slotName: string;
            slotId?: string;
            isSystem: boolean;
            isTrack: boolean;
            priorityLabel: string;
            priorityNum: number;
            isOverride?: boolean;
        }[] = [];

        // 1. Gather overrideOrchestrator sprints that belong to the selectedStage
        const overrideSprints = allSprints.filter(s => s.overrideOrchestrator);
        const stageOverrides = overrideSprints.filter(s => {
            const sprintStage = CATEGORY_TO_STAGE_MAP[s.category] || 'Direction';
            return sprintStage === selectedStage;
        });
        
        stageOverrides.sort((a, b) => (a.overrideOrder || 0) - (b.overrideOrder || 0));

        stageOverrides.forEach((s, idx) => {
            results.push({
                sprint: s,
                slotName: 'Coach Override',
                slotId: 'override',
                isSystem: false,
                isTrack: false,
                priorityLabel: `Override Priority ${idx + 1}`,
                priorityNum: s.overrideOrder || (idx + 1),
                isOverride: true
            });
        });

        // 2. Filter slots for the current selectedStage
        const currentSlots = LIFECYCLE_SLOTS.filter(s => s.stage === selectedStage);
        const regularResults: typeof results = [];

        currentSlots.forEach(slot => {
            const assignment = assignments[slot.id];
            if (!assignment) return;

            const assignedSprintIds = assignment.sprintIds || (assignment.sprintId ? [assignment.sprintId] : []);
            
            assignedSprintIds.forEach(sId => {
                const sprintFocus = (assignment.sprintFocusMap || {})[sId] || [];
                
                if (sprintFocus.includes(selectedPriorityPoll)) {
                    const s = allSprints.find(x => x.id === sId) || 
                             SYSTEM_DESTINATIONS.find(x => x.id === sId) ||
                             allTracks.find(x => x.id === sId);
                    
                    if (s) {
                        const isSystem = sId.startsWith('system_');
                        const isTrack = 'sprintIds' in s && !isSystem;

                        const priorityList = assignment.focusOptionPriorityMap?.[selectedPriorityPoll] || [];
                        const priorityIndex = priorityList.indexOf(sId);
                        
                        const priorityLabel = priorityIndex > -1 
                            ? `${priorityIndex + 1}${priorityIndex === 0 ? 'st' : priorityIndex === 1 ? 'nd' : priorityIndex === 2 ? 'rd' : 'th'} priority` 
                            : 'Unprioritized';
                        
                        const priorityNum = priorityIndex > -1 ? priorityIndex + 1 : 999;

                        regularResults.push({
                            sprint: s,
                            slotName: slot.name,
                            slotId: slot.id,
                            isSystem,
                            isTrack,
                            priorityLabel,
                            priorityNum
                        });
                    }
                }
            });
        });

        regularResults.sort((a, b) => {
            if (a.slotName !== b.slotName) {
                return a.slotName.localeCompare(b.slotName);
            }
            return a.priorityNum - b.priorityNum;
        });

        return [...results, ...regularResults];
    }, [selectedPriorityPoll, selectedStage, assignments, allSprints, allTracks]);

    const handleMovePriority = async (slotId: string, sprintId: string, direction: 'up' | 'down') => {
        const assignment = assignments[slotId];
        if (!assignment) return;
        
        const priorityMap = { ...(assignment.focusOptionPriorityMap || {}) };
        const optionPriorities = [...(priorityMap[selectedPriorityPoll] || [])];
        
        const idx = optionPriorities.indexOf(sprintId);
        if (idx === -1) return;
        
        if (direction === 'up' && idx > 0) {
            const temp = optionPriorities[idx];
            optionPriorities[idx] = optionPriorities[idx - 1];
            optionPriorities[idx - 1] = temp;
        } else if (direction === 'down' && idx < optionPriorities.length - 1) {
            const temp = optionPriorities[idx];
            optionPriorities[idx] = optionPriorities[idx + 1];
            optionPriorities[idx + 1] = temp;
        } else {
            return;
        }
        
        priorityMap[selectedPriorityPoll] = optionPriorities;
        const newAssignment = { ...assignment, focusOptionPriorityMap: priorityMap };
        
        try {
            await sprintService.saveSlotAssignment(slotId, newAssignment);
            toast.success("Priority moved successfully!");
        } catch (err) {
            toast.error("Failed to move priority.");
        }
    };

    const handleMoveOverride = async (sprintId: string, direction: 'up' | 'down') => {
        const stageOverrides = allSprints
            .filter(s => s.overrideOrchestrator)
            .filter(s => (CATEGORY_TO_STAGE_MAP[s.category] || 'Direction') === selectedStage)
            .sort((a, b) => (a.overrideOrder || 0) - (b.overrideOrder || 0));
            
        const idx = stageOverrides.findIndex(s => s.id === sprintId);
        if (idx === -1) return;
        
        if (direction === 'up' && idx > 0) {
            const temp = stageOverrides[idx];
            stageOverrides[idx] = stageOverrides[idx - 1];
            stageOverrides[idx - 1] = temp;
        } else if (direction === 'down' && idx < stageOverrides.length - 1) {
            const temp = stageOverrides[idx];
            stageOverrides[idx] = stageOverrides[idx + 1];
            stageOverrides[idx + 1] = temp;
        } else {
            return;
        }
        
        try {
            for (let i = 0; i < stageOverrides.length; i++) {
                const s = stageOverrides[i];
                await sprintService.updateSprint(s.id, { overrideOrder: i + 1 });
            }
            toast.success("Override priority updated successfully! Please reload/refresh to see refreshed sorting.");
        } catch (err) {
            toast.error("Failed to update override priority.");
        }
    };

    useEffect(() => {
        setIsInitialLoading(true);
        const unsubscribe = sprintService.subscribeToOrchestration((liveMapping) => {
            setAssignments(liveMapping as Record<string, LifecycleSlotAssignment>);
            setIsInitialLoading(false);
        });
        return () => unsubscribe();
    }, [refreshKey]);

    const currentStageConfig = LIFECYCLE_STAGES_CONFIG[selectedStage];
    const currentSlots = LIFECYCLE_SLOTS.filter(s => s.stage === selectedStage);

    const activeStageOverrides = useMemo(() => {
        return allSprints
            .filter(s => s.overrideOrchestrator)
            .filter(s => {
                const sprintStage = CATEGORY_TO_STAGE_MAP[s.category] || 'Direction';
                return sprintStage === selectedStage;
            })
            .sort((a, b) => (a.overrideOrder || 0) - (b.overrideOrder || 0));
    }, [allSprints, selectedStage]);

    const handleClearSlot = async (slotId: string) => {
        try {
            await sprintService.deleteSlotAssignment(slotId);
            toast.info(`Cleared assignments for ${LIFECYCLE_SLOTS.find(s => s.id === slotId)?.name || 'slot'}`);
        } catch (err) {
            toast.error("Failed to clear slot.");
        }
    };

    const handleSprintAssign = async (slotId: string, sprintId: string) => {
        const defaultOptions = getSlotDefaultOptions(slotId);
        const current = assignments[slotId] || { sprintId: '', sprintIds: [], focusCriteria: [], sprintFocusMap: {}, availableFocusOptions: [...defaultOptions] };
        const existingIds = current.sprintIds || (current.sprintId ? [current.sprintId] : []);
        
        let newIds = [...existingIds];
        let newAssignment: LifecycleSlotAssignment;

        if (newIds.includes(sprintId)) {
            newIds = newIds.filter(id => id !== sprintId);
            const focusMap = { ...(current.sprintFocusMap || {}) };
            delete focusMap[sprintId];
            newAssignment = { ...current, sprintIds: newIds, sprintId: newIds[0] || '', sprintFocusMap: focusMap };
        } else {
            newIds.push(sprintId);
            newAssignment = { ...current, sprintIds: newIds, sprintId: newIds[0] || '', sprintFocusMap: current.sprintFocusMap || {} };
        }

        try {
            await sprintService.saveSlotAssignment(slotId, newAssignment);
            setActiveSprintPicker(null);
        } catch (err) {
            toast.error("Update failed.");
        }
    };

    const handleToggleSprintFocus = async (slotId: string, sprintId: string, option: string) => {
        const defaultOptions = getSlotDefaultOptions(slotId);
        const current = assignments[slotId] || { sprintId: '', sprintIds: [], focusCriteria: [], sprintFocusMap: {}, availableFocusOptions: [...defaultOptions] };
        const focusMap = { ...(current.sprintFocusMap || {}) };
        
        // Foundation slots are still unique / exclusive as requested ("Except for the foundation part")
        const slotDef = LIFECYCLE_SLOTS.find(s => s.id === slotId);
        const isFoundationSlot = slotDef?.stage === 'Foundation';

        if (isFoundationSlot) {
            const isUsedByOther = Object.entries(focusMap).some(([otherId, options]) => 
                otherId !== sprintId && (options as string[]).includes(option)
            );
            if (isUsedByOther) return;
        }

        const currentFocus = [...((focusMap[sprintId] as string[]) || [])];
        const idx = currentFocus.indexOf(option);
        
        // Priority tracking map
        const priorityMap = { ...(current.focusOptionPriorityMap || {}) };
        const optionPriorities = [...(priorityMap[option] || [])];

        if (idx > -1) {
            currentFocus.splice(idx, 1);
            const pIdx = optionPriorities.indexOf(sprintId);
            if (pIdx > -1) {
                optionPriorities.splice(pIdx, 1);
            }
        } else {
            currentFocus.push(option);
            if (!optionPriorities.includes(sprintId)) {
                optionPriorities.push(sprintId);
            }
        }
        
        focusMap[sprintId] = currentFocus;
        if (optionPriorities.length > 0) {
            priorityMap[option] = optionPriorities;
        } else {
            delete priorityMap[option];
        }
        
        const newAssignment = { 
            ...current, 
            sprintFocusMap: focusMap,
            focusOptionPriorityMap: priorityMap
        };
        try {
            await sprintService.saveSlotAssignment(slotId, newAssignment);
        } catch (err) {
            toast.error("Focus update failed.");
        }
    };

    const toggleExpand = (slotId: string, sId: string) => {
        const key = `${slotId}_${sId}`;
        setExpandedSprints(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleClearAll = async () => {
        if (!window.confirm("Are you sure you want to delete ALL orchestration data? This cannot be undone.")) return;
        
        setIsSaving(true);
        try {
            await sprintService.clearAllOrchestration();
            toast.success("All orchestration data deleted.");
        } catch (err) {
            toast.error("Failed to clear orchestration.");
        } finally {
            setIsSaving(false);
        }
    };

    if (isInitialLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 bg-white rounded-[3rem] border border-gray-100 shadow-sm animate-pulse">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Synchronizing Registry...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col animate-fade-in font-sans relative pb-20">
            {/* Horizontal Stage Navigation */}
            <nav className="mb-10 w-full overflow-x-auto no-scrollbar scroll-smooth">
                <div className="bg-gray-50 p-2 rounded-[2rem] border border-gray-100 flex flex-row gap-2 min-w-max">
                    {STAGES.map((stage, idx) => (
                        <button
                            key={stage}
                            onClick={() => setSelectedStage(stage)}
                            className={`flex flex-col items-center justify-center gap-0.5 px-6 py-3 rounded-2xl transition-all duration-300 relative group cursor-pointer min-w-[120px] ${
                                selectedStage === stage 
                                ? 'bg-primary text-white shadow-xl scale-[1.03] z-10' 
                                : 'bg-white text-gray-400 border border-transparent hover:border-gray-200'
                            }`}
                        >
                            <span className={`text-[8px] font-black uppercase tracking-widest ${selectedStage === stage ? 'text-white/60' : 'text-gray-300'}`}>0{idx + 1}</span>
                            <span className="text-[11px] font-black uppercase tracking-tight">{stage}</span>
                        </button>
                    ))}
                </div>
            </nav>

            <main className="flex-1 space-y-8">
                <header className="bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-sm relative overflow-hidden">
                    <div className="relative z-10 flex justify-between items-start">
                        <div>
                            <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-2 italic">
                                {currentStageConfig.subtitle}
                            </h2>
                            <p className="text-sm font-medium text-gray-400 italic">
                                "{currentStageConfig.description}"
                            </p>
                        </div>
                        <button 
                            onClick={handleClearAll}
                            disabled={isSaving}
                            className="px-6 py-3 bg-red-50 text-red-500 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all active:scale-95 disabled:opacity-50"
                        >
                            Delete All Orchestration
                        </button>
                    </div>
                </header>

                <div className="grid grid-cols-1 gap-6">
                    {currentSlots.map((slot) => {
                        const defaultOptions = getSlotDefaultOptions(slot.id);
                        const assignment = assignments[slot.id] || { sprintId: '', sprintIds: [], focusCriteria: [], sprintFocusMap: {}, availableFocusOptions: [...defaultOptions] };
                        const assignedSprintIds = assignment.sprintIds || (assignment.sprintId ? [assignment.sprintId] : []);
                        
                        const isSprintPickerOpen = activeSprintPicker === slot.id;
                        
                        const slotFocusOptions = assignment.availableFocusOptions || defaultOptions;
                        const availableSprintsForPicker = allSprints
                            .filter(s => (s.published && s.approvalStatus === 'approved') && !assignedSprintIds.includes(s.id))
                            .sort((a, b) => a.title.localeCompare(b.title));
                        
                        const availableTracksForPicker = allTracks
                            .filter(t => t.published && !assignedSprintIds.includes(t.id))
                            .sort((a, b) => a.title.localeCompare(b.title));

                        const availableSystemForPicker = SYSTEM_DESTINATIONS.filter(s => !assignedSprintIds.includes(s.id));

                        return (
                            <div key={slot.id} className="bg-white rounded-[2.5rem] border border-gray-100 p-8 shadow-sm flex flex-col gap-8 transition-all relative overflow-visible">
                                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                                    <div className="flex items-center gap-3 mb-1">
                                        <h4 className="text-lg font-black text-gray-900 tracking-tight italic">{slot.name}</h4>
                                        <div className="flex items-center gap-1.5">
                                            <button 
                                                onClick={() => {
                                                    if (window.confirm(`Clear all assignments for ${slot.name}?`)) {
                                                        handleClearSlot(slot.id);
                                                    }
                                                }}
                                                className="p-1.5 rounded-lg transition-all border border-transparent text-gray-300 hover:border-red-100 hover:text-red-500 active:scale-90"
                                                title="Clear All Assignments"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {editingSlotId !== slot.id ? (
                                        <div className="space-y-6">
                                            <div className="flex items-center justify-between gap-2 px-1">
                                                <div className="flex items-center gap-2">
                                                    <h5 className="text-[9px] font-black text-gray-450 uppercase tracking-[0.25em]">Registry Assignment</h5>
                                                    {assignedSprintIds.length > 0 && (
                                                        <span className="px-2 py-0.5 bg-green-50 text-[8px] font-black text-green-600 rounded-full border border-green-100 uppercase tracking-widest">
                                                            Active
                                                        </span>
                                                    )}
                                                </div>
                                                <button 
                                                    onClick={() => setEditingSlotId(slot.id)}
                                                    className="px-4 py-1.5 bg-[#0E7850]/10 text-[#0E7850] hover:bg-[#0E7850]/20 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 active:scale-95"
                                                    title="Configure this assignment"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                    </svg>
                                                    Edit
                                                </button>
                                            </div>

                                            {assignedSprintIds.length > 0 ? (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {assignedSprintIds.map((sId) => {
                                                        const s = allSprints.find(x => x.id === sId) || 
                                                                 SYSTEM_DESTINATIONS.find(x => x.id === sId) ||
                                                                 allTracks.find(x => x.id === sId);
                                                        if (!s) return null;
                                                        const sprintFocus = (assignment.sprintFocusMap || {})[sId] || [];
                                                        const isSystem = sId.startsWith('system_');
                                                        const isTrack = 'sprintIds' in s && !isSystem;

                                                        const expandedKey = `${slot.id}_${sId}`;
                                                        const isExpanded = !!expandedSprints[expandedKey];

                                                        return (
                                                            <div key={sId} className={`w-full p-5 rounded-[2rem] border transition-all flex flex-col gap-3 bg-gray-50/50 hover:bg-gray-50/80 ${isSystem ? 'border-primary/10 bg-primary/5' : isTrack ? 'border-orange-100 bg-orange-50/20' : 'border-gray-100 bg-white'}`}>
                                                                <div className="flex items-center justify-between gap-4 min-w-0">
                                                                    <div className="flex items-center gap-4 min-w-0">
                                                                        <div className={`w-11 h-11 rounded-xl overflow-hidden shadow-sm border border-gray-100 flex items-center justify-center flex-shrink-0 ${isSystem || isTrack ? 'bg-white text-lg' : ''}`}>
                                                                            {isSystem ? '🗺️' : isTrack ? '🚀' : <img src={(s as Sprint).coverImageUrl} className="w-full h-full object-cover" alt="" />}
                                                                        </div>
                                                                        <div className="text-left min-w-0">
                                                                            <p className={`text-[8px] font-black uppercase tracking-widest leading-none mb-1 ${isSystem ? 'text-primary' : isTrack ? 'text-orange-500' : 'text-gray-400'}`}>
                                                                                {isSystem ? 'System Link' : isTrack ? 'Track' : 'Program'}
                                                                            </p>
                                                                            <h6 className="text-[13px] font-black tracking-tight text-gray-900 truncate">
                                                                                {s.title}
                                                                            </h6>
                                                                        </div>
                                                                    </div>
                                                                    
                                                                    <button 
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            toggleExpand(slot.id, sId);
                                                                        }}
                                                                        className="p-1.5 rounded-lg border border-gray-100 bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-all flex items-center justify-center active:scale-95 flex-shrink-0"
                                                                        title={isExpanded ? "Hide Poll Options" : "Show Poll Options"}
                                                                    >
                                                                        <svg className={`w-3.5 h-3.5 transform transition-transform duration-255 ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                                                        </svg>
                                                                    </button>
                                                                </div>

                                                                {isExpanded && (
                                                                    <div className="border-t border-gray-100 pt-3 animate-fade-in text-left">
                                                                        {sprintFocus.length > 0 ? (
                                                                            <div className="flex flex-wrap gap-1">
                                                                                {sprintFocus.map((f, fIdx) => (
                                                                                    <span key={fIdx} className="px-2 py-0.5 bg-[#0E7850]/5 text-[#0E7850] rounded-md text-[8px] font-bold uppercase tracking-wider leading-none">
                                                                                        {f}
                                                                                    </span>
                                                                                ))}
                                                                            </div>
                                                                        ) : (
                                                                            <p className="text-[8px] font-bold text-gray-300 uppercase tracking-wider">No polls options selected</p>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <div className="py-8 text-center bg-gray-50/50 rounded-[2rem] border border-dashed border-gray-200/50 flex flex-col items-center justify-center gap-3">
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No programs aligned to this slot yet</p>
                                                    <button 
                                                        onClick={() => setEditingSlotId(slot.id)}
                                                        className="px-5 py-2.5 bg-[#0E7850] text-white hover:bg-[#0b5d3e] rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95 flex items-center gap-1.5"
                                                    >
                                                        Assign Program
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            <div className="flex items-center justify-between gap-2 px-1 bg-[#0E7850]/5 p-3 rounded-2xl border border-[#0E7850]/15 mb-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="relative">
                                                        <span className="text-sm animate-pulse block">🛠️</span>
                                                    </div>
                                                    <h5 className="text-[9px] font-black text-[#0E7850] uppercase tracking-wider">Configure Assignments & Focus Mapping</h5>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button 
                                                        onClick={() => {
                                                            setEditingSlotId(null);
                                                            toast.success("Assignments updated successfully!");
                                                        }}
                                                        className="px-4 py-1.5 bg-[#0E7850] text-white hover:bg-[#0b5d3e] rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95 flex items-center gap-1 font-sans"
                                                    >
                                                        <svg className="w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                        </svg>
                                                        Save
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="relative">
                                                <button 
                                                    onClick={() => setActiveSprintPicker(isSprintPickerOpen ? null : slot.id)}
                                                    className="w-full py-5 px-8 rounded-3xl border border-gray-100 bg-gray-50 hover:border-primary/20 transition-all flex items-center justify-between group active:scale-[0.98]"
                                                >
                                                    <div className="flex items-center gap-5">
                                                        <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-xl text-gray-300 shadow-sm border border-gray-50">
                                                            +
                                                        </div>
                                                        <div className="text-left">
                                                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                                                Available Pool
                                                            </p>
                                                            <h6 className="text-base font-black tracking-tight text-gray-300 italic">
                                                                Select from Registry...
                                                            </h6>
                                                        </div>
                                                    </div>
                                                    <svg className={`w-6 h-6 text-gray-300 transition-transform ${isSprintPickerOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                                                </button>

                                                {isSprintPickerOpen && (
                                                    <div className="absolute top-full left-0 right-0 mt-3 bg-white rounded-[2.5rem] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.15)] border border-gray-100 z-[110] p-8 animate-slide-up overflow-hidden">
                                                        <div className="flex justify-between items-center mb-6 px-2 border-b border-gray-50 pb-4">
                                                            <div>
                                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Registry Selection</p>
                                                                <p className="text-[8px] font-bold text-primary uppercase mt-1">Available for this slot</p>
                                                            </div>
                                                            <button onClick={() => setActiveSprintPicker(null)} className="text-gray-300 hover:text-gray-900 transition-colors"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button>
                                                        </div>
                                                        <div className="space-y-6 max-h-80 overflow-y-auto custom-scrollbar pr-2 mt-4">
                                                            
                                                            {/* Tracks Section (Only for Track slots) */}
                                                            {slot.name.toLowerCase().includes('track') && availableTracksForPicker.length > 0 && (
                                                                <div className="space-y-2">
                                                                    <p className="text-[8px] font-black text-orange-400 uppercase tracking-[0.3em] px-4 mb-3">Available Tracks</p>
                                                                    {availableTracksForPicker.map(t => (
                                                                        <button 
                                                                            key={t.id} 
                                                                            onClick={() => handleSprintAssign(slot.id, t.id)}
                                                                            className="w-full text-left p-5 rounded-[2rem] transition-all flex items-center justify-between border bg-orange-50/30 border-orange-100 hover:bg-orange-50 hover:border-orange-200"
                                                                        >
                                                                            <div className="flex items-center gap-5">
                                                                                <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-xl shadow-sm border border-orange-100">
                                                                                    🚀
                                                                                </div>
                                                                                <div>
                                                                                    <p className="text-sm font-black text-gray-900 tracking-tight leading-none mb-1.5">{t.title}</p>
                                                                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{t.sprintIds.length} Sprints • Track</p>
                                                                                </div>
                                                                            </div>
                                                                            <div className="w-8 h-8 bg-orange-100 text-orange-400 rounded-full flex items-center justify-center text-xs font-black shadow-inner">+</div>
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            )}

                                                            {/* System Destinations Section */}
                                                            {availableSystemForPicker.length > 0 && (
                                                                <div className="space-y-2">
                                                                    <p className="text-[8px] font-black text-primary uppercase tracking-[0.3em] px-4 mb-3">System Destinations</p>
                                                                    {availableSystemForPicker.map(s => (
                                                                        <button 
                                                                            key={s.id} 
                                                                            onClick={() => handleSprintAssign(slot.id, s.id)}
                                                                            className="w-full text-left p-4 rounded-2xl transition-all flex items-center justify-between border bg-primary/5 border-primary/10 hover:bg-primary/10"
                                                                        >
                                                                            <div className="flex items-center gap-4">
                                                                                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-lg shadow-sm">🗺️</div>
                                                                                <div>
                                                                                    <p className="text-sm font-black text-primary tracking-tight leading-none mb-1">{s.title}</p>
                                                                                    <p className="text-[9px] font-black text-primary/40 uppercase tracking-widest">{s.category}</p>
                                                                                </div>
                                                                            </div>
                                                                            <div className="w-7 h-7 bg-primary text-white rounded-full flex items-center justify-center text-[10px] font-black shadow-lg">+</div>
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            )}

                                                            {/* Sprints Section */}
                                                            <div className="space-y-2">
                                                                <p className="text-[8px] font-black text-gray-400 uppercase tracking-[0.3em] px-4 mb-3">Coach Sprints</p>
                                                                {availableSprintsForPicker.length > 0 ? availableSprintsForPicker.map(s => {
                                                                    return (
                                                                        <button 
                                                                            key={s.id} 
                                                                            onClick={() => handleSprintAssign(slot.id, s.id)}
                                                                            className="w-full text-left p-5 rounded-[2rem] transition-all flex items-center justify-between border bg-white border-transparent hover:bg-gray-50 hover:border-gray-100"
                                                                        >
                                                                            <div className="flex items-center gap-5">
                                                                                <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 shadow-sm border border-gray-100">
                                                                                    <img src={s.coverImageUrl} className="w-full h-full object-cover" alt="" />
                                                                                </div>
                                                                                <div>
                                                                                    <p className="text-sm font-black text-gray-900 tracking-tight leading-none mb-1.5">{s.title}</p>
                                                                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{s.duration} Days • {s.category}</p>
                                                                                </div>
                                                                            </div>
                                                                            <div className="w-8 h-8 bg-gray-50 text-gray-300 rounded-full flex items-center justify-center text-xs font-black shadow-inner">+</div>
                                                                        </button>
                                                                    );
                                                                }) : availableSystemForPicker.length === 0 && (
                                                                    <div className="py-12 text-center">
                                                                        <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest">No additional items available.</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {assignedSprintIds.length > 0 && (
                                                <div className="space-y-8 animate-fade-in mt-10">
                                                    {assignedSprintIds.map((sId) => {
                                                        const s = allSprints.find(x => x.id === sId) || 
                                                                 SYSTEM_DESTINATIONS.find(x => x.id === sId) ||
                                                                 allTracks.find(x => x.id === sId);
                                                        if (!s) return null;
                                                        const sprintFocus = (assignment.sprintFocusMap || {})[sId] || [];
                                                        const isSystem = sId.startsWith('system_');
                                                        const isTrack = 'sprintIds' in s && !isSystem;
                                                        
                                                        // UNIFIED UNIQUENESS LOGIC: Find focus options taken by OTHER items in THIS slot
                                                        const focusTakenByOthers = Object.entries(assignment.sprintFocusMap || {})
                                                            .filter(([otherId]) => otherId !== sId)
                                                            .flatMap(([_, options]) => options as string[]);

                                                        return (
                                                            <div key={sId} className={`w-full p-8 rounded-[2.5rem] border shadow-md flex flex-col gap-6 group transition-all hover:shadow-lg ${isSystem ? 'bg-primary/5 border-primary/20' : isTrack ? 'bg-orange-50/30 border-orange-200' : 'bg-white border-primary/10'}`}>
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-4">
                                                                        <div className={`w-12 h-12 rounded-xl overflow-hidden shadow-sm border border-gray-100 flex items-center justify-center flex-shrink-0 ${isSystem || isTrack ? 'bg-white text-xl' : ''}`}>
                                                                            {isSystem ? '🗺️' : isTrack ? '🚀' : <img src={(s as Sprint).coverImageUrl} className="w-full h-full object-cover" alt="" />}
                                                                        </div>
                                                                        <div className="text-left">
                                                                            <p className={`text-[9px] font-black uppercase tracking-widest ${isSystem ? 'text-primary' : isTrack ? 'text-orange-500' : 'text-primary'}`}>
                                                                                {isSystem ? 'System Link' : isTrack ? 'Assigned Track' : 'Assigned Program'}
                                                                            </p>
                                                                            <h6 className="text-lg font-black tracking-tight text-gray-900 italic">
                                                                                {s.title}
                                                                            </h6>
                                                                        </div>
                                                                    </div>
                                                                    <button 
                                                                        onClick={() => handleSprintAssign(slot.id, sId)}
                                                                        className="p-2.5 text-gray-300 hover:text-red-500 transition-colors bg-white rounded-xl shadow-sm border border-gray-100"
                                                                        title="Unassign Program"
                                                                    >
                                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                                                                    </button>
                                                                </div>

                                                                <div className="space-y-4 pt-4 border-t border-gray-50">
                                                                    <div className="flex items-center justify-between">
                                                                        <div className="flex items-center gap-3">
                                                                            <h5 className="text-[9px] font-black text-gray-450 uppercase tracking-[0.2em]">Map Focus Criteria</h5>
                                                                            <div className="h-px bg-gray-50 w-12"></div>
                                                                        </div>
                                                                        <div className="flex items-center gap-4">
                                                                            <button 
                                                                                onClick={() => {
                                                                                    setAssignments(prev => {
                                                                                        const current = prev[slot.id];
                                                                                        const focusMap = { ...(current.sprintFocusMap || {}) };
                                                                                        delete focusMap[sId];
                                                                                        return { ...prev, [slot.id]: { ...current, sprintFocusMap: focusMap } };
                                                                                    });
                                                                                    toast.info(`Cleared focus criteria for ${s.title}`);
                                                                                }}
                                                                                className="text-[8px] font-black text-red-400 uppercase tracking-widest hover:text-red-600 transition-colors"
                                                                            >
                                                                                Clear Focus
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                    
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {slotFocusOptions.map((opt) => {
                                                                            const isSelected = sprintFocus.includes(opt);
                                                                            const isFoundationSlot = slot.stage === 'Foundation';
                                                                            const isTaken = isFoundationSlot && focusTakenByOthers.includes(opt);
                                                                            const isShared = !isFoundationSlot && focusTakenByOthers.includes(opt);
                                                                            const optIdx = slotFocusOptions.indexOf(opt);
                                                                            
                                                                            const priorityList = assignment.focusOptionPriorityMap?.[opt] || [];
                                                                            const priorityIndex = priorityList.indexOf(sId);
                                                                            const priorityLabel = priorityIndex > -1 ? `${priorityIndex + 1}${priorityIndex === 0 ? 'st' : priorityIndex === 1 ? 'nd' : priorityIndex === 2 ? 'rd' : 'th'} priority` : '';
                                                                            
                                                                            return (
                                                                                <button
                                                                                    key={opt}
                                                                                    disabled={isTaken}
                                                                                    onClick={() => handleToggleSprintFocus(slot.id, sId, opt)}
                                                                                    className={`px-4 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all border flex items-center gap-2.5 group relative ${
                                                                                        isSelected 
                                                                                        ? 'bg-primary text-white border-primary shadow-lg scale-[1.02]' 
                                                                                        : isTaken
                                                                                        ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed opacity-40'
                                                                                        : isShared
                                                                                        ? 'bg-white text-gray-400 border-orange-200 hover:border-primary/20 hover:text-primary hover:bg-orange-50/10'
                                                                                        : 'bg-white text-gray-400 border-gray-100 hover:border-primary/20 hover:text-primary'
                                                                                    }`}
                                                                                    title={isTaken ? 'Already mapped to another destination in this slot' : isShared ? 'Shared option (priority-enabled)' : ''}
                                                                                >
                                                                                    <span className={`w-5 h-5 rounded-lg flex items-center justify-center text-[8px] font-black ${isSelected ? 'bg-white/20 text-white' : isTaken ? 'bg-gray-100 text-gray-200' : 'bg-gray-50 text-gray-300 group-hover:bg-primary/10 group-hover:text-primary'}`}>
                                                                                        {optIdx + 1}
                                                                                    </span>
                                                                                    {opt}
                                                                                    {isSelected && priorityLabel && (
                                                                                        <span className="absolute -top-2 -right-1 bg-white text-primary text-[6px] font-black px-1.5 py-0.5 rounded-md border border-primary/20 shadow-sm whitespace-nowrap uppercase tracking-wider">{priorityLabel}</span>
                                                                                    )}
                                                                                    {!isSelected && isShared && (
                                                                                        <span className="absolute -top-2 -right-1 bg-white text-orange-500 text-[6px] font-black px-1.5 py-0.5 rounded-md border border-orange-200 shadow-sm whitespace-nowrap uppercase tracking-wider">Shared</span>
                                                                                    )}
                                                                                </button>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                    {sprintFocus.length > 0 && (
                                                                        <p className="text-[8px] font-bold text-primary italic uppercase tracking-widest mt-1">
                                                                            Tags: {sprintFocus.map(f => slotFocusOptions.indexOf(f) + 1).join(', ')} assigned to this destination.
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            <div className="flex justify-end pt-4 border-t border-gray-50 mt-6">
                                                <button 
                                                    onClick={() => {
                                                        setEditingSlotId(null);
                                                        toast.success("Assignments saved successfully!");
                                                    }}
                                                    className="px-6 py-3 bg-[#0E7850] hover:bg-[#0b5d3e] text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95 flex items-center gap-2"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                    </svg>
                                                    Done & Save Configuration
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {/* Coach Override Sprints Card (Explore Page Bypass) */}
                    <div className="bg-white rounded-[2.5rem] border border-dashed border-amber-200 p-8 shadow-sm flex flex-col gap-8 transition-all hover:border-amber-300 relative overflow-visible bg-amber-50/5">
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                            <div className="flex items-center gap-3 mb-1">
                                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                                <div>
                                    <h4 className="text-lg font-black text-gray-900 tracking-tight italic">Coach Overrides</h4>
                                    <p className="text-[10px] text-amber-700 font-semibold uppercase tracking-wider mt-0.5">Explore Page Direct Bypass</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between gap-2 px-1">
                                <h5 className="text-[9px] font-black text-gray-450 uppercase tracking-[0.25em]">Registry Bypass (Direct Explore)</h5>
                                {activeStageOverrides.length > 0 && (
                                    <span className="px-2 py-0.5 bg-amber-100/50 text-[8px] font-black text-amber-700 rounded-full border border-amber-200 uppercase tracking-widest">
                                        {activeStageOverrides.length} Active {activeStageOverrides.length === 1 ? 'Program' : 'Programs'}
                                    </span>
                                )}
                            </div>

                            {activeStageOverrides.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {activeStageOverrides.map((s, idx) => {
                                        const canMoveUp = idx > 0;
                                        const canMoveDown = idx < activeStageOverrides.length - 1;
                                        
                                        let statusColor = "bg-gray-100 text-gray-600 border-gray-200";
                                        if (s.approvalStatus === 'approved') statusColor = "bg-green-50 text-green-600 border-green-100";
                                        else if (s.approvalStatus === 'pending_approval') statusColor = "bg-amber-50 text-amber-600 border-amber-150";

                                        return (
                                            <div key={s.id} className="w-full p-5 rounded-[2rem] border border-gray-100 bg-white hover:bg-gray-50/50 transition-all flex flex-col gap-3">
                                                <div className="flex items-center justify-between gap-4 min-w-0">
                                                    <div className="flex items-center gap-4 min-w-0">
                                                        <div className="w-11 h-11 rounded-xl overflow-hidden shadow-sm border border-gray-100 flex-shrink-0">
                                                            <img src={s.coverImageUrl} className="w-full h-full object-cover" alt="" />
                                                        </div>
                                                        <div className="text-left min-w-0">
                                                            <div className="flex items-center gap-2 mb-0.5">
                                                                <p className="text-[8px] font-black uppercase tracking-widest leading-none text-amber-500">Coach Override</p>
                                                                <span className={`px-1.5 py-0.5 border text-[7px] font-black rounded uppercase tracking-wider ${statusColor}`}>
                                                                    {s.approvalStatus}
                                                                </span>
                                                            </div>
                                                            <h6 className="text-[13px] font-black tracking-tight text-gray-900 truncate">
                                                                {s.title}
                                                            </h6>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleMoveOverride(s.id, 'up');
                                                            }}
                                                            disabled={!canMoveUp}
                                                            className={`p-1.5 rounded-lg border transition-all ${
                                                                canMoveUp 
                                                                ? 'bg-white hover:bg-amber-50 text-amber-700 hover:text-amber-800 border-gray-200 shadow-sm cursor-pointer' 
                                                                : 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed opacity-50'
                                                            }`}
                                                            title="Move Up"
                                                        >
                                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                                                            </svg>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleMoveOverride(s.id, 'down');
                                                            }}
                                                            disabled={!canMoveDown}
                                                            className={`p-1.5 rounded-lg border transition-all ${
                                                                canMoveDown 
                                                                ? 'bg-white hover:bg-amber-50 text-amber-700 hover:text-amber-800 border-gray-200 shadow-sm cursor-pointer' 
                                                                : 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed opacity-50'
                                                            }`}
                                                            title="Move Down"
                                                        >
                                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="py-8 text-center bg-gray-50/50 rounded-[2rem] border border-dashed border-gray-200/50 flex flex-col items-center justify-center p-6">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No override programs configured for this stage</p>
                                    <p className="text-[9px] text-gray-300 font-semibold mt-1 max-w-sm">
                                        Coach override programs bypass the standard onboarding flow mapping and display directly on the user explore dashboard.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Priority List Subsession for stages from Direction to the end */}
                {selectedStage !== 'Foundation' && (
                    <div className="bg-white rounded-[2.5rem] border border-gray-100 p-8 shadow-sm flex flex-col gap-6 mt-8">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-50 pb-6">
                            <div>
                                <h3 className="text-xl font-black text-gray-900 tracking-tight italic">Priority List</h3>
                                <p className="text-xs font-semibold text-gray-400 mt-1">Select a focus option (onboarding poll) to reveal and audit mapped sprints and prioritizing queues.</p>
                            </div>
                            <span className="px-3 py-1 bg-primary/5 text-[8px] font-black text-primary rounded-full border border-primary/10 uppercase tracking-widest leading-none">
                                {selectedStage} Registry Profile
                            </span>
                        </div>

                        {/* Interactive Dropdown */}
                        <div className="relative max-w-xl w-full">
                            <label className="block text-[9px] font-black text-gray-400 uppercase tracking-wider mb-2">
                                Choose Poll Option
                            </label>
                            <button
                                type="button"
                                onClick={() => setIsPriorityDropdownOpen(!isPriorityDropdownOpen)}
                                className="w-full py-4 px-6 rounded-2xl border border-gray-100 bg-gray-50 hover:border-primary/20 hover:bg-white transition-all flex items-center justify-between group text-left cursor-pointer"
                            >
                                <span className={selectedPriorityPoll ? "text-sm font-bold text-gray-900" : "text-sm font-medium text-gray-400"}>
                                    {selectedPriorityPoll || "Select a poll option..."}
                                </span>
                                <svg 
                                    className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isPriorityDropdownOpen ? 'rotate-180' : ''}`} 
                                    fill="none" 
                                    viewBox="0 0 24 24" 
                                    stroke="currentColor" 
                                    strokeWidth={3}
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            {isPriorityDropdownOpen && (
                                <div className="absolute top-full left-0 right-0 mt-3 bg-white rounded-[2rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.12)] border border-gray-150 z-[120] p-5 animate-slide-up flex flex-col gap-3">
                                    <input 
                                        type="text"
                                        value={priorityPollSearch}
                                        onChange={(e) => setPriorityPollSearch(e.target.value)}
                                        placeholder="Search poll options..."
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none transition-all placeholder-gray-300"
                                    />
                                    
                                    <div className="max-h-60 overflow-y-auto custom-scrollbar pr-1 flex flex-col gap-1">
                                        {filteredPriorityPollOptions.map((opt) => (
                                            <button
                                                key={opt}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedPriorityPoll(opt);
                                                    setPriorityPollSearch('');
                                                    setIsPriorityDropdownOpen(false);
                                                }}
                                                className={`w-full text-left p-3.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between group cursor-pointer ${
                                                    selectedPriorityPoll === opt 
                                                    ? 'bg-primary/10 text-primary' 
                                                    : 'hover:bg-gray-50 text-gray-600 hover:text-gray-900'
                                                }`}
                                            >
                                                <span>{opt}</span>
                                                {selectedPriorityPoll === opt && (
                                                    <span className="text-primary text-[10px] font-black uppercase">Active</span>
                                                )}
                                            </button>
                                        ))}
                                        {filteredPriorityPollOptions.length === 0 && (
                                            <p className="text-center text-[10px] font-black text-gray-300 uppercase py-6">No matching options</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Full list of sprint for that poll */}
                        <div className="mt-4">
                            {selectedPriorityPoll ? (
                                prioritySprintsForSelectedPoll.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {prioritySprintsForSelectedPoll.map(({ sprint, slotName, slotId, isSystem, isTrack, priorityLabel, priorityNum, isOverride }, kIdx) => {
                                            const sId = sprint.id;
                                            
                                            let canMoveUp = false;
                                            let canMoveDown = false;
                                            
                                            if (isOverride) {
                                                const stageOverrides = allSprints
                                                    .filter(s => s.overrideOrchestrator)
                                                    .filter(s => (CATEGORY_TO_STAGE_MAP[s.category] || 'Direction') === selectedStage)
                                                    .sort((a, b) => (a.overrideOrder || 0) - (b.overrideOrder || 0));
                                                const overrideIndex = stageOverrides.findIndex(s => s.id === sId);
                                                canMoveUp = overrideIndex > 0;
                                                canMoveDown = overrideIndex > -1 && overrideIndex < stageOverrides.length - 1;
                                            } else if (slotId) {
                                                const priorityList = assignments[slotId]?.focusOptionPriorityMap?.[selectedPriorityPoll] || [];
                                                const priorityIndex = priorityList.indexOf(sId);
                                                canMoveUp = priorityIndex > 0;
                                                canMoveDown = priorityIndex > -1 && priorityIndex < priorityList.length - 1;
                                            }

                                            return (
                                                <div 
                                                    key={`${sId}_${kIdx}`} 
                                                    className={`w-full p-5 rounded-[2rem] border transition-all flex flex-col gap-3 bg-gray-50/50 hover:bg-gray-50/80 ${
                                                        isSystem 
                                                        ? 'border-primary/10 bg-primary/5' 
                                                        : isTrack 
                                                        ? 'border-orange-100 bg-orange-50/20' 
                                                        : 'border-gray-100 bg-white'
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between gap-4 min-w-0">
                                                        <div className="flex items-center gap-4 min-w-0">
                                                            <div className={`w-11 h-11 rounded-xl overflow-hidden shadow-sm border border-gray-100 flex items-center justify-center flex-shrink-0 ${isSystem || isTrack ? 'bg-white text-lg' : ''}`}>
                                                                {isSystem ? '🗺️' : isTrack ? '🚀' : <img src={(sprint as Sprint).coverImageUrl} className="w-full h-full object-cover" alt="" />}
                                                            </div>
                                                            <div className="text-left min-w-0">
                                                                <p className={`text-[8px] font-black uppercase tracking-widest leading-none mb-1 ${isSystem ? 'text-primary' : isTrack ? 'text-orange-500' : 'text-gray-400'}`}>
                                                                    {isSystem ? 'System Link' : isTrack ? 'Track' : 'Program'}
                                                                </p>
                                                                <h6 className="text-[13px] font-black tracking-tight text-gray-900 truncate">
                                                                    {sprint.title}
                                                                </h6>
                                                                <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                                                                    Slot: <span className="text-gray-600 font-extrabold">{slotName}</span>
                                                                </p>
                                                            </div>
                                                        </div>
                                                        
                                                        {/* Priority controls and indicator */}
                                                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                                            <span className={`px-2.5 py-1 text-[8px] font-black uppercase tracking-widest rounded-lg border flex-shrink-0 ${
                                                                priorityNum <= 3 
                                                                ? 'bg-primary/5 border-primary/10 text-primary' 
                                                                : 'bg-gray-50 border-gray-150 text-gray-400'
                                                            }`}>
                                                                {priorityLabel}
                                                            </span>
                                                            
                                                            <div className="flex items-center gap-1">
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        if (isOverride) {
                                                                            handleMoveOverride(sId, 'up');
                                                                        } else if (slotId) {
                                                                            handleMovePriority(slotId, sId, 'up');
                                                                        }
                                                                    }}
                                                                    disabled={!canMoveUp}
                                                                    className={`p-1 rounded-md transition-all ${
                                                                        canMoveUp 
                                                                        ? 'bg-white hover:bg-primary/10 text-gray-600 hover:text-primary border border-gray-100 shadow-sm cursor-pointer' 
                                                                        : 'bg-gray-50 text-gray-300 border border-gray-100 cursor-not-allowed opacity-50'
                                                                    }`}
                                                                    title="Move Up"
                                                                >
                                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                                                                    </svg>
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        if (isOverride) {
                                                                            handleMoveOverride(sId, 'down');
                                                                        } else if (slotId) {
                                                                            handleMovePriority(slotId, sId, 'down');
                                                                        }
                                                                    }}
                                                                    disabled={!canMoveDown}
                                                                    className={`p-1 rounded-md transition-all ${
                                                                        canMoveDown 
                                                                        ? 'bg-white hover:bg-primary/10 text-gray-600 hover:text-primary border border-gray-100 shadow-sm cursor-pointer' 
                                                                        : 'bg-gray-50 text-gray-300 border border-gray-100 cursor-not-allowed opacity-50'
                                                                    }`}
                                                                    title="Move Down"
                                                                >
                                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                                                    </svg>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="py-12 bg-gray-50/50 border border-dashed border-gray-200/50 rounded-[2.5rem] flex flex-col items-center justify-center text-center p-6">
                                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest">No Active Match Found</p>
                                        <p className="text-[10px] font-bold text-gray-300 mt-2 max-w-sm">No programs in the {selectedStage} stage are mapped to: "{selectedPriorityPoll}". Go to a destination card above and map this option in Focus Criteria.</p>
                                    </div>
                                )
                            ) : (
                                <div className="py-12 bg-gray-50/50 border border-dashed border-gray-200/50 rounded-[2.5rem] flex flex-col items-center justify-center text-center p-6">
                                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Reveal Prioritized Programs</p>
                                    <p className="text-[10px] font-bold text-gray-300 mt-2 max-w-xs">Select a poll option from the dropdown above to view all mapped active sprints.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className="flex justify-end pt-8">
                    <div className="px-8 py-4 bg-primary/5 rounded-2xl border border-primary/10">
                        <p className="text-[9px] font-black text-primary uppercase tracking-widest">
                            Real-time Synchronization Active
                        </p>
                    </div>
                </div>
            </main>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; } 
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                @keyframes slideUp { from { transform: translateY(12px); opacity: 0; } to { opacity: 1; transform: translateY(0); } }
                .animate-slide-up { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
            `}</style>
        </div>
    );
};

export default LifecycleOrchestrator;
