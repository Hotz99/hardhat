/**
 * Identity VM Live Implementation
 *
 * @since 1.0.0
 * @category View Models
 */

import { Effect, Layer, pipe, Option, Schema } from "effect"
import * as Atom from "@effect-atom/atom/Atom"
import { AtomRegistry } from "@effect-atom/atom/Registry"
import {
  IdentityVM,
  IdentityState,
  IdentitySubmitState,
  type IdentityFormData,
  emptyIdentityFormData,
  type IdentityDisplay,
} from "./IdentityVM"
import { IdentityService } from "@/lib/blockchain/services/IdentityService"
import { WalletService } from "@/lib/blockchain/services/WalletService"
import type { IdentityAttributes } from "@/lib/blockchain/domain"
import { Bytes32 } from "@/lib/blockchain/domain"

// --- Helpers ---

const creditTierLabels: Record<string, string> = {
  A: "Excellent",
  B: "Good",
  C: "Fair",
  D: "Poor",
}

const formatTimestamp = (timestamp: bigint): string => {
  const date = new Date(Number(timestamp) * 1000)
  return date.toLocaleDateString()
}

const toIdentityDisplay = (attrs: IdentityAttributes): IdentityDisplay => ({
  creditTier: attrs.creditTier,
  creditTierLabel: creditTierLabels[attrs.creditTier] || attrs.creditTier,
  incomeBracket: attrs.incomeBracket,
  debtRatioBracket: attrs.debtRatioBracket,
  lastUpdated: formatTimestamp(attrs.lastUpdated),
})

const isFormValid = (formData: IdentityFormData): boolean =>
  formData.emailHash.length > 0 &&
  formData.creditTier.length > 0 &&
  formData.incomeBracket.length > 0 &&
  formData.debtRatioBracket.length > 0

// --- Layer Implementation ---

const IdentityVMLayer = Layer.scoped(
  IdentityVM,
  Effect.gen(function* () {
    const registry = yield* AtomRegistry
    const identityService = yield* IdentityService
    const walletService = yield* WalletService

    // --- State Atoms ---

    const state$ = Atom.make<IdentityState>(IdentityState.NotRegistered())
    const submitState$ = Atom.make<IdentitySubmitState>(IdentitySubmitState.Idle())
    const formData$ = Atom.make<IdentityFormData>(emptyIdentityFormData)

    // --- Derived Atoms ---

    const hasIdentity$ = pipe(
      state$,
      Atom.map((state) =>
        IdentityState.$match(state, {
          Registered: () => true,
          NotRegistered: () => false,
          Loading: () => false,
          Error: () => false,
        })
      )
    )

    const isFormValid$ = pipe(
      formData$,
      Atom.map(isFormValid)
    )

    // --- Actions ---

    const register = () => {
      const data = registry.get(formData$)
      if (!isFormValid(data)) return

      registry.set(submitState$, IdentitySubmitState.Submitting())

      pipe(
        Effect.gen(function* () {
          // Generate accountReferenceHash from emailHash + salt
          const emailHashBytes = data.emailHash as `0x${string}`
          // Use emailHash with different prefix as account reference (simple derivation)
          const accountRef = emailHashBytes.replace(/^0x.{2}/, "0xff") as `0x${string}`

          yield* identityService.register({
            emailHash: Schema.decodeSync(Bytes32)(emailHashBytes),
            creditTier: data.creditTier,
            incomeBracket: data.incomeBracket,
            debtRatioBracket: data.debtRatioBracket,
            accountReferenceHash: Schema.decodeSync(Bytes32)(accountRef),
          })
        }),
        Effect.andThen(() => identityService.getOwn),
        Effect.tap((attrs) =>
          Effect.sync(() => {
            registry.set(state$, IdentityState.Registered({
              identity: toIdentityDisplay(attrs),
            }))
            registry.set(submitState$, IdentitySubmitState.Success())
          })
        ),
        Effect.catchAll((error) =>
          Effect.sync(() => {
            registry.set(submitState$, IdentitySubmitState.Error({
              message: String(error),
            }))
          })
        ),
        Effect.runPromise
      )
    }

    const update = () => {
      const data = registry.get(formData$)
      if (!isFormValid(data)) return

      registry.set(submitState$, IdentitySubmitState.Submitting())

      pipe(
        identityService.update({
          emailHash: Schema.decodeSync(Bytes32)(data.emailHash as `0x${string}`),
          creditTier: data.creditTier,
          incomeBracket: data.incomeBracket,
          debtRatioBracket: data.debtRatioBracket,
        }),
        Effect.andThen(() => identityService.getOwn),
        Effect.tap((attrs) =>
          Effect.sync(() => {
            registry.set(state$, IdentityState.Registered({
              identity: toIdentityDisplay(attrs),
            }))
            registry.set(submitState$, IdentitySubmitState.Success())
          })
        ),
        Effect.catchAll((error) =>
          Effect.sync(() => {
            registry.set(submitState$, IdentitySubmitState.Error({
              message: String(error),
            }))
          })
        ),
        Effect.runPromise
      )
    }

    const refresh = () => {
      registry.set(state$, IdentityState.Loading())

      pipe(
        identityService.getOwn,
        Effect.tap((attrs) =>
          Effect.sync(() => {
            registry.set(state$, IdentityState.Registered({
              identity: toIdentityDisplay(attrs),
            }))
          })
        ),
        Effect.catchAll((error) =>
          Effect.sync(() => {
            registry.set(state$, IdentityState.Error({
              message: String(error),
            }))
          })
        ),
        Effect.runPromise
      )
    }

    const resetForm = () => {
      registry.set(formData$, emptyIdentityFormData)
      registry.set(submitState$, IdentitySubmitState.Idle())
    }

    // --- On Mount: Check if identity exists ---

    yield* Effect.forkScoped(
      pipe(
        identityService.hasOwn,
        Effect.flatMap(
          Effect.if({
            onTrue: () =>
              pipe(
                identityService.getOwn,
                Effect.tap((attrs) =>
                  Effect.sync(() => {
                    registry.set(state$, IdentityState.Registered({
                      identity: toIdentityDisplay(attrs),
                    }))
                  })
                ),
                Effect.catchAll(() => Effect.void)
              ),
            onFalse: () =>
              Effect.sync(() => {
                registry.set(state$, IdentityState.NotRegistered())
              }),
          })
        ),
        Effect.catchAll(() => Effect.void)
      )
    )

    // --- Return VM Interface ---

    return IdentityVM.of({
      state$,
      submitState$,
      hasIdentity$,
      formData$,
      isFormValid$,
      register,
      update,
      refresh,
      resetForm,
    })
  })
)

// --- Export ---

export const IdentityVMLive = {
  tag: IdentityVM,
  layer: IdentityVMLayer,
}
