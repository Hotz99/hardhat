import type * as Atom from "@effect-atom/atom/Atom"
import { Context, Data, Layer, Scope } from "effect"
import type { AtomRegistry } from "@effect-atom/atom/Registry"
import type { Loadable } from "@/lib/Loadable"
import type { ConsentService, WalletService } from "@/lib/blockchain/services"
import type { ConsentItemVM } from "./ConsentItemVM"

// --- UI-ready Domain Types ---

export interface ConsentScope {
  readonly key: string       // React key (scope hash)
  readonly label: string     // "Credit Score", "Income", etc.
  readonly selected: boolean
}

export interface ConsentFormData {
  readonly lenderAddress: string
  readonly scopes: readonly ConsentScope[]
  readonly durationDays: number
}

export const AVAILABLE_SCOPES: readonly ConsentScope[] = [
  { key: "credit_score", label: "Credit Score", selected: false },
  { key: "income", label: "Income Bracket", selected: false },
  { key: "debt_ratio", label: "Debt Ratio", selected: false },
  { key: "full_profile", label: "Full Profile", selected: false },
]

export const emptyConsentFormData: ConsentFormData = {
  lenderAddress: "",
  scopes: AVAILABLE_SCOPES,
  durationDays: 30
}

export type ConsentSubmitState = Data.TaggedEnum<{
  Idle: {}
  Submitting: {}
  Success: { readonly consentId: string }
  Error: { readonly message: string }
}>

export const ConsentSubmitState = Data.taggedEnum<ConsentSubmitState>()

// --- VM Interface ---

export interface ConsentVM {
  // List state
  readonly consents$: Atom.Atom<Loadable<readonly ConsentItemVM[]>>
  readonly activeCount$: Atom.Atom<number>
  readonly expiredCount$: Atom.Atom<number>

  // Form state
  readonly formData$: Atom.Writable<ConsentFormData, ConsentFormData>
  readonly isFormValid$: Atom.Atom<boolean>
  readonly submitState$: Atom.Atom<ConsentSubmitState>

  // Actions
  readonly grantConsent: () => void
  readonly toggleScope: (scopeKey: string) => void
  readonly revokeAll: (lenderAddress: string) => void
  readonly refresh: () => void
  readonly resetForm: () => void
}

// --- Context Tag ---

export const ConsentVM = Context.GenericTag<ConsentVM>("@features/consent/ConsentVM")

// --- Layer Type Signature ---

export declare const ConsentVMLive: {
  readonly tag: typeof ConsentVM
  readonly layer: Layer.Layer<ConsentVM, never, ConsentService | WalletService | AtomRegistry | Scope.Scope>
}
