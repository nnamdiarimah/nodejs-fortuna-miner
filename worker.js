import {parentPort} from "worker_threads";
import {Constr, Data, fromHex, fromText, Kupmios, Lucid, sha256, toHex,} from "lucid-cardano";
import {
    getDifficulty,
    incrementU8Array,
    delay,
} from "./utils.js";
import "colors";

let data;

parentPort.on("message", (e) => refreshData(e));
parentPort.on("error", (e) => logError(e));

await waitForData();

let {
    state,
} = data;
let targetHash;
let difficulty;

const nonce = new Uint8Array(16);
crypto.getRandomValues(nonce);

const targetState = new Constr(0, [
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

let timer = new Date().valueOf();
let hexTargetState = Data.to(targetState);

while(true) {
    if (new Date().valueOf() - timer > 5000) {
        await delay(100)
    }

    targetHash = sha256(sha256(fromHex(hexTargetState)));
    difficulty = getDifficulty(targetHash);
    const { leadingZeros, difficulty_number } = difficulty;

    if (
        leadingZeros > (state.fields[2]) ||
        (leadingZeros == (state.fields[2]) &&
            difficulty_number < (state.fields[3]))
    ) {
        logWarning("Found next datum");
        foundNextDatum(hexTargetState, nonce);
    }

    incrementU8Array(nonce);
    hexTargetState = replaceMiddle(hexTargetState, 8, 40, toHex(nonce)); // todo modify the Uint8Array directly instead of converting to hex

}

function log(message) {
    const prefix = data?.workerId ? `Worker ${data.workerId}: ` : "";
    parentPort.postMessage({type: "info", data: prefix + message});
}

function logWarning(message) {
    const prefix = data?.workerId ? `Worker ${data.workerId}: ` : "";
    parentPort.postMessage({type: "info", data: (prefix + message).yellow});
}

function logSuccess(message) {
    const prefix = data?.workerId ? `Worker ${data.workerId}: ` : "";
    parentPort.postMessage({type: "info", data: (prefix + message).green});
}
function logError(message) {
    const prefix = data?.workerId ? `Worker ${data.workerId}: ` : "";
    parentPort.postMessage({type: "info", data: (prefix + message).red});
}

function foundNextDatum(hexState, nonce) {
    parentPort.postMessage({type: "foundNextDatum", data: { state, nonce }});
}

function refreshData(e) {
    data = e;
    acknowledge();
}

async function waitForData() {
    log("Worker waiting for state to start...");

    while(true) {
        if (data) {
            logSuccess("Received state, mining..");
            return;
        }

        await delay(1000);
    }
}

function rehydrateConstr(constr) {
    return new Constr(constr.index, constr.fields);
}

function replaceMiddle(original, start, end, replacement) {
    return original.substring(0, start) + replacement + original.substring(end);
}

function acknowledge() {
    parentPort.postMessage({type: "acknowledge"});
}