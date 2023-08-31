import {Constr, Data, fromHex, fromText, Kupmios, Lucid, sha256, toHex,} from "lucid-cardano";
import {promises as fs} from "fs";
import {parentPort, Worker} from "worker_threads";
import dotenv from "dotenv";
import {
    calculateDifficultyNumber,
    calculateInterlink,
    getDifficultyAdjustement,
    delay,
    getDifficulty
} from "./utils.js";
import os from "os";

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

    console.log("Starting");

    const provider = new Kupmios(kupoUrl, ogmiosUrl);
    const lucid = await Lucid.new(provider, "Mainnet");

    lucid.selectWalletFromSeed(await readFile("seed.txt"));

    const cpuCoreCount = os.cpus().length;
    let workers = [];
    for (let i = 0; i < cpuCoreCount; i++) {
        workers.push(
            new Worker("./worker.js"),
        );
    }

    let minerState

    const validatorUTXOs = await lucid.utxosAt(validatorAddress);
    let validatorOutRef = validatorUTXOs.find(
        (u) => u.assets[validatorHash + fromText("lord tuna")],
    );

    let validatorState = validatorOutRef.datum;
    minerState = Data.from(validatorState);

    let targetState;

    workers.forEach((worker, index) => {
        worker.on("message", handleMessage.bind(this));
    });

    let timer = new Date().valueOf();
    while (true) {
        // Main loop
        if (new Date().valueOf() - timer > 5000) {
            timer = new Date().valueOf();
            try {
                console.log("New block not found in 5 seconds, checking for new state");
                const newValidatorUTXOs = await lucid.utxosAt(validatorAddress);
                const newValidatorOutRef = newValidatorUTXOs.find(
                    (u) => u.assets[validatorHash + fromText("lord tuna")],
                );

                if (validatorState !== newValidatorOutRef.datum) {
                    validatorState = newValidatorOutRef.datum;
                    minerState = Data.from(validatorState);

                    console.log("New block found, updating worker state")
                    refreshWorkerState();
                }
            } catch (e) {
                console.log(e);
                console.log(
                    "Error occurred while fetching utxos, skipping...".yellow,
                );
                await delay(1000);
            }
        }
    }

    function refreshWorkerState() {
        workers.forEach((worker, index) => {
            const nonce = new Uint8Array(16);
            crypto.getRandomValues(nonce);

            targetState = new Constr(0, [
                // nonce: ByteArray
                toHex(nonce),
                // block_number: Int
                minerState.fields[0],
                // current_hash: ByteArray
                minerState.fields[1],
                // leading_zeros: Int
                minerState.fields[2],
                // difficulty_number: Int
                minerState.fields[3],
                //epoch_time: Int
                minerState.fields[4],
            ]);

            // targetState = Data.to(targetState);

            worker.postMessage({
                workerId: index + 1,
                validatorHash,
                validatorAddress,
                ogmiosUrl,
                kupoUrl,
                targetState,
                nonce,
                state: minerState,
                validatorOutRef,
            });
        });
    }

    async function handleMessage(message) {
        switch (message.type) {
            case "foundNextDatum":
                console.log("foundNextDatum");
                await handleDatumFound();
                break;
            case "info":
                console.log(message.data);
        }
    }

    async function handleDatumFound(targetState) {
        const targetHash = sha256(sha256(fromHex(Data.to(targetState))));

        const difficulty = getDifficulty(targetHash);

        const nonce = targetState.fields[0];
        // calculate difficulty
        const realTimeNow = Number((Date.now() / 1000).toFixed(0)) * 1000 - 60000;

        const interlink = calculateInterlink(toHex(targetHash), difficulty, {
            leadingZeros: minerState.fields[2],
            difficulty_number: minerState.fields[3],
        }, minerState.fields[7]);

        let epoch_time = (minerState.fields[4]) +
            BigInt(90000 + realTimeNow) -
            (minerState.fields[5]);

        let difficulty_number = minerState.fields[3];
        let leading_zeros = minerState.fields[2];

        if (
            minerState.fields[0] % 2016n === 0n &&
            minerState.fields[0] > 0
        ) {
            const adjustment = getDifficultyAdjustement(epoch_time, 1_209_600_000n);

            epoch_time = 0n;

            const new_difficulty = calculateDifficultyNumber(
                {
                    leadingZeros: minerState.fields[2],
                    difficulty_number: minerState.fields[3],
                },
                adjustment.numerator,
                adjustment.denominator,
            );

            difficulty_number = new_difficulty.difficulty_number;
            leading_zeros = new_difficulty.leadingZeros;
        }
        const postDatum = new Constr(0, [
            (minerState.fields[0]) + 1n,
            toHex(targetHash),
            leading_zeros,
            difficulty_number,
            epoch_time,
            BigInt(90000 + realTimeNow),
            fromText("AlL HaIl tUnA"),
            interlink,
        ]);

        const outDat = Data.to(postDatum);

        console.log(`Found next datum: ${outDat}`.green);

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
})();

// Helpers
async function readFile(filename) {
    try {
        return await fs.readFile(filename, "utf8");
    } catch (err) {
        console.error("Error reading the file:", err);
    }
}
