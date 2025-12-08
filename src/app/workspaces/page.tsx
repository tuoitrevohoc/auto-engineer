'use client';

import { useDataStore } from '@/store/dataStore';
import { Workspace } from '@/types/workflow';
import { Plus, FolderGit2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

export default function WorkspacesPage() {
  const { workspaces, addWorkspace } = useDataStore();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTimeout(() => setMounted(true), 0);
  }, []);

  if (!mounted) return <div className="p-8">Loading...</div>;

  const handleCreate = () => {
    const id = uuidv4();
    const newWorkspace: Workspace = {
      id,
      name: `Workspace ${workspaces.length + 1}`,
      workingDirectory: `/tmp/auto-engineer/${id.slice(0, 8)}`,
      createdAt: new Date().toISOString(),
    };
    addWorkspace(newWorkspace);
    router.push(`/workspaces/${id}`);
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Workspaces</h1>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
        >
          <Plus size={18} /> New Workspace
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {workspaces.map((ws) => (
          <Link href={`/workspaces/${ws.id}`} key={ws.id} className="block group">
            <div className="bg-white p-6 rounded-lg shadow border border-slate-200 group-hover:border-blue-400 transition-all">
                <div className="flex items-center gap-3 mb-3">
                    <div className="bg-blue-100 text-blue-600 p-2 rounded">
                        <FolderGit2 size={24} />
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg text-slate-800">{ws.name}</h3>
                        <div className="text-xs text-slate-500 font-mono">{ws.workingDirectory}</div>
                    </div>
                </div>
                <div className="text-sm text-slate-500 mt-4">
                    Created {new Date(ws.createdAt).toLocaleDateString()}
                </div>
            </div>
          </Link>
        ))}
        
        {workspaces.length === 0 && (
             <div className="col-span-full text-center py-12 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                <div className="text-slate-500 mb-2">No workspaces found</div>
                <button onClick={handleCreate} className="text-blue-600 hover:underline">Create your first workspace</button>
            </div>
        )}
      </div>
    </div>
  );
}
