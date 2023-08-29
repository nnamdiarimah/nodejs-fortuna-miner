import {parentPort} from 'worker_threads'
import {Constr, Data, fromHex, fromText, Kupmios, Lucid, sha256, toHex} from "lucid-cardano";
import {
    calculateDifficultyNumber,
    calculateInterlink,
    getDifficulty,
    getDifficultyAdjustement,
    incrementU8Array
} from "./utils.js";
import {promises as fs} from "fs";

parentPort.on('message', async function (e) {
    const {validatorHash, validatorAddress, kupoUrl, ogmiosUrl} = e;
    parentPort.postMessage("Starting...");


    const provider = new Kupmios(kupoUrl, ogmiosUrl);
    const lucid = await Lucid.new(provider, "Mainnet");

    lucid.selectWalletFromSeed(await readFile("seed.txt"));

    // Main loop
    while (true) {
        let validatorUTXOs = await lucid.utxosAt(validatorAddress);

        let validatorOutRef = validatorUTXOs.find(
            (u) => u.assets[validatorHash + fromText("lord tuna")],
        );

        let validatorState = validatorOutRef.datum;

        let state = Data.from(validatorState);

        let nonce = new Uint8Array(16);

        crypto.getRandomValues(nonce);

        let targetState = new Constr(0, [
            // nonce: ByteArray
            toHex(nonce),
            // block_number: Int
            state.fields[0],
            // current_hash: ByteArray
            state.fields[1],
            // leading_zeros: Int
            state.fields[2],
            // difficulty_number: Int
            state.fields[3],
            //epoch_time: Int
            state.fields[4],
        ]);

        let targetHash;
        let difficulty;

        parentPort.postMessage("Mining...");
        let timer = new Date().valueOf();

        while (true) {
            if (new Date().valueOf() - timer > 10000) {
                parentPort.postMessage("New block not found in 10 seconds, updating state");
                timer = new Date().valueOf();
                try {
                    validatorUTXOs = await lucid.utxosAt(validatorAddress);
                } catch (e) {
                    parentPort.postMessage(e);
                    parentPort.postMessage("Error occurred while fetching utxos, continuing...");
                    continue;
                }

                validatorOutRef = validatorUTXOs.find(
                    (u) => u.assets[validatorHash + fromText("lord tuna")],
                );

                validatorState = validatorOutRef.datum;

                state = Data.from(validatorState);

                nonce = new Uint8Array(16);

                crypto.getRandomValues(nonce);

                targetState = new Constr(0, [
                    // nonce: ByteArray
                    toHex(nonce),
                    // block_number: Int
                    state.fields[0],
                    // current_hash: ByteArray
                    state.fields[1],
                    // leading_zeros: Int
                    state.fields[2],
                    // difficulty_number: Int
                    state.fields[3],
                    //epoch_time: Int
                    state.fields[4],
                ]);
            }

            targetHash = sha256(sha256(fromHex(Data.to(targetState))));

            difficulty = getDifficulty(targetHash);

            const {leadingZeros, difficulty_number} = difficulty;

            if (
                leadingZeros > (state.fields[2]) ||
                (leadingZeros == (state.fields[2]) &&
                    difficulty_number < (state.fields[3]))
            ) {
                break;
            }
            // parentPort.postMessage("failed to find the right datum");
            incrementU8Array(nonce);

            targetState.fields[0] = toHex(nonce);
        }

        const realTimeNow = Number((Date.now() / 1000).toFixed(0)) * 1000 - 60000;

        const interlink = calculateInterlink(toHex(targetHash), difficulty, {
            leadingZeros: state.fields[2],
            difficulty_number: state.fields[3],
        }, state.fields[7]);

        let epoch_time = (state.fields[4]) +
            BigInt(90000 + realTimeNow) -
            (state.fields[5]);

        let difficulty_number = state.fields[3];
        let leading_zeros = state.fields[2];

        if (
            state.fields[0] % 2016n === 0n &&
            state.fields[0] > 0
        ) {
            const adjustment = getDifficultyAdjustement(epoch_time, 1_209_600_000n);

            epoch_time = 0n;

            const new_difficulty = calculateDifficultyNumber(
                {
                    leadingZeros: state.fields[2],
                    difficulty_number: state.fields[3],
                },
                adjustment.numerator,
                adjustment.denominator,
            );

            difficulty_number = new_difficulty.difficulty_number;
            leading_zeros = new_difficulty.leadingZeros;
        }

        // calculateDifficultyNumber();

        const postDatum = new Constr(0, [
            (state.fields[0]) + 1n,
            toHex(targetHash),
            leading_zeros,
            difficulty_number,
            epoch_time,
            BigInt(90000 + realTimeNow),
            fromText("AlL HaIl tUnA"),
            interlink,
        ]);

        const outDat = Data.to(postDatum);

        parentPort.postMessage(`Found next datum: ${outDat}`);

        const mintTokens = {[validatorHash + fromText("TUNA")]: 5000000000n};
        const masterToken = {[validatorHash + fromText("lord tuna")]: 1n};
        try {
            const readUtxo = await lucid.utxosByOutRef([{
                txHash:
                    "01751095ea408a3ebe6083b4de4de8a24b635085183ab8a2ac76273ef8fff5dd",
                outputIndex: 0,
            }]);
            const txMine = await lucid
                .newTx()
                .collectFrom(
                    [validatorOutRef],
                    Data.to(new Constr(1, [toHex(nonce)])),
                )
                .payToAddressWithData(
                    validatorAddress,
                    {inline: outDat},
                    masterToken,
                )
                .mintAssets(mintTokens, Data.to(new Constr(0, [])))
                .readFrom(readUtxo)
                .validTo(realTimeNow + 180000)
                .validFrom(realTimeNow)
                .complete();

            const signed = await txMine.sign().complete();

            await signed.submit();

            parentPort.postMessage(`TX HASH: ${signed.toHash()}`);
            parentPort.postMessage("Waiting for confirmation...");

            // // await lucid.awaitTx(signed.toHash());
            await delay(5000);
        } catch (e) {
            console.error(e);
        }
    }
});

async function readFile(filename) {
    try {
        return await fs.readFile(filename, 'utf8');
    } catch (err) {
        console.error('Error reading the file:', err);
    }
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}