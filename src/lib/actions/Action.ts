
import { ActionDefinition, Workspace, Workflow } from '@/types/workflow';

export interface ExecutionContext {
  workspace: Workspace;
  workflowId?: string;
  runId?: string;
  runWorkflow?: (workflow: Workflow, inputs: Record<string, unknown>) => Promise<Record<string, unknown>>;
}

export interface ExecutionResult {
  status: 'success' | 'failed' | 'paused';
  outputs?: unknown;
  error?: string;
  logs: string[];
}

export interface WorkflowAction {
  definition: ActionDefinition;
  execute(inputs: Record<string, unknown>, context: ExecutionContext): Promise<ExecutionResult>;
}
