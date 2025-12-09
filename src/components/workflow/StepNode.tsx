import { ActionDefinition, WorkflowNode } from '@/types/workflow';
import { getActionDefinition } from '@/lib/action-registry';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Play, CheckCircle, XCircle, PauseCircle, Clock } from 'lucide-react';
import clsx from 'clsx';
import { useMemo } from 'react';

// Status icons map
const StatusIcon = ({ status }: { status?: string }) => {
  switch (status) {
    case 'running': return <Play size={16} className="text-blue-500 animate-pulse" />;
    case 'success': return <CheckCircle size={16} className="text-green-500" />;
    case 'failed': return <XCircle size={16} className="text-red-500" />;
    case 'paused': return <PauseCircle size={16} className="text-yellow-500" />;
    default: return <Clock size={16} className="text-slate-400" />;
  }
};

export function StepNode({ data, selected }: NodeProps<WorkflowNode>) {
  // data is WorkflowStepData
  const actionDef = getActionDefinition(data.actionId);

  return (
    <div className={clsx(
      "min-w-[180px] bg-white rounded-lg shadow-md border-2 transition-colors",
      selected ? "border-blue-500" : "border-slate-200",
      data.executionStatus === 'running' && "ring-2 ring-blue-300"
    )}>
      <div className="bg-slate-50 p-2 rounded-t-lg border-b border-slate-100 flex items-center justify-between">
         <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {actionDef?.name || 'Unknown Action'}
         </span>
         <StatusIcon status={data.executionStatus} />
      </div>
      
      <div className="p-3">
        <div className="font-medium text-slate-800 text-sm mb-2">
          {data.label}
        </div>

        {actionDef?.parameters && actionDef.parameters.length > 0 && (
             <div className="space-y-1 pt-2 border-t border-slate-100">
                {actionDef.parameters.map(param => {
                    const mapping = data.inputMappings?.[param.name];
                    if (!mapping) return null;
                    const val = mapping.type === 'variable' ? `{{${mapping.value}}}` : String(mapping.value);
                    if (!val) return null;

                    return (
                        <div key={param.name} className="text-[10px] text-slate-500 flex items-center justify-between gap-2">
                             <span className="opacity-75">{param.label || param.name}</span>
                             <span className="font-mono text-slate-700 truncate max-w-[120px]" title={val}>{val}</span>
                        </div>
                    );
                })}
             </div>
        )}
      </div>

      {/* Handles */}
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-slate-400" />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-slate-400" />
    </div>
  );
}
