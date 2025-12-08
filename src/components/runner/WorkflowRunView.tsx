'use client';

import { 
  ReactFlow, 
  Background, 
  Controls, 
  useNodesState, 
  useEdgesState, 
  ReactFlowProvider,
  useReactFlow 
} from '@xyflow/react';
import '@xyflow/react/dist/style.css'; 

import { useCallback, useEffect, useState } from 'react';
import { StepNode } from '@/components/workflow/StepNode';
import { Workflow, WorkflowRun, Workspace, StepExecutionState, WorkflowNode } from '@/types/workflow';
import { executeStep, getNextSteps, resolveInputs } from '@/lib/runner';
import { useDataStore } from '@/store/dataStore';
import clsx from 'clsx';
import { Check, Loader2, Play, Notebook } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const nodeTypes = {
  stepNode: StepNode,
};

interface RunViewContentProps {
  workflow: Workflow;
  run: WorkflowRun;
  workspace: Workspace;
}

function RunViewContent({ workflow, run, workspace }: RunViewContentProps) {
  const { updateRun } = useDataStore();
  const [nodes, setNodes, onNodesChange] = useNodesState<WorkflowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState(workflow.edges);
  const { fitView } = useReactFlow();

  // Sync nodes with run state
  useEffect(() => {
    const mergedNodes = workflow.nodes.map(node => {
        const stepState = run.steps[node.id];
        return {
            ...node,
            data: {
                ...node.data,
                executionStatus: stepState?.status || 'idle'
            },
            draggable: false, 
            selectable: true,
        };
    });
    setNodes(mergedNodes);
  }, [workflow, run.steps, setNodes]);

  // Initial fit
  useEffect(() => {
      setTimeout(() => fitView(), 100);
  }, [fitView]);

  // Execution Loop
  useEffect(() => {
    if (run.status !== 'running') return;

    const nextStepIds = getNextSteps(run, workflow);
    
    // Check completion
    const allDone = workflow.nodes.every(n => run.steps[n.id]?.status === 'success');
    if (allDone && nextStepIds.length === 0) { // no pending and all success
         updateRun(run.id, { status: 'completed', endTime: Date.now() });
         return;
    }

    if (nextStepIds.length === 0) {
        // Maybe waiting for running steps?
        // Or failed?
        const hasRunning = Object.values(run.steps).some(s => s.status === 'running');
        const hasFailed = Object.values(run.steps).some(s => s.status === 'failed');
        const hasPaused = Object.values(run.steps).some(s => s.status === 'paused'); // handled by run.status usually

        if (hasFailed && !hasRunning) {
             updateRun(run.id, { status: 'failed', endTime: Date.now() });
        }
        return;
    }

    // Launch steps
    nextStepIds.forEach(stepId => {
        const node = workflow.nodes.find(n => n.id === stepId)!;
        
        // Mark running synchronously
        const timestamp = Date.now();
        const initialInfo: StepExecutionState = {
            stepId,
            status: 'running',
            startTime: timestamp,
            inputValues: {},
            outputs: {},
            logs: [],
        };
        
        // We need to update run steps.
        // NOTE: This creates a race condition if multiple steps finish at once?
        // With zustand it should be fine if we use functional updates.
        // But here we are inside effect.
        // We really should dispatch "START_STEP".
        
        const inputs = resolveInputs(node, run, workspace);
        initialInfo.inputValues = inputs;

        const updatedSteps = { ...run.steps, [stepId]: initialInfo };
        updateRun(run.id, { steps: updatedSteps, currentStepId: stepId });

        // define async runner
        const process = async () => {
            const actionId = node.data.actionId;
            const result = await executeStep(actionId, inputs, { workspace, workflowId: workflow.id, runId: run.id });
            
            // Fetch latest run state to update? 
            // We use functional update in store to be safe.
            // But we can't access `run` inside async easily without ref or functional set.
            // We will just assume we merge the result into `steps`.
            
            // If paused, we update step status AND run status?
            if (result.status === 'paused') {
                 useDataStore.setState((state) => {
                    const currentRun = state.runs.find(r => r.id === run.id);
                    if (!currentRun) return {};
                    return {
                        runs: state.runs.map(r => r.id === run.id ? {
                            ...r,
                            status: 'paused',
                            steps: {
                                ...r.steps,
                                [stepId]: {
                                    ...r.steps[stepId],
                                    status: 'paused',
                                    logs: [...(r.steps[stepId]?.logs || []), ...result.logs]
                                }
                            }
                        } : r)
                    };
                 });
            } else {
                 useDataStore.setState((state) => {
                     return {
                         runs: state.runs.map(r => r.id === run.id ? {
                             ...r,
                             status: result.status === 'failed' ? 'failed' : r.status, // fail run if step fails
                             steps: {
                                 ...r.steps,
                                 [stepId]: {
                                    ...r.steps[stepId],
                                    status: result.status,
                                    outputs: (result.outputs || {}) as Record<string, unknown>,
                                    logs: [...(r.steps[stepId]?.logs || []), ...result.logs],
                                    endTime: Date.now(),
                                    error: result.error
                                 }
                             }
                         } : r)
                     };
                 });
            }
        };

        process();
    });

  }, [run.status, run.steps /* dep on steps to retry loop */, run.id, updateRun, workflow, workspace]);

  // Logs / Sidebar
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const activeStep = selectedStepId ? run.steps[selectedStepId] : null;

  // Handle Resume
  const [resumeVal, setResumeVal] = useState('');
  const pausedStepId = Object.keys(run.steps).find(k => run.steps[k].status === 'paused');
  const pausedNode = pausedStepId ? workflow.nodes.find(n => n.id === pausedStepId) : null;
  
  const handleResume = (confirm: boolean = true) => {
      if (!pausedStepId) return;
      
      const val = pausedNode?.data.actionId === 'confirm' ? confirm : resumeVal;
      const outputs = { value: val, confirmed: val }; // simplify for both actions
      
      const newLogs = [`User provided input: ${val}`];

      useDataStore.setState((state) => ({
          runs: state.runs.map(r => r.id === run.id ? {
              ...r,
              status: 'running', // Resume run
              steps: {
                  ...r.steps,
                  [pausedStepId]: {
                      ...r.steps[pausedStepId],
                      status: 'success',
                      outputs,
                      logs: [...(r.steps[pausedStepId].logs || []), ...newLogs],
                      endTime: Date.now()
                  }
              }
          } : r)
      }));
      setResumeVal('');
  };

  return (
    <div className="flex h-full">
       <div className="flex-1 relative bg-slate-100 border-r border-slate-200">
          <ReactFlow
             nodes={nodes}
             edges={edges}
             onNodesChange={onNodesChange}
             onEdgesChange={onEdgesChange}
             nodeTypes={nodeTypes}
             onNodeClick={(_, n) => setSelectedStepId(n.id)}
             fitView
          >
             <Background />
             <Controls />
          </ReactFlow>

          {/* Pause Overylay / Modal */}
          {pausedNode && run.status === 'paused' && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white p-4 rounded-lg shadow-xl border-2 border-yellow-400 z-50 w-80">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-2">
                      <Loader2 className="animate-spin text-yellow-500" /> Action Required
                  </h3>
                  <div className="text-sm text-slate-600 mb-4">
                      {pausedNode.data.label} (Step) requires input.
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
              </div>
          )}
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

                {/* User Logs / Notebook */}
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
                         {(run.status === 'completed' || run.status === 'failed') && (
                            <button onClick={() => updateRun(run.id, { status: 'running', startTime: Date.now(), steps: {} })} className="text-xs bg-slate-100 p-1 rounded hover:bg-slate-200">Restart</button>
                        )}
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
                        <div className="text-sm text-slate-400 italic">Select a step in the graph to view technical debug logs.</div>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
}

export function WorkflowRunView(props: RunViewContentProps) {
    return (
        <ReactFlowProvider>
            <RunViewContent {...props} />
        </ReactFlowProvider>
    );
}
