import { ActionDefinition, ActionParameter, InputMapping, WorkflowNode, WorkflowInput } from '@/types/workflow';
import { getActionDefinition } from '@/lib/action-registry';
import { useDataStore } from '@/store/dataStore';
import { useMemo, useState } from 'react';
import { X, HelpCircle, Copy } from 'lucide-react';
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-markdown';
import 'prismjs/themes/prism.css';

interface PropertyPanelProps {
  selectedNode: WorkflowNode | null;
  nodes: WorkflowNode[];
  inputs: WorkflowInput[];
  onUpdate: (nodeId: string, data: Partial<WorkflowNode['data']>) => void;
  onClose: () => void;
}

export function PropertyPanel({ selectedNode, nodes, inputs, onUpdate, onClose }: PropertyPanelProps) {
  const [showHelper, setShowHelper] = useState(false);
  const { workflows } = useDataStore();

  const actionDef = useMemo(() => 
    selectedNode ? getActionDefinition(selectedNode.data.actionId) : null,
  [selectedNode]);

  if (!selectedNode || !actionDef) {
    return null;
  }

  const { label, inputMappings } = selectedNode.data;

  // Combine params and inputs for configuration
  const allInputs = [...(actionDef.parameters || []), ...(actionDef.inputs || [])];

  // Helper to update a specific mapping
  const updateMapping = (paramName: string, type: 'constant'|'variable'|'context', value: string | number | boolean) => {
    const newMappings = { ...inputMappings };
    newMappings[paramName] = { type, value };
    onUpdate(selectedNode.id, { inputMappings: newMappings });
  };

  // Find valid source nodes (all other nodes)
  const sourceNodes = nodes.filter(n => n.id !== selectedNode.id);

  const copyToClipboard = (text: string) => {
      // In a real app we'd use a toast, here just copy
      navigator.clipboard.writeText(text);
  };

  return (
    <div className="w-[640px] bg-white border-l border-slate-200 flex flex-col h-full shadow-xl z-20 absolute right-0 top-0 bottom-0">
      {showHelper && (
          <div className="absolute right-full top-0 w-72 bg-white border border-slate-200 shadow-xl rounded-l-lg mr-1 h-full overflow-y-auto p-4 flex flex-col gap-4 z-50">
              <div className="flex justify-between items-center border-b pb-2">
                  <h4 className="font-semibold text-slate-800">Available Variables</h4>
                  <button onClick={() => setShowHelper(false)}><X size={16} /></button>
              </div>
              
              <div>
                  <h5 className="text-xs font-bold text-slate-500 uppercase mb-2">Inputs</h5>
                  <div className="space-y-1">
                      {inputs.map(inp => (
                          <VariableItem 
                              key={inp.name} 
                              label={inp.label || inp.name} 
                              value={`{{ input.${inp.name} }}`} 
                              onCopy={copyToClipboard} 
                          />
                      ))}
                      {inputs.length === 0 && <div className="text-xs text-slate-400 italic">No inputs defined.</div>}
                  </div>
              </div>
              
              <div>
                  <h5 className="text-xs font-bold text-slate-500 uppercase mb-2">Workspace</h5>
                  <div className="space-y-1">
                      <VariableItem label="Workspace ID" value="{{ workspace.id }}" onCopy={copyToClipboard} />
                      <VariableItem label="Working Directory" value="{{ workspace.workingDirectory }}" onCopy={copyToClipboard} />
                  </div>
              </div>

              <div>
                  <h5 className="text-xs font-bold text-slate-500 uppercase mb-2">Steps</h5>
                  {sourceNodes.map(node => {
                      const def = getActionDefinition(node.data.actionId);
                      if (!def || def.outputs.length === 0) return null;
                      return (
                          <div key={node.id} className="mb-3">
                              <div className="text-sm font-medium text-slate-700 mb-1">{node.data.label}</div>
                              <div className="space-y-1 pl-2 border-l-2 border-slate-100">
                                  {def.outputs.map(out => (
                                      <VariableItem 
                                        key={out.name} 
                                        label={out.name} 
                                        value={`{{ ${node.id}.${out.name} }}`} 
                                        onCopy={copyToClipboard} 
                                      />
                                  ))}
                              </div>
                          </div>
                      );
                  })}
              </div>
          </div>
      )}

      <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
        <h3 className="font-semibold text-slate-800">Configuration</h3>
        <button onClick={onClose} className="text-slate-500 hover:text-slate-700">
            <X size={18} />
        </button>
      </div>

      <div className="p-4 overflow-y-auto flex-1 space-y-6">
        {/* Basic Info */}
        <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 uppercase">Step Label</label>
            <input 
                type="text" 
                value={label}
                onChange={(e) => onUpdate(selectedNode.id, { label: e.target.value })}
                className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
        </div>

        {/* Inputs & Parameters */}
        <div className="space-y-4">
            <div className="flex justify-between items-center border-b pb-1">
                <div className="text-xs font-semibold text-slate-500 uppercase">Inputs & Parameters</div>
                <button 
                    onClick={() => setShowHelper(!showHelper)} 
                    className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-[10px] font-medium"
                    title="Show variable templates"
                >
                    <HelpCircle size={12} /> Variables (?)
                </button>
            </div>
            
            {allInputs.map((param) => {
                const mapping = inputMappings[param.name] || { type: 'constant', value: '' };
                
                return (
                    <div key={param.name} className="space-y-1">
                        <div className="flex justify-between">
                            <label className="text-sm font-medium text-slate-700" title={param.description}>{(param as ActionParameter).label || param.name}</label>
                            <span className="text-[10px] text-slate-400">{param.type}</span>
                        </div>
                        
                        {/* Type Selector */}
                        <select 
                            value={mapping.type}
                            onChange={(e) => updateMapping(param.name, e.target.value as 'constant' | 'variable' | 'context', '')}
                            className="w-full p-1 text-xs border border-slate-300 rounded mb-1 bg-slate-50"
                        >
                            <option value="constant">Constant</option>
                            <option value="variable">Output from Step</option>
                            <option value="context">Workspace Context</option>
                        </select>

                        {/* Value Input */}
                        {mapping.type === 'constant' && (
                             param.type === 'workflow-id' ? (
                                <select 
                                    value={String(mapping.value)}
                                    onChange={(e) => updateMapping(param.name, 'constant', e.target.value)}
                                    className="w-full p-2 border border-slate-300 rounded text-sm"
                                >
                                    <option value="">-- Select Workflow --</option>
                                    {workflows.map(wf => (
                                        <option key={wf.id} value={wf.id}>{wf.name}</option>
                                    ))}
                                </select>
                             ) : param.type === 'boolean' ? (
                                <select 
                                    value={String(mapping.value)}
                                    onChange={(e) => updateMapping(param.name, 'constant', e.target.value === 'true')}
                                    className="w-full p-2 border border-slate-300 rounded text-sm"
                                >
                                    <option value="false">False</option>
                                    <option value="true">True</option>
                                </select>
                             ) : (
                                <div className="border border-slate-300 rounded overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 bg-slate-50">
                                    <Editor
                                        value={String(mapping.value)}
                                        onValueChange={code => updateMapping(param.name, 'constant', param.type === 'number' ? Number(code) : code)}
                                        highlight={code => highlight(code, languages.markdown || languages.js, 'markdown')}
                                        padding={10}
                                        style={{
                                            fontFamily: 'monospace',
                                            fontSize: 12,
                                            minHeight: '60px',
                                        }}
                                        className="min-h-[60px]"
                                    />
                                </div>
                             )
                        )}

                        {mapping.type === 'context' && (
                            <select
                                value={String(mapping.value)}
                                onChange={(e) => updateMapping(param.name, 'context', e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded text-sm"
                            >
                                <option value="">Select context key...</option>
                                <option value="workingDir">Working Directory</option>
                                <option value="workflowId">Workflow ID</option>
                                <option value="workspaceId">Workspace ID</option>
                            </select>
                        )}

                        {mapping.type === 'variable' && (
                            <div className="space-y-1">
                                <select
                                    value={typeof mapping.value === 'string' ? mapping.value.split('.')[0] : ''} // basic heuristic
                                    onChange={(e) => updateMapping(param.name, 'variable', e.target.value)} // Resets output selection
                                    className="w-full p-2 border border-slate-300 rounded text-sm"
                                >
                                    <option value="">Select Step...</option>
                                    {sourceNodes.map(node => (
                                        <option key={node.id} value={node.id}>{node.data.label}</option>
                                    ))}
                                </select>
                                
                                {mapping.value && !showOutputSelector(mapping.value) && (
                                     <div className="text-[10px] text-orange-500">Select an output below</div>
                                )}
                                
                                {typeof mapping.value === 'string' && mapping.value.indexOf('.') === -1 && getNodeById(nodes, mapping.value) && (
                                   <select
                                       value=""
                                       onChange={(e) => updateMapping(param.name, 'variable', `${mapping.value}.${e.target.value}`)}
                                       className="w-full p-2 border border-slate-300 rounded text-sm bg-blue-50"
                                   >
                                        <option value="">Select Output...</option>
                                        {getActionDefinition(getNodeById(nodes, mapping.value as string)!.data.actionId)?.outputs.map(out => (
                                            <option key={out.name} value={out.name}>{out.name} ({out.type})</option>
                                        ))}
                                   </select>
                                )}
                                {typeof mapping.value === 'string' && mapping.value.indexOf('.') > -1 && (
                                    <div className="text-xs text-blue-600 font-mono bg-blue-50 p-1 rounded">
                                        {mapping.value.split('.')[1]} <button className="ml-2 text-slate-400 hover:text-red-500" onClick={() => updateMapping(param.name, 'variable', (mapping.value as string).split('.')[0])}>Change</button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
      </div>
    </div>
  );
}

function getNodeById(nodes: WorkflowNode[], id: string) {
    return nodes.find(n => n.id === id);
}

function showOutputSelector(val: unknown) {
    return typeof val === 'string' && val.includes('.');
}

function VariableItem({ label, value, onCopy }: { label: string, value: string, onCopy: (txt: string) => void }) {
    return (
        <div className="group flex items-center justify-between bg-slate-50 p-1.5 rounded border border-slate-100 hover:border-blue-200 transition-colors cursor-pointer" onClick={() => onCopy(value)}>
            <div className="flex flex-col overflow-hidden">
                <span className="text-xs text-slate-600 truncate">{label}</span>
                <span className="text-[10px] font-mono text-slate-400 truncate">{value}</span>
            </div>
            <Copy size={12} className="text-slate-300 group-hover:text-blue-500" />
        </div>
    );
}
