import { Context } from "effect"
import type { Abi, Address, Chain } from "viem"

/**
 * Contract configuration containing addresses and ABIs for deployed contracts.
 *
 * @since 1.0.0
 * @category Services
 */
export interface ContractConfig {
  readonly creditRegistry: { readonly address: Address; readonly abi: Abi }
  readonly consentManager: { readonly address: Address; readonly abi: Abi }
  readonly auditLog: { readonly address: Address; readonly abi: Abi }
  readonly chain: Chain
}

/**
 * @since 1.0.0
 * @category Tags
 */
export const ContractConfig = Context.GenericTag<ContractConfig>(
  "@blockchain/services/ContractConfig"
)
