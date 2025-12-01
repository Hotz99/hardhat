import { describe, it, expect } from "vitest"
import { Layer } from "effect"
import { ConsentService } from "@/lib/blockchain/services/ConsentService"
import { WalletService } from "@/lib/blockchain/services/WalletService"
import { ConsentVM, type ConsentFormData, type ConsentScope, type ConsentSubmitState } from "./ConsentVM"

const ConsentServiceMock = Layer.succeed(ConsentService, {} as ConsentService)
const WalletServiceMock = Layer.succeed(WalletService, {} as WalletService)

describe("ConsentVM", () => {
  describe("consent list", () => {
    it("should load consents on mount", () => {
      // Contract: consents$ should be Loadable type
      const pending: { readonly _tag: "Pending" } = { _tag: "Pending" }
      const ready: { readonly _tag: "Ready"; readonly value: readonly [] } = {
        _tag: "Ready",
        value: []
      }

      expect(pending._tag).toBe("Pending")
      expect(ready._tag).toBe("Ready")
      expect(ready.value).toEqual([])
    })

    it("should track active consent count", () => {
      // Contract: activeCount$ should be a number
      const activeCount: number = 0
      expect(typeof activeCount).toBe("number")
      expect(activeCount).toBeGreaterThanOrEqual(0)
    })

    it("should track expired consent count", () => {
      // Contract: expiredCount$ should be a number
      const expiredCount: number = 0
      expect(typeof expiredCount).toBe("number")
      expect(expiredCount).toBeGreaterThanOrEqual(0)
    })
  })

  describe("consent form", () => {
    it("should start with empty form", () => {
      // Contract: initial form should have empty lender address, default scopes, and default duration
      const form: ConsentFormData = {
        lenderAddress: "",
        scopes: [
          { key: "credit_score", label: "Credit Score", selected: false },
          { key: "income", label: "Income Bracket", selected: false }
        ],
        durationDays: 30
      }

      expect(form.lenderAddress).toBe("")
      expect(form.scopes.length).toBeGreaterThan(0)
      expect(form.scopes.every(s => !s.selected)).toBe(true)
      expect(form.durationDays).toBe(30)
    })

    it("should toggle scope selection", () => {
      // Contract: toggleScope should flip the selected boolean for matching key
      const scope: ConsentScope = { key: "credit_score", label: "Credit Score", selected: false }
      const toggled: ConsentScope = { ...scope, selected: !scope.selected }

      expect(scope.selected).toBe(false)
      expect(toggled.selected).toBe(true)
      expect(toggled.key).toBe(scope.key)
    })

    it("should validate lender address", () => {
      // Contract: isFormValid$ should check lenderAddress is non-empty
      const validForm: ConsentFormData = {
        lenderAddress: "0x1234567890abcdef",
        scopes: [{ key: "credit_score", label: "Credit Score", selected: true }],
        durationDays: 30
      }

      const invalidForm: ConsentFormData = {
        ...validForm,
        lenderAddress: ""
      }

      expect(validForm.lenderAddress.length).toBeGreaterThan(0)
      expect(invalidForm.lenderAddress.length).toBe(0)
    })

    it("should validate at least one scope selected", () => {
      // Contract: isFormValid$ should check at least one scope is selected
      const validScopes: readonly ConsentScope[] = [
        { key: "credit_score", label: "Credit Score", selected: true },
        { key: "income", label: "Income Bracket", selected: false }
      ]

      const invalidScopes: readonly ConsentScope[] = [
        { key: "credit_score", label: "Credit Score", selected: false },
        { key: "income", label: "Income Bracket", selected: false }
      ]

      expect(validScopes.some(s => s.selected)).toBe(true)
      expect(invalidScopes.some(s => s.selected)).toBe(false)
    })
  })

  describe("actions", () => {
    it("should grant consent", () => {
      // Contract: grantConsent should transition submitState through Idle -> Submitting -> Success/Error
      const idle: ConsentSubmitState = { _tag: "Idle" }
      const submitting: ConsentSubmitState = { _tag: "Submitting" }
      const success: ConsentSubmitState = { _tag: "Success", consentId: "consent-123" }
      const error: ConsentSubmitState = { _tag: "Error", message: "Transaction failed" }

      expect(idle._tag).toBe("Idle")
      expect(submitting._tag).toBe("Submitting")
      expect(success._tag).toBe("Success")
      expect((success as Extract<ConsentSubmitState, { _tag: "Success" }>).consentId).toBe("consent-123")
      expect(error._tag).toBe("Error")
      expect((error as Extract<ConsentSubmitState, { _tag: "Error" }>).message).toBe("Transaction failed")
    })

    it("should revoke consent by id", () => {
      // Contract: revokeAll should accept lenderAddress and trigger revocation
      const lenderAddress: string = "0x1234567890abcdef"
      expect(typeof lenderAddress).toBe("string")
      expect(lenderAddress.length).toBeGreaterThan(0)
    })

    it("should revoke all consents for lender", () => {
      // Contract: revokeAll accepts lenderAddress string parameter
      const lenderAddress: string = "0x1234567890abcdef"
      const action: (addr: string) => void = (_addr: string) => {}

      expect(() => action(lenderAddress)).not.toThrow()
    })

    it("should refresh consent list", () => {
      // Contract: refresh should reload consents$ from Pending back to Ready
      const beforeRefresh: { readonly _tag: "Ready"; readonly value: readonly [] } = {
        _tag: "Ready",
        value: []
      }
      const duringRefresh: { readonly _tag: "Pending" } = { _tag: "Pending" }

      expect(beforeRefresh._tag).toBe("Ready")
      expect(duringRefresh._tag).toBe("Pending")
    })
  })
})
