
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { LifecycleStage, LifecycleSlot, Sprint, SprintType, MicroSelector, MicroSelectorStep, GlobalOrchestrationSettings, OrchestrationTrigger, OrchestrationAction, LifecycleSlotAssignment, Track } from '../../types';
import { LIFECYCLE_STAGES_CONFIG, LIFECYCLE_SLOTS, FOCUS_OPTIONS, FOUNDATION_CLARITY_OPTIONS, PERSONA_HIERARCHY, PERSONAS } from '../../services/mockData';
import { sprintService } from '../../services/sprintService';
import Button from '../../components/Button';

interface OrchestratorProps {
    allSprints: Sprint[];
    allTracks: Track[];
    refreshKey: number;
}

const STAGES: LifecycleStage[] = ['Foundation', 'Direction', 'Execution', 'Proof', 'Positioning', 'Stability', 'Expansion'];

const TRIGGER_STATES: { id: OrchestrationTrigger; label: string }[] = [
    { id: 'after_homepage', label: 'After Homepage' },
    { id: 'skip_clarity', label: 'Skip Clarity' },
    { id: 'payment_hesitation', label: 'Payment Hesitation' },
    { id: 'after_1_sprint', label: 'After 1 Sprint' },
    { id: 'after_1_paid_sprint', label: 'After 1 Paid Sprint' },
    { id: 'after_2_sprints', label: 'After 2 Sprints' },
    { id: 'after_2_paid_sprints', label: 'After 2 Paid Sprints' },
    { id: 'after_3_sprints', label: 'After 3 Sprints' }
];

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

    const [editingFocusSlot, setEditingFocusSlot] = useState<string | null>(null);
    const [activeTriggerPicker, setActiveTriggerPicker] = useState<string | null>(null);
    const [activeSprintPicker, setActiveSprintPicker] = useState<string | null>(null);
    const [specificationSteps, setSpecificationSteps] = useState<Record<string, number>>({});

    useEffect(() => {
        setIsInitialLoading(true);
        const unsubscribe = sprintService.subscribeToOrchestration((liveMapping) => {
            setAssignments(liveMapping as Record<string, LifecycleSlotAssignment>);
            setIsInitialLoading(false);
        });
        return () => unsubscribe();
    }, [refreshKey]);

    const usedTriggerStates = useMemo(() => {
        return new Set(
            (Object.values(assignments) as LifecycleSlotAssignment[])
                .map(a => a.stateTrigger)
                .filter((t): t is OrchestrationTrigger => !!t)
        );
    }, [assignments]);

    const currentStageConfig = LIFECYCLE_STAGES_CONFIG[selectedStage];
    const currentSlots = LIFECYCLE_SLOTS.filter(s => s.stage === selectedStage);

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

    const handleTriggerAssign = async (slotId: string, triggerId: OrchestrationTrigger | undefined) => {
        const defaultOptions = getSlotDefaultOptions(slotId);
        const current = assignments[slotId] || { sprintId: '', focusCriteria: [], availableFocusOptions: [...defaultOptions] };
        const newAssignment = { ...current, stateTrigger: triggerId };
        
        try {
            await sprintService.saveSlotAssignment(slotId, newAssignment);
            setActiveTriggerPicker(null);
        } catch (err) {
            toast.error("Trigger update failed.");
        }
    };

    const handleToggleSprintFocus = async (slotId: string, sprintId: string, option: string) => {
        const defaultOptions = getSlotDefaultOptions(slotId);
        const current = assignments[slotId] || { sprintId: '', sprintIds: [], focusCriteria: [], sprintFocusMap: {}, availableFocusOptions: [...defaultOptions] };
        const focusMap = { ...(current.sprintFocusMap || {}) };
        
        const isUsedByOther = Object.entries(focusMap).some(([otherId, options]) => 
            otherId !== sprintId && (options as string[]).includes(option)
        );
        if (isUsedByOther) return;

        const currentFocus = [...((focusMap[sprintId] as string[]) || [])];
        const idx = currentFocus.indexOf(option);
        if (idx > -1) currentFocus.splice(idx, 1);
        else currentFocus.push(option);
        
        focusMap[sprintId] = currentFocus;
        
        const newAssignment = { ...current, sprintFocusMap: focusMap };
        try {
            await sprintService.saveSlotAssignment(slotId, newAssignment);
        } catch (err) {
            toast.error("Focus update failed.");
        }
    };

    const handleUpdateFocusOptionText = async (slotId: string, optIdx: number, newText: string) => {
        const defaultOptions = getSlotDefaultOptions(slotId);
        const current = assignments[slotId] || { sprintId: '', sprintIds: [], focusCriteria: [], sprintFocusMap: {}, availableFocusOptions: [...defaultOptions] };
        const options = [...(current.availableFocusOptions || defaultOptions)];
        const oldText = options[optIdx];
        options[optIdx] = newText;
        
        const focusMap = { ...(current.sprintFocusMap || {}) };
        Object.keys(focusMap).forEach(sId => {
            focusMap[sId] = (focusMap[sId] as string[]).map(f => f === oldText ? newText : f);
        });

        const newAssignment = { ...current, availableFocusOptions: options, sprintFocusMap: focusMap };
        try {
            await sprintService.saveSlotAssignment(slotId, newAssignment);
        } catch (err) {
            toast.error("Label update failed.");
        }
    };

    const handleAddFocusOption = async (slotId: string) => {
        const defaultOptions = getSlotDefaultOptions(slotId);
        const current = assignments[slotId] || { sprintId: '', focusCriteria: [], availableFocusOptions: [...defaultOptions] };
        const options = [...(current.availableFocusOptions || defaultOptions), 'New focus path'];
        const newAssignment = { ...current, availableFocusOptions: options };
        
        try {
            await sprintService.saveSlotAssignment(slotId, newAssignment);
        } catch (err) {
            toast.error("Add focus failed.");
        }
    };

    const handleRemoveFocusOption = async (slotId: string, optIdx: number) => {
        const defaultOptions = getSlotDefaultOptions(slotId);
        const current = assignments[slotId] || { sprintId: '', focusCriteria: [], availableFocusOptions: [...defaultOptions] };
        const options = [...(current.availableFocusOptions || defaultOptions)];
        const removedText = options[optIdx];
        options.splice(optIdx, 1);
        
        const focusMap = { ...(current.sprintFocusMap || {}) };
        Object.keys(focusMap).forEach(sId => {
            focusMap[sId] = (focusMap[sId] as string[]).filter(c => c !== removedText);
        });
        
        const newAssignment = { ...current, availableFocusOptions: options, sprintFocusMap: focusMap };
        try {
            await sprintService.saveSlotAssignment(slotId, newAssignment);
        } catch (err) {
            toast.error("Remove focus failed.");
        }
    };

    const handleSetStep = (slotId: string, sId: string, step: number) => {
        setSpecificationSteps(prev => ({
            ...prev,
            [`${slotId}-${sId}`]: step
        }));
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
                        
                        const isTriggerOpen = activeTriggerPicker === slot.id;
                        const isSprintPickerOpen = activeSprintPicker === slot.id;
                        // Fix: Corrected typo 'editingFocusText' to 'isEditingFocusText'
                        const isEditingFocusText = editingFocusSlot === slot.id;
                        
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
                                            <div className="relative">
                                                <button 
                                                    onClick={() => setActiveTriggerPicker(isTriggerOpen ? null : slot.id)}
                                                    className={`p-1.5 rounded-lg transition-all border ${assignment.stateTrigger ? 'bg-primary text-white border-primary' : 'text-gray-300 border-transparent hover:border-gray-100 hover:text-primary active:scale-90'}`}
                                                    title="Set Activation State"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 10-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                                                    </svg>
                                                </button>
                                                {isTriggerOpen && (
                                                    <div className="absolute top-full left-0 mt-3 w-64 bg-white rounded-3xl shadow-2xl border border-gray-100 z-[100] p-4 animate-slide-up">
                                                        <div className="flex justify-between items-center mb-4 px-2">
                                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Activation Point</p>
                                                            <button onClick={() => setActiveTriggerPicker(null)} className="text-gray-300 hover:text-gray-900"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button>
                                                        </div>
                                                        <div className="space-y-1.5 max-h-64 overflow-y-auto no-scrollbar">
                                                            {TRIGGER_STATES.map(ts => {
                                                                const isUsedByOthers = usedTriggerStates.has(ts.id) && assignment.stateTrigger !== ts.id;
                                                                if (isUsedByOthers) return null;
                                                                return (
                                                                    <button key={ts.id} onClick={() => handleTriggerAssign(slot.id, assignment.stateTrigger === ts.id ? undefined : ts.id)} className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center justify-between group ${assignment.stateTrigger === ts.id ? 'bg-primary text-white' : 'hover:bg-gray-50'}`}>
                                                                        <span className={`text-[10px] font-bold uppercase tracking-tight ${assignment.stateTrigger === ts.id ? 'text-white' : 'text-gray-600'}`}>{ts.label}</span>
                                                                        {assignment.stateTrigger === ts.id && <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
                                                                    </button>
                                                                );
                                                            })}
                                                            <button onClick={() => handleTriggerAssign(slot.id, undefined)} className="w-full text-center py-3 text-[9px] font-black text-red-400 uppercase tracking-widest hover:bg-red-50 rounded-xl">Clear</button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
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
                                    {assignment.stateTrigger && (
                                        <div className="px-3 py-1 bg-primary/10 text-primary rounded-lg border border-primary/5">
                                            <span className="text-[8px] font-black uppercase tracking-widest leading-none block">{TRIGGER_STATES.find(ts => ts.id === assignment.stateTrigger)?.label}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 px-1">
                                        <div className="flex items-center gap-2">
                                            <h5 className="text-[9px] font-black text-gray-300 uppercase tracking-[0.25em]">Registry Assignment</h5>
                                            <button 
                                                onClick={() => setEditingFocusSlot(isEditingFocusText ? null : slot.id)}
                                                className={`p-1 transition-all active:scale-90 ${isEditingFocusText ? 'text-primary' : 'text-gray-300 hover:text-primary'}`}
                                                title="Edit Focus Option Labels"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                            </button>
                                        </div>
                                        <div className="h-px bg-gray-50 flex-1"></div>
                                    </div>

                                    {isEditingFocusText && (
                                        <div className="space-y-3 animate-fade-in mb-8">
                                            <p className="text-[8px] font-black text-orange-400 uppercase tracking-widest px-1">Edit Poll Labels</p>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {slotFocusOptions.map((opt, idx) => (
                                                    <div key={idx} className="flex items-center gap-2 bg-gray-50 p-2 rounded-2xl border border-gray-100 hover:border-primary/20 transition-all group">
                                                        <span className="text-[8px] font-black text-gray-300 px-2">{idx + 1}</span>
                                                        <input 
                                                            type="text" 
                                                            value={opt}
                                                            onChange={(e) => handleUpdateFocusOptionText(slot.id, idx, e.target.value)}
                                                            className="flex-1 bg-transparent border-none focus:ring-0 text-[10px] font-bold text-gray-700 outline-none px-2"
                                                        />
                                                        <button 
                                                            onClick={() => handleRemoveFocusOption(slot.id, idx)}
                                                            className="p-2 text-red-200 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                                        >
                                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12"/></svg>
                                                        </button>
                                                    </div>
                                                ))}
                                                <button 
                                                    onClick={() => handleAddFocusOption(slot.id)}
                                                    className="border-2 border-dashed border-gray-100 rounded-2xl p-4 text-[9px] font-black text-gray-400 uppercase tracking-widest hover:bg-gray-50 hover:border-primary/20 transition-all flex items-center justify-center gap-2"
                                                >
                                                    <span className="text-sm">+</span> Add Focus Path
                                                </button>
                                            </div>
                                            <button 
                                                onClick={() => setEditingFocusSlot(null)}
                                                className="w-full py-2 bg-primary text-white rounded-xl text-[8px] font-black uppercase tracking-widest shadow-md active:scale-95 transition-all"
                                            >
                                                Done Editing Labels
                                            </button>
                                        </div>
                                    )}

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
                                                                <div className={`w-12 h-12 rounded-xl overflow-hidden shadow-sm border border-gray-100 flex items-center justify-center ${isSystem || isTrack ? 'bg-white text-xl' : ''}`}>
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
                                                                    <h5 className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Map Focus Criteria</h5>
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
                                                                    {(specificationSteps[`${slot.id}-${sId}`] || 0) > 0 && (
                                                                        <button 
                                                                            onClick={() => handleSetStep(slot.id, sId, (specificationSteps[`${slot.id}-${sId}`] || 0) - 1)}
                                                                            className="text-[8px] font-black text-gray-400 uppercase tracking-widest hover:text-primary transition-colors flex items-center gap-1"
                                                                        >
                                                                            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
                                                                            Previous
                                                                        </button>
                                                                    )}
                                                                    {(() => {
                                                                        const currentStep = specificationSteps[`${slot.id}-${sId}`] || 0;
                                                                        const selectedPersonas = sprintFocus.filter(f => PERSONAS.includes(f));
                                                                        const canSpecify = selectedPersonas.length > 0 && currentStep < 3;
                                                                        
                                                                        if (!canSpecify) return null;
                                                                        
                                                                        return (
                                                                            <button 
                                                                                onClick={() => handleSetStep(slot.id, sId, currentStep + 1)}
                                                                                className="text-[8px] font-black text-primary uppercase tracking-widest hover:underline transition-all flex items-center gap-1"
                                                                            >
                                                                                Specify
                                                                                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
                                                                            </button>
                                                                        );
                                                                    })()}
                                                                </div>
                                                            </div>
                                                            
                                                            <div className="flex flex-wrap gap-2">
                                                                {(() => {
                                                                    const currentStep = specificationSteps[`${slot.id}-${sId}`] || 0;
                                                                    let visibleOptions: string[] = [];
                                                                    
                                                                    if (currentStep === 0) {
                                                                        const allHierarchyOptions = Object.values(PERSONA_HIERARCHY).flat(2);
                                                                        visibleOptions = slotFocusOptions.filter(opt => PERSONAS.includes(opt) || !allHierarchyOptions.includes(opt));
                                                                    } else {
                                                                        const selectedPersonas = sprintFocus.filter(f => PERSONAS.includes(f));
                                                                        const options: string[] = [];
                                                                        selectedPersonas.forEach(p => {
                                                                            const levels = PERSONA_HIERARCHY[p];
                                                                            if (levels && levels[currentStep - 1]) {
                                                                                options.push(...levels[currentStep - 1]);
                                                                            }
                                                                        });
                                                                        visibleOptions = slotFocusOptions.filter(opt => options.includes(opt));
                                                                    }

                                                                    return visibleOptions.map((opt) => {
                                                                        const isSelected = sprintFocus.includes(opt);
                                                                        const isTaken = focusTakenByOthers.includes(opt);
                                                                        const optIdx = slotFocusOptions.indexOf(opt);
                                                                        
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
                                                                                    : 'bg-white text-gray-400 border-gray-100 hover:border-primary/20 hover:text-primary'
                                                                                }`}
                                                                                title={isTaken ? 'Already mapped to another destination in this slot' : ''}
                                                                            >
                                                                                <span className={`w-5 h-5 rounded-lg flex items-center justify-center text-[8px] font-black ${isSelected ? 'bg-white/20 text-white' : isTaken ? 'bg-gray-100 text-gray-200' : 'bg-gray-50 text-gray-300 group-hover:bg-primary/10 group-hover:text-primary'}`}>
                                                                                    {optIdx + 1}
                                                                                </span>
                                                                                {opt}
                                                                                {isTaken && (
                                                                                    <span className="absolute -top-2 -right-1 bg-white text-gray-400 text-[6px] font-black px-1 rounded-sm border border-gray-100 shadow-sm whitespace-nowrap">Assigned</span>
                                                                                )}
                                                                            </button>
                                                                        );
                                                                    });
                                                                })()}
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
                                </div>
                            </div>
                        );
                    })}
                </div>

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
