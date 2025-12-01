/**
 * Wallet View Model interface
 *
 * @since 1.0.0
 * @category VM
 */

import type * as Atom from "@effect-atom/atom/Atom"
import { Context, Data, Layer, Scope } from "effect"
import type { AtomRegistry } from "@effect-atom/atom/Registry"
import type { WalletService } from "@/lib/blockchain/services/WalletService"

// --- UI-ready Domain Types ---

/**
 * Wallet connection state for UI
 *
 * @since 1.0.0
 * @category Domain
 */
export type WalletState = Data.TaggedEnum<{
  Disconnected: {}
  Connecting: {}
  Connected: { readonly displayAddress: string; readonly fullAddress: string }
}>

export const WalletState = Data.taggedEnum<WalletState>()

/**
 * Helper to truncate address: "0x1234...abcd"
 *
 * @since 1.0.0
 * @category Helpers
 */
export const truncateAddress = (address: string): string =>
  `${address.slice(0, 6)}...${address.slice(-4)}`

// --- VM Interface ---

/**
 * Wallet View Model interface
 *
 * Manages wallet connection state and operations for the UI.
 * All operations are safe and handle errors internally.
 *
 * @since 1.0.0
 * @category VM
 */
export interface WalletVM {
  // Reactive state (read-only)
  readonly state$: Atom.Atom<WalletState>
  readonly isConnected$: Atom.Atom<boolean>

  // Actions (opaque side effects)
  readonly connect: () => void
  readonly disconnect: () => void
  readonly copyAddress: () => void
}

// --- Context Tag ---

/**
 * Wallet VM service tag
 *
 * @since 1.0.0
 * @category Tags
 */
export const WalletVM = Context.GenericTag<WalletVM>("@features/wallet/WalletVM")

// --- Layer Type Signature (implementation later) ---

/**
 * Live implementation of WalletVM (to be implemented)
 *
 * @since 1.0.0
 * @category Layers
 */
export declare const WalletVMLive: {
  readonly tag: typeof WalletVM
  readonly layer: Layer.Layer<WalletVM, never, WalletService | AtomRegistry | Scope.Scope>
}
