'use server';

import db from '@/lib/db';
import { Workflow, Workspace, WorkflowRun, WorkflowNode, WorkflowEdge, StepExecutionState } from '@/types/workflow';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

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

// SETTINGS

export async function getSetting(key: string): Promise<string | undefined> {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as any;
    return row?.value;
}

export async function saveSetting(key: string, value: string): Promise<void> {
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?').run(key, value, value);
    revalidatePath('/settings');
}


export async function generateCode(language: string, prompt: string, currentCode: string): Promise<string> {
    const apiKey = await getSetting('openai_api_key');
    if (!apiKey) throw new Error('OpenAI API Key not configured in Settings.');

    const finalPrompt = `Current code: '${currentCode}'\n\nHelp me write a short program using ${language} language\n\n${prompt}\nREturn only the code with comments, do not add any other text or conversation`;

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'gpt-4o',
            messages: [{ role: 'user', content: finalPrompt }],
            temperature: 0.2
        })
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`OpenAI Error: ${err}`);
    }

    const data = await res.json();
    let content = data.choices?.[0]?.message?.content || '';
    
    // Clean up markdown block if present
    content = content.replace(/^```[a-z]*\n/, '').replace(/\n```$/, '');
    
    return content;
}

// IMAGES

export async function uploadImage(formData: FormData): Promise<string> {
    const file = formData.get('file') as File;
    if (!file) throw new Error('No file uploaded');

    if (file.size > 10 * 1024 * 1024) {
        throw new Error('File size exceeds 10MB limit');
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Dynamic import to avoid edge runtime issues if any (though 'use server' usually runs in node)
    const fs = await import('fs');
    const path = await import('path');
    const { v4: uuidv4 } = await import('uuid');

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const id = uuidv4();
    const ext = path.extname(file.name);
    const filename = `${id}${ext}`;
    const filePath = path.join(uploadsDir, filename);

    fs.writeFileSync(filePath, buffer);

    const publicPath = `/uploads/${filename}`;
    
    db.prepare('INSERT INTO images (id, filename, path, createdAt) VALUES (?, ?, ?, ?)').run(id, file.name, publicPath, new Date().toISOString());

    return id;
}

interface GetImagesResult {
    images: {id: string, filename: string, path: string, createdAt: string}[];
    total: number;
}

export async function getImages(page: number = 1, limit: number = 15): Promise<GetImagesResult> {
    const offset = (page - 1) * limit;
    const images = db.prepare('SELECT * FROM images ORDER BY createdAt DESC LIMIT ? OFFSET ?').all(limit, offset) as any[];
    const countResult = db.prepare('SELECT COUNT(*) as count FROM images').get() as { count: number };
    
    return {
        images,
        total: countResult.count
    };
}

export async function deleteImages(ids: string[]) {
    if (ids.length === 0) return;

    try {
        const placeholders = ids.map(() => '?').join(',');
        const images = db.prepare(`SELECT * FROM images WHERE id IN (${placeholders})`).all(...ids) as any[];

        for (const img of images) {
             const filePath = path.join(process.cwd(), 'public', img.path);
             if (fs.existsSync(filePath)) {
                 fs.unlinkSync(filePath);
             }
        }

        db.prepare(`DELETE FROM images WHERE id IN (${placeholders})`).run(...ids);
        revalidatePath('/gallery');
    } catch (error) {
        console.error('Failed to delete images:', error);
        throw new Error('Failed to delete images');
    }
}

