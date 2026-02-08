
import React, { useState, useEffect, useMemo } from 'react';
import { LifecycleStage, LifecycleSlot, Sprint } from '../../types';
import { LIFECYCLE_STAGES_CONFIG, LIFECYCLE_SLOTS, FOCUS_OPTIONS, CATEGORY_TO_STAGE_MAP } from '../../services/mockData';
import { sprintService } from '../../services/sprintService';
import Button from '../../components/Button';

interface OrchestratorProps {
    allSprints: Sprint[];
    refreshKey: number;
}

const LifecycleOrchestrator: React.FC<OrchestratorProps> = ({ allSprints, refreshKey }) => {
    const [selectedStage, setSelectedStage] = useState<LifecycleStage>('Foundation');
    const [assignments, setAssignments] = useState<Record<string, { sprintId: string; focusCriteria: string[] }>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [isInitialLoading, setIsInitialLoading] = useState(true);

    const STAGES: LifecycleStage[] = ['Foundation', 'Direction', 'Execution', 'Proof', 'Positioning', 'Stability', 'Expansion'];

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

    const globallyAssignedSprintIds = useMemo(() => {
        return Object.values(assignments).map((a: any) => a.sprintId).filter(id => !!id);
    }, [assignments]);

    const currentStageConfig = LIFECYCLE_STAGES_CONFIG[selectedStage];
    const currentSlots = LIFECYCLE_SLOTS.filter(s => s.stage === selectedStage);

    // Filter logic to show only sprints whose category maps to the selected stage
    const availableSprintsForStage = useMemo(() => {
        return allSprints.filter(s => {
            // Must be approved
            if (s.approvalStatus !== 'approved' && !s.published) return false;
            
            // PLATFORM EXCEPTION: Core and Fundamentals can be assigned to ANY stage in the lifecycle
            const isPlatformCore = s.category === 'Core Platform Sprint' || s.category === 'Growth Fundamentals';
            if (isPlatformCore) return true;

            const mappedStage = CATEGORY_TO_STAGE_MAP[s.category];
            
            // Strict check: Is this category mapped to this stage?
            if (mappedStage === selectedStage) return true;

            // Fallback: If it's already assigned here, keep it visible
            const isCurrentlyAssignedHere = currentSlots.some(slot => assignments[slot.id]?.sprintId === s.id);
            if (isCurrentlyAssignedHere) return true;

            return false;
        });
    }, [allSprints, selectedStage, assignments, currentSlots]);

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
            if (idx > -1) focusCriteria.splice(idx, 1);
            else focusCriteria.push(item);
            return { ...prev, [slotId]: { ...current, focusCriteria } };
        });
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await sprintService.saveOrchestration(assignments);
            alert("Orchestration published successfully.");
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
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Syncing Mapping...</p>
            </div>
        );
    }

    const availableFocusOptions = selectedStage === 'Foundation' 
        ? FOCUS_OPTIONS 
        : ['Growth Acceleration', 'Market Positioning', 'Skill Deepening', 'Portfolio Mastery'];

    return (
        <div className="flex flex-col lg:flex-row gap-10 animate-fade-in font-sans">
            {/* LEFT PANEL: TIMELINE */}
            <aside className="lg:w-64 flex-shrink-0">
                <div className="bg-gray-50 p-3 rounded-[2.5rem] border border-gray-100 flex flex-col gap-2">
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
                </div>
            </aside>

            {/* RIGHT PANEL: CONFIGURATION */}
            <main className="flex-1 space-y-8">
                {/* STAGE HEADER */}
                <header className="bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-sm relative overflow-hidden">
                    <div className="relative z-10">
                        <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-2 italic">
                            {currentStageConfig.subtitle}
                        </h2>
                        <p className="text-sm font-medium text-gray-400 italic">
                            "{currentStageConfig.description}"
                        </p>
                    </div>
                </header>

                {/* SPRINT SLOTS */}
                <div className="grid grid-cols-1 gap-4">
                    {currentSlots.map(slot => {
                        const assignment = assignments[slot.id] || { sprintId: '', focusCriteria: [] };
                        const assignedSprint = allSprints.find(s => s.id === assignment.sprintId);

                        return (
                            <div key={slot.id} className={`bg-white rounded-[2rem] border border-gray-100 p-8 shadow-sm flex flex-col gap-6 transition-all ${assignedSprint ? 'border-primary/20 bg-primary/[0.01]' : ''}`}>
                                
                                <div className="flex flex-col md:flex-row gap-8 items-start">
                                    <div className="w-full md:w-56">
                                        <h4 className="text-lg font-black text-gray-900 tracking-tight mb-1">{slot.name}</h4>
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none">Assignment Slot</p>
                                    </div>

                                    <div className="flex-1 w-full space-y-6">
                                        {/* POOL SELECTOR */}
                                        <div className="relative">
                                            <label className="block text-[8px] font-black text-gray-300 uppercase tracking-[0.2em] mb-1.5 ml-2">Available Pool ({availableSprintsForStage.length}):</label>
                                            <select 
                                                value={assignment.sprintId} 
                                                onChange={(e) => handleSprintAssign(slot.id, e.target.value)}
                                                className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all font-bold text-sm text-gray-700 cursor-pointer appearance-none"
                                            >
                                                <option value="">-- Unassigned --</option>
                                                {availableSprintsForStage
                                                    .filter(s => !globallyAssignedSprintIds.includes(s.id) || assignment.sprintId === s.id)
                                                    .map(s => (
                                                        <option key={s.id} value={s.id}>{s.title}</option>
                                                    ))
                                                }
                                            </select>
                                        </div>

                                        {/* FOCUS MAPPING */}
                                        <div className="space-y-3">
                                            <label className="block text-[8px] font-black text-gray-300 uppercase tracking-[0.2em] ml-2">Bind to Participant Focus:</label>
                                            <div className="flex flex-wrap gap-2">
                                                {availableFocusOptions.map(opt => {
                                                    const isSelected = assignment.focusCriteria.includes(opt);
                                                    return (
                                                        <button
                                                            key={opt}
                                                            onClick={() => toggleFocusItem(slot.id, opt)}
                                                            className={`px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all border active:scale-95 ${
                                                                isSelected 
                                                                ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' 
                                                                : 'bg-white text-gray-300 border-gray-100 hover:text-primary hover:border-primary/20'
                                                            }`}
                                                        >
                                                            {opt}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {assignedSprint && (
                                        <div className="w-full md:w-64 bg-white rounded-2xl p-4 border border-primary/10 flex items-center gap-4 shadow-sm animate-slide-up">
                                            <img src={assignedSprint.coverImageUrl} className="w-10 h-10 rounded-xl object-cover" alt="" />
                                            <div className="min-w-0 flex-1">
                                                <p className="text-[9px] font-black text-primary uppercase tracking-widest">Active Path</p>
                                                <p className="text-xs font-black text-gray-900 truncate">{assignedSprint.title}</p>
                                            </div>
                                            <button 
                                                onClick={() => handleSprintAssign(slot.id, '')}
                                                className="p-1.5 text-gray-300 hover:text-red-400 transition-colors cursor-pointer"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/></svg>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="flex justify-end pt-6">
                    <Button 
                        onClick={handleSave} 
                        isLoading={isSaving}
                        className="px-12 py-5 rounded-[1.5rem] shadow-xl shadow-primary/20 font-black uppercase tracking-widest text-[11px]"
                    >
                        Save Registry Mapping
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
