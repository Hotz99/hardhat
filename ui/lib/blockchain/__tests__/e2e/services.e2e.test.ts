/**
 * E2E tests for blockchain services
 *
 * Requires Hardhat node running at http://127.0.0.1:8545
 */

import { describe, it, expect, beforeAll, assert } from "vitest"
import { Effect, Exit, Layer, Option, Schema } from "effect"
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

const infrastructure = Layer.provideMerge(ViemClientLive, ContractConfigLocal)

const testLayer = Layer.mergeAll(
  IdentityServiceViemLayer,
  ConsentServiceViemLayer,
  AuditServiceViemLayer
)
/**
 * Create a complete test layer for a private key
 */
const createTestLayer = (privateKey: Hex, address: Address) => {

  // Merge wallet layer WITH infrastructure so both are provided together
  // This ensures all services share the same ViemClient instance
  const walletWithInfra = Layer.provideMerge(
    TestWalletServiceLayer(privateKey, address),
    infrastructure
  )

  return Layer.provide(testLayer, walletWithInfra)
}

// ============================================================================
// Identity Service Tests
// ============================================================================

describe("IdentityService E2E", () => {
  let testLayer: Layer.Layer<
    IdentityService | ConsentService | AuditService
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

  it("should get identity by address directly", async () => {
    const program = Effect.gen(function* () {
      const identity = yield* IdentityService
      return yield* identity.get(testAddress)
    })

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(testLayer))
    )
    expect(result.userId).toBe(testAddress)
    expect(result.creditTier).toBe("B") // Updated in previous test
  })

  it("should return Some for existing identity via getOption", async () => {
    const program = Effect.gen(function* () {
      const identity = yield* IdentityService
      return yield* identity.getOption(testAddress)
    })

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(testLayer))
    )
    expect(Option.isSome(result)).toBe(true)
    if (Option.isSome(result)) {
      expect(result.value.userId).toBe(testAddress)
    }
  })

  it("should return None for non-existent identity via getOption", async () => {
    // Generate a fresh random address that definitely has no identity
    const randomKey = generatePrivateKey()
    const randomAccount = privateKeyToAccount(randomKey)
    const randomAddress = decodeAddress(randomAccount.address)

    const program = Effect.gen(function* () {
      const identity = yield* IdentityService
      return yield* identity.getOption(randomAddress)
    })

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(testLayer))
    )
    expect(Option.isNone(result)).toBe(true)
  })
})

// ============================================================================
// Consent Service Tests
// ============================================================================

describe("ConsentService E2E", () => {
  let borrowerLayer: Layer.Layer<
    IdentityService | ConsentService | AuditService
  >
  let lenderLayer: Layer.Layer<
    IdentityService | ConsentService | AuditService
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

  it("should get borrower consents directly by address", async () => {
    const program = Effect.gen(function* () {
      const consent = yield* ConsentService
      return yield* consent.getBorrowerConsents(borrowerAddress)
    })

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(lenderLayer))
    )
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBeGreaterThanOrEqual(1)
    expect(result.some((id) => id === consentId)).toBe(true)
  })

  it("should revoke all consents for a lender", async () => {
    // First grant a new consent
    const newConsentId = await Effect.runPromise(
      Effect.gen(function* () {
        const consent = yield* ConsentService
        return yield* consent.grant({
          lender: lenderAddress,
          scopes: [SCOPES.DEBT_RATIO],
          durationSeconds: BigInt(86400),
        })
      }).pipe(Effect.provide(borrowerLayer))
    )

    // Verify it's valid
    const isValidBefore = await Effect.runPromise(
      Effect.gen(function* () {
        const consent = yield* ConsentService
        return yield* consent.isValid(newConsentId)
      }).pipe(Effect.provide(borrowerLayer))
    )
    expect(isValidBefore).toBe(true)

    // Revoke all consents for lender
    await Effect.runPromise(
      Effect.gen(function* () {
        const consent = yield* ConsentService
        yield* consent.revokeAll(lenderAddress)
      }).pipe(Effect.provide(borrowerLayer))
    )

    // Verify it's no longer valid
    const isValidAfter = await Effect.runPromise(
      Effect.gen(function* () {
        const consent = yield* ConsentService
        return yield* consent.isValid(newConsentId)
      }).pipe(Effect.provide(borrowerLayer))
    )
    expect(isValidAfter).toBe(false)
  })

  it("should fail with ConsentNotFoundError for non-existent consent", async () => {
    // Use a random bytes32 that doesn't correspond to any consent
    const fakeConsentId = keccak256(toBytes("non-existent-consent-id")) as Bytes32

    const program = Effect.gen(function* () {
      const consent = yield* ConsentService
      return yield* consent.getConsent(fakeConsentId)
    })

    const result = await Effect.runPromiseExit(
      program.pipe(Effect.provide(borrowerLayer))
    )

    assert(Exit.isFailure(result), "Expected failure for non-existent consent")
    expect(String(result.cause)).toContain("ConsentNotFoundError")
  })
})

