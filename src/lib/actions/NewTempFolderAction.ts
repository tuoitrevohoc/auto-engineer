
import { ActionDefinition } from '@/types/workflow';
import { WorkflowAction, ExecutionContext, ExecutionResult } from './Action';
import { NewTempFolderDefinition } from './definitions';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';

export class NewTempFolderAction implements WorkflowAction {
  definition = NewTempFolderDefinition;

  async execute(inputs: Record<string, unknown>, context: ExecutionContext): Promise<ExecutionResult> {
    const tmpDir = os.tmpdir();
    const folderName = `auto-engineer-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const fullPath = path.join(tmpDir, folderName);

    await fs.promises.mkdir(fullPath, { recursive: true });

    return {
      status: 'success',
      outputs: {
        path: fullPath
      },
      logs: []
    };
  }
}
