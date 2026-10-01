import React, { useState, useEffect, useRef } from 'react';
import { Sprint } from '../types';
import { GripVertical, ChevronUp, ChevronDown, Check, Save, ArrowUpDown, X, Sparkles, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { getSprintCashPrice } from '../utils/sprintUtils';

interface ArrangeTrackSprintsProps {
    sprintIds: string[];
    allSprints: Sprint[];
    onChange: (newSprintIds: string[]) => void;
    onSave?: (savedSprintIds: string[]) => void;
    onRemove?: (sprintId: string) => void;
}

export const ArrangeTrackSprints: React.FC<ArrangeTrackSprintsProps> = ({
    sprintIds,
    allSprints,
    onChange,
    onSave,
    onRemove
}) => {
    const [orderedIds, setOrderedIds] = useState<string[]>(sprintIds);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [overIndex, setOverIndex] = useState<number | null>(null);
    const [isSavedRecently, setIsSavedRecently] = useState(false);

    const containerRef = useRef<HTMLDivElement | null>(null);
    const touchStartYRef = useRef<number | null>(null);
    const touchActiveIdxRef = useRef<number | null>(null);

    // Synchronize local state when parent sprintIds change externally
    useEffect(() => {
        setOrderedIds(sprintIds);
    }, [sprintIds]);

    const sprintMap = useRef<Map<string, Sprint>>(new Map());
    useEffect(() => {
        const map = new Map<string, Sprint>();
        allSprints.forEach(s => map.set(s.id, s));
        sprintMap.current = map;
    }, [allSprints]);

    const moveItem = (fromIndex: number, toIndex: number) => {
        if (fromIndex === toIndex || toIndex < 0 || toIndex >= orderedIds.length) return;
        const newIds = [...orderedIds];
        const [moved] = newIds.splice(fromIndex, 1);
        newIds.splice(toIndex, 0, moved);
        setOrderedIds(newIds);
        onChange(newIds);
    };

    const handleDragStart = (e: React.DragEvent, index: number) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', index.toString());
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === index) return;
        setOverIndex(index);
    };

    const handleDrop = (e: React.DragEvent, targetIndex: number) => {
        e.preventDefault();
        if (draggedIndex === null) return;
        moveItem(draggedIndex, targetIndex);
        setDraggedIndex(null);
        setOverIndex(null);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
        setOverIndex(null);
    };

    // Mobile touch drag
    const handleTouchStart = (index: number, e: React.TouchEvent) => {
        touchStartYRef.current = e.touches[0].clientY;
        touchActiveIdxRef.current = index;
        setDraggedIndex(index);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (touchActiveIdxRef.current === null || !containerRef.current) return;
        const touchY = e.touches[0].clientY;
        const itemElements = Array.from(containerRef.current.children) as HTMLElement[];

        for (let i = 0; i < itemElements.length; i++) {
            const rect = itemElements[i].getBoundingClientRect();
            if (touchY >= rect.top && touchY <= rect.bottom) {
                if (i !== touchActiveIdxRef.current) {
                    moveItem(touchActiveIdxRef.current, i);
                    touchActiveIdxRef.current = i;
                    setDraggedIndex(i);
                }
                break;
            }
        }
    };

    const handleTouchEnd = () => {
        touchStartYRef.current = null;
        touchActiveIdxRef.current = null;
        setDraggedIndex(null);
        setOverIndex(null);
    };

    const handleSaveClick = () => {
        onChange(orderedIds);
        if (onSave) {
            onSave(orderedIds);
        }
        setIsSavedRecently(true);
        toast.success("Sprint sequence saved successfully!");
        setTimeout(() => setIsSavedRecently(false), 2500);
    };

    if (orderedIds.length === 0) {
        return (
            <div className="p-8 text-center bg-gray-50/70 rounded-2xl border border-dashed border-gray-200">
                <Layers className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-gray-500">No sprints selected yet.</p>
                <p className="text-[10px] text-gray-400 font-medium mt-1">Select sprints from the list below to build your track sequence.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Action Bar with Rearrange & Save Icons */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-gray-50/80 rounded-2xl border border-gray-100">
                <div className="flex items-center gap-2">
                    <span className="p-1.5 bg-primary/10 text-primary rounded-lg">
                        <ArrowUpDown className="w-4 h-4" />
                    </span>
                    <div>
                        <p className="text-xs font-black text-gray-900 leading-tight flex items-center gap-1.5">
                            Track Progression Sequence
                            <span className="text-[9px] px-2 py-0.5 bg-primary text-white font-black rounded-full">
                                {orderedIds.length} {orderedIds.length === 1 ? 'Sprint' : 'Sprints'}
                            </span>
                        </p>
                        <p className="text-[10px] text-gray-400 font-bold">Drag or use arrows to rearrange sprint order (e.g. Move #3 to #1).</p>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={handleSaveClick}
                    className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95 ${
                        isSavedRecently
                            ? 'bg-emerald-600 text-white shadow-emerald-600/20'
                            : 'bg-primary text-white hover:bg-[#0b5d3e] shadow-primary/20 hover:shadow-md'
                    }`}
                >
                    {isSavedRecently ? (
                        <>
                            <Check className="w-3.5 h-3.5 text-white animate-bounce" strokeWidth={3} />
                            <span>Saved!</span>
                        </>
                    ) : (
                        <>
                            <Save className="w-3.5 h-3.5" />
                            <span>Save Order</span>
                        </>
                    )}
                </button>
            </div>

            {/* Draggable Sprint Cards */}
            <div
                ref={containerRef}
                className="space-y-2.5"
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {orderedIds.map((id, index) => {
                    const sprint = sprintMap.current.get(id) || allSprints.find(s => s.id === id);
                    const isDragging = draggedIndex === index;
                    const isOver = overIndex === index;
                    const isFirst = index === 0;

                    return (
                        <div
                            key={`${id}-${index}`}
                            draggable
                            onDragStart={(e) => handleDragStart(e, index)}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDrop={(e) => handleDrop(e, index)}
                            onDragEnd={handleDragEnd}
                            onTouchStart={(e) => handleTouchStart(index, e)}
                            className={`group select-none w-full p-3 sm:p-3.5 rounded-2xl border transition-all duration-150 flex items-center justify-between gap-3 ${
                                isDragging
                                    ? 'bg-primary/10 border-primary ring-2 ring-primary/30 shadow-xl scale-[1.01] opacity-90 cursor-grabbing'
                                    : isOver
                                    ? 'border-primary bg-primary/5 shadow-md'
                                    : 'bg-white border-gray-100 hover:border-primary/30 hover:bg-gray-50/50 shadow-xs cursor-grab active:cursor-grabbing'
                            }`}
                        >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                {/* Order Badge */}
                                <div className="flex flex-col items-center justify-center shrink-0">
                                    <span
                                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center font-black text-xs transition-colors shadow-xs ${
                                            isFirst
                                                ? 'bg-primary text-white ring-2 ring-primary/20'
                                                : 'bg-gray-100 text-gray-700 group-hover:bg-primary/10 group-hover:text-primary'
                                        }`}
                                    >
                                        #{index + 1}
                                    </span>
                                    {isFirst && (
                                        <span className="text-[7px] font-black uppercase tracking-widest text-primary mt-0.5">Start</span>
                                    )}
                                </div>

                                {/* Thumbnail */}
                                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl overflow-hidden flex-shrink-0 border border-gray-100 bg-gray-100">
                                    {sprint?.coverImageUrl ? (
                                        <img src={sprint.coverImageUrl} className="w-full h-full object-cover" alt="" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-300 font-black text-xs">
                                            #{index + 1}
                                        </div>
                                    )}
                                </div>

                                {/* Sprint Details */}
                                <div className="text-left min-w-0 flex-1">
                                    <p className="text-xs sm:text-sm font-black text-gray-900 tracking-tight leading-snug truncate">
                                        {sprint?.title || `Sprint ID: ${id}`}
                                    </p>
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-0.5 truncate">
                                        {sprint ? `${sprint.duration} Days • ${getSprintCashPrice(sprint).toLocaleString()} ${sprint.currency || 'NGN'}` : 'Selected Sprint'}
                                    </p>
                                </div>
                            </div>

                            {/* Controls: Up/Down Arrows, Drag Handle, Remove Button */}
                            <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                                <div className="flex flex-col gap-0.5">
                                    <button
                                        type="button"
                                        disabled={index === 0}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            moveItem(index, index - 1);
                                        }}
                                        className={`p-1 rounded-md hover:bg-gray-100 transition-colors ${
                                            index === 0 ? 'text-gray-200 cursor-not-allowed' : 'text-gray-500 hover:text-gray-900 cursor-pointer'
                                        }`}
                                        title="Move Up"
                                    >
                                        <ChevronUp size={14} strokeWidth={3} />
                                    </button>
                                    <button
                                        type="button"
                                        disabled={index === orderedIds.length - 1}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            moveItem(index, index + 1);
                                        }}
                                        className={`p-1 rounded-md hover:bg-gray-100 transition-colors ${
                                            index === orderedIds.length - 1 ? 'text-gray-200 cursor-not-allowed' : 'text-gray-500 hover:text-gray-900 cursor-pointer'
                                        }`}
                                        title="Move Down"
                                    >
                                        <ChevronDown size={14} strokeWidth={3} />
                                    </button>
                                </div>

                                {/* Drag Grip Handle */}
                                <div 
                                    className="p-1.5 text-gray-300 group-hover:text-primary transition-colors cursor-grab active:cursor-grabbing rounded-lg hover:bg-primary/5"
                                    title="Drag to reposition"
                                >
                                    <GripVertical size={18} />
                                </div>

                                {/* Remove button */}
                                {onRemove && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onRemove(id);
                                        }}
                                        className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer ml-0.5"
                                        title="Remove from track"
                                    >
                                        <X size={14} strokeWidth={2.5} />
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
