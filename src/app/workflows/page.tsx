'use client';

import { useDataStore } from '@/store/dataStore';
import { Workflow } from '@/types/workflow';
import { Plus, Trash2, Edit, Download, Upload, CheckSquare, Square } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';

export default function WorkflowsPage() {
  const { workflows, addWorkflow, deleteWorkflow } = useDataStore();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => setMounted(true), 0);
  }, []);

  if (!mounted) return <div className="p-8">Loading...</div>;

  const handleCreate = () => {
    const newWorkflow: Workflow = {
      id: uuidv4(),
      name: 'New Workflow',
      nodes: [],
      edges: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    addWorkflow(newWorkflow);
    router.push(`/workflows/${newWorkflow.id}`);
  };

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
      if (selectedIds.size === workflows.length) {
          setSelectedIds(new Set());
      } else {
          setSelectedIds(new Set(workflows.map(w => w.id)));
      }
  };

  const handleExport = () => {
      if (selectedIds.size === 0) return;
      const workflowsToExport = workflows.filter(w => selectedIds.has(w.id));
      const dataStr = JSON.stringify(workflowsToExport, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `workflows_export_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
      fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const json = JSON.parse(event.target?.result as string);
              if (Array.isArray(json)) {
                  let count = 0;
                  json.forEach((wf: any) => {
                      if (wf.nodes && wf.edges) { // precise check?
                          // Regenerate ID to avoid collisions
                          const newId = uuidv4();
                          const newWorkflow: Workflow = {
                              ...wf,
                              id: newId,
                              name: `${wf.name} (Imported)`,
                              createdAt: new Date().toISOString(),
                              updatedAt: new Date().toISOString()
                          };
                          addWorkflow(newWorkflow);
                          count++;
                      }
                  });
                  alert(`Imported ${count} workflows.`);
              } else {
                  alert('Invalid JSON format. Expected an array of workflows.');
              }
          } catch (err) {
              console.error(err);
              alert('Failed to parse JSON.');
          }
          // Reset input
          if (fileInputRef.current) fileInputRef.current.value = '';
      };
      reader.readAsText(file);
  };

  return (
    <div className="p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-slate-800">Workflows</h1>
        
        <div className="flex items-center gap-3">
             <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".json" />
             
             <button
              onClick={handleImportClick}
              className="flex items-center gap-2 bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-md hover:bg-slate-50 transition shadow-sm"
            >
              <Upload size={18} /> Import
            </button>

             {selectedIds.size > 0 && (
                <button
                  onClick={handleExport}
                  className="flex items-center gap-2 bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-md hover:bg-slate-50 transition shadow-sm"
                >
                  <Download size={18} /> Export ({selectedIds.size})
                </button>
             )}

            <button
              onClick={handleCreate}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition shadow-sm"
            >
              <Plus size={18} /> New Workflow
            </button>
        </div>
      </div>

      {workflows.length > 0 && (
          <div className="mb-4 flex items-center gap-2">
              <button onClick={toggleSelectAll} className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 font-medium">
                  {selectedIds.size === workflows.length && workflows.length > 0 ? <CheckSquare size={18} className="text-blue-600" /> : <Square size={18} />}
                  Select All
              </button>
          </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {workflows.map((wf) => {
          const isSelected = selectedIds.has(wf.id);
          return (
            <div key={wf.id} 
                className={`bg-white p-6 rounded-lg shadow border transition-colors relative group ${isSelected ? 'border-blue-500 ring-1 ring-blue-500' : 'border-slate-200 hover:border-blue-300'}`}
                onClick={() => toggleSelection(wf.id)}
            >
              {/* Selection Checkbox */}
              <div className="absolute top-4 right-4 z-10">
                   <div 
                      className={`w-5 h-5 rounded border flex items-center justify-center cursor-pointer ${isSelected ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300 group-hover:border-blue-400'}`}
                   >
                       {isSelected && <div className="w-2.5 h-2.5 bg-white rounded-sm" />}
                   </div>
              </div>

              <div className="flex justify-between items-start mb-4 pr-8">
                 <div className="w-full">
                    <div className="flex justify-between items-start mb-2">
                      <h2 className="text-xl font-semibold text-slate-800 break-words flex-1 pr-2">{wf.name}</h2>
                    </div>
                    {wf.description && (
                        <p className="text-sm text-slate-500 mb-4 line-clamp-2">{wf.description}</p>
                    )}
                    <div className="flex justify-between items-center text-xs text-slate-400 mt-auto">
                       <span className="bg-slate-100 px-2 py-1 rounded">{wf.nodes.length} Steps</span>
                    </div>
                 </div>
              </div>
              
              <div className="mt-6 flex justify-between items-center border-t border-slate-50 pt-4" onClick={e => e.stopPropagation()}>
                 <Link href={`/workflows/${wf.id}`} className="text-blue-600 font-medium hover:underline flex items-center gap-1">
                    Edit Workflow <Edit size={16} />
                 </Link>
                 
                 <button onClick={() => deleteWorkflow(wf.id)} className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-colors" title="Delete">
                    <Trash2 size={16} />
                 </button>
              </div>
            </div>
          );
        })}

        {workflows.length === 0 && (
            <div className="col-span-full text-center py-12 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                <div className="text-slate-500 mb-2">No workflows found</div>
                <button onClick={handleCreate} className="text-blue-600 hover:underline">Create your first workflow</button>
            </div>
        )}
      </div>
    </div>
  );
}
