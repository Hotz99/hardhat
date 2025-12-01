import { Schema } from "effect"

export const Address = Schema.String.pipe(
  Schema.pattern(/^0x[a-fA-F0-9]{40}$/),
  Schema.brand("Address")
)
export type Address = typeof Address.Type
