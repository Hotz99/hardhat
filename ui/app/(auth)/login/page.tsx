"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Wallet } from "lucide-react"
import { useAtomValue } from "@effect-atom/atom-react"
import * as Result from "@effect-atom/atom/Result"
import { Layer, pipe } from "effect"

import { useVM } from "@/lib/VMRuntime"
import { WalletVMLive } from "@/lib/features/wallet/WalletVMLive"
import { WalletState } from "@/lib/features/wallet/WalletVM"
import type { WalletVM } from "@/lib/features/wallet/WalletVM"
import { WalletServiceViem } from "@/lib/blockchain/layers"

import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
} from "@/components/ui/field"

export default function LoginPage() {
  const walletResult = useVM(
    WalletVMLive.tag,
    WalletVMLive.layer.pipe(Layer.provide(WalletServiceViem))
  )

  return Result.match(walletResult, {
    onInitial: () => <LoadingState />,
    onSuccess: (result) => <WalletConnect vm={result.value} />,
    onFailure: (cause: unknown) => <ErrorState cause={cause} />,
  })
}

function LoadingState() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex size-8 items-center justify-center rounded-md">
          <Wallet className="size-6 animate-pulse" />
        </div>
        <h1 className="text-xl font-bold">Loading Wallet...</h1>
      </div>
    </div>
  )
}

function ErrorState({ cause }: { cause: unknown }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex size-8 items-center justify-center rounded-md">
          <Wallet className="size-6 text-destructive" />
        </div>
        <h1 className="text-xl font-bold">Wallet Error</h1>
        <FieldDescription className="text-destructive">
          {String(cause)}
        </FieldDescription>
      </div>
    </div>
  )
}

function WalletConnect({ vm }: { vm: WalletVM }) {
  const router = useRouter()
  const state = useAtomValue(vm.state$)

  React.useEffect(() => {
    if (WalletState.$is("Connected")(state)) {
      router.push("/dashboard")
    }
  }, [state, router])

  return (
    <div className="flex flex-col gap-6">
      <FieldGroup>
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex size-8 items-center justify-center rounded-md">
            <Wallet className="size-6" />
          </div>
          <h1 className="text-xl font-bold">Connect Your Wallet</h1>
          <FieldDescription>
            Connect your Web3 wallet to access the application
          </FieldDescription>
        </div>

        {pipe(
          state,
          WalletState.$match({
            Disconnected: () => (
              <Field>
                <Button type="button" onClick={vm.connect} className="w-full">
                  <Wallet />
                  Connect Wallet
                </Button>
              </Field>
            ),
            Connecting: () => (
              <Field>
                <Button type="button" disabled className="w-full">
                  <Wallet className="animate-pulse" />
                  Connecting...
                </Button>
              </Field>
            ),
            Connected: ({ displayAddress }) => (
              <Field>
                <Button type="button" disabled className="w-full">
                  <Wallet />
                  Connected: {displayAddress}
                </Button>
              </Field>
            ),
          })
        )}
      </FieldGroup>

      <FieldDescription className="px-6 text-center">
        By connecting your wallet, you agree to our{" "}
        <a href="#" className="underline">Terms of Service</a> and{" "}
        <a href="#" className="underline">Privacy Policy</a>.
      </FieldDescription>
    </div>
  )
}
