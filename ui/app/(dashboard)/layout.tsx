"use client"

import * as React from "react"
import { Layer } from "effect"
import { useVM } from "@/lib/VMRuntime"
import { WalletVMLive } from "@/lib/features/wallet/WalletVMLive"
import { WalletServiceViem } from "@/lib/blockchain/layers"
import * as Result from "@effect-atom/atom/Result"
import { AppSidebar } from "@/components/app-sidebar"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"

// Compose the WalletVM layer with its dependencies
const WalletVMComposed = {
  tag: WalletVMLive.tag,
  layer: WalletVMLive.layer.pipe(Layer.provide(WalletServiceViem))
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const walletResult = useVM(WalletVMComposed.tag, WalletVMComposed.layer)

  return (
    <SidebarProvider>
      {Result.match(walletResult, {
        onInitial: () => (
          <div className="flex h-screen items-center justify-center">
            <p className="text-muted-foreground">Initializing...</p>
          </div>
        ),
        onSuccess: (result) => (
          <>
            <AppSidebar walletVM={result.value} />
            <SidebarInset>
              <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
                <SidebarTrigger className="-ml-1" />
                <Separator
                  orientation="vertical"
                  className="mr-2 data-[orientation=vertical]:h-4"
                />
              </header>
              <main className="flex flex-1 flex-col gap-4 p-4">
                {children}
              </main>
            </SidebarInset>
          </>
        ),
        onFailure: (error) => (
          <div className="flex h-screen items-center justify-center">
            <p className="text-destructive">
              Failed to initialize: {String(error)}
            </p>
          </div>
        ),
      })}
    </SidebarProvider>
  )
}
