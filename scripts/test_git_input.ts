
import { executeStep } from '../src/lib/runner';
import { resolveInputs } from '../src/lib/workflow-utils';
import { Workspace, WorkflowNode, WorkflowRun } from '../src/types/workflow';

const mockWorkspace: Workspace = {
    id: 'ws-test',
    name: 'Test WS',
    workingDirectory: '/tmp/test',
    createdAt: new Date().toISOString()
};

const mockRun: WorkflowRun = {
    id: 'run-test',
    workflowId: 'wf-test',
    workspaceId: 'ws-test',
    status: 'running',
    steps: {},
    variables: {},
    startTime: Date.now(),
    inputValues: {
        repo_url: 'https://github.com/example/repo.git',
        branch_name: 'feature/test'
    }
};

async function testGitInputResolution() {
    console.log('Testing Git Checkout Input Resolution...');

    const node: WorkflowNode = {
        id: 'step-git',
        position: { x: 0, y: 0 },
        data: {
            label: 'Checkout Repo',
            actionId: 'git-checkout',
            inputMappings: {
                repoUrl: { type: 'constant', value: '{{ input.repo_url }}' },
                branch: { type: 'constant', value: '{{ input.branch_name }}' }
            },
            executionStatus: 'idle'
        }
    };

    console.log('Resolving inputs...');
    const inputs = resolveInputs(node, mockRun, mockWorkspace);
    console.log('Resolved Inputs:', inputs);

    if (inputs.repoUrl === 'https://github.com/example/repo.git' && inputs.branch === 'feature/test') {
        console.log('✅ Input resolution passed.');
    } else {
        console.error('❌ Input resolution failed.');
        process.exit(1);
    }

    console.log('Executing step...');
    const result = await executeStep('git-checkout', inputs, { workspace: mockWorkspace });
    
    console.log('Result Logs:', result.logs);
    
    // Check if logs contain the resolved values
    const joinedLogs = result.logs.join('\n');
    if (joinedLogs.includes('Cloning https://github.com/example/repo.git') && joinedLogs.includes('Checked out branch: feature/test')) {
        console.log('✅ Git Checkout simulation verified.');
    } else {
        console.error('❌ Git Checkout logs do not match expected values.');
        process.exit(1);
    }
}

testGitInputResolution().catch(console.error);
