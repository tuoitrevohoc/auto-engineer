
import { ActionDefinition } from '@/types/workflow';
import { WorkflowAction, ExecutionContext, ExecutionResult } from './Action';
import { RunCommandDefinition } from './definitions';

export class RunCommandAction implements WorkflowAction {
  definition = RunCommandDefinition;

  async execute(inputs: Record<string, unknown>, context: ExecutionContext): Promise<ExecutionResult> {
    const logs: string[] = [`Executing action: ${this.definition.id}`];
    
    const command = String(inputs.command);
    const args = inputs.args ? String(inputs.args) : '';
    const fullCommand = `${command} ${args}`.trim();
    const cwd = inputs.workingDir ? String(inputs.workingDir) : context.workspace.workingDirectory;

    logs.push(`Running: ${fullCommand}`);
    logs.push(`CWD: ${cwd}`);

    return new Promise((resolve) => {
        const { exec } = require('child_process');
        exec(fullCommand, { cwd }, (error: any, stdout: string, stderr: string) => {
            const exitCode = error?.code || 0;
            const sout = stdout?.trim() || '';
            const serr = stderr?.trim() || '';

            if (sout) logs.push(`STDOUT:\n${sout}`);
            if (serr) logs.push(`STDERR:\n${serr}`);

            if (error) {
                logs.push(`Command failed with exit code ${exitCode}`);
                resolve({
                    status: 'failed',
                    outputs: { stdout: sout, stderr: serr, exitCode },
                    error: error.message,
                    logs
                });
            } else {
                resolve({
                    status: 'success',
                    outputs: { stdout: sout, stderr: serr, exitCode: 0 },
                    logs
                });
            }
        });
    });
  }
}
