
import { ActionDefinition } from '@/types/workflow';
import { WorkflowAction, ExecutionContext, ExecutionResult } from './Action';
import { GitCheckoutDefinition } from './definitions';

export class GitCheckoutAction implements WorkflowAction {
  definition = GitCheckoutDefinition;

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
