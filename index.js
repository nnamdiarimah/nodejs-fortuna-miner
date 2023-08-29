const {Kupmios} = require("lucid-cardano");
const fs = require('fs').promises;

(async () => {
    // Multi-threaded Fortuna mining script
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

