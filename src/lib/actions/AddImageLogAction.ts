import { ActionDefinition } from '@/types/workflow';
import { ExecutionContext, ExecutionResult, WorkflowAction } from '@/lib/actions/Action';
import { AddImageLogDefinition } from './definitions';
import db from '@/lib/db';

export class AddImageLogAction implements WorkflowAction {
  definition = AddImageLogDefinition;

  async execute(inputs: Record<string, unknown>, context: ExecutionContext): Promise<ExecutionResult> {
    const imageId = String(inputs.imageId || '');
    const caption = String(inputs.caption || 'Image');
    
    if (!imageId) {
        return {
            status: 'failed',
            error: 'Image ID is required',
            logs: ['Error: Image ID is required']
        };
    }

    try {
        const row = db.prepare('SELECT path FROM images WHERE id = ?').get(imageId) as { path: string } | undefined;

        if (!row) {
             return {
                status: 'failed',
                error: `Image with ID ${imageId} not found`,
                logs: [`Error: Image with ID ${imageId} not found`]
            };
        }

        const logContent = `![${caption}](${row.path})`;

        if (context.runId && context.getRun && context.updateRun) {
            const existingRun = await context.getRun(context.runId);
            if (existingRun) {
                const newEntry = {
                    timestamp: Date.now(),
                    content: logContent,
                    stepId: context.stepId || 'run-log'
                };
                const userLogs = [...(existingRun.userLogs || []), newEntry];
                await context.updateRun(context.runId, { userLogs });
            }
        }
        
        return {
            status: 'success',
            outputs: {},
            logs: [logContent]
        };

    } catch (error: any) {
        return {
            status: 'failed',
            error: error.message,
            logs: [`Error resolving image: ${error.message}`]
        };
    }
  }
}
