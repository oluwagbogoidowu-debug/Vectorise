import React, { useState, useEffect, useMemo } from 'react';
import { Sprint, UserIdentificationRule, User } from '../../types';
import { userIdentificationService } from '../../services/userIdentificationService';
import { sprintService } from '../../services/sprintService';
import { userService } from '../../services/userService';
import { parseOptionCodeHelper } from '../../utils/sprintUtils';
import CustomSelect from '../../components/CustomSelect';
import Button from '../../components/Button';
import { toast } from 'sonner';

interface AdminUserIdentificationTrackingProps {
    allSprints?: Sprint[];
}

const COMMON_TARGET_FIELDS = [
    { key: 'archetype', label: 'Archetype / Persona', category: 'Identity' },
    { key: 'intention', label: 'Primary Rise Intention', category: 'Identity' },
    { key: 'occupation', label: 'Occupation / Role', category: 'Demographics' },
    { key: 'industry', label: 'Industry / Domain', category: 'Demographics' },
    { key: 'gender', label: 'Gender', category: 'Demographics' },
    { key: 'risePathway', label: 'Rise Pathway', category: 'Progression' },
    { key: 'growthAreas', label: 'Growth Focus Areas', category: 'Progression' },
    { key: 'experienceLevel', label: 'Experience Level', category: 'Experience' },
    { key: 'primaryGoal', label: 'Primary Goal / Milestone', category: 'Objectives' },
    { key: 'targetNiche', label: 'Target Audience / Niche', category: 'Business' },
    { key: 'custom', label: '➕ Custom Field Key...', category: 'Custom' },
];

