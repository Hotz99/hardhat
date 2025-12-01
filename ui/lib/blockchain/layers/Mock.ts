/**
 * Mock service layers for testing and development
 *
 * @since 1.0.0
 * @category Layers
 */

import { Layer, Effect, Option } from "effect"
import { WalletService } from "../services/WalletService"
import { IdentityService } from "../services/IdentityService"
import { ConsentService } from "../services/ConsentService"
import { AuditService } from "../services/AuditService"
import { ConsentNotFoundError, AuditEntryNotFoundError } from "../errors"
import type { Address } from "../domain/Address"
import type { Bytes32 } from "../domain/Bytes32"
import { IdentityAttributes } from "../domain/IdentityAttributes"
import { Consent } from "../domain/Consent"
import { AuditEntry } from "../domain/AuditEntry"

// Mock addresses
const MOCK_USER_ADDRESS = "0x1234567890123456789012345678901234567890" as Address
const MOCK_LENDER_1 = "0xabcdef0123456789abcdef0123456789abcdef01" as Address
const MOCK_LENDER_2 = "0xfedcba9876543210fedcba9876543210fedcba98" as Address
const MOCK_LENDER_3 = "0x1111111111111111111111111111111111111111" as Address

// Mock bytes32 values
const MOCK_EMAIL_HASH = "0x742d35cc6634c0532925a3b844bc9e7eb6ceddc051cdf9e5c5c0fce7c5f6e0f8" as Bytes32
const MOCK_ACCOUNT_REF_HASH = "0xa7c5ac471b4784230fcf80dc33721d53cddd6e04c059210385c67dfe32c4c5e1" as Bytes32

// Mock consent scopes
const SCOPE_CREDIT_TIER = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef" as Bytes32
const SCOPE_INCOME_BRACKET = "0x2345678901bcdef02345678901bcdef02345678901bcdef02345678901bcdef0" as Bytes32
const SCOPE_DEBT_RATIO = "0x3456789012cdef123456789012cdef123456789012cdef123456789012cdef12" as Bytes32
const SCOPE_EMAIL_HASH = "0x456789023def234567890234def234567890234def234567890234def2345678" as Bytes32

// Mock consent IDs
const CONSENT_ID_1 = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as Bytes32
const CONSENT_ID_2 = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" as Bytes32
const CONSENT_ID_3 = "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc" as Bytes32
const CONSENT_ID_4 = "0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd" as Bytes32
const CONSENT_ID_5 = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee" as Bytes32

// Timestamps
const NOW = BigInt(Math.floor(Date.now() / 1000))
const ONE_DAY = BigInt(86400)
const ONE_WEEK = BigInt(604800)
const ONE_MONTH = BigInt(2592000)

// Mock identity data
const MOCK_IDENTITY = new IdentityAttributes({
  userId: MOCK_USER_ADDRESS,
  emailHash: MOCK_EMAIL_HASH,
  creditTier: "EXCELLENT",
  incomeBracket: "$75,000 - $100,000",
  debtRatioBracket: "0-20%",
  lastUpdated: NOW - ONE_DAY * BigInt(5),
})

// Mock consents with varied states
const MOCK_CONSENTS: readonly Consent[] = [
  // Active consent with full scopes
  new Consent({
    consentId: CONSENT_ID_1,
    borrower: MOCK_USER_ADDRESS,
    lender: MOCK_LENDER_1,
    scopes: [SCOPE_CREDIT_TIER, SCOPE_INCOME_BRACKET, SCOPE_DEBT_RATIO, SCOPE_EMAIL_HASH],
    startBlockTime: NOW - ONE_WEEK,
    expiryBlockTime: NOW + ONE_MONTH,
    isRevoked: false,
  }),
  // Active consent with limited scopes
  new Consent({
    consentId: CONSENT_ID_2,
    borrower: MOCK_USER_ADDRESS,
    lender: MOCK_LENDER_2,
    scopes: [SCOPE_CREDIT_TIER, SCOPE_INCOME_BRACKET],
    startBlockTime: NOW - ONE_DAY * BigInt(3),
    expiryBlockTime: NOW + ONE_WEEK * BigInt(2),
    isRevoked: false,
  }),
  // Expired consent
  new Consent({
    consentId: CONSENT_ID_3,
    borrower: MOCK_USER_ADDRESS,
    lender: MOCK_LENDER_3,
    scopes: [SCOPE_CREDIT_TIER],
    startBlockTime: NOW - ONE_MONTH * BigInt(2),
    expiryBlockTime: NOW - ONE_DAY * BigInt(7),
    isRevoked: false,
  }),
  // Revoked consent
  new Consent({
    consentId: CONSENT_ID_4,
    borrower: MOCK_USER_ADDRESS,
    lender: MOCK_LENDER_1,
    scopes: [SCOPE_CREDIT_TIER, SCOPE_DEBT_RATIO],
    startBlockTime: NOW - ONE_MONTH,
    expiryBlockTime: NOW + ONE_WEEK,
    isRevoked: true,
  }),
  // Fresh consent
  new Consent({
    consentId: CONSENT_ID_5,
    borrower: MOCK_USER_ADDRESS,
    lender: MOCK_LENDER_2,
    scopes: [SCOPE_EMAIL_HASH],
    startBlockTime: NOW - ONE_DAY,
    expiryBlockTime: NOW + ONE_MONTH * BigInt(3),
    isRevoked: false,
  }),
]

