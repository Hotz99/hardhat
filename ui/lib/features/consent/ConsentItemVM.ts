import type * as Atom from "@effect-atom/atom/Atom"
import { Data } from "effect"

// --- UI-ready Domain Types ---

export type ConsentStatus = Data.TaggedEnum<{
  Active: {}
  Expired: {}
  Revoked: {}
}>

export const ConsentStatus = Data.taggedEnum<ConsentStatus>()

// --- ConsentItemVM Interface ---
// Created via Atom.family within ConsentVM

export interface ConsentItemVM {
  readonly key: string                           // React key (derived from consentId)
  readonly lenderDisplay: string                 // Truncated address: "0x1234...abcd"
  readonly scopeLabels$: Atom.Atom<readonly string[]>  // ["Credit Score", "Income"]
  readonly status$: Atom.Atom<ConsentStatus>
  readonly expiresAt$: Atom.Atom<string>         // Formatted date: "Dec 15, 2025"
  readonly canRevoke$: Atom.Atom<boolean>        // Only active consents can be revoked
  readonly revoke: () => void
}
