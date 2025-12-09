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
import { Workflow, WorkflowNode, WorkflowInput } from '@/types/workflow';
import { getActionDefinition } from '@/lib/action-registry';
import { useDataStore } from '@/store/dataStore';
import { Save, Settings, Trash, Plus, X } from 'lucide-react';

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
  const [inputs, setInputs] = useState<WorkflowInput[]>(initialWorkflow.inputs || []);
  const [showInputsModal, setShowInputsModal] = useState(false);
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
        inputs,
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
  }, [nodes, edges, inputs, initialWorkflow, name, description, onSave]);

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
          <button 
             onClick={() => setShowInputsModal(true)}
             className="flex items-center gap-2 bg-white text-slate-600 border border-slate-300 px-3 py-1.5 rounded text-sm hover:bg-slate-50 transition-colors"
          >
             <Settings size={16} /> Inputs ({inputs.length})
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
                    inputs={inputs}
                    onUpdate={handleUpdateNode}
                    onClose={() => setSelectedNodeId(null)}
                />
            )}
       </div>
       </div>

       {showInputsModal && (
           <InputsModal 
                inputs={inputs} 
                onChange={setInputs} 
                onClose={() => setShowInputsModal(false)} 
           />
       )}
    </div>
  );
}

function InputsModal({ inputs, onChange, onClose }: { inputs: WorkflowInput[], onChange: (i: WorkflowInput[]) => void, onClose: () => void }) {
    const addInput = () => {
        onChange([...inputs, { name: '', type: 'text', label: '', defaultValue: '' }]);
    };

    const updateInput = (index: number, field: keyof WorkflowInput, value: any) => {
        const newInputs = [...inputs];
        newInputs[index] = { ...newInputs[index], [field]: value };
        onChange(newInputs);
    };

    const removeInput = (index: number) => {
        onChange(inputs.filter((_, i) => i !== index));
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-[600px] max-h-[80vh] flex flex-col">
                <div className="p-4 border-b flex justify-between items-center bg-slate-50 rounded-t-lg">
                    <h3 className="font-semibold text-lg text-slate-800">Workflow Inputs</h3>
                    <button onClick={onClose}><X size={20} className="text-slate-500 hover:text-slate-800" /></button>
                </div>
                
                <div className="p-4 overflow-y-auto flex-1 space-y-4">
                    <p className="text-sm text-slate-600">Define global variables that can be used in your workflow steps using <code>{`{{ input.name }}`}</code>.</p>
                    
                    {inputs.length === 0 && (
                        <div className="text-center py-8 text-slate-400 italic border-2 border-dashed border-slate-200 rounded">
                            No inputs defined.
                        </div>
                    )}

                    {inputs.map((input, idx) => (
                        <div key={idx} className="bg-slate-50 p-3 rounded border border-slate-200 flex gap-3 items-start relative group">
                            <div className="flex-1 space-y-2">
                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <label className="text-xs font-semibold text-slate-500 uppercase">Variable Name</label>
                                        <input 
                                            value={input.name} 
                                            onChange={(e) => updateInput(idx, 'name', e.target.value)}
                                            placeholder="e.g. environment"
                                            className="w-full p-1.5 border border-slate-300 rounded text-sm"
                                        />
                                    </div>
                                    <div className="w-1/3">
                                        <label className="text-xs font-semibold text-slate-500 uppercase">Type</label>
                                        <select 
                                            value={input.type}
                                            onChange={(e) => updateInput(idx, 'type', e.target.value)}
                                            className="w-full p-1.5 border border-slate-300 rounded text-sm"
                                        >
                                            <option value="text">Text</option>
                                            <option value="number">Number</option>
                                            <option value="boolean">Boolean</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                     <div className="flex-1">
                                        <label className="text-xs font-semibold text-slate-500 uppercase">Label (Optional)</label>
                                        <input 
                                            value={input.label || ''} 
                                            onChange={(e) => updateInput(idx, 'label', e.target.value)}
                                            placeholder="User-friendly label"
                                            className="w-full p-1.5 border border-slate-300 rounded text-sm"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-xs font-semibold text-slate-500 uppercase">Default Value</label>
                                        <input 
                                            value={String(input.defaultValue || '')} 
                                            onChange={(e) => updateInput(idx, 'defaultValue', e.target.value)}
                                            placeholder="Default..."
                                            className="w-full p-1.5 border border-slate-300 rounded text-sm"
                                        />
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => removeInput(idx)} className="text-slate-400 hover:text-red-500 mt-6">
                                <Trash size={18} />
                            </button>
                        </div>
                    ))}
                </div>

                <div className="p-4 border-t bg-slate-50 rounded-b-lg flex justify-between">
                     <button onClick={addInput} className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center gap-1">
                         <Plus size={16} /> Add Input
                     </button>
                     <button onClick={onClose} className="bg-slate-800 text-white px-4 py-2 rounded text-sm hover:bg-slate-900">
                         Done
                     </button>
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
