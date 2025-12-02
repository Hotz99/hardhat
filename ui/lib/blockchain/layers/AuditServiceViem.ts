/**
 * Viem implementation of AuditService
 *
 * @since 1.0.0
 * @category Layers
 */

import { Effect, Layer } from "effect"
import type { Hex } from "viem"
import { AuditService } from "../services/AuditService"
import { WalletService } from "../services/WalletService"
import { ViemClient, ViemClientLive } from "../services/ViemClient"
import { ContractConfig } from "../services/ContractConfig"
import { ContractConfigLocal } from "./ContractConfigLocal"
import { AuditEntry } from "../domain/AuditEntry"
import type { Address, Bytes32 } from "../domain"
import {
  AuditEntryNotFoundError,
  ContractCallError,
  WalletNotConnectedError,
} from "../errors"

type ContractAuditEntry = {
  accessorUserId: Hex
  subjectUserId: Hex
  hashedScope: Hex
  unixTimestamp: bigint
  eventType: number
}

/**
 * Viem layer for AuditService - requires dependencies
 *
 * @since 1.0.0
 * @category Layers
 */
export const AuditServiceViemLayer = Layer.effect(
  AuditService,
  Effect.gen(function* () {
    const viemClient = yield* ViemClient
    const config = yield* ContractConfig
    const walletService = yield* WalletService

    const { publicClient } = viemClient
    const { auditLog } = config

    const getEntry = (entryId: bigint) =>
      Effect.tryPromise({
        try: async () => {
          const result = await publicClient.readContract({
            address: auditLog.address,
            abi: auditLog.abi,
            functionName: "getAuditEntry",
            args: [entryId],
          })
          return result as ContractAuditEntry
        },
        catch: (error) =>
          new ContractCallError({
            contract: "AuditLog",
            method: "getAuditEntry",
            reason: String(error),
          }),
      }).pipe(
        Effect.flatMap((result) => {
          if (
            result.accessorUserId ===
            "0x0000000000000000000000000000000000000000"
          ) {
            return Effect.fail(
              new AuditEntryNotFoundError({ entryId })
            )
          }

          return Effect.succeed(
            new AuditEntry({
              entryId,
              accessorUserId: result.accessorUserId as Address,
              subjectUserId: result.subjectUserId as Address,
              hashedScope: result.hashedScope as Bytes32,
              unixTimestamp: result.unixTimestamp,
              eventType: Number(result.eventType),
            })
          )
        })
      )

    const getLogsCount = Effect.tryPromise({
      try: async () => {
        const result = await publicClient.readContract({
          address: auditLog.address,
          abi: auditLog.abi,
          functionName: "getLogsCount",
        })
        return result as bigint
      },
      catch: (error) =>
        new ContractCallError({
          contract: "AuditLog",
          method: "getLogsCount",
          reason: String(error),
        }),
    })

    const getAccessHistory = (user: Address) =>
      Effect.tryPromise({
        try: async () => {
          const result = await publicClient.readContract({
            address: auditLog.address,
            abi: auditLog.abi,
            functionName: "getAccessHistory",
            args: [user as Hex],
          })
          return result as readonly bigint[]
        },
        catch: (error) =>
          new ContractCallError({
            contract: "AuditLog",
            method: "getAccessHistory",
            reason: String(error),
          }),
      })

    const getRecentLogs = (count: bigint) =>
      Effect.gen(function* () {
        const results = yield* Effect.tryPromise({
          try: async () => {
            const data = await publicClient.readContract({
              address: auditLog.address,
              abi: auditLog.abi,
              functionName: "getRecentLogs",
              args: [count],
            })
            return data as readonly ContractAuditEntry[]
          },
          catch: (error) =>
            new ContractCallError({
              contract: "AuditLog",
              method: "getRecentLogs",
              reason: String(error),
            }),
        })

        const logsCount = yield* getLogsCount

        return results.map((result, index) => {
          const entryId = logsCount - BigInt(index) - BigInt(1)

          return new AuditEntry({
            entryId,
            accessorUserId: result.accessorUserId as Address,
            subjectUserId: result.subjectUserId as Address,
            hashedScope: result.hashedScope as Bytes32,
            unixTimestamp: result.unixTimestamp,
            eventType: Number(result.eventType),
          })
        })
      })

    const getOwnAccessHistory = Effect.gen(function* () {
      const address = yield* walletService.getAddress.pipe(
        Effect.mapError(() => new WalletNotConnectedError({ message: "Wallet not connected" }))
      )
      const entryIds = yield* getAccessHistory(address)

      const entries = yield* Effect.all(
        entryIds.map((entryId) => getEntry(entryId)),
        { concurrency: "unbounded" }
      )

      return entries
    })

    return AuditService.of({
      getEntry,
      getLogsCount,
      getAccessHistory,
      getRecentLogs,
      getOwnAccessHistory,
    })
  })
)

/**
 * Fully configured AuditService layer with all dependencies
 *
 * @since 1.0.0
 * @category Layers
 */
export const AuditServiceViem = AuditServiceViemLayer.pipe(
  Layer.provide(ViemClientLive),
  Layer.provide(ContractConfigLocal)
)
