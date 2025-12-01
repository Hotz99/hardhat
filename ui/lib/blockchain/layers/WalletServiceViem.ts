/**
 * Viem-based WalletService implementation layer
 *
 * @since 1.0.0
 * @category Layers
 */

import { Effect, Layer, Ref, Schema } from "effect"
import { createWalletClient, custom } from "viem"
import { WalletService } from "../services/WalletService"
import { ViemClient, ViemClientLive } from "../services/ViemClient"
import { ContractConfig } from "../services/ContractConfig"
import { ContractConfigLocal } from "./ContractConfigLocal"
import { Address } from "../domain"
import {
  WalletConnectionFailedError,
  WalletNotConnectedError,
  WrongNetworkError,
  UserRejectedError,
} from "../errors"

const decodeAddress = Schema.decodeSync(Address)

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
      on?: (event: string, handler: (...args: unknown[]) => void) => void
      removeListener?: (
        event: string,
        handler: (...args: unknown[]) => void
      ) => void
    }
  }
}

/**
 * Layer that implements WalletService using viem and browser wallet (MetaMask, etc.)
 *
 * @since 1.0.0
 * @category Layers
 */
export const WalletServiceViemLayer = Layer.effect(
  WalletService,
  Effect.gen(function* () {
    const viemClient = yield* ViemClient
    const config = yield* ContractConfig
    const addressRef = yield* Ref.make<Address | null>(null)

    const connect = Effect.gen(function* () {
      // Check if window.ethereum exists
      if (typeof window === "undefined" || !window.ethereum) {
        return yield* Effect.fail(
          new WalletConnectionFailedError({
            reason: "No Ethereum provider found. Please install MetaMask.",
          })
        )
      }

      // Request accounts from wallet
      const accounts = yield* Effect.tryPromise({
        try: () =>
          window.ethereum!.request({
            method: "eth_requestAccounts",
          }) as Promise<string[]>,
        catch: (error) => {
          // Check if user rejected
          if (
            error &&
            typeof error === "object" &&
            "code" in error &&
            error.code === 4001
          ) {
            return new UserRejectedError({ action: "connect" })
          }
          return new WalletConnectionFailedError({
            reason: error instanceof Error ? error.message : String(error),
          })
        },
      })

      if (!accounts || accounts.length === 0) {
        return yield* Effect.fail(
          new WalletConnectionFailedError({
            reason: "No accounts returned from wallet",
          })
        )
      }

      const addressString = accounts[0]

      // Create wallet client
      const walletClient = createWalletClient({
        account: addressString as `0x${string}`,
        chain: config.chain,
        transport: custom(window.ethereum),
      })

      // Set wallet client in viem client service
      yield* viemClient.setWalletClient(walletClient)

      // Parse and store address
      const address = yield* Effect.try({
        try: () => decodeAddress(addressString),
        catch: (error) =>
          new WalletConnectionFailedError({
            reason: `Invalid address format: ${error}`,
          }),
      })

      yield* Ref.set(addressRef, address)

      return address
    })

    const disconnect = Effect.gen(function* () {
      yield* viemClient.setWalletClient(null)
      yield* Ref.set(addressRef, null)
    })

    const getAddress = Effect.gen(function* () {
      const address = yield* Ref.get(addressRef)
      if (address === null) {
        return yield* Effect.fail(
          new WalletNotConnectedError({
            message: "Wallet not connected",
          })
        )
      }
      return address
    })

    const isConnected = Ref.get(addressRef).pipe(
      Effect.map((address) => address !== null)
    )

    const getChainId = Effect.gen(function* () {
      const walletClient = yield* viemClient.getWalletClient.pipe(
        Effect.mapError(
          () =>
            new WalletNotConnectedError({
              message: "Wallet not connected",
            })
        )
      )

      const chainId = yield* Effect.tryPromise({
        try: () =>
          window.ethereum!.request({
            method: "eth_chainId",
          }) as Promise<string>,
        catch: (error) =>
          new WalletNotConnectedError({
            message: error instanceof Error ? error.message : String(error),
          }),
      })

      // Convert hex string to number
      return parseInt(chainId, 16)
    })

    const ensureCorrectNetwork = Effect.gen(function* () {
      const currentChainId = yield* getChainId

      if (currentChainId !== config.chain.id) {
        // Try to switch network
        const switched = yield* Effect.tryPromise({
          try: () =>
            window.ethereum!.request({
              method: "wallet_switchEthereumChain",
              params: [{ chainId: `0x${config.chain.id.toString(16)}` }],
            }),
          catch: () => null,
        }).pipe(
          Effect.map(() => true),
          Effect.catchAll(() => Effect.succeed(false))
        )

        if (!switched) {
          return yield* Effect.fail(
            new WrongNetworkError({
              expected: config.chain.id,
              actual: currentChainId,
            })
          )
        }
      }
    })

    return WalletService.of({
      connect,
      disconnect,
      getAddress,
      isConnected,
      getChainId,
      ensureCorrectNetwork,
    })
  })
)

/**
 * Complete WalletService layer with all dependencies provided
 *
 * Includes ViemClientLive and ContractConfigLocal layers
 *
 * @since 1.0.0
 * @category Layers
 */
export const WalletServiceViem = WalletServiceViemLayer.pipe(
  Layer.provide(ViemClientLive),
  Layer.provide(ContractConfigLocal)
)
