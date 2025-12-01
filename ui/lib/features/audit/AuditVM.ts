import type * as Atom from "@effect-atom/atom/Atom"
import { Context, Data, Layer, Scope } from "effect"
import type { AtomRegistry } from "@effect-atom/atom/Registry"
import type { Loadable } from "@/lib/Loadable"
import type { AuditService, WalletService } from "@/lib/blockchain/services"
import type { AuditEntryVM } from "./AuditEntryVM"

/**
 * @category Models
 * @since 1.0.0
 */
export type AuditFilter = Data.TaggedEnum<{
  All: {}
  ConsentEvents: {}
  IdentityEvents: {}
  AccessRequests: {}
}>

/**
 * @category Constructors
 * @since 1.0.0
 */
export const AuditFilter = Data.taggedEnum<AuditFilter>()

/**
 * @category Models
 * @since 1.0.0
 */
export interface Pagination {
  readonly page: number
  readonly pageSize: number
  readonly totalPages: number
  readonly totalCount: number
}

/**
 * @category Constructors
 * @since 1.0.0
 */
export const defaultPagination: Pagination = {
  page: 1,
  pageSize: 20,
  totalPages: 1,
  totalCount: 0,
}

/**
 * @category Models
 * @since 1.0.0
 */
export interface AuditVM {
  readonly entries$: Atom.Atom<Loadable<readonly AuditEntryVM[]>>
  readonly pagination$: Atom.Atom<Pagination>
  readonly filter$: Atom.Writable<AuditFilter, AuditFilter>
  readonly filteredCount$: Atom.Atom<number>
  readonly totalEvents$: Atom.Atom<number>
  readonly recentActivitySummary$: Atom.Atom<string>
  readonly setFilter: (filter: AuditFilter) => void
  readonly goToPage: (page: number) => void
  readonly nextPage: () => void
  readonly prevPage: () => void
  readonly refresh: () => void
}

/**
 * @category Tags
 * @since 1.0.0
 */
export const AuditVM = Context.GenericTag<AuditVM>("@features/audit/AuditVM")

/**
 * @category Layers
 * @since 1.0.0
 */
export declare const AuditVMLive: {
  readonly tag: typeof AuditVM
  readonly layer: Layer.Layer<
    AuditVM,
    never,
    AuditService | WalletService | AtomRegistry | Scope.Scope
  >
}
