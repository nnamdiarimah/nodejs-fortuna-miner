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
let cborTargetState = Data.to(targetState);
let iterations = 0;
while(true) {
    if (new Date().valueOf() - timer > 5000) {
        console.log('iterations', iterations)
        await delay(100)
        timer = new Date().valueOf();
        iterations = 0;

    }

    // targetHash = sha256(sha256(fromHex(Data.to(targetState)))); // todo
    targetHash = sha256(sha256(fromHex(cborTargetState))); // todo
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
    // console.log('before increment', targetState)
    // const beforeCbor = Data.to(targetState);
    // else failed to find the right datum
    incrementU8Array(nonce); // todo increment directly on targetState buffer
    // targetState.fields[0] = toHex(nonce);
    // console.log('after increment', targetState)
    // const afterCbor = Data.to(targetState);
    // console.log('beforeCbor', beforeCbor)
    // console.log('afterCbor', afterCbor)
    // new solution
    // break;
    //
    cborTargetState = replaceMiddle(cborTargetState, 8, 40, toHex(nonce));
    // console.log('cborTargetState', cborTargetState)
    // await delay(1000)
    iterations++;
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
    // console.log('recieved data', data)
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

function replaceMiddle(original, start, end, replacement) {
    return original.substring(0, start) + replacement + original.substring(end);
}