import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X, CheckSquare, Square } from 'lucide-react';

export interface MultiSelectOption {
  value: string;
  label: string;
  sublabel?: string;
  badge?: string;
  isSubscribed?: boolean;
}

interface CustomMultiSelectProps {
  options: MultiSelectOption[];
  selectedValues: string[];
  onChange: (selected: string[]) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  onSelectAllSubscribed?: () => void;
}

const CustomMultiSelect: React.FC<CustomMultiSelectProps> = ({
  options,
  selectedValues,
  onChange,
  className = "",
  placeholder = "Select Targets...",
  disabled = false,
  onSelectAllSubscribed
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes(searchFilter.toLowerCase()) ||
    (opt.sublabel && opt.sublabel.toLowerCase().includes(searchFilter.toLowerCase()))
  );

  const toggleOption = (val: string) => {
    if (selectedValues.includes(val)) {
      onChange(selectedValues.filter(v => v !== val));
    } else {
      onChange([...selectedValues, val]);
    }
  };

  const handleSelectAll = () => {
    const allValues = options.map(o => o.value);
    if (selectedValues.length === options.length) {
      onChange([]);
    } else {
      onChange(allValues);
    }
  };

  const isAllSelected = options.length > 0 && selectedValues.length === options.length;

  // Display label
  const getDisplayLabel = () => {
    if (selectedValues.length === 0) return placeholder;
    if (isAllSelected) return `All Users Selected (${options.length})`;
    if (selectedValues.length === 1) {
      const found = options.find(o => o.value === selectedValues[0]);
      return found ? found.label : '1 Target Selected';
    }
    return `${selectedValues.length} Targets Selected`;
  };

  return (
    <div ref={dropdownRef} className={`relative w-full ${className}`}>
      {/* Target trigger box matching CustomSelect */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full px-5 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none text-xs font-bold transition-all text-gray-700 flex justify-between items-center select-none ${
          disabled ? 'opacity-60 cursor-not-allowed bg-gray-50' : 'cursor-pointer hover:border-gray-200'
        }`}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <span className={`text-xs font-bold truncate ${selectedValues.length > 0 ? 'text-primary font-extrabold' : 'text-gray-400'}`}>
            {getDisplayLabel()}
          </span>
          {selectedValues.length > 0 && (
            <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-[9px] font-black uppercase tracking-wider flex-shrink-0">
              {selectedValues.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {selectedValues.length > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange([]);
              }}
              className="p-1 hover:bg-gray-100 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Dropdown panel matching CustomSelect */}
      {isOpen && !disabled && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)}></div>
          <div 
            className="absolute left-0 right-0 mt-1.5 max-h-80 overflow-hidden bg-white border border-gray-100 rounded-2xl shadow-xl z-40 p-2 flex flex-col gap-2 animate-fade-in text-left"
            onClick={e => e.stopPropagation()}
          >
            {/* Quick Action Bar & Search Filter */}
            <div className="p-2 bg-gray-50/80 rounded-xl space-y-2 border border-gray-100/50">
              <input
                type="text"
                placeholder="Search targets..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-primary outline-none"
              />

              <div className="flex items-center justify-between text-[10px] font-bold text-gray-500 pt-1">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="hover:text-primary transition-colors flex items-center gap-1 font-black uppercase tracking-wider cursor-pointer"
                >
                  {isAllSelected ? <CheckSquare className="w-3 h-3 text-primary" /> : <Square className="w-3 h-3 text-gray-400" />}
                  <span>{isAllSelected ? 'Deselect All' : 'Select All Users'}</span>
                </button>

                {onSelectAllSubscribed && (
                  <button
                    type="button"
                    onClick={onSelectAllSubscribed}
                    className="text-blue-600 hover:text-blue-700 transition-colors font-black uppercase tracking-wider cursor-pointer"
                  >
                    Select Subscribed
                  </button>
                )}
              </div>
            </div>

            {/* Options list */}
            <div className="overflow-y-auto max-h-56 pr-1 space-y-1">
              {filteredOptions.length > 0 ? (
                filteredOptions.map(opt => {
                  const isSelected = selectedValues.includes(opt.value);
                  return (
                    <div
                      key={opt.value}
                      onClick={() => toggleOption(opt.value)}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer text-xs transition-all ${
                        isSelected
                          ? 'bg-primary/5 text-primary font-black border border-primary/10'
                          : 'text-gray-700 hover:bg-gray-50 font-semibold'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <div className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                          isSelected ? 'bg-primary border-primary text-white' : 'border-gray-300 bg-white'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <div className="truncate">
                          <p className="truncate text-xs font-bold leading-tight">{opt.label}</p>
                          {opt.sublabel && (
                            <p className="text-[9px] text-gray-400 font-medium truncate">{opt.sublabel}</p>
                          )}
                        </div>
                      </div>

                      {opt.badge && (
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider flex-shrink-0 ${
                          opt.isSubscribed
                            ? 'bg-green-50 text-green-600 border border-green-100'
                            : 'bg-gray-100 text-gray-400 border border-gray-150'
                        }`}>
                          {opt.badge}
                        </span>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="py-4 text-center text-xs font-bold text-gray-400">
                  No matching targets found
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CustomMultiSelect;
