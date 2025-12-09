
import { ActionDefinition } from '@/types/workflow';
import { WorkflowAction, ExecutionContext, ExecutionResult } from './Action';
import { useDataStore } from '@/store/dataStore';

export class AddLogAction implements WorkflowAction {
  definition: ActionDefinition = {
    id: 'add-log',
    name: 'Add Log Entry',
    description: 'Append a markdown log entry to the run view',
    parameters: [
      { name: 'content', label: 'Log Content', type: 'text', required: true, description: 'Markdown allowed' },
    ],
    inputs: [],
    outputs: [],
  };

  async execute(inputs: Record<string, unknown>, context: ExecutionContext): Promise<ExecutionResult> {
    const logs: string[] = [`Executing action: ${this.definition.id}`];
    const content = String(inputs.content || '');
    
    logs.push(`Adding user log: ${content.substring(0, 20)}...`);
    
    if (context.runId) {
        const state = useDataStore.getState();
        const existingRun = state.runs.find(r => r.id === context.runId);
        if (existingRun) {
            const newEntry = {
                timestamp: Date.now(),
                content,
                stepId: 'run-log'
            };
            const userLogs = [...(existingRun.userLogs || []), newEntry];
            state.updateRun(context.runId, { userLogs });
            logs.push('User log added.');
        }
    }

    return { status: 'success', logs };
  }
}
