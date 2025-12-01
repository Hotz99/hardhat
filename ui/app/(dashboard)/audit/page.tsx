"use client"

import * as React from "react"
import { pipe, Layer } from "effect"
import { useAtomValue } from "@effect-atom/atom-react"
import * as Result from "@effect-atom/atom/Result"
import { useVM } from "@/lib/VMRuntime"
import { AuditVMLive } from "@/lib/features/audit/AuditVMLive"
import { AuditFilter } from "@/lib/features/audit/AuditVM"
import type { AuditVM } from "@/lib/features/audit/AuditVM"
import type { AuditEntryVM } from "@/lib/features/audit/AuditEntryVM"
import * as Loadable from "@/lib/Loadable"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { AllServicesViem } from "@/lib/blockchain/layers"

// Compose AuditVM layer with viem services
const AuditVMComposed = {
  tag: AuditVMLive.tag,
  layer: AuditVMLive.layer.pipe(
    Layer.provide(AllServicesViem)
  )
}

// Audit Entry Row Component
function AuditEntryRow({ entry }: { entry: AuditEntryVM }) {
  const eventTypeLabel = useAtomValue(entry.eventTypeLabel$)
  const eventTypeIcon = useAtomValue(entry.eventTypeIcon$)
  const timestamp = useAtomValue(entry.timestamp$)
  const relativeTime = useAtomValue(entry.relativeTime$)
  const accessorDisplay = useAtomValue(entry.accessorDisplay$)
  const scopeLabel = useAtomValue(entry.scopeLabel$)
  const isOwnActivity = useAtomValue(entry.isOwnActivity$)

  return (
    <TableRow className={cn(isOwnActivity && "bg-yellow-50/50 dark:bg-yellow-400/5")}>
      <TableCell>
        <div className="flex items-center gap-2">
          <span className="text-lg" aria-hidden="true">
            {eventTypeIcon}
          </span>
          <span className="font-medium">{eventTypeLabel}</span>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{accessorDisplay}</Badge>
          {isOwnActivity && <Badge variant="outline">You</Badge>}
        </div>
      </TableCell>
      <TableCell>
        {scopeLabel && (
          <code className="text-xs font-mono text-muted-foreground truncate block max-w-[200px]">
            {scopeLabel}
          </code>
        )}
      </TableCell>
      <TableCell className="text-muted-foreground">{timestamp}</TableCell>
      <TableCell className="text-xs text-muted-foreground">{relativeTime}</TableCell>
    </TableRow>
  )
}

// Audit Table Component
function AuditTable({ entries }: { entries: readonly AuditEntryVM[] }) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="text-4xl mb-2">📋</div>
        <h3 className="text-lg font-medium">No audit entries found</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Audit events will appear here once activity is recorded
        </p>
      </div>
    )
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Event Type</TableHead>
            <TableHead>Accessor</TableHead>
            <TableHead>Scope</TableHead>
            <TableHead>Timestamp</TableHead>
            <TableHead>Relative</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <AuditEntryRow key={entry.key} entry={entry} />
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

// Pagination Component
function Pagination({
  page,
  totalPages,
  totalCount,
  onNext,
  onPrev,
}: {
  page: number
  totalPages: number
  totalCount: number
  onNext: () => void
  onPrev: () => void
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="text-sm text-muted-foreground">
        Page {page} of {totalPages} ({totalCount} total)
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onPrev}
          disabled={page === 1}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onNext}
          disabled={page >= totalPages}
        >
          Next
        </Button>
      </div>
    </div>
  )
}

// Loading State
function AuditLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10" />
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    </div>
  )
}

// Error State
function AuditError({ cause }: { cause: unknown }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="text-4xl mb-2">⚠️</div>
      <h3 className="text-lg font-medium">Failed to load audit log</h3>
      <p className="text-sm text-muted-foreground mt-1">
        {cause instanceof Error ? cause.message : "An unknown error occurred"}
      </p>
    </div>
  )
}

// Filter value to tab value mapping
function getTabValue(filter: AuditFilter): string {
  return filter._tag
}

// Main Content Component
function AuditContent({ vm }: { vm: AuditVM }) {
  const entries = useAtomValue(vm.entries$)
  const filter = useAtomValue(vm.filter$)
  const pagination = useAtomValue(vm.pagination$)
  const totalEvents = useAtomValue(vm.totalEvents$)
  const recentActivitySummary = useAtomValue(vm.recentActivitySummary$)

  const currentTab = getTabValue(filter)

  return (
    <div className="space-y-6">
      {/* Inline Stats */}
      <div className="flex gap-6 text-sm">
        <div>
          <span className="text-muted-foreground">Total Events: </span>
          <span className="font-semibold">{totalEvents}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Recent Activity: </span>
          <span className="font-semibold">{recentActivitySummary}</span>
        </div>
      </div>

      {/* Filters */}
      <Tabs value={currentTab} onValueChange={(value) => {
        const filterMap: Record<string, AuditFilter> = {
          All: AuditFilter.All(),
          ConsentEvents: AuditFilter.ConsentEvents(),
          IdentityEvents: AuditFilter.IdentityEvents(),
          AccessRequests: AuditFilter.AccessRequests(),
        }
        const newFilter = filterMap[value]
        if (newFilter) {
          vm.setFilter(newFilter)
        }
      }}>
        <TabsList>
          <TabsTrigger value="All">All Events</TabsTrigger>
          <TabsTrigger value="ConsentEvents">Consent Events</TabsTrigger>
          <TabsTrigger value="IdentityEvents">Identity Events</TabsTrigger>
          <TabsTrigger value="AccessRequests">Access Requests</TabsTrigger>
        </TabsList>

        <TabsContent value={currentTab} className="mt-4">
          {Loadable.match(entries, {
            onPending: () => (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ),
            onReady: (items) => <AuditTable entries={items} />,
          })}
        </TabsContent>
      </Tabs>

      {/* Pagination */}
      <Pagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        totalCount={pagination.totalCount}
        onNext={vm.nextPage}
        onPrev={vm.prevPage}
      />
    </div>
  )
}

// Main Page Component
export default function AuditPage() {
  const vmResult = useVM(AuditVMComposed.tag, AuditVMComposed.layer)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Audit Logs</h1>
        <p className="text-muted-foreground">
          View data access history and events
        </p>
      </div>

      {pipe(
        vmResult,
        Result.match({
          onInitial: () => <AuditLoading />,
          onSuccess: ({ value: vm }) => <AuditContent vm={vm} />,
          onFailure: ({ cause }) => <AuditError cause={cause} />,
        })
      )}
    </div>
  )
}
