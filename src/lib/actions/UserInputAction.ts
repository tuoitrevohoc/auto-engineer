
import { ActionDefinition } from '@/types/workflow';
import { WorkflowAction, ExecutionContext, ExecutionResult } from './Action';

export class UserInputAction implements WorkflowAction {
  definition: ActionDefinition = {
    id: 'user-input',
    name: 'User Input',
    description: 'Request input from the user',
    parameters: [
      { name: 'prompt', label: 'Prompt Message', type: 'string', required: true },
      { name: 'fieldName', label: 'Field Name', type: 'string', defaultValue: 'userInput' },
    ],
    inputs: [
       { name: 'contextData', type: 'string', description: 'Optional context to show user' }
    ],
    outputs: [
      { name: 'value', type: 'string' },
    ],
  };

  async execute(inputs: Record<string, unknown>, context: ExecutionContext): Promise<ExecutionResult> {
    const logs: string[] = [`Executing action: ${this.definition.id}`, 'Waiting for user input...'];
    return {
      status: 'paused',
      logs
    };
  }
}
