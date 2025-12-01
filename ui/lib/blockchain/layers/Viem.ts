/**
 * Combined Viem layer for all blockchain services
 *
 * @since 1.0.0
 * @category Layers
 */

import { Layer } from "effect"
import { ViemClientLive } from "../services/ViemClient"
import { ContractConfigLocal } from "./ContractConfigLocal"
import { WalletServiceViemLayer } from "./WalletServiceViem"
import { IdentityServiceViemLayer } from "./IdentityServiceViem"
import { ConsentServiceViemLayer } from "./ConsentServiceViem"
import { AuditServiceViemLayer } from "./AuditServiceViem"

/**
 * Base infrastructure layer with ViemClient and ContractConfig
 *
 * @since 1.0.0
 * @category Layers
 */
export const ViemInfrastructure = Layer.provideMerge(
  ViemClientLive,
  ContractConfigLocal
)

/**
 * WalletService layer with infrastructure dependencies
 *
 * @since 1.0.0
 * @category Layers
 */
export const WalletLayer = WalletServiceViemLayer.pipe(
  Layer.provide(ViemInfrastructure)
)

/**
 * All services layer - combines all viem service implementations
 *
 * Provides: WalletService, IdentityService, ConsentService, AuditService
 * Requires: nothing (all dependencies satisfied)
 *
 * @since 1.0.0
 * @category Layers
 */
export const AllServicesViem = Layer.mergeAll(
  WalletServiceViemLayer,
  IdentityServiceViemLayer,
  ConsentServiceViemLayer,
  AuditServiceViemLayer
).pipe(
  Layer.provideMerge(WalletLayer),
  Layer.provide(ViemInfrastructure)
)

/**
 * Helper to select layer based on environment
 *
 * @since 1.0.0
 * @category Utilities
 */
export const getServicesLayer = () => {
  if (
    typeof process !== "undefined" &&
    process.env?.NEXT_PUBLIC_USE_MOCK === "true"
  ) {
    // Import mock dynamically would require async
    // For static usage, prefer explicit layer selection in pages
    return AllServicesViem
  }
  return AllServicesViem
}
