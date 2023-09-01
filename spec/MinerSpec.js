import {Constr, toHex, Data, fromHex} from "lucid-cardano"
import {getNextHashOriginal, getNextHashV2, getNextHashV3} from "../hashing.js";
import {incrementU8Array} from "../utils.js";

describe('Miner', function () {
    let state;
    let targetState;
    let nonce;

    beforeEach(function () {
        state = new Constr(0, [
            13897n, // block_number: Int
            '00000000040a49d9cdb7de3b2c54bd23fe1a3b6d664aaf958b230b63b7cc4df1', // current_hash: ByteArray
            8n, // leading_zeros: Int
            65532n, // difficulty_number: Int
            47657000n, // epoch_time: Int
            // skip the rest of the fields
        ]);
        nonce = new Uint8Array(16);
        crypto.getRandomValues(nonce);
        targetState = new Constr(0, [
            toHex(nonce),
            state.fields[0], // block_number: Int
            state.fields[1], // current_hash: ByteArray
            state.fields[2], // leading_zeros: Int
            state.fields[3], // difficulty_number: Int
            state.fields[4], // epoch_time: Int
        ]);
    });

    it('should replicate original hashing function', function () {
        // Setup
        const hexTargetState = Data.to(targetState);
        const uint8TargetState = fromHex(hexTargetState);

        // Act
        // incrementU8Array(nonce)
        const originalHasherResult = getNextHashOriginal(targetState, state, nonce);
        const v2HasherResult = getNextHashV2(hexTargetState, nonce);
        const v3HasherResult = getNextHashV3(uint8TargetState, nonce);

        // demonstrates use of custom matcher
        expect(v2HasherResult).toEqual(originalHasherResult);
        expect(v3HasherResult).toEqual(originalHasherResult);
    });
});
