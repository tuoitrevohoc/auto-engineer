'use client';

import { DragEvent, useCallback, useState, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ActionSidebar } from './ActionSidebar';
import { PropertyPanel } from './PropertyPanel';
import { toast } from 'sonner';
import { StepListItem } from './StepListItem';
import { Workflow, WorkflowNode, WorkflowInput, WorkflowEdge } from '@/types/workflow';
import { getActionDefinition } from '@/lib/action-registry';
import { useDataStore } from '@/store/dataStore';
import { uploadImage } from '@/app/actions';
import { Save, Settings, Trash, Plus, X, ArrowDown, Play } from 'lucide-react';
import { ImageBrowser } from '@/components/common/ImageBrowser';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';

interface WorkflowBuilderProps {
  initialWorkflow: Workflow;
  onSave: (workflow: Workflow) => void;
}

export function WorkflowBuilder({ initialWorkflow, onSave }: WorkflowBuilderProps) {
  const router = useRouter();
  const [nodes, setNodes] = useState<WorkflowNode[]>(initialWorkflow.nodes);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [name, setName] = useState(initialWorkflow.name);
  const [description, setDescription] = useState(initialWorkflow.description || '');
  const [inputs, setInputs] = useState<WorkflowInput[]>(initialWorkflow.inputs || []);
  const [showInputsModal, setShowInputsModal] = useState(false);
  
  // Drag State
  const [draggedNodeIndex, setDraggedNodeIndex] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const handleDragOver = useCallback((e: DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((e: DragEvent, index?: number) => {
      e.preventDefault();
      const actionId = e.dataTransfer.getData('application/reactflow');
      
      // 1. New Action from Sidebar
      if (actionId) {
          const actionDef = getActionDefinition(actionId);
          if (!actionDef) return;

          const newNode: WorkflowNode = {
            id: uuidv4(),
            type: 'stepNode',
            position: { x: 0, y: 0 }, // Unused
            data: { 
                label: actionDef.name, 
                actionId: actionDef.id,
                inputMappings: {},
                executionStatus: 'idle'
            },
          };

          setNodes(prev => {
              const newNodes = [...prev];
              // If index provided, insert there. Else append.
              const insertIdx = index !== undefined ? index : prev.length;
              newNodes.splice(insertIdx, 0, newNode);
              return newNodes;
          });
          setSelectedNodeId(newNode.id);
          return;
      }

      // 2. Reordering Existing Node
      if (draggedNodeIndex !== null) {
         let targetIndex = index !== undefined ? index : nodes.length;
         
         // If dropping on itself, do nothing
         if (targetIndex === draggedNodeIndex) {
             setDraggedNodeIndex(null);
             return;
         }

         setNodes(prev => {
             const newNodes = [...prev];
             const [moved] = newNodes.splice(draggedNodeIndex, 1);
             
             if (draggedNodeIndex < targetIndex) {
                 targetIndex = Math.max(0, targetIndex - 1); 
             }
             
             newNodes.splice(targetIndex, 0, moved);
             return newNodes;
         });
         
         setDraggedNodeIndex(null);
      }
  }, [draggedNodeIndex, nodes]);

  const handleUpdateNode = (nodeId: string, data: Partial<WorkflowNode['data']>) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return { ...node, data: { ...node.data, ...data } };
        }
        return node;
      })
    );
  };
  
  const handleDeleteNode = (nodeId: string) => {
      setNodes(prev => prev.filter(n => n.id !== nodeId));
      if (selectedNodeId === nodeId) setSelectedNodeId(null);
  };

  const saveWorkflowState = useCallback(async () => {
    // Generate sequential edges
    const generatedEdges: WorkflowEdge[] = [];
    for (let i = 0; i < nodes.length - 1; i++) {
        generatedEdges.push({
            id: `e-${nodes[i].id}-${nodes[i+1].id}`,
            source: nodes[i].id,
            target: nodes[i+1].id,
            type: 'default'
        });
    }

    const updatedWorkflow: Workflow = {
        ...initialWorkflow,
        name,
        description,
        nodes: nodes.map((n, i) => ({ ...n, position: { x: 0, y: i * 100 } })),
        edges: generatedEdges,
        inputs,
        updatedAt: new Date().toISOString()
    };
    try {
      await useDataStore.getState().updateWorkflow(initialWorkflow.id, updatedWorkflow);
      onSave(updatedWorkflow);
      return updatedWorkflow;
    } catch (error) {
      console.error('Failed to save workflow:', error);
      throw error;
    }
  }, [nodes, inputs, initialWorkflow, name, description, onSave]);

  const handleSave = async () => {
      try {
          await saveWorkflowState();
          toast.success('Workflow saved successfully');
      } catch (e) {
          toast.error('Failed to save workflow');
      }
  };

  const handleRun = async () => {
      try {
        await saveWorkflowState();
        
        const { workspaces, createRun } = useDataStore.getState();
        if (workspaces.length === 0) {
            toast.error('No workspaces found. Create one first.');
            return;
        }

        const runId = uuidv4();
        // Use first workspace as default
        const workspaceId = workspaces[0].id;

        const newRun: any = { // Use any to bypass strict type check on import if needed, but type matches
            id: runId,
            workflowId: initialWorkflow.id,
            workspaceId,
            status: 'running',
            steps: {},
            variables: {},
            userLogs: [],
            inputValues: {}, 
            startTime: Date.now(),
            description: `Manual run of ${name}`
        };
        
        createRun(newRun);
        toast.success('Run started');
        router.push(`/workspaces/${workspaceId}`);
      } catch (e) {
          toast.error('Failed to start run');
          console.error(e);
      }
  };

  const selectedNode = nodes.find(n => n.id === selectedNodeId) as WorkflowNode || null;

  return (
    <div className="flex h-full flex-col">
       {/* Toolbar */}
       <div className="h-14 border-b bg-white flex items-center justify-between px-4 gap-4 flex-shrink-0">
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
          <div className="flex items-center gap-2">
            <button 
                onClick={() => setShowInputsModal(true)}
                className="flex items-center gap-2 bg-white text-slate-600 border border-slate-300 px-3 py-1.5 rounded text-sm hover:bg-slate-50 transition-colors"
                >
                <Settings size={16} /> Inputs ({inputs.length})
            </button>
            <button 
                onClick={handleSave}
                className="flex items-center gap-2 bg-white text-slate-700 border border-slate-300 px-3 py-1.5 rounded text-sm hover:bg-slate-50 transition-colors"
            >
                <Save size={16} /> Save
            </button>
            <button 
                onClick={handleRun}
                className="flex items-center gap-2 bg-green-600 text-white px-3 py-1.5 rounded text-sm hover:bg-green-700 transition-colors"
            >
                <Play size={16} /> Run
            </button>
          </div>
       </div>

       <div className="flex-1 flex overflow-hidden">
          <ActionSidebar />
          
          <div 
            className="flex-1 relative bg-slate-50 flex overflow-hidden" 
            ref={containerRef}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e)}
          >
             {/* Center Column */}
             <div className="flex-1 overflow-y-auto p-8">
                <div className="max-w-2xl mx-auto space-y-4 pb-20">
                    
                    {nodes.length === 0 && (
                        <div className="border-2 border-dashed border-slate-300 rounded-lg p-12 text-center text-slate-400">
                            <p>Drag actions here to start building your workflow</p>
                        </div>
                    )}

                    {nodes.map((node, index) => (
                        <div key={node.id} className="relative group/wrapper">
                            {/* Insert Step Here (Top Zone - optional but native drop typically implies before) */}
                            {/* We just use the Item as drop zone for "Before" */}
                            
                            <div 
                                draggable
                                onDragStart={(e) => {
                                    setDraggedNodeIndex(index);
                                    e.stopPropagation(); 
                                }}
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                }}
                                onDrop={(e) => {
                                    e.stopPropagation();
                                    handleDrop(e, index);
                                }}
                                className="transition-transform active:scale-[0.99]"
                            >
                                <StepListItem 
                                    node={node} 
                                    index={index} 
                                    selected={selectedNodeId === node.id}
                                    onSelect={() => setSelectedNodeId(node.id)}
                                    onDelete={() => handleDeleteNode(node.id)}
                                />
                            </div>

                            {/* Arrow Connector */}
                            {index < nodes.length - 1 && (
                                <div className="flex justify-center py-2 text-slate-300">
                                    <ArrowDown size={20} />
                                </div>
                            )}
                        </div>
                    ))}
                    
                    {/* Final Drop Zone (Append) */}
                     {nodes.length > 0 && <div className="flex justify-center py-2 text-slate-300"><ArrowDown size={20} /></div> }

                     <div 
                        className={clsx(
                            "h-24 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center text-slate-400 transition-colors cursor-default",
                            "hover:border-blue-400 hover:bg-blue-50/50"
                        )}
                        onDragOver={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                        }}
                        onDrop={(e) => {
                            e.stopPropagation();
                            handleDrop(e, nodes.length);
                        }}
                    >
                        <Plus size={24} />
                        <span className="ml-2">Add Step</span>
                    </div>

                </div>
             </div>

             {/* Right Panel */}
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
    const [showImageBrowserFor, setShowImageBrowserFor] = useState<number | null>(null);

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
                    <p className="text-sm text-slate-600">Define global variables that can be used in your workflow steps using <code>{`{{ inp.name }}`}</code>.</p>
                    
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
                                            <option value="image">Image</option>
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
                                        {input.type === 'image' ? (
                                            <div className="space-y-1">
                                                 {input.defaultValue && <div className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded truncate border border-green-200">ID: {input.defaultValue}</div>}
                                                 <div className="flex gap-1">
                                                     <input 
                                                         type="file" 
                                                         accept="image/*"
                                                         onChange={async (e) => {
                                                             const file = e.target.files?.[0];
                                                             if (file) {
                                                                 if (file.size > 10 * 1024 * 1024) {
                                                                     toast.error('File too large. Max 10MB.');
                                                                     return;
                                                                 }
                                                                 const formData = new FormData();
                                                                 formData.append('file', file);
                                                                 try {
                                                                    const id = await uploadImage(formData);
                                                                    updateInput(idx, 'defaultValue', id);
                                                                    toast.success('Image uploaded');
                                                                 } catch(e) { toast.error('Upload failed'); }
                                                             }
                                                         }}
                                                         className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                                     />
                                                     <button
                                                        onClick={() => setShowImageBrowserFor(idx)}
                                                        className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs hover:bg-slate-200 border border-slate-200"
                                                        title="Browse existing images"
                                                     >
                                                         Browse
                                                     </button>
                                                 </div>
                                            </div>
                                        ) : (
                                            <input 
                                                value={String(input.defaultValue || '')} 
                                                onChange={(e) => updateInput(idx, 'defaultValue', e.target.value)}
                                                placeholder="Default..."
                                                className="w-full p-1.5 border border-slate-300 rounded text-sm"
                                            />
                                        )}
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

            <ImageBrowser 
                isOpen={showImageBrowserFor !== null}
                onClose={() => setShowImageBrowserFor(null)}
                onSelect={(id) => {
                    if (showImageBrowserFor !== null) {
                        updateInput(showImageBrowserFor, 'defaultValue', id);
                    }
                }}
            />
        </div>
    );
}

