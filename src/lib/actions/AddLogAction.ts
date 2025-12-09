
import { ActionDefinition } from '@/types/workflow';
import { WorkflowAction, ExecutionContext, ExecutionResult } from './Action';
import { AddLogDefinition } from './definitions';

export class AddLogAction implements WorkflowAction {
  definition = AddLogDefinition;

  async execute(inputs: Record<string, unknown>, context: ExecutionContext): Promise<ExecutionResult> {
    const logs: string[] = [`Executing action: ${this.definition.id}`];
    const content = String(inputs.content || '');
    
    logs.push(`Adding user log: ${content.substring(0, 20)}...`);
    
    if (context.runId && context.getRun && context.updateRun) {
        const existingRun = await context.getRun(context.runId);
        if (existingRun) {
            const newEntry = {
                timestamp: Date.now(),
                content,
                stepId: 'run-log'
            };
            const userLogs = [...(existingRun.userLogs || []), newEntry];
            await context.updateRun(context.runId, { userLogs });
            logs.push('User log added.');
        }
    } else {
        logs.push('Warning: context data access not available, skipping log update.');
    }

    return { status: 'success', logs };
  }
}
