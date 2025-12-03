#!/usr/bin/env bun
/**
 * Demo script: Consent-based data access
 *
 * Simulates a lender trying to access a borrower's data.
 * Shows consent denial/approval flow.
 *
 * Usage:
 *   bun scripts/demo-consent-check.ts <borrower-address>
 *   bun scripts/demo-consent-check.ts --new-lender <borrower-address>
 */

import { Args, Command, Options } from "@effect/cli"
import { BunContext, BunRuntime } from "@effect/platform-bun"
import { FileSystem, Path } from "@effect/platform"
import { Console, Data, Effect, Match, pipe } from "effect"
import { createPublicClient, createWalletClient, http, keccak256, parseEther, toBytes, type Hex } from "viem"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { hardhat } from "viem/chains"
import { CreditRegistryAbi } from "../lib/blockchain/contracts/abis"

const HARDHAT_URL = "http://127.0.0.1:8545"

// Contract addresses (from local deployment)
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

// ============================================================================
// Errors
// ============================================================================

class IdentityNotFoundError extends Data.TaggedError("IdentityNotFoundError")<{
  readonly address: Hex
}> {}

class ConsentCheckError extends Data.TaggedError("ConsentCheckError")<{
  readonly reason: string
}> {}

// ============================================================================
// File System Operations
// ============================================================================

const CACHE_FILENAME = ".demo-lender-cache.json"

interface LenderCache {
  privateKey: Hex
  address: Hex
}

const readLenderCache = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem
  const pathService = yield* Path.Path

  const cacheFilePath = pathService.join(import.meta.dir, CACHE_FILENAME)
  const exists = yield* fs.exists(cacheFilePath)

  if (!exists) {
    return null
  }

  const content = yield* fs.readFileString(cacheFilePath)
  return JSON.parse(content) as LenderCache
})

const writeLenderCache = (cache: LenderCache) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const pathService = yield* Path.Path

    const cacheFilePath = pathService.join(import.meta.dir, CACHE_FILENAME)
    yield* fs.writeFileString(cacheFilePath, JSON.stringify(cache, null, 2))
  })

// ============================================================================
// Blockchain Operations
// ============================================================================

const fundLender = (lenderAddress: Hex) =>
  Effect.tryPromise({
    try: async () => {
      const funderAccount = privateKeyToAccount(HARDHAT_FUNDER_KEY)
      const funderClient = createWalletClient({
        account: funderAccount,
        chain: hardhat,
        transport: http(HARDHAT_URL),
      })

      const hash = await funderClient.sendTransaction({
        to: lenderAddress,
        value: parseEther("1"),
      })

      await publicClient.waitForTransactionReceipt({ hash })
    },
    catch: (error) => new ConsentCheckError({ reason: `Failed to fund lender: ${error}` }),
  })

const requestDataAccess = (
  lenderPrivateKey: Hex,
  borrowerAddress: Hex,
  scope: Hex
) =>
  Effect.tryPromise({
    try: async () => {
      const lenderAccount = privateKeyToAccount(lenderPrivateKey)
      const lenderClient = createWalletClient({
        account: lenderAccount,
        chain: hardhat,
        transport: http(HARDHAT_URL),
      })

      // Call requestDataAccess - this logs to AuditLog
      const hash = await lenderClient.writeContract({
        address: CREDIT_REGISTRY_ADDRESS,
        abi: CreditRegistryAbi,
        functionName: "requestDataAccess",
        args: [borrowerAddress, scope],
      })

      const receipt = await publicClient.waitForTransactionReceipt({ hash })

      // Simulate the call to get the return value
      const authorized = await publicClient.simulateContract({
        address: CREDIT_REGISTRY_ADDRESS,
        abi: CreditRegistryAbi,
        functionName: "requestDataAccess",
        args: [borrowerAddress, scope],
        account: lenderAccount,
      })

      return { hasConsent: authorized.result as boolean }
    },
    catch: (error) => new ConsentCheckError({ reason: String(error) }),
  })

const getIdentityAttributes = (address: Hex) =>
  Effect.tryPromise({
    try: async () => {
      const attrs = (await publicClient.readContract({
        address: CREDIT_REGISTRY_ADDRESS,
        abi: CreditRegistryAbi,
        functionName: "getIdentityAttributes",
        args: [address],
      })) as {
        userId: Hex
        emailHash: Hex
        creditTier: string
        incomeBracket: string
        debtRatioBracket: string
        lastUpdated: bigint
      }
      return attrs
    },
    catch: () => new IdentityNotFoundError({ address }),
  })

// ============================================================================
// Display Helpers
// ============================================================================

type BoxStyle = "success" | "error" | "info"

const colors = {
  success: "\x1b[32m",
  error: "\x1b[31m",
  info: "\x1b[36m",
  yellow: "\x1b[33m",
  dim: "\x1b[90m",
  reset: "\x1b[0m",
} as const

const printBox = (title: string, content: readonly string[], style: BoxStyle = "info") =>
  Effect.gen(function* () {
    const color = colors[style]
    const reset = colors.reset

    const maxLen = Math.max(title.length, ...content.map((l) => l.length)) + 4
    const border = "═".repeat(maxLen)

    yield* Console.log(`${color}╔${border}╗${reset}`)
    yield* Console.log(`${color}║${reset}  ${title.padEnd(maxLen - 2)}${color}║${reset}`)
    yield* Console.log(`${color}╠${border}╣${reset}`)
    for (const line of content) {
      yield* Console.log(`${color}║${reset}  ${line.padEnd(maxLen - 2)}${color}║${reset}`)
    }
    yield* Console.log(`${color}╚${border}╝${reset}`)
  })

