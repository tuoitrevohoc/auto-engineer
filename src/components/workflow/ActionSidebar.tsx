import { ACTION_REGISTRY } from '@/lib/action-registry';
import { DragEvent } from 'react';

export function ActionSidebar() {
  const onDragStart = (event: DragEvent, actionId: string) => {
    event.dataTransfer.setData('application/reactflow', actionId);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-full">
      <div className="p-4 border-b border-slate-200 font-semibold text-slate-700">
        Actions
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {ACTION_REGISTRY.map((action) => (
          <div
            key={action.id}
            onDragStart={(event) => onDragStart(event, action.id)}
            draggable
            className="p-3 bg-slate-50 border border-slate-200 rounded-md cursor-grab hover:shadow-md hover:border-blue-300 transition-all active:cursor-grabbing"
          >
            <div className="font-medium text-sm text-slate-800">{action.name}</div>
            <div className="text-xs text-slate-500 mt-1">{action.description}</div>
          </div>
        ))}
      </div>
    </aside>
  );
}
