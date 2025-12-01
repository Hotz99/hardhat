import { Data, Schema } from "effect"
import { Address } from "./Address"
import { Bytes32 } from "./Bytes32"

export class AuditEntry extends Data.Class<{
  readonly entryId: bigint
  readonly accessorUserId: Address
  readonly subjectUserId: Address
  readonly hashedScope: Bytes32
  readonly unixTimestamp: bigint
  readonly eventType: number
}> {}

export const AuditEntrySchema = Schema.Struct({
  entryId: Schema.BigIntFromSelf,
  accessorUserId: Address,
  subjectUserId: Address,
  hashedScope: Bytes32,
  unixTimestamp: Schema.BigIntFromSelf,
  eventType: Schema.Number
})
