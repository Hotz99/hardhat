/**
 * Viem implementation of ConsentService
 *
 * @since 1.0.0
 * @category Layers
 */

import { Effect, Layer } from "effect"
import type { Hex } from "viem"
import { decodeEventLog, type WalletClient } from "viem"
import { Consent } from "../domain/Consent"
import type { Address, Bytes32 } from "../domain"
import {
  ContractCallError,
  ConsentNotFoundError,
} from "../errors"
import {
  ConsentService,
  type GrantConsentParams,
} from "../services/ConsentService"
import { ContractConfig } from "../services/ContractConfig"
import { ViemClient } from "../services/ViemClient"
import { WalletService } from "../services/WalletService"
import { ConsentManagerAbi } from "../contracts/abis"
import { ContractConfigLocal } from "./ContractConfigLocal"
import { ViemClientLive } from "../services/ViemClient"

/**
 * Implementation layer for ConsentService using Viem
 *
 * @since 1.0.0
 * @category Layers
 */
export const ConsentServiceViemLayer = Layer.effect(
  ConsentService,
  Effect.gen(function* () {
    const viemClient = yield* ViemClient
    const contractConfig = yield* ContractConfig
    const walletService = yield* WalletService

    const { publicClient } = viemClient
    const { consentManager } = contractConfig

    const grant = (params: GrantConsentParams): Effect.Effect<Bytes32, ContractCallError> =>
      Effect.gen(function* () {
        const walletClient = yield* viemClient.getWalletClient.pipe(
          Effect.mapError(
            (error) =>
              new ContractCallError({
                contract: "ConsentManager",
                method: "grantConsent",
                reason: `Wallet not available: ${error._tag}`,
              })
          )
        )

        const hash = yield* Effect.tryPromise({
          try: () =>
            walletClient.writeContract({
              address: consentManager.address,
              abi: consentManager.abi,
              functionName: "grantConsent",
              args: [
                params.lender as Hex,
                params.scopes as readonly Hex[],
                params.durationSeconds,
              ],
              chain: null,
            }),
          catch: (error) =>
            new ContractCallError({
              contract: "ConsentManager",
              method: "grantConsent",
              reason: error instanceof Error ? error.message : String(error),
            }),
        })

        const receipt = yield* Effect.tryPromise({
          try: () => publicClient.waitForTransactionReceipt({ hash }),
          catch: (error) =>
            new ContractCallError({
              contract: "ConsentManager",
              method: "grantConsent",
              reason: `Transaction failed: ${error instanceof Error ? error.message : String(error)}`,
            }),
        })

        // Find the ConsentGranted event in the logs
        const consentGrantedLog = receipt.logs.find((log) => {
          try {
            const decoded = decodeEventLog({
              abi: ConsentManagerAbi,
              data: log.data,
              topics: log.topics,
            })
            return decoded.eventName === "ConsentGranted"
          } catch {
            return false
          }
        })

        if (!consentGrantedLog) {
          return yield* Effect.fail(
            new ContractCallError({
              contract: "ConsentManager",
              method: "grantConsent",
              reason: "ConsentGranted event not found in transaction receipt",
            })
          )
        }

        const decoded = decodeEventLog({
          abi: ConsentManagerAbi,
          data: consentGrantedLog.data,
          topics: consentGrantedLog.topics,
        })

        return (decoded.args as any).consentId as Bytes32
      })

    const revokeById = (consentId: Bytes32): Effect.Effect<void, ContractCallError> =>
      Effect.gen(function* () {
        const walletClient = yield* viemClient.getWalletClient.pipe(
          Effect.mapError(
            (error) =>
              new ContractCallError({
                contract: "ConsentManager",
                method: "revokeConsentById",
                reason: `Wallet not available: ${error._tag}`,
              })
          )
        )

        const hash = yield* Effect.tryPromise({
          try: () =>
            walletClient.writeContract({
              address: consentManager.address,
              abi: consentManager.abi,
              functionName: "revokeConsentById",
              args: [consentId as Hex],
              chain: null,
            }),
          catch: (error) =>
            new ContractCallError({
              contract: "ConsentManager",
              method: "revokeConsentById",
              reason: error instanceof Error ? error.message : String(error),
            }),
        })

        yield* Effect.tryPromise({
          try: () => publicClient.waitForTransactionReceipt({ hash }),
          catch: (error) =>
            new ContractCallError({
              contract: "ConsentManager",
              method: "revokeConsentById",
              reason: `Transaction failed: ${error instanceof Error ? error.message : String(error)}`,
            }),
        })
      })

    const revokeAll = (lender: Address): Effect.Effect<void, ContractCallError> =>
      Effect.gen(function* () {
        const walletClient = yield* viemClient.getWalletClient.pipe(
          Effect.mapError(
            (error) =>
              new ContractCallError({
                contract: "ConsentManager",
                method: "revokeAllConsents",
                reason: `Wallet not available: ${error._tag}`,
              })
          )
        )

        const hash = yield* Effect.tryPromise({
          try: () =>
            walletClient.writeContract({
              address: consentManager.address,
              abi: consentManager.abi,
              functionName: "revokeAllConsents",
              args: [lender as Hex],
              chain: null,
            }),
          catch: (error) =>
            new ContractCallError({
              contract: "ConsentManager",
              method: "revokeAllConsents",
              reason: error instanceof Error ? error.message : String(error),
            }),
        })

        yield* Effect.tryPromise({
          try: () => publicClient.waitForTransactionReceipt({ hash }),
          catch: (error) =>
            new ContractCallError({
              contract: "ConsentManager",
              method: "revokeAllConsents",
              reason: `Transaction failed: ${error instanceof Error ? error.message : String(error)}`,
            }),
        })
      })

    const isValid = (
      consentId: Bytes32
    ): Effect.Effect<boolean, ContractCallError> =>
      Effect.tryPromise({
        try: async () => {
          const result = await publicClient.readContract({
            address: consentManager.address,
            abi: consentManager.abi,
            functionName: "isConsentValid",
            args: [consentId as Hex],
          })
          return result as boolean
        },
        catch: (error) =>
          new ContractCallError({
            contract: "ConsentManager",
            method: "isConsentValid",
            reason: error instanceof Error ? error.message : String(error),
          }),
      })

    const getConsent = (
      consentId: Bytes32
    ): Effect.Effect<Consent, ConsentNotFoundError | ContractCallError> =>
      Effect.gen(function* () {
        const consentData = yield* Effect.tryPromise({
          try: () =>
            publicClient.readContract({
              address: consentManager.address,
              abi: consentManager.abi,
              functionName: "consents",
              args: [consentId as Hex],
            }),
          catch: (error) =>
            new ContractCallError({
              contract: "ConsentManager",
              method: "consents",
              reason: error instanceof Error ? error.message : String(error),
            }),
        })

        const [borrower, lender, startBlockTime, expiryBlockTime, isRevoked] =
          consentData as [Hex, Hex, bigint, bigint, boolean]

        // Check if consent exists (zero address means not found)
        if (borrower === "0x0000000000000000000000000000000000000000") {
          return yield* Effect.fail(
            new ConsentNotFoundError({ consentId })
          )
        }

        const scopes = yield* Effect.tryPromise({
          try: () =>
            publicClient.readContract({
              address: consentManager.address,
              abi: consentManager.abi,
              functionName: "getScopes",
              args: [consentId as Hex],
            }),
          catch: (error) =>
            new ContractCallError({
              contract: "ConsentManager",
              method: "getScopes",
              reason: error instanceof Error ? error.message : String(error),
            }),
        })

        return new Consent({
          consentId,
          borrower: borrower as Address,
          lender: lender as Address,
          scopes: scopes as readonly Bytes32[],
          startBlockTime,
          expiryBlockTime,
          isRevoked,
        })
      })

    const getBorrowerConsents = (
      borrower: Address
    ): Effect.Effect<readonly Bytes32[], ContractCallError> =>
      Effect.tryPromise({
        try: async () => {
          const result = await publicClient.readContract({
            address: consentManager.address,
            abi: consentManager.abi,
            functionName: "getBorrowerConsents",
            args: [borrower as Hex],
          })
          return result as readonly Bytes32[]
        },
        catch: (error) =>
          new ContractCallError({
            contract: "ConsentManager",
            method: "getBorrowerConsents",
            reason: error instanceof Error ? error.message : String(error),
          }),
      })

    const getOwnConsents = Effect.gen(function* () {
      const address = yield* walletService.getAddress.pipe(
        Effect.mapError(
          (error) =>
            new ContractCallError({
              contract: "ConsentManager",
              method: "getOwnConsents",
              reason: `Wallet not connected: ${error.message}`,
            })
        )
      )

      const consentIds = yield* getBorrowerConsents(address)

      const consents = yield* Effect.all(
        consentIds.map((id) => getConsent(id)),
        { concurrency: "unbounded" }
      )

      return consents
    })

    return ConsentService.of({
      grant,
      revokeById,
      revokeAll,
      isValid,
      getConsent,
      getBorrowerConsents,
      getOwnConsents,
    })
  })
)

/**
 * Complete ConsentService layer with all dependencies provided
 *
 * @since 1.0.0
 * @category Layers
 */
export const ConsentServiceViem = ConsentServiceViemLayer.pipe(
  Layer.provide(ViemClientLive),
  Layer.provide(ContractConfigLocal)
)
