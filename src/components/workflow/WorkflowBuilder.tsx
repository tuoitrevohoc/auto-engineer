'use client';

import { 
  ReactFlow, 
  Background, 
  Controls, 
  useNodesState, 
  useEdgesState, 
  addEdge, 
  Connection, 
  Node,
  ReactFlowProvider,
  useReactFlow 
} from '@xyflow/react';
import '@xyflow/react/dist/style.css'; 
import '@xyflow/react/dist/style.css';

import { DragEvent, useCallback, useState, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ActionSidebar } from './ActionSidebar';
import { PropertyPanel } from './PropertyPanel';
import { toast } from 'sonner';
import { StepNode } from './StepNode';
import { Workflow, WorkflowNode } from '@/types/workflow';
import { getActionDefinition } from '@/lib/action-registry';
import { useDataStore } from '@/store/dataStore';
import { Save } from 'lucide-react';

const nodeTypes = {
  stepNode: StepNode,
};

interface WorkflowBuilderProps {
  initialWorkflow: Workflow;
  onSave: (workflow: Workflow) => void;
}

function BuilderContent({ initialWorkflow, onSave }: WorkflowBuilderProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialWorkflow.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialWorkflow.edges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [name, setName] = useState(initialWorkflow.name);
  const [description, setDescription] = useState(initialWorkflow.description || '');
  const { screenToFlowPosition, fitView } = useReactFlow();

  const onConnect = useCallback((params: Connection) => {
    setEdges((eds) => addEdge(params, eds));
  }, [setEdges]);

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();

      const actionId = event.dataTransfer.getData('application/reactflow');
      const actionDef = getActionDefinition(actionId);

      if (!actionDef) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: WorkflowNode = {
        id: uuidv4(),
        type: 'stepNode',
        position,
        data: { 
            label: actionDef.name, 
            actionId: actionDef.id,
            inputMappings: {},
            executionStatus: 'idle'
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition, setNodes]
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  const handleUpdateNode = (nodeId: string, data: Partial<WorkflowNode['data']>) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          node.data = { ...node.data, ...data };
        }
        return node;
      })
    );
  };

  const handleSave = useCallback(async () => {
    const updatedWorkflow: Workflow = {
        ...initialWorkflow,
        name,
        description,
        nodes,
        edges,
        updatedAt: new Date().toISOString()
    };
    try {
      await useDataStore.getState().updateWorkflow(initialWorkflow.id, updatedWorkflow);
      toast.success('Workflow saved successfully');
      onSave(updatedWorkflow);
    } catch (error) {
      console.error('Failed to save workflow:', error);
      toast.error('Failed to save workflow');
    }
  }, [nodes, edges, initialWorkflow, name, description, onSave]);

  const selectedNode = nodes.find(n => n.id === selectedNodeId) as WorkflowNode || null;

  return (
    <div className="flex h-full flex-col">
       {/* Toolbar */}
       <div className="h-14 border-b bg-white flex items-center justify-between px-4 gap-4">
           <div className="flex flex-col">
               <input 
                 value={name} 
                 onChange={(e) => setName(e.target.value)}
                 className="font-semibold text-slate-700 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none px-1"
                 placeholder="Workflow Name"
               />
               <input 
                 value={description} 
                 onChange={(e) => setDescription(e.target.value)}
                 className="text-xs text-slate-500 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none px-1 w-96 placeholder:italic"
                 placeholder="Description (optional)"
               />
           </div>
          <button 
             onClick={handleSave}
             className="flex items-center gap-2 bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700 transition-colors"
          >
            <Save size={16} /> Save
          </button>
       </div>

       <div className="flex-1 flex overflow-hidden">
          <ActionSidebar />
          
          <div className="flex-1 relative bg-slate-100" ref={reactFlowWrapper}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onInit={() => fitView()}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onNodeClick={onNodeClick}
                onPaneClick={onPaneClick}
                nodeTypes={nodeTypes}
                fitView
            >
                <Background />
                <Controls />
            </ReactFlow>

            {selectedNodeId && (
                <PropertyPanel 
                    selectedNode={selectedNode} 
                    nodes={nodes}
                    onUpdate={handleUpdateNode}
                    onClose={() => setSelectedNodeId(null)}
                />
            )}
          </div>
       </div>
    </div>
  );
}

export function WorkflowBuilder(props: WorkflowBuilderProps) {
    return (
        <ReactFlowProvider>
            <BuilderContent {...props} />
        </ReactFlowProvider>
    );
}
