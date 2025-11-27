
import React from 'react';

interface ProgressBarProps {
  value: number; // 0 to 100
  label?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ value, label }) => {
  const clampedValue = Math.min(Math.max(value, 0), 100);

  return (
    <div>
      {label && <p className="text-sm font-medium text-gray-700 mb-1">{label} ({clampedValue.toFixed(0)}%)</p>}
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div
          className="bg-secondary h-2.5 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${clampedValue}%` }}
        ></div>
      </div>
    </div>
  );
};

export default ProgressBar;
