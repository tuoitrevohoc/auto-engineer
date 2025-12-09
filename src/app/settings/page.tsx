'use client';
import { useState, useEffect } from 'react';
import { getSetting, saveSetting } from '@/app/actions';
import { toast } from 'sonner';

export default function SettingsPage() {
    const [apiKey, setApiKey] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getSetting('openai_api_key').then(val => {
            if (val) setApiKey(val);
            setLoading(false);
        });
    }, []);

    const handleSave = async () => {
        await saveSetting('openai_api_key', apiKey);
        toast.success('Settings saved');
    };

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="p-8 max-w-2xl">
            <h1 className="text-2xl font-bold mb-6 text-slate-800">Settings</h1>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
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
