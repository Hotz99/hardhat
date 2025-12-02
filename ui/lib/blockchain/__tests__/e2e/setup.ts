/**
 * E2E test setup using @effect/platform
 *
 * Spawns Hardhat node and deploys contracts before tests
 */

import { Effect, Exit, Option, Schedule, Scope, pipe } from "effect"
import { Command, CommandExecutor } from "@effect/platform"
import { BunContext } from "@effect/platform-bun"
import { createPublicClient, createWalletClient, http, type Hex } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { hardhat } from "viem/chains"

const HARDHAT_URL = "http://127.0.0.1:8545"

// Contract addresses from local deployment
const AUDIT_LOG_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
const CREDIT_REGISTRY_ADDRESS = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"
const HARDHAT_DEPLOYER_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as Hex
const PROJECT_ROOT = new URL("../../../../../", import.meta.url).pathname


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
  const hardhatProcess = yield* executor.start(command)
  yield* Effect.addFinalizer(() => hardhatProcess.kill("SIGTERM").pipe(Effect.ignoreLogged))

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

/**
 * Set up contract links: AuditLog <-> CreditRegistry
 * This needs to be done with the deployer account (Hardhat #0)
 */
const setupAuditLogLink = Effect.tryPromise({
  try: async () => {
    const deployerAccount = privateKeyToAccount(HARDHAT_DEPLOYER_KEY)
    const deployerClient = createWalletClient({
      account: deployerAccount,
      chain: hardhat,
      transport: http(HARDHAT_URL),
    })

    const publicClient = createPublicClient({
      chain: hardhat,
      transport: http(HARDHAT_URL),
    })

    const { AuditLogAbi, CreditRegistryAbi } = await import("../../contracts/abis")

    // 1. Authorize CreditRegistry as a logger in AuditLog
    const authHash = await deployerClient.writeContract({
      address: AUDIT_LOG_ADDRESS as Hex,
      abi: AuditLogAbi,
      functionName: "authorizeLogger",
      args: [CREDIT_REGISTRY_ADDRESS as Hex],
    })
    await publicClient.waitForTransactionReceipt({ hash: authHash })

    // 2. Set AuditLog address in CreditRegistry
    const setHash = await deployerClient.writeContract({
      address: CREDIT_REGISTRY_ADDRESS as Hex,
      abi: CreditRegistryAbi,
      functionName: "setAuditLog",
      args: [AUDIT_LOG_ADDRESS as Hex],
    })
    await publicClient.waitForTransactionReceipt({ hash: setHash })

    console.log("AuditLog <-> CreditRegistry link established")
  },
  catch: (error) => new Error(`Failed to setup audit log link: ${error}`),
})


const testScope = Scope.make().pipe(Effect.runSync)
const setupProgram = pipe(
  startHardhatNode,
  Effect.flatMap(() => deployContracts),
  Effect.flatMap(() => setupAuditLogLink),
  Effect.provide(BunContext.layer),
  Scope.extend(testScope)
)

const teardownProgram = pipe(
  Effect.gen(function* () {
    yield* Effect.log("Stopping Hardhat node...")
    yield* Scope.close(testScope, Exit.void)
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
