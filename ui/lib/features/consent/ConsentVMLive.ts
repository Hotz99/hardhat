import { Effect, Layer, pipe, Clock } from "effect"
import { keccak256, toBytes } from "viem"
import * as Atom from "@effect-atom/atom/Atom"
import { AtomRegistry } from "@effect-atom/atom/Registry"
import * as Loadable from "@/lib/Loadable"
import {
  ConsentVM,
  ConsentFormData,
  ConsentSubmitState,
  emptyConsentFormData,
  AVAILABLE_SCOPES,
  type ConsentScope,
} from "./ConsentVM"
import { ConsentItemVM, ConsentStatus } from "./ConsentItemVM"
import { ConsentService } from "@/lib/blockchain/services/ConsentService"
import { WalletService } from "@/lib/blockchain/services/WalletService"
import type { Consent } from "@/lib/blockchain/domain"
import type { Bytes32 } from "@/lib/blockchain/domain"

const ConsentVMLayer = Layer.scoped(
  ConsentVM,
  Effect.gen(function* () {
    const registry = yield* AtomRegistry
    const consentService = yield* ConsentService
    const walletService = yield* WalletService

    // --- Atoms ---

    const consentsState$ = Atom.make<Loadable.Loadable<readonly Consent[]>>(
      Loadable.pending()
    )

    const formData$ = Atom.make<ConsentFormData>(emptyConsentFormData)

    const submitState$ = Atom.make<ConsentSubmitState>(ConsentSubmitState.Idle())

    // --- Derived Atoms ---

    const consents$ = pipe(
      consentsState$,
      Atom.map((loadable) =>
        Loadable.map(loadable, (consents) =>
          consents.map((consent) => makeConsentItemVM(consent))
        )
      )
    )

    const activeCount$ = pipe(
      consents$,
      Atom.map((loadable) =>
        Loadable.match(loadable, {
          onPending: () => 0,
          onReady: (items) =>
            items.filter((item) => {
              const status = registry.get(item.status$)
              return ConsentStatus.$is("Active")(status)
            }).length,
        })
      )
    )

    const expiredCount$ = pipe(
      consents$,
      Atom.map((loadable) =>
        Loadable.match(loadable, {
          onPending: () => 0,
          onReady: (items) =>
            items.filter((item) => {
              const status = registry.get(item.status$)
              return ConsentStatus.$is("Expired")(status) || ConsentStatus.$is("Revoked")(status)
            }).length,
        })
      )
    )

    const isFormValid$ = pipe(
      formData$,
      Atom.map((data) => {
        const hasValidAddress = data.lenderAddress.trim().length > 0
        const hasSelectedScopes = data.scopes.some((s) => s.selected)
        return hasValidAddress && hasSelectedScopes
      })
    )

    // --- ConsentItemVM Factory ---

    const makeConsentItemVM = Atom.family((consent: Consent): ConsentItemVM => {
      const status$ = pipe(
        consentsState$,
        Atom.map((loadable) =>
          Loadable.match(loadable, {
            onPending: () => ConsentStatus.Active(),
            onReady: (consents) => {
              const current = consents.find(
                (c) => c.consentId === consent.consentId
              )
              if (!current) return ConsentStatus.Revoked()
              if (current.isRevoked) return ConsentStatus.Revoked()

              // Check expiry
              const nowMs = Clock.currentTimeMillis.pipe(Effect.runSync)
              const expiryTime = Number(current.expiryBlockTime)

              if (expiryTime * 1000 < nowMs) {
                return ConsentStatus.Expired()
              }

              return ConsentStatus.Active()
            },
          })
        )
      )

      const scopeLabels$ = Atom.make((get) => {
        // Map scope hashes to labels
        return consent.scopes.map((scopeHash) => {
          const scope = AVAILABLE_SCOPES.find((s) => hashScope(s.key) === scopeHash)
          return scope?.label ?? scopeHash.slice(0, 8)
        })
      })

      const expiresAt$ = Atom.make((get) => {
        const expiryMs = Number(consent.expiryBlockTime) * 1000
        const date = new Date(expiryMs)
        return date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      })

      const canRevoke$ = pipe(
        status$,
        Atom.map((status) => ConsentStatus.$is("Active")(status))
      )

      const revoke = () => {
        Effect.gen(function* () {
          yield* consentService.revokeById(consent.consentId)
          yield* refresh()
        }).pipe(Effect.runFork)
      }

      return {
        key: consent.consentId,
        lenderDisplay: truncateAddress(consent.lender),
        scopeLabels$,
        status$,
        expiresAt$,
        canRevoke$,
        revoke,
      }
    })

    // --- Actions ---

    const grantConsent = () => {
      Effect.gen(function* () {
        const data = registry.get(formData$)

        registry.set(submitState$, ConsentSubmitState.Submitting())

        const selectedScopes = data.scopes
          .filter((s) => s.selected)
          .map((s) => hashScope(s.key))

        const durationSeconds = BigInt(data.durationDays * 24 * 60 * 60)

        const consentId = yield* consentService.grant({
          lender: data.lenderAddress as any,
          scopes: selectedScopes,
          durationSeconds,
        })

        registry.set(submitState$, ConsentSubmitState.Success({ consentId }))

        yield* refresh()
      }).pipe(
        Effect.match({
          onFailure: (error) => {
            registry.set(submitState$, ConsentSubmitState.Error({ message: String(error) }))
          },
          onSuccess: () => {
            // Success state already set in the main flow
          },
        }),
        Effect.runFork
      )
    }

    const toggleScope = (scopeKey: string) => {
      const current = registry.get(formData$)
      registry.set(formData$, {
        ...current,
        scopes: current.scopes.map((s) =>
          s.key === scopeKey ? { ...s, selected: !s.selected } : s
        ),
      })
    }

    const revokeAll = (lenderAddress: string) => {
      Effect.gen(function* () {
        yield* consentService.revokeAll(lenderAddress as any)
        yield* refresh()
      }).pipe(Effect.runFork)
    }

    const refresh = () =>
      Effect.gen(function* () {
        registry.set(consentsState$, Loadable.pending())
        const consents = yield* consentService.getOwnConsents
        registry.set(consentsState$, Loadable.ready(consents))
      })

    const resetForm = () => {
      registry.set(formData$, emptyConsentFormData)
      registry.set(submitState$, ConsentSubmitState.Idle())
    }

    // --- Initial Load ---

    yield* Effect.forkScoped(
      Effect.gen(function* () {
        yield* refresh()
      })
    )

    // --- Return VM ---

    return ConsentVM.of({
      consents$,
      activeCount$,
      expiredCount$,
      formData$,
      isFormValid$,
      submitState$,
      grantConsent,
      toggleScope,
      revokeAll,
      refresh,
      resetForm,
    })
  })
)

// --- Utilities ---

const truncateAddress = (address: string): string => {
  if (address.length < 10) return address
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

const hashScope = (scopeKey: string): Bytes32 =>
  keccak256(toBytes(scopeKey)) as Bytes32

// --- Export ---

export const ConsentVMLive = {
  tag: ConsentVM,
  layer: ConsentVMLayer,
}
