/**
 * Blockchain UI error types
 *
 * @since 1.0.0
 * @category Errors
 */

import { Data } from "effect"
import type { Address, Bytes32 } from "./domain"

// ====================
// Wallet Errors
// ====================

/**
 * Error when wallet is not connected
 *
 * @since 1.0.0
 * @category Wallet Errors
 */
export class WalletNotConnectedError extends Data.TaggedError(
  "WalletNotConnectedError"
)<{
  readonly message: string
}> {}

/**
 * Error when wallet connection fails
 *
 * @since 1.0.0
 * @category Wallet Errors
 */
export class WalletConnectionFailedError extends Data.TaggedError(
  "WalletConnectionFailedError"
)<{
  readonly reason: string
}> {}

/**
 * Error when connected to wrong network
 *
 * @since 1.0.0
 * @category Wallet Errors
 */
export class WrongNetworkError extends Data.TaggedError("WrongNetworkError")<{
  readonly expected: number
  readonly actual: number
}> {}

/**
 * Error when user rejects action
 *
 * @since 1.0.0
 * @category Wallet Errors
 */
export class UserRejectedError extends Data.TaggedError("UserRejectedError")<{
  readonly action: "connect" | "sign" | "transaction"
}> {}

/** Union type for all wallet errors */
export type WalletError =
  | WalletNotConnectedError
  | WalletConnectionFailedError
  | WrongNetworkError
  | UserRejectedError

// ====================
// Contract Errors
// ====================

/**
 * Error when contract call fails
 *
 * @since 1.0.0
 * @category Contract Errors
 */
export class ContractCallError extends Data.TaggedError("ContractCallError")<{
  readonly contract: "CreditRegistry" | "ConsentManager" | "AuditLog"
  readonly method: string
  readonly reason: string
}> {}

/**
 * Error when transaction fails
 *
 * @since 1.0.0
 * @category Contract Errors
 */
export class TransactionFailedError extends Data.TaggedError(
  "TransactionFailedError"
)<{
  readonly txHash: string
  readonly reason: string
}> {}

/**
 * Error when transaction reverts
 *
 * @since 1.0.0
 * @category Contract Errors
 */
export class TransactionRevertedError extends Data.TaggedError(
  "TransactionRevertedError"
)<{
  readonly txHash: string
  readonly revertReason?: string
}> {}

// ====================
// Identity Errors
// ====================

/**
 * Error when identity is not found
 *
 * @since 1.0.0
 * @category Identity Errors
 */
export class IdentityNotFoundError extends Data.TaggedError(
  "IdentityNotFoundError"
)<{
  readonly address: Address
}> {}

/**
 * Error when identity already exists
 *
 * @since 1.0.0
 * @category Identity Errors
 */
export class IdentityAlreadyExistsError extends Data.TaggedError(
  "IdentityAlreadyExistsError"
)<{
  readonly address: Address
}> {}


// ====================
// Consent Errors
// ====================

/**
 * Error when consent is not found
 *
 * @since 1.0.0
 * @category Consent Errors
 */
export class ConsentNotFoundError extends Data.TaggedError(
  "ConsentNotFoundError"
)<{
  readonly consentId: Bytes32
}> {}

/**
 * Error when consent has expired
 *
 * @since 1.0.0
 * @category Consent Errors
 */
export class ConsentExpiredError extends Data.TaggedError(
  "ConsentExpiredError"
)<{
  readonly consentId: Bytes32
  readonly expiryTime: bigint
}> {}

/**
 * Error when consent is already revoked
 *
 * @since 1.0.0
 * @category Consent Errors
 */
export class ConsentAlreadyRevokedError extends Data.TaggedError(
  "ConsentAlreadyRevokedError"
)<{
  readonly consentId: Bytes32
}> {}


// ====================
// Audit Errors
// ====================

/**
 * Error when audit entry is not found
 *
 * @since 1.0.0
 * @category Audit Errors
 */
export class AuditEntryNotFoundError extends Data.TaggedError(
  "AuditEntryNotFoundError"
)<{
  readonly entryId: bigint
}> {}

