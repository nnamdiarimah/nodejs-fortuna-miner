import {replaceMiddle} from "./utils.js";
import {Constr, Data, fromHex, sha256, toHex} from "lucid-cardano";

// (targetState: Constr, nonce: Uint8Array) => targetHash: string
export function getNextHashOriginal(targetState, state, nonce) {
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

    return sha256(sha256(fromHex(Data.to(targetState))));
}

// (hexTargetState: string, nonce: Uint8Array) => targetHash: string
export function getNextHashV2(hexTargetState, nonce) {
    hexTargetState = replaceMiddle(hexTargetState, 8, 40, toHex(nonce));
    return sha256(sha256(fromHex(hexTargetState)));
}

// (targetState: Uint8Array, nonce: Uint8Array) => targetHash: string
export function getNextHashV3(targetState, nonce) {
    targetState.set(nonce, 4);
    return sha256(sha256(targetState));
}