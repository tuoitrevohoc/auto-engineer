
import db from './db';
import { Workflow, WorkflowRun, Workspace, WorkflowNode, StepExecutionState } from '@/types/workflow';
import { getNextSteps, resolveInputs } from './workflow-utils';
import { getActionInstance } from './action-implementations';
import { ExecutionContext, ExecutionResult } from './actions/Action';

export async function processRun(runId: string) {
    const run = getRunById(runId);
    if (!run) return;
    if (run.status !== 'running' && run.status !== 'paused') return;

    const workflow = getWorkflowById(run.workflowId);
    const workspace = getWorkspaceById(run.workspaceId);
    
    if (!workflow || !workspace) {
        updateRunStatus(runId, 'failed');
        return;
    }

    // Ensure workspace directory exists
    try {
        const fs = require('fs');
        if (workspace.workingDirectory && !fs.existsSync(workspace.workingDirectory)) {
            fs.mkdirSync(workspace.workingDirectory, { recursive: true });
        }
    } catch (err) {
        console.error(`Failed to create workspace dir: ${workspace.workingDirectory}`, err);
    }

    // Determine executable steps
    const executableStepIds = getNextSteps(run, workflow);
    
    // Execute available steps
    for (const stepId of executableStepIds) {
        const node = workflow.nodes.find(n => n.id === stepId)!;
        await executeStep(stepId, node, run, workflow, workspace);
    }

    // Re-evaluate paused steps (Polling)
    // We do this to allow actions like ForEach or UserInput to check for resumption
    const pausedSteps = Object.values(run.steps).filter(s => s.status === 'paused');
    for (const step of pausedSteps) {
         const node = workflow.nodes.find(n => n.id === step.stepId)!;
         await executeStep(step.stepId, node, run, workflow, workspace);
    }
    
    // Check completion (after execution attempt)
    // Reload run to see latest state
    const afterRun = getRunById(runId);
    if (!afterRun) return;

    const steps = Object.values(afterRun.steps);
    const isRunning = steps.some(s => s.status === 'running');
    const isPaused = steps.some(s => s.status === 'paused');
    const hasFailed = steps.some(s => s.status === 'failed');

    if (hasFailed && !isRunning) {
        updateRunStatus(runId, 'failed');
        return;
    }

    if (!isRunning && !isPaused && run.status === 'running') {
        const allSuccess = workflow.nodes.every(n => afterRun.steps[n.id]?.status === 'success' || afterRun.steps[n.id]?.status === 'skipped');
        if (allSuccess) {
            updateRunStatus(runId, 'completed');
        }
    }
}

