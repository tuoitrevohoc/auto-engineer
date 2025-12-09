import { executeStep } from '../src/lib/runner';
import { resolveInputs } from '../src/lib/workflow-utils';
import { Workspace, WorkflowNode, WorkflowRun } from '../src/types/workflow';

const mockWorkspace: Workspace = {
    id: 'ws-1',
    name: 'Test WS',
    workingDirectory: '/tmp/test',
    createdAt: new Date().toISOString()
};

const mockRun: WorkflowRun = {
    id: 'run-1',
    workflowId: 'wf-1',
    workspaceId: 'ws-1',
    status: 'running',
    steps: {
        'step-1': {
            stepId: 'step-1',
            status: 'success',
            inputValues: {},
            outputs: { myVal: 'hello world' },
            logs: []
        }
    },
    variables: {},
    startTime: Date.now()
};

async function testResolution() {
    console.log('Test 1: Input Resolution');
    const node: WorkflowNode = {
        id: 'step-2',
        position: { x: 0, y: 0 },
        data: {
            label: 'Step 2',
            actionId: 'run-command',
            inputMappings: {
                // Constant
                cmd: { type: 'constant', value: 'echo' },
                // Variable
                msg: { type: 'variable', value: 'step-1.myVal' },
                // Context
                dir: { type: 'context', value: 'workingDir' }
            },
            executionStatus: 'idle'
        }
    };

    const inputs = resolveInputs(node, mockRun, mockWorkspace);
    
    // Check values
    if (inputs.cmd === 'echo' && inputs.msg === 'hello world' && inputs.dir === '/tmp/test') {
        console.log('✅ PASS: Inputs resolved correctly');
    } else {
        console.error('❌ FAIL: Inputs resolution failed', inputs);
        process.exit(1);
    }
}

async function testExecuteGit() {
    console.log('\nTest 2: Execute Action (Git Checkout)');
    const result = await executeStep('git-checkout', { repoUrl: 'http://git.com/foo.git' }, { workspace: mockWorkspace, workflowId: 'wf-1', runId: 'run-1' });
    
    const outputs = result.outputs as Record<string, any>;
    if (result.status === 'success' && outputs?.repoPath === '/tmp/test/repo') {
        console.log('✅ PASS: Git Checkout simulated success');
    } else {
         console.error('❌ FAIL: Git Checkout failed', result);
         process.exit(1);
    }
}

async function testExecuteConfirm() {
    console.log('\nTest 3: Execute Action (Confirm)');
    const result = await executeStep('confirm', { message: 'Are you sure?' }, { workspace: mockWorkspace, workflowId: 'wf-1', runId: 'run-1' });
    
    if (result.status === 'paused') {
        console.log('✅ PASS: Confirm action paused execution');
    } else {
         console.error('❌ FAIL: Confirm action did not pause', result);
         process.exit(1);
    }
}

async function run() {
    try {
        await testResolution();
        await testExecuteGit();
        await testExecuteConfirm();
        console.log('\nAll tests passed!');
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

run();
