
import { ActionDefinition } from '@/types/workflow';
import { WorkflowAction, ExecutionContext, ExecutionResult } from './Action';
import { useDataStore } from '@/store/dataStore';

export class SetDescriptionAction implements WorkflowAction {
  definition: ActionDefinition = {
    id: 'set-description',
    name: 'Set Workflow Description',
    description: 'Update the description of the current workflow (Markdown supported)',
    parameters: [
      { name: 'description', label: 'Description Text', type: 'text', required: true, description: 'Markdown allowed' },
    ],
    inputs: [],
    outputs: [],
  };

  async execute(inputs: Record<string, unknown>, context: ExecutionContext): Promise<ExecutionResult> {
    const logs: string[] = [`Executing action: ${this.definition.id}`];
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
  }
}
