import { Workflow, WorkflowRun, Workspace, WorkflowNode, WorkflowEdge } from '@/types/workflow';
import { useDataStore } from '@/store/dataStore';

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

  const logs: string[] = [`Executing action: ${actionId}`];

  try {
      switch (actionId) {
          case 'git-checkout':
              logs.push(`Cloning ${inputs.repoUrl} to ${context.workspace.workingDirectory}...`);
              logs.push(`Checked out branch: ${inputs.branch || 'main'}`);
              return {
                  status: 'success',
                  outputs: { repoPath: `${context.workspace.workingDirectory}/repo` },
                  logs
              };
          
          case 'run-command':
              logs.push(`Running command: ${inputs.command} ${inputs.args || ''}`);
              logs.push(`cwd: ${inputs.workingDir || context.workspace.workingDirectory}`);
              // Simulate checking a folder or running a build
              return {
                  status: 'success',
                  outputs: { stdout: 'Command executed successfully\nDone.', stderr: '', exitCode: 0 },
                  logs
              };

          case 'confirm':
              logs.push('Waiting for user confirmation...');
              return {
                  status: 'paused', // Engine pauses here
                  logs
              };

          case 'user-input':
             logs.push('Waiting for user input...');
             return {
                 status: 'paused',
                 logs
             };
          
          case 'set-description':
              const desc = String(inputs.description || '');
              logs.push(`Setting run description to: ${desc}`);
              if (context.runId) {
                  // Side effect: Update the run
                  useDataStore.getState().updateRun(context.runId, { description: desc });
                  logs.push('Run description updated.');
              } else {
                  logs.push('Warning: No runId in context, skipping update.');
              }
              return {
                  status: 'success',
                  logs
              };
           
           case 'add-log':
              const content = String(inputs.content || '');
              logs.push(`Adding user log: ${content.substring(0, 20)}...`);
              
              if (context.runId) {
                  const state = useDataStore.getState();
                  const existingRun = state.runs.find(r => r.id === context.runId);
                  if (existingRun) {
                      const newEntry = {
                          timestamp: Date.now(),
                          content,
                          stepId: 'run-log' // or we could pass stepId in context if we had it, but executeStep doesn't seem to have current stepId? 
                          // executeStep connects node -> action. Node ID is not in context.
                          // But we can just say "Manual Log" or leave generic.
                          // Actually, `executeStep` context could include `stepId`.
                          // Let's assume generic for now or ignore stepId.
                          // Type requires stepId. I'll use 'run-log'.
                      };
                      const userLogs = [...(existingRun.userLogs || []), newEntry];
                      state.updateRun(context.runId, { userLogs });
                      logs.push('User log added.');
                  }
              }
              return { status: 'success', logs };

          case 'foreach-folder':
             logs.push(`Scanning folders in ${inputs.basePath} matching ${inputs.pattern}`);
             logs.push(`Found 3 folders matching pattern.`);
             // Note: In a real app, this would spawn child workflows.
             // For this sim, we just Log it and verify the "Concept".
             // Implementing real child workflows is complex. We'll simulate "Processing" them.
             logs.push(`[SIMULATION] Spawning child workflow ${inputs.childWorkflowId} for item 1`);
             logs.push(`[SIMULATION] Spawning child workflow ${inputs.childWorkflowId} for item 2`);
             return {
                 status: 'success',
                 outputs: { totalProcessed: 3 },
                 logs
             };

          default:
              return { status: 'success', outputs: {}, logs: ['Unknown action, skipping'] };
      }
  } catch (err: unknown) {
      return { status: 'failed', error: err instanceof Error ? err.message : String(err), logs };
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
