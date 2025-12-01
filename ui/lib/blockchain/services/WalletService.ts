/**
 * Wallet service interface
 *
 * @since 1.0.0
 * @category Services
 */

import { Context, Effect } from "effect"
import type { Address } from "../domain"
import type {
  WalletNotConnectedError,
  WrongNetworkError,
  WalletError,
} from "../errors"

/**
 * Wallet service interface
 *
 * @since 1.0.0
 * @category Services
 */
export interface WalletService {
  readonly connect: Effect.Effect<Address, WalletError>
  readonly disconnect: Effect.Effect<void>
  readonly getAddress: Effect.Effect<Address, WalletNotConnectedError>
  readonly isConnected: Effect.Effect<boolean>
  readonly getChainId: Effect.Effect<number, WalletNotConnectedError>
  readonly ensureCorrectNetwork: Effect.Effect<
    void,
    WrongNetworkError | WalletNotConnectedError
  >
}

/**
 * Wallet service tag
 *
 * @since 1.0.0
 * @category Services
 */
export const WalletService = Context.GenericTag<WalletService>("@blockchain/services/WalletService")
