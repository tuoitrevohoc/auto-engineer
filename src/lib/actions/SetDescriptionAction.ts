
import { ActionDefinition } from '@/types/workflow';
import { WorkflowAction, ExecutionContext, ExecutionResult } from './Action';
import { SetDescriptionDefinition } from './definitions';

export class SetDescriptionAction implements WorkflowAction {
  definition = SetDescriptionDefinition;

  async execute(inputs: Record<string, unknown>, context: ExecutionContext): Promise<ExecutionResult> {
    const logs: string[] = [`Executing action: ${this.definition.id}`];
    const desc = String(inputs.description || '');
    
    logs.push(`Setting run description to: ${desc}`);
    
    if (context.runId && context.updateRun) {
        // Side effect: Update the run
        await context.updateRun(context.runId, { description: desc });
        logs.push('Run description updated.');
    } else {
        logs.push('Warning: context.updateRun not available, skipping update.');
    }

    return {
      status: 'success',
      logs
    };
  }
}
