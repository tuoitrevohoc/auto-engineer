import { Workflow, WorkflowRun, Workspace, WorkflowNode, WorkflowEdge } from '@/types/workflow';
import { useDataStore } from '@/store/dataStore';
import { getActionInstance } from './action-registry';

export interface ExecutionResult {
  status: 'success' | 'failed' | 'paused';
  outputs?: unknown;
  error?: string;
  logs: string[];
}

export async function executeStep(
  actionId: string, 
  inputs: Record<string, unknown>, 
  context: { workspace: Workspace; workflowId?: string; runId?: string }
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
              let res = await executeStep(node.data.actionId, stepInputs, context);
              
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

// Logic to resolving inputs based on mappings and previous state
export function resolveInputs(
    node: WorkflowNode, 
    run: WorkflowRun, 
    workspace: Workspace
): Record<string, unknown> {
    const inputs: Record<string, unknown> = {};
    const { inputMappings } = node.data;

    Object.entries(inputMappings).forEach(([key, mapping]) => {
        if (mapping.type === 'constant') {
            if (typeof mapping.value === 'string') {
                inputs[key] = substituteVariables(mapping.value, run, workspace);
            } else {
                inputs[key] = mapping.value;
            }
        } else if (mapping.type === 'context') {
            if (mapping.value === 'workingDir') inputs[key] = workspace.workingDirectory;
            if (mapping.value === 'workspaceId') inputs[key] = workspace.id;
        } else if (mapping.type === 'variable') {
           // Value is "stepId.outputKey" or just "stepId" (if we want whole object, but usually specific)
           // If UI saves "stepId" only, we might fail or take all.
           if (typeof mapping.value === 'string' && mapping.value.includes('.')) {
               const [stepId, outputKey] = mapping.value.split('.');
               const stepState = run.steps[stepId];
               if (stepState && stepState.outputs) {
                   inputs[key] = stepState.outputs[outputKey];
               }
           }
        }
    });

    return inputs;
}

function substituteVariables(text: string, run: WorkflowRun, workspace: Workspace): unknown {
    // Check for single variable match to preserve type 
    const singleMatch = text.match(/^\{\{\s*([a-zA-Z0-9_\-\.]+)\s*\}\}$/);
    if (singleMatch) {
       return resolvePath(singleMatch[1], run, workspace);
    }

    // String interpolation
    return text.replace(/\{\{\s*([a-zA-Z0-9_\-\.]+)\s*\}\}/g, (_, path) => {
        const val = resolvePath(path, run, workspace);
        return val !== undefined && val !== null ? String(val) : '';
    });
}

function resolvePath(path: string, run: WorkflowRun, workspace: Workspace): unknown {
    const parts = path.split('.');
    const root = parts[0];

    // Check inputs
    if (root === 'input') {
        return run.inputValues?.[parts[1]];
    }

    // Check workspace
    if (root === 'workspace') {
        if (parts[1] === 'id') return workspace.id;
        if (parts[1] === 'workingDirectory') return workspace.workingDirectory;
    }

    // Check steps
    // Assuming root is stepId
    const stepState = run.steps[root];
    if (stepState) {
        if (parts[1] === 'outputs' && parts[2]) {
             return (stepState.outputs as any)[parts[2]];
        }
        // Direct output access shortcut? stepId.key ?? 
        // User asked for "stepname.output.value".
        // Let's support `stepId.outputs.key` AND `stepId.key` (shortcut)
        if (stepState.outputs && parts[1] in (stepState.outputs as any)) {
             return (stepState.outputs as any)[parts[1]];
        }
    }
    
    return undefined;
}

// Determine next steps
export function getNextSteps(run: WorkflowRun, workflow: Workflow): string[] {
    // Find nodes where:
    // 1. Not started yet (status undefined or pending)
    // 2. All incoming edges come from nodes that are 'completed'
    
    // Build adjacency
    const targetMap = new Set<string>(); // Nodes that are targets of some edge
    const edgesByTarget: Record<string, WorkflowEdge[]> = {};
    
    workflow.edges.forEach(e => {
        targetMap.add(e.target);
        if (!edgesByTarget[e.target]) edgesByTarget[e.target] = [];
        edgesByTarget[e.target].push(e);
    });

    const executable: string[] = [];

    workflow.nodes.forEach(node => {
        const stepState = run.steps[node.id];
        if (stepState && (stepState.status === 'success' || stepState.status === 'running' || stepState.status === 'paused' || stepState.status === 'failed')) {
            return; // Already processed
        }

        // Check dependencies
        const incoming = edgesByTarget[node.id] || [];
        const allDepsMet = incoming.every(edge => {
             const sourceState = run.steps[edge.source];
             return sourceState && sourceState.status === 'success';
        });

        if (allDepsMet) {
            executable.push(node.id);
        }
    });

    return executable;
}
