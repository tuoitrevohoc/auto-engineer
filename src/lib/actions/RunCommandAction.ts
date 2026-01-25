
import { ActionDefinition } from '@/types/workflow';
import { WorkflowAction, ExecutionContext, ExecutionResult } from './Action';
import { RunCommandDefinition } from './definitions';

export class RunCommandAction implements WorkflowAction {
  definition = RunCommandDefinition;

  async execute(inputs: Record<string, unknown>, context: ExecutionContext): Promise<ExecutionResult> {
    const logs: string[] = [`Executing action: ${this.definition.id}`];
    
    const cwd = inputs.workingDir ? String(inputs.workingDir) : context.workspace.workingDirectory;

    // Parse command/args without invoking a shell.
    // This avoids command injection via shell metacharacters and fixes quoting behavior.
    const rawCommand = String(inputs.command ?? '').trim();
    if (!rawCommand) {
      return { status: 'failed', error: 'Missing required input: command', logs };
    }

    const commandParts = parseCommandLine(rawCommand);
    const command = commandParts.shift();
    if (!command) {
      return { status: 'failed', error: 'Invalid command', logs };
    }

    const argsFromCommand = commandParts; // supports users putting "cmd --flag" in the command field
    const argsFromArgs =
      Array.isArray(inputs.args) ? inputs.args.map(v => String(v)) :
      typeof inputs.args === 'string' ? parseCommandLine(inputs.args) :
      inputs.args == null ? [] :
      parseCommandLine(String(inputs.args));

    const finalArgs = [...argsFromCommand, ...argsFromArgs];

    logs.push(`Running: ${command}${finalArgs.length ? ' ' + finalArgs.join(' ') : ''}`);
    logs.push(`CWD: ${cwd}`);

    return new Promise((resolve) => {
        const { spawn } = require('child_process');

        // Explicitly do NOT use a shell; pass args as an array.
        const child = spawn(command, finalArgs, {
            cwd,
            shell: false,
            stdio: ['ignore', 'pipe', 'pipe'],
        });

        const MAX_OUTPUT_CHARS = 1_000_000; // prevent unbounded memory growth
        let stdoutData = '';
        let stderrData = '';
        let stdoutTruncated = false;
        let stderrTruncated = false;
        let settled = false;

        child.stdout.on('data', (data: Buffer) => {
            const chunk = data.toString();
            ({ text: stdoutData, truncated: stdoutTruncated } = appendAndTruncate(stdoutData, chunk, MAX_OUTPUT_CHARS, stdoutTruncated));
        });

        child.stderr.on('data', (data: Buffer) => {
            const chunk = data.toString();
            ({ text: stderrData, truncated: stderrTruncated } = appendAndTruncate(stderrData, chunk, MAX_OUTPUT_CHARS, stderrTruncated));
        });

        // 10 minutes timeout
        const timeout = setTimeout(() => {
            // Try graceful shutdown, then force kill.
            child.kill('SIGTERM');
            setTimeout(() => child.kill('SIGKILL'), 10_000).unref?.();
            logs.push('Command timed out after 10 minutes');
            if (settled) return;
            settled = true;
            resolve({
                status: 'failed',
                outputs: { stdout: stdoutData, stderr: stderrData, exitCode: -1 },
                error: 'Command timed out',
                logs
            });
        }, 10 * 60 * 1000);

        child.on('close', (code: number) => {
            clearTimeout(timeout);
            if (settled) return;
            settled = true;
            
            const sout = stdoutData.trim();
            const serr = stderrData.trim();

            if (stdoutTruncated) logs.push(`STDOUT truncated to last ${MAX_OUTPUT_CHARS} characters`);
            if (stderrTruncated) logs.push(`STDERR truncated to last ${MAX_OUTPUT_CHARS} characters`);

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
            if (settled) return;
            settled = true;
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

function parseCommandLine(input: string): string[] {
  const out: string[] = [];
  let current = '';
  let quote: '"' | "'" | null = null;
  let escape = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];

    if (escape) {
      current += ch;
      escape = false;
      continue;
    }

    if (quote === '"') {
      if (ch === '\\') { escape = true; continue; }
      if (ch === '"') { quote = null; continue; }
      current += ch;
      continue;
    }

    if (quote === "'") {
      if (ch === "'") { quote = null; continue; }
      current += ch;
      continue;
    }

    if (ch === '\\') { escape = true; continue; }
    if (ch === '"' || ch === "'") { quote = ch; continue; }

    if (/\s/.test(ch)) {
      if (current.length) {
        out.push(current);
        current = '';
      }
      continue;
    }

    current += ch;
  }

  if (escape) current += '\\';
  if (current.length) out.push(current);

  return out;
}

function appendAndTruncate(existing: string, chunk: string, maxChars: number, alreadyTruncated: boolean): { text: string; truncated: boolean } {
  let text = existing + chunk;
  let truncated = alreadyTruncated;
  if (text.length > maxChars) {
    truncated = true;
    text = text.slice(text.length - maxChars);
  }
  return { text, truncated };
}
