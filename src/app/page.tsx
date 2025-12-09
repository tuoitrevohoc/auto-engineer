import { getRuns, getWorkflows, getWorkspaces } from './actions';
import Link from 'next/link';
import { Play, PauseCircle, ArrowRight, Loader2, Clock } from 'lucide-react';

export default async function Home() {
  const [runs, workflows, workspaces] = await Promise.all([
      getRuns(),
      getWorkflows(),
      getWorkspaces()
  ]);

  const activeRuns = runs.filter(r => r.status === 'running' || r.status === 'paused');

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-center border-b pb-4">
          <h1 className="text-3xl font-bold text-slate-800">Dashboard</h1>
          <div className="text-slate-500 text-sm">
            {activeRuns.length} Active Run{activeRuns.length !== 1 ? 's' : ''}
          </div>
      </div>

      <section>
         <h2 className="text-xl font-semibold mb-4 text-slate-700 flex items-center gap-2">
            {activeRuns.length > 0 ? <Loader2 className="animate-spin text-blue-500" /> : <Clock className="text-slate-400" />}
            Pending & Active Runs
         </h2>
         
         {activeRuns.length === 0 ? (
             <div className="text-slate-500 bg-slate-50 p-12 rounded-lg border border-slate-200 text-center flex flex-col items-center gap-3">
                 <div className="bg-white p-3 rounded-full shadow-sm"><CheckCircleIcon className="text-green-500" size={32} /></div>
                 <div>
                    <div className="font-medium text-slate-700">All caught up!</div>
                    <div className="text-sm">No workflows are currently running.</div>
                 </div>
                 <Link href="/workspaces" className="mt-4 text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1">
                    Start a new run <ArrowRight size={14} />
                 </Link>
             </div>
         ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {activeRuns.map(run => {
                     const wf = workflows.find(w => w.id === run.workflowId);
                     const ws = workspaces.find(w => w.id === run.workspaceId);
                     return (
                         <Link 
                            key={run.id}
                            href={`/workspaces/${run.workspaceId}/runs/${run.id}`}
                            className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all group"
                         >
                             <div className="flex justify-between items-start mb-4">
                                 <div className={`px-2 py-1 rounded text-xs font-semibold uppercase ${
                                     run.status === 'running' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'
                                 }`}>
                                     {run.status === 'running' ? <span className="flex items-center gap-1"><Loader2 size={12} className="animate-spin"/> Running</span> : <span className="flex items-center gap-1"><PauseCircle size={12}/> Paused</span>}
                                 </div>
                                 <span className="text-xs text-slate-400 font-mono">
                                     {((Date.now() - run.startTime) / 1000).toFixed(0)}s ago
                                 </span>
                             </div>
                             
                             <h3 className="font-bold text-slate-800 text-lg mb-1 group-hover:text-blue-600 transition-colors">
                                 {wf?.name || 'Unknown Workflow'}
                             </h3>
                             <div className="text-sm text-slate-500 mb-4 flex items-center gap-2">
                                 <span className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono">{ws?.name || 'Unknown Workspace'}</span>
                             </div>

                             {run.description && (
                                 <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded border border-slate-100 line-clamp-3 mb-4">
                                     {run.description}
                                 </div>
                             )}

                             <div className="flex items-center text-blue-600 text-sm font-medium mt-auto">
                                 View Details <ArrowRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
                             </div>
                         </Link>
                     );
                 })}
             </div>
         )}
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
          <Link href="/workspaces" className="block p-6 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl text-white shadow-lg hover:shadow-xl transition-shadow">
              <h3 className="text-xl font-bold mb-2">My Workspaces</h3>
              <p className="text-slate-300 opacity-80">Manage your projects and environments.</p>
          </Link>
          <Link href="/workflows" className="block p-6 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl text-white shadow-lg hover:shadow-xl transition-shadow">
              <h3 className="text-xl font-bold mb-2">Workflow Library</h3>
              <p className="text-blue-100 opacity-80">Design and configure automation workflows.</p>
          </Link>
      </div>
    </div>
  );
}

function CheckCircleIcon({ size, className }: { size?: number, className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
    );
}
