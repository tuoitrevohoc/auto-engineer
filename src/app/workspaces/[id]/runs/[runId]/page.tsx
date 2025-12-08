'use client';

import { WorkflowRunView } from '@/components/runner/WorkflowRunView';
import { useDataStore } from '@/store/dataStore';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function RunPage() {
  const params = useParams();
  const workspaceId = params.id as string;
  const runId = params.runId as string;
  
  const { runs, workflows, workspaces } = useDataStore();
  
  const run = runs.find(r => r.id === runId);
  const workflow = run ? workflows.find(w => w.id === run.workflowId) : undefined;
  const workspace = workspaces.find(w => w.id === workspaceId);

  if (!run || !workflow || !workspace) return <div className="p-8">Loading or Not Found...</div>;
  
  const data = { run, workflow, workspace }; 

  return (
    <div className="flex flex-col h-full">
        <div className="h-12 bg-white border-b flex items-center px-4 gap-4">
            <Link href={`/workspaces/${workspaceId}`} className="text-slate-500 hover:text-slate-700">
                <ArrowLeft size={20} />
            </Link>
            <div className="font-semibold text-slate-700">
                Run: {data.workflow.name} <span className="text-slate-400 font-normal text-sm">({runId.slice(0, 8)})</span>
            </div>
        </div>
        <div className="flex-1 overflow-hidden">
            <WorkflowRunView run={data.run} workflow={data.workflow} workspace={data.workspace} />
        </div>
    </div>
  );
}
