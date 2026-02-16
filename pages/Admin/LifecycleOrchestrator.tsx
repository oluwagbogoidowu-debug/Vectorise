
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { LifecycleStage, LifecycleSlot, Sprint, SprintType, MicroSelector, MicroSelectorStep, GlobalOrchestrationSettings, OrchestrationTrigger, OrchestrationAction, LifecycleSlotAssignment } from '../../types';
import { LIFECYCLE_STAGES_CONFIG, LIFECYCLE_SLOTS, FOCUS_OPTIONS } from '../../services/mockData';
import { sprintService } from '../../services/sprintService';
import Button from '../../components/Button';

interface OrchestratorProps {
    allSprints: Sprint[];
    refreshKey: number;
}

const SPRINT_TYPES: SprintType[] = ['Diagnostic', 'Narrowing', 'Execution', 'Expression', 'Stabilization'];
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

const LifecycleOrchestrator: React.FC<OrchestratorProps> = ({ allSprints, refreshKey }) => {
    const [selectedStage, setSelectedStage] = useState<LifecycleStage>('Foundation');
    const [assignments, setAssignments] = useState<Record<string, LifecycleSlotAssignment>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [isInitialLoading, setIsInitialLoading] = useState(true);

    const [editingFocusSlot, setEditingFocusSlot] = useState<string | null>(null);
    const [activeTriggerPicker, setActiveTriggerPicker] = useState<string | null>(null);
    const [activeSprintPicker, setActiveSprintPicker] = useState<string | null>(null);

    const [showGlobalSettings, setShowGlobalSettings] = useState(false);
    const [globalSettings, setGlobalSettings] = useState<GlobalOrchestrationSettings>({
        stageToTypeMapping: STAGES.reduce((acc, stage) => ({ ...acc, [stage]: [] }), {} as Record<LifecycleStage, SprintType[]>),
        microSelectors: [],
        triggerActions: TRIGGER_STATES.reduce((acc, trigger) => ({ ...acc, [trigger.id]: { type: 'none', value: '' } }), {} as Record<OrchestrationTrigger, OrchestrationAction>),
        focusOptions: FOCUS_OPTIONS
    });

    const loadOrchestrationData = useCallback(async (isInitial: boolean = false) => {
        if (isInitial) setIsInitialLoading(true);
        try {
            const [liveMapping, settings] = await Promise.all([
                sprintService.getOrchestration(),
                sprintService.getGlobalOrchestrationSettings()
            ]);
            
            setAssignments(liveMapping as Record<string, LifecycleSlotAssignment>);
            
            if (settings) {
                setGlobalSettings(prev => ({
                    ...prev,
                    ...settings,
                    triggerActions: {
                        ...prev.triggerActions,
                        ...(settings.triggerActions || {})
                    },
                    focusOptions: settings.focusOptions || FOCUS_OPTIONS
                }));
            }
        } catch (err) {
            console.error("Registry sync failed:", err);
        } finally {
            setIsInitialLoading(false);
        }
    }, []);

    useEffect(() => {
        loadOrchestrationData(true);
    }, [refreshKey, loadOrchestrationData]);

    const usedTriggerStates = useMemo(() => {
        return new Set(
            (Object.values(assignments) as LifecycleSlotAssignment[])
                .map(a => a.stateTrigger)
                .filter((t): t is OrchestrationTrigger => !!t)
        );
    }, [assignments]);

    const currentStageConfig = LIFECYCLE_STAGES_CONFIG[selectedStage];
    const currentSlots = LIFECYCLE_SLOTS.filter(s => s.stage === selectedStage);

    const handleSprintAssign = (slotId: string, sprintId: string) => {
        setAssignments(prev => {
            const current = prev[slotId] || { sprintId: '', sprintIds: [], focusCriteria: [], sprintFocusMap: {}, availableFocusOptions: [...FOCUS_OPTIONS] };
            const existingIds = current.sprintIds || (current.sprintId ? [current.sprintId] : []);
            
            let newIds = [...existingIds];
            if (newIds.includes(sprintId)) {
                newIds = newIds.filter(id => id !== sprintId);
                const focusMap = { ...(current.sprintFocusMap || {}) };
                delete focusMap[sprintId];
                return { 
                    ...prev, 
                    [slotId]: { ...current, sprintIds: newIds, sprintId: newIds[0] || '', sprintFocusMap: focusMap } 
                };
            } else {
                newIds.push(sprintId);
                return { 
                    ...prev, 
                    [slotId]: { ...current, sprintIds: newIds, sprintId: newIds[0] || '', sprintFocusMap: current.sprintFocusMap || {} } 
                };
            }
        });
        setActiveSprintPicker(null);
    };

    const handleTriggerAssign = (slotId: string, triggerId: OrchestrationTrigger | undefined) => {
        setAssignments(prev => ({
            ...prev,
            [slotId]: { ...(prev[slotId] || { sprintId: '', focusCriteria: [], availableFocusOptions: [...FOCUS_OPTIONS] }), stateTrigger: triggerId }
        }));
        setActiveTriggerPicker(null);
    };

    const handleToggleSprintFocus = (slotId: string, sprintId: string, option: string) => {
        setAssignments(prev => {
            const current = prev[slotId] || { sprintId: '', sprintIds: [], focusCriteria: [], sprintFocusMap: {}, availableFocusOptions: [...FOCUS_OPTIONS] };
            const focusMap = { ...(current.sprintFocusMap || {}) };
            const currentFocus = [...(focusMap[sprintId] || [])];
            
            const idx = currentFocus.indexOf(option);
            if (idx > -1) currentFocus.splice(idx, 1);
            else currentFocus.push(option);
            
            focusMap[sprintId] = currentFocus;
            
            return { 
                ...prev, 
                [slotId]: { ...current, sprintFocusMap: focusMap } 
            };
        });
    };

    const handleUpdateFocusOptionText = (slotId: string, optIdx: number, newText: string) => {
        setAssignments(prev => {
            const current = prev[slotId] || { sprintId: '', focusCriteria: [], availableFocusOptions: [...FOCUS_OPTIONS] };
            const options = [...(current.availableFocusOptions || FOCUS_OPTIONS)];
            const oldText = options[optIdx];
            options[optIdx] = newText;
            
            const focusMap = { ...(current.sprintFocusMap || {}) };
            Object.keys(focusMap).forEach(sId => {
                focusMap[sId] = focusMap[sId].map(f => f === oldText ? newText : f);
            });

            return { ...prev, [slotId]: { ...current, availableFocusOptions: options, sprintFocusMap: focusMap } };
        });
    };

    const handleAddFocusOption = (slotId: string) => {
        setAssignments(prev => {
            const current = prev[slotId] || { sprintId: '', focusCriteria: [], availableFocusOptions: [...FOCUS_OPTIONS] };
            const options = [...(current.availableFocusOptions || FOCUS_OPTIONS), 'New focus path'];
            return { ...prev, [slotId]: { ...current, availableFocusOptions: options } };
        });
    };

    const handleRemoveFocusOption = (slotId: string, optIdx: number) => {
        setAssignments(prev => {
            const current = prev[slotId] || { sprintId: '', focusCriteria: [], availableFocusOptions: [...FOCUS_OPTIONS] };
            const options = [...(current.availableFocusOptions || FOCUS_OPTIONS)];
            const removedText = options[optIdx];
            options.splice(optIdx, 1);
            
            const focusMap = { ...(current.sprintFocusMap || {}) };
            Object.keys(focusMap).forEach(sId => {
                focusMap[sId] = focusMap[sId].filter(c => c !== removedText);
            });
            
            return { ...prev, [slotId]: { ...current, availableFocusOptions: options, sprintFocusMap: focusMap } };
        });
    };

    const handleSaveRegistry = async () => {
        setIsSaving(true);
        try {
            await sprintService.saveOrchestration(assignments);
            alert("Registry state synchronized.");
        } catch (err) {
            alert("Persistence failed.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveGlobalSettings = async () => {
        setIsSaving(true);
        try {
            await sprintService.saveGlobalOrchestrationSettings(globalSettings);
            setShowGlobalSettings(false);
            alert("Global logic published.");
        } catch (err) {
            alert("Settings save failed.");
        } finally {
            setIsSaving(false);
        }
    };

    const updateTriggerAction = (triggerId: OrchestrationTrigger, updates: Partial<OrchestrationAction>) => {
        setGlobalSettings(prev => ({
            ...prev,
            triggerActions: {
                ...prev.triggerActions,
                [triggerId]: { ...(prev.triggerActions[triggerId] || { type: 'none', value: '' }), ...updates }
            }
        }));
    };

    const updateMicroSelector = (id: string, updates: Partial<MicroSelector>) => {
        setGlobalSettings(prev => ({
            ...prev,
            microSelectors: prev.microSelectors.map(ms => ms.id === id ? { ...ms, ...updates } : ms)
        }));
    };

    const updateStep = (msId: string, stepIdx: number, updates: Partial<MicroSelectorStep>) => {
        setGlobalSettings(prev => ({
            ...prev,
            microSelectors: prev.microSelectors.map(ms => {
                if (ms.id !== msId) return ms;
                const steps = [...ms.steps];
                steps[stepIdx] = { ...steps[stepIdx], ...updates };
                return { ...ms, steps };
            })
        }));
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
        <div className="flex flex-col lg:flex-row gap-10 animate-fade-in font-sans relative pb-20">
            <aside className="lg:w-64 flex-shrink-0">
                <div className="bg-gray-50 p-3 rounded-[2.5rem] border border-gray-100 flex flex-col gap-2 sticky top-6">
                    {STAGES.map((stage, idx) => (
                        <button
                            key={stage}
                            onClick={() => setSelectedStage(stage)}
                            className={`flex flex-col items-start gap-1 px-6 py-4 rounded-2xl transition-all duration-300 relative group cursor-pointer ${
                                selectedStage === stage 
                                ? 'bg-primary text-white shadow-xl scale-[1.03] z-10' 
                                : 'bg-white text-gray-400 border border-transparent hover:border-gray-200'
                            }`}
                        >
                            <span className={`text-[8px] font-black uppercase tracking-widest ${selectedStage === stage ? 'text-white/60' : 'text-gray-300'}`}>0{idx + 1}</span>
                            <span className="text-xs font-black uppercase tracking-tight">{stage}</span>
                        </button>
                    ))}
                    
                    <button 
                        onClick={() => setShowGlobalSettings(true)}
                        className="mt-4 flex items-center justify-center gap-2 py-4 bg-white text-gray-400 border border-gray-100 rounded-2xl hover:text-primary hover:border-primary/20 transition-all group active:scale-95"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 group-hover:rotate-90 transition-transform duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        <span className="text-[10px] font-black uppercase tracking-widest">Global Settings</span>
                    </button>
                </div>
            </aside>

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
                    </div>
                </header>

                <div className="grid grid-cols-1 gap-6">
                    {currentSlots.map((slot) => {
                        const assignment = assignments[slot.id] || { sprintId: '', sprintIds: [], focusCriteria: [], sprintFocusMap: {}, availableFocusOptions: [...FOCUS_OPTIONS] };
                        const assignedSprintIds = assignment.sprintIds || (assignment.sprintId ? [assignment.sprintId] : []);
                        
                        const isTriggerOpen = activeTriggerPicker === slot.id;
                        const isSprintPickerOpen = activeSprintPicker === slot.id;
                        const isEditingFocusText = editingFocusSlot === slot.id;
                        
                        const slotFocusOptions = assignment.availableFocusOptions || FOCUS_OPTIONS;
                        const availableSprintsForPicker = allSprints
                            .filter(s => (s.published && s.approvalStatus === 'approved') && !assignedSprintIds.includes(s.id))
                            .sort((a, b) => a.title.localeCompare(b.title));

                        return (
                            <div key={slot.id} className="bg-white rounded-[2.5rem] border border-gray-100 p-8 shadow-sm flex flex-col gap-8 transition-all relative overflow-visible">
                                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="text-lg font-black text-gray-900 tracking-tight italic">{slot.name}</h4>
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
                                                <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar pr-2 mt-4">
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
                                                    }) : (
                                                        <div className="py-12 text-center">
                                                            <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest">No additional sprints available for selection.</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {assignedSprintIds.length > 0 && (
                                        <div className="space-y-8 animate-fade-in mt-10">
                                            {assignedSprintIds.map((sId) => {
                                                const s = allSprints.find(x => x.id === sId);
                                                if (!s) return null;
                                                const sprintFocus = (assignment.sprintFocusMap || {})[sId] || [];

                                                return (
                                                    <div key={sId} className="w-full p-8 rounded-[2.5rem] border border-primary/10 bg-white shadow-md flex flex-col gap-6 group transition-all hover:shadow-lg">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-12 h-12 rounded-xl overflow-hidden shadow-sm border border-gray-100">
                                                                    <img src={s.coverImageUrl} className="w-full h-full object-cover" alt="" />
                                                                </div>
                                                                <div className="text-left">
                                                                    <p className="text-[9px] font-black uppercase tracking-widest text-primary">
                                                                        Assigned Program
                                                                    </p>
                                                                    <h6 className="text-lg font-black tracking-tight text-gray-900 italic">
                                                                        {s.title}
                                                                    </h6>
                                                                </div>
                                                            </div>
                                                            <button 
                                                                onClick={() => handleSprintAssign(slot.id, sId)}
                                                                className="p-2.5 text-gray-300 hover:text-red-500 transition-colors bg-gray-50 rounded-xl"
                                                                title="Unassign Program"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                                                            </button>
                                                        </div>

                                                        <div className="space-y-4 pt-4 border-t border-gray-50">
                                                            <div className="flex items-center gap-3">
                                                                <h5 className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Map Focus Criteria</h5>
                                                                <div className="h-px bg-gray-50 flex-1"></div>
                                                            </div>
                                                            
                                                            <div className="flex flex-wrap gap-2">
                                                                {slotFocusOptions.map((opt, optIdx) => {
                                                                    const isSelected = sprintFocus.includes(opt);
                                                                    
                                                                    return (
                                                                        <button
                                                                            key={opt}
                                                                            onClick={() => handleToggleSprintFocus(slot.id, sId, opt)}
                                                                            className={`px-4 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all border flex items-center gap-2.5 group ${
                                                                                isSelected 
                                                                                ? 'bg-primary text-white border-primary shadow-lg scale-[1.02]' 
                                                                                : 'bg-white text-gray-400 border-gray-100 hover:border-primary/20 hover:text-primary'
                                                                            }`}
                                                                        >
                                                                            <span className={`w-5 h-5 rounded-lg flex items-center justify-center text-[8px] font-black ${isSelected ? 'bg-white/20 text-white' : 'bg-gray-50 text-gray-300 group-hover:bg-primary/10 group-hover:text-primary'}`}>
                                                                                {optIdx + 1}
                                                                            </span>
                                                                            {opt}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                            {sprintFocus.length > 0 && (
                                                                <p className="text-[8px] font-bold text-primary italic uppercase tracking-widest mt-1">
                                                                    Tags: {sprintFocus.map(f => slotFocusOptions.indexOf(f) + 1).join(', ')} assigned to this sprint.
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
                    <Button onClick={handleSaveRegistry} isLoading={isSaving} className="px-16 py-5 rounded-[1.75rem] shadow-2xl font-black uppercase tracking-widest text-[11px] scale-105 active:scale-100">
                        Synchronize Registry
                    </Button>
                </div>
            </main>

            {showGlobalSettings && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-dark/90 backdrop-blur-md animate-fade-in">
                    <div className="bg-white rounded-[3rem] w-full max-w-4xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] animate-slide-up">
                        <header className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 flex-shrink-0">
                            <div>
                                <h3 className="text-2xl font-black text-gray-900 tracking-tight italic">Orchestration Settings</h3>
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">Global logic & selector registry</p>
                            </div>
                            <button onClick={() => setShowGlobalSettings(false)} className="p-2 text-gray-400 hover:text-gray-900">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </header>

                        <div className="flex-1 overflow-y-auto p-10 space-y-16 custom-scrollbar">
                            <section>
                                <div className="flex items-center gap-3 mb-8">
                                    <div className="w-1.5 h-6 bg-primary rounded-full"></div>
                                    <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest">Stage Restriction Matrix</h4>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {STAGES.map(stage => (
                                        <div key={stage} className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                                            <p className="text-[10px] font-black text-gray-900 uppercase tracking-widest mb-4">{stage}</p>
                                            <div className="flex flex-wrap gap-2">
                                                {SPRINT_TYPES.map(type => {
                                                    const isSelected = globalSettings.stageToTypeMapping[stage]?.includes(type);
                                                    return (
                                                        <button 
                                                            key={type}
                                                            onClick={() => {
                                                                const current = globalSettings.stageToTypeMapping[stage] || [];
                                                                const updated = isSelected ? current.filter(t => t !== type) : [...current, type];
                                                                setGlobalSettings(prev => ({
                                                                    ...prev,
                                                                    stageToTypeMapping: { ...prev.stageToTypeMapping, [stage]: updated }
                                                                }));
                                                            }}
                                                            className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${isSelected ? 'bg-primary text-white shadow-md' : 'bg-white text-gray-400 border border-gray-200'}`}
                                                        >
                                                            {type}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            <section>
                                <div className="flex items-center gap-3 mb-8">
                                    <div className="w-1.5 h-6 bg-orange-500 rounded-full"></div>
                                    <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest">Engagement Moment Logic</h4>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {TRIGGER_STATES.map(trigger => (
                                        <div key={trigger.id} className="p-6 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
                                            <p className="text-[10px] font-black text-gray-900 uppercase tracking-widest">{trigger.label}</p>
                                            <div className="flex flex-col gap-3">
                                                <select value={globalSettings.triggerActions[trigger.id]?.type || 'none'} onChange={e => updateTriggerAction(trigger.id, { type: e.target.value as any })} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest">
                                                    <option value="none">No Action</option>
                                                    <option value="show_micro_selector">Trigger Selector / Poll</option>
                                                    <option value="recommend_sprint">Force Recommend Sprint</option>
                                                    <option value="navigate_to">Direct Path Navigation</option>
                                                </select>
                                                {globalSettings.triggerActions[trigger.id]?.type === 'show_micro_selector' && (
                                                    <select value={globalSettings.triggerActions[trigger.id]?.value || ''} onChange={e => updateTriggerAction(trigger.id, { value: e.target.value })} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold text-primary">
                                                        <option value="">Select Defined Selector...</option>
                                                        {globalSettings.microSelectors.map(ms => <option key={ms.id} value={ms.id}>{ms.title}</option>)}
                                                    </select>
                                                )}
                                                {(globalSettings.triggerActions[trigger.id]?.type === 'recommend_sprint' || globalSettings.triggerActions[trigger.id]?.type === 'navigate_to') && (
                                                    <input type="text" value={globalSettings.triggerActions[trigger.id]?.value || ''} onChange={e => updateTriggerAction(trigger.id, { value: e.target.value })} placeholder={globalSettings.triggerActions[trigger.id]?.type === 'recommend_sprint' ? "Sprint Identity ID" : "/path-to-target"} className="w-full bg-white border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold" />
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            <section>
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-3">
                                        <div className="w-1.5 h-6 bg-blue-500 rounded-full"></div>
                                        <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest">Selector Registry</h4>
                                    </div>
                                    <button onClick={() => setGlobalSettings(prev => ({ ...prev, microSelectors: [...prev.microSelectors, { id: `ms_${Date.now()}`, title: 'New engagement selector', steps: [{ question: 'What is your goal?', options: [] }] }] }))} className="px-6 py-3 bg-blue-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">+ New Selector</button>
                                </div>
                                <div className="space-y-6">
                                    {globalSettings.microSelectors.length === 0 ? (
                                        <div className="py-20 text-center bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-200"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Registry empty.</p></div>
                                    ) : (
                                        globalSettings.microSelectors.map(ms => (
                                            <div key={ms.id} className="p-8 bg-white border border-gray-100 rounded-[2.5rem] shadow-sm space-y-8 relative group">
                                                <div className="flex flex-col sm:flex-row gap-6 items-start justify-between">
                                                    <div className="flex-1 w-full space-y-4">
                                                        <div>
                                                            <label className="text-[8px] font-black text-gray-300 uppercase tracking-widest block mb-1.5">Registry Title</label>
                                                            <input type="text" value={ms.title} onChange={e => updateMicroSelector(ms.id, { title: e.target.value })} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 font-black text-sm text-gray-700" />
                                                        </div>
                                                    </div>
                                                    <button onClick={() => setGlobalSettings(prev => ({ ...prev, microSelectors: prev.microSelectors.filter(x => x.id !== ms.id) }))} className="text-red-300 hover:text-red-500 transition-colors p-2.5 rounded-xl hover:bg-red-50"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1v3M4 7h16" /></svg></button>
                                                </div>
                                                <div className="space-y-6">
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-2">Steps & Logic</p>
                                                    {ms.steps.map((step, sIdx) => (
                                                        <div key={sIdx} className="pl-6 border-l-2 border-gray-100 space-y-4 relative">
                                                            <div className="absolute -left-1.5 top-0 w-3 h-3 bg-white border-2 border-gray-200 rounded-full"></div>
                                                            <input type="text" value={step.question} placeholder={`Question ${sIdx + 1}`} onChange={e => updateStep(ms.id, sIdx, { question: e.target.value })} className="w-full bg-white border-b border-gray-100 py-2 font-bold text-gray-800 outline-none focus:border-primary transition-all text-base" />
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                                {step.options.map((opt, oIdx) => (
                                                                    <div key={oIdx} className="bg-gray-50 p-5 rounded-2xl space-y-3 border border-gray-100">
                                                                        <input type="text" value={opt.label} placeholder="Option Label" onChange={e => { const options = [...step.options]; options[oIdx] = { ...opt, label: e.target.value }; updateStep(ms.id, sIdx, { options }); }} className="w-full bg-white border border-gray-100 rounded-lg px-3 py-2 text-xs font-bold" />
                                                                        <select value={opt.action} onChange={e => { const options = [...step.options]; options[oIdx] = { ...opt, action: e.target.value as any }; updateStep(ms.id, sIdx, { options }); }} className="w-full bg-white border border-gray-100 rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-widest"><option value="next_step">Next Step</option><option value="finish_and_recommend">Finish & Recommend</option><option value="skip_to_stage">Skip to Stage</option></select>
                                                                        {opt.action === 'skip_to_stage' && (<select value={opt.value} onChange={e => { const options = [...step.options]; options[oIdx] = { ...opt, value: e.target.value }; updateStep(ms.id, sIdx, { options }); }} className="w-full bg-white border border-gray-100 rounded-lg px-3 py-2 text-[10px] font-bold"><option value="">Stage Identity...</option>{STAGES.map(s => <option key={s} value={s}>{s}</option>)}</select>)}
                                                                        <button onClick={() => { const options = step.options.filter((_, i) => i !== oIdx); updateStep(ms.id, sIdx, { options }); }} className="w-full py-1 text-[8px] font-black text-red-300 uppercase hover:text-red-500 transition-colors">Remove Option</button>
                                                                    </div>
                                                                ))}
                                                                <button onClick={() => { const steps = [...ms.steps]; steps[sIdx] = { ...steps[sIdx], options: [...steps[sIdx].options, { label: 'Option', action: 'next_step' }] }; updateMicroSelector(ms.id, { steps }); }} className="border-2 border-dashed border-gray-100 rounded-2xl p-5 text-[9px] font-black text-gray-400 uppercase hover:bg-gray-50 transition-all active:scale-95 flex items-center justify-center">+ Option</button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    <button onClick={() => updateMicroSelector(ms.id, { steps: [...ms.steps, { question: 'Next Question', options: [] }] })} className="w-full py-4 bg-gray-50 text-gray-400 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-gray-100 transition-all active:scale-95 border border-gray-100">+ New Logic Step</button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </section>
                        </div>

                        <footer className="p-8 border-t border-gray-100 flex justify-end gap-4 bg-gray-50/50 flex-shrink-0">
                            <button onClick={() => setShowGlobalSettings(false)} className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors">Cancel</button>
                            <Button onClick={handleSaveGlobalSettings} isLoading={isSaving} className="px-12 py-4 rounded-2xl shadow-xl text-[10px] uppercase font-black">Publish Logic</Button>
                        </footer>
                    </div>
                </div>
            )}
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; } 
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                @keyframes slideUp { from { transform: translateY(12px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                .animate-slide-up { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
            `}</style>
        </div>
    );
};

export default LifecycleOrchestrator;
