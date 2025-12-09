
import { ActionDefinition } from '@/types/workflow';
import { WorkflowAction, ExecutionContext, ExecutionResult } from './Action';
import { SplitStringDefinition } from './definitions';

export class SplitStringAction implements WorkflowAction {
  definition = SplitStringDefinition;

  async execute(inputs: Record<string, unknown>, context: ExecutionContext): Promise<ExecutionResult> {
    const delimiter = (inputs.delimiter as string) || ',';
    // Access 'inputString' from inputs (mapped from parameters or inputs?)
    // In Definition: inputString is in 'inputs' array.
    // The engine maps definitions input/params to 'inputs' record passed here.
    const inputString = (inputs.inputString as string) || '';

    const split = inputString.split(delimiter).map(s => s.trim()).filter(s => s.length > 0);

    const logs = [
        `Splitting string of length ${inputString.length} with delimiter "${delimiter}"`,
        `Input preview: ${inputString.substring(0, 50)}${inputString.length > 50 ? '...' : ''}`,
        `Resulting parts: ${split.length}`,
        `Parts: ${JSON.stringify(split)}`
    ];

    return {
      status: 'success',
      outputs: {
        strings: split
      },
      logs
    };
  }
}