export default function AdminUserIdentificationTracking({ allSprints = [] }: AdminUserIdentificationTrackingProps) {
    const [rules, setRules] = useState<UserIdentificationRule[]>([]);
    const [sprints, setSprints] = useState<Sprint[]>(allSprints);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Form state
    const [sourceSprintId, setSourceSprintId] = useState<string>('');
    const [optionCode, setOptionCode] = useState<string>('');
    const [selectedFieldPreset, setSelectedFieldPreset] = useState<string>('archetype');
    const [customFieldKey, setCustomFieldKey] = useState<string>('');
    const [valueMode, setValueMode] = useState<'dynamic' | 'custom'>('dynamic');
    const [customValueOverride, setCustomValueOverride] = useState<string>('');
    const [ruleDescription, setRuleDescription] = useState<string>('');

    // Inspector state
    const [users, setUsers] = useState<User[]>([]);
    const [selectedUserForInspection, setSelectedUserForInspection] = useState<string>('');
    const [userSearchQuery, setUserSearchQuery] = useState<string>('');

    // Backfill state
    const [isBackfilling, setIsBackfilling] = useState(false);
    const [backfillLogs, setBackfillLogs] = useState<string[]>([]);
    const [backfillResult, setBackfillResult] = useState<any>(null);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [fetchedRules, fetchedUsers] = await Promise.all([
                userIdentificationService.getUserIdentificationRules(),
                userService.getAllUsers()
            ]);
            setRules(fetchedRules);
            setUsers(fetchedUsers);
            if (allSprints && allSprints.length > 0) {
                setSprints(allSprints);
            }
        } catch (err) {
            console.error("Failed to load user identification tracking data:", err);
            toast.error("Failed to load tracking data");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        const unsubscribe = sprintService.subscribeToAllSprints((data: Sprint[]) => {
            setSprints(data);
        });
        return () => unsubscribe();
    }, [allSprints]);

    // Filtered sprints for picker
    const availableSprintsOnly = useMemo(() => {
        return sprints.filter(s => s && s.id);
    }, [sprints]);

    // Active selected source sprint
    const activeSourceSprint = useMemo(() => {
        if (!sourceSprintId || sourceSprintId === 'ALL') return null;
        return sprints.find(s => s.id === sourceSprintId) || null;
    }, [sourceSprintId, sprints]);

    // Live parsed option code proof
    const parsedProof = useMemo(() => {
        if (!optionCode || !optionCode.trim()) return null;
        return parseOptionCodeHelper(optionCode, activeSourceSprint);
    }, [optionCode, activeSourceSprint]);

    // Target Field Key
    const effectiveTargetField = useMemo(() => {
        if (selectedFieldPreset === 'custom') {
            return customFieldKey.trim();
        }
        return selectedFieldPreset;
    }, [selectedFieldPreset, customFieldKey]);

    const handleSaveRule = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!sourceSprintId) {
            toast.error("Please select a source sprint (or choose 'All Sprints').");
            return;
        }
        if (!optionCode.trim()) {
            toast.error("Please enter a valid option/step code (e.g. {m1 step 1 op 1}).");
            return;
        }
        if (!effectiveTargetField) {
            toast.error("Please select or enter a target user field key.");
            return;
        }

        setIsSaving(true);
        try {
            const selectedCategory = COMMON_TARGET_FIELDS.find(f => f.key === selectedFieldPreset)?.category || 'Identity';
            const newRule: Partial<UserIdentificationRule> = {
                sourceSprintId,
                optionCode: optionCode.trim(),
                optionText: parsedProof?.optionText || '',
                targetField: effectiveTargetField,
                targetCategory: selectedCategory,
                valueToSave: valueMode === 'custom' ? customValueOverride.trim() : '',
                description: ruleDescription.trim() || `Capture ${effectiveTargetField} from ${optionCode.trim()}`,
                isActive: true
            };

            await userIdentificationService.saveUserIdentificationRule(newRule);
            toast.success("User Identification Rule saved successfully!");
            
            // Reset form
            setOptionCode('');
            setCustomValueOverride('');
            setRuleDescription('');
            if (selectedFieldPreset === 'custom') setCustomFieldKey('');

            // Reload rules
            const updated = await userIdentificationService.getUserIdentificationRules();
            setRules(updated);
        } catch (err: any) {
            console.error("Save rule error:", err);
            toast.error(`Failed to save rule: ${err.message || String(err)}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteRule = async (ruleId: string) => {
        if (!window.confirm("Are you sure you want to delete this identification tracking rule?")) return;
        try {
            await userIdentificationService.deleteUserIdentificationRule(ruleId);
            toast.success("Identification rule deleted.");
            setRules(prev => prev.filter(r => r.id !== ruleId));
        } catch (err) {
            toast.error("Failed to delete rule.");
        }
    };

    const handleToggleRule = async (rule: UserIdentificationRule) => {
        try {
            const nextState = !rule.isActive;
            await userIdentificationService.toggleUserIdentificationRule(rule.id, nextState);
            setRules(prev => prev.map(r => r.id === rule.id ? { ...r, isActive: nextState } : r));
            toast.success(nextState ? "Rule activated" : "Rule deactivated");
        } catch (err) {
            toast.error("Failed to toggle rule state.");
        }
    };

    const handleRunBackfill = async () => {
        if (!window.confirm("Scan all users and backfill identification attributes from their sprint submissions?")) return;
        setIsBackfilling(true);
        setBackfillLogs(["Initializing historical identification scan..."]);
        setBackfillResult(null);

        try {
            const result = await userIdentificationService.backfillAllUsersIdentification((msg) => {
                setBackfillLogs(prev => [...prev, msg]);
            });
            setBackfillResult(result);
            toast.success(`Backfill finished: ${result.updatedUsers} users updated!`);
            // Refresh users
            const refreshedUsers = await userService.getAllUsers();
            setUsers(refreshedUsers);
        } catch (err: any) {
            setBackfillLogs(prev => [...prev, `ERROR: ${err.message || String(err)}`]);
            toast.error("Backfill encountered an error.");
        } finally {
            setIsBackfilling(false);
        }
    };

    // Filtered users for inspector
    const filteredUsers = useMemo(() => {
        if (!userSearchQuery.trim()) return users.slice(0, 15);
        const q = userSearchQuery.toLowerCase();
        return users.filter(u => 
            (u.name && u.name.toLowerCase().includes(q)) || 
            (u.email && u.email.toLowerCase().includes(q)) ||
            (u.id && u.id.toLowerCase().includes(q))
        ).slice(0, 20);
    }, [users, userSearchQuery]);

    const activeInspectedUser = useMemo(() => {
        if (!selectedUserForInspection) return null;
        return users.find(u => u.id === selectedUserForInspection) || null;
    }, [selectedUserForInspection, users]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 bg-white rounded-[2.5rem] border border-gray-100 shadow-sm animate-pulse">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Synchronizing Identification Rules...</p>
            </div>
        );
    }

    return (
        <div className="space-y-10 animate-fade-in text-left">
            {/* Header Banner */}
            <header className="bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-sm relative overflow-hidden">
                <div className="relative z-10">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                        <span className="px-3 py-1 bg-emerald-50 text-[9px] font-black text-[#0E7850] rounded-full uppercase tracking-widest border border-emerald-100">
                            Automatic Extraction Engine
                        </span>
                        <span className="px-3 py-1 bg-gray-100 text-[9px] font-black text-gray-600 rounded-full uppercase tracking-widest">
                            {rules.filter(r => r.isActive).length} Active Tracking Rules
                        </span>
                    </div>
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-2 italic">
                        User Identification Tracking
                    </h2>
                    <p className="text-sm font-medium text-gray-400 italic max-w-3xl">
                        "Automatically extract participant responses and choice selections through <code className="text-[#0E7850] font-mono font-bold">{'{M1 Step op1}'}</code> sprint logic, and persist them instantly into user identification profile records as participants advance through sprints."
                    </p>
                </div>
            </header>

            {/* Create Identification Rule Card */}
            <div className="bg-white rounded-[2.5rem] border border-gray-100 p-8 shadow-sm space-y-8">
                <div className="flex items-center justify-between border-b border-gray-50 pb-5">
                    <div>
                        <h4 className="text-lg font-black text-gray-900 tracking-tight italic">
                            Create New User Identification Rule
                        </h4>
                        <p className="text-xs font-semibold text-gray-400 mt-0.5">
                            Map a sprint move and option step to a user profile identity attribute.
                        </p>
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-[#0E7850] bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                        Sprint ➔ User Profile
                    </span>
                </div>

                <form onSubmit={handleSaveRule} className="space-y-6">
                    {/* 1. Source Sprint Selector */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                            1. Select Source Sprint
                        </label>
                        <CustomSelect
                            value={sourceSprintId}
                            onChange={(val) => setSourceSprintId(String(val))}
                            options={[
                                { value: '', label: '-- Choose Source Sprint --' },
                                { value: 'ALL', label: '🌐 Apply Across All Sprints (Global Rule)' },
                                ...availableSprintsOnly.map(s => ({ value: s.id, label: `${s.title} (${s.category})` }))
                            ]}
                            className="w-full"
                        />
                    </div>

                    {/* Source Sprint Preview Details */}
                    {activeSourceSprint && (
                        <div className="p-5 rounded-2xl bg-emerald-50/40 border border-emerald-100 flex items-center gap-4 animate-fade-in">
                            <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 border border-emerald-200 shadow-sm bg-gray-100">
                                <img src={activeSourceSprint.coverImageUrl} className="w-full h-full object-cover" alt="" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-[9px] font-black text-[#0E7850] uppercase tracking-widest">Active Source Sprint</p>
                                <h6 className="text-base font-black text-gray-900 truncate">{activeSourceSprint.title}</h6>
                                <p className="text-xs text-gray-500 mt-0.5">{activeSourceSprint.duration} Days • {activeSourceSprint.category}</p>
                            </div>
                        </div>
                    )}

                    {/* 2. Option / Step Code Input with Syntax Guide */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                2. Sprint Option Code (e.g. <code className="text-[#0E7850] font-mono lowercase">{'{m1 step 1 op 1}'}</code>)
                            </label>
                            <span className="text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#0E7850] border border-emerald-100">
                                {parsedProof ? '✓ Valid Code Pattern' : 'Syntax: {M1 Step X Op Y}'}
                            </span>
                        </div>
                        <input
                            type="text"
                            value={optionCode}
                            onChange={(e) => setOptionCode(e.target.value)}
                            placeholder="{m1 step 1 op 1} or {m1 step 2}"
                            className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold text-gray-900 outline-none focus:ring-4 focus:ring-[#0E7850]/10 transition-all font-mono"
                        />
                        <div className="p-4 bg-gray-50/80 border border-gray-100 rounded-2xl space-y-1.5 text-[11px] text-gray-600">
                            <p className="font-bold text-gray-800">Supported Code Formats:</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px]">
                                <div className="p-2.5 bg-white rounded-xl border border-gray-100">
                                    <code className="font-bold text-[#0E7850] font-mono">{'{m1 step 1 op 1}'}</code>
                                    <p className="text-gray-500 mt-0.5">Captures Option 1 of Step 1 in Move 1 (Day 1).</p>
                                </div>
                                <div className="p-2.5 bg-white rounded-xl border border-gray-100">
                                    <code className="font-bold text-blue-600 font-mono">{'{m1 step 2}'}</code>
                                    <p className="text-gray-500 mt-0.5">Captures the user's custom text answer on Step 2.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Actual Text Proof Display */}
                    {optionCode && (
                        activeSourceSprint ? (
                            parsedProof ? (
                                <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1 animate-fade-in">
                                    <div className="flex items-center justify-between">
                                        <p className="text-[9px] font-black text-[#0E7850] uppercase tracking-widest">
                                            Actual Text Proof (Matched Step/Option)
                                        </p>
                                        <span className="text-[9px] font-black bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full">
                                            Move {parsedProof.dayNum} • Step {parsedProof.stepIdx + 1}
                                        </span>
                                    </div>
                                    <p className="text-sm font-black text-gray-900">
                                        {parsedProof.optionText ? `"${parsedProof.optionText}"` : 'Text Submission Step (Captures User Text Input)'}
                                    </p>
                                    <p className="text-[10px] font-medium text-emerald-700">
                                        Day/Move {parsedProof.dayNum}, Step Index {parsedProof.stepIdx + 1}, Option Choice Index {parsedProof.optionIdx + 1}
                                    </p>
                                </div>
                            ) : (
                                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold animate-fade-in">
                                    ⚠️ Could not parse option code. Please ensure format is e.g. <code className="font-mono bg-white px-1.5 py-0.5 rounded border">{'{m1 step 1 op 1}'}</code> or <code className="font-mono bg-white px-1.5 py-0.5 rounded border">{'{m1 step 2}'}</code>.
                                </div>
                            )
                        ) : (
                            sourceSprintId === 'ALL' && (
                                <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 text-blue-800 text-xs font-bold">
                                    🌐 Global Rule: Will match code <code className="font-mono bg-white px-1.5 py-0.5 rounded border">{optionCode}</code> whenever any sprint with that step structure is completed.
                                </div>
                            )
                        )
                    )}

                    {/* 3. Target User Field Selection */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                            3. Target User Identification Field
                        </label>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                            {COMMON_TARGET_FIELDS.map(f => (
                                <button
                                    key={f.key}
                                    type="button"
                                    onClick={() => setSelectedFieldPreset(f.key)}
                                    className={`p-3 rounded-2xl text-left border transition-all cursor-pointer ${
                                        selectedFieldPreset === f.key
                                        ? 'bg-[#0E7850] text-white border-[#0E7850] shadow-sm'
                                        : 'bg-gray-50/60 hover:bg-gray-100 text-gray-700 border-gray-100'
                                    }`}
                                >
                                    <p className="text-xs font-bold truncate">{f.label}</p>
                                    <p className={`text-[8px] uppercase font-black tracking-widest mt-0.5 ${selectedFieldPreset === f.key ? 'text-white/70' : 'text-gray-400'}`}>
                                        {f.category}
                                    </p>
                                </button>
                            ))}
                        </div>

                        {selectedFieldPreset === 'custom' && (
                            <div className="pt-2 animate-fade-in">
                                <label className="text-[9px] font-black uppercase tracking-wider text-gray-500 block mb-1">
                                    Enter Custom Field Key (Stored in user record):
                                </label>
                                <input
                                    type="text"
                                    value={customFieldKey}
                                    onChange={(e) => setCustomFieldKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                                    placeholder="e.g. business_stage, coaching_niche, learning_style"
                                    className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none focus:ring-4 focus:ring-[#0E7850]/10 font-mono"
                                />
                            </div>
                        )}
                    </div>

                    {/* 4. Value Extraction Mode */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                            4. Saved Value Mode
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setValueMode('dynamic')}
                                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                                    valueMode === 'dynamic'
                                    ? 'bg-emerald-50 border-[#0E7850] text-[#0E7850]'
                                    : 'bg-gray-50/50 border-gray-100 text-gray-600 hover:bg-gray-50'
                                }`}
                            >
                                <p className="text-xs font-black">⚡ Dynamic Participant Input (Default)</p>
                                <p className="text-[10px] text-gray-500 mt-1">
                                    Stores the exact choice label or written text submitted by the participant in the sprint.
                                </p>
                            </button>
                            <button
                                type="button"
                                onClick={() => setValueMode('custom')}
                                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                                    valueMode === 'custom'
                                    ? 'bg-emerald-50 border-[#0E7850] text-[#0E7850]'
                                    : 'bg-gray-50/50 border-gray-100 text-gray-600 hover:bg-gray-50'
                                }`}
                            >
                                <p className="text-xs font-black">🏷️ Fixed Tag / Value Override</p>
                                <p className="text-[10px] text-gray-500 mt-1">
                                    Assign a standardized tag/value whenever this option or step is completed.
                                </p>
                            </button>
                        </div>

                        {valueMode === 'custom' && (
                            <div className="pt-2 animate-fade-in">
                                <input
                                    type="text"
                                    value={customValueOverride}
                                    onChange={(e) => setCustomValueOverride(e.target.value)}
                                    placeholder="Enter fixed tag value (e.g. 'Advanced', 'High-Ticket Coach', 'Tier-1')"
                                    className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none focus:ring-4 focus:ring-[#0E7850]/10"
                                />
                            </div>
                        )}
                    </div>

                    {/* 5. Rule Description Note */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                            5. Rule Description / Purpose (Optional)
                        </label>
                        <input
                            type="text"
                            value={ruleDescription}
                            onChange={(e) => setRuleDescription(e.target.value)}
                            placeholder="e.g. Extract participant intention from Day 1 Onboarding"
                            className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none focus:ring-4 focus:ring-[#0E7850]/10"
                        />
                    </div>

                    {/* Submit Action */}
                    <div className="flex justify-end pt-4">
                        <Button
                            type="submit"
                            disabled={isSaving}
                            className="px-8 py-4 bg-[#0E7850] text-white hover:bg-[#0b5d3e] rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg transition-all active:scale-95"
                        >
                            {isSaving ? 'Saving Rule...' : 'Save Identification Rule'}
                        </Button>
                    </div>
                </form>
            </div>

            {/* Configured Rules Registry List */}
            <div className="bg-white rounded-[2.5rem] border border-gray-100 p-8 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-50 pb-5">
                    <div>
                        <h4 className="text-lg font-black text-gray-900 tracking-tight italic">
                            Configured Identification Rules ({rules.length})
                        </h4>
                        <p className="text-xs font-semibold text-gray-400 mt-0.5">
                            Active extraction triggers saving participant responses into user data.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={handleRunBackfill}
                        disabled={isBackfilling || rules.length === 0}
                        className="px-5 py-2.5 bg-gray-900 text-white hover:bg-black rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                    >
                        {isBackfilling ? (
                            <>
                                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                <span>Scanning Users...</span>
                            </>
                        ) : (
                            <>
                                <span>🔄 Backfill All Users</span>
                            </>
                        )}
                    </button>
                </div>

                {/* Backfill status logs if active */}
                {backfillLogs.length > 0 && (
                    <div className="p-5 rounded-2xl bg-gray-900 text-emerald-400 font-mono text-[11px] space-y-1.5 max-h-48 overflow-y-auto animate-fade-in border border-gray-800">
                        <p className="font-bold text-white uppercase tracking-widest text-[9px] mb-1">Backfill Execution Log:</p>
                        {backfillLogs.map((log, lIdx) => (
                            <p key={lIdx}>{log}</p>
                        ))}
                    </div>
                )}

                {rules.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4">
                        {rules.map((rule) => {
                            const srcSprint = sprints.find(s => s.id === rule.sourceSprintId);
                            const isGlobal = rule.sourceSprintId === 'ALL';
                            return (
                                <div
                                    key={rule.id}
                                    className={`p-6 rounded-3xl border transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-6 ${
                                        rule.isActive 
                                        ? 'bg-gray-50/50 hover:bg-gray-50 border-gray-100' 
                                        : 'bg-gray-100/40 border-gray-200 opacity-60'
                                    }`}
                                >
                                    <div className="flex items-center gap-5 min-w-0 flex-1">
                                        <div className="w-12 h-12 rounded-2xl overflow-hidden flex-shrink-0 border border-gray-200 shadow-sm bg-gray-100 flex items-center justify-center">
                                            {isGlobal ? (
                                                <span className="text-xl">🌐</span>
                                            ) : srcSprint?.coverImageUrl ? (
                                                <img src={srcSprint.coverImageUrl} className="w-full h-full object-cover" alt="" />
                                            ) : (
                                                <span className="text-xs font-black text-gray-400">⚡</span>
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                                <span className="px-2.5 py-0.5 bg-[#0E7850]/10 text-[#0E7850] rounded-md text-[8px] font-black uppercase tracking-widest">
                                                    {isGlobal ? 'Global (All Sprints)' : srcSprint?.title || 'Unknown Sprint'}
                                                </span>
                                                <span className="text-gray-300">➔</span>
                                                <span className="px-2.5 py-0.5 bg-blue-100 text-blue-900 rounded-md text-[8px] font-black uppercase tracking-widest font-mono">
                                                    user.{rule.targetField}
                                                </span>
                                                <span className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded-md text-[8px] font-black uppercase tracking-wider">
                                                    {rule.targetCategory || 'Identity'}
                                                </span>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                                <p className="text-xs font-black text-gray-900 font-mono bg-white px-3 py-1 rounded-xl border border-gray-200 inline-block shadow-sm">
                                                    {rule.optionCode}
                                                </p>
                                                {rule.valueToSave ? (
                                                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-100">
                                                        Fixed Tag: "{rule.valueToSave}"
                                                    </span>
                                                ) : (
                                                    <span className="text-[11px] font-semibold text-gray-600 italic">
                                                        {rule.optionText ? `Proof: "${rule.optionText}"` : 'Extracts user submission'}
                                                    </span>
                                                )}
                                            </div>

                                            {rule.description && (
                                                <p className="text-[11px] text-gray-400 font-medium mt-1">
                                                    {rule.description}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Action buttons */}
                                    <div className="flex items-center gap-3 flex-shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => handleToggleRule(rule)}
                                            className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                                                rule.isActive 
                                                ? 'bg-emerald-100 text-[#0E7850] hover:bg-emerald-200' 
                                                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                            }`}
                                        >
                                            {rule.isActive ? 'Active' : 'Disabled'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteRule(rule.id)}
                                            className="px-4 py-2 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="py-12 text-center bg-gray-50/50 rounded-3xl border border-dashed border-gray-200">
                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest">
                            No Identification Rules Configured Yet
                        </p>
                        <p className="text-[10px] text-gray-400 mt-1 max-w-md mx-auto">
                            Use the form above to specify a sprint option code like <code className="font-mono text-[#0E7850]">{'{m1 step 1 op 1}'}</code> to automatically capture and save user profile identification data.
                        </p>
                    </div>
                )}
            </div>

            {/* Live User Identity Inspector & Audit */}
            <div className="bg-white rounded-[2.5rem] border border-gray-100 p-8 shadow-sm space-y-6">
                <div className="border-b border-gray-50 pb-5">
                    <h4 className="text-lg font-black text-gray-900 tracking-tight italic">
                        Live User Identity Inspector & Audit
                    </h4>
                    <p className="text-xs font-semibold text-gray-400 mt-0.5">
                        Inspect real-time identification data captured on participant records.
                    </p>
                </div>

                {/* User Search & Selection */}
                <div className="space-y-4">
                    <input
                        type="text"
                        value={userSearchQuery}
                        onChange={(e) => setUserSearchQuery(e.target.value)}
                        placeholder="Search user by name, email or ID..."
                        className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none focus:ring-4 focus:ring-[#0E7850]/10"
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
                        {filteredUsers.map(u => (
                            <button
                                key={u.id}
                                type="button"
                                onClick={() => setSelectedUserForInspection(u.id)}
                                className={`p-3 rounded-2xl text-left border transition-all flex items-center gap-3 cursor-pointer ${
                                    selectedUserForInspection === u.id
                                    ? 'bg-[#0E7850] text-white border-[#0E7850] shadow-sm'
                                    : 'bg-gray-50/60 hover:bg-gray-100 text-gray-700 border-gray-100'
                                }`}
                            >
                                <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden flex items-center justify-center font-bold text-xs">
                                    {u.profileImageUrl ? (
                                        <img src={u.profileImageUrl} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        (u.name || 'U').charAt(0)
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-bold truncate">{u.name || 'Unnamed User'}</p>
                                    <p className={`text-[9px] truncate ${selectedUserForInspection === u.id ? 'text-white/80' : 'text-gray-400'}`}>
                                        {u.email}
                                    </p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Active Inspected User Detail */}
                {activeInspectedUser && (
                    <div className="p-6 rounded-3xl bg-gray-50/80 border border-gray-200 space-y-4 animate-fade-in">
                        <div className="flex items-center justify-between border-b border-gray-200 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full overflow-hidden bg-white border border-gray-200 shadow-sm flex items-center justify-center font-bold">
                                    {activeInspectedUser.profileImageUrl ? (
                                        <img src={activeInspectedUser.profileImageUrl} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        (activeInspectedUser.name || 'U').charAt(0)
                                    )}
                                </div>
                                <div>
                                    <h5 className="text-sm font-black text-gray-900">{activeInspectedUser.name || 'Participant'}</h5>
                                    <p className="text-xs text-gray-500 font-mono">{activeInspectedUser.email} • ID: {activeInspectedUser.id.slice(0, 8)}...</p>
                                </div>
                            </div>
                            <span className="px-3 py-1 bg-emerald-100 text-[#0E7850] rounded-full text-[9px] font-black uppercase tracking-widest">
                                Live Record
                            </span>
                        </div>

                        {/* Attribute Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {/* Standard Fields */}
                            {[
                                { label: 'Archetype', value: (activeInspectedUser as any).archetype },
                                { label: 'Primary Intention', value: (activeInspectedUser as any).intention },
                                { label: 'Occupation', value: (activeInspectedUser as any).occupation },
                                { label: 'Rise Pathway', value: (activeInspectedUser as any).risePathway },
                                { label: 'Growth Areas', value: Array.isArray((activeInspectedUser as any).growthAreas) ? (activeInspectedUser as any).growthAreas.join(', ') : (activeInspectedUser as any).growthAreas },
                                { label: 'Gender', value: (activeInspectedUser as any).gender },
                            ].filter(item => item.value).map((item, idx) => (
                                <div key={idx} className="p-4 bg-white rounded-2xl border border-gray-200 shadow-sm space-y-1">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">{item.label}</p>
                                    <p className="text-xs font-bold text-gray-900">{String(item.value)}</p>
                                </div>
                            ))}

                            {/* Captured identificationData entries */}
                            {(activeInspectedUser as any).identificationData && Object.entries((activeInspectedUser as any).identificationData).map(([key, data]: [string, any]) => (
                                <div key={key} className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200 shadow-sm space-y-1">
                                    <div className="flex items-center justify-between">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-[#0E7850]">{key}</p>
                                        <span className="text-[8px] font-mono font-bold text-emerald-800 bg-white px-1.5 py-0.5 rounded border border-emerald-100">
                                            {data?.optionCode || 'Sprint Input'}
                                        </span>
                                    </div>
                                    <p className="text-xs font-bold text-gray-900">{String(data?.value || data)}</p>
                                    {data?.sourceSprintTitle && (
                                        <p className="text-[9px] text-gray-400 font-medium truncate">
                                            Captured from: {data.sourceSprintTitle}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>

                        {!(activeInspectedUser as any).archetype && 
                         !(activeInspectedUser as any).intention && 
                         !(activeInspectedUser as any).identificationData && (
                            <p className="text-xs font-semibold text-gray-400 italic py-3 text-center">
                                No identification attributes recorded yet for this participant.
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
