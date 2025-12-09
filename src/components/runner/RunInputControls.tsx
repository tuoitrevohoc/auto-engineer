import { useState } from 'react';
import { WorkflowNode } from '@/types/workflow';

interface RunInputControlsProps {
    node: WorkflowNode;
    onSubmit: (value: any) => void;
    className?: string;
}

export function RunInputControls({ node, onSubmit, className = 'mt-2' }: RunInputControlsProps) {
    const [inputValue, setInputValue] = useState('');
    
    const isConfirm = node.data.actionId === 'confirm';

    if (isConfirm) {
        return (
             <div className={`flex gap-2 ${className}`}>
                 <button onClick={() => onSubmit(true)} className="px-4 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium shadow-sm transition-colors">
                     Confirm
                 </button>
                 <button onClick={() => onSubmit(false)} className="px-4 py-1.5 bg-white border border-slate-300 text-slate-700 rounded hover:bg-slate-50 text-sm font-medium shadow-sm transition-colors">
                     Cancel
                 </button>
             </div>
        );
    }
    
    // Default to Text Input
    return (
      <div className={`flex gap-2 max-w-md ${className}`}>
          <input 
            type="text" 
            className="flex-1 border border-slate-300 p-1.5 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-sm" 
            autoFocus
            placeholder={String(node.data.inputMappings?.prompt?.value || "Enter value...")}
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={e => {
                if (e.key === 'Enter') onSubmit(inputValue);
            }}
          />
          <button onClick={() => onSubmit(inputValue)} className="bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 text-sm font-medium shadow-sm transition-colors">
              Submit
          </button>
      </div>
    );
}
