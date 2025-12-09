
import { ActionDefinition } from '@/types/workflow';
import { WorkflowAction, ExecutionContext, ExecutionResult } from './Action';

export class ConfirmAction implements WorkflowAction {
  definition: ActionDefinition = {
    id: 'confirm',
    name: 'Confirmation',
    description: 'Pause workflow and ask for user confirmation',
    parameters: [
      { name: 'message', label: 'Message', type: 'string', required: true },
    ],
    inputs: [],
    outputs: [
      { name: 'confirmed', type: 'boolean' },
    ],
  };

  async execute(inputs: Record<string, unknown>, context: ExecutionContext): Promise<ExecutionResult> {
    const logs: string[] = [`Executing action: ${this.definition.id}`, 'Waiting for user confirmation...'];
    return {
      status: 'paused',
      logs
    };
  }
}
