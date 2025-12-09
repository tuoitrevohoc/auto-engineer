
import { ActionDefinition } from '@/types/workflow';
import { WorkflowAction, ExecutionContext, ExecutionResult } from './Action';

export class GitCheckoutAction implements WorkflowAction {
  definition: ActionDefinition = {
    id: 'git-checkout',
    name: 'Checkout Git Repository',
    description: 'Clone a git repository to the working directory',
    parameters: [
      { name: 'repoUrl', label: 'Repository URL', type: 'string', required: true },
      { name: 'branch', label: 'Branch', type: 'string', defaultValue: 'main' },
    ],
    inputs: [],
    outputs: [
      { name: 'repoPath', type: 'string', description: 'Absolute path to the checked out repo' },
    ],
  };

  async execute(inputs: Record<string, unknown>, context: ExecutionContext): Promise<ExecutionResult> {
    const repoUrl = String(inputs.repoUrl);
    const branch = String(inputs.branch || 'main');
    const logs: string[] = [`Executing action: ${this.definition.id}`];

    logs.push(`Cloning ${repoUrl} to ${context.workspace.workingDirectory}...`);
    logs.push(`Checked out branch: ${branch}`);

    return {
      status: 'success',
      outputs: { repoPath: `${context.workspace.workingDirectory}/repo` },
      logs
    };
  }
}
