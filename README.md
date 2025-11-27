# Local development — Hardhat node, Ignition deploy, and Solidity tests

This repository uses a local Hardhat node for development, Ignition modules for deployments, and Solidity tests under `test/` (Forge-style tests). The test suite includes `test/ConsentManager.t.sol`, `test/CreditRegistry.t.sol`, and `test/EndToEnd.sol`, which cover the core smart contract workflows.

Prerequisites

- Bun and Node.js (for Hardhat compatibility)
- `bunx` (comes with Bun)
- Python 3.9+ for optional off-chain scripts (create a venv)
- A running local Hardhat node for persistent local state when deploying

Install dependencies

- Node deps (install everything from package.json):

```bash
bun install
# or in CI for reproducible installs:
# bun install --frozen-lockfile
```

- Python (optional off-chain scripts):

```bash
python3 -m venv offchain_store/venv
source offchain_store/venv/bin/activate
pip install web3 eth-account
# or, if provided:
# pip install -r offchain_store/requirements.txt
```

Start a local Hardhat node

- In Terminal A:

```bash
bunx hardhat node
```

Notes:

- Keep this running to preserve deployed contracts/state.
- If you stop/restart the node, you must redeploy contracts.

Deploy contracts with Ignition

- In Terminal B (while the node runs), deploy modules:

```bash
# Deploy a single module (example)
bunx hardhat ignition deploy ./ignition/modules/CreditRegistry.ts --network localhost

# Deploy all modules in the folder
bunx hardhat ignition deploy ./ignition/modules --network localhost
```

Important:

- If a constructor requires the ConsentManager address, ensure the Ignition module provides it. Example address used in scripts and tests:
  0x5FbDB2315678afecb367f032d93F642f64180aa3
- Save deployed addresses (JSON) if you plan to reuse them across node restarts.

Run Solidity tests

- Run all Solidity tests:

```bash
bunx hardhat test solidity
```

- With gas stats:

```bash
bunx hardhat test solidity --gas-stats
```

- To run tests against the running local node:

```bash
bunx hardhat test solidity --network localhost
```

About the provided Solidity tests

- Location: `test/`
- `test/ConsentManager.t.sol`:
  - `test_WorkflowConsentGrant` — grantConsent, consents storage, isConsentValid
  - `test_WorkflowDataFetchWithConsentCheck` — checkConsent for granted vs non-granted scopes / wrong lender
  - `test_WorkflowRevocation` — revokeAllConsents and subsequent invalid checks
  - `test_FullWorkflowSingleLender` — grant → check → revoke → verify
  - `test_MultipleLendersIndependentConsents` — independent consents and selective revocation
  - `test_ConsentExpiration` — time-warp to expiry and verify invalidation
  - `test_MultipleConsentsToSameLender` — multiple consents and unique consent IDs
- `test/CreditRegistry.t.sol`: Covers creation, update, and retrieval of credit records.
- `test/EndToEnd.sol`: Simulates a full interaction flow between all contracts.

Troubleshooting & tips

- InvalidAddress in web3.py: convert to checksum format before RPC calls:
  - Python: `Web3.to_checksum_address(addr)`
  - JS/ethers: `ethers.utils.getAddress(addr)`
- If tests/deploy fail after restarting node, redeploy or load saved deployment addresses.
- `.gitignore` recommendation: ignore ephemeral local deployments (`/ignition/deployments/chain-31337/`) but consider committing network-specific folders (mainnet/goerli) if you want a shared record. Avoid committing private keys or secrets.

Example minimal workflow

1. Terminal A:

```bash
bunx hardhat node
```

2. Terminal B:

```bash
bun install
bunx hardhat ignition deploy ./ignition/modules --network localhost
```

3. Terminal C:

```bash
bunx hardhat test solidity --network localhost
```
