import { ActionDefinition } from '@/types/workflow';
import { ExecutionContext, ExecutionResult, WorkflowAction } from '@/lib/actions/Action';
import { GenerateImageDefinition } from './definitions';
import { getSetting } from '@/app/actions';
import db from '@/lib/db';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { GoogleGenAI } from "@google/genai";

export class GenerateImageAction implements WorkflowAction {
  definition = GenerateImageDefinition;

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

    const promptText = String(inputs.prompt || '');
    const model = String(inputs.model || 'gemini-2.5-flash-image');
    const inputImageId = inputs.inputImageId ? String(inputs.inputImageId) : undefined;

    logs.push(`Model: ${model}`);
    logs.push(`Prompt: ${promptText.substring(0, 50)}...`);

    try {
        const client = new GoogleGenAI({ apiKey });
        
        let prompt: any[] = [{ text: promptText }];

        // Handle Input Image
        if (inputImageId) {
            logs.push(`Using Input Image ID: ${inputImageId}`);
            const row = db.prepare('SELECT path FROM images WHERE id = ?').get(inputImageId) as { path: string } | undefined;
            if (row) {
                const filePath = path.join(process.cwd(), 'public', row.path);
                
                if (fs.existsSync(filePath)) {
                    const fileData = fs.readFileSync(filePath);
                    const base64Image = fileData.toString('base64');
                    // Guess mime type based on extension
                    const ext = path.extname(filePath).substring(1);
                    const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';

                    prompt.push({
                        inlineData: {
                            mimeType: mimeType,
                            data: base64Image
                        }
                    });
                } else {
                     logs.push(`Warning: Image file not found at ${filePath}`);
                }
            } else {
                 logs.push(`Warning: Image ID ${inputImageId} not found in DB`);
            }
        }

        const response = await client.models.generateContent({
            model: model,
            contents: prompt,
        });

        let imageBase64: string | undefined = undefined;
        let imageMimeType = 'image/png';

        const candidates = response.candidates || [];
        if (candidates.length > 0 && candidates[0].content && candidates[0].content.parts) {
             for (const part of candidates[0].content.parts) {
                if (part.text) {
                    logs.push(`Gemini Text Response: ${part.text}`);
                } else if (part.inlineData) {
                    imageBase64 = part.inlineData.data;
                    imageMimeType = part.inlineData.mimeType || 'image/png';
                }
            }
        }

        if (!imageBase64) {
             throw new Error(`No image data in response.`);
        }

        // Save Image
        const buffer = Buffer.from(imageBase64, 'base64');
        const imageId = uuidv4();
        const ext = imageMimeType.split('/')[1] || 'png';
        const filename = `${imageId}.${ext}`;
        const outputDir = path.join(process.cwd(), 'public', 'uploads');
        const outputPath = path.join(outputDir, filename);
        
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        fs.writeFileSync(outputPath, buffer);
        
        const publicPath = `/uploads/${filename}`;
        
        // DB Insert
        db.prepare('INSERT INTO images (id, filename, path, createdAt) VALUES (?, ?, ?, ?)').run(imageId, filename, publicPath, new Date().toISOString());

        logs.push(`Image generated and saved as ${imageId}`);

        return {
            status: 'success',
            outputs: { imageId },
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
