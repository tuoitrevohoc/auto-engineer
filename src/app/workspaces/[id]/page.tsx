'use client';

import { useDataStore } from '@/store/dataStore';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Play, Clock, CheckCircle, XCircle, PauseCircle } from 'lucide-react';
import { WorkflowRun } from '@/types/workflow';
import { v4 as uuidv4 } from 'uuid';

export default function WorkspaceDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { workspaces, runs, workflows, createRun } = useDataStore();
  
  const workspace = workspaces.find((w) => w.id === id);
  const workspaceRuns = runs.filter((r) => r.workspaceId === id).sort((a,b) => b.startTime - a.startTime);
  
  const [selectedWorkflowId, setSelectedWorkflowId] = useState('');

  if (!workspace) return <div className="p-8">Workspace not found</div>;

  const handleStartRun = () => {
    if (!selectedWorkflowId) return;
    
    const newRun: WorkflowRun = {
        id: uuidv4(),
        workflowId: selectedWorkflowId,
        workspaceId: id,
        status: 'running',
        startTime: Date.now(),
        steps: {},
        variables: {},
    };
    
    createRun(newRun);
    router.push(`/workspaces/${id}/runs/${newRun.id}`);
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">{workspace.name}</h1>
        <div className="font-mono text-slate-500 bg-slate-100 px-3 py-1 rounded inline-block mt-2">
            {workspace.workingDirectory}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Run History */}
        <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-semibold text-slate-700">Run History</h2>
            
            <div className="space-y-3">
                {workspaceRuns.map(run => {
                    const wf = workflows.find(w => w.id === run.workflowId);
                    return (
                        <div 
                            key={run.id}
                            onClick={() => router.push(`/workspaces/${id}/runs/${run.id}`)}
                            className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 hover:border-blue-300 cursor-pointer flex items-center justify-between"
                        >
                            <div className="flex items-center gap-4">
                                <StatusBadge status={run.status} />
                                <div>
                                    <div className="font-medium text-slate-800">{run.description || wf?.name || 'Unknown Workflow'}</div>
                                    <div className="text-sm text-slate-500">{new Date(run.startTime).toLocaleString()}</div>
                                </div>
                            </div>
                            <div className="text-sm text-slate-400">
                                {run.endTime ? `${((run.endTime - run.startTime)/1000).toFixed(1)}s` : 'In Progress'}
                            </div>
                        </div>
                    );
                })}
                {workspaceRuns.length === 0 && (
                    <div className="text-slate-500 italic">No runs yet.</div>
                )}
            </div>
        </div>

        {/* Right: Start New Run */}
        <div className="bg-white p-6 rounded-lg shadow border border-slate-200 h-fit">
            <h2 className="text-lg font-semibold text-slate-700 mb-4">Run Workflow</h2>
            
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Select Workflow</label>
                    <select
                        value={selectedWorkflowId}
                        onChange={(e) => setSelectedWorkflowId(e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded"
                    >
                        <option value="">-- Choose --</option>
                        {workflows.map(wf => (
                            <option key={wf.id} value={wf.id}>{wf.name}</option>
                        ))}
                    </select>
                    {selectedWorkflowId && (
                        <div className="mt-2 text-sm text-slate-500 bg-slate-50 p-2 rounded border border-slate-100 italic">
                            {workflows.find(w => w.id === selectedWorkflowId)?.description || 'No description provided.'}
                        </div>
                    )}
                </div>
                
                <button
                    disabled={!selectedWorkflowId}
                    onClick={handleStartRun}
                    className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-2 rounded font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Play size={18} /> Start Run
                </button>
            </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
    if (status === 'running') return <span className="flex items-center gap-1 text-blue-600 text-sm font-medium"><Play size={14} className="animate-pulse"/> Running</span>;
    if (status === 'completed') return <span className="flex items-center gap-1 text-green-600 text-sm font-medium"><CheckCircle size={14}/> Completed</span>;
    if (status === 'failed') return <span className="flex items-center gap-1 text-red-600 text-sm font-medium"><XCircle size={14}/> Failed</span>;
    if (status === 'paused') return <span className="flex items-center gap-1 text-yellow-600 text-sm font-medium"><PauseCircle size={14}/> Paused</span>;
    return <span className="text-slate-400 text-sm">{status}</span>;
}
