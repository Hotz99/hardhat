#!/usr/bin/env bun
/**
 * Development setup script
 *
 * Waits for Hardhat node, deploys contracts, and sets up links
 */

import { createPublicClient, createWalletClient, http, type Hex } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { hardhat } from "viem/chains"
import { $ } from "bun"

const HARDHAT_URL = "http://127.0.0.1:8545"
const AUDIT_LOG_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
const CREDIT_REGISTRY_ADDRESS = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"
const HARDHAT_DEPLOYER_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as Hex
const PROJECT_ROOT = new URL("../../", import.meta.url).pathname

async function waitForHardhat(maxAttempts = 30, delayMs = 500): Promise<void> {
  const client = createPublicClient({
    chain: hardhat,
    transport: http(HARDHAT_URL),
  })

  for (let i = 0; i < maxAttempts; i++) {
    try {
      await client.getChainId()
      console.log("✓ Hardhat node ready")
      return
    } catch {
      if (i === 0) console.log("Waiting for Hardhat node...")
      await new Promise(r => setTimeout(r, delayMs))
    }
  }
  throw new Error("Hardhat node failed to start")
}

async function deployContracts(): Promise<void> {
  const modules = [
    "ignition/modules/ConsentManager.ts",
    "ignition/modules/AuditLog.ts",
    "ignition/modules/CreditRegistry.ts",
  ]

  for (const mod of modules) {
    console.log(`Deploying ${mod}...`)
    await $`cd ${PROJECT_ROOT} && bunx hardhat ignition deploy ${mod} --network localhost`.quiet()
  }
  console.log("✓ All contracts deployed")
}

async function setupAuditLogLink(): Promise<void> {
  const { AuditLogAbi, CreditRegistryAbi } = await import("../lib/blockchain/contracts/abis")

  const deployerAccount = privateKeyToAccount(HARDHAT_DEPLOYER_KEY)
  const deployerClient = createWalletClient({
    account: deployerAccount,
    chain: hardhat,
    transport: http(HARDHAT_URL),
  })

  const publicClient = createPublicClient({
    chain: hardhat,
    transport: http(HARDHAT_URL),
  })

  // 1. Authorize CreditRegistry as a logger in AuditLog
  const authHash = await deployerClient.writeContract({
    address: AUDIT_LOG_ADDRESS as Hex,
    abi: AuditLogAbi,
    functionName: "authorizeLogger",
    args: [CREDIT_REGISTRY_ADDRESS as Hex],
  })
  await publicClient.waitForTransactionReceipt({ hash: authHash })

  // 2. Set AuditLog address in CreditRegistry
  const setHash = await deployerClient.writeContract({
    address: CREDIT_REGISTRY_ADDRESS as Hex,
    abi: CreditRegistryAbi,
    functionName: "setAuditLog",
    args: [AUDIT_LOG_ADDRESS as Hex],
  })
  await publicClient.waitForTransactionReceipt({ hash: setHash })

  console.log("✓ AuditLog <-> CreditRegistry link established")
}

async function main() {
  try {
    await waitForHardhat()
    await deployContracts()
    await setupAuditLogLink()
    console.log("\n✓ Development environment ready!\n")
  } catch (error) {
    console.error("Setup failed:", error)
    process.exit(1)
  }
}

main()
