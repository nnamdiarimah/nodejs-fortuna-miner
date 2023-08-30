import {generateSeedPhrase} from "lucid-cardano";
import * as fs from "fs";
import "colors";

const phrase = generateSeedPhrase();

fs.writeFile("seed.txt", phrase, {flag: 'wx'}, (err) => {
    if (err) {
        console.error(err.message?.red);
        return;
    }

    console.log("Wallet created and seed phrase saved to seed.txt".green);
});