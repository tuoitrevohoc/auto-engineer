import { WorkflowAction, ExecutionContext, ExecutionResult } from './Action';
import { AskGeminiDefinition } from './definitions';
import { getSetting } from '@/app/actions';

export class AskGeminiAction implements WorkflowAction {
  definition = AskGeminiDefinition;

  async execute(inputs: Record<string, unknown>, context: ExecutionContext): Promise<ExecutionResult> {
    const logs: string[] = [`Executing action: ${this.definition.id}`];
    
    // Get API Key
    const apiKey = await getSetting('google_api_key');
    if (!apiKey) {
        return {
            status: 'failed',
            error: 'Google API Key not found. Please configure it in Settings.',
            logs: [...logs, 'Error: Google API Key not configured.']
        };
    }

    const prompt = String(inputs.prompt || '');
    const model = String(inputs.model || 'gemini-2.5-flash');

    logs.push(`Model: ${model}`);
    logs.push(`Prompt length: ${prompt.length} chars`);

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }]
            })
        });

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Google API Error ${res.status}: ${errText}`);
        }

        const data = await res.json();
        // Extract text from Gemini response structure
        // Response format: { candidates: [ { content: { parts: [ { text: "..." } ] } } ] }
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
        logs.push('Received response from Google Gemini.');

        return {
            status: 'success',
            outputs: { response: content },
            logs
        };

    } catch (err: any) {
        logs.push(`Error: ${err.message}`);
        return {
            status: 'failed',
            error: err.message,
            logs
        };
    }
  }
}