async function executeStep(stepId: string, node: WorkflowNode, run: WorkflowRun, workflow: Workflow, workspace: Workspace) {
    // 1. Mark Running
    // Only verify if we really should mark running?
    // If it was paused, we mark running momentarily to indicate "Checking".
    const startTime = run.steps[stepId]?.startTime || Date.now();
    const stepInputs = resolveInputs(node, run, workspace);
    
    const initialStepState: StepExecutionState = {
        stepId,
        status: 'running',
        startTime,
        // Preserve outputs/logs if existing?
        outputs: run.steps[stepId]?.outputs || {},
        logs: run.steps[stepId]?.logs || [],
        inputValues: stepInputs,
    };
    
    updateRunStep(run.id, stepId, initialStepState);

    // 2. Prepare Context
    const context: ExecutionContext = {
        workspace,
        workflowId: workflow.id,
        runId: run.id,
        stepId,
        updateRun: async (id, data) => {
            updateRunData(id, data);
        },
        createRun: async (data) => {
             const { id, workflowId, workspaceId, status, startTime, endTime, description, ...rest } = data;
             db.prepare(`
                INSERT INTO runs (id, workflowId, workspaceId, status, startTime, endTime, description, data)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
             `).run(id, workflowId, workspaceId, status, startTime || Date.now(), endTime, description, JSON.stringify(rest));
        },
        getRun: async (id) => getRunById(id),
        getWorkflow: async (id) => getWorkflowById(id),
    };

    // 3. Execute Action
    const actionId = node.data.actionId;
    const action = getActionInstance(actionId);
    
    // LOGGING
    console.log(`\n\x1b[36mRunning workflow: ${run.id}\x1b[0m`);
    console.log(`\x1b[36mCurrent workflow: ${workflow.name}\x1b[0m`);
    console.log(`\x1b[33mCurrent Action: ${node.data.label} (${actionId})\x1b[0m`);

    let result: ExecutionResult;
    
    try {
        if (!action) throw new Error(`Unknown action: ${actionId}`);
        result = await action.execute(stepInputs, context);

        if (result.logs && result.logs.length > 0) {
             console.log(`\x1b[90m${result.logs.join('\n')}\x1b[0m`);
        }
    } catch (err) {
        result = {
            status: 'failed',
            error: err instanceof Error ? err.message : String(err),
            logs: [`Error executing ${actionId}: ${err}`]
        };
    }

    // 4. Handle Result
    // Reload run to get latest logs that might have been added during execution
    const freshRun = getRunById(run.id); 
    const currentLogs = freshRun?.steps[stepId]?.logs || [];

    const finalStepState: StepExecutionState = {
        ...initialStepState,
        status: result.status,
        outputs: (result.outputs as Record<string, any>) || {},
        logs: [...currentLogs, ...result.logs],
        endTime: Date.now(),
        error: result.error
    };

    updateRunStep(run.id, stepId, finalStepState);

    // If paused, suspend run
    if (result.status === 'paused') {
        updateRunStatus(run.id, 'paused');
    } else if (run.status === 'paused') {
        // If the run was paused and this step finished (success/failed), resume to running
        // to allow further steps or completion checks.
        updateRunStatus(run.id, 'running');
    }
}


// --- DB Helpers ---

function getRunById(id: string): WorkflowRun | undefined {
    const row = db.prepare('SELECT * FROM runs WHERE id = ?').get(id) as any;
    if (!row) return undefined;
    const data = JSON.parse(row.data);
    return {
        id: row.id,
        workflowId: row.workflowId,
        workspaceId: row.workspaceId,
        status: row.status,
        startTime: row.startTime,
        endTime: row.endTime,
        description: row.description,
        ...data // steps, variables, userLogs, inputValues
    };
}

function getWorkflowById(id: string): Workflow | undefined {
    const row = db.prepare('SELECT * FROM workflows WHERE id = ?').get(id) as any;
    if (!row) return undefined;
    const data = JSON.parse(row.data);
    return {
        id: row.id,
        name: row.name,
        description: row.description,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        ...data
    };
}

function getWorkspaceById(id: string): Workspace | undefined {
    const row = db.prepare('SELECT * FROM workspaces WHERE id = ?').get(id) as any;
    if (!row) return undefined;
    return row;
}

function updateRunStatus(id: string, status: string) {
    const now = Date.now();
    db.prepare('UPDATE runs SET status = ?, endTime = ? WHERE id = ?').run(status, status === 'completed' || status === 'failed' ? now : null, id);
}

function updateRunStep(runId: string, stepId: string, stepState: StepExecutionState) {
    // Atomic update of a single step is hard with JSON blob.
    // We read, parse, update, write. 
    // This is race-condition prone if multiple workers processing same run (we assume 1 worker per run or locked).
    
    const run = getRunById(runId);
    if (!run) return;
    
    run.steps[stepId] = stepState;
    saveRunData(run);
}

function updateRunData(runId: string, partial: Partial<WorkflowRun>) {
    const run = getRunById(runId);
    if (!run) return;
    
    // Merge
    if (partial.steps) {
        Object.assign(run.steps, partial.steps);
    }
    if (partial.userLogs) {
        run.userLogs = partial.userLogs;
    }
    if (partial.description) {
        run.description = partial.description;
        // Also update column
        db.prepare('UPDATE runs SET description = ? WHERE id = ?').run(run.description, runId);
    }
    // ... other fields

    saveRunData(run);
}

function saveRunData(run: WorkflowRun) {
    const { id, workflowId, workspaceId, status, startTime, endTime, description, ...data } = run;
    db.prepare('UPDATE runs SET data = ? WHERE id = ?').run(JSON.stringify(data), id);
}
