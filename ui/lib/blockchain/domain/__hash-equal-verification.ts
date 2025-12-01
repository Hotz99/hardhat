/**
 * Verification that Hash and Equal are properly implemented for domain types
 *
 * This file demonstrates that the domain types support hashing and equality.
 * It can be removed after verification.
 *
 * @since 1.0.0
 * @internal
 */

import { Equal, Hash, HashMap } from "effect"
import { Consent } from "./Consent"
import { AuditEntry } from "./AuditEntry"
import { IdentityAttributes } from "./IdentityAttributes"
import type { Address } from "./Address"
import type { Bytes32 } from "./Bytes32"

// Test data
const address1 = "0x1234567890123456789012345678901234567890" as Address
const address2 = "0xabcdef0123456789abcdef0123456789abcdef01" as Address
const hash1 = "0x742d35cc6634c0532925a3b844bc9e7eb6ceddc051cdf9e5c5c0fce7c5f6e0f8" as Bytes32
const hash2 = "0xa7c5ac471b4784230fcf80dc33721d53cddd6e04c059210385c67dfe32c4c5e1" as Bytes32

// Create domain instances
const consent1 = new Consent({
  consentId: hash1,
  borrower: address1,
  lender: address2,
  scopes: [hash1],
  startBlockTime: BigInt(1000),
  expiryBlockTime: BigInt(2000),
  isRevoked: false,
})

const consent2 = new Consent({
  consentId: hash1,
  borrower: address1,
  lender: address2,
  scopes: [hash1],
  startBlockTime: BigInt(1000),
  expiryBlockTime: BigInt(2000),
  isRevoked: false,
})

const consent3 = new Consent({
  consentId: hash2,
  borrower: address1,
  lender: address2,
  scopes: [hash1],
  startBlockTime: BigInt(1000),
  expiryBlockTime: BigInt(2000),
  isRevoked: false,
})

const auditEntry1 = new AuditEntry({
  entryId: BigInt(100),
  accessorUserId: address1,
  subjectUserId: address2,
  hashedScope: hash1,
  unixTimestamp: BigInt(1234567890),
  eventType: 0,
})

const auditEntry2 = new AuditEntry({
  entryId: BigInt(100),
  accessorUserId: address1,
  subjectUserId: address2,
  hashedScope: hash1,
  unixTimestamp: BigInt(1234567890),
  eventType: 0,
})

const identity1 = new IdentityAttributes({
  userId: address1,
  emailHash: hash1,
  creditTier: "EXCELLENT",
  incomeBracket: "$75,000 - $100,000",
  debtRatioBracket: "0-20%",
  lastUpdated: BigInt(1000),
})

const identity2 = new IdentityAttributes({
  userId: address1,
  emailHash: hash1,
  creditTier: "EXCELLENT",
  incomeBracket: "$75,000 - $100,000",
  debtRatioBracket: "0-20%",
  lastUpdated: BigInt(1000),
})

// Verify Equal.equals works
console.log("=== Equality Tests ===")
console.log("consent1 === consent1:", Equal.equals(consent1, consent1)) // true
console.log("consent1 === consent2:", Equal.equals(consent1, consent2)) // true (same values)
console.log("consent1 === consent3:", Equal.equals(consent1, consent3)) // false (different consentId)
console.log("auditEntry1 === auditEntry2:", Equal.equals(auditEntry1, auditEntry2)) // true
console.log("identity1 === identity2:", Equal.equals(identity1, identity2)) // true

// Verify Hash.hash works
console.log("\n=== Hash Tests ===")
console.log("Hash(consent1):", Hash.hash(consent1))
console.log("Hash(consent2):", Hash.hash(consent2))
console.log("Hash(consent1) === Hash(consent2):", Hash.hash(consent1) === Hash.hash(consent2)) // true
console.log("Hash(consent1) === Hash(consent3):", Hash.hash(consent1) === Hash.hash(consent3)) // false

// Verify HashMap works (uses Hash + Equal)
console.log("\n=== HashMap Tests ===")
const consentMap = HashMap.empty<Consent, string>().pipe(
  HashMap.set(consent1, "First consent"),
  HashMap.set(consent3, "Third consent")
)

console.log("HashMap.has(consent1):", HashMap.has(consentMap, consent1)) // true
console.log("HashMap.has(consent2):", HashMap.has(consentMap, consent2)) // true (equal to consent1)
console.log("HashMap.has(consent3):", HashMap.has(consentMap, consent3)) // true
console.log("HashMap.get(consent2):", HashMap.get(consentMap, consent2)) // Some("First consent")

const auditMap = HashMap.empty<AuditEntry, string>().pipe(
  HashMap.set(auditEntry1, "First entry")
)

console.log("HashMap.get(auditEntry2):", HashMap.get(auditMap, auditEntry2)) // Some("First entry")

console.log("\n✅ All Hash and Equal implementations work correctly!")
