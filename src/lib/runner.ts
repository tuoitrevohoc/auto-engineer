import { Workflow, WorkflowRun, Workspace, WorkflowNode, WorkflowEdge } from '@/types/workflow';
import { useDataStore } from '@/store/dataStore';
import { getActionInstance } from './action-implementations';
import { getNextSteps, resolveInputs } from './workflow-utils';
export { getNextSteps, resolveInputs };

export interface ExecutionResult {
  status: 'success' | 'failed' | 'paused';
  outputs?: unknown;
  error?: string;
  logs: string[];
}

export async function executeStep(
  actionId: string, 
  inputs: Record<string, unknown>, 
  context: { workspace: Workspace; workflowId?: string; runId?: string; stepId?: string }
): Promise<ExecutionResult> {
  // Simulate network delay
  await new Promise(r => setTimeout(r, 1000));

  const action = getActionInstance(actionId);
  if (!action) {
      return { status: 'failed', error: `Unknown action: ${actionId}`, logs: [`Unknown action: ${actionId}`] };
  }

  // Recursive Runner Definition
  const runWorkflow = async (workflow: Workflow, workflowInputs: Record<string, unknown>): Promise<Record<string, unknown>> => {
      // Initialize simplified run state for the child
      const childRunId = `child-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const runState: WorkflowRun = {
          id: childRunId,
          workflowId: workflow.id,
          workspaceId: context.workspace.id,
          status: 'running',
          startTime: Date.now(),
          steps: {},
          variables: {},
          inputValues: workflowInputs,
          description: `Child run (Parent: ${context.runId?.substr(0,8) || 'Unknown'})`
      };

      // Persist the child run immediately
      useDataStore.getState().createRun(runState);

      // Execution Loop
      while (true) {
          const nextSteps = getNextSteps(runState, workflow);
          // If no next steps, logic is done.
          // Note: getNextSteps only returns steps that are ready (dependencies met) and NOT started.
          
          if (nextSteps.length === 0) {
              // Verify completion or failure
              const allNodes = workflow.nodes;
              const anyFailed = allNodes.some(n => runState.steps[n.id]?.status === 'failed');
              const allCompleted = allNodes.every(n => runState.steps[n.id]?.status === 'success' || runState.steps[n.id]?.status === 'skipped'); // handling skipped?
              
              // Final update
              const finalStatus = anyFailed ? 'failed' : 'completed';
              runState.status = finalStatus;
              runState.endTime = Date.now();
              useDataStore.getState().updateRun(childRunId, { status: finalStatus, endTime: runState.endTime });

              if (anyFailed) throw new Error('Child workflow step failed.');
              break;
          }

          // Execute parallel
          // Execute parallel
          await Promise.all(nextSteps.map(async (stepId) => {
              const node = workflow.nodes.find(n => n.id === stepId)!;
              
              // Resolve inputs
              const stepInputs = resolveInputs(node, runState, context.workspace);
              
              // Mark start
              runState.steps[stepId] = {
                  stepId,
                  status: 'running',
                  inputValues: stepInputs,
                  outputs: {},
                  logs: [],
                  startTime: Date.now()
              };
              useDataStore.getState().updateRun(childRunId, { steps: { ...runState.steps } });

              // Execute Step (Recurse)
              let res = await executeStep(node.data.actionId, stepInputs, { ...context, stepId });
              
              // Handle Paused State
              if (res.status === 'paused') {
                  // Mark as paused in store
                  runState.steps[stepId].status = 'paused';
                  runState.steps[stepId].logs = [...(runState.steps[stepId].logs || []), ...res.logs];
                  
                  useDataStore.getState().updateRun(childRunId, { 
                      status: 'paused',
                      steps: { ...runState.steps } 
                  });
                  
                  // Mark Parent as Paused
                  if (context.runId) {
                      useDataStore.getState().updateRun(context.runId, { status: 'paused' });
                  }

                  // Poll until resumed
                  while (true) {
                      await new Promise(r => setTimeout(r, 1000));
                      const freshRun = useDataStore.getState().runs.find(r => r.id === childRunId);
                      if (!freshRun) throw new Error('Run disappeard');
                      
                      const freshStep = freshRun.steps[stepId];
                      if (freshStep && freshStep.status === 'success') {
                          // Resumed by User!
                          res = {
                              status: 'success',
                              outputs: freshStep.outputs,
                              logs: freshStep.logs || []
                          };
                          // Resume Parent Status
                          if (context.runId) {
                              useDataStore.getState().updateRun(context.runId, { status: 'running' });
                          }
                          // Resume Child Status
                          useDataStore.getState().updateRun(childRunId, { status: 'running' });
                          break;
                      }
                      
                      if (freshRun.status === 'failed') {
                          throw new Error('Run failed manually.');
                      }
                  }
              }
              
              // Update state
              runState.steps[stepId] = {
                  ...runState.steps[stepId],
                  status: res.status === 'success' ? 'success' : 'failed',
                  outputs: (res.outputs as Record<string, any>) || {},
                  logs: res.logs,
                  endTime: Date.now(),
                  error: res.error
              };
              useDataStore.getState().updateRun(childRunId, { steps: { ...runState.steps } });
          }));
      }

      return {}; // Could return aggregation of outputs if we want
  };

  try {
      return await action.execute(inputs, { ...context, runWorkflow });
  } catch (err: unknown) {
      return { 
          status: 'failed', 
          error: err instanceof Error ? err.message : String(err), 
          logs: [`Error executing ${actionId}`, String(err)] 
      };
  }
}

