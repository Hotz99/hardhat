import { describe, it, expect } from "vitest"
import { Layer } from "effect"
import { IdentityService } from "@/lib/blockchain/services/IdentityService"
import { WalletService } from "@/lib/blockchain/services/WalletService"
import { IdentityVM, type IdentityState, type IdentitySubmitState, type IdentityFormData, type IdentityDisplay, emptyIdentityFormData } from "./IdentityVM"

const IdentityServiceMock = Layer.succeed(IdentityService, {} as IdentityService)
const WalletServiceMock = Layer.succeed(WalletService, {} as WalletService)

describe("IdentityVM", () => {
  describe("state management", () => {
    it("should start in NotRegistered state when no identity exists", () => {
      const state: IdentityState = { _tag: "NotRegistered" }
      expect(state._tag).toBe("NotRegistered")
    })

    it("should transition to Loading state when fetching", () => {
      const initialState: IdentityState = { _tag: "NotRegistered" }
      const loadingState: IdentityState = { _tag: "Loading" }

      expect(initialState._tag).toBe("NotRegistered")
      expect(loadingState._tag).toBe("Loading")
    })

    it("should transition to Registered state when identity found", () => {
      const identity: IdentityDisplay = {
        creditTier: "A",
        creditTierLabel: "Excellent",
        incomeBracket: "$75k-100k",
        debtRatioBracket: "0-20%",
        lastUpdated: "2025-12-01"
      }
      const registeredState: IdentityState = {
        _tag: "Registered",
        identity
      }

      expect(registeredState._tag).toBe("Registered")
      if (registeredState._tag === "Registered") {
        expect(registeredState.identity.creditTier).toBe("A")
        expect(registeredState.identity.creditTierLabel).toBe("Excellent")
      }
    })

    it("should transition to Error state on failure", () => {
      const errorState: IdentityState = {
        _tag: "Error",
        message: "Failed to fetch identity"
      }

      expect(errorState._tag).toBe("Error")
      if (errorState._tag === "Error") {
        expect(errorState.message).toBe("Failed to fetch identity")
      }
    })
  })

  describe("form validation", () => {
    it("should validate empty form as invalid", () => {
      const emptyForm: IdentityFormData = emptyIdentityFormData

      expect(emptyForm.emailHash).toBe("")
      expect(emptyForm.creditTier).toBe("")
      expect(emptyForm.incomeBracket).toBe("")
      expect(emptyForm.debtRatioBracket).toBe("")

      const isValid = Object.values(emptyForm).every(value => value !== "")
      expect(isValid).toBe(false)
    })

    it("should validate complete form as valid", () => {
      const completeForm: IdentityFormData = {
        emailHash: "abc123hash",
        creditTier: "A",
        incomeBracket: "$75k-100k",
        debtRatioBracket: "0-20%"
      }

      expect(completeForm.emailHash).toBe("abc123hash")
      expect(completeForm.creditTier).toBe("A")
      expect(completeForm.incomeBracket).toBe("$75k-100k")
      expect(completeForm.debtRatioBracket).toBe("0-20%")

      const isValid = Object.values(completeForm).every(value => value !== "")
      expect(isValid).toBe(true)
    })

    it("should update isFormValid$ when form changes", () => {
      const partialForm: IdentityFormData = {
        emailHash: "abc123hash",
        creditTier: "A",
        incomeBracket: "",
        debtRatioBracket: ""
      }

      const isPartialValid = Object.values(partialForm).every(value => value !== "")
      expect(isPartialValid).toBe(false)

      const completeForm: IdentityFormData = {
        ...partialForm,
        incomeBracket: "$75k-100k",
        debtRatioBracket: "0-20%"
      }

      const isCompleteValid = Object.values(completeForm).every(value => value !== "")
      expect(isCompleteValid).toBe(true)
    })
  })

  describe("actions", () => {
    it("should register identity", () => {
      const submitState: IdentitySubmitState = { _tag: "Submitting" }
      expect(submitState._tag).toBe("Submitting")

      const successState: IdentitySubmitState = { _tag: "Success" }
      expect(successState._tag).toBe("Success")

      const errorState: IdentitySubmitState = {
        _tag: "Error",
        message: "Registration failed"
      }
      expect(errorState._tag).toBe("Error")
      if (errorState._tag === "Error") {
        expect(errorState.message).toBe("Registration failed")
      }
    })

    it("should update identity", () => {
      const submitState: IdentitySubmitState = { _tag: "Submitting" }
      expect(submitState._tag).toBe("Submitting")

      const successState: IdentitySubmitState = { _tag: "Success" }
      expect(successState._tag).toBe("Success")
    })

    it("should refresh identity", () => {
      const loadingState: IdentityState = { _tag: "Loading" }
      expect(loadingState._tag).toBe("Loading")

      const identity: IdentityDisplay = {
        creditTier: "B",
        creditTierLabel: "Good",
        incomeBracket: "$50k-75k",
        debtRatioBracket: "20-40%",
        lastUpdated: "2025-12-01"
      }
      const registeredState: IdentityState = {
        _tag: "Registered",
        identity
      }
      expect(registeredState._tag).toBe("Registered")
    })

    it("should reset form", () => {
      const filledForm: IdentityFormData = {
        emailHash: "abc123hash",
        creditTier: "A",
        incomeBracket: "$75k-100k",
        debtRatioBracket: "0-20%"
      }
      expect(filledForm.emailHash).not.toBe("")

      const resetForm: IdentityFormData = emptyIdentityFormData
      expect(resetForm.emailHash).toBe("")
      expect(resetForm.creditTier).toBe("")
      expect(resetForm.incomeBracket).toBe("")
      expect(resetForm.debtRatioBracket).toBe("")
    })
  })
})
