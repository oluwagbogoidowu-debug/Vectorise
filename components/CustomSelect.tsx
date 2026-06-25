import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface Option {
  value: string | number;
  label: string;
}

interface CustomSelectProps {
  options: (Option | string | number)[];
  value: string | number;
  onChange: (value: any) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

const CustomSelect: React.FC<CustomSelectProps> = ({
  options,
  value,
  onChange,
  className = "",
  placeholder = "Select...",
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
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

  const normalizedOptions: Option[] = options.map(opt => {
    if (typeof opt === 'object' && opt !== null) {
      return opt as Option;
    }
    return { value: opt, label: String(opt) };
  });

  const selectedOption = normalizedOptions.find(opt => String(opt.value) === String(value));

  return (
    <div ref={dropdownRef} className={`relative w-full ${className}`}>
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full px-5 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none text-xs font-bold transition-all text-gray-700 flex justify-between items-center select-none ${
          disabled ? 'opacity-60 cursor-not-allowed bg-gray-50' : 'cursor-pointer'
        }`}
      >
        <span className="text-gray-700 font-bold text-xs select-none">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </div>
      {isOpen && !disabled && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)}></div>
          <div className="absolute left-0 right-0 mt-1.5 max-h-60 overflow-y-auto bg-white border border-gray-100 rounded-xl shadow-xl z-40 p-1 flex flex-col gap-0.5 animate-fade-in" onClick={e => e.stopPropagation()}>
            {normalizedOptions.map(opt => {
              const isSelected = String(opt.value) === String(value);
              return (
                <div
                  key={opt.value}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer text-xs font-bold transition-all ${
                    isSelected
                      ? 'bg-[#0E7850]/5 text-[#0E7850]'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span>{opt.label}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#0E7850] flex-shrink-0" />}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default CustomSelect;
