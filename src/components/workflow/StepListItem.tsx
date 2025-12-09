import { ActionDefinition, WorkflowNode } from '@/types/workflow';
import { getActionDefinition } from '@/lib/action-registry';
import { Play, CheckCircle, XCircle, PauseCircle, Clock, GripVertical, Trash } from 'lucide-react';
import clsx from 'clsx';

interface StepListItemProps {
  node: WorkflowNode;
  index: number;
  selected: boolean;
  onSelect: () => void;
  onDelete?: () => void;
  readOnly?: boolean;
}

const StatusIcon = ({ status }: { status?: string }) => {
  switch (status) {
    case 'running': return <Play size={16} className="text-blue-500 animate-pulse" />;
    case 'success': return <CheckCircle size={16} className="text-green-500" />;
    case 'failed': return <XCircle size={16} className="text-red-500" />;
    case 'paused': return <PauseCircle size={16} className="text-yellow-500" />;
    default: return <Clock size={16} className="text-slate-400" />;
  }
};

export function StepListItem({ node, index, selected, onSelect, onDelete, readOnly }: StepListItemProps) {
  const actionDef = getActionDefinition(node.data.actionId);
  const data = node.data;

  return (
    <div 
        className={clsx(
            "group relative flex items-start gap-2 p-3 bg-white rounded-lg border-2 transition-all cursor-pointer hover:shadow-md",
            selected ? "border-blue-500 ring-1 ring-blue-500 z-10" : "border-slate-200 hover:border-blue-300",
            data.executionStatus === 'running' && "ring-2 ring-blue-300 border-blue-400"
        )}
        onClick={(e) => {
            e.stopPropagation();
            onSelect();
        }}
    >
      {/* Drag Handle */}
      {!readOnly && (
        <div className="mt-1 text-slate-300 group-hover:text-slate-500 cursor-grab active:cursor-grabbing">
            <GripVertical size={20} />
        </div>
      )}

      {/* Index Badge */}
      <div className="mt-0.5 flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
          {index + 1}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {actionDef?.name || 'Unknown Action'}
              </span>
              <div className="flex items-center gap-2">
                  <StatusIcon status={data.executionStatus} />
                  {!readOnly && onDelete && (
                      <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete();
                        }}
                        className="p-1 text-slate-300 hover:text-red-500 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete Step"
                      >
                          <Trash size={14} />
                      </button>
                  )}
              </div>
          </div>
          
          <div className="font-medium text-slate-800 text-sm truncate">
              {data.label}
          </div>

          {/* Parameters Preview */}
          {actionDef?.parameters && actionDef.parameters.length > 0 && (
             <div className="mt-2 space-y-0.5">
                {actionDef.parameters.map(param => {
                    const mapping = data.inputMappings?.[param.name];
                    if (!mapping) return null;
                    const val = mapping.type === 'variable' ? `{{${mapping.value}}}` : String(mapping.value);
                    if (!val) return null;

                    return (
                        <div key={param.name} className="text-[10px] text-slate-500 flex items-center justify-between gap-4">
                             <span className="opacity-75">{param.label || param.name}</span>
                             <span className="font-mono text-slate-700 truncate max-w-[200px]" title={val}>{val}</span>
                        </div>
                    );
                })}
             </div>
          )}
      </div>
    </div>
  );
}
