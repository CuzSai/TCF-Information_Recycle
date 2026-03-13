// TCF Data Sync Script
// Run with: node sync.js (no npm install needed)

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const NO_ARRAY = [
    "mapData.json",
    "localization.json",
    "META.json",
    "forgeSettings.json",
    "factionLevels.json",
    "locations.json",
    "personalQuarters.json",
    "player.json",
    "timings.json",
    "cosmetics.json",
];

function syncFile(filePath) {
    const filename = path.basename(filePath);

    if (!filename.endsWith(".json")) return;

    const dir = path.dirname(filePath);
    // Make sure we're only syncing root files, not min/ or array/
    if (dir !== __dirname) return;

    let data;
    try {
        const raw = fs.readFileSync(filePath, "utf8");
        data = JSON.parse(raw);
    } catch (e) {
        console.error(`  [ERROR] Failed to parse ${filename}: ${e.message}`);
        return;
    }

    const minDir = path.join(__dirname, "min");
    const arrayDir = path.join(__dirname, "array");

    // Sync to min/
    if (fs.existsSync(minDir)) {
        fs.writeFileSync(path.join(minDir, filename), JSON.stringify(data));
        console.log(`  [min]   ${filename} synced`);
    } else {
        console.log(`  [WARN]  min/ folder not found, skipping`);
    }

    // Sync to array/
    if (!NO_ARRAY.includes(filename)) {
        if (fs.existsSync(arrayDir)) {
            const asArray = Object.entries(data).map(([key, value]) => ({ ...value, key }));
            fs.writeFileSync(path.join(arrayDir, filename), JSON.stringify(asArray));
            console.log(`  [array] ${filename} synced`);
        } else {
            console.log(`  [WARN]  array/ folder not found, skipping`);
        }
    }
}

// Initial sync on startup
console.log("=== Initial sync ===\n");
const rootFiles = fs.readdirSync(__dirname).filter(f => f.endsWith(".json"));
for (const file of rootFiles) {
    console.log(`Syncing ${file}...`);
    syncFile(path.join(__dirname, file));
}
console.log("\n=== Initial sync complete ===\n");

// Watch using built-in fs.watch with debounce to avoid double-firing
console.log("Watching for file changes... Press Ctrl+C to stop.\n");

const debounceTimers = {};

fs.watch(__dirname, { persistent: true }, (eventType, filename) => {
    if (!filename || !filename.endsWith(".json")) return;

    // Debounce: wait 100ms after last event before syncing
    clearTimeout(debounceTimers[filename]);
    debounceTimers[filename] = setTimeout(() => {
        const filePath = path.join(__dirname, filename);

        // Make sure file still exists (wasn't deleted)
        if (!fs.existsSync(filePath)) return;

        console.log(`[${new Date().toLocaleTimeString()}] Change detected: ${filename}`);
        syncFile(filePath);
        console.log(`  Done.\n`);
    }, 100);
});