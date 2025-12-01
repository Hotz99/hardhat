import { Context, Data, Effect, Layer, Ref } from "effect"
import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  type PublicClient,
  type WalletClient,
} from "viem"
import { ContractConfig } from "./ContractConfig"

/**
 * Error thrown when attempting to access a wallet client that hasn't been set.
 *
 * @since 1.0.0
 * @category Errors
 */
export class WalletNotAvailableError extends Data.TaggedError(
  "WalletNotAvailableError"
)<{}> {}

/**
 * Service for managing viem PublicClient and WalletClient instances.
 *
 * The PublicClient is created immediately and used for read operations.
 * The WalletClient is optional and set when a wallet is connected.
 *
 * @since 1.0.0
 * @category Services
 */
export interface ViemClient {
  readonly publicClient: PublicClient
  readonly getWalletClient: Effect.Effect<
    WalletClient,
    WalletNotAvailableError
  >
  readonly setWalletClient: (
    client: WalletClient | null
  ) => Effect.Effect<void>
}

/**
 * @since 1.0.0
 * @category Tags
 */
export const ViemClient = Context.GenericTag<ViemClient>(
  "@blockchain/services/ViemClient"
)

/**
 * Live layer for ViemClient.
 *
 * Creates a PublicClient with http transport to localhost:8545 and manages
 * a WalletClient in a Ref for optional wallet operations.
 *
 * @since 1.0.0
 * @category Layers
 */
export const ViemClientLive = Layer.effect(
  ViemClient,
  Effect.gen(function* () {
    const config = yield* ContractConfig
    const walletClientRef = yield* Ref.make<WalletClient | null>(null)

    const publicClient = createPublicClient({
      chain: config.chain,
      transport: http("http://127.0.0.1:8545"),
    })

    return ViemClient.of({
      publicClient,
      getWalletClient: Ref.get(walletClientRef).pipe(
        Effect.flatMap((client) =>
          client === null
            ? Effect.fail(new WalletNotAvailableError())
            : Effect.succeed(client)
        )
      ),
      setWalletClient: (client) => Ref.set(walletClientRef, client),
    })
  })
)
