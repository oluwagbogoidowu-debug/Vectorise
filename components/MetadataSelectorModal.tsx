import React, { useState, useEffect, useMemo } from 'react';
import { getMetadataFields, MetadataFieldDef } from '../src/utils/stepPlaceholderUtils';
import { metadataService } from '../services/metadataService';

interface MetadataSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectToken: (token: string, details: { fieldKey: string; fieldLabel: string; mode: 'save' | 'receive' }) => void;
  initialField?: string;
  initialMode?: 'save' | 'receive';
  targetFieldName?: string; // e.g. "Step Prompt", "Task Hint", "Task Footnote", "Bridge Note"
}

export const MetadataSelectorModal: React.FC<MetadataSelectorModalProps> = ({
  isOpen,
  onClose,
  onSelectToken,
  initialField = 'interests',
  initialMode = 'receive',
  targetFieldName = 'Step'
}) => {
  const [fields, setFields] = useState<MetadataFieldDef[]>(() => getMetadataFields());
  const [selectedFieldKey, setSelectedFieldKey] = useState<string>(initialField);
  const [mode, setMode] = useState<'save' | 'receive'>(initialMode);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  useEffect(() => {
    if (!isOpen) return;
    setFields(getMetadataFields());
    const unsub = metadataService.subscribeToMetadataFields((all) => {
      setFields(getMetadataFields());
    });
    return () => unsub();
  }, [isOpen]);

  // Extract unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    fields.forEach(f => {
      if (f.category) cats.add(f.category);
      else cats.add('General');
    });
    return ['ALL', ...Array.from(cats)];
  }, [fields]);

  // Filtered fields
  const filteredFields = useMemo(() => {
    return fields.filter(f => {
      const matchCat = selectedCategory === 'ALL' || (f.category || 'General') === selectedCategory;
      const matchSearch = !searchQuery.trim() || 
        f.label.toLowerCase().includes(searchQuery.toLowerCase()) || 
        f.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.aliases.some(a => a.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCat && matchSearch;
    });
  }, [fields, selectedCategory, searchQuery]);

  if (!isOpen) return null;

  const currentFieldDef = fields.find(f => f.key === selectedFieldKey) || fields[0] || {
    key: 'metadata',
    label: 'Metadata',
    aliases: ['metadata'],
    placeholderSample: 'User profile value',
    category: 'General'
  };

  const generatedToken = mode === 'save'
    ? `{Metadata ${currentFieldDef.label} save}`
    : `{Metadata ${currentFieldDef.label} receive}`;

  const handleConfirm = () => {
    onSelectToken(generatedToken, {
      fieldKey: currentFieldDef.key,
      fieldLabel: currentFieldDef.label,
      mode
    });
    onClose();
  };

  const getFieldIcon = (field: MetadataFieldDef) => {
    switch (field.key) {
      case 'lifeStage': return '🎓';
      case 'currentGoal': return '🎯';
      case 'currentPriority': return '⚡';
      case 'desiredDirection': return '🧭';
      case 'interests': return '💡';
      case 'strengths': return '💪';
      case 'occupation': return '💼';
      case 'industry': return '🏢';
      case 'gender': return '👤';
      case 'targetNiche': return '🎯';
      default: return '🏷️';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden animate-scale-up flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 bg-linear-to-r from-purple-50/70 via-indigo-50/40 to-slate-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center text-lg font-bold shadow-md shadow-purple-200">
                ✨
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 tracking-tight">Connect User Metadata</h3>
                <p className="text-xs text-slate-500 font-medium">Extract, store, or dynamically reference participant profile data</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center text-sm font-bold transition-all cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Step 1: Select Field */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                1. Select Metadata Field ({fields.length} available)
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search metadata..."
                className="px-3 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-purple-500/20"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2.5 scrollbar-thin">
              {categories.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-purple-700 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  {cat === 'ALL' ? '🌟 All Categories' : cat}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
              {filteredFields.map((field) => {
                const isSelected = selectedFieldKey === field.key;
                return (
                  <button
                    key={field.key}
                    type="button"
                    onClick={() => setSelectedFieldKey(field.key)}
                    className={`flex items-center gap-2.5 p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-purple-600 bg-purple-50/90 text-purple-950 ring-2 ring-purple-500/20 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/80 text-slate-700'
                    }`}
                  >
                    <span className="text-xl flex-shrink-0">{getFieldIcon(field)}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <div className="text-xs font-bold truncate">{field.label}</div>
                        {field.category && (
                          <span className="text-[8px] font-semibold uppercase bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                            {field.category}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">e.g. {field.placeholderSample}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Choose Action (Receive vs Save) */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-2">
              2. Select Action Mode
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* Receive Mode */}
              <button
                type="button"
                onClick={() => setMode('receive')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  mode === 'receive'
                    ? 'border-indigo-600 bg-indigo-50/80 text-indigo-950 ring-2 ring-indigo-500/20 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-600'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-black">📥</span>
                  <span className="text-xs font-black text-indigo-900">Receive It</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Display user's stored <strong className="text-indigo-900 font-bold">{currentFieldDef.label}</strong> captured from earlier sprints.
                </p>
                <div className="mt-2 text-[10px] font-mono text-indigo-700 bg-indigo-100/60 px-2 py-0.5 rounded-md w-fit font-bold">
                  &#123;Metadata {currentFieldDef.label} receive&#125;
                </div>
              </button>

              {/* Save Mode */}
              <button
                type="button"
                onClick={() => setMode('save')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  mode === 'save'
                    ? 'border-emerald-600 bg-emerald-50/80 text-emerald-950 ring-2 ring-emerald-500/20 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-600'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-black">💾</span>
                  <span className="text-xs font-black text-emerald-900">Save It</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Capture participant's response and save as their <strong className="text-emerald-900 font-bold">{currentFieldDef.label}</strong> in database.
                </p>
                <div className="mt-2 text-[10px] font-mono text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded-md w-fit font-bold">
                  &#123;Metadata {currentFieldDef.label} save&#125;
                </div>
              </button>
            </div>
          </div>

          {/* Token Preview Banner */}
          <div className="p-3.5 bg-slate-900 text-slate-100 rounded-2xl space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-widest text-slate-400 font-black">Generated Token</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${mode === 'save' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-indigo-500/20 text-indigo-300'}`}>
                {mode === 'save' ? '💾 Persist to Profile' : '📥 Dynamic Substitution'}
              </span>
            </div>
            <div className="text-sm font-mono font-bold text-amber-300 select-all">
              {generatedToken}
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              {mode === 'save' 
                ? `Participant's answer will be saved to their profile and visible in Admin User Details.`
                : `Will automatically be replaced by the participant's saved ${currentFieldDef.label} (e.g. "${currentFieldDef.placeholderSample}").`}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className={`px-5 py-2.5 text-xs font-black text-white rounded-xl shadow-md transition-all cursor-pointer active:scale-95 ${
              mode === 'save'
                ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
                : 'bg-purple-600 hover:bg-purple-700 shadow-purple-200'
            }`}
          >
            Insert {generatedToken}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MetadataSelectorModal;
