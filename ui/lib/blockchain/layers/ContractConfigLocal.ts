/**
 * Local Hardhat contract configuration layer
 *
 * @since 1.0.0
 * @category Layers
 */

import { Layer } from "effect"
import { hardhat } from "viem/chains"
import { ContractConfig } from "../services/ContractConfig"
import { CreditRegistryAbi, ConsentManagerAbi, AuditLogAbi } from "../contracts/abis"

/**
 * Contract configuration for local Hardhat network
 *
 * Uses addresses from ignition/deployments/chain-31337/deployed_addresses.json
 *
 * @since 1.0.0
 * @category Layers
 */
export const ContractConfigLocal = Layer.succeed(ContractConfig, {
  creditRegistry: {
    address: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
    abi: CreditRegistryAbi,
  },
  consentManager: {
    address: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    abi: ConsentManagerAbi,
  },
  auditLog: {
    address: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
    abi: AuditLogAbi,
  },
  chain: hardhat,
})
