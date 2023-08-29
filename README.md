# Node.js Fortuna Miner

This is a modified [Fortuna](https://github.com/aiken-lang/fortuna) that uses Node.js instead of Deno to take advantage of multithreading / web workers. Node.js is the best solution until we can get Lucid working from within Deno workers.

This app requires you to have node v16+ and npm installed.

## Setup
- `npm install` 
- Create `.env with (KUPO_URL, OGMIOS_URL)` and `seed.txt` files in the project root, similar to the setup for the [original miner](https://github.com/aiken-lang/fortuna).

## Running
`npm start` or `node index.js`


## Disclaimers 🚨
- **Strongly recommend using your own Ogmios and Kupo instances**
  - Each worker mines in isolation. If your device has 8 cpu cores, it will likely send 16 (`8 cores x 2 threads`) requests to Kupo every 5 seconds, minimum.
- Monitor your CPU temp (See images below).
- You don't have to follow these to get it running ([learn more](https://twitter.com/rogerskaer/status/1576025818182332416)).

## Performance comparison
**Original fortuna miner (single thread)**
<img width="1580" alt="Screenshot 2023-08-29 at 12 46 18 PM" src="https://github.com/nnamdiarimah/nodejs-fortuna-miner/assets/10407499/d73d1e22-0d46-4b10-807e-f096623af3c1">

**Node.js fortuna miner (multi-threaded)**

<img width="1580" alt="Screenshot 2023-08-29 at 12 36 05 PM" src="https://github.com/nnamdiarimah/nodejs-fortuna-miner/assets/10407499/4ad43376-1ded-4e62-8b0c-160eb2c26ed9">
