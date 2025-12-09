
import { processRun } from '../src/lib/execution-engine';
import db from '../src/lib/db';

console.log('Main Runner Worker Started.');
console.log('Polling for active runs...');

async function loop() {
  while(true) {
    // Select runs that are running or paused (to check for resumption)
    const runs = db.prepare("SELECT id FROM runs WHERE status = 'running' OR status = 'paused'").all() as {id: string}[];
    
    if (runs.length > 0) {
        console.log(`Processing ${runs.length} active runs: ${runs.map(r => r.id).join(', ')}`);
    }

    for (const { id } of runs) {
        try {
           await processRun(id);
        } catch (e) {
           console.error(`Error processing run ${id}`, e);
        }
    }
    
    // Throttle
    await new Promise(r => setTimeout(r, 1000));
  }
}

loop();
