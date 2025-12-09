
import { ActionDefinition, Workspace, Workflow, WorkflowRun } from '@/types/workflow';

export interface ExecutionContext {
  workspace: Workspace;
  workflowId?: string;
  runId?: string;
  stepId?: string;
  runWorkflow?: (workflow: Workflow, inputs: Record<string, unknown>) => Promise<Record<string, unknown>>;
  
  // Abstraction for data access (Server vs Client)
  updateRun?: (runId: string, data: Partial<WorkflowRun>) => Promise<void>;
  createRun?: (data: WorkflowRun) => Promise<void>;
  getWorkflow?: (workflowId: string) => Promise<Workflow | undefined>;
  getRun?: (runId: string) => Promise<WorkflowRun | undefined>;
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
