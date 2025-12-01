import { Data, Schema } from "effect"
import { Address } from "./Address"
import { Bytes32 } from "./Bytes32"

export class Consent extends Data.Class<{
  readonly consentId: Bytes32
  readonly borrower: Address
  readonly lender: Address
  readonly scopes: ReadonlyArray<Bytes32>
  readonly startBlockTime: bigint
  readonly expiryBlockTime: bigint
  readonly isRevoked: boolean
}> {}

export const ConsentSchema = Schema.Struct({
  consentId: Bytes32,
  borrower: Address,
  lender: Address,
  scopes: Schema.Array(Bytes32),
  startBlockTime: Schema.BigIntFromSelf,
  expiryBlockTime: Schema.BigIntFromSelf,
  isRevoked: Schema.Boolean
})