// Mock audit entries with varied event types
const MOCK_AUDIT_ENTRIES: readonly AuditEntry[] = [
  // Recent consent grant
  new AuditEntry({
    entryId: BigInt(100),
    accessorUserId: MOCK_LENDER_2,
    subjectUserId: MOCK_USER_ADDRESS,
    hashedScope: SCOPE_EMAIL_HASH,
    unixTimestamp: NOW - ONE_DAY,
    eventType: 0, // ConsentGranted
  }),
  // Recent consent check
  new AuditEntry({
    entryId: BigInt(101),
    accessorUserId: MOCK_LENDER_1,
    subjectUserId: MOCK_USER_ADDRESS,
    hashedScope: SCOPE_CREDIT_TIER,
    unixTimestamp: NOW - ONE_DAY * BigInt(2),
    eventType: 2, // ConsentChecked
  }),
  // Consent revoked
  new AuditEntry({
    entryId: BigInt(102),
    accessorUserId: MOCK_USER_ADDRESS,
    subjectUserId: MOCK_USER_ADDRESS,
    hashedScope: SCOPE_CREDIT_TIER,
    unixTimestamp: NOW - ONE_DAY * BigInt(3),
    eventType: 1, // ConsentRevoked
  }),
  // Identity updated
  new AuditEntry({
    entryId: BigInt(103),
    accessorUserId: MOCK_USER_ADDRESS,
    subjectUserId: MOCK_USER_ADDRESS,
    hashedScope: "0x0000000000000000000000000000000000000000000000000000000000000000" as Bytes32,
    unixTimestamp: NOW - ONE_DAY * BigInt(5),
    eventType: 4, // IdentityUpdated
  }),
  // Older consent grant
  new AuditEntry({
    entryId: BigInt(104),
    accessorUserId: MOCK_LENDER_2,
    subjectUserId: MOCK_USER_ADDRESS,
    hashedScope: SCOPE_INCOME_BRACKET,
    unixTimestamp: NOW - ONE_WEEK,
    eventType: 0, // ConsentGranted
  }),
  // Consent check by lender 1
  new AuditEntry({
    entryId: BigInt(105),
    accessorUserId: MOCK_LENDER_1,
    subjectUserId: MOCK_USER_ADDRESS,
    hashedScope: SCOPE_DEBT_RATIO,
    unixTimestamp: NOW - ONE_WEEK - ONE_DAY,
    eventType: 2, // ConsentChecked
  }),
  // Data request rejected
  new AuditEntry({
    entryId: BigInt(106),
    accessorUserId: MOCK_LENDER_3,
    subjectUserId: MOCK_USER_ADDRESS,
    hashedScope: SCOPE_EMAIL_HASH,
    unixTimestamp: NOW - ONE_WEEK * BigInt(2),
    eventType: 5, // DataRequestRejected
  }),
  // Identity registered
  new AuditEntry({
    entryId: BigInt(107),
    accessorUserId: MOCK_USER_ADDRESS,
    subjectUserId: MOCK_USER_ADDRESS,
    hashedScope: "0x0000000000000000000000000000000000000000000000000000000000000000" as Bytes32,
    unixTimestamp: NOW - ONE_MONTH,
    eventType: 3, // IdentityRegistered
  }),
  // Old consent grant
  new AuditEntry({
    entryId: BigInt(108),
    accessorUserId: MOCK_LENDER_3,
    subjectUserId: MOCK_USER_ADDRESS,
    hashedScope: SCOPE_CREDIT_TIER,
    unixTimestamp: NOW - ONE_MONTH * BigInt(2),
    eventType: 0, // ConsentGranted
  }),
  // Old consent check
  new AuditEntry({
    entryId: BigInt(109),
    accessorUserId: MOCK_LENDER_1,
    subjectUserId: MOCK_USER_ADDRESS,
    hashedScope: SCOPE_INCOME_BRACKET,
    unixTimestamp: NOW - ONE_MONTH * BigInt(2) - ONE_DAY,
    eventType: 2, // ConsentChecked
  }),
]

/**
 * Mock wallet service layer
 *
 * @since 1.0.0
 * @category Layers
 */
