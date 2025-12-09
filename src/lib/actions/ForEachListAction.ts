
import { WorkflowAction, ExecutionContext, ExecutionResult } from './Action';
import { useDataStore } from '@/store/dataStore';
import { ActionDefinition } from '@/types/workflow';

export class ForEachListAction implements WorkflowAction {
  definition: ActionDefinition = {
    id: 'foreach-list',
    name: 'For Each Item',
    description: 'Iterate through a list of items and run a child workflow for each.',
    parameters: [
      { name: 'items', label: 'Items List', type: 'json', required: true, description: 'Array of items' },
      { name: 'workflowId', label: 'Run Workflow', type: 'workflow-id', required: true },
      { name: 'itemVariableName', label: 'Item Variable Name', type: 'string', defaultValue: 'item', description: 'Name of the input variable in child workflow' },
    ],
    inputs: [],
    outputs: [
      { name: 'totalProcessed', type: 'number' },
      { name: 'results', type: 'json' }
    ],
  };

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

    if (!context.runWorkflow) {
        throw new Error('Runner does not support recursive execution (runWorkflow missing in context)');
    }

    // Fetch Child Workflow
    // Assuming client-side execution access to store
    // In a server-side runner, we'd need another way (DB access)
    const store = useDataStore.getState();
    const childWorkflow = store.workflows.find(w => w.id === workflowId);

    if (!childWorkflow) {
        throw new Error(`Child workflow not found: ${workflowId}`);
    }

    logs.push(`Starting loop for ${items.length} items with workflow "${childWorkflow.name}"...`);

    const results: any[] = [];

    // Loop
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        logs.push(`[Loop ${i+1}/${items.length}] Processing item: ${JSON.stringify(item).substring(0, 50)}...`);
        
        try {
            const childInputs = { [itemVar]: item };
            // Execute child workflow synchronously
            // Note: outputs from child workflow aren't strictly returned by runWorkflowSync yet (it returns {}). 
            // If we want outputs, we probably need to enhance runWorkflowSync.
            await context.runWorkflow(childWorkflow, childInputs);
            results.push({ status: 'success' }); // Placeholder
        } catch (err) {
            logs.push(`[Loop ${i+1}] Failed: ${err}`);
            results.push({ status: 'failed', error: String(err) });
            // Should we stop? or continue?
            // Let's continue.
        }
    }

    logs.push(`Loop completed. Processed ${items.length} items.`);

    return {
      status: 'success',
      outputs: { 
          totalProcessed: items.length,
          results
      },
      logs
    };
  }
}
