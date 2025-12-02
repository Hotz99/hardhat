/**
 * E2E test setup using @effect/platform
 *
 * Spawns Hardhat node and deploys contracts before tests
 */

import { Effect, Exit, Option, Schedule, Scope, pipe } from "effect"
import { Command, CommandExecutor } from "@effect/platform"
import { BunContext } from "@effect/platform-bun"
import { createPublicClient, http } from "viem"
import { hardhat } from "viem/chains"

const HARDHAT_URL = "http://127.0.0.1:8545"
const PROJECT_ROOT = new URL("../../../../../", import.meta.url).pathname

// Store process handle for cleanup
let hardhatProcess: Option.Option<CommandExecutor.Process> = Option.none()

const checkHardhatReady = Effect.tryPromise({
  try: async () => {
    const client = createPublicClient({
      chain: hardhat,
      transport: http(HARDHAT_URL),
    })
    await client.getChainId()
    return true
  },
  catch: () => new Error("Hardhat not ready"),
})

const waitForHardhat = pipe(
  checkHardhatReady,
  Effect.retry(
    Schedule.recurs(30).pipe(Schedule.addDelay(() => "500 millis"))
  ),
  Effect.timeout("30 seconds"),
  Effect.catchAll(() => Effect.fail(new Error("Hardhat failed to start")))
)

const isHardhatRunning = pipe(
  checkHardhatReady,
  Effect.map(() => true),
  Effect.catchAll(() => Effect.succeed(false))
)

const startHardhatNode = Effect.gen(function* () {
  const alreadyRunning = yield* isHardhatRunning
  if (alreadyRunning) {
    yield* Effect.log("Hardhat node already running, using existing instance")
    return
  }

  yield* Effect.log("Starting Hardhat node...")

  const executor = yield* CommandExecutor.CommandExecutor

  const command = pipe(
    Command.make("bunx", "hardhat", "node"),
    Command.workingDirectory(PROJECT_ROOT),
    Command.stdout("inherit"),
    Command.stderr("inherit")
  )

  // Start hardhat in background and keep process handle
  hardhatProcess = yield* executor.start(command).pipe(Effect.map(Option.some))

  yield* waitForHardhat
  yield* Effect.log("Hardhat node ready")
})

const deployModule = (modulePath: string) =>
  Effect.gen(function* () {
    yield* Effect.log(`Deploying ${modulePath}...`)

    const command = Command.make(
      "bunx",
      "hardhat",
      "ignition",
      "deploy",
      modulePath,
      "--network",
      "localhost"
    ).pipe(Command.workingDirectory(PROJECT_ROOT))

    const result = yield* Command.string(command)

    // Check for deployment success indicators
    if (result.includes("Error") && !result.includes("already deployed")) {
      yield* Effect.fail(new Error(`Deploy failed: ${result}`))
    }
  })

const deployContracts = Effect.gen(function* () {
  const modules = [
    "ignition/modules/ConsentManager.ts",
    "ignition/modules/AuditLog.ts",
    "ignition/modules/CreditRegistry.ts",
  ]

  yield* Effect.forEach(modules, deployModule)

  yield* Effect.log("All contracts deployed")
})


const testScope = Scope.make().pipe(Effect.runSync)
const setupProgram = pipe(
  startHardhatNode,
  Effect.flatMap(() => deployContracts),
  Effect.provide(BunContext.layer),
  Scope.extend(testScope)
)

const teardownProgram = pipe(
  Effect.gen(function* () {
    if (Option.isSome(hardhatProcess)) {
      yield* Effect.log("Stopping Hardhat node...")
      yield* hardhatProcess.value.kill("SIGTERM")
      hardhatProcess = Option.none()
      yield* Scope.close(testScope, Exit.void)
    }
  }),
  Effect.provide(BunContext.layer),
)

// Vitest globalSetup exports
export async function setup() {
  await Effect.runPromise(setupProgram)
}

export async function teardown() {
  await Effect.runPromise(teardownProgram)
}