export const WalletServiceMock = Layer.succeed(WalletService, {
  connect: Effect.succeed(MOCK_USER_ADDRESS),
  disconnect: Effect.void,
  getAddress: Effect.succeed(MOCK_USER_ADDRESS),
  isConnected: Effect.succeed(true),
  getChainId: Effect.succeed(31337),
  ensureCorrectNetwork: Effect.void,
})

/**
 * Mock identity service layer
 *
 * @since 1.0.0
 * @category Layers
 */
export const IdentityServiceMock = Layer.succeed(IdentityService, {
  register: () => Effect.void,
  update: () => Effect.void,
  get: (address: Address) =>
    Effect.succeed(
      new IdentityAttributes({
        ...MOCK_IDENTITY,
        userId: address,
      })
    ),
  getOption: (address: Address) =>
    Effect.succeed(
      Option.some(
        new IdentityAttributes({
          ...MOCK_IDENTITY,
          userId: address,
        })
      )
    ),
  has: () => Effect.succeed(true),
  getOwn: Effect.succeed(MOCK_IDENTITY),
  hasOwn: Effect.succeed(true),
})

/**
 * Mock consent service layer
 *
 * @since 1.0.0
 * @category Layers
 */
export const ConsentServiceMock = Layer.succeed(ConsentService, {
  grant: ({ lender, scopes }) =>
    Effect.succeed(
      `0x${Math.random().toString(16).slice(2).padEnd(64, "0")}` as Bytes32
    ),
  revokeById: () => Effect.void,
  revokeAll: () => Effect.void,
  isValid: (consentId: Bytes32) => {
    const consent = MOCK_CONSENTS.find((c) => c.consentId === consentId)
    if (!consent) return Effect.succeed(false)
    const isExpired = consent.expiryBlockTime < NOW
    return Effect.succeed(!consent.isRevoked && !isExpired)
  },
  getConsent: (consentId: Bytes32) => {
    const consent = MOCK_CONSENTS.find((c) => c.consentId === consentId)
    if (!consent) {
      return Effect.fail(new ConsentNotFoundError({ consentId }))
    }
    return Effect.succeed(consent)
  },
  getBorrowerConsents: (borrower: Address) =>
    Effect.succeed(MOCK_CONSENTS.map((c) => c.consentId)),
  getOwnConsents: Effect.succeed(MOCK_CONSENTS),
})

/**
 * Mock audit service layer
 *
 * @since 1.0.0
 * @category Layers
 */
export const AuditServiceMock = Layer.succeed(AuditService, {
  getEntry: (entryId: bigint) => {
    const entry = MOCK_AUDIT_ENTRIES.find((e) => e.entryId === entryId)
    if (!entry) {
      return Effect.fail(new AuditEntryNotFoundError({ entryId }))
    }
    return Effect.succeed(entry)
  },
  getLogsCount: Effect.succeed(BigInt(MOCK_AUDIT_ENTRIES.length)),
  getAccessHistory: (user: Address) =>
    Effect.succeed(MOCK_AUDIT_ENTRIES.map((e) => e.entryId)),
  getRecentLogs: (count: bigint) =>
    Effect.succeed(MOCK_AUDIT_ENTRIES.slice(0, Number(count))),
  getOwnAccessHistory: Effect.succeed(MOCK_AUDIT_ENTRIES),
})

/**
 * Combined mock layer for all blockchain services
 *
 * Provides all blockchain services with realistic mock data for testing and development.
 *
 * @since 1.0.0
 * @category Layers
 */
export const AllServicesMock = Layer.mergeAll(
  WalletServiceMock,
  IdentityServiceMock,
  ConsentServiceMock,
  AuditServiceMock
)

/**
 * Re-export mock data for direct use in tests
 *
 * @since 1.0.0
 * @category Data
 */
export const MockData = {
  addresses: {
    user: MOCK_USER_ADDRESS,
    lender1: MOCK_LENDER_1,
    lender2: MOCK_LENDER_2,
    lender3: MOCK_LENDER_3,
  },
  hashes: {
    email: MOCK_EMAIL_HASH,
    accountRef: MOCK_ACCOUNT_REF_HASH,
  },
  scopes: {
    creditTier: SCOPE_CREDIT_TIER,
    incomeBracket: SCOPE_INCOME_BRACKET,
    debtRatio: SCOPE_DEBT_RATIO,
    emailHash: SCOPE_EMAIL_HASH,
  },
  consentIds: {
    active1: CONSENT_ID_1,
    active2: CONSENT_ID_2,
    expired: CONSENT_ID_3,
    revoked: CONSENT_ID_4,
    fresh: CONSENT_ID_5,
  },
  identity: MOCK_IDENTITY,
  consents: MOCK_CONSENTS,
  auditEntries: MOCK_AUDIT_ENTRIES,
  timestamps: {
    now: NOW,
    oneDay: ONE_DAY,
    oneWeek: ONE_WEEK,
    oneMonth: ONE_MONTH,
  },
} as const
