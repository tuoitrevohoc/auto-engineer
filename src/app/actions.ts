'use server';

import db from '@/lib/db';
import { Workflow, Workspace, WorkflowRun, WorkflowNode, WorkflowEdge, StepExecutionState } from '@/types/workflow';
import { revalidatePath } from 'next/cache';

// WORKFLOWS

export async function getWorkflows(): Promise<Workflow[]> {
  const st = db.prepare('SELECT * FROM workflows ORDER BY updatedAt DESC');
  const rows = st.all() as any[];
  
  return rows.map(row => {
    const data = JSON.parse(row.data);
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      nodes: data.nodes,
      edges: data.edges,
      inputs: data.inputs,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  });
}

export async function saveWorkflow(workflow: Workflow): Promise<void> {
  const data = JSON.stringify({ nodes: workflow.nodes, edges: workflow.edges, inputs: workflow.inputs });
  const st = db.prepare(`
    INSERT INTO workflows (id, name, description, data, createdAt, updatedAt)
    VALUES (@id, @name, @description, @data, @createdAt, @updatedAt)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      description = excluded.description,
      data = excluded.data,
      updatedAt = excluded.updatedAt
  `);
  
  st.run({
    id: workflow.id,
    name: workflow.name,
    description: workflow.description || null,
    data,
    createdAt: workflow.createdAt,
    updatedAt: workflow.updatedAt
  });
  
  revalidatePath('/workflows');
  revalidatePath(`/workflows/${workflow.id}`);
}

export async function deleteWorkflowAction(id: string): Promise<void> {
    const st = db.prepare('DELETE FROM workflows WHERE id = ?');
    st.run(id);
    revalidatePath('/workflows');
}

// WORKSPACES

export async function getWorkspaces(): Promise<Workspace[]> {
  const st = db.prepare('SELECT * FROM workspaces ORDER BY createdAt DESC');
  return st.all() as Workspace[];
}

export async function createWorkspaceAction(workspace: Workspace): Promise<void> {
  const st = db.prepare(`
    INSERT INTO workspaces (id, name, workingDirectory, createdAt)
    VALUES (@id, @name, @workingDirectory, @createdAt)
  `);
  
  st.run(workspace);
  revalidatePath('/workspaces');
}

export async function updateWorkspaceAction(workspace: Workspace): Promise<void> {
    const st = db.prepare(`
        UPDATE workspaces SET name = @name, workingDirectory = @workingDirectory WHERE id = @id
    `);
    st.run(workspace);
    revalidatePath('/workspaces');
    revalidatePath(`/workspaces/${workspace.id}`);
}

export async function deleteWorkspaceAction(id: string): Promise<void> {
    db.prepare('DELETE FROM workspaces WHERE id = ?').run(id);
    db.prepare('DELETE FROM runs WHERE workspaceId = ?').run(id); // Cascade delete runs
    revalidatePath('/workspaces');
}

// RUNS

export async function getRuns(): Promise<WorkflowRun[]> {
  const st = db.prepare('SELECT * FROM runs ORDER BY startTime DESC');
  const rows = st.all() as any[];

  return rows.map(row => {
    const data = JSON.parse(row.data);
    return {
      id: row.id,
      workflowId: row.workflowId,
      workspaceId: row.workspaceId,
      status: row.status as any,
      steps: data.steps,
      variables: data.variables,
      userLogs: data.userLogs,
      inputValues: data.inputValues,
      startTime: row.startTime,
      endTime: row.endTime,
      description: row.description
    };
  });
}

export async function getWorkspaceRuns(workspaceId: string): Promise<WorkflowRun[]> {
  const st = db.prepare('SELECT * FROM runs WHERE workspaceId = ? ORDER BY startTime DESC');
  const rows = st.all(workspaceId) as any[];

  return rows.map(row => {
    const data = JSON.parse(row.data);
    return {
      id: row.id,
      workflowId: row.workflowId,
      workspaceId: row.workspaceId,
      status: row.status as any,
      steps: data.steps,
      variables: data.variables,
      userLogs: data.userLogs,
      inputValues: data.inputValues,
      startTime: row.startTime,
      endTime: row.endTime,
      description: row.description
    };
  });
}

export async function getRun(id: string): Promise<WorkflowRun | undefined> {
  const st = db.prepare('SELECT * FROM runs WHERE id = ?');
  const row = st.get(id) as any;
  if (!row) return undefined;

  const data = JSON.parse(row.data);
  return {
      id: row.id,
      workflowId: row.workflowId,
      workspaceId: row.workspaceId,
      status: row.status as any,
      steps: data.steps,
      variables: data.variables,
      userLogs: data.userLogs,
      inputValues: data.inputValues,
      startTime: row.startTime,
      endTime: row.endTime,
      description: row.description
  };
}
export async function saveRun(run: WorkflowRun): Promise<void> {
  const data = JSON.stringify({ steps: run.steps, variables: run.variables, userLogs: run.userLogs, inputValues: run.inputValues });
  const st = db.prepare(`
    INSERT INTO runs (id, workflowId, workspaceId, status, data, startTime, endTime, description)
    VALUES (@id, @workflowId, @workspaceId, @status, @data, @startTime, @endTime, @description)
    ON CONFLICT(id) DO UPDATE SET
      status = excluded.status,
      data = excluded.data,
      endTime = excluded.endTime,
      description = excluded.description
  `);
  
  st.run({
    id: run.id,
    workflowId: run.workflowId,
    workspaceId: run.workspaceId,
    status: run.status,
    data,
    startTime: run.startTime,
    endTime: run.endTime || null,
    description: run.description || null
  });
  
  revalidatePath(`/workspaces/${run.workspaceId}/runs/${run.id}`);
}

export async function deleteRun(id: string): Promise<void> {
  const run = await getRun(id);
  if (run) {
      db.prepare('DELETE FROM runs WHERE id = ?').run(id);
      revalidatePath(`/workspaces/${run.workspaceId}`);
  }
}

export async function cancelRun(id: string): Promise<void> {
    const now = Date.now();
    const run = await getRun(id);
    if(run) {
        db.prepare("UPDATE runs SET status = 'cancelled', endTime = ? WHERE id = ?").run(now, id);
        revalidatePath(`/workspaces/${run.workspaceId}`);
        revalidatePath(`/workspaces/${run.workspaceId}/runs/${id}`);
    }
}
