/**
 * Consent service interface
 *
 * @since 1.0.0
 * @category Services
 */

import { Context, Effect } from "effect"
import type { Address, Bytes32, Consent } from "../domain"
import type {
  ConsentNotFoundError,
  ContractCallError,
  WalletError,
} from "../errors"

/**
 * Parameters for granting consent
 *
 * @since 1.0.0
 * @category Models
 */
export interface GrantConsentParams {
  readonly lender: Address
  readonly scopes: readonly Bytes32[]
  readonly durationSeconds: bigint
}

/**
 * Union type for all consent service errors
 *
 * @since 1.0.0
 * @category Errors
 */
export type ConsentError =
  | WalletError
  | ContractCallError
  | ConsentNotFoundError

/**
 * Consent service interface
 *
 * @since 1.0.0
 * @category Services
 */
export interface ConsentService {
  readonly grant: (
    params: GrantConsentParams
  ) => Effect.Effect<Bytes32, ConsentError>
  readonly revokeById: (
    consentId: Bytes32
  ) => Effect.Effect<void, ConsentError>
  readonly revokeAll: (lender: Address) => Effect.Effect<void, ConsentError>
  readonly isValid: (
    consentId: Bytes32
  ) => Effect.Effect<boolean, ContractCallError>
  readonly getConsent: (
    consentId: Bytes32
  ) => Effect.Effect<Consent, ConsentNotFoundError | ContractCallError>
  readonly getBorrowerConsents: (
    borrower: Address
  ) => Effect.Effect<readonly Bytes32[], ContractCallError>
  readonly getOwnConsents: Effect.Effect<readonly Consent[], ConsentError>
}

/**
 * Consent service tag
 *
 * @since 1.0.0
 * @category Services
 */
export const ConsentService = Context.GenericTag<ConsentService>("@blockchain/services/ConsentService")
