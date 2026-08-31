import React, { useState, useEffect, useRef } from 'react';
import { GripVertical, ChevronUp, ChevronDown, Check } from 'lucide-react';

interface ArrangePollOptionsProps {
  options: string[];
  value: string;
  onChange: (newValue: string) => void;
  isFullBleed?: boolean;
  disabled?: boolean;
}

export const ArrangePollOptions: React.FC<ArrangePollOptionsProps> = ({
  options,
  value,
  onChange,
  isFullBleed = false,
  disabled = false,
}) => {
  const [items, setItems] = useState<string[]>(() => {
    const valid = (options || []).filter(Boolean);
    if (!value) return valid;
    try {
      if (value.startsWith('[')) {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const filtered = parsed.filter(p => valid.includes(p));
          valid.forEach(v => {
            if (!filtered.includes(v)) filtered.push(v);
          });
          return filtered.length > 0 ? filtered : valid;
        }
      }
    } catch (e) {}
    return valid;
  });

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  // Synchronize when options change or when external value changes
  useEffect(() => {
    const valid = (options || []).filter(Boolean);
    if (valid.length === 0) return;

    let currentOrder: string[] = [];
    if (value && value.startsWith('[')) {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed) && parsed.length > 0) {
          currentOrder = parsed.filter(p => valid.includes(p));
        }
      } catch (e) {}
    }

    valid.forEach(v => {
      if (!currentOrder.includes(v)) currentOrder.push(v);
    });

    if (currentOrder.length > 0) {
      const isDifferent = currentOrder.length !== items.length || currentOrder.some((item, idx) => item !== items[idx]);
      if (isDifferent) {
        setItems(currentOrder);
      }
      if (!value || value !== JSON.stringify(currentOrder)) {
        onChange(JSON.stringify(currentOrder));
      }
    }
  }, [options, value]);

  const moveItem = (fromIndex: number, toIndex: number) => {
    if (disabled || fromIndex === toIndex || toIndex < 0 || toIndex >= items.length) return;
    const newItems = [...items];
    const [moved] = newItems.splice(fromIndex, 1);
    newItems.splice(toIndex, 0, moved);
    setItems(newItems);
    onChange(JSON.stringify(newItems));
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (disabled) return;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (disabled || draggedIndex === null || draggedIndex === index) return;
    setOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (disabled || draggedIndex === null) return;
    moveItem(draggedIndex, targetIndex);
    setDraggedIndex(null);
    setOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setOverIndex(null);
  };

  // Touch drag support for mobile
  const touchStartYRef = useRef<number | null>(null);
  const touchActiveIdxRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const handleTouchStart = (index: number, e: React.TouchEvent) => {
    if (disabled) return;
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

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="w-full space-y-2.5">
      <div className="flex items-center justify-between px-1 pb-1">
        <p className={`${isFullBleed ? 'text-xs sm:text-sm font-black' : 'text-[10px] font-black'} uppercase text-primary tracking-widest flex items-center gap-1.5`}>
          <GripVertical size={14} className="text-primary animate-pulse" />
          <span>Drag & arrange in order of priority:</span>
        </p>
        <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
          {items.length} items
        </span>
      </div>

      <div 
        ref={containerRef}
        className="space-y-2 w-full"
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {items.map((opt, idx) => {
          const isDragging = draggedIndex === idx;
          const isOver = overIndex === idx;

          return (
            <div
              key={`${opt}-${idx}`}
              draggable={!disabled}
              onDragStart={(e) => handleDragStart(e, idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDrop={(e) => handleDrop(e, idx)}
              onDragEnd={handleDragEnd}
              onTouchStart={(e) => handleTouchStart(idx, e)}
              className={`group select-none w-full ${isFullBleed ? 'py-3.5 sm:py-4 px-4 sm:px-5 rounded-2xl' : 'py-2.5 px-3 rounded-xl'} border transition-all duration-150 flex items-center justify-between gap-3 ${
                isDragging
                  ? 'bg-primary/10 border-primary ring-2 ring-primary/30 shadow-lg scale-[1.01] opacity-90 cursor-grabbing'
                  : isOver
                  ? 'border-primary bg-primary/5 shadow-md'
                  : 'bg-white border-gray-200/80 hover:border-primary/40 hover:bg-gray-50/50 shadow-2xs cursor-grab active:cursor-grabbing'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center font-black text-xs shrink-0 transition-colors ${
                  idx === 0
                    ? 'bg-primary text-white shadow-xs'
                    : idx === 1
                    ? 'bg-primary/80 text-white'
                    : 'bg-gray-150 text-gray-700'
                }`}>
                  {idx + 1}
                </span>
                <span className={`font-bold text-left truncate ${isFullBleed ? 'text-sm sm:text-base text-gray-900' : 'text-xs sm:text-sm text-gray-800'}`}>
                  {opt}
                </span>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {!disabled && (
                  <div className="flex flex-col gap-0.5">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={(e) => {
                        e.stopPropagation();
                        moveItem(idx, idx - 1);
                      }}
                      className={`p-1 rounded hover:bg-gray-200 transition-colors ${idx === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:text-gray-900 cursor-pointer'}`}
                      title="Move up"
                    >
                      <ChevronUp size={12} strokeWidth={3} />
                    </button>
                    <button
                      type="button"
                      disabled={idx === items.length - 1}
                      onClick={(e) => {
                        e.stopPropagation();
                        moveItem(idx, idx + 1);
                      }}
                      className={`p-1 rounded hover:bg-gray-200 transition-colors ${idx === items.length - 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:text-gray-900 cursor-pointer'}`}
                      title="Move down"
                    >
                      <ChevronDown size={12} strokeWidth={3} />
                    </button>
                  </div>
                )}
                <div className="p-1.5 text-gray-400 group-hover:text-primary transition-colors cursor-grab active:cursor-grabbing">
                  <GripVertical size={16} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
