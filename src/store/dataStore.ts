import { create } from 'zustand';
import { Workflow, Workspace, WorkflowRun } from '@/types/workflow';
import { 
  getWorkflows, saveWorkflow, deleteWorkflowAction, 
  getWorkspaces, createWorkspaceAction, updateWorkspaceAction, deleteWorkspaceAction,
  getRuns, saveRun, deleteRun, cancelRun
} from '@/app/actions';

interface DataState {
  workflows: Workflow[];
  workspaces: Workspace[];
  runs: WorkflowRun[];

  // Actions
  addWorkflow: (workflow: Workflow) => void;
  updateWorkflow: (id: string, workflow: Partial<Workflow>) => void;
  deleteWorkflow: (id: string) => void;

  addWorkspace: (workspace: Workspace) => void;
  updateWorkspace: (id: string, updates: Partial<Workspace>) => void;
  deleteWorkspace: (id: string) => void;
  
  createRun: (run: WorkflowRun) => void;
  updateRun: (id: string, run: Partial<WorkflowRun>) => void;
  syncRuns: (runs: WorkflowRun[]) => void;
  deleteRun: (id: string) => void;
  cancelRun: (id: string) => void;
  
  // Seed/Init
  init: () => Promise<void>;
}

export const useDataStore = create<DataState>((set, get) => ({
  workflows: [],
  workspaces: [],
  runs: [],

  addWorkflow: (workflow) => {
      set((state) => ({ workflows: [...state.workflows, workflow] }));
      saveWorkflow(workflow).catch(console.error);
  },
  
  updateWorkflow: (id, updates) => {
    const state = get();
    const existing = state.workflows.find(w => w.id === id);
    if (!existing) return;
    
    const updated = { ...existing, ...updates };
    
    set((state) => ({
        workflows: state.workflows.map((w) => (w.id === id ? updated : w)),
    }));
    
    saveWorkflow(updated).catch(console.error);
  },

  deleteWorkflow: (id) => {
      set((state) => ({ workflows: state.workflows.filter((w) => w.id !== id) }));
      deleteWorkflowAction(id).catch(console.error);
  },

  addWorkspace: (workspace) => {
      set((state) => ({ workspaces: [...state.workspaces, workspace] }));
      createWorkspaceAction(workspace).catch(console.error);
  },

  updateWorkspace: (id, updates) => {
    const state = get();
    const existing = state.workspaces.find(w => w.id === id);
    if (!existing) return;
    
    const updated = { ...existing, ...updates };
    
    set((state) => ({
      workspaces: state.workspaces.map((w) => (w.id === id ? updated : w)),
    }));
    
    updateWorkspaceAction(updated).catch(console.error);
  },

  deleteWorkspace: (id) => {
      set((state) => ({ workspaces: state.workspaces.filter((w) => w.id !== id) }));
      deleteWorkspaceAction(id).catch(console.error);
  },

  createRun: (run) => {
      set((state) => ({ runs: [...state.runs, run] }));
      saveRun(run).catch(console.error);
  },

  updateRun: (id, updates) => {
    const state = get();
    const existing = state.runs.find(r => r.id === id);
    if (!existing) return;

    const updated = { ...existing, ...updates };

    set((state) => ({
      runs: state.runs.map((r) => (r.id === id ? updated : r)),
    }));
    
    saveRun(updated).catch(console.error);
  },

  syncRuns: (newRuns) => {
      set((state) => {
          const runMap = new Map(state.runs.map(r => [r.id, r]));
          newRuns.forEach(r => runMap.set(r.id, r));
          return { runs: Array.from(runMap.values()) };
      });
  },

  deleteRun: (id) => {
      set((state) => ({ runs: state.runs.filter((r) => r.id !== id) }));
      deleteRun(id).catch(console.error);
  },

  cancelRun: (id) => {
      const state = get();
      const existing = state.runs.find(r => r.id === id);
      if(!existing) return;
      
      const updated = { ...existing, status: 'cancelled' as const, endTime: Date.now() };
       set((state) => ({
          runs: state.runs.map((r) => (r.id === id ? updated : r))
      }));
      cancelRun(id).catch(console.error);
  },

  init: async () => {
    try {
        const [wfs, wss, rs] = await Promise.all([
            getWorkflows(),
            getWorkspaces(),
            getRuns()
        ]);

        // Seed if empty
        if (wss.length === 0) {
           const defaultWorkspace: Workspace = {
               id: 'default-workspace',
               name: 'Default Workspace',
               workingDirectory: '/tmp/auto-engineer/default',
               createdAt: new Date().toISOString()
           };
           
           const exampleWorkflow: Workflow = {
               id: 'example-wf-1',
               name: 'Example: Repo Scanner',
               description: 'Ask for a repo URL, checkout code, and scan packages.',
               createdAt: new Date().toISOString(),
               updatedAt: new Date().toISOString(),
               nodes: [
                   {
                       id: 'node-1',
                       type: 'stepNode',
                       position: { x: 100, y: 100 },
                       data: {
                           label: 'Ask for Repo URL',
                           actionId: 'user-input',
                           inputMappings: {
                               prompt: { type: 'constant', value: 'Enter Git Repository URL:' },
                               fieldName: { type: 'constant', value: 'repoUrl' }
                           },
                           executionStatus: 'idle'
                       },
                       width: 180,
                       height: 80
                   },
                   {
                       id: 'node-2',
                       type: 'stepNode',
                       position: { x: 100, y: 300 },
                       data: {
                           label: 'Checkout Repo',
                           actionId: 'git-checkout',
                           inputMappings: {
                               repoUrl: { type: 'variable', value: 'node-1.value' }
                           },
                           executionStatus: 'idle'
                       },
                       width: 180,
                       height: 80
                   },
                   {
                       id: 'node-3',
                       type: 'stepNode',
                       position: { x: 100, y: 500 },
                       data: {
                           label: 'List Files',
                           actionId: 'run-command',
                           inputMappings: {
                               command: { type: 'constant', value: 'ls' },
                               args: { type: 'constant', value: '-la' },
                               workingDir: { type: 'variable', value: 'node-2.repoPath' }
                           },
                           executionStatus: 'idle'
                       },
                       width: 180,
                       height: 80
                   }
               ],
               edges: [
                   { id: 'e1-2', source: 'node-1', target: 'node-2' },
                   { id: 'e2-3', source: 'node-2', target: 'node-3' }
               ]
           };

           const childWorkflow: Workflow = {
               id: 'child-wf-1',
               name: 'Child: Process Folder',
               description: 'Sub-workflow for folder processing',
               createdAt: new Date().toISOString(),
               updatedAt: new Date().toISOString(),
               nodes: [
                   {
                       id: 'c-node-1',
                       type: 'stepNode',
                       position: { x: 100, y: 100 },
                       data: {
                           label: 'Run Processing Command',
                           actionId: 'run-command',
                           inputMappings: {
                               command: { type: 'constant', value: 'echo' },
                               args: { type: 'constant', value: 'Processing...' }
                           },
                           executionStatus: 'idle'
                       }
                   },
                   {
                       id: 'c-node-2',
                       type: 'stepNode',
                       position: { x: 100, y: 300 },
                       data: {
                           label: 'Confirm Completion',
                           actionId: 'confirm',
                           inputMappings: {
                               message: { type: 'constant', value: 'Mark this folder as done?' }
                           },
                           executionStatus: 'idle'
                       }
                   }
               ],
               edges: [
                   { id: 'ce-1-2', source: 'c-node-1', target: 'c-node-2' }
               ]
           };
            
           // Optimistic update
           set({ workspaces: [defaultWorkspace], workflows: [exampleWorkflow, childWorkflow], runs: [] });
           
           // Persist Seed
           await createWorkspaceAction(defaultWorkspace);
           await saveWorkflow(exampleWorkflow);
           await saveWorkflow(childWorkflow);
        } else {
            set({ workflows: wfs, workspaces: wss, runs: rs });
        }
    } catch (err) {
        console.error('Failed to init store from DB', err);
    }
  }
}));
