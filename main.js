import {Constr, Data, fromHex, fromText, Kupmios, Lucid, sha256, toHex} from "lucid-cardano";
import {promises as fs} from 'fs';
import os from 'os';
import {Worker} from 'worker_threads';
import {
    calculateDifficultyNumber,
    calculateInterlink,
    getDifficulty,
    getDifficultyAdjustement,
    incrementU8Array
} from "./utils.js";
import dotenv from 'dotenv';

dotenv.config();

(async () => {
    // Multi-threaded Fortuna mining script
    const kupoUrl = process.env.KUPO_URL;
    const ogmiosUrl = process.env.OGMIOS_URL;
    const genesisFile = await readFile("./genesis/mainnet.json");

    const {validatorHash, validatorAddress} = JSON
        .parse(
            genesisFile,
        );

    const cpuCoreCount = os.cpus().length;
    const workers = [];
    for (let i = 0; i < cpuCoreCount; i++) {
        workers.push(
            new Worker("./worker.js"),
        );
    }

    workers.forEach((worker, index) => {
        worker.on("message", (message) => {
            console.log(`Worker ${index}: ${message}`);
        });
        worker.postMessage({
            workerId: index,
            validatorHash,
            validatorAddress,
            ogmiosUrl,
            kupoUrl
        })
    });
})();

// Helpers
async function readFile(filename) {
    try {
        return await fs.readFile(filename, 'utf8');
    } catch (err) {
        console.error('Error reading the file:', err);
    }
}
