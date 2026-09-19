import React, { useState } from 'react';
import { TrackStarterQuestion, Sprint } from '../types';
import { HelpCircle, Check, Edit2, Link2, Plus, Trash2, ArrowRight, Layers, Sparkles } from 'lucide-react';

interface TrackStarterSetupProps {
    starterQuestion?: TrackStarterQuestion;
    onChange: (data: TrackStarterQuestion) => void;
    selectedSprints: Sprint[];
    onPreview?: () => void;
}

export const TrackStarterSetup: React.FC<TrackStarterSetupProps> = ({
    starterQuestion,
    onChange,
    selectedSprints,
    onPreview
}) => {
    const [question, setQuestion] = useState(starterQuestion?.question || '');
    const [pollOptions, setPollOptions] = useState<string[]>(
        starterQuestion?.pollOptions && starterQuestion.pollOptions.length > 0 
            ? starterQuestion.pollOptions 
            : ['']
    );
    const [isSet, setIsSet] = useState<boolean>(starterQuestion?.isSet ?? false);
    const [pollSprintLinks, setPollSprintLinks] = useState<Record<string, string>>(
        starterQuestion?.pollSprintLinks || {}
    );

    // Quick linker selector state
    const [selectedOptionIndex, setSelectedOptionIndex] = useState<number>(0);
    const [selectedSprintId, setSelectedSprintId] = useState<string>(selectedSprints[0]?.id || '');

    // Sync to parent
    const updateParent = (
        updatedQ: string, 
        updatedOpts: string[], 
        updatedIsSet: boolean, 
        updatedLinks: Record<string, string>
    ) => {
        onChange({
            question: updatedQ,
            pollOptions: updatedOpts.filter(o => o.trim().length > 0),
            isSet: updatedIsSet,
            pollSprintLinks: updatedLinks
        });
    };

    const handleAddOption = () => {
        if (isSet) return;
        const updated = [...pollOptions, ''];
        setPollOptions(updated);
    };

    const handleOptionChange = (index: number, val: string) => {
        if (isSet) return;
        const updated = [...pollOptions];
        updated[index] = val;
        setPollOptions(updated);
    };

    const handleRemoveOption = (index: number) => {
        if (isSet) return;
        const updated = pollOptions.filter((_, i) => i !== index);
        setPollOptions(updated.length > 0 ? updated : ['']);
        
        // Remove link for that index and re-index remaining links
        const newLinks: Record<string, string> = {};
        let newIdx = 0;
        pollOptions.forEach((_, oldIdx) => {
            if (oldIdx !== index) {
                if (pollSprintLinks[oldIdx.toString()]) {
                    newLinks[newIdx.toString()] = pollSprintLinks[oldIdx.toString()];
                }
                newIdx++;
            }
        });
        setPollSprintLinks(newLinks);
    };

    const handleSetQuestion = () => {
        const cleanOpts = pollOptions.map(o => o.trim()).filter(o => o.length > 0);
        if (!question.trim()) {
            alert("Please enter a question before setting.");
            return;
        }
        if (cleanOpts.length === 0) {
            alert("Please add at least one poll option.");
            return;
        }

        setIsSet(true);
        setPollOptions(cleanOpts);
        updateParent(question, cleanOpts, true, pollSprintLinks);
    };

    const handleEditQuestion = () => {
        setIsSet(false);
        updateParent(question, pollOptions, false, pollSprintLinks);
    };

    const handleConnectOptionToSprint = (optionIdx: number, sprintId: string) => {
        const updated = {
            ...pollSprintLinks,
            [optionIdx.toString()]: sprintId
        };
        setPollSprintLinks(updated);
        updateParent(question, pollOptions, isSet, updated);
    };

    const handleQuickConnect = () => {
        if (selectedOptionIndex < 0 || selectedOptionIndex >= pollOptions.length) return;
        if (!selectedSprintId) return;
        handleConnectOptionToSprint(selectedOptionIndex, selectedSprintId);
    };

    const inputClasses = "w-full px-5 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none text-sm font-bold transition-all placeholder-gray-300";
    const labelClasses = "text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 block";

    return (
        <div className="bg-white rounded-[3rem] shadow-sm border border-gray-100 p-8 sm:p-10 space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h4 className="text-[10px] font-black text-primary uppercase tracking-widest">
                        Track Starter Experience
                    </h4>
                    <p className="text-xs text-gray-500 font-semibold mt-0.5">
                        Setup the starter questionnaire and connect poll options to sprints in this track
                    </p>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                    {onPreview && (
                        <button
                            type="button"
                            onClick={onPreview}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-[#0E7850] text-[#0E7850] hover:text-white border border-emerald-200/80 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-2xs active:scale-95"
                            title="Preview and test the after-payment questionnaire flow"
                        >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Preview Starter Flow</span>
                        </button>
                    )}
                    {isSet && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-[#0E7850] border border-emerald-200/60 rounded-xl text-[10px] font-black uppercase tracking-wider">
                            <Check className="w-3.5 h-3.5" />
                            Saved
                        </span>
                    )}
                </div>
            </div>

            {/* Question & Poll Setup Section */}
            <div className={`space-y-6 transition-all ${isSet ? 'p-6 bg-gray-50/70 border border-gray-100 rounded-3xl' : ''}`}>
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className={labelClasses}>Starter Question</label>
                        {isSet && (
                            <button
                                type="button"
                                onClick={handleEditQuestion}
                                className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-1 hover:underline cursor-pointer"
                            >
                                <Edit2 className="w-3 h-3" />
                                Edit Setup
                            </button>
                        )}
                    </div>
                    {isSet ? (
                        <div className="p-4 bg-white border border-gray-200/80 rounded-2xl text-sm font-black text-gray-900 shadow-sm flex items-center gap-3">
                            <HelpCircle className="w-4 h-4 text-primary shrink-0" />
                            <span>{question || "Where are you right now?"}</span>
                        </div>
                    ) : (
                        <input
                            type="text"
                            value={question}
                            onChange={(e) => {
                                setQuestion(e.target.value);
                                updateParent(e.target.value, pollOptions, isSet, pollSprintLinks);
                            }}
                            className={inputClasses}
                            placeholder="e.g. Where are you right now? or What is your primary goal?"
                        />
                    )}
                </div>

                {/* Poll Options */}
                <div>
                    <label className={labelClasses}>Poll Options</label>
                    {isSet ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {pollOptions.map((opt, idx) => (
                                <div
                                    key={idx}
                                    className="p-3.5 bg-white border border-gray-200/80 rounded-2xl text-xs font-bold text-gray-800 shadow-sm flex items-center justify-between"
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-black flex items-center justify-center">
                                            {idx + 1}
                                        </span>
                                        <span>{opt}</span>
                                    </div>
                                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Locked</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {pollOptions.map((opt, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                    <span className="w-7 h-7 rounded-xl bg-gray-100 text-gray-500 text-xs font-black flex items-center justify-center shrink-0">
                                        {idx + 1}
                                    </span>
                                    <input
                                        type="text"
                                        value={opt}
                                        onChange={(e) => handleOptionChange(idx, e.target.value)}
                                        className={inputClasses}
                                        placeholder={`Option ${idx + 1} (e.g. I want to build a system from scratch)`}
                                    />
                                    {pollOptions.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveOption(idx)}
                                            className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all cursor-pointer shrink-0"
                                            title="Remove Option"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            ))}

                            <div className="flex items-center gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={handleAddOption}
                                    className="px-4 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-black uppercase tracking-wider rounded-xl border border-gray-200/60 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add Option
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSetQuestion}
                                    className="px-6 py-2.5 bg-[#0E7850] hover:bg-[#085C3D] text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all active:scale-95 ml-auto"
                                >
                                    <Check className="w-4 h-4" />
                                    Set
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Poll to Sprint Link Section (shown after saving / setting) */}
            {isSet && (
                <div className="pt-6 border-t border-gray-100 space-y-6 animate-fade-in">
                    <div>
                        <div className="flex items-center gap-2">
                            <Link2 className="w-4 h-4 text-primary" />
                            <h5 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                                Poll to Sprint Link
                            </h5>
                        </div>
                        <p className="text-[11px] text-gray-400 font-semibold mt-1">
                            Connect each poll option to a sprint in this track. When a participant chooses an option on the starter page, they will be guided directly to the linked sprint.
                        </p>
                    </div>

                    {selectedSprints.length === 0 ? (
                        <div className="p-6 bg-amber-50/60 border border-amber-100 rounded-2xl text-center">
                            <p className="text-xs font-bold text-amber-700">
                                Please select sprints in the "Sprint Selection" section above so you can connect poll options to them.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Quick Connection Tool */}
                            <div className="bg-gray-50/80 p-4 sm:p-5 rounded-2xl border border-gray-100 space-y-3">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">
                                    Quick Connector
                                </span>
                                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                                    <div className="sm:col-span-5">
                                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider mb-1 block">
                                            Poll Option
                                        </label>
                                        <select
                                            value={selectedOptionIndex}
                                            onChange={(e) => setSelectedOptionIndex(Number(e.target.value))}
                                            className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none focus:border-primary"
                                        >
                                            {pollOptions.map((opt, idx) => (
                                                <option key={idx} value={idx}>
                                                    Option {idx + 1}: {opt.substring(0, 30)}{opt.length > 30 ? '...' : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="sm:col-span-1 flex justify-center text-gray-300">
                                        <ArrowRight className="w-4 h-4 hidden sm:block" />
                                    </div>

                                    <div className="sm:col-span-4">
                                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider mb-1 block">
                                            Sprint in Track
                                        </label>
                                        <select
                                            value={selectedSprintId || selectedSprints[0]?.id || ''}
                                            onChange={(e) => setSelectedSprintId(e.target.value)}
                                            className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none focus:border-primary"
                                        >
                                            {selectedSprints.map((s) => (
                                                <option key={s.id} value={s.id}>
                                                    {s.title}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="sm:col-span-2 pt-4 sm:pt-0 flex items-end">
                                        <button
                                            type="button"
                                            onClick={handleQuickConnect}
                                            className="w-full py-2.5 bg-[#0E7850] hover:bg-[#085C3D] text-white text-[11px] font-black uppercase tracking-wider rounded-xl shadow-sm cursor-pointer transition-all active:scale-95 text-center"
                                        >
                                            Connect
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Option-by-Option Mapping List */}
                            <div className="space-y-3">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">
                                    Option-to-Sprint Mappings
                                </span>
                                {pollOptions.map((opt, idx) => {
                                    const linkedSprintId = pollSprintLinks[idx.toString()];
                                    const linkedSprint = selectedSprints.find(s => s.id === linkedSprintId);

                                    return (
                                        <div
                                            key={idx}
                                            className="p-4 bg-white border border-gray-100 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="w-6 h-6 rounded-lg bg-emerald-50 text-[#0E7850] font-black text-[11px] flex items-center justify-center shrink-0 border border-emerald-100">
                                                    {idx + 1}
                                                </span>
                                                <span className="text-xs font-bold text-gray-800">
                                                    {opt}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-2 self-end sm:self-auto w-full sm:w-auto">
                                                <select
                                                    value={linkedSprintId || ''}
                                                    onChange={(e) => handleConnectOptionToSprint(idx, e.target.value)}
                                                    className="w-full sm:w-60 px-3 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 outline-none focus:border-primary transition-all cursor-pointer"
                                                >
                                                    <option value="">-- Choose connected sprint --</option>
                                                    {selectedSprints.map((s) => (
                                                        <option key={s.id} value={s.id}>
                                                            {s.title} ({s.duration} Days)
                                                        </option>
                                                    ))}
                                                </select>
                                                {linkedSprint && (
                                                    <div className="w-8 h-8 rounded-lg overflow-hidden border border-gray-100 shrink-0 hidden sm:block">
                                                        <img src={linkedSprint.coverImageUrl} className="w-full h-full object-cover" alt="" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default TrackStarterSetup;
