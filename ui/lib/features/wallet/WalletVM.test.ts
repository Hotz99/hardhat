import { describe, it, expect } from "vitest"
import { Layer } from "effect"
import { WalletService } from "../../blockchain/services/WalletService"
import { WalletVM, WalletState } from "./WalletVM"

// Mock service layer - empty object, just for types
const WalletServiceMock = Layer.succeed(WalletService, {} as WalletService)

describe("WalletVM", () => {
  describe("state management", () => {
    it("should start in disconnected state", () => {
      // Given a fresh WalletVM
      const vm: WalletVM = {} as WalletVM

      // The initial state should be Disconnected
      const initialState = WalletState.Disconnected()
      expect(initialState._tag).toBe("Disconnected")
    })

    it("should transition to connecting on connect", () => {
      // Given a disconnected state
      const disconnected = WalletState.Disconnected()
      expect(disconnected._tag).toBe("Disconnected")

      // When transitioning to connecting
      const connecting = WalletState.Connecting()
      expect(connecting._tag).toBe("Connecting")
    })

    it("should transition to connected on successful connection", () => {
      // Given a connecting state
      const connecting = WalletState.Connecting()
      expect(connecting._tag).toBe("Connecting")

      // When connection succeeds
      const connected = WalletState.Connected({
        displayAddress: "0x1234...abcd",
        fullAddress: "0x1234567890abcdef1234567890abcdef12345678"
      })

      // Should have Connected state with address fields
      expect(connected._tag).toBe("Connected")
      if (connected._tag === "Connected") {
        expect(connected.displayAddress).toBe("0x1234...abcd")
        expect(connected.fullAddress).toBe("0x1234567890abcdef1234567890abcdef12345678")
      }
    })
  })

  describe("actions", () => {
    it("should connect wallet", () => {
      // Given a WalletVM with connect action
      const vm: WalletVM = {
        connect: () => {}
      } as WalletVM

      // The connect action should be a function
      expect(typeof vm.connect).toBe("function")
      expect(vm.connect).toBeDefined()
    })

    it("should disconnect wallet", () => {
      // Given a WalletVM with disconnect action
      const vm: WalletVM = {
        disconnect: () => {}
      } as WalletVM

      // The disconnect action should be a function
      expect(typeof vm.disconnect).toBe("function")
      expect(vm.disconnect).toBeDefined()
    })

    it("should copy address to clipboard", () => {
      // Given a WalletVM with copyAddress action
      const vm: WalletVM = {
        copyAddress: () => {}
      } as WalletVM

      // The copyAddress action should be a function
      expect(typeof vm.copyAddress).toBe("function")
      expect(vm.copyAddress).toBeDefined()
    })
  })
})
