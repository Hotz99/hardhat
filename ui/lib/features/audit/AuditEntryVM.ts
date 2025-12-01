import type * as Atom from "@effect-atom/atom/Atom"

/**
 * @category Models
 * @since 1.0.0
 */
export interface AuditEntryVM {
  readonly key: string
  readonly eventTypeLabel$: Atom.Atom<string>
  readonly eventTypeIcon$: Atom.Atom<string>
  readonly accessorDisplay$: Atom.Atom<string>
  readonly subjectDisplay$: Atom.Atom<string>
  readonly scopeLabel$: Atom.Atom<string | null>
  readonly timestamp$: Atom.Atom<string>
  readonly relativeTime$: Atom.Atom<string>
  readonly isOwnActivity$: Atom.Atom<boolean>
}
