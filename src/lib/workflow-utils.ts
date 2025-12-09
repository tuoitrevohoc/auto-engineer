
import { Workflow, WorkflowRun, Workspace, WorkflowNode, WorkflowEdge } from '@/types/workflow';

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

export function substituteVariables(text: string, run: WorkflowRun, workspace: Workspace): unknown {
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
        if (stepState && (stepState.status === 'success' || stepState.status === 'running' || stepState.status === 'paused' || stepState.status === 'failed' || stepState.status === 'skipped')) {
            return; // Already processed or active
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
