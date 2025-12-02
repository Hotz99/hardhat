/**
 * E2E tests for blockchain services
 *
 * Requires Hardhat node running at http://127.0.0.1:8545
 */

import { describe, it, expect, beforeAll } from "vitest"
import { Effect, Layer, Schema } from "effect"
import { keccak256, toBytes, type Hex } from "viem"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { createWalletClient, http, parseEther } from "viem"
import { hardhat } from "viem/chains"

import { IdentityService } from "../../services/IdentityService"
import { ConsentService } from "../../services/ConsentService"
import { AuditService } from "../../services/AuditService"
import { WalletService } from "../../services/WalletService"
import { ViemClient, ViemClientLive } from "../../services/ViemClient"
import { ContractConfig } from "../../services/ContractConfig"
import { ContractConfigLocal } from "../../layers/ContractConfigLocal"
import { IdentityServiceViemLayer } from "../../layers/IdentityServiceViem"
import { ConsentServiceViemLayer } from "../../layers/ConsentServiceViem"
import { AuditServiceViemLayer } from "../../layers/AuditServiceViem"
import { Address, Bytes32 } from "../../domain"

const decodeAddress = Schema.decodeSync(Address)
const decodeBytes32 = Schema.decodeSync(Bytes32)

// Hardhat account #0 - used for funding
const HARDHAT_FUNDER_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as Hex

// Scope hashes (same as in contracts)
const SCOPES = {
  CREDIT_SCORE: keccak256(toBytes("credit_score")) as Bytes32,
  INCOME: keccak256(toBytes("income")) as Bytes32,
  DEBT_RATIO: keccak256(toBytes("debt_ratio")) as Bytes32,
}

/**
 * Create a TestWalletService layer from a private key
 */
const TestWalletServiceLayer = (privateKey: Hex, address: Address) =>
  Layer.effect(
    WalletService,
    Effect.gen(function* () {
      const viemClient = yield* ViemClient
      const config = yield* ContractConfig

      const account = privateKeyToAccount(privateKey)
      const walletClient = createWalletClient({
        account,
        chain: config.chain,
        transport: http("http://127.0.0.1:8545"),
      })

      yield* viemClient.setWalletClient(walletClient)

      return WalletService.of({
        connect: Effect.succeed(address),
        disconnect: Effect.void,
        getAddress: Effect.succeed(address),
        isConnected: Effect.succeed(true),
        getChainId: Effect.succeed(config.chain.id),
        ensureCorrectNetwork: Effect.void,
      })
    })
  )

/**
 * Generate a random funded account
 */
const generateFundedAccount = async (): Promise<{
  privateKey: Hex
  address: Address
}> => {
  const privateKey = generatePrivateKey()
  const account = privateKeyToAccount(privateKey)
  const address = decodeAddress(account.address)

  const funderAccount = privateKeyToAccount(HARDHAT_FUNDER_KEY)
  const funderClient = createWalletClient({
    account: funderAccount,
    chain: hardhat,
    transport: http("http://127.0.0.1:8545"),
  })

  await funderClient.sendTransaction({
    to: account.address,
    value: parseEther("10"),
  })

  return { privateKey, address }
}

/**
 * Create a complete test layer for a private key
 */
const createTestLayer = (privateKey: Hex, address: Address) => {
  const infrastructure = Layer.provideMerge(ViemClientLive, ContractConfigLocal)
  const walletLayer = TestWalletServiceLayer(privateKey, address).pipe(
    Layer.provide(infrastructure)
  )

  return Layer.mergeAll(
    IdentityServiceViemLayer,
    ConsentServiceViemLayer,
    AuditServiceViemLayer
  ).pipe(Layer.provideMerge(walletLayer), Layer.provide(infrastructure))
}

// ============================================================================
// Identity Service Tests
// ============================================================================

