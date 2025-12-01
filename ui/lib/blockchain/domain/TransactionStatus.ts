import { Data } from "effect"
import type { Hash, TransactionReceipt } from "viem"

export type TransactionStatus = Data.TaggedEnum<{
  Idle: {}
  Pending: { readonly hash: Hash }
  Confirming: { readonly hash: Hash; readonly confirmations: number }
  Confirmed: { readonly hash: Hash; readonly receipt: TransactionReceipt }
  Failed: { readonly hash: Hash; readonly reason: string }
}>

export const TransactionStatus = Data.taggedEnum<TransactionStatus>()

/**
 * Check if transaction status is Pending.
 *
 * @category Guards
 * @since 0.1.0
 */
export const isPending = TransactionStatus.$is("Pending")

/**
 * Check if transaction status is Confirmed.
 *
 * @category Guards
 * @since 0.1.0
 */
export const isConfirmed = TransactionStatus.$is("Confirmed")

/**
 * Check if transaction status is Failed.
 *
 * @category Guards
 * @since 0.1.0
 */
export const isFailed = TransactionStatus.$is("Failed")
