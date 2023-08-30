import {fromText, Kupmios, Lucid} from "lucid-cardano";
import "colors";
import {readFile} from "../utils.js";
import dotenv from 'dotenv';

dotenv.config();

(async () => {
    const kupoUrl = process.env.KUPO_URL;
    const ogmiosUrl = process.env.OGMIOS_URL;

    const provider = new Kupmios(kupoUrl, ogmiosUrl);
    const lucid = await Lucid.new(provider, "Mainnet");

    const seed = await readFile("seed.txt");
    lucid.selectWalletFromSeed(seed);

    const address = await lucid.wallet.address();
    const utxos = await lucid.wallet.getUtxos();

    const balance = utxos.reduce((acc, u) => {
        return acc + u.assets.lovelace;
    }, 0n);

    console.log(`\nAddress: ${address}`);
    console.log(`ADA Balance: ${balance / 1_000_000n}`);

    try {
        const genesisFile = await readFile(`genesis/mainnet.json`);

        const {validatorHash} = JSON.parse(genesisFile);

        const tunaBalance = utxos.reduce((acc, u) => {
            return acc + (u.assets[validatorHash + fromText("TUNA")] ?? 0n);
        }, 0n);

        console.log(`TUNA Balance: ${tunaBalance / 100_000_000n}`);
    } catch {
        console.log(`TUNA Balance: 0`);
    }
})();