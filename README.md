# Node.js Fortuna Miner

This is a modified [Fortuna](https://github.com/aiken-lang/fortuna) miner that uses Node.js instead of Deno to take advantage of multithreading / web workers. Node.js is the best solution until we can get Lucid working from within Deno workers.

### Performance comparison
**Original fortuna miner (single thread)**
<img width="1580" alt="Screenshot 2023-08-29 at 12 46 18 PM" src="https://github.com/nnamdiarimah/nodejs-fortuna-miner/assets/10407499/7e9a9680-9a5b-47d6-9e26-3e92eb8ebcd6">

**Node.js fortuna miner (multi-threaded)**
<img width="1580" alt="Screenshot 2023-08-29 at 12 36 05 PM" src="https://github.com/nnamdiarimah/nodejs-fortuna-miner/assets/10407499/c8591aa4-7a99-433d-a1be-15bb5bf62ac0">

### Disclaimers 🚨
- **Strongly recommend using your own Ogmios and Kupo instances**
  - Each worker currently mines in isolation. As a result, the number of requests to your endpoint are multiplied by the number of CPU cores / threads. **If you're using demeter.run for your Kupo endpoint, access may be temporarily limited for making too many requests (standard DDOS protection).** We're currently working on some improvements to fix this issue.
- Monitor your CPU temp.
- You don't have to follow the disclaimers to get it running ([learn more](https://twitter.com/rogerskaer/status/1576025818182332416)).

## Getting started

### Node
- Make sure you have node v16+ and npm installed.
- [Install Node.js](https://nodejs.org/en/download/package-manager#windows-1)
- Run `npm install` in the project root after installing node.

### Environment variables
Once you have URLs for Kupo and Ogmios, create a .env file in the root of the project with the following content:
```
KUPO_URL="https://<Kupo URL>"
OGMIOS_URL="wss://<Ogmios URL>"
```

### Wallet
You can create a wallet for the miner using the following command:
```bash
npm run setup
```

You can get the address for the created wallet using the following command:
```bash
npm run address
```

### Running
```bash
npm start
```

