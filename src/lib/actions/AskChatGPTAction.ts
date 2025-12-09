import { WorkflowAction, ExecutionContext, ExecutionResult } from './Action';
import { AskChatGPTDefinition } from './definitions';
import { getSetting } from '@/app/actions';

export class AskChatGPTAction implements WorkflowAction {
  definition = AskChatGPTDefinition;

  async execute(inputs: Record<string, unknown>, context: ExecutionContext): Promise<ExecutionResult> {
    const logs: string[] = [`Executing action: ${this.definition.id}`];
    
    // Get API Key
    const apiKey = await getSetting('openai_api_key');
    if (!apiKey) {
        return {
            status: 'failed',
            error: 'OpenAI API Key not found. Please configure it in Settings.',
            logs: [...logs, 'Error: OpenAI API Key not configured.']
        };
    }

    const prompt = String(inputs.prompt || '');
    const model = String(inputs.model || 'gpt-4o');

    logs.push(`Model: ${model}`);
    logs.push(`Prompt length: ${prompt.length} chars`);

    try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.7
            })
        });

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`OpenAI API Error ${res.status}: ${errText}`);
        }

        const data = await res.json();
        const content = data.choices?.[0]?.message?.content || '';
        
        logs.push('Received response from OpenAI.');

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
