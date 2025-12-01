/**
 * Identity service interface
 *
 * @since 1.0.0
 * @category Services
 */

import { Context, Effect, Option } from "effect"
import type { Address, Bytes32, IdentityAttributes } from "../domain"
import type {
  IdentityNotFoundError,
  ContractCallError,
  WalletError,
} from "../errors"

/**
 * Parameters for registering a new identity
 *
 * @since 1.0.0
 * @category Models
 */
export interface RegisterIdentityParams {
  readonly emailHash: Bytes32
  readonly creditTier: string
  readonly incomeBracket: string
  readonly debtRatioBracket: string
  readonly accountReferenceHash: Bytes32
}

/**
 * Parameters for updating an existing identity
 *
 * @since 1.0.0
 * @category Models
 */
export interface UpdateIdentityParams {
  readonly emailHash?: Bytes32
  readonly creditTier?: string
  readonly incomeBracket?: string
  readonly debtRatioBracket?: string
}

/**
 * Union type for all identity service errors
 *
 * @since 1.0.0
 * @category Errors
 */
export type IdentityError =
  | WalletError
  | ContractCallError
  | IdentityNotFoundError

/**
 * Identity service interface
 *
 * @since 1.0.0
 * @category Services
 */
export interface IdentityService {
  readonly register: (
    params: RegisterIdentityParams
  ) => Effect.Effect<void, IdentityError>
  readonly update: (
    params: UpdateIdentityParams
  ) => Effect.Effect<void, IdentityError>
  readonly get: (
    address: Address
  ) => Effect.Effect<
    IdentityAttributes,
    IdentityNotFoundError | ContractCallError
  >
  readonly getOption: (
    address: Address
  ) => Effect.Effect<Option.Option<IdentityAttributes>, ContractCallError>
  readonly has: (address: Address) => Effect.Effect<boolean, ContractCallError>
  readonly getOwn: Effect.Effect<IdentityAttributes, IdentityError>
  readonly hasOwn: Effect.Effect<boolean, IdentityError>
}

/**
 * Identity service tag
 *
 * @since 1.0.0
 * @category Services
 */
export const IdentityService = Context.GenericTag<IdentityService>("@blockchain/services/IdentityService")
