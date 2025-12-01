/**
 * Audit View Model implementation
 *
 * @since 1.0.0
 * @category VM
 */

import { Effect, Layer, pipe, Array as Arr, Option, Clock } from "effect"
import * as Atom from "@effect-atom/atom/Atom"
import { AtomRegistry } from "@effect-atom/atom/Registry"
import * as Loadable from "@/lib/Loadable"
import { AuditVM, AuditFilter, defaultPagination } from "./AuditVM"
import type { AuditEntryVM } from "./AuditEntryVM"
import { AuditService } from "@/lib/blockchain/services/AuditService"
import { WalletService } from "@/lib/blockchain/services/WalletService"
import type { AuditEntry } from "@/lib/blockchain/domain"
import { EventType, eventTypeFromNumber } from "@/lib/blockchain/domain/EventType"
import * as DateTime from "effect/DateTime"

const formatTimestamp = (unixTimestamp: bigint): string => {
  const date = new Date(Number(unixTimestamp) * 1000)
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const formatRelativeTime = (unixTimestamp: bigint, nowMillis: number): string => {
  const timestamp = Number(unixTimestamp) * 1000
  const diff = nowMillis - timestamp
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return "just now"
}

const getEventTypeLabel = (eventType: number): string => {
  const type = eventTypeFromNumber(eventType)
  return EventType.$match(type, {
    ConsentGranted: () => "Consent Granted",
    ConsentRevoked: () => "Consent Revoked",
    ConsentChecked: () => "Consent Checked",
    IdentityRegistered: () => "Identity Registered",
    IdentityUpdated: () => "Identity Updated",
    DataRequestRejected: () => "Data Request Rejected",
  })
}

const getEventTypeIcon = (eventType: number): string => {
  const type = eventTypeFromNumber(eventType)
  return EventType.$match(type, {
    ConsentGranted: () => "✓",
    ConsentRevoked: () => "✗",
    ConsentChecked: () => "👁",
    IdentityRegistered: () => "📝",
    IdentityUpdated: () => "✏️",
    DataRequestRejected: () => "🚫",
  })
}

const truncateAddress = (address: string): string => {
  if (address.length < 12) return address
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

const matchesFilter = (entry: AuditEntry, filter: AuditFilter): boolean => {
  return AuditFilter.$match(filter, {
    All: () => true,
    ConsentEvents: () => {
      const type = eventTypeFromNumber(entry.eventType)
      return EventType.$match(type, {
        ConsentGranted: () => true,
        ConsentRevoked: () => true,
        ConsentChecked: () => true,
        IdentityRegistered: () => false,
        IdentityUpdated: () => false,
        DataRequestRejected: () => false,
      })
    },
    IdentityEvents: () => {
      const type = eventTypeFromNumber(entry.eventType)
      return EventType.$match(type, {
        ConsentGranted: () => false,
        ConsentRevoked: () => false,
        ConsentChecked: () => false,
        IdentityRegistered: () => true,
        IdentityUpdated: () => true,
        DataRequestRejected: () => false,
      })
    },
    AccessRequests: () => {
      const type = eventTypeFromNumber(entry.eventType)
      return EventType.$match(type, {
        ConsentGranted: () => false,
        ConsentRevoked: () => false,
        ConsentChecked: () => true,
        IdentityRegistered: () => false,
        IdentityUpdated: () => false,
        DataRequestRejected: () => true,
      })
    },
  })
}

const AuditVMLayer = Layer.scoped(
  AuditVM,
  Effect.gen(function* () {
    const registry = yield* AtomRegistry
    const auditService = yield* AuditService
    const walletService = yield* WalletService

    // Create state atoms
    const entriesState$ = Atom.make<Loadable.Loadable<readonly AuditEntry[]>>(
      Loadable.pending()
    )
    const filter$ = Atom.make<AuditFilter>(AuditFilter.All())
    const pagination$ = Atom.make(defaultPagination)

    // Get current user address for isOwnActivity checks
    const currentUserAddress = yield* Effect.option(walletService.getAddress)

    // Get current time for relative time calculations
    const nowMillis = yield* Clock.currentTimeMillis

    // Create AuditEntryVM factory
    const makeAuditEntryVM = Atom.family((entry: AuditEntry): AuditEntryVM => {
      const eventTypeLabel$ = Atom.make(getEventTypeLabel(entry.eventType))
      const eventTypeIcon$ = Atom.make(getEventTypeIcon(entry.eventType))
      const timestamp$ = Atom.make(formatTimestamp(entry.unixTimestamp))
      const relativeTime$ = Atom.make(formatRelativeTime(entry.unixTimestamp, nowMillis))
      const accessorDisplay$ = Atom.make(truncateAddress(entry.accessorUserId))
      const subjectDisplay$ = Atom.make(truncateAddress(entry.subjectUserId))
      const scopeLabel$ = Atom.make<string | null>(
        entry.hashedScope === "0x0000000000000000000000000000000000000000000000000000000000000000"
          ? null
          : entry.hashedScope
      )
      const isOwnActivity$ = Atom.make(
        Option.match(currentUserAddress, {
          onNone: () => false,
          onSome: (address) => entry.accessorUserId === address,
        })
      )

      return {
        key: entry.entryId.toString(),
        eventTypeLabel$,
        eventTypeIcon$,
        accessorDisplay$,
        subjectDisplay$,
        scopeLabel$,
        timestamp$,
        relativeTime$,
        isOwnActivity$,
      }
    })

    // Derived atom: filtered and paginated entries
    const entries$ = pipe(
      Atom.make((get) => {
        const loadable = get(entriesState$)
        const filter = get(filter$)
        const pagination = get(pagination$)

        return pipe(
          loadable,
          Loadable.map((entries) => {
            const filtered = Arr.filter(entries, (entry) =>
              matchesFilter(entry, filter)
            )
            const start = (pagination.page - 1) * pagination.pageSize
            const end = start + pagination.pageSize
            const paginated = filtered.slice(start, end)
            return Arr.map(paginated, makeAuditEntryVM)
          })
        )
      })
    )

    // Derived atom: filtered count
    const filteredCount$ = pipe(
      Atom.make((get) => {
        const loadable = get(entriesState$)
        const filter = get(filter$)

        return pipe(
          loadable,
          Loadable.map((entries) =>
            Arr.filter(entries, (entry) => matchesFilter(entry, filter)).length
          ),
          Loadable.getOrElse(() => 0)
        )
      })
    )

    // Derived atom: total events
    const totalEvents$ = pipe(
      Atom.make((get) => {
        const loadable = get(entriesState$)
        return pipe(
          loadable,
          Loadable.map((entries) => entries.length),
          Loadable.getOrElse(() => 0)
        )
      })
    )

    // Derived atom: recent activity summary
    const recentActivitySummary$ = pipe(
      Atom.make((get) => {
        const loadable = get(entriesState$)
        return pipe(
          loadable,
          Loadable.map((entries) => {
            const oneDayAgo = nowMillis - 24 * 60 * 60 * 1000
            const recentCount = Arr.filter(
              entries,
              (entry) => Number(entry.unixTimestamp) * 1000 > oneDayAgo
            ).length

            if (recentCount === 0) return "No recent activity"
            if (recentCount === 1) return "1 event in the last 24 hours"
            return `${recentCount} events in the last 24 hours`
          }),
          Loadable.getOrElse(() => "No recent activity")
        )
      })
    )

    // Actions
    const setFilter = (filter: AuditFilter) => {
      registry.set(filter$, filter)
      // Reset to page 1 when filter changes
      const current = registry.get(pagination$)
      const filtered = registry.get(filteredCount$)
      const totalPages = Math.max(1, Math.ceil(filtered / current.pageSize))
      registry.set(pagination$, {
        ...current,
        page: 1,
        totalPages,
        totalCount: filtered,
      })
    }

    const goToPage = (page: number) => {
      const current = registry.get(pagination$)
      if (page >= 1 && page <= current.totalPages) {
        registry.set(pagination$, { ...current, page })
      }
    }

    const nextPage = () => {
      const current = registry.get(pagination$)
      if (current.page < current.totalPages) {
        registry.set(pagination$, { ...current, page: current.page + 1 })
      }
    }

    const prevPage = () => {
      const current = registry.get(pagination$)
      if (current.page > 1) {
        registry.set(pagination$, { ...current, page: current.page - 1 })
      }
    }

    const refresh = () => {
      Effect.runPromise(
        Effect.gen(function* () {
          registry.set(entriesState$, Loadable.pending())

          yield* auditService.getOwnAccessHistory.pipe(
            Effect.match({
              onFailure: () => {
                registry.set(entriesState$, Loadable.ready([]))
              },
              onSuccess: (entries) => {
                registry.set(entriesState$, Loadable.ready(entries))

                // Update pagination
                const current = registry.get(pagination$)
                const filter = registry.get(filter$)
                const filtered = Arr.filter(entries, (entry) =>
                  matchesFilter(entry, filter)
                ).length
                const totalPages = Math.max(1, Math.ceil(filtered / current.pageSize))

                registry.set(pagination$, {
                  ...current,
                  totalPages,
                  totalCount: filtered,
                })
              },
            })
          )
        })
      )
    }

    // Load initial data on mount
    yield* Effect.forkScoped(
      Effect.sync(() => refresh())
    )

    return {
      entries$,
      pagination$,
      filter$,
      filteredCount$,
      totalEvents$,
      recentActivitySummary$,
      setFilter,
      goToPage,
      nextPage,
      prevPage,
      refresh,
    }
  })
)

export const AuditVMLive = {
  tag: AuditVM,
  layer: AuditVMLayer,
}
