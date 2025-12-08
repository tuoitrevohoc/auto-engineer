import { ActionDefinition } from '@/types/workflow';

export const ACTION_REGISTRY: ActionDefinition[] = [
  {
    id: 'git-checkout',
    name: 'Checkout Git Repository',
    description: 'Clone a git repository to the working directory',
    parameters: [
      { name: 'repoUrl', label: 'Repository URL', type: 'string', required: true },
      { name: 'branch', label: 'Branch', type: 'string', defaultValue: 'main' },
    ],
    inputs: [],
    outputs: [
      { name: 'repoPath', type: 'string', description: 'Absolute path to the checked out repo' },
    ],
  },
  {
    id: 'run-command',
    name: 'Run Command',
    description: 'Execute a shell command',
    parameters: [
      { name: 'command', label: 'Command', type: 'string', required: true },
      { name: 'args', label: 'Arguments', type: 'string' },
    ],
    inputs: [
      { name: 'workingDir', type: 'string', description: 'Directory to run in' },
    ],
    outputs: [
      { name: 'stdout', type: 'string' },
      { name: 'stderr', type: 'string' },
      { name: 'exitCode', type: 'number' },
    ],
  },
  {
    id: 'confirm',
    name: 'Confirmation',
    description: 'Pause workflow and ask for user confirmation',
    parameters: [
      { name: 'message', label: 'Message', type: 'string', required: true },
    ],
    inputs: [],
    outputs: [
      { name: 'confirmed', type: 'boolean' },
    ],
  },
  {
    id: 'user-input',
    name: 'User Input',
    description: 'Request input from the user',
    parameters: [
      { name: 'prompt', label: 'Prompt Message', type: 'string', required: true },
      { name: 'fieldName', label: 'Field Name', type: 'string', defaultValue: 'userInput' },
    ],
    inputs: [
       { name: 'contextData', type: 'string', description: 'Optional context to show user' }
    ],
    outputs: [
      { name: 'value', type: 'string' },
    ],
  },
  {
    id: 'set-description',
    name: 'Set Workflow Description',
    description: 'Update the description of the current workflow (Markdown supported)',
    parameters: [
      { name: 'description', label: 'Description Text', type: 'text', required: true, description: 'Markdown allowed' },
    ],
    inputs: [],
    outputs: [],
  },
  {
    id: 'add-log',
    name: 'Add Log Entry',
    description: 'Append a markdown log entry to the run view',
    parameters: [
      { name: 'content', label: 'Log Content', type: 'text', required: true, description: 'Markdown allowed' },
    ],
    inputs: [],
    outputs: [],
  },
  {
    id: 'foreach-folder',
    name: 'For Each Folder',
    description: 'Iterate over folders matching a pattern and run a sub-workflow',
    parameters: [
      { name: 'pattern', label: 'Glob Pattern', type: 'string', required: true, defaultValue: '*' },
      { name: 'childWorkflowId', label: 'Child Workflow ID', type: 'string', required: true },
    ],
    inputs: [
      { name: 'basePath', type: 'string', required: true },
    ],
    outputs: [
      { name: 'totalProcessed', type: 'number' },
    ],
  },
];

export const getActionDefinition = (id: string): ActionDefinition | undefined => {
  return ACTION_REGISTRY.find((a) => a.id === id);
};
