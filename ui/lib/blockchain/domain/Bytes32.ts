import { Schema } from "effect"

export const Bytes32 = Schema.String.pipe(
  Schema.pattern(/^0x[a-fA-F0-9]{64}$/),
  Schema.brand("Bytes32")
)
export type Bytes32 = typeof Bytes32.Type
