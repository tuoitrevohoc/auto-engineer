
import { processRun } from '../src/lib/execution-engine';
import db from '../src/lib/db';

console.log('Main Runner Worker Started.');
console.log('Polling for active runs...');

async function loop() {
  // Track running promises to await/manage them if needed, or just let them float and update DB on catch
  // But to limit concurrency, we need to know how many are running.
  // We can track runIds that we have 'spawned' and not yet finished.
  const activeProcessing = new Set<string>();

  while(true) {
    // Get Concurrency Limit (Default 5)
    let maxConcurrent = 5;
    try {
        const row = db.prepare("SELECT value FROM settings WHERE key = 'max_concurrent_runs'").get() as { value: string };
        if (row && row.value) {
            const val = parseInt(row.value, 10);
            if (!isNaN(val) && val > 0) maxConcurrent = val;
        }
    } catch(e) { /* ignore */ }

    // Select runs that are running or paused
    // We get ALL running/paused because we might be the ones processing them, or we need to pick up new ones.
    // Prioritize RUNNING over PAUSED so we don't starve active work if we have many paused ones (though paused ones start quickly usually)
    const runs = db.prepare(`
        SELECT id FROM runs 
        WHERE status = 'running' OR status = 'paused' 
        ORDER BY 
            CASE status 
                WHEN 'running' THEN 1 
                WHEN 'paused' THEN 2 
                ELSE 3 
            END,
            startTime ASC
    `).all() as {id: string}[];
    
    // Clean up activeProcessing
    // If a run is no longer in the DB list of running/paused, it finished (or cancelled).
    // But processRun doesn't throw often, it updates DB. 
    // We need to know when processRun finishes.
    // So we wrap processRun in a tracker.

    const currentActiveCount = activeProcessing.size;
    const slotsAvailable = maxConcurrent - currentActiveCount;

    if (slotsAvailable > 0) {
        // Find runs that are NOT in activeProcessing
        const candidates = runs.filter(r => !activeProcessing.has(r.id));
        
        // Take up to slotsAvailable
        const toStartup = candidates.slice(0, slotsAvailable);

        if (toStartup.length > 0) {
            console.log(`Starting ${toStartup.length} runs (Concurrent: ${currentActiveCount + toStartup.length}/${maxConcurrent})`);
        }

        for (const { id } of toStartup) {
            activeProcessing.add(id);
            // Floating promise
            processRun(id).then(() => {
                activeProcessing.delete(id);
            }).catch(e => {
                console.error(`Error processing run ${id}`, e);
                activeProcessing.delete(id);
            });
        }
    } else {
        // console.log(`Max concurrency reached (${currentActiveCount}/${maxConcurrent}). Waiting...`);
    }
    
    // Throttle iteration
    await new Promise(r => setTimeout(r, 1000));
  }
}

loop();
