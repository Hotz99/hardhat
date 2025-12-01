"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Home,
  UserCircle,
  ShieldCheck,
  FileText,
  Wallet
} from "lucide-react"
import { useAtomValue } from "@effect-atom/atom-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { WalletState, type WalletVM as WalletVMType } from "@/lib/features/wallet/WalletVM"

const navItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: Home,
  },
  {
    title: "Identity",
    url: "/identity",
    icon: UserCircle,
  },
  {
    title: "Consent",
    url: "/consent",
    icon: ShieldCheck,
  },
  {
    title: "Audit Logs",
    url: "/audit",
    icon: FileText,
  },
]

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  walletVM: WalletVMType
}

export function AppSidebar({ walletVM, ...props }: AppSidebarProps) {
  const pathname = usePathname()
  const walletState = useAtomValue(walletVM.state$)

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <ShieldCheck className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">Identity DApp</span>
                  <span className="text-xs">Blockchain Identity</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={pathname === item.url}>
                    <Link href={item.url}>
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        {WalletState.$match(walletState, {
              Connected: ({ displayAddress }) => (
                <div className="flex flex-col gap-2 p-2">
                  <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
                    <Wallet className="size-4 text-green-600" />
                    <div className="flex flex-col">
                      <span className="text-xs font-medium">Connected</span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {displayAddress}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={walletVM.disconnect}
                    className="w-full"
                  >
                    Disconnect
                  </Button>
                </div>
              ),
              Connecting: () => (
                <Button disabled className="w-full">
                  <Wallet className="mr-2 size-4" />
                  Connecting...
                </Button>
              ),
          Disconnected: () => (
            <Button onClick={walletVM.connect} className="w-full">
              <Wallet className="mr-2 size-4" />
              Connect Wallet
            </Button>
          ),
        })}
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
