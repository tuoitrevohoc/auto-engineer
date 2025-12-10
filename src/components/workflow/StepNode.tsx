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
        <div className="font-medium text-slate-800 text-sm">
          {data.label}
        </div>
      </div>

      {/* Handles */}
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-slate-400" />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-slate-400" />
    </div>
  );
}
