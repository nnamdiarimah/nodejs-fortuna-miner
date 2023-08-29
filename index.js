import {Kupmios} from "lucid-cardano";
import { promises as fs} from 'fs';
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

    const provider = new Kupmios(kupoUrl, ogmiosUrl);

    console.log(validatorHash, validatorAddress);
})();

// Helpers
async function readFile(filename) {
    try {
        return await fs.readFile(filename, 'utf8');
    } catch (err) {
        console.error('Error reading the file:', err);
    }
}

