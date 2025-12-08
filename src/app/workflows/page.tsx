'use client';

import { useDataStore } from '@/store/dataStore';
import { Workflow } from '@/types/workflow';
import { Plus, Trash2, Edit } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

export default function WorkflowsPage() {
  const { workflows, addWorkflow, deleteWorkflow } = useDataStore();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

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

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Workflows</h1>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
        >
          <Plus size={18} /> New Workflow
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {workflows.map((wf) => (
          <div key={wf.id} className="bg-white p-6 rounded-lg shadow border border-slate-200 hover:border-blue-300 transition-colors">
            <div className="flex justify-between items-start mb-4">
               <div>
                  <div className="flex justify-between items-start mb-2">
                    <h2 className="text-xl font-semibold text-slate-800 break-words flex-1 pr-2">{wf.name}</h2>
                    <div className="flex space-x-2">
                      <Link href={`/workflows/${wf.id}`} className="text-slate-400 hover:text-blue-600 transition-colors">
                        <Edit size={18} />
                      </Link>
                      {/* Delete button (simulated) */}
                      <button onClick={() => deleteWorkflow(wf.id)} className="text-slate-400 hover:text-red-500 p-1">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  {wf.description && (
                      <p className="text-sm text-slate-500 mb-4 line-clamp-2">{wf.description}</p>
                  )}
                  <div className="flex justify-between items-center text-xs text-slate-400 mt-auto">
                     <span className="bg-slate-100 px-2 py-1 rounded">{wf.nodes.length} Steps</span>
                  </div>
               </div>
            </div>
            
            <div className="mt-6 flex justify-end">
               <Link href={`/workflows/${wf.id}`} className="text-blue-600 font-medium hover:underline flex items-center gap-1">
                  Edit Workflow <Edit size={16} />
               </Link>
            </div>
          </div>
        ))}

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