describe("IdentityService E2E", () => {
  let testLayer: Layer.Layer<
    IdentityService | ConsentService | AuditService | WalletService
  >
  let testAddress: Address

  beforeAll(async () => {
    const account = await generateFundedAccount()
    testLayer = createTestLayer(account.privateKey, account.address)
    testAddress = account.address
  })

  it("should register identity attributes", async () => {
    const emailHash = keccak256(toBytes("test@example.com")) as Bytes32
    const accountRefHash = keccak256(toBytes("account-ref-123")) as Bytes32

    const program = Effect.gen(function* () {
      const identity = yield* IdentityService

      yield* identity.register({
        emailHash,
        creditTier: "A",
        incomeBracket: "50k-100k",
        debtRatioBracket: "0-20%",
        accountReferenceHash: accountRefHash,
      })

      return "registered"
    })

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(testLayer))
    )
    expect(result).toBe("registered")
  })

  it("should check if identity exists", async () => {
    const program = Effect.gen(function* () {
      const identity = yield* IdentityService
      return yield* identity.hasOwn
    })

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(testLayer))
    )
    expect(result).toBe(true)
  })

  it("should get identity attributes", async () => {
    const program = Effect.gen(function* () {
      const identity = yield* IdentityService
      return yield* identity.getOwn
    })

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(testLayer))
    )

    expect(result.creditTier).toBe("A")
    expect(result.incomeBracket).toBe("50k-100k")
    expect(result.debtRatioBracket).toBe("0-20%")
    expect(result.userId).toBe(testAddress)
  })

  it("should update identity attributes", async () => {
    const program = Effect.gen(function* () {
      const identity = yield* IdentityService

      yield* identity.update({
        creditTier: "B",
        incomeBracket: "100k-150k",
      })

      return yield* identity.getOwn
    })

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(testLayer))
    )

    expect(result.creditTier).toBe("B")
    expect(result.incomeBracket).toBe("100k-150k")
    expect(result.debtRatioBracket).toBe("0-20%") // unchanged
  })

  it("should return false for non-existent identity", async () => {
    const randomAddress = decodeAddress(
      "0x1234567890123456789012345678901234567890"
    )

    const program = Effect.gen(function* () {
      const identity = yield* IdentityService
      return yield* identity.has(randomAddress)
    })

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(testLayer))
    )
    expect(result).toBe(false)
  })
})

// ============================================================================
// Consent Service Tests
// ============================================================================

describe("ConsentService E2E", () => {
  let borrowerLayer: Layer.Layer<
    IdentityService | ConsentService | AuditService | WalletService
  >
  let lenderLayer: Layer.Layer<
    IdentityService | ConsentService | AuditService | WalletService
  >
  let borrowerAddress: Address
  let lenderAddress: Address
  let consentId: Bytes32

  beforeAll(async () => {
    // Create borrower and lender accounts
    const borrowerAccount = await generateFundedAccount()
    const lenderAccount = await generateFundedAccount()

    borrowerLayer = createTestLayer(
      borrowerAccount.privateKey,
      borrowerAccount.address
    )
    lenderLayer = createTestLayer(
      lenderAccount.privateKey,
      lenderAccount.address
    )
    borrowerAddress = borrowerAccount.address
    lenderAddress = lenderAccount.address

    // Register identities for both accounts
    const emailHash = keccak256(toBytes("borrower@test.com")) as Bytes32
    const accountRefHash = keccak256(toBytes("borrower-ref")) as Bytes32

    await Effect.runPromise(
      Effect.gen(function* () {
        const identity = yield* IdentityService
        yield* identity.register({
          emailHash,
          creditTier: "A",
          incomeBracket: "50k-100k",
          debtRatioBracket: "0-20%",
          accountReferenceHash: accountRefHash,
        })
      }).pipe(Effect.provide(borrowerLayer))
    )
  })

  it("should grant consent to lender", async () => {
    const program = Effect.gen(function* () {
      const consent = yield* ConsentService

      const id = yield* consent.grant({
        lender: lenderAddress,
        scopes: [SCOPES.CREDIT_SCORE, SCOPES.INCOME],
        durationSeconds: BigInt(86400 * 30), // 30 days
      })

      return id
    })

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(borrowerLayer))
    )

    expect(result).toBeDefined()
    expect(typeof result).toBe("string")
    expect(result.startsWith("0x")).toBe(true)
    consentId = result
  })

  it("should check consent is valid", async () => {
    const program = Effect.gen(function* () {
      const consent = yield* ConsentService
      return yield* consent.isValid(consentId)
    })

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(borrowerLayer))
    )
    expect(result).toBe(true)
  })

  it("should get consent details", async () => {
    const program = Effect.gen(function* () {
      const consent = yield* ConsentService
      return yield* consent.getConsent(consentId)
    })

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(borrowerLayer))
    )

    expect(result.borrower).toBe(borrowerAddress)
    expect(result.lender).toBe(lenderAddress)
    expect(result.isRevoked).toBe(false)
    expect(result.scopes.length).toBe(2)
  })

  it("should get borrower consents", async () => {
    const program = Effect.gen(function* () {
      const consent = yield* ConsentService
      return yield* consent.getOwnConsents
    })

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(borrowerLayer))
    )

    expect(result.length).toBeGreaterThanOrEqual(1)
    expect(result.some((c) => c.consentId === consentId)).toBe(true)
  })

  it("should revoke consent by id", async () => {
    const program = Effect.gen(function* () {
      const consent = yield* ConsentService
      yield* consent.revokeById(consentId)
      return yield* consent.isValid(consentId)
    })

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(borrowerLayer))
    )
    expect(result).toBe(false)
  })

  it("should show revoked consent details", async () => {
    const program = Effect.gen(function* () {
      const consent = yield* ConsentService
      return yield* consent.getConsent(consentId)
    })

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(borrowerLayer))
    )
    expect(result.isRevoked).toBe(true)
  })
})

