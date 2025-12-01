/**
 * Wallet View Model implementation
 *
 * @since 1.0.0
 * @category VM
 */

import { Effect, Layer, pipe } from "effect"
import * as Atom from "@effect-atom/atom/Atom"
import { AtomRegistry } from "@effect-atom/atom/Registry"
import { WalletVM, WalletState, truncateAddress } from "./WalletVM"
import { WalletService } from "@/lib/blockchain/services/WalletService"

const WalletVMLayer = Layer.scoped(
  WalletVM,
  Effect.gen(function* () {
    const registry = yield* AtomRegistry
    const walletService = yield* WalletService

    // Create state atom
    const state$ = Atom.make<WalletState>(WalletState.Disconnected())

    // Derive isConnected from state
    const isConnected$ = pipe(
      state$,
      Atom.map(WalletState.$is("Connected"))
    )

    // Connect action
    const connect = () => {
      registry.set(state$, WalletState.Connecting())
      Effect.runPromise(
        walletService.connect.pipe(
          Effect.match({
            onFailure: () => registry.set(state$, WalletState.Disconnected()),
            onSuccess: (fullAddress) => registry.set(state$, WalletState.Connected({
              displayAddress: truncateAddress(fullAddress),
              fullAddress,
            }))
          })
        )
      )
    }

    // Disconnect action
    const disconnect = () => {
      Effect.runPromise(
        walletService.disconnect.pipe(
          Effect.tap(() => registry.set(state$, WalletState.Disconnected()))
        )
      )
    }


    // Copy address action
    const copyAddress = () => WalletState.$match(registry.get(state$), {
      Connected: ({ fullAddress }) => {
        navigator.clipboard.writeText(fullAddress)
      },
      Disconnected: () => { },
      Connecting: () => { }
    })

    return {
      state$,
      isConnected$,
      connect,
      disconnect,
      copyAddress,
    }
  })
)

export const WalletVMLive = {
  tag: WalletVM,
  layer: WalletVMLayer,
}
