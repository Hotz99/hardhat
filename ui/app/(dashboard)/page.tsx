"use client"

import * as React from "react"
import Link from "next/link"
import { Layer } from "effect"
import { useVM } from "@/lib/VMRuntime"
import { WalletVMLive } from "@/lib/features/wallet/WalletVMLive"
import { WalletServiceViem } from "@/lib/blockchain/layers"
import * as Result from "@effect-atom/atom/Result"
import { useAtomValue } from "@effect-atom/atom-react"
import type { WalletVM } from "@/lib/features/wallet/WalletVM"
import { WalletState } from "@/lib/features/wallet/WalletVM"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  UserCircle,
  ShieldCheck,
  FileText,
  ArrowRight,
} from "lucide-react"

const features = [
  {
    title: "Identity Management",
    description: "Register and manage your blockchain identity",
    icon: UserCircle,
    href: "/identity",
    badge: "Core",
  },
  {
    title: "Consent Management",
    description: "Control who can access your identity data",
    icon: ShieldCheck,
    href: "/consent",
    badge: "Privacy",
  },
  {
    title: "Audit Logs",
    description: "Track all access events for your identity",
    icon: FileText,
    href: "/audit",
    badge: "Security",
  },
]

function FeatureItem({
  title,
  description,
  icon: Icon,
  href,
  badge,
}: {
  title: string
  description: string
  icon: React.ElementType
  href: string
  badge: string
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col h-full p-6 rounded-lg border border-border bg-card hover:bg-accent/50 hover:border-accent-foreground/20 hover:shadow-md transition-all"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="p-3 rounded-lg bg-muted group-hover:bg-muted/70 transition-colors">
          <Icon className="size-6 text-foreground" />
        </div>
        <Badge variant="secondary">{badge}</Badge>
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground flex-1">{description}</p>
      <div className="flex items-center gap-2 mt-4 text-sm font-medium text-primary">
        <span>Get Started</span>
        <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
      </div>
    </Link>
  )
}

interface WelcomeSectionContentProps {
  walletVM: WalletVM
}

function WelcomeSectionContent({ walletVM }: WelcomeSectionContentProps) {
  const state = useAtomValue(walletVM.state$)

  return WalletState.$match(state, {
    Disconnected: () => (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="flex items-center justify-center size-20 rounded-full bg-muted mb-6">
          <ShieldCheck className="size-10 text-muted-foreground" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight mb-3">
          Connect Your Wallet
        </h1>
        <p className="text-muted-foreground text-center max-w-md mb-8">
          Connect your wallet to access identity management features and start managing your blockchain identity
        </p>
        <Button onClick={walletVM.connect} size="lg">
          Connect Wallet
        </Button>
      </div>
    ),
    Connecting: () => (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="flex items-center justify-center size-20 rounded-full bg-muted mb-6 animate-pulse">
          <ShieldCheck className="size-10 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground">Connecting your wallet...</p>
      </div>
    ),
    Connected: ({ displayAddress }) => (
      <div className="py-12 px-6 border-l-4 border-primary bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="default">Connected</Badge>
          <span className="text-xs text-muted-foreground font-mono">{displayAddress}</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight mb-3">
          Welcome to Identity DApp
        </h1>
        <p className="text-muted-foreground max-w-2xl">
          Manage your blockchain identity, control data access, and track all activity. Your identity is secured on-chain and you have full control over who can access your information.
        </p>
      </div>
    ),
  })
}

const WalletVMComposed = {
  tag: WalletVMLive.tag,
  layer: WalletVMLive.layer.pipe(Layer.provide(WalletServiceViem))
}

function WelcomeSection(): React.ReactElement | null {
  const walletResult = useVM(WalletVMComposed.tag, WalletVMComposed.layer)

  return Result.match(walletResult, {
    onInitial: () => null,
    onSuccess: ({ value }: { value: WalletVM }) => <WelcomeSectionContent walletVM={value} />,
    onFailure: () => (
      <div className="flex flex-col items-center justify-center py-16 px-4 border border-destructive/50 rounded-lg">
        <p className="text-destructive font-medium">Failed to load wallet connection</p>
        <p className="text-sm text-muted-foreground mt-2">Please refresh the page to try again</p>
      </div>
    ),
  })
}

export default function DashboardPage() {
  return (
    <div className="space-y-12">
      <WelcomeSection />

      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">Features</h2>
          <p className="text-muted-foreground">
            Explore the available features of your identity management system
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <FeatureItem key={feature.href} {...feature} />
          ))}
        </div>
      </div>
    </div>
  )
}
