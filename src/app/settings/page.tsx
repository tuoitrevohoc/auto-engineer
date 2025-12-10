'use client';
import { useState, useEffect } from 'react';
import { getSetting, saveSetting } from '@/app/actions';
import { toast } from 'sonner';

export default function SettingsPage() {
    const [apiKey, setApiKey] = useState('');
    const [concurrentRuns, setConcurrentRuns] = useState('5');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            getSetting('openai_api_key'),
            getSetting('max_concurrent_runs')
        ]).then(([key, concurrent]) => {
            if (key) setApiKey(key);
            if (concurrent) setConcurrentRuns(concurrent);
            setLoading(false);
        });
    }, []);

    const handleSave = async () => {
        await saveSetting('openai_api_key', apiKey);
        await saveSetting('max_concurrent_runs', concurrentRuns);
        toast.success('Settings saved');
    };

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="p-8 max-w-2xl">
            <h1 className="text-2xl font-bold mb-6 text-slate-800">Settings</h1>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 mb-6">
                <h2 className="text-lg font-semibold mb-4 text-slate-800">Runner Configuration</h2>
                <label className="block text-sm font-medium text-slate-700 mb-2">Max Concurrent Runs</label>
                <div className="text-sm text-slate-500 mb-2">Number of workflows to execute simultaneously (Default: 5).</div>
                <input 
                    type="number" 
                    min="1"
                    max="50"
                    value={concurrentRuns} 
                    onChange={e => setConcurrentRuns(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded mb-4 focus:ring-2 focus:ring-blue-500 outline-none" 
                    placeholder="5"
                />
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                <h2 className="text-lg font-semibold mb-4 text-slate-800">API Keys</h2>
                <label className="block text-sm font-medium text-slate-700 mb-2">OpenAI API Key</label>
                <input 
                    type="password" 
                    value={apiKey} 
                    onChange={e => setApiKey(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded mb-4 focus:ring-2 focus:ring-blue-500 outline-none" 
                    placeholder="sk-..."
                />
                <button 
                    onClick={handleSave} 
                    className="bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700 transition-colors"
                >
                    Save Settings
                </button>
            </div>
        </div>
    );
}
