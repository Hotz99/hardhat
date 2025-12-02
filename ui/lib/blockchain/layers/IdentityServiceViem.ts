/**
 * Viem implementation of IdentityService
 *
 * @since 1.0.0
 * @category Layers
 */

import { Effect, Layer, Option } from "effect"
import type { Hex } from "viem"
import type { Address, Bytes32 } from "../domain"
import { IdentityAttributes } from "../domain/IdentityAttributes"
import {
  ContractCallError,
  IdentityNotFoundError,
  WalletNotConnectedError,
} from "../errors"
import {
  IdentityService,
  type RegisterIdentityParams,
  type UpdateIdentityParams,
} from "../services/IdentityService"
import { ViemClient, ViemClientLive } from "../services/ViemClient"
import { ContractConfig } from "../services/ContractConfig"
import { WalletService } from "../services/WalletService"
import { ContractConfigLocal } from "./ContractConfigLocal"

type ContractIdentityAttributes = {
  address: Hex,
  emailHash: Hex,
  creditTier: string,
  incomeBracket: string,
  debtRatioBracket: string,
  lastUpdated: bigint
}

/**
 * Viem-based implementation layer for IdentityService
 *
 * @since 1.0.0
 * @category Layers
 */
export const IdentityServiceViemLayer = Layer.effect(
  IdentityService,
  Effect.gen(function* () {
    const viemClient = yield* ViemClient
    const contractConfig = yield* ContractConfig
    const walletService = yield* WalletService

    const { publicClient } = viemClient
    const { address: contractAddress, abi } = contractConfig.creditRegistry

    const register = (params: RegisterIdentityParams) =>
      Effect.gen(function* () {
        const walletClient = yield* viemClient.getWalletClient.pipe(
          Effect.mapError(() => new WalletNotConnectedError({ message: "Wallet not connected" }))
        )
        const userAddress = yield* walletService.getAddress

        const hash = yield* Effect.tryPromise({
          try: () =>
            walletClient.writeContract({
              address: contractAddress,
              abi,
              functionName: "registerIdentityAttributes",
              args: [
                params.emailHash as Hex,
                params.creditTier,
                params.incomeBracket,
                params.debtRatioBracket,
                params.accountReferenceHash as Hex,
              ],
              chain: walletClient.chain,
              account: walletClient.account!,
            }),
          catch: (error) =>
            new ContractCallError({
              contract: "CreditRegistry",
              method: "registerIdentityAttributes",
              reason: String(error),
            }),
        })

        yield* Effect.tryPromise({
          try: () => publicClient.waitForTransactionReceipt({ hash }),
          catch: (error) =>
            new ContractCallError({
              contract: "CreditRegistry",
              method: "registerIdentityAttributes",
              reason: `Transaction failed: ${String(error)}`,
            }),
        })
      })

    const update = (params: UpdateIdentityParams) =>
      Effect.gen(function* () {
        const walletClient = yield* viemClient.getWalletClient.pipe(
          Effect.mapError(() => new WalletNotConnectedError({ message: "Wallet not connected" }))
        )
        const userAddress = yield* walletService.getAddress

        const currentIdentity = yield* get(userAddress)

        const hash = yield* Effect.tryPromise({
          try: () =>
            walletClient.writeContract({
              address: contractAddress,
              abi,
              functionName: "updateIdentityAttributes",
              args: [
                (params.emailHash ?? currentIdentity.emailHash) as Hex,
                params.creditTier ?? currentIdentity.creditTier,
                params.incomeBracket ?? currentIdentity.incomeBracket,
                params.debtRatioBracket ?? currentIdentity.debtRatioBracket,
              ],
              chain: walletClient.chain,
              account: walletClient.account!,
            }),
          catch: (error) =>
            new ContractCallError({
              contract: "CreditRegistry",
              method: "updateIdentityAttributes",
              reason: String(error),
            }),
        })

        yield* Effect.tryPromise({
          try: () => publicClient.waitForTransactionReceipt({ hash }),
          catch: (error) =>
            new ContractCallError({
              contract: "CreditRegistry",
              method: "updateIdentityAttributes",
              reason: `Transaction failed: ${String(error)}`,
            }),
        })
      })

    const get = (address: Address) =>
      Effect.gen(function* () {
        const result = yield* Effect.tryPromise({
          try: async () => {
            const data = await publicClient.readContract({
              address: contractAddress,
              abi,
              functionName: "getIdentityAttributes",
              args: [address as Hex],
            })
            return data as {
              userId: Hex
              emailHash: Hex
              creditTier: string
              incomeBracket: string
              debtRatioBracket: string
              lastUpdated: bigint
            }
          },
          catch: (error) =>
            new ContractCallError({
              contract: "CreditRegistry",
              method: "getIdentityAttributes",
              reason: String(error),
            }),
        })

        if (
          result.userId === "0x0000000000000000000000000000000000000000"
        ) {
          return yield* Effect.fail(new IdentityNotFoundError({ address }))
        }

        return new IdentityAttributes({
          userId: result.userId as Address,
          emailHash: result.emailHash as Bytes32,
          creditTier: result.creditTier,
          incomeBracket: result.incomeBracket,
          debtRatioBracket: result.debtRatioBracket,
          lastUpdated: result.lastUpdated,
        })
      })

    const getOption = (address: Address) =>
      Effect.gen(function* () {
        const exists = yield* has(address)
        if (!exists) {
          return Option.none<IdentityAttributes>()
        }
        return Option.some(yield* get(address))
      }).pipe(
        Effect.catchTag("IdentityNotFoundError", () =>
          Effect.succeed(Option.none<IdentityAttributes>())
        )
      )

    const has = (address: Address) =>
      Effect.tryPromise({
        try: async () => {
          const result = await publicClient.readContract({
            address: contractAddress,
            abi,
            functionName: "hasIdentityAttributes",
            args: [address as Hex],
          })
          return result as boolean
        },
        catch: (error) =>
          new ContractCallError({
            contract: "CreditRegistry",
            method: "hasIdentityAttributes",
            reason: String(error),
          }),
      })

    const getOwn = Effect.gen(function* () {
      const address = yield* walletService.getAddress
      return yield* get(address)
    })

    const hasOwn = Effect.gen(function* () {
      const address = yield* walletService.getAddress
      return yield* has(address)
    })

    return IdentityService.of({
      register,
      update,
      get,
      getOption,
      has,
      getOwn,
      hasOwn,
    })
  })
)

/**
 * Fully configured IdentityService layer with all dependencies
 *
 * Includes ViemClient and ContractConfig layers
 *
 * @since 1.0.0
 * @category Layers
 */
export const IdentityServiceViem = IdentityServiceViemLayer.pipe(
  Layer.provide(ViemClientLive),
  Layer.provide(ContractConfigLocal)
)
