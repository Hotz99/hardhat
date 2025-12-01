import { Data, Schema } from "effect"
import { Address } from "./Address"
import { Bytes32 } from "./Bytes32"

export class IdentityAttributes extends Data.Class<{
  readonly userId: Address
  readonly emailHash: Bytes32
  readonly creditTier: string
  readonly incomeBracket: string
  readonly debtRatioBracket: string
  readonly lastUpdated: bigint
}> {}

export const IdentityAttributesSchema = Schema.Struct({
  userId: Address,
  emailHash: Bytes32,
  creditTier: Schema.String,
  incomeBracket: Schema.String,
  debtRatioBracket: Schema.String,
  lastUpdated: Schema.BigIntFromSelf
})
