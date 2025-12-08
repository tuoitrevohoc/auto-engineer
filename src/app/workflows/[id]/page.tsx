'use client';

import { WorkflowBuilder } from '@/components/workflow/WorkflowBuilder';
import { useDataStore } from '@/store/dataStore';
import { Workflow } from '@/types/workflow';
import { useParams } from 'next/navigation';

export default function WorkflowEditorPage() {
  const params = useParams();
  const id = params.id as string;
  const { workflows, updateWorkflow } = useDataStore();
  
  const workflow = workflows.find((w) => w.id === id);

  if (!workflow) return <div className="p-8">Workflow not found</div>;

  const handleSave = (updated: Workflow) => {
    updateWorkflow(id, updated);
    // Optionally show a toast or feedback
    alert('Saved!');
  };

  return (
    <div className="h-[calc(100vh-64px)]"> {/* Adjust for layout? Navbar is sidebar, so 100vh is fine */}
      <div className="h-screen flex flex-col">
         <WorkflowBuilder initialWorkflow={workflow} onSave={handleSave} />
      </div>
    </div>
  );
}
