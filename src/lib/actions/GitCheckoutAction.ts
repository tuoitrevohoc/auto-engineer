
import { ActionDefinition } from '@/types/workflow';
import { WorkflowAction, ExecutionContext, ExecutionResult } from './Action';
import { GitCheckoutDefinition } from './definitions';
import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';

export class GitCheckoutAction implements WorkflowAction {
  definition = GitCheckoutDefinition;

  async execute(inputs: Record<string, unknown>, context: ExecutionContext): Promise<ExecutionResult> {
    const repoUrl = String(inputs.repoUrl);
    const branch = String(inputs.branch || 'main');
    const logs: string[] = [`Executing action: ${this.definition.id}`];

    const workspaceDir = context.workspace.workingDirectory;
    const repoPath = path.join(workspaceDir, 'repo');

    logs.push(`Workspace: ${workspaceDir}`);
    logs.push(`Repo URL: ${repoUrl}`);
    logs.push(`Branch: ${branch}`);
    logs.push(`Target: ${repoPath}`);

    if (!repoUrl || repoUrl.trim().length === 0) {
      return { status: 'failed', error: 'repoUrl is required', logs };
    }

    // Ensure workspace directory exists
    await fs.promises.mkdir(workspaceDir, { recursive: true });

    const gitDir = path.join(repoPath, '.git');
    const repoExists = await pathExists(repoPath);
    const isGitRepo = repoExists && (await pathExists(gitDir));

    try {
      if (!repoExists) {
        logs.push('Cloning repository (shallow)...');
        await runGit(
          ['clone', '--depth', '1', '--single-branch', '--branch', branch, '--', repoUrl, repoPath],
          workspaceDir,
          logs
        );
      } else if (isGitRepo) {
        logs.push('Repository already exists; fetching & checking out branch...');
        await runGit(['-C', repoPath, 'fetch', '--depth', '1', 'origin', branch], workspaceDir, logs);
        await runGit(['-C', repoPath, 'checkout', branch], workspaceDir, logs);
        await runGit(['-C', repoPath, 'reset', '--hard', `origin/${branch}`], workspaceDir, logs);
      } else {
        return {
          status: 'failed',
          error: `Target path exists but is not a git repo: ${repoPath}`,
          logs
        };
      }
    } catch (err: unknown) {
      return {
        status: 'failed',
        error: err instanceof Error ? err.message : String(err),
        logs
      };
    }

    return {
      status: 'success',
      outputs: { repoPath },
      logs
    };
  }
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.promises.access(p);
    return true;
  } catch {
    return false;
  }
}

function runGit(args: string[], cwd: string, logs: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    logs.push(`git ${args.join(' ')}`);
    const child = spawn('git', args, { cwd, shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let err = '';

    child.stdout.on('data', (d: Buffer) => (out += d.toString()));
    child.stderr.on('data', (d: Buffer) => (err += d.toString()));

    child.on('error', reject);
    child.on('close', (code) => {
      const sout = out.trim();
      const serr = err.trim();
      if (sout) logs.push(`git stdout:\n${sout}`);
      if (serr) logs.push(`git stderr:\n${serr}`);

      if (code === 0) resolve();
      else reject(new Error(`git exited with code ${code}`));
    });
  });
}
