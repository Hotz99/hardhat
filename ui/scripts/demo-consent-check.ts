#!/usr/bin/env bun
/**
 * Demo script: Consent-based data access
 *
 * Simulates a lender trying to access a borrower's data.
 * Shows consent denial/approval flow.
 *
 * Usage:
 *   bun scripts/demo-consent-check.ts <borrower-address> [--new]
 *
 * Options:
 *   --new    Generate a new lender address (default: reuse previous)
 *
 * Example:
 *   bun scripts/demo-consent-check.ts 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
 *   bun scripts/demo-consent-check.ts 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 --new
 */

import { createPublicClient, createWalletClient, http, keccak256, toBytes, type Hex } from "viem"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { hardhat } from "viem/chains"
import { ConsentManagerAbi, CreditRegistryAbi } from "../lib/blockchain/contracts/abis"
import { existsSync, readFileSync, writeFileSync } from "fs"
import { join } from "path"

const LENDER_CACHE_FILE = join(import.meta.dir, ".demo-lender-cache.json")

const HARDHAT_URL = "http://127.0.0.1:8545"

// Contract addresses (from local deployment)
const CONSENT_MANAGER_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3" as Hex
const CREDIT_REGISTRY_ADDRESS = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0" as Hex

// Hardhat account #0 - for funding the lender
const HARDHAT_FUNDER_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as Hex

// Standard scopes
const SCOPES = {
  CREDIT_SCORE: keccak256(toBytes("credit_score")),
  INCOME: keccak256(toBytes("income")),
  DEBT_RATIO: keccak256(toBytes("debt_ratio")),
} as const

const publicClient = createPublicClient({
  chain: hardhat,
  transport: http(HARDHAT_URL),
})

async function fundAccount(address: Hex, amount = "1") {
  const funderAccount = privateKeyToAccount(HARDHAT_FUNDER_KEY)
  const funderClient = createWalletClient({
    account: funderAccount,
    chain: hardhat,
    transport: http(HARDHAT_URL),
  })

  const { parseEther } = await import("viem")
  await funderClient.sendTransaction({
    to: address,
    value: parseEther(amount),
  })
}

async function checkConsentForLender(
  borrowerAddress: Hex,
  lenderAddress: Hex,
  scope: Hex
): Promise<{ hasConsent: boolean; consentId?: Hex }> {
  // Get all consents for borrower
  const consentIds = await publicClient.readContract({
    address: CONSENT_MANAGER_ADDRESS,
    abi: ConsentManagerAbi,
    functionName: "getBorrowerConsents",
    args: [borrowerAddress],
  }) as Hex[]

  for (const consentId of consentIds) {
    // Get consent details - the ABI returns a tuple, not named fields
    const consentData = await publicClient.readContract({
      address: CONSENT_MANAGER_ADDRESS,
      abi: ConsentManagerAbi,
      functionName: "consents",
      args: [consentId],
    }) as [Hex, Hex, bigint, bigint, boolean, boolean]

    const [borrower, lender, startBlockTime, expiryBlockTime, isRevoked, isValue] = consentData

    // Check if this consent is for our lender and is valid
    if (
      lender.toLowerCase() === lenderAddress.toLowerCase() &&
      !isRevoked &&
      BigInt(Date.now()) / 1000n < expiryBlockTime
    ) {
      // Check if scope is included
      const scopes = await publicClient.readContract({
        address: CONSENT_MANAGER_ADDRESS,
        abi: ConsentManagerAbi,
        functionName: "getScopes",
        args: [consentId],
      }) as Hex[]

      if (scopes.some(s => s.toLowerCase() === scope.toLowerCase())) {
        return { hasConsent: true, consentId }
      }
    }
  }

  return { hasConsent: false }
}

async function getIdentityAttributes(address: Hex) {
  try {
    const attrs = await publicClient.readContract({
      address: CREDIT_REGISTRY_ADDRESS,
      abi: CreditRegistryAbi,
      functionName: "getIdentityAttributes",
      args: [address],
    }) as {
      userId: Hex
      emailHash: Hex
      creditTier: string
      incomeBracket: string
      debtRatioBracket: string
      lastUpdated: bigint
    }
    return attrs
  } catch {
    return null
  }
}

