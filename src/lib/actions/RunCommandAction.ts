
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
        const { spawn } = require('child_process');
        const child = spawn(fullCommand, { 
            cwd, 
            shell: true,
            stdio: ['pipe', 'pipe', 'pipe'] // Explicitly pipe stdio to control it
        });

        // Close stdin immediately as requested
        child.stdin.end();

        let stdoutData = '';
        let stderrData = '';

        child.stdout.on('data', (data: Buffer) => {
            const chunk = data.toString();
            stdoutData += chunk;
            // Optional: Real-time logging if needed, but we gather it for the result
            // logs.push(chunk); 
        });

        child.stderr.on('data', (data: Buffer) => {
            const chunk = data.toString();
            stderrData += chunk;
        });

        // 10 minutes timeout
        const timeout = setTimeout(() => {
            child.kill();
            logs.push('Command timed out after 10 minutes');
            resolve({
                status: 'failed',
                outputs: { stdout: stdoutData, stderr: stderrData, exitCode: -1 },
                error: 'Command timed out',
                logs
            });
        }, 10 * 60 * 1000);

        child.on('close', (code: number) => {
            clearTimeout(timeout);
            
            const sout = stdoutData.trim();
            const serr = stderrData.trim();

            if (sout) logs.push(`STDOUT:\n${sout}`);
            if (serr) logs.push(`STDERR:\n${serr}`);

            if (code !== 0) {
                logs.push(`Command failed with exit code ${code}`);
                resolve({
                    status: 'failed',
                    outputs: { stdout: sout, stderr: serr, exitCode: code },
                    error: `Command failed with exit code ${code}`,
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

        child.on('error', (err: Error) => {
            clearTimeout(timeout);
            logs.push(`Spawn error: ${err.message}`);
            resolve({
                status: 'failed',
                outputs: { stdout: stdoutData, stderr: stderrData, exitCode: -1 },
                error: err.message,
                logs
            });
        });
    });
  }
}
