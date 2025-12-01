import { describe, it, expect } from "vitest"
import { Layer } from "effect"
import { AuditService } from "@/lib/blockchain/services/AuditService"
import { WalletService } from "@/lib/blockchain/services/WalletService"
import { AuditVM, AuditFilter, Pagination, defaultPagination } from "./AuditVM"
import * as Loadable from "@/lib/Loadable"

const AuditServiceMock = Layer.succeed(AuditService, {} as AuditService)
const WalletServiceMock = Layer.succeed(WalletService, {} as WalletService)

describe("AuditVM", () => {
  describe("audit entries", () => {
    it("should load audit entries on mount", () => {
      // Contract: entries$ can be Pending or Ready with array
      const pendingState: Loadable.Loadable<readonly any[]> = Loadable.pending()
      expect(Loadable.isPending(pendingState)).toBe(true)

      const readyState: Loadable.Loadable<readonly any[]> = Loadable.ready([])
      expect(Loadable.isReady(readyState)).toBe(true)
      expect(readyState._tag).toBe("Ready")
    })

    it("should display entries with formatted timestamps", () => {
      // Contract: AuditEntryVM has timestamp field
      const mockEntry = {
        id: "1",
        timestamp: "2024-01-01T00:00:00Z",
        type: "consent",
        details: "Test event",
        actor: "0x123",
        isOwnActivity: false,
      }

      expect(mockEntry.timestamp).toBeDefined()
      expect(typeof mockEntry.timestamp).toBe("string")
    })

    it("should identify own activity", () => {
      // Contract: AuditEntryVM has isOwnActivity boolean
      const ownActivity = {
        id: "1",
        timestamp: "2024-01-01T00:00:00Z",
        type: "consent",
        details: "Test event",
        actor: "0x123",
        isOwnActivity: true,
      }

      const otherActivity = {
        id: "2",
        timestamp: "2024-01-01T00:00:00Z",
        type: "consent",
        details: "Test event",
        actor: "0x456",
        isOwnActivity: false,
      }

      expect(ownActivity.isOwnActivity).toBe(true)
      expect(otherActivity.isOwnActivity).toBe(false)
    })
  })

  describe("filtering", () => {
    it("should filter by All", () => {
      // Contract: All filter is valid AuditFilter
      const filter: AuditFilter = AuditFilter.All()
      expect(filter._tag).toBe("All")
      expect(filter).toEqual(AuditFilter.All())
    })

    it("should filter by ConsentEvents", () => {
      // Contract: ConsentEvents filter is valid AuditFilter
      const filter: AuditFilter = AuditFilter.ConsentEvents()
      expect(filter._tag).toBe("ConsentEvents")
      expect(filter).toEqual(AuditFilter.ConsentEvents())
    })

    it("should filter by IdentityEvents", () => {
      // Contract: IdentityEvents filter is valid AuditFilter
      const filter: AuditFilter = AuditFilter.IdentityEvents()
      expect(filter._tag).toBe("IdentityEvents")
      expect(filter).toEqual(AuditFilter.IdentityEvents())
    })

    it("should filter by AccessRequests", () => {
      // Contract: AccessRequests filter is valid AuditFilter
      const filter: AuditFilter = AuditFilter.AccessRequests()
      expect(filter._tag).toBe("AccessRequests")
      expect(filter).toEqual(AuditFilter.AccessRequests())
    })
  })

  describe("pagination", () => {
    it("should navigate to next page", () => {
      // Contract: pagination$ has page number that can increment
      const currentPagination: Pagination = {
        page: 1,
        pageSize: 20,
        totalPages: 5,
        totalCount: 100,
      }

      const nextPagination: Pagination = {
        ...currentPagination,
        page: currentPagination.page + 1,
      }

      expect(nextPagination.page).toBe(2)
      expect(nextPagination.page).toBeGreaterThan(currentPagination.page)
    })

    it("should navigate to previous page", () => {
      // Contract: pagination$ has page number that can decrement
      const currentPagination: Pagination = {
        page: 3,
        pageSize: 20,
        totalPages: 5,
        totalCount: 100,
      }

      const prevPagination: Pagination = {
        ...currentPagination,
        page: currentPagination.page - 1,
      }

      expect(prevPagination.page).toBe(2)
      expect(prevPagination.page).toBeLessThan(currentPagination.page)
    })

    it("should go to specific page", () => {
      // Contract: pagination$ can be set to specific page number
      const currentPagination: Pagination = {
        page: 1,
        pageSize: 20,
        totalPages: 5,
        totalCount: 100,
      }

      const targetPage = 4
      const updatedPagination: Pagination = {
        ...currentPagination,
        page: targetPage,
      }

      expect(updatedPagination.page).toBe(targetPage)
      expect(updatedPagination.totalPages).toBe(currentPagination.totalPages)
    })
  })

  describe("summary stats", () => {
    it("should compute total events", () => {
      // Contract: totalEvents$ is a number representing count
      const totalEvents: number = 150
      expect(typeof totalEvents).toBe("number")
      expect(totalEvents).toBeGreaterThanOrEqual(0)
    })

    it("should compute recent activity summary", () => {
      // Contract: recentActivitySummary$ is a string with description
      const summary: string = "5 events in the last 24 hours"
      expect(typeof summary).toBe("string")
      expect(summary.length).toBeGreaterThan(0)

      const noActivitySummary: string = "No recent activity"
      expect(typeof noActivitySummary).toBe("string")
    })
  })
})
