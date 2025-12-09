
import { ActionDefinition } from '@/types/workflow';
import { WorkflowAction, ExecutionContext, ExecutionResult } from './Action';
import { UserInputDefinition } from './definitions';

export class UserInputAction implements WorkflowAction {
  definition = UserInputDefinition;

  async execute(inputs: Record<string, unknown>, context: ExecutionContext): Promise<ExecutionResult> {
    const logs: string[] = [];
    return {
      status: 'paused',
      logs
    };
  }
}
