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
    nonce,
} = data;
let targetHash;
let difficulty;

let timer = new Date().valueOf();
let hexTargetState = Data.to(targetState);
let iterations = 0;
while(true) {
    if (new Date().valueOf() - timer > 5000) {
        await delay(100)
        iterations = 0;
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
    // log("State updated");
    data = e;
    data.targetState = rehydrateConstr(data.targetState);
    // console.log('recieved data', data)
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