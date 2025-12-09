import { Edge, Node } from '@xyflow/react';

export type ActionParamType = 'string' | 'number' | 'boolean' | 'text' | 'json' | 'workflow-id';

export interface ActionParameter {
  name: string;
  label: string;
  type: ActionParamType;
  required?: boolean;
  defaultValue?: unknown;
  description?: string;
}

export interface ActionInputRequest {
  name: string;
  type: ActionParamType;
  required?: boolean;
  description?: string;
}

export interface ActionOutputDefinition {
  name: string;
  type: ActionParamType;
  description?: string;
}

export interface ActionDefinition {
  id: string; // unique key e.g., 'git-checkout'
  name: string;
  description: string;
  parameters: ActionParameter[]; // Configured at design time (static or mapped)
  inputs: ActionInputRequest[];  // Runtime inputs (from context or previous steps)
  outputs: ActionOutputDefinition[];
}

// Input values for a step
export type InputMappingType = 'constant' | 'variable' | 'context'; // variable = another step's output

export interface InputMapping {
  [paramName: string]: {
    type: InputMappingType;
    value: string | number | boolean; // If type is 'variable', value is stepId.outputName. If 'context', value is contextKey
  };
}

export interface WorkflowStepData {
  label: string;
  actionId: string;
  inputMappings: InputMapping;
  // Execution status (visual only for builder, real state in run)
  executionStatus?: 'idle' | 'running' | 'success' | 'failed' | 'paused' | 'pending' | 'skipped';
  [key: string]: unknown;
}

export type WorkflowNode = Node<WorkflowStepData>;
export type WorkflowEdge = Edge;

export interface WorkflowInput {
  name: string;
  label?: string;
  type: 'text' | 'number' | 'boolean';
  defaultValue?: string | number | boolean;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  inputs?: WorkflowInput[];
  createdAt: string;
  updatedAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  workingDirectory: string;
  createdAt: string;
}

// Execution Types

export interface StepExecutionState {
  stepId: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'paused' | 'skipped';
  inputValues: Record<string, unknown>;
  outputs: Record<string, unknown>;
  logs: string[];
  startTime?: number;
  endTime?: number;
  error?: string;
}

export interface WorkflowRun {
  id: string;
  workflowId: string;
  workspaceId: string;
  status: 'running' | 'completed' | 'failed' | 'paused' | 'cancelled';
  currentStepId?: string;
  steps: Record<string, StepExecutionState>;
  variables: Record<string, any>; // Global variables
  inputValues?: Record<string, any>; // Inputs for this run
  startTime: number;
  endTime?: number;
  description?: string; // Dynamic description set during run
  userLogs?: { timestamp: number; content: string; stepId: string }[];
}
