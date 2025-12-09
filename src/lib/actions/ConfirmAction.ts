
import { ActionDefinition } from '@/types/workflow';
import { WorkflowAction, ExecutionContext, ExecutionResult } from './Action';
import { ConfirmDefinition } from './definitions';

export class ConfirmAction implements WorkflowAction {
  definition = ConfirmDefinition;

  async execute(inputs: Record<string, unknown>, context: ExecutionContext): Promise<ExecutionResult> {
    const logs: string[] = [];
    return {
      status: 'paused',
      logs
    };
  }
}
