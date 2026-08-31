import React, { useState, useEffect, useMemo } from 'react';
import { Sprint, UserIdentificationRule, User, SystemMetadataField } from '../../types';
import { userIdentificationService } from '../../services/userIdentificationService';
import { metadataService } from '../../services/metadataService';
import { sprintService } from '../../services/sprintService';
import { userService } from '../../services/userService';
import { parseOptionCodeHelper } from '../../utils/sprintUtils';
import { getMetadataFields } from '../../src/utils/stepPlaceholderUtils';
import CustomSelect from '../../components/CustomSelect';
import Button from '../../components/Button';
import { toast } from 'sonner';

interface AdminUserIdentificationTrackingProps {
    allSprints?: Sprint[];
}

type SubTab = 'metadata_catalog' | 'add_metadata' | 'extraction_rules' | 'user_inspector';

const PRESET_ICONS = ['🏷️', '🎯', '💡', '💪', '🎓', '⚡', '🧭', '💼', '🏢', '👤', '🧠', '🚀', '💎', '📈', '🎨', '🛠️', '✨', '🔥'];

const CATEGORY_OPTIONS = [
    'Identity',
    'Objectives',
    'Demographics',
    'Progression',
    'Experience',
    'Business',
    'Mindset',
    'Custom'
];

export default function AdminUserIdentificationTracking({ allSprints = [] }: AdminUserIdentificationTrackingProps) {
    const [activeSubTab, setActiveSubTab] = useState<SubTab>('metadata_catalog');
    
    // Metadata fields state
    const [metadataFields, setMetadataFields] = useState<SystemMetadataField[]>([]);
    const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
    const [metadataSearchQuery, setMetadataSearchQuery] = useState<string>('');
    const [isSavingMetadata, setIsSavingMetadata] = useState(false);
    
    // Add / Edit Metadata Form State
    const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
    const [fieldLabel, setFieldLabel] = useState<string>('');
    const [fieldKey, setFieldKey] = useState<string>('');
    const [fieldCategory, setFieldCategory] = useState<string>('Identity');
    const [fieldSample, setFieldSample] = useState<string>('');
    const [fieldAliases, setFieldAliases] = useState<string>('');
    const [fieldDescription, setFieldDescription] = useState<string>('');
    const [fieldIcon, setFieldIcon] = useState<string>('🏷️');

    // Extraction Rules State
    const [rules, setRules] = useState<UserIdentificationRule[]>([]);
    const [sprints, setSprints] = useState<Sprint[]>(allSprints);
    const [isLoading, setIsLoading] = useState(true);
    const [isSavingRule, setIsSavingRule] = useState(false);

    // Rule Form state
    const [sourceSprintId, setSourceSprintId] = useState<string>('');
    const [optionCode, setOptionCode] = useState<string>('');
    const [selectedTargetFieldKey, setSelectedTargetFieldKey] = useState<string>('interests');
    const [customRuleTargetField, setCustomRuleTargetField] = useState<string>('');
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

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [fetchedFields, fetchedRules, fetchedUsers] = await Promise.all([
                metadataService.getAllMetadataFields(),
                userIdentificationService.getUserIdentificationRules(),
                userService.getAllUsers()
            ]);
            setMetadataFields(fetchedFields);
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
        
        // Subscribe to real-time metadata updates
        const unsubMeta = metadataService.subscribeToMetadataFields((fields) => {
            setMetadataFields(fields);
        });

        // Subscribe to sprints
        const unsubSprints = sprintService.subscribeToAllSprints((data: Sprint[]) => {
            setSprints(data);
        });

        return () => {
            unsubMeta();
            unsubSprints();
        };
    }, [allSprints]);

    // Auto generate camelCase field key when label changes (if not explicitly typing custom key)
    const handleLabelChange = (val: string) => {
        setFieldLabel(val);
        if (!editingFieldId) {
            const generated = val
                .trim()
                .replace(/[^a-zA-Z0-9_]/g, ' ')
                .trim()
                .split(/\s+/)
                .map((word, idx) => idx === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join('');
            setFieldKey(generated);
        }
    };

    // Filtered metadata fields
    const filteredMetadataFields = useMemo(() => {
        return metadataFields.filter(f => {
            const matchCategory = selectedCategoryFilter === 'ALL' || (f.category || 'General') === selectedCategoryFilter;
            const q = metadataSearchQuery.toLowerCase().trim();
            const matchSearch = !q || 
                f.label.toLowerCase().includes(q) || 
                f.key.toLowerCase().includes(q) ||
                (f.aliases && f.aliases.some(a => a.toLowerCase().includes(q))) ||
                (f.description && f.description.toLowerCase().includes(q));
            return matchCategory && matchSearch;
        });
    }, [metadataFields, selectedCategoryFilter, metadataSearchQuery]);

    // Unique Categories from existing metadata fields
    const uniqueCategories = useMemo(() => {
        const cats = new Set<string>();
        metadataFields.forEach(f => {
            if (f.category) cats.add(f.category);
        });
        CATEGORY_OPTIONS.forEach(c => cats.add(c));
        return ['ALL', ...Array.from(cats)];
    }, [metadataFields]);

    // Copy Token to clipboard helper
    const copyTokenToClipboard = (tokenText: string, label: string) => {
        navigator.clipboard.writeText(tokenText);
        toast.success(`Copied ${label} token: ${tokenText}`);
    };

    // Reset Add/Edit Metadata form
    const resetMetadataForm = () => {
        setEditingFieldId(null);
        setFieldLabel('');
        setFieldKey('');
        setFieldCategory('Identity');
        setFieldSample('');
        setFieldAliases('');
        setFieldDescription('');
        setFieldIcon('🏷️');
    };

    // Edit an existing field
    const handleStartEditField = (field: SystemMetadataField) => {
        setEditingFieldId(field.id);
        setFieldLabel(field.label);
        setFieldKey(field.key);
        setFieldCategory(field.category || 'Identity');
        setFieldSample(field.placeholderSample || '');
        setFieldAliases((field.aliases || []).join(', '));
        setFieldDescription(field.description || '');
        setFieldIcon(field.icon || '🏷️');
        setActiveSubTab('add_metadata');
    };

    // Save or update metadata field
    const handleSaveMetadataField = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!fieldLabel.trim()) {
            toast.error("Please enter a field label (e.g. 'Coaching Niche', 'Learning Style').");
            return;
        }

        setIsSavingMetadata(true);
        try {
            const aliasesArr = fieldAliases
                .split(/[,;\n]+/)
                .map(s => s.trim())
                .filter(Boolean);

            if (editingFieldId) {
                await metadataService.updateMetadataField(editingFieldId, {
                    label: fieldLabel.trim(),
                    category: fieldCategory,
                    placeholderSample: fieldSample.trim() || 'Sample response',
                    aliases: aliasesArr,
                    description: fieldDescription.trim(),
                    icon: fieldIcon || '🏷️'
                });
                toast.success(`Metadata field "${fieldLabel}" updated successfully!`);
            } else {
                await metadataService.createMetadataField({
                    label: fieldLabel.trim(),
                    key: fieldKey.trim(),
                    category: fieldCategory,
                    placeholderSample: fieldSample.trim() || 'Sample response',
                    aliases: aliasesArr,
                    description: fieldDescription.trim(),
                    icon: fieldIcon || '🏷️'
                });
                toast.success(`New metadata field "${fieldLabel}" registered successfully!`);
            }

            resetMetadataForm();
            setActiveSubTab('metadata_catalog');
            const all = await metadataService.getAllMetadataFields();
            setMetadataFields(all);
        } catch (err: any) {
            console.error("Save metadata field error:", err);
            toast.error(`Failed to save metadata field: ${err.message || String(err)}`);
        } finally {
            setIsSavingMetadata(false);
        }
    };

    // Delete a custom metadata field
    const handleDeleteMetadataField = async (field: SystemMetadataField) => {
        if (field.isSystemDefault) {
            toast.error("Built-in system default fields cannot be deleted.");
            return;
        }
        if (!window.confirm(`Are you sure you want to delete custom metadata field "${field.label}"? Tokens referencing this field may revert to raw text.`)) {
            return;
        }

        try {
            await metadataService.deleteMetadataField(field.id);
            toast.success(`Metadata field "${field.label}" deleted.`);
            setMetadataFields(prev => prev.filter(f => f.id !== field.id));
        } catch (err: any) {
            toast.error(`Failed to delete field: ${err.message || String(err)}`);
        }
    };

    // Toggle field active status
    const handleToggleMetadataField = async (field: SystemMetadataField) => {
        try {
            const nextState = !field.isActive;
            await metadataService.toggleMetadataField(field.id, nextState);
            setMetadataFields(prev => prev.map(f => f.id === field.id ? { ...f, isActive: nextState } : f));
            toast.success(nextState ? `Field "${field.label}" enabled.` : `Field "${field.label}" disabled.`);
        } catch (err: any) {
            toast.error("Failed to toggle field status.");
        }
    };

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

    // Target Field Key for extraction rule
    const effectiveRuleTargetField = useMemo(() => {
        if (selectedTargetFieldKey === 'custom') {
            return customRuleTargetField.trim();
        }
        return selectedTargetFieldKey;
    }, [selectedTargetFieldKey, customRuleTargetField]);

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
        if (!effectiveRuleTargetField) {
            toast.error("Please select or enter a target user field key.");
            return;
        }

        setIsSavingRule(true);
        try {
            const matchingMeta = metadataFields.find(f => f.key === effectiveRuleTargetField);
            const selectedCategory = matchingMeta?.category || 'Identity';
            
            const newRule: Partial<UserIdentificationRule> = {
                sourceSprintId,
                optionCode: optionCode.trim(),
                optionText: parsedProof?.optionText || '',
                targetField: effectiveRuleTargetField,
                targetCategory: selectedCategory,
                valueToSave: valueMode === 'custom' ? customValueOverride.trim() : '',
                description: ruleDescription.trim() || `Capture ${effectiveRuleTargetField} from ${optionCode.trim()}`,
                isActive: true
            };

            await userIdentificationService.saveUserIdentificationRule(newRule);
            toast.success("User Identification Rule saved successfully!");
            
            // Reset form
            setOptionCode('');
            setCustomValueOverride('');
            setRuleDescription('');
            if (selectedTargetFieldKey === 'custom') setCustomRuleTargetField('');

            // Reload rules
            const updated = await userIdentificationService.getUserIdentificationRules();
            setRules(updated);
        } catch (err: any) {
            console.error("Save rule error:", err);
            toast.error(`Failed to save rule: ${err.message || String(err)}`);
        } finally {
            setIsSavingRule(false);
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

        try {
            const result = await userIdentificationService.backfillAllUsersIdentification((msg) => {
                setBackfillLogs(prev => [...prev, msg]);
            });
            toast.success(`Backfill finished: ${result.updatedUsers} users updated!`);
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
        if (!userSearchQuery.trim()) return users.slice(0, 12);
        const q = userSearchQuery.toLowerCase();
        return users.filter(u => 
            (u.name && u.name.toLowerCase().includes(q)) || 
            (u.email && u.email.toLowerCase().includes(q)) || 
            u.id.toLowerCase().includes(q)
        ).slice(0, 15);
    }, [users, userSearchQuery]);

    // Active inspected user object
    const activeInspectedUser = useMemo(() => {
        if (!selectedUserForInspection) return null;
        return users.find(u => u.id === selectedUserForInspection) || null;
    }, [selectedUserForInspection, users]);

    return (
        <div className="space-y-8 animate-fade-in text-left">
            {/* Header Title Card */}
            <div className="bg-white rounded-[2.5rem] border border-gray-100 p-8 sm:p-10 shadow-sm space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-gray-50 pb-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black tracking-widest text-[#0E7850] bg-emerald-50 px-3.5 py-1.5 rounded-full uppercase border border-emerald-100">
                                Identity & Metadata Engine
                            </span>
                            <span className="text-[10px] font-black tracking-wider text-purple-700 bg-purple-50 px-3 py-1 rounded-full border border-purple-100">
                                {metadataFields.length} Registered Attributes
                            </span>
                        </div>
                        <h3 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight italic">
                            User Identity & Metadata Management
                        </h3>
                        <p className="text-gray-500 text-xs sm:text-sm font-medium leading-relaxed max-w-3xl">
                            Configure user metadata attributes used across all sprint steps, hints, and bridge notes (e.g. <code className="font-mono text-[#0E7850] font-bold">{`{Metadata <Attribute> receive}`}</code> and <code className="font-mono text-purple-700 font-bold">{`{Metadata <Attribute> save}`}</code>). Define extraction rules to automatically capture participant inputs into their profiles.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => {
                                resetMetadataForm();
                                setActiveSubTab('add_metadata');
                            }}
                            className="px-6 py-3.5 bg-[#0E7850] text-white hover:bg-[#0b5d3e] rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-700/20 transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
                        >
                            <span>➕</span>
                            <span>Add Metadata</span>
                        </button>
                    </div>
                </div>

                {/* Sub-Tab Navigation Bar */}
                <div className="flex flex-wrap items-center gap-2.5 pt-2">
                    <button
                        type="button"
                        onClick={() => setActiveSubTab('metadata_catalog')}
                        className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
                            activeSubTab === 'metadata_catalog'
                            ? 'bg-gray-900 text-white shadow-md'
                            : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-100'
                        }`}
                    >
                        <span>📋</span>
                        <span>Show Current Metadata ({metadataFields.length})</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            if (activeSubTab !== 'add_metadata') resetMetadataForm();
                            setActiveSubTab('add_metadata');
                        }}
                        className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
                            activeSubTab === 'add_metadata'
                            ? 'bg-[#0E7850] text-white shadow-md'
                            : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-100'
                        }`}
                    >
                        <span>{editingFieldId ? '✏️' : '➕'}</span>
                        <span>{editingFieldId ? 'Edit Metadata Field' : 'Add Metadata'}</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveSubTab('extraction_rules')}
                        className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
                            activeSubTab === 'extraction_rules'
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-100'
                        }`}
                    >
                        <span>⚡</span>
                        <span>Option-to-Profile Rules ({rules.length})</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveSubTab('user_inspector')}
                        className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
                            activeSubTab === 'user_inspector'
                            ? 'bg-purple-600 text-white shadow-md'
                            : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-100'
                        }`}
                    >
                        <span>👤</span>
                        <span>User Profile Inspector</span>
                    </button>
                </div>
            </div>

            {/* TAB 1: SHOW CURRENT METADATA CATALOG */}
            {activeSubTab === 'metadata_catalog' && (
                <div className="space-y-6 animate-fade-in">
                    {/* Filter & Search Bar */}
                    <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h4 className="text-base font-black text-gray-900 tracking-tight">
                                    Current Metadata Fields Catalog
                                </h4>
                                <p className="text-xs text-gray-500 font-medium">
                                    All metadata fields available for coaches in sprint steps, hints, and bridge notes.
                                </p>
                            </div>
                            <div className="w-full sm:w-72">
                                <input
                                    type="text"
                                    value={metadataSearchQuery}
                                    onChange={(e) => setMetadataSearchQuery(e.target.value)}
                                    placeholder="Search by label, key or alias..."
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-900 outline-none focus:ring-4 focus:ring-[#0E7850]/10"
                                />
                            </div>
                        </div>

                        {/* Category Filter Pills */}
                        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                            {uniqueCategories.map(cat => {
                                const isSelected = selectedCategoryFilter === cat;
                                return (
                                    <button
                                        key={cat}
                                        type="button"
                                        onClick={() => setSelectedCategoryFilter(cat)}
                                        className={`px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer ${
                                            isSelected
                                            ? 'bg-gray-900 text-white shadow-sm'
                                            : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                                        }`}
                                    >
                                        {cat === 'ALL' ? '🌟 All Categories' : cat}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Metadata Fields Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {filteredMetadataFields.map((field) => {
                            const isSystem = !!field.isSystemDefault;
                            const isActive = field.isActive !== false;
                            const receiveToken = `{Metadata ${field.label} receive}`;
                            const saveToken = `{Metadata ${field.label} save}`;

                            return (
                                <div
                                    key={field.id || field.key}
                                    className={`bg-white rounded-3xl border p-6 shadow-sm transition-all flex flex-col justify-between space-y-4 ${
                                        isActive ? 'border-gray-100 hover:shadow-md hover:border-gray-200' : 'border-gray-200 bg-gray-50/70 opacity-60'
                                    }`}
                                >
                                    {/* Card Top Header */}
                                    <div className="space-y-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center text-2xl shadow-xs">
                                                    {field.icon || '🏷️'}
                                                </div>
                                                <div>
                                                    <h5 className="text-sm font-black text-gray-900 tracking-tight">
                                                        {field.label}
                                                    </h5>
                                                    <span className="text-[10px] font-mono text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">
                                                        user.{field.key}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex flex-col items-end gap-1">
                                                <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                                                    isSystem 
                                                    ? 'bg-blue-50 text-blue-700 border border-blue-100' 
                                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                                }`}>
                                                    {isSystem ? 'Built-in' : 'Custom'}
                                                </span>
                                                <span className="text-[8px] font-bold uppercase tracking-wider text-gray-400">
                                                    {field.category || 'Identity'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Description / Sample */}
                                        <div className="space-y-1.5 pt-1">
                                            {field.description && (
                                                <p className="text-xs text-gray-500 font-medium leading-snug line-clamp-2">
                                                    {field.description}
                                                </p>
                                            )}
                                            <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 text-[11px] text-gray-600 flex items-center gap-2">
                                                <span className="text-gray-400 font-bold text-[9px] uppercase tracking-wider">Sample:</span>
                                                <span className="font-semibold text-gray-800 italic truncate">"{field.placeholderSample || 'Sample value'}"</span>
                                            </div>
                                        </div>

                                        {/* Aliases Pills */}
                                        {field.aliases && field.aliases.length > 0 && (
                                            <div className="space-y-1">
                                                <span className="text-[8px] font-black uppercase tracking-widest text-gray-400">Keyword Aliases:</span>
                                                <div className="flex flex-wrap gap-1">
                                                    {field.aliases.slice(0, 4).map((alias, aIdx) => (
                                                        <span key={aIdx} className="text-[9px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-mono">
                                                            {alias}
                                                        </span>
                                                    ))}
                                                    {field.aliases.length > 4 && (
                                                        <span className="text-[9px] text-gray-400 px-1">+{field.aliases.length - 4} more</span>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Action Tokens Preview & Actions */}
                                    <div className="space-y-2.5 pt-2 border-t border-gray-50">
                                        <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                                            <button
                                                type="button"
                                                onClick={() => copyTokenToClipboard(receiveToken, 'Receive')}
                                                title="Click to copy Receive Token"
                                                className="p-2 rounded-xl bg-indigo-50/80 hover:bg-indigo-100 border border-indigo-100 text-indigo-950 font-mono font-bold text-left transition-all truncate flex items-center justify-between gap-1 cursor-pointer active:scale-95"
                                            >
                                                <span className="truncate">📥 Receive</span>
                                                <span className="text-[9px] text-indigo-500 font-normal">Copy</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => copyTokenToClipboard(saveToken, 'Save')}
                                                title="Click to copy Save Token"
                                                className="p-2 rounded-xl bg-emerald-50/80 hover:bg-emerald-100 border border-emerald-100 text-emerald-950 font-mono font-bold text-left transition-all truncate flex items-center justify-between gap-1 cursor-pointer active:scale-95"
                                            >
                                                <span className="truncate">💾 Save</span>
                                                <span className="text-[9px] text-emerald-500 font-normal">Copy</span>
                                            </button>
                                        </div>

                                        {/* Edit / Delete / Toggle */}
                                        <div className="flex items-center justify-between gap-2 pt-1">
                                            <button
                                                type="button"
                                                onClick={() => handleToggleMetadataField(field)}
                                                className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                                                    isActive 
                                                    ? 'bg-emerald-100 text-[#0E7850] hover:bg-emerald-200' 
                                                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                                }`}
                                            >
                                                {isActive ? 'Active' : 'Disabled'}
                                            </button>

                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => handleStartEditField(field)}
                                                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer"
                                                >
                                                    Edit
                                                </button>
                                                {!isSystem && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteMetadataField(field)}
                                                        className="px-3 py-1.5 bg-red-50 hover:bg-red-500 hover:text-white text-red-500 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer"
                                                    >
                                                        Delete
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* TAB 2: ADD OR EDIT METADATA FIELD */}
            {activeSubTab === 'add_metadata' && (
                <div className="bg-white rounded-[2.5rem] border border-gray-100 p-8 sm:p-10 shadow-sm space-y-8 animate-fade-in max-w-3xl">
                    <div className="flex items-center justify-between border-b border-gray-50 pb-5">
                        <div>
                            <span className="text-[10px] font-black tracking-widest text-[#0E7850] bg-emerald-50 px-3 py-1 rounded-full uppercase border border-emerald-100">
                                {editingFieldId ? 'Modify Metadata Attribute' : 'Create New Attribute'}
                            </span>
                            <h4 className="text-xl font-black text-gray-900 tracking-tight italic mt-2">
                                {editingFieldId ? `Edit Field: ${fieldLabel}` : 'Add New System Metadata Field'}
                            </h4>
                            <p className="text-xs font-semibold text-gray-400 mt-0.5">
                                Newly registered metadata fields instantly become selectable tokens across sprint editors and automated rules.
                            </p>
                        </div>
                        {editingFieldId && (
                            <button
                                type="button"
                                onClick={resetMetadataForm}
                                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
                            >
                                Cancel Edit
                            </button>
                        )}
                    </div>

                    <form onSubmit={handleSaveMetadataField} className="space-y-6">
                        {/* 1. Field Label & Icon */}
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                            <div className="sm:col-span-3 space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                    1. Field Display Label *
                                </label>
                                <input
                                    type="text"
                                    value={fieldLabel}
                                    onChange={(e) => handleLabelChange(e.target.value)}
                                    placeholder="e.g. Coaching Niche, Learning Style, Core Values"
                                    className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold text-gray-900 outline-none focus:ring-4 focus:ring-[#0E7850]/10 transition-all"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                    Icon Emoji
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={fieldIcon}
                                        onChange={(e) => setFieldIcon(e.target.value)}
                                        className="w-16 px-3 py-3.5 text-center bg-gray-50 border border-gray-200 rounded-2xl text-xl font-bold outline-none focus:ring-4 focus:ring-[#0E7850]/10"
                                    />
                                    <div className="flex flex-wrap gap-1 max-h-12 overflow-y-auto">
                                        {PRESET_ICONS.map(emoji => (
                                            <button
                                                key={emoji}
                                                type="button"
                                                onClick={() => setFieldIcon(emoji)}
                                                className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-sm cursor-pointer"
                                            >
                                                {emoji}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 2. Database Key & Category */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                    2. Database Storage Key (camelCase) *
                                </label>
                                <input
                                    type="text"
                                    value={fieldKey}
                                    onChange={(e) => setFieldKey(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                                    placeholder="e.g. coachingNiche, learningStyle"
                                    disabled={!!editingFieldId}
                                    className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-mono font-bold text-gray-900 outline-none focus:ring-4 focus:ring-[#0E7850]/10 disabled:opacity-60"
                                    required
                                />
                                <p className="text-[10px] text-gray-400 font-mono">
                                    Stored at: user.metadata.{fieldKey || 'attributeKey'}
                                </p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                    Category
                                </label>
                                <CustomSelect
                                    value={fieldCategory}
                                    onChange={(val) => setFieldCategory(String(val))}
                                    options={CATEGORY_OPTIONS.map(c => ({ value: c, label: c }))}
                                    className="w-full"
                                />
                            </div>
                        </div>

                        {/* 3. Sample Value */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                3. Placeholder / Sample Value
                            </label>
                            <input
                                type="text"
                                value={fieldSample}
                                onChange={(e) => setFieldSample(e.target.value)}
                                placeholder="e.g. Executive Leadership Coaching, Visual Learner"
                                className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold text-gray-900 outline-none focus:ring-4 focus:ring-[#0E7850]/10"
                            />
                            <p className="text-[10px] text-gray-400">
                                Shown in template previews before participant data is populated.
                            </p>
                        </div>

                        {/* 4. Keyword Aliases */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                4. Matching Keyword Aliases (Comma-separated)
                            </label>
                            <input
                                type="text"
                                value={fieldAliases}
                                onChange={(e) => setFieldAliases(e.target.value)}
                                placeholder="e.g. niche, market niche, target audience, domain"
                                className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-medium text-gray-900 outline-none focus:ring-4 focus:ring-[#0E7850]/10"
                            />
                            <p className="text-[10px] text-gray-400">
                                Allows token parser to recognize variations like <code className="font-mono">{`{Metadata ${fieldLabel || 'Attribute'} receive}`}</code>.
                            </p>
                        </div>

                        {/* 5. Description */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                5. Description & Purpose Note (Optional)
                            </label>
                            <textarea
                                value={fieldDescription}
                                onChange={(e) => setFieldDescription(e.target.value)}
                                placeholder="Explain how coaches or sprints utilize this profile metadata..."
                                rows={3}
                                className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-medium text-gray-900 outline-none focus:ring-4 focus:ring-[#0E7850]/10 resize-none"
                            />
                        </div>

                        {/* Live Token Preview Box */}
                        {fieldLabel && (
                            <div className="p-5 rounded-3xl bg-slate-900 text-white space-y-3 animate-fade-in">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                                        ✨ Generated Token Preview
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-mono">
                                        key: {fieldKey || 'attribute'}
                                    </span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                                    <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700">
                                        <span className="text-indigo-400 font-bold block mb-1">📥 Receive Token:</span>
                                        <code className="text-amber-300 font-bold">{`{Metadata ${fieldLabel} receive}`}</code>
                                    </div>
                                    <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700">
                                        <span className="text-emerald-400 font-bold block mb-1">💾 Save Token:</span>
                                        <code className="text-amber-300 font-bold">{`{Metadata ${fieldLabel} save}`}</code>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-50">
                            <button
                                type="button"
                                onClick={() => {
                                    resetMetadataForm();
                                    setActiveSubTab('metadata_catalog');
                                }}
                                className="px-6 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
                            >
                                Cancel
                            </button>
                            <Button
                                type="submit"
                                disabled={isSavingMetadata}
                                className="px-8 py-4 bg-[#0E7850] text-white hover:bg-[#0b5d3e] rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-700/20 transition-all active:scale-95"
                            >
                                {isSavingMetadata 
                                    ? 'Saving Metadata Field...' 
                                    : (editingFieldId ? 'Update Metadata Field' : 'Register Metadata Field')}
                            </Button>
                        </div>
                    </form>
                </div>
            )}

            {/* TAB 3: OPTION-TO-PROFILE EXTRACTION RULES */}
            {activeSubTab === 'extraction_rules' && (
                <div className="space-y-8 animate-fade-in">
                    {/* Form to configure new extraction rule */}
                    <div className="bg-white rounded-[2.5rem] border border-gray-100 p-8 sm:p-10 shadow-sm space-y-8">
                        <div className="border-b border-gray-50 pb-5">
                            <span className="text-[10px] font-black tracking-widest text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase border border-blue-100">
                                Real-Time Trigger Builder
                            </span>
                            <h4 className="text-xl font-black text-gray-900 tracking-tight italic mt-2">
                                Configure Sprint Option-to-Profile Extraction Rule
                            </h4>
                            <p className="text-xs font-semibold text-gray-400 mt-0.5">
                                Map option codes like <code className="font-mono text-[#0E7850] font-bold">{'{m1 step 1 op 1}'}</code> to automatically store user choices into their profile metadata.
                            </p>
                        </div>

                        <form onSubmit={handleSaveRule} className="space-y-6">
                            {/* 1. Source Sprint Selector */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                    1. Source Sprint Context
                                </label>
                                <CustomSelect
                                    value={sourceSprintId}
                                    onChange={(val) => setSourceSprintId(String(val))}
                                    options={[
                                        { value: '', label: 'Select Sprint Context...' },
                                        { value: 'ALL', label: '🌐 All Sprints (Global Rule Pattern)' },
                                        ...sprints.map(s => ({
                                            value: s.id,
                                            label: s.title || `Sprint ${s.id}`
                                        }))
                                    ]}
                                    placeholder="Choose Source Sprint..."
                                    className="w-full"
                                />
                            </div>

                            {/* 2. Option Code Input */}
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
                            </div>

                            {/* Text proof if available */}
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
                                        </div>
                                    ) : (
                                        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold animate-fade-in">
                                            ⚠️ Could not parse option code. Please ensure format is e.g. <code className="font-mono bg-white px-1.5 py-0.5 rounded border">{'{m1 step 1 op 1}'}</code>.
                                        </div>
                                    )
                                ) : null
                            )}

                            {/* 3. Target Metadata Field Selection */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                    3. Target User Metadata Attribute (Mapped Field)
                                </label>
                                
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-56 overflow-y-auto pr-1">
                                    {metadataFields.map(f => (
                                        <button
                                            key={f.key}
                                            type="button"
                                            onClick={() => setSelectedTargetFieldKey(f.key)}
                                            className={`p-3 rounded-2xl text-left border transition-all cursor-pointer ${
                                                selectedTargetFieldKey === f.key
                                                ? 'bg-[#0E7850] text-white border-[#0E7850] shadow-sm'
                                                : 'bg-gray-50/60 hover:bg-gray-100 text-gray-700 border-gray-100'
                                            }`}
                                        >
                                            <div className="flex items-center gap-1.5">
                                                <span>{f.icon || '🏷️'}</span>
                                                <p className="text-xs font-bold truncate">{f.label}</p>
                                            </div>
                                            <p className={`text-[8px] uppercase font-black tracking-widest mt-0.5 font-mono ${selectedTargetFieldKey === f.key ? 'text-white/70' : 'text-gray-400'}`}>
                                                user.{f.key}
                                            </p>
                                        </button>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={() => setSelectedTargetFieldKey('custom')}
                                        className={`p-3 rounded-2xl text-left border transition-all cursor-pointer ${
                                            selectedTargetFieldKey === 'custom'
                                            ? 'bg-purple-700 text-white border-purple-700 shadow-sm'
                                            : 'bg-purple-50/60 hover:bg-purple-100 text-purple-900 border-purple-100'
                                        }`}
                                    >
                                        <p className="text-xs font-bold truncate">➕ Custom Field Key...</p>
                                        <p className={`text-[8px] uppercase font-black tracking-widest mt-0.5 ${selectedTargetFieldKey === 'custom' ? 'text-white/70' : 'text-purple-400'}`}>
                                            Custom
                                        </p>
                                    </button>
                                </div>

                                {selectedTargetFieldKey === 'custom' && (
                                    <div className="pt-2 animate-fade-in">
                                        <input
                                            type="text"
                                            value={customRuleTargetField}
                                            onChange={(e) => setCustomRuleTargetField(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                                            placeholder="e.g. coaching_niche, career_stage, learning_style"
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

                            {/* 5. Rule Description */}
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
                            <div className="flex justify-end pt-4 border-t border-gray-50">
                                <Button
                                    type="submit"
                                    disabled={isSavingRule}
                                    className="px-8 py-4 bg-[#0E7850] text-white hover:bg-[#0b5d3e] rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-700/20 transition-all active:scale-95"
                                >
                                    {isSavingRule ? 'Saving Rule...' : 'Save Identification Rule'}
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
                                    Active extraction triggers saving participant responses into user profile data.
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

                        {/* Backfill logs */}
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
                </div>
            )}

            {/* TAB 4: LIVE USER PROFILE & METADATA INSPECTOR */}
            {activeSubTab === 'user_inspector' && (
                <div className="bg-white rounded-[2.5rem] border border-gray-100 p-8 shadow-sm space-y-6 animate-fade-in">
                    <div className="border-b border-gray-50 pb-5">
                        <span className="text-[10px] font-black tracking-widest text-purple-700 bg-purple-50 px-3 py-1 rounded-full uppercase border border-purple-100">
                            Audit & Quality Control
                        </span>
                        <h4 className="text-xl font-black text-gray-900 tracking-tight italic mt-2">
                            Live User Profile & Metadata Inspector
                        </h4>
                        <p className="text-xs font-semibold text-gray-400 mt-0.5">
                            Inspect real-time identification metadata captured on participant records across all sprint submissions.
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
                    {activeInspectedUser ? (
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
                                {/* Standard & Dynamic Fields */}
                                {metadataFields.map(field => {
                                    const val = (activeInspectedUser as any).metadata?.[field.key] || 
                                                (activeInspectedUser as any)[field.key] || 
                                                (activeInspectedUser as any).identificationData?.[field.key]?.value;
                                    if (!val) return null;
                                    return (
                                        <div key={field.key} className="p-4 bg-white rounded-2xl border border-gray-200 shadow-sm space-y-1">
                                            <div className="flex items-center justify-between">
                                                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1">
                                                    <span>{field.icon || '🏷️'}</span>
                                                    <span>{field.label}</span>
                                                </p>
                                                <span className="text-[8px] font-mono text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">
                                                    {field.key}
                                                </span>
                                            </div>
                                            <p className="text-xs font-bold text-gray-900">{Array.isArray(val) ? val.join(', ') : String(val)}</p>
                                        </div>
                                    );
                                })}

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
                        </div>
                    ) : (
                        <div className="py-8 text-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 text-xs text-gray-400 font-semibold">
                            Select a user above to inspect their live metadata and identification attributes.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
