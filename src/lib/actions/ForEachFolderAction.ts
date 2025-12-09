
import { ActionDefinition } from '@/types/workflow';
import { WorkflowAction, ExecutionContext, ExecutionResult } from './Action';

export class ForEachFolderAction implements WorkflowAction {
  definition: ActionDefinition = {
    id: 'foreach-folder',
    name: 'For Each Folder',
    description: 'Iterate over folders matching a pattern and run a sub-workflow',
    parameters: [
      { name: 'pattern', label: 'Glob Pattern', type: 'string', required: true, defaultValue: '*' },
      { name: 'childWorkflowId', label: 'Child Workflow ID', type: 'string', required: true },
    ],
    inputs: [
      { name: 'basePath', type: 'string', required: true },
    ],
    outputs: [
      { name: 'totalProcessed', type: 'number' },
    ],
  };

  async execute(inputs: Record<string, unknown>, context: ExecutionContext): Promise<ExecutionResult> {
    const logs: string[] = [`Executing action: ${this.definition.id}`];
    
    logs.push(`Scanning folders in ${inputs.basePath} matching ${inputs.pattern}`);
    logs.push(`Found 3 folders matching pattern.`);
    
    // Note: In a real app, this would spawn child workflows.
    // For this sim, we just Log it and verify the "Concept".
    logs.push(`[SIMULATION] Spawning child workflow ${inputs.childWorkflowId} for item 1`);
    logs.push(`[SIMULATION] Spawning child workflow ${inputs.childWorkflowId} for item 2`);
    
    return {
      status: 'success',
      outputs: { totalProcessed: 3 },
      logs
    };
  }
}
