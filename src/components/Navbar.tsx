import Link from 'next/link';
import { Home, Workflow, FolderGit2, Settings, Image } from 'lucide-react';

export function Navbar() {
  return (
    <nav className="h-screen w-64 bg-slate-900 text-white flex flex-col p-4 border-r border-slate-800">
      <div className="text-2xl font-bold mb-8 text-blue-400">AutoEngineer</div>
      
      <div className="space-y-2">
        <Link href="/" className="flex items-center gap-3 p-3 hover:bg-slate-800 rounded-md transition-colors">
          <Home size={20} />
          <span>Dashboard</span>
        </Link>
        <Link href="/workflows" className="flex items-center gap-3 p-3 hover:bg-slate-800 rounded-md transition-colors">
          <Workflow size={20} />
          <span>Workflows</span>
        </Link>
        <Link href="/workspaces" className="flex items-center gap-3 p-3 hover:bg-slate-800 rounded-md transition-colors">
          <FolderGit2 size={20} />
          <span>Workspaces</span>
        </Link>
        <Link href="/settings" className="flex items-center gap-3 p-3 hover:bg-slate-800 rounded-md transition-colors">
          <Settings size={20} />
          <span>Settings</span>
        </Link>
        <Link href="/gallery" className="flex items-center gap-3 p-3 hover:bg-slate-800 rounded-md transition-colors">
          <Image size={20} />
          <span>Gallery</span>
        </Link>
      </div>
      
      <div className="mt-auto text-xs text-slate-500">
        v0.1.0-alpha
      </div>
    </nav>
  );
}
