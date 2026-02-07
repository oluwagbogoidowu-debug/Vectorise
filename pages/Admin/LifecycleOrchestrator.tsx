
import React, { useState, useEffect, useMemo } from 'react';
import { LifecycleStage, LifecycleSlot, Sprint } from '../../types';
import { LIFECYCLE_STAGES_CONFIG, LIFECYCLE_SLOTS, FOCUS_OPTIONS } from '../../services/mockData';
import { sprintService } from '../../services/sprintService';
import Button from '../../components/Button';

interface OrchestratorProps {
    allSprints: Sprint[];
    refreshKey: number;
}

const LifecycleOrchestrator: React.FC<OrchestratorProps> = ({ allSprints, refreshKey }) => {
    const [selectedStage, setSelectedStage] = useState<LifecycleStage>('Foundation');
    // Map: slotId -> { sprintId, focusCriteria: string[] }
    const [assignments, setAssignments] = useState<Record<string, { sprintId: string; focusCriteria: string[] }>>({});
    const [isOverrideEnabled, setIsOverrideEnabled] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isInitialLoading, setIsInitialLoading] = useState(true);

    const STAGES: LifecycleStage[] = ['Foundation', 'Direction', 'Execution', 'Proof', 'Positioning', 'Stability', 'Expansion'];

    // 1. Fetch live orchestration from database
    useEffect(() => {
        const loadOrchestration = async () => {
            if (refreshKey > 0) setIsInitialLoading(false);
            try {
                const liveMapping = await sprintService.getOrchestration() as any;
                setAssignments(liveMapping);
            } catch (err) {
                console.error("Registry sync failed:", err);
            } finally {
                setIsInitialLoading(false);
            }
        };
        loadOrchestration();
    }, [refreshKey]);

    // 2. Identify all sprints currently assigned globally (to exclude them from selectors)
    const globallyAssignedSprintIds = useMemo(() => {
        return Object.values(assignments).map((a: { sprintId: string; focusCriteria: string[] }) => a.sprintId).filter(id => !!id);
    }, [assignments]);

    const currentStageConfig = LIFECYCLE_STAGES_CONFIG[selectedStage];
    const currentSlots = LIFECYCLE_SLOTS.filter(s => s.stage === selectedStage);

    const handleSprintAssign = (slotId: string, sprintId: string) => {
        setAssignments(prev => ({ 
            ...prev, 
            [slotId]: { ...(prev[slotId] || { focusCriteria: [] }), sprintId } 
        }));
    };

    const toggleFocusItem = (slotId: string, item: string) => {
        setAssignments(prev => {
            const current = prev[slotId] || { sprintId: '', focusCriteria: [] };
            const focusCriteria = [...current.focusCriteria];
            const idx = focusCriteria.indexOf(item);
            
            if (idx > -1) {
                focusCriteria.splice(idx, 1);
            } else {
                focusCriteria.push(item);
            }
            
            return { 
                ...prev, 
                [slotId]: { ...current, focusCriteria } 
            };
        });
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await sprintService.saveOrchestration(assignments);
            alert("Orchestration published to database successfully.");
        } catch (err) {
            alert("Registry persistence failed.");
        } finally {
            setIsSaving(false);
        }
    };

    if (isInitialLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 bg-white rounded-[3rem] border border-gray-100 shadow-sm animate-pulse">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Syncing Growth Mapping...</p>
            </div>
        );
    }

    const availableFocusOptions = selectedStage === 'Foundation' 
        ? FOCUS_OPTIONS 
        : ['Growth Acceleration', 'Market Positioning', 'Skill Deepening', 'Portfolio Mastery'];

    return (
        <div className="flex flex-col lg:flex-row gap-10 animate-fade-in">
            {/* LEFT PANEL: FIXED TIMELINE */}
            <aside className="lg:w-72 flex-shrink-0">
                <div className="bg-gray-50 p-4 rounded-[2.5rem] border border-gray-100 flex flex-col gap-2">
                    {STAGES.map((stage, idx) => (
                        <button
                            key={stage}
                            onClick={() => setSelectedStage(stage)}
                            className={`flex items-center gap-4 px-6 py-5 rounded-2xl transition-all duration-300 relative group cursor-pointer ${
                                selectedStage === stage 
                                ? 'bg-primary text-white shadow-xl shadow-primary/20 scale-105 z-10' 
                                : 'bg-white text-gray-400 hover:text-gray-900 border border-transparent hover:border-gray-200'
                            }`}
                        >
                            <span className={`text-[10px] font-black w-5 text-center ${selectedStage === stage ? 'text-white' : 'text-gray-300'}`}>0{idx + 1}</span>
                            <span className="text-xs font-black uppercase tracking-[0.1em]">{stage}</span>
                            {selectedStage === stage && (
                                <div className="absolute right-4 w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                            )}
                        </button>
                    ))}
                </div>
            </aside>

            {/* RIGHT PANEL: STAGE CONFIGURATION */}
            <main className="flex-1 space-y-10">
                {/* A. STAGE DEFINITION */}
                <section className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-sm relative overflow-hidden group animate-slide-up">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-1.5 h-6 bg-primary rounded-full"></div>
                        <h2 className="text-xl font-black text-gray-900 uppercase tracking-widest">{selectedStage} Protocol</h2>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div>
                            <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-3">User State</p>
                            <p className="text-sm font-medium text-gray-600 leading-relaxed italic">"{currentStageConfig.description}"</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-red-300 uppercase tracking-widest mb-3">Not Ready For</p>
                            <p className="text-sm font-medium text-red-500 leading-relaxed italic">"{currentStageConfig.notReadyFor}"</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-3">Exp. Window</p>
                            <p className="text-sm font-black text-gray-900 uppercase tracking-widest">{currentStageConfig.durationRange}</p>
                        </div>
                    </div>
                    <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors"></div>
                </section>

                {/* B & C. SPRINT SLOTS & MULTI-SELECTORS */}
                <section className="space-y-6">
                    <div className="flex justify-between items-center px-4">
                        <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em]">Operational Slots</h3>
                        <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-full border border-gray-100">
                             <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Segment Overrides</span>
                             <button 
                                onClick={() => setIsOverrideEnabled(!isOverrideEnabled)}
                                className={`w-10 h-5 rounded-full transition-all relative cursor-pointer ${isOverrideEnabled ? 'bg-primary' : 'bg-gray-200'}`}
                             >
                                 <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${isOverrideEnabled ? 'left-6' : 'left-1'}`}></div>
                             </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                        {currentSlots.map(slot => {
                            const assignment = assignments[slot.id] || { sprintId: '', focusCriteria: [] };
                            const assignedSprint = allSprints.find(s => s.id === assignment.sprintId);

                            return (
                                <div key={slot.id} className={`bg-white rounded-[2.5rem] border border-gray-100 p-8 shadow-sm flex flex-col gap-8 items-stretch transition-all group ${assignedSprint ? 'border-primary/20' : 'hover:border-gray-300'}`}>
                                    
                                    <div className="flex flex-col md:flex-row gap-8 items-start">
                                        <div className="w-full md:w-64 space-y-2">
                                            <div className="flex items-center gap-2">
                                                <span className="px-2 py-0.5 bg-gray-100 rounded text-[8px] font-black text-gray-500 uppercase tracking-widest">{slot.type}</span>
                                                {slot.required && <span className="text-[8px] font-black text-primary uppercase tracking-widest">● Required</span>}
                                                {assignedSprint && (
                                                    <span className="px-2 py-0.5 bg-primary text-white rounded text-[8px] font-black uppercase tracking-widest">Active</span>
                                                )}
                                            </div>
                                            <h4 className="text-lg font-black text-gray-900 tracking-tight">{slot.name}</h4>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Quota: {slot.maxCount} Sprint</p>
                                        </div>

                                        <div className="flex-1 w-full space-y-6">
                                            {/* SPRINT SELECTOR */}
                                            <div className="relative">
                                                <label className="block text-[8px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1.5 ml-2">Assigned Program:</label>
                                                <select 
                                                    value={assignment.sprintId} 
                                                    onChange={(e) => handleSprintAssign(slot.id, e.target.value)}
                                                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all font-bold text-sm text-gray-700 cursor-pointer appearance-none"
                                                >
                                                    <option value="">-- Select Approved Sprint --</option>
                                                    {allSprints
                                                        .filter(s => 
                                                            s.approvalStatus === 'approved' && 
                                                            (!globallyAssignedSprintIds.includes(s.id) || assignment.sprintId === s.id)
                                                        )
                                                        .map(s => (
                                                            <option key={s.id} value={s.id}>{s.title} ({s.duration}d)</option>
                                                        ))
                                                    }
                                                </select>
                                                <div className="absolute right-6 top-[38px] pointer-events-none text-gray-300">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7"/></svg>
                                                </div>
                                            </div>

                                            {/* FOCUS MULTI-SELECTOR */}
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center px-2">
                                                    <label className="block text-[8px] font-black text-gray-400 uppercase tracking-[0.2em]">Recommended For Focus (Poll Mapping):</label>
                                                    <span className="text-[8px] font-black text-primary uppercase">{assignment.focusCriteria.length} Selected</span>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {availableFocusOptions.map(opt => {
                                                        const isSelected = assignment.focusCriteria.includes(opt);
                                                        return (
                                                            <button
                                                                key={opt}
                                                                onClick={() => toggleFocusItem(slot.id, opt)}
                                                                className={`px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all duration-300 border active:scale-95 ${
                                                                    isSelected 
                                                                    ? 'bg-primary text-white border-primary shadow-md shadow-primary/20' 
                                                                    : 'bg-white text-gray-400 border-gray-100 hover:border-primary/30 hover:text-primary'
                                                                }`}
                                                            >
                                                                {isSelected && <span className="mr-1.5">✓</span>}
                                                                {opt}
                                                            </button>
                                                        );
                                                    })}
                                                    {assignment.focusCriteria.length === 0 && (
                                                        <div className="text-[9px] font-bold text-gray-300 italic py-2 ml-1">No focus constraints - visible to all in {selectedStage}.</div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {assignedSprint && (
                                            <div className="w-full md:w-72 bg-gray-50 rounded-2xl p-4 border border-primary/10 flex items-center gap-4 animate-slide-up self-end mt-4 lg:mt-0">
                                                <img src={assignedSprint.coverImageUrl} className="w-12 h-12 rounded-xl object-cover shadow-sm group-hover:scale-105 transition-all" alt="" />
                                                <div className="min-w-0">
                                                    <p className="text-[9px] font-black text-primary uppercase tracking-widest">{assignedSprint.duration} Days</p>
                                                    <p className="text-xs font-black text-gray-900 truncate">{assignedSprint.primaryOutcome || assignedSprint.title}</p>
                                                </div>
                                                <button 
                                                    onClick={() => handleSprintAssign(slot.id, '')}
                                                    className="ml-auto p-1.5 text-gray-300 hover:text-red-400 transition-colors cursor-pointer"
                                                    title="Remove Assignment"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                <div className="flex justify-end pt-10 border-t border-gray-100">
                    <Button 
                        onClick={handleSave} 
                        isLoading={isSaving}
                        className="px-12 py-5 rounded-[1.5rem] shadow-xl shadow-primary/20 font-black uppercase tracking-widest text-[11px] group active:scale-95 transition-all"
                    >
                        Publish Growth Mapping <span className="ml-2 group-hover:translate-x-1 transition-transform inline-block">→</span>
                    </Button>
                </div>
            </main>

            <style>{`
                @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-slide-up { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                .animate-fade-in { animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}</style>
        </div>
    );
};

export default LifecycleOrchestrator;
