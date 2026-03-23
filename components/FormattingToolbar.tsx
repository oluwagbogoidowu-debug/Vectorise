
import React from 'react';
import { Bold, Italic, List as ListIcon, ListOrdered } from 'lucide-react';

interface FormattingToolbarProps {
    onFormat: (prefix: string, suffix: string) => void;
}

const FormattingToolbar: React.FC<FormattingToolbarProps> = ({ onFormat }) => {
    return (
        <div className="flex items-center gap-1 p-1 bg-gray-50 rounded-lg border border-gray-100 mb-2">
            <button
                type="button"
                onClick={() => onFormat('**', '**')}
                className="p-1.5 hover:bg-white hover:shadow-sm rounded-md text-gray-500 transition-all"
                title="Bold"
            >
                <Bold className="w-3.5 h-3.5" />
            </button>
            <button
                type="button"
                onClick={() => onFormat('_', '_')}
                className="p-1.5 hover:bg-white hover:shadow-sm rounded-md text-gray-500 transition-all"
                title="Italic"
            >
                <Italic className="w-3.5 h-3.5" />
            </button>
            <div className="w-px h-4 bg-gray-200 mx-1"></div>
            <button
                type="button"
                onClick={() => onFormat('\n- ', '')}
                className="p-1.5 hover:bg-white hover:shadow-sm rounded-md text-gray-500 transition-all"
                title="Bullet List"
            >
                <ListIcon className="w-3.5 h-3.5" />
            </button>
            <button
                type="button"
                onClick={() => onFormat('\n1. ', '')}
                className="p-1.5 hover:bg-white hover:shadow-sm rounded-md text-gray-500 transition-all"
                title="Numbered List"
            >
                <ListOrdered className="w-3.5 h-3.5" />
            </button>
        </div>
    );
};

export default FormattingToolbar;