// ============================================================================
// CLI Definition
// ============================================================================

const borrowerArg = Args.text({ name: "borrower" }).pipe(
  Args.withDescription("Borrower wallet address (e.g., 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266)")
)

const newLenderOption = Options.boolean("newLender").pipe(
  Options.withAlias("n"),
  Options.withDescription("Generate a new lender address (default: reuse cached)")
)

const demoCommand = Command.make(
  "demo-consent-check",
  { borrower: borrowerArg, newLender: newLenderOption },
  ({ borrower, newLender }) =>
    Effect.gen(function* () {
      const borrowerAddress = borrower as Hex

      yield* Console.log("\n")
      yield* printBox("CONSENT-BASED DATA ACCESS DEMO", [
        "Simulating a lender attempting to access borrower data",
        "This demonstrates the consent verification system",
      ], "info")

      // Get or generate lender
      const cachedLender = yield* readLenderCache.pipe(
        Effect.catchAll(() => Effect.succeed(null))
      )

      const { lenderAddress, lenderPrivateKey } = yield* pipe(
        Match.value({ cachedLender, newLender }),
        Match.when({ cachedLender: Match.defined, newLender: false }, ({ cachedLender }) =>
          Effect.gen(function* () {
            yield* Console.log(`\n${colors.dim}Using cached lender address${colors.reset}`)
            return { lenderAddress: cachedLender.address, lenderPrivateKey: cachedLender.privateKey }
          })
        ),
        Match.orElse(() =>
          Effect.gen(function* () {
            const lenderPrivateKey = generatePrivateKey()
            const lenderAccount = privateKeyToAccount(lenderPrivateKey)
            const lenderAddress = lenderAccount.address as Hex

            yield* writeLenderCache({ privateKey: lenderPrivateKey, address: lenderAddress }).pipe(
              Effect.catchAll(() => Effect.void)
            )
            yield* Console.log(`\n${colors.yellow}Generated new lender address${colors.reset}`)
            return { lenderAddress, lenderPrivateKey }
          })
        )
      )

      // Fund the lender so they can make transactions
      yield* Console.log(`${colors.dim}Funding lender wallet...${colors.reset}`)
      yield* fundLender(lenderAddress)

      yield* Console.log("\n")
      yield* printBox("PARTICIPANTS", [
        `Borrower: ${borrowerAddress}`,
        `Lender:   ${lenderAddress}`,
      ], "info")

      // Check if borrower has identity
      const identity = yield* getIdentityAttributes(borrowerAddress).pipe(
        Effect.catchTag("IdentityNotFoundError", (e) =>
          Effect.gen(function* () {
            yield* Console.log("\n")
            yield* printBox("ERROR", [
              "Borrower has no registered identity!",
              "",
              "Register identity first at:",
              "http://localhost:3000/identity",
            ], "error")
            return null
          })
        )
      )

      if (!identity) return

      yield* Console.log("\n")
      yield* printBox("BORROWER IDENTITY EXISTS", [
        `Credit Tier:    ${identity.creditTier}`,
        `Income Bracket: ${identity.incomeBracket}`,
        `Debt Ratio:     ${identity.debtRatioBracket}`,
      ], "info")

      // Check consent for each scope (this creates audit log entries!)
      yield* Console.log("\n")
      yield* Console.log(`${colors.yellow}━━━ REQUESTING DATA ACCESS (logged to AuditLog) ━━━${colors.reset}\n`)

      const scopeResults: { scope: string; hasConsent: boolean }[] = []

      for (const [scopeName, scopeHash] of Object.entries(SCOPES)) {
        const result = yield* requestDataAccess(lenderPrivateKey, borrowerAddress, scopeHash as Hex)
        scopeResults.push({ scope: scopeName, hasConsent: result.hasConsent })

        const status = result.hasConsent
          ? `${colors.success}✓ GRANTED${colors.reset}`
          : `${colors.error}✗ DENIED${colors.reset}`

        yield* Console.log(`  ${scopeName.padEnd(15)} ${status}`)
      }

      const hasAnyConsent = scopeResults.some((r) => r.hasConsent)

      yield* Console.log("\n")

      if (hasAnyConsent) {
        const grantedScopes = scopeResults.filter((r) => r.hasConsent).map((r) => r.scope)
        yield* printBox("ACCESS GRANTED", [
          "The lender has valid consent for:",
          ...grantedScopes.map((s) => `  - ${s}`),
          "",
          "Data can be accessed for these scopes.",
        ], "success")
      } else {
        yield* printBox("ACCESS DENIED", [
          "The lender has NO valid consent!",
          "",
          "To grant consent:",
          "1. Go to http://localhost:3000/consent",
          "2. Grant consent to the lender address:",
          `   ${lenderAddress}`,
          "3. Run this script again",
        ], "error")
      }

      // Show lender address for convenience
      yield* Console.log("\n")
      yield* Console.log(`${colors.dim}─────────────────────────────────────────────────────${colors.reset}`)
      yield* Console.log(`${colors.dim}Lender address (copy this to grant consent):${colors.reset}`)
      yield* Console.log(`${colors.yellow}${lenderAddress}${colors.reset}`)
      yield* Console.log(`${colors.dim}─────────────────────────────────────────────────────${colors.reset}`)
      yield* Console.log("\n")
    })
)

// ============================================================================
// Run CLI
// ============================================================================

const cli = Command.run(demoCommand, {
  name: "demo-consent-check",
  version: "1.0.0",
})

pipe(
  cli(process.argv),
  Effect.provide(BunContext.layer),
  BunRuntime.runMain
)
