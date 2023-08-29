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
  - Each worker currently mines in isolation. As a result, the number of requests to your endpoint are multiplied by the number of CPU cores / threads. **If you're using demeter.run for your Kupo endpoint, they mey temporarily block you for making too many requests.**
- Monitor your CPU temp (See images below).
- You don't have to follow the disclaimers to get it running ([learn more](https://twitter.com/rogerskaer/status/1576025818182332416)).

## Performance comparison
**Original fortuna miner (single thread)**
<img width="1580" alt="Screenshot 2023-08-29 at 12 46 18 PM" src="https://github.com/nnamdiarimah/nodejs-fortuna-miner/assets/10407499/7e9a9680-9a5b-47d6-9e26-3e92eb8ebcd6">

**Node.js fortuna miner (multi-threaded)**
<img width="1580" alt="Screenshot 2023-08-29 at 12 36 05 PM" src="https://github.com/nnamdiarimah/nodejs-fortuna-miner/assets/10407499/c8591aa4-7a99-433d-a1be-15bb5bf62ac0">


