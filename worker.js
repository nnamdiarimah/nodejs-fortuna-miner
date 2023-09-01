import {parentPort} from 'worker_threads'
import {Constr, Data, fromHex, fromText, Kupmios, Lucid, sha256, toHex} from "lucid-cardano";
import {
    calculateDifficultyNumber,
    calculateInterlink,
    getDifficulty,
    getDifficultyAdjustement,
    incrementU8Array, readFile, replaceMiddle
} from "./utils.js";
import {promises as fs} from "fs";
import 'colors';
import {getNextHashV3} from "./hashing.js";

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

        let _targetState = new Constr(0, [
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

        let _hexTargetState = Data.to(_targetState);
        let uint8TargetState = fromHex(_hexTargetState);


        let targetHash;
        let difficulty;

        parentPort.postMessage("Mining...");
        let timer = new Date().valueOf();

        let iterations = 0;
        while (true) {
            if (Date.now() - timer > 5000) {
                timer = new Date().valueOf();
                try {
                    validatorUTXOs = await lucid.utxosAt(validatorAddress);
                } catch (e) {
                    parentPort.postMessage(e.message?.yellow);
                    parentPort.postMessage("Error occurred while fetching utxos, skipping...".yellow);
                    continue;
                }

                validatorOutRef = validatorUTXOs.find(
                    (u) => u.assets[validatorHash + fromText("lord tuna")],
                );

                if (validatorState !== validatorOutRef.datum) {
                    parentPort.postMessage("New block, updating state");

                    validatorState = validatorOutRef.datum;

                    state = Data.from(validatorState);

                    nonce = new Uint8Array(16);
                    crypto.getRandomValues(nonce);

                    _targetState = new Constr(0, [
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
                    _hexTargetState = Data.to(_targetState);
                    uint8TargetState = fromHex(_hexTargetState);
                }
                console.log('iterations', iterations);
                iterations = 0;
            }

            incrementU8Array(nonce);
            targetHash = getNextHashV3(uint8TargetState, nonce); // this mutates uint8TargetState with the new nonce
            difficulty = getDifficulty(targetHash);

            const {leadingZeros, difficulty_number} = difficulty;

            if (
                leadingZeros > (state.fields[2]) ||
                (leadingZeros == (state.fields[2]) &&
                    difficulty_number < (state.fields[3]))
            ) {
                break;
            }
            iterations++;
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

        parentPort.postMessage(`Found next datum: ${outDat}`.green);

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
            const txHash = signed.toHash()

            parentPort.postMessage(`TX HASH: ${txHash}`.green);
            parentPort.postMessage("Waiting for confirmation...".green);

            lucid.awaitTx(signed.toHash())
                .then(() => {
                    parentPort.postMessage(`TX confirmed: https://cardanoscan.io/transaction/${txHash}`.green);
                })
                .catch((e) => {
                   parentPort.postMessage(`TX failed to make it on chain`.yellow);
                   parentPort.postMessage(e.message?.yellow);
                });
            await delay(5000);
        } catch (e) {
            parentPort.postMessage("Nevermind LOL".red);
            parentPort.postMessage(e.message?.red);
        }
    }
});

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}