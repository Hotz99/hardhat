import type * as Atom from "@effect-atom/atom/Atom"
import { Context, Data, Layer, Scope } from "effect"
import type { AtomRegistry } from "@effect-atom/atom/Registry"
import type { IdentityService, WalletService } from "@/lib/blockchain/services"

// --- UI-ready Domain Types ---

export interface IdentityFormData {
  readonly emailHash: string       // User enters email, we hash it
  readonly creditTier: string      // "A" | "B" | "C" | "D"
  readonly incomeBracket: string   // "$50k-75k", "$75k-100k", etc.
  readonly debtRatioBracket: string // "0-20%", "20-40%", etc.
}

export const emptyIdentityFormData: IdentityFormData = {
  emailHash: "",
  creditTier: "",
  incomeBracket: "",
  debtRatioBracket: ""
}

export interface IdentityDisplay {
  readonly creditTier: string
  readonly creditTierLabel: string      // "Excellent", "Good", etc.
  readonly incomeBracket: string
  readonly debtRatioBracket: string
  readonly lastUpdated: string          // Formatted date string
}

export type IdentityState = Data.TaggedEnum<{
  NotRegistered: {}
  Loading: {}
  Registered: { readonly identity: IdentityDisplay }
  Error: { readonly message: string }
}>

export const IdentityState = Data.taggedEnum<IdentityState>()

export type IdentitySubmitState = Data.TaggedEnum<{
  Idle: {}
  Submitting: {}
  Success: {}
  Error: { readonly message: string }
}>

export const IdentitySubmitState = Data.taggedEnum<IdentitySubmitState>()

// --- VM Interface ---

export interface IdentityVM {
  // Reactive state (read-only)
  readonly state$: Atom.Atom<IdentityState>
  readonly submitState$: Atom.Atom<IdentitySubmitState>
  readonly hasIdentity$: Atom.Atom<boolean>

  // Form state (writable)
  readonly formData$: Atom.Writable<IdentityFormData, IdentityFormData>
  readonly isFormValid$: Atom.Atom<boolean>

  // Actions
  readonly register: () => void
  readonly update: () => void
  readonly refresh: () => void
  readonly resetForm: () => void
}

// --- Context Tag ---

export const IdentityVM = Context.GenericTag<IdentityVM>("@features/identity/IdentityVM")

// --- Layer Type Signature ---

export declare const IdentityVMLive: {
  readonly tag: typeof IdentityVM
  readonly layer: Layer.Layer<IdentityVM, never, IdentityService | WalletService | AtomRegistry | Scope.Scope>
}
