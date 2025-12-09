
import { WorkflowAction, ExecutionContext, ExecutionResult } from './Action';
import { ActionDefinition, Workflow } from '@/types/workflow';
import { ForEachListDefinition } from './definitions';

export class ForEachListAction implements WorkflowAction {
  definition = ForEachListDefinition;

  async execute(inputs: Record<string, unknown>, context: ExecutionContext): Promise<ExecutionResult> {
    const logs: string[] = [`Executing action: ${this.definition.id}`];
    
    let items: any[] = [];
    if (Array.isArray(inputs.items)) {
        items = inputs.items;
    } else if (typeof inputs.items === 'string') {
        items = inputs.items.split('\n').map(s => s.trim()).filter(s => s.length > 0);
    } else {
        throw new Error('Input "items" must be an array or a newline-separated string');
    }

    const workflowId = String(inputs.workflowId);
    const itemVar = String(inputs.itemVariableName || 'item');

    let extraInputs = {};
    const additionalInput = inputs.additionalInput;
    if (typeof additionalInput === 'string') {
            try { extraInputs = JSON.parse(additionalInput); } catch(e) { /* ignore */ }
    } else if (typeof additionalInput === 'object' && additionalInput !== null) {
            extraInputs = additionalInput;
    }

    // Common: Fetch Child Workflow
    let childWorkflow: Workflow | undefined;
    if (context.getWorkflow) {
        childWorkflow = await context.getWorkflow(workflowId);
    }
    
    // Server-Side Execution Only
    if (!context.createRun || !context.getRun || !context.stepId || !context.runId) {
        throw new Error('ForEachListAction requires server-side execution (createRun/getRun capabilities).');
    }
    
    if (!childWorkflow) throw new Error(`Child workflow not found: ${workflowId}`);

    // 1. Check existing state (Persistence)
    const currentRun = await context.getRun(context.runId);
    const stepState = currentRun?.steps[context.stepId];
    const childRunIds = (stepState?.outputs?.childRunIds as string[]) || [];

    if (childRunIds.length === 0) {
        // Phase A: Spawn Runs
        const newRunIds: string[] = [];
        logs.push(`Spawning ${items.length} child workflows...`);
        
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const childInputs = { ...extraInputs, [itemVar]: item };
            const childRunId = `run-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            
            await context.createRun({
                id: childRunId,
                workflowId: childWorkflow.id,
                workspaceId: context.workspace.id,
                status: 'running',
                startTime: Date.now(),
                steps: {},
                variables: {},
                inputValues: childInputs,
                description: `Child of ${context.runId} (Item ${i+1})`
            });
            newRunIds.push(childRunId);
        }
        
        return {
            status: 'paused',
            outputs: { childRunIds: newRunIds },
            logs: [...logs, `Spawned ${newRunIds.length} runs. Waiting for completion...`]
        };
    } else {
        // Phase B: Check Status
        const childStatuses: Record<string, string> = {};
        let runningCount = 0;
        let failedCount = 0;
        let completedCount = 0;

        for (const cid of childRunIds) {
            const cRun = await context.getRun(cid);
            if (!cRun) { failedCount++; continue; }
            
            childStatuses[cid] = cRun.status;

            // Check statuses
            if (cRun.status === 'failed') failedCount++;
            else if (cRun.status === 'completed' || cRun.status === 'cancelled') completedCount++;
            else runningCount++;
        }

        if (runningCount > 0) {
            return {
                status: 'paused',
                outputs: { childRunIds, childStatuses }, // Must explicitly persist outputs again
                logs: [] // Waiting...
            };
        }

        if (failedCount > 0) {
            return {
                status: 'failed',
                error: `${failedCount} child workflows failed.`,
                logs: [...logs, `${failedCount} children failed.`]
            };
        }

        return {
            status: 'success',
            outputs: { totalProcessed: items.length, childRunIds },
            logs: [...logs, 'All child workflows completed.']
        };
    }
  }
}
