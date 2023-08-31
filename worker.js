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
    targetState,
} = data;
let targetHash;
let difficulty;
let nonce = new Uint8Array(16);

let timer = new Date().valueOf();

while(true) {
    if (new Date().valueOf() - timer > 5000) {
        timer = new Date().valueOf();
        await delay(100)
    }

    targetHash = sha256(sha256(fromHex(Data.to(targetState)))); // todo
    difficulty = getDifficulty(targetHash);
    const { leadingZeros, difficulty_number } = difficulty;

    if (
        leadingZeros > (state.fields[2]) ||
        (leadingZeros == (state.fields[2]) &&
            difficulty_number < (state.fields[3]))
    ) {
        logWarning("Found next datum");
        foundNextDatum();
    }
    // else failed to find the right datum
    incrementU8Array(nonce); // todo increment directly on targetState buffer
    targetState.fields[0] = toHex(nonce);
}

function log(message) {
    const prefix = data?.workerId ? `Worker ${data.workerId}: ` : "";
    parentPort.postMessage({type: "info", data: prefix + message});
}
//
function logWarning(message) {
    const prefix = data?.workerId ? `Worker ${data.workerId}: ` : "";
    parentPort.postMessage({type: "info", data: (prefix + message).yellow});
}
function logError(message) {
    const prefix = data?.workerId ? `Worker ${data.workerId}: ` : "";
    parentPort.postMessage({type: "info", data: (prefix + message).red});
}

function foundNextDatum() {
    parentPort.postMessage({type: "foundNextDatum", data: targetState});
}

function refreshData(e) {
    log("State updated");
    data = e;
    data.targetState = rehydrateConstr(data.targetState);
}

async function waitForData() {
    logWarning("Worker waiting for state to start...");

    while(true) {
        if (data) {
            parentPort.postMessage("Starting".green);
            return;
        }

        await delay(1000);
    }
}

function rehydrateConstr(constr) {
    return new Constr(constr.index, constr.fields);
}