function printBox(title: string, content: string[], style: "success" | "error" | "info" = "info") {
  const colors = {
    success: "\x1b[32m",
    error: "\x1b[31m",
    info: "\x1b[36m",
  }
  const reset = "\x1b[0m"
  const color = colors[style]

  const maxLen = Math.max(title.length, ...content.map(l => l.length)) + 4
  const border = "═".repeat(maxLen)

  console.log(`${color}╔${border}╗${reset}`)
  console.log(`${color}║${reset}  ${title.padEnd(maxLen - 2)}${color}║${reset}`)
  console.log(`${color}╠${border}╣${reset}`)
  for (const line of content) {
    console.log(`${color}║${reset}  ${line.padEnd(maxLen - 2)}${color}║${reset}`)
  }
  console.log(`${color}╚${border}╝${reset}`)
}

async function main() {
  const borrowerAddress = process.argv[2] as Hex

  if (!borrowerAddress) {
    console.error("\x1b[31mUsage: bun scripts/demo-consent-check.ts <borrower-address>\x1b[0m")
    console.error("\nExample:")
    console.error("  bun scripts/demo-consent-check.ts 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266")
    process.exit(1)
  }

  console.log("\n")
  printBox("CONSENT-BASED DATA ACCESS DEMO", [
    "Simulating a lender attempting to access borrower data",
    "This demonstrates the consent verification system",
  ], "info")

  // Generate random lender
  const lenderPrivateKey = generatePrivateKey()
  const lenderAccount = privateKeyToAccount(lenderPrivateKey)
  const lenderAddress = lenderAccount.address as Hex

  console.log("\n")
  printBox("PARTICIPANTS", [
    `Borrower: ${borrowerAddress}`,
    `Lender:   ${lenderAddress} (randomly generated)`,
  ], "info")

  // Check if borrower has identity
  const identity = await getIdentityAttributes(borrowerAddress)

  if (!identity) {
    console.log("\n")
    printBox("ERROR", [
      "Borrower has no registered identity!",
      "",
      "Register identity first at:",
      "http://localhost:3000/identity",
    ], "error")
    process.exit(1)
  }

  console.log("\n")
  printBox("BORROWER IDENTITY EXISTS", [
    `Credit Tier:    ${identity.creditTier}`,
    `Income Bracket: ${identity.incomeBracket}`,
    `Debt Ratio:     ${identity.debtRatioBracket}`,
  ], "info")

  // Check consent for each scope
  console.log("\n")
  console.log("\x1b[33m━━━ CHECKING CONSENT FOR DATA ACCESS ━━━\x1b[0m\n")

  const scopeResults: { scope: string; hasConsent: boolean }[] = []

  for (const [scopeName, scopeHash] of Object.entries(SCOPES)) {
    const result = await checkConsentForLender(borrowerAddress, lenderAddress, scopeHash as Hex)
    scopeResults.push({ scope: scopeName, hasConsent: result.hasConsent })

    const status = result.hasConsent
      ? "\x1b[32m✓ GRANTED\x1b[0m"
      : "\x1b[31m✗ DENIED\x1b[0m"

    console.log(`  ${scopeName.padEnd(15)} ${status}`)
  }

  const hasAnyConsent = scopeResults.some(r => r.hasConsent)

  console.log("\n")

  if (hasAnyConsent) {
    const grantedScopes = scopeResults.filter(r => r.hasConsent).map(r => r.scope)
    printBox("ACCESS GRANTED", [
      "The lender has valid consent for:",
      ...grantedScopes.map(s => `  - ${s}`),
      "",
      "Data can be accessed for these scopes.",
    ], "success")
  } else {
    printBox("ACCESS DENIED", [
      "The lender has NO valid consent!",
      "",
      "To grant consent:",
      "1. Go to http://localhost:3000/consent",
      "2. Grant consent to the lender address:",
      `   ${lenderAddress}`,
      "3. Run this script again",
    ], "error")
  }

  // Save lender address for convenience
  console.log("\n")
  console.log("\x1b[90m─────────────────────────────────────────────────────\x1b[0m")
  console.log("\x1b[90mLender address (copy this to grant consent):\x1b[0m")
  console.log(`\x1b[33m${lenderAddress}\x1b[0m`)
  console.log("\x1b[90m─────────────────────────────────────────────────────\x1b[0m")
  console.log("\n")
}

main().catch(console.error)
