'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { StepListItem } from '@/components/workflow/StepListItem';
import { Workflow, WorkflowRun, Workspace, WorkflowNode } from '@/types/workflow';
import { getRun } from '@/app/actions';
import { useDataStore } from '@/store/dataStore';
import clsx from 'clsx';
import { Loader2, Notebook, ArrowDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface RunViewContentProps {
  workflow: Workflow;
  run: WorkflowRun;
  workspace: Workspace;
}

function RunViewContent({ workflow, run: initialRun, workspace }: RunViewContentProps) {
  const { runs, updateRun, createRun, deleteRun, cancelRun } = useDataStore();
  const router = useRouter();

  // Hydrate store on mount
  useEffect(() => {
     const currentRuns = useDataStore.getState().runs;
     if (!currentRuns.some(r => r.id === initialRun.id)) {
         createRun(initialRun);
     }
  }, [initialRun, createRun]);

  const run = runs.find(r => r.id === initialRun.id) || initialRun;
  
  // Create nodes/steps list with status from run
  const nodes = workflow.nodes.map(node => {
      const stepState = run.steps[node.id];
      return {
          ...node,
          data: {
              ...node.data,
              executionStatus: stepState?.status || 'idle'
          }
      };
  });

  // Polling Loop
  useEffect(() => {
    if (run.status !== 'running' && run.status !== 'paused') return;

    const interval = setInterval(async () => {
         try {
             const fresh = await getRun(run.id);
             if (fresh) {
                 updateRun(run.id, {
                     status: fresh.status,
                     steps: fresh.steps,
                     variables: fresh.variables,
                     userLogs: fresh.userLogs,
                     endTime: fresh.endTime,
                     description: fresh.description
                 });
             }
         } catch (e) {
             console.error('Polling failed', e);
         }
    }, 1000);

    return () => clearInterval(interval);
  }, [run.id, run.status, updateRun]);

  // Logs / Sidebar
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const activeStep = selectedStepId ? run.steps[selectedStepId] : null;

  // Handle Resume
  const [resumeVal, setResumeVal] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const pausedStepId = Object.keys(run.steps).find(k => run.steps[k].status === 'paused');
  const pausedNode = pausedStepId ? workflow.nodes.find(n => n.id === pausedStepId) : null;
  
  const handleResume = (confirm: boolean = true) => {
      if (!pausedStepId) return;
      
      const val = pausedNode?.data.actionId === 'confirm' ? confirm : resumeVal;
      const outputs = { value: val, confirmed: val }; 
      
      const newLogs = [`User provided input: ${val}`];

      const updatedSteps = {
          ...run.steps,
          [pausedStepId]: {
              ...run.steps[pausedStepId],
              status: 'success' as const,
              outputs,
              logs: [...(run.steps[pausedStepId].logs || []), ...newLogs],
              endTime: Date.now()
          }
      };

      updateRun(run.id, { status: 'running', steps: updatedSteps });
      setResumeVal('');
  };
  
  const isForEach = pausedNode && (pausedNode.data.actionId === 'foreach-list' || pausedNode.data.actionId === 'foreach-folder');

  const pauseOverlay = pausedNode && run.status === 'paused' ? (
       <div className="sticky top-4 mx-4 mb-4 bg-white p-4 rounded-lg shadow-xl border-2 border-yellow-400 z-20">
           <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-2">
               <Loader2 className="animate-spin text-yellow-500" /> 
               {isForEach ? 'Waiting for children' : 'Action Required'}
           </h3>
           
           {isForEach ? (
                <div className="max-h-60 overflow-y-auto">
                     <p className="text-sm text-slate-600 mb-2">Waiting for child workflows to complete...</p>
                     <div className="space-y-1">
                         {(() => {
                              const outputs = run.steps[pausedNode!.id]?.outputs as { childRunIds?: string[], childStatuses?: Record<string, string> } | undefined;
                              return outputs?.childRunIds?.map((cid: string) => {
                                 const status = outputs.childStatuses?.[cid] || 'unknown';
                                 return (
                                     <div key={cid} className="flex items-center justify-between text-xs p-2 bg-slate-50 rounded border border-slate-100">
                                         <span className="font-mono text-slate-500">{cid}</span>
                                         <span className={clsx("font-medium uppercase", {
                                             'text-blue-600': status === 'running',
                                             'text-green-600': status === 'completed' || status === 'success',
                                             'text-red-600': status === 'failed',
                                             'text-slate-500': status === 'unknown'
                                         })}>{status}</span>
                                     </div>
                                 );
                             });
                         })()}
                     </div>
                </div>
           ) : (
               <>
                   <div className="text-sm text-slate-600 mb-4">
                       {pausedNode.data.label} requires input.
                   </div>
                   
                   {pausedNode.data.actionId === 'confirm' ? (
                       <div className="flex gap-2">
                           <button onClick={() => handleResume(true)} className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700">Confirm</button>
                           <button onClick={() => handleResume(false)} className="flex-1 bg-slate-200 text-slate-800 py-2 rounded hover:bg-slate-300">Cancel</button>
                       </div>
                   ) : (
                       <div>
                           <input 
                             type="text" 
                             className="w-full border p-2 rounded mb-2" 
                             autoFocus
                             placeholder="Type here..."
                             value={resumeVal}
                             onChange={e => setResumeVal(e.target.value)}
                           />
                           <button onClick={() => handleResume(true)} className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">Submit</button>
                       </div>
                   )}
               </>
           )}
       </div>
  ) : null;

  return (
    <div className="flex h-full">
       <div className="flex-1 relative bg-slate-50 border-r border-slate-200 overflow-y-auto">
          {/* Pause Overlay (Sticky) */}
          {pauseOverlay}

          {/* Steps List */}
          <div className="p-8 pb-32 max-w-2xl mx-auto space-y-4">
               {nodes.map((node, index) => (
                    <div key={node.id} className="relative">
                        <StepListItem 
                             node={node} 
                             index={index} 
                             selected={selectedStepId === node.id}
                             onSelect={() => setSelectedStepId(node.id)}
                             readOnly={true}
                        />
                        {index < nodes.length - 1 && (
                            <div className="flex justify-center py-2 text-slate-300">
                                <ArrowDown size={20} />
                            </div>
                        )}
                    </div>
               ))}
          </div>
       </div>

        {/* Right Panel: Logs and Info */}
        <div className="w-[600px] bg-white flex flex-col border-l border-slate-200 z-10 shadow-lg">
            <div className="p-4 border-b bg-slate-50">
                <h3 className="font-semibold text-slate-800">Runner Info</h3>
                <div className="flex items-center gap-2 mt-2">
                    <span className={clsx("px-2 py-1 rounded text-xs font-medium uppercase", {
                        'bg-blue-100 text-blue-700': run.status === 'running',
                        'bg-green-100 text-green-700': run.status === 'completed',
                        'bg-red-100 text-red-700': run.status === 'failed',
                        'bg-yellow-100 text-yellow-700': run.status === 'paused',
                    })}>
                        {run.status}
                    </span>
                    <span className="text-slate-400 text-sm">|</span>
                    <span className="text-slate-500 text-sm">Step: {run.currentStepId ? workflow.nodes.find(n => n.id === run.currentStepId)?.data.label : 'None'}</span>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                 {/* Description */}
                {(run.description || workflow.description) && (
                    <div className="p-4 bg-slate-50 rounded-md border border-slate-200">
                        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-1">
                            {run.description ? 'Run Status' : 'Description'}
                        </h3>
                        <div className="prose prose-sm max-w-none text-slate-700">
                            <ReactMarkdown>{run.description || workflow.description || ''}</ReactMarkdown>
                        </div>
                    </div>
                )}

                {/* User Logs */}
                {run.userLogs && run.userLogs.length > 0 && (
                    <div className="space-y-3">
                        <h3 className="font-semibold text-slate-700 flex items-center gap-2 text-sm border-b pb-2">
                            <Notebook size={16} className="text-blue-600" /> Run Notebook
                        </h3>
                        {run.userLogs.map((log, idx) => (
                            <div key={idx} className="bg-white p-3 rounded border border-slate-200 shadow-sm text-sm">
                                <div className="text-xs text-slate-400 mb-1 flex justify-between">
                                    <span>Log #{idx + 1}</span>
                                    <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                                </div>
                                <div className="prose prose-sm max-w-none text-slate-700">
                                    <ReactMarkdown>{log.content}</ReactMarkdown>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Technical Logs */}
                <div className="space-y-2 pt-4 border-t border-slate-100">
                     <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-sm text-slate-500 uppercase">Technical Logs</h4>
                          <div className="flex gap-2">
                              {(run.status === 'running' || run.status === 'paused') && (
                                  <button onClick={() => cancelRun(run.id)} className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded hover:bg-red-100 border border-red-200">Cancel</button>
                              )}
                              {(run.status === 'completed' || run.status === 'failed' || run.status === 'cancelled') && (
                                  <button onClick={() => updateRun(run.id, { status: 'running', startTime: Date.now(), steps: {} })} className="text-xs bg-slate-100 px-2 py-1 rounded hover:bg-slate-200 border border-slate-200">Restart</button>
                              )}
                              <button onClick={() => setShowDeleteModal(true)} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded hover:bg-slate-200 border border-slate-200">Delete</button>
                          </div>
                     </div>
                    
                    {activeStep ? (
                        <div className="space-y-2">
                            <h4 className="font-medium text-sm border-b pb-1">Logs: {workflow.nodes.find(n => n.id === activeStep.stepId)?.data.label}</h4>
                            <div className="font-mono text-xs text-slate-600 space-y-1">
                                {activeStep.logs.map((l, i) => <div key={i}>{l}</div>)}
                            </div>
                            {activeStep.status === 'running' && <Loader2 className="animate-spin h-4 w-4 text-blue-500 mt-2" />}
                        </div>
                    ) : (
                        <div className="text-sm text-slate-400 italic">Select a step in the list to view technical debug logs.</div>
                    )}
                </div>
            </div>
        </div>
          {/* Delete Modal */}
          {showDeleteModal && (
              <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center">
                  <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full mx-4">
                      <h3 className="font-bold text-lg mb-2 text-slate-800">Delete Run?</h3>
                      <p className="text-slate-600 mb-6">Are you sure you want to delete this run? This action cannot be undone.</p>
                      <div className="flex justify-end gap-3">
                          <button 
                            onClick={() => setShowDeleteModal(false)}
                            className="px-4 py-2 rounded text-slate-600 hover:bg-slate-100"
                          >
                              Cancel
                          </button>
                          <button 
                            onClick={() => { deleteRun(run.id); router.push(`/workspaces/${workspace.id}`); }}
                            className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
                          >
                              Delete
                          </button>
                      </div>
                  </div>
              </div>
          )}
    </div>
  );
}

export function WorkflowRunView(props: RunViewContentProps) {
    return <RunViewContent {...props} />;
}
