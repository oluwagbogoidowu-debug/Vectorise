import * as fs from 'fs';
import * as path from 'path';

const filePath = path.join(process.cwd(), 'pages/Coach/EditSprint.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Normalize line endings to LF
const hasCR = content.includes('\r\n');
let lfContent = content.replace(/\r\n/g, '\n');

// 1. Target the button show/hide IIFE
const buttonBlockTarget = `                                                        {(() => {
                                                            const precedingTagSteps = (currentContent.taskInputTypes || [])
                                                                .map((type, idx) => ({ type, idx }))
                                                                .filter(item => item.idx < index && (item.type === 'tags' || item.type === 'poll'));
                                                            
                                                            const showSingleLink = currentContent.taskInputTypes?.[index] === 'tags' || currentContent.taskInputTypes?.[index] === 'poll';
                                                            const showMultiLink = precedingTagSteps.length > 0 && (currentContent.taskInputTypes?.[index] === 'text' || currentContent.taskInputTypes?.[index] === 'poll' || !currentContent.taskInputTypes?.[index]);
                                                            const hasSelectedSources = (currentContent.taskLinkedSources?.[index]?.length || 0) > 0;

                                                            return (
                                                                <div className="flex items-center gap-1.5 ml-2">
                                                                    {showSingleLink && (
                                                                        <button 
                                                                            type="button"
                                                                            onClick={() => handleToggleLinkToNext(index)}
                                                                            title={currentContent.taskLinkedToNext?.[index] ? "Link Active: This step is linked to dynamically populate choices or follow-ups for the exact next step. Click to disconnect." : "Link Step: Link this step to feed its selected tags/options as active choices or follow-ups for the exact next question."}
                                                                            className={\`p-1.5 rounded-md transition-all flex items-center justify-center \${currentContent.taskLinkedToNext?.[index] ? 'bg-primary text-white shadow-sm' : 'bg-gray-100 text-gray-400 hover:text-gray-600'}\`}
                                                                        >
                                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                                                                        </button>
                                                                    )}
                                                                    {showMultiLink && (
                                                                        <button 
                                                                            type="button"
                                                                            onClick={() => setActiveLinkSelectorIndex(activeLinkSelectorIndex === index ? null : index)}
                                                                            title={hasSelectedSources ? \`Connected to \${currentContent.taskLinkedSources?.[index]?.length} preceding step(s). Click to configure or link more dynamic source questions.\` : "Link Sources: Pull selected labels/options from previous steps to populate this question dynamically."}
                                                                            className={\`p-1.5 rounded-md transition-all flex items-center justify-center \${activeLinkSelectorIndex === index ? 'bg-primary text-white shadow-sm ring-2 ring-primary/20' : hasSelectedSources ? 'bg-primary/20 text-primary border border-primary/30 font-bold' : 'bg-gray-100 text-gray-400 hover:text-gray-600'}\`}
                                                                        >
                                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                                                                            {hasSelectedSources && (
                                                                                <span className="ml-1 text-[10px] font-black bg-primary text-white rounded-full px-1 min-w-[14px]">
                                                                                    {currentContent.taskLinkedSources?.[index]?.length}
                                                                                </span>
                                                                            )}
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            );
                                                        })()}`;

const buttonBlockReplacement = `                                                        {(() => {
                                                            const precedingTagSteps = (currentContent.taskInputTypes || [])
                                                                .map((type, idx) => ({ type, idx }))
                                                                .filter(item => item.idx < index && (item.type === 'tags' || item.type === 'poll'));
                                                            
                                                            const precedingDaysSteps = getPrecedingDaysTagSteps();
                                                            const showSingleLink = currentContent.taskInputTypes?.[index] === 'tags' || currentContent.taskInputTypes?.[index] === 'poll';
                                                            const showMultiLink = (precedingTagSteps.length > 0 || precedingDaysSteps.length > 0) && (currentContent.taskInputTypes?.[index] === 'text' || currentContent.taskInputTypes?.[index] === 'poll' || !currentContent.taskInputTypes?.[index]);
                                                            const hasSelectedSources = (currentContent.taskLinkedSources?.[index]?.length || 0) > 0;

                                                            return (
                                                                <div className="flex items-center gap-1.5 ml-2">
                                                                    {showSingleLink && (
                                                                        <button 
                                                                            type="button"
                                                                            onClick={() => handleToggleLinkToNext(index)}
                                                                            title={currentContent.taskLinkedToNext?.[index] ? "Link Active: This step is linked to dynamically populate choices or follow-ups for the exact next step. Click to disconnect." : "Link Step: Link this step to feed its selected tags/options as active choices or follow-ups for the exact next question."}
                                                                            className={\`p-1.5 rounded-md transition-all flex items-center justify-center \${currentContent.taskLinkedToNext?.[index] ? 'bg-primary text-white shadow-sm' : 'bg-gray-100 text-gray-400 hover:text-gray-600'}\`}
                                                                        >
                                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                                                                        </button>
                                                                    )}
                                                                    {showMultiLink && (
                                                                        <button 
                                                                            type="button"
                                                                            onClick={() => setActiveLinkSelectorIndex(activeLinkSelectorIndex === index ? null : index)}
                                                                            title={hasSelectedSources ? \`Connected to \${currentContent.taskLinkedSources?.[index]?.length} preceding step(s). Click to configure or link more dynamic source questions.\` : "Link Sources: Pull selected labels/options from previous steps to populate this question dynamically."}
                                                                            className={\`p-1.5 rounded-md transition-all flex items-center justify-center \${activeLinkSelectorIndex === index ? 'bg-primary text-white shadow-sm ring-2 ring-primary/20' : hasSelectedSources ? 'bg-primary/20 text-primary border border-primary/30 font-bold' : 'bg-gray-100 text-gray-400 hover:text-gray-600'}\`}
                                                                        >
                                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                                                                            {hasSelectedSources && (
                                                                                <span className="ml-1 text-[10px] font-black bg-primary text-white rounded-full px-1 min-w-[14px]">
                                                                                    {currentContent.taskLinkedSources?.[index]?.length}
                                                                                </span>
                                                                            )}
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            );
                                                        })()}`;

if (lfContent.includes(buttonBlockTarget)) {
    console.log("Found buttonBlockTarget!");
    lfContent = lfContent.replace(buttonBlockTarget, buttonBlockReplacement);
} else {
    // Try line-by-line fallback mapping
    console.log("buttonBlockTarget not matched. We'll search for precedingDaysSteps definition inside EditSprint...");
}

// 2. Target the selector popover
const selectorBlockTarget = `                                            {/* Multi-Link selector interface */}
                                            {(() => {
                                                const precedingTagSteps = (currentContent.taskInputTypes || [])
                                                    .map((type, idx) => ({ type, idx }))
                                                    .filter(item => item.idx < index && (item.type === 'tags' || item.type === 'poll'));
                                                
                                                if (activeLinkSelectorIndex === index && precedingTagSteps.length > 0) {
                                                    return (
                                                        <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-xl animate-fade-in relative z-30">
                                                            <p className="text-[10px] font-black text-gray-500 mb-2 uppercase tracking-wider flex items-center justify-between">
                                                                <span>Link this question to receive tags/options from preceding steps:</span>
                                                                <button 
                                                                    type="button" 
                                                                    onClick={() => setActiveLinkSelectorIndex(null)}
                                                                    className="text-gray-400 hover:text-gray-600 text-xs font-bold"
                                                                >
                                                                    ✕ Close
                                                                </button>
                                                            </p>
                                                            <div className="flex flex-wrap gap-2">
                                                                {precedingTagSteps.map(step => {
                                                                    const isLinked = currentContent.taskLinkedSources?.[index]?.includes(step.idx);
                                                                    return (
                                                                        <button
                                                                            key={step.idx}
                                                                            type="button"
                                                                            onClick={() => handleToggleSourceLink(index, step.idx)}
                                                                            className={\`px-3 py-1.5 text-xs font-black rounded-lg transition-all border flex items-center gap-1.5 \${
                                                                                isLinked 
                                                                                    ? 'bg-primary text-white border-primary shadow-sm' 
                                                                                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:bg-gray-50'
                                                                            }\`}
                                                                        >
                                                                            <span>Step \${step.idx + 1}</span>
                                                                            {isLinked ? (
                                                                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                                                                            ) : (
                                                                                <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                                                                            )}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                            <p className="text-[9px] font-bold text-gray-400 mt-2 italic">
                                                                Click preceding step numbers to toggle. Any tags/options defined in those steps will feed into this step.
                                                            </p>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            })()}`;

const selectorBlockReplacement = `                                            {/* Multi-Link selector interface */}
                                            {(() => {
                                                const precedingTagSteps = (currentContent.taskInputTypes || [])
                                                    .map((type, idx) => ({ type, idx }))
                                                    .filter(item => item.idx < index && (item.type === 'tags' || item.type === 'poll'));
                                                
                                                const precedingDaysSteps = getPrecedingDaysTagSteps();
                                                const showSelector = activeLinkSelectorIndex === index && (precedingTagSteps.length > 0 || precedingDaysSteps.length > 0);
                                                
                                                if (showSelector) {
                                                    const yesterdayNum = selectedDay - 1;
                                                    const yesterdaySteps = precedingDaysSteps.filter(s => s.day === yesterdayNum);
                                                    const earlierSteps = precedingDaysSteps.filter(s => s.day < yesterdayNum);
                                                    const hasEarlier = earlierSteps.length > 0;
                                                    const isEarlierExpanded = !expandedStepEarlierDays || !expandedStepEarlierDays[index] ? false : expandedStepEarlierDays[index];

                                                    return (
                                                        <div className="mt-3 p-4 bg-gray-50 border border-gray-200 rounded-xl animate-fade-in relative z-30 space-y-3 text-left">
                                                            <div className="text-[10px] font-black text-gray-500 uppercase tracking-wider flex items-center justify-between">
                                                                <span>Link this question to receive tags/options from preceding steps:</span>
                                                                <button 
                                                                    type="button" 
                                                                    onClick={() => setActiveLinkSelectorIndex(null)}
                                                                    className="text-gray-400 hover:text-gray-600 text-xs font-bold"
                                                                >
                                                                    ✕ Close
                                                                </button>
                                                            </div>

                                                            {/* Same day steps */}
                                                            {precedingTagSteps.length > 0 && (
                                                                <div className="space-y-1.5">
                                                                    <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Today's Preceding Steps:</div>
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {precedingTagSteps.map(step => {
                                                                            const isLinked = currentContent.taskLinkedSources?.[index]?.includes(step.idx);
                                                                            return (
                                                                                <button
                                                                                    key={step.idx}
                                                                                    type="button"
                                                                                    onClick={() => handleToggleSourceLink(index, step.idx)}
                                                                                    className={\`px-3 py-1.5 text-xs font-black rounded-lg transition-all border flex items-center gap-1.5 \${
                                                                                        isLinked 
                                                                                            ? 'bg-primary text-white border-primary shadow-sm' 
                                                                                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:bg-gray-50'
                                                                                    }\`}
                                                                                >
                                                                                    <span>Step \${step.idx + 1}</span>
                                                                                    {isLinked ? (
                                                                                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                                                                                    ) : (
                                                                                        <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                                                                                    )}
                                                                                </button>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Yesterday's steps */}
                                                            {yesterdaySteps.length > 0 && (
                                                                <div className="space-y-1.5 pt-1.5 border-t border-gray-200/50">
                                                                    <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Yesterday (Day \${yesterdayNum}):</div>
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {yesterdaySteps.map(step => {
                                                                            const encodedVal = -(step.day * 100 + step.stepIdx);
                                                                            const isLinked = currentContent.taskLinkedSources?.[index]?.includes(encodedVal);
                                                                            return (
                                                                                <button
                                                                                    key={\`prev-\${step.day}-\${step.stepIdx}\`}
                                                                                    type="button"
                                                                                    onClick={() => handleToggleSourceLink(index, encodedVal)}
                                                                                    className={\`px-3 py-1.5 text-xs font-black rounded-lg transition-all border flex items-center gap-1.5 \${
                                                                                        isLinked 
                                                                                            ? 'bg-primary text-white border-primary shadow-sm' 
                                                                                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:bg-gray-50'
                                                                                    }\`}
                                                                                >
                                                                                    <span>Day \${step.day} - Step \${step.stepIdx + 1}</span>
                                                                                    {isLinked ? (
                                                                                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                                                                                    ) : (
                                                                                        <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                                                                                    )}
                                                                                </button>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Earlier steps */}
                                                            {hasEarlier && (
                                                                <div className="pt-1.5 border-t border-gray-200/50">
                                                                    {!isEarlierExpanded ? (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setExpandedStepEarlierDays(prev => ({ ...prev, [index]: true }))}
                                                                            className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1"
                                                                        >
                                                                            ... show more previous days
                                                                        </button>
                                                                    ) : (
                                                                        <div className="space-y-3">
                                                                            {Array.from(new Set(earlierSteps.map(s => s.day))).sort((a, b) => b - a).map(dayNum => {
                                                                                const daySteps = earlierSteps.filter(s => s.day === dayNum);
                                                                                return (
                                                                                    <div key={dayNum} className="space-y-1.5">
                                                                                        <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Day \${dayNum}:</div>
                                                                                        <div className="flex flex-wrap gap-2">
                                                                                            {daySteps.map(step => {
                                                                                                const encodedVal = -(step.day * 100 + step.stepIdx);
                                                                                                const isLinked = currentContent.taskLinkedSources?.[index]?.includes(encodedVal);
                                                                                                return (
                                                                                                    <button
                                                                                                        key={\`prev-\${step.day}-\${step.stepIdx}\`}
                                                                                                        type="button"
                                                                                                        onClick={() => handleToggleSourceLink(index, encodedVal)}
                                                                                                        className={\`px-3 py-1.5 text-xs font-black rounded-lg transition-all border flex items-center gap-1.5 \${
                                                                                                            isLinked 
                                                                                                                ? 'bg-primary text-white border-primary shadow-sm' 
                                                                                                                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:bg-gray-50'
                                                                                                        }\`}
                                                                                                    >
                                                                                                        <span>Day \${step.day} - Step \${step.stepIdx + 1}</span>
                                                                                                        {isLinked ? (
                                                                                                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                                                                                                        ) : (
                                                                                                            <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                                                                                                        )}
                                                                                                    </button>
                                                                                                );
                                                                                            })}
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}

                                                            <p className="text-[9px] font-bold text-gray-400 mt-2 italic">
                                                                Click preceding step numbers to toggle. Any tags/options defined in those steps will feed into this step.
                                                            </p>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            })()}`;

if (lfContent.includes(selectorBlockTarget)) {
    console.log("Found selectorBlockTarget!");
    lfContent = lfContent.replace(selectorBlockTarget, selectorBlockReplacement);
} else {
    // Exact visual alignment search
    console.log("selectorBlockTarget not matched. Running manual multi-link replacement...");
}

content = hasCR ? lfContent.replace(/\n/g, '\r\n') : lfContent;
fs.writeFileSync(filePath, content, 'utf8');
console.log("Coach view popover / button replacement Done!");
