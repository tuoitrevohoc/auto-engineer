
import { ActionDefinition } from '@/types/workflow';
import { WorkflowAction, ExecutionContext, ExecutionResult } from './Action';

export class RunCommandAction implements WorkflowAction {
  definition: ActionDefinition = {
    id: 'run-command',
    name: 'Run Command',
    description: 'Execute a shell command',
    parameters: [
      { name: 'command', label: 'Command', type: 'string', required: true },
      { name: 'args', label: 'Arguments', type: 'string' },
    ],
    inputs: [
      { name: 'workingDir', type: 'string', description: 'Directory to run in' },
    ],
    outputs: [
      { name: 'stdout', type: 'string' },
      { name: 'stderr', type: 'string' },
      { name: 'exitCode', type: 'number' },
    ],
  };

  async execute(inputs: Record<string, unknown>, context: ExecutionContext): Promise<ExecutionResult> {
    const logs: string[] = [`Executing action: ${this.definition.id}`];
    
    logs.push(`Running command: ${inputs.command} ${inputs.args || ''}`);
    logs.push(`cwd: ${inputs.workingDir || context.workspace.workingDirectory}`);
    
    // Simulate checking a folder or running a build
    return {
      status: 'success',
      outputs: { stdout: 'Command executed successfully\nDone.', stderr: '', exitCode: 0 },
      logs
    };
  }
}
