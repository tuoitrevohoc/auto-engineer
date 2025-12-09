'use client';

import { useDataStore } from '@/store/dataStore';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Play, Clock, CheckCircle, XCircle, PauseCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { WorkflowRun } from '@/types/workflow';
import { v4 as uuidv4 } from 'uuid';
import ReactMarkdown from 'react-markdown';

export default function WorkspaceDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { workspaces, runs, workflows, createRun } = useDataStore();
  
  const workspace = workspaces.find((w) => w.id === id);

  // Filtering & Pagination
  const [showCompleted, setShowCompleted] = useState(false);
  const [filterWorkflowId, setFilterWorkflowId] = useState('all');
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const workspaceRuns = runs
    .filter((r) => r.workspaceId === id)
    .filter((r) => showCompleted || r.status !== 'completed')
    .filter((r) => filterWorkflowId === 'all' || r.workflowId === filterWorkflowId)
    .sort((a,b) => b.startTime - a.startTime);

  const totalPages = Math.ceil(workspaceRuns.length / ITEMS_PER_PAGE);
  const paginatedRuns = workspaceRuns.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  // Reset page logic
  useEffect(() => { setPage(1); }, [showCompleted, filterWorkflowId]);
  
  const [selectedWorkflowId, setSelectedWorkflowId] = useState('');
  const [inputValues, setInputValues] = useState<Record<string, any>>({});

  const selectedWorkflow = workflows.find(w => w.id === selectedWorkflowId);

  useEffect(() => {
      if (selectedWorkflow?.inputs) {
          const defaults: Record<string, any> = {};
          selectedWorkflow.inputs.forEach(inp => {
              defaults[inp.name] = inp.defaultValue || '';
          });
          setInputValues(defaults);
      } else {
          setInputValues({});
      }
  }, [selectedWorkflowId, workflows]);

  if (!workspace) return <div className="p-8">Workspace not found</div>;

  const executeRun = () => {
    if (!selectedWorkflowId) return;

    const newRun: WorkflowRun = {
        id: uuidv4(),
        workflowId: selectedWorkflowId,
        workspaceId: id,
        status: 'running',
        startTime: Date.now(),
        steps: {},
        variables: {},
        inputValues: inputValues,
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
            
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 bg-white p-3 rounded-lg border border-slate-200 shadow-sm text-sm">
                <div className="flex-1">
                    <select 
                        value={filterWorkflowId} 
                        onChange={(e) => setFilterWorkflowId(e.target.value)}
                        className="w-full text-sm p-1.5 border border-slate-300 rounded"
                    >
                        <option value="all">All Workflows</option>
                        {workflows.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                </div>
                <div className="flex items-center gap-2">
                     <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                            type="checkbox" 
                            checked={showCompleted} 
                            onChange={e => setShowCompleted(e.target.checked)}
                            className="rounded border-slate-300"
                        />
                        <span className="text-slate-600">Show Completed</span>
                    </label>
                </div>
            </div>

            <div className="space-y-3">
                {paginatedRuns.map(run => (
                    <RunListItem 
                        key={run.id} 
                        run={run} 
                        workflow={workflows.find(w => w.id === run.workflowId)}
                        onClick={() => router.push(`/workspaces/${id}/runs/${run.id}`)}
                    />
                ))}
                {workspaceRuns.length === 0 && (
                    <div className="text-slate-500 italic">No runs yet.</div>
                )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 mt-4">
                    <button 
                        disabled={page <= 1}
                        onClick={() => setPage(p => p - 1)}
                        className="px-3 py-1 bg-white border border-slate-200 rounded text-sm disabled:opacity-50 hover:bg-slate-50"
                    >
                        Previous
                    </button>
                    <span className="text-xs text-slate-500 font-medium">Page {page} of {totalPages}</span>
                     <button 
                        disabled={page >= totalPages}
                        onClick={() => setPage(p => p + 1)}
                        className="px-3 py-1 bg-white border border-slate-200 rounded text-sm disabled:opacity-50 hover:bg-slate-50"
                    >
                        Next
                    </button>
                </div>
            )}
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
                        <div>
                            <div className="mt-2 text-sm text-slate-500 bg-slate-50 p-2 rounded border border-slate-100 italic">
                                {workflows.find(w => w.id === selectedWorkflowId)?.description || 'No description provided.'}
                            </div>
                            
                            {/* Inline Inputs */}
                            {selectedWorkflow?.inputs && selectedWorkflow.inputs.length > 0 && (
                                <div className="mt-4 space-y-3 pt-3 border-t border-slate-100">
                                    <h3 className="text-sm font-semibold text-slate-700">Inputs</h3>
                                    {selectedWorkflow.inputs.map(input => (
                                        <div key={input.name} className="space-y-1">
                                           <label className="text-xs font-medium text-slate-600 uppercase">{input.label || input.name}</label>
                                           {input.type === 'boolean' ? (
                                                <select 
                                                  className="w-full p-2 border border-slate-300 rounded text-sm"
                                                  value={String(inputValues[input.name])}
                                                  onChange={(e) => setInputValues({...inputValues, [input.name]: e.target.value === 'true'})}
                                                >
                                                    <option value="true">True</option>
                                                    <option value="false">False</option>
                                                </select>
                                            ) : (
                                                <input 
                                                  type={input.type === 'number' ? 'number' : 'text'}
                                                  className="w-full p-2 border border-slate-300 rounded text-sm"
                                                  value={inputValues[input.name] || ''}
                                                  placeholder={input.defaultValue ? `Default: ${input.defaultValue}` : ''}
                                                  onChange={(e) => setInputValues({...inputValues, [input.name]: input.type === 'number' ? Number(e.target.value) : e.target.value})}
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
                
                <button
                    disabled={!selectedWorkflowId}
                    onClick={executeRun}
                    className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-2 rounded font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Play size={18} /> Start Run ({selectedWorkflow?.inputs?.length || 0} inputs)
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

function RunListItem({ run, workflow, onClick }: { run: WorkflowRun, workflow?: { name: string }, onClick: () => void }) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
             <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors" onClick={onClick}>
                 <div className="flex items-center gap-4">
                     <button 
                        onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
                        className="p-1 hover:bg-slate-200 rounded text-slate-500"
                     >
                         {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                     </button>
                     <StatusBadge status={run.status} />
                     <div>
                         <div className="font-semibold text-slate-800">{workflow?.name || 'Unknown Workflow'}</div>
                         {run.description && <div className="text-sm text-slate-600 mt-0.5">{run.description}</div>}
                         <div className="text-xs text-slate-400 mt-1">{new Date(run.startTime).toLocaleString()}</div>
                     </div>
                 </div>
                 <div className="text-sm text-slate-400">
                     {run.endTime ? `${((run.endTime - run.startTime)/1000).toFixed(1)}s` : 'In Progress'}
                 </div>
             </div>
             {expanded && (
                 <div className="border-t border-slate-100 p-4 bg-slate-50 rounded-b-lg space-y-3">
                     {run.userLogs && run.userLogs.length > 0 ? (
                         run.userLogs.map((log, idx) => (
                             <div key={idx} className="bg-white p-3 rounded border border-slate-200 shadow-sm text-sm">
                                 <div className="text-xs text-slate-400 mb-1">{new Date(log.timestamp).toLocaleTimeString()}</div>
                                 <div className="prose prose-sm max-w-none text-slate-700">
                                     <ReactMarkdown>{log.content}</ReactMarkdown>
                                 </div>
                             </div>
                         ))
                     ) : (
                         <div className="text-sm text-slate-400 italic pl-8">No logs available for this run.</div>
                     )}
                 </div>
             )}
        </div>
    );
}