// ============================================================================
// Audit Service Tests
// ============================================================================

describe("AuditService E2E", () => {
  let testLayer: Layer.Layer<
    IdentityService | ConsentService | AuditService | WalletService
  >

  beforeAll(async () => {
    const account = await generateFundedAccount()
    testLayer = createTestLayer(account.privateKey, account.address)
  })

  it("should get logs count", async () => {
    const program = Effect.gen(function* () {
      const audit = yield* AuditService
      return yield* audit.getLogsCount
    })

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(testLayer))
    )

    expect(typeof result).toBe("bigint")
    expect(result).toBeGreaterThanOrEqual(BigInt(0))
  })

  it("should get recent logs", async () => {
    const program = Effect.gen(function* () {
      const audit = yield* AuditService
      return yield* audit.getRecentLogs(BigInt(10))
    })

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(testLayer))
    )

    expect(Array.isArray(result)).toBe(true)
  })

  it("should return empty for fresh account access history", async () => {
    const program = Effect.gen(function* () {
      const audit = yield* AuditService
      return yield* audit.getOwnAccessHistory
    })

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(testLayer))
    )

    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBe(0)
  })
})

// ============================================================================
// Integration Tests (Cross-service)
// ============================================================================

describe("Integration E2E", () => {
  it("should complete full borrower-lender flow", async () => {
    // Setup: Create borrower and lender with registered identities
    const borrowerAccount = await generateFundedAccount()
    const lenderAccount = await generateFundedAccount()

    const borrowerLayer = createTestLayer(
      borrowerAccount.privateKey,
      borrowerAccount.address
    )
    const lenderLayer = createTestLayer(
      lenderAccount.privateKey,
      lenderAccount.address
    )

    // 1. Borrower registers identity
    await Effect.runPromise(
      Effect.gen(function* () {
        const identity = yield* IdentityService
        yield* identity.register({
          emailHash: keccak256(toBytes("full-test@example.com")) as Bytes32,
          creditTier: "A+",
          incomeBracket: "150k+",
          debtRatioBracket: "0-10%",
          accountReferenceHash: keccak256(
            toBytes("full-test-ref")
          ) as Bytes32,
        })
      }).pipe(Effect.provide(borrowerLayer))
    )

    // 2. Verify identity exists
    const hasIdentity = await Effect.runPromise(
      Effect.gen(function* () {
        const identity = yield* IdentityService
        return yield* identity.has(borrowerAccount.address)
      }).pipe(Effect.provide(lenderLayer))
    )
    expect(hasIdentity).toBe(true)

    // 3. Borrower grants consent to lender
    const consentId = await Effect.runPromise(
      Effect.gen(function* () {
        const consent = yield* ConsentService
        return yield* consent.grant({
          lender: lenderAccount.address,
          scopes: [SCOPES.CREDIT_SCORE],
          durationSeconds: BigInt(3600), // 1 hour
        })
      }).pipe(Effect.provide(borrowerLayer))
    )

    // 4. Lender verifies consent is valid
    const isValid = await Effect.runPromise(
      Effect.gen(function* () {
        const consent = yield* ConsentService
        return yield* consent.isValid(consentId)
      }).pipe(Effect.provide(lenderLayer))
    )
    expect(isValid).toBe(true)

    // 5. Borrower revokes consent
    await Effect.runPromise(
      Effect.gen(function* () {
        const consent = yield* ConsentService
        yield* consent.revokeById(consentId)
      }).pipe(Effect.provide(borrowerLayer))
    )

    // 6. Lender verifies consent is no longer valid
    const isStillValid = await Effect.runPromise(
      Effect.gen(function* () {
        const consent = yield* ConsentService
        return yield* consent.isValid(consentId)
      }).pipe(Effect.provide(lenderLayer))
    )
    expect(isStillValid).toBe(false)
  })
})
