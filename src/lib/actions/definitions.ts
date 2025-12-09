import { ActionDefinition } from '@/types/workflow';

export const GitCheckoutDefinition: ActionDefinition = {
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
};

export const RunCommandDefinition: ActionDefinition = {
    id: 'run-command',
    name: 'Run Command',
    description: 'Execute a shell command',
    parameters: [
      { name: 'command', label: 'Command', type: 'string', required: true, language: 'bash' },
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
};

export const ConfirmDefinition: ActionDefinition = {
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
};

export const UserInputDefinition: ActionDefinition = {
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
};

export const SetDescriptionDefinition: ActionDefinition = {
    id: 'set-description',
    name: 'Set Workflow Description',
    description: 'Update the description of the current workflow (Markdown supported)',
    parameters: [
      { name: 'description', label: 'Description Text', type: 'text', required: true, description: 'Markdown allowed' },
    ],
    inputs: [],
    outputs: [],
};

export const AddLogDefinition: ActionDefinition = {
    id: 'add-log',
    name: 'Add Log Entry',
    description: 'Append a markdown log entry to the run view',
    parameters: [
      { name: 'content', label: 'Log Content', type: 'text', required: true, description: 'Markdown allowed' },
    ],
    inputs: [],
    outputs: [],
};

export const NewTempFolderDefinition: ActionDefinition = {
    id: 'new-temp-folder',
    name: 'New Temp Folder',
    description: 'Create a new temporary folder',
    parameters: [],
    inputs: [],
    outputs: [
      { name: 'path', type: 'string', description: 'Absolute path to the new temp folder' }
    ]
};

export const ForEachListDefinition: ActionDefinition = {
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

export const AskChatGPTDefinition: ActionDefinition = {
    id: 'ask-chatgpt',
    name: 'Ask ChatGPT',
    description: 'Send a prompt to OpenAI ChatGPT and get a response',
    parameters: [
      { name: 'prompt', label: 'Prompt', type: 'text', required: true, description: 'The prompt to send' },
      { name: 'model', label: 'Model', type: 'string', defaultValue: 'gpt-4o' },
    ],
    inputs: [],
    outputs: [
      { name: 'response', type: 'string' },
    ],
};

export const SplitStringDefinition: ActionDefinition = {
    id: 'split-string',
    name: 'Split String',
    description: 'Split a string by a delimiter into a list of strings',
    parameters: [
      { name: 'delimiter', label: 'Delimiter', type: 'string', required: true, defaultValue: ',' },
    ],
    inputs: [
        { name: 'inputString', type: 'string', required: true }
    ],
    outputs: [
      { name: 'strings', type: 'json' },
    ],
};
