/**
 * Audit service interface
 *
 * @since 1.0.0
 * @category Services
 */

import { Context, Effect } from "effect"
import type { Address, AuditEntry } from "../domain"
import type {
  AuditEntryNotFoundError,
  ContractCallError,
  WalletError,
} from "../errors"

/**
 * Union type for all audit service errors
 *
 * @since 1.0.0
 * @category Errors
 */
export type AuditError =
  | WalletError
  | ContractCallError
  | AuditEntryNotFoundError

/**
 * Audit service interface
 *
 * @since 1.0.0
 * @category Services
 */
export interface AuditService {
  readonly getEntry: (
    entryId: bigint
  ) => Effect.Effect<AuditEntry, AuditEntryNotFoundError | ContractCallError>
  readonly getLogsCount: Effect.Effect<bigint, ContractCallError>
  readonly getAccessHistory: (
    user: Address
  ) => Effect.Effect<readonly bigint[], ContractCallError>
  readonly getRecentLogs: (
    count: bigint
  ) => Effect.Effect<readonly AuditEntry[], ContractCallError>
  readonly getOwnAccessHistory: Effect.Effect<readonly AuditEntry[], AuditError>
}

/**
 * Audit service tag
 *
 * @since 1.0.0
 * @category Services
 */
export const AuditService = Context.GenericTag<AuditService>("@blockchain/services/AuditService")