// ============================================================================
// Audit Service Tests
// ============================================================================

describe("AuditService E2E", () => {
  let testLayer: Layer.Layer<
    IdentityService | ConsentService | AuditService
  >
  let testAddress: Address
  let initialLogsCount: bigint

  beforeAll(async () => {
    // Contract links are set up in global setup (setup.ts)

    // Create test account
    const account = await generateFundedAccount()
    testLayer = createTestLayer(account.privateKey, account.address)
    testAddress = account.address

    // Get initial logs count
    initialLogsCount = await Effect.runPromise(
      Effect.gen(function* () {
        const audit = yield* AuditService
        return yield* audit.getLogsCount
      }).pipe(Effect.provide(testLayer))
    )

    // Register identity - this creates an audit entry
    const emailHash = keccak256(toBytes("audit-test@example.com")) as Bytes32
    const accountRefHash = keccak256(toBytes("audit-test-ref")) as Bytes32

    await Effect.runPromise(
      Effect.gen(function* () {
        const identity = yield* IdentityService
        yield* identity.register({
          emailHash,
          creditTier: "B",
          incomeBracket: "75k-100k",
          debtRatioBracket: "10-20%",
          accountReferenceHash: accountRefHash,
        })
      }).pipe(Effect.provide(testLayer))
    )
  })

  it("should get logs count (increased after registration)", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const audit = yield* AuditService
        return yield* audit.getLogsCount
      }).pipe(Effect.provide(testLayer))
    )

    expect(typeof result).toBe("bigint")
    expect(result).toBeGreaterThan(initialLogsCount)
  })

  it("should get recent logs with actual entries", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const audit = yield* AuditService
        return yield* audit.getRecentLogs(BigInt(10))
      }).pipe(Effect.provide(testLayer))
    )

    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)

    // Verify entry structure
    const entry = result[0]
    expect(typeof entry.entryId).toBe("bigint")
    expect(typeof entry.accessorUserId).toBe("string")
    expect(typeof entry.subjectUserId).toBe("string")
    expect(typeof entry.hashedScope).toBe("string")
    expect(typeof entry.unixTimestamp).toBe("bigint")
    expect(typeof entry.eventType).toBe("number")
  })

  it("should get entry by id", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const audit = yield* AuditService
        const logsCount = yield* audit.getLogsCount
        // Get the most recent entry (created by our registration)
        return yield* audit.getEntry(logsCount - BigInt(1))
      }).pipe(Effect.provide(testLayer))
    )

    expect(typeof result.entryId).toBe("bigint")
    expect(result.accessorUserId).toBe(testAddress)
    expect(result.subjectUserId).toBe(testAddress)
    expect(typeof result.unixTimestamp).toBe("bigint")
    // EventType 3 = IDENTITY_REGISTERED
    expect(result.eventType).toBe(3)
  })

  it("should get access history by address", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const audit = yield* AuditService
        return yield* audit.getAccessHistory(testAddress)
      }).pipe(Effect.provide(testLayer))
    )

    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
    expect(typeof result[0]).toBe("bigint")
  })

  it("should get own access history with entries", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const audit = yield* AuditService
        return yield* audit.getOwnAccessHistory
      }).pipe(Effect.provide(testLayer))
    )

    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)

    // Verify it returns AuditEntry objects
    const entry = result[0]
    expect(entry.accessorUserId).toBe(testAddress)
    expect(entry.subjectUserId).toBe(testAddress)
  })

  it("should fail for non-existent entry", async () => {
    const result = await Effect.runPromiseExit(
      Effect.gen(function* () {
        const audit = yield* AuditService
        return yield* audit.getEntry(BigInt(999999999))
      }).pipe(Effect.provide(testLayer))
    )

    assert(Exit.isFailure(result), "Expected failure for non-existent entry")
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
