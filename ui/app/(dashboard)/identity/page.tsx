"use client"

import * as React from "react"
import { useAtomValue, useAtomSet } from "@effect-atom/atom-react"
import * as Result from "@effect-atom/atom/Result"
import { Layer } from "effect"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useVM } from "@/lib/VMRuntime"
import { IdentityVM, IdentityState, IdentitySubmitState, type IdentityDisplay } from "@/lib/features/identity/IdentityVM"
import { IdentityVMLive } from "@/lib/features/identity/IdentityVMLive"
import { AllServicesViem } from "@/lib/blockchain/layers"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Spinner } from "@/components/ui/spinner"
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  CreditCard,
  DollarSign,
  PieChart,
  Clock,
  Mail,
  Shield,
  Pencil,
  UserCircle,
} from "lucide-react"

// Compose IdentityVMLive with viem dependencies
const IdentityVMComposed = {
  tag: IdentityVMLive.tag,
  layer: IdentityVMLive.layer.pipe(
    Layer.provide(AllServicesViem)
  )
}

const CREDIT_TIERS = [
  { value: "A", label: "Excellent (750+)" },
  { value: "B", label: "Good (700-749)" },
  { value: "C", label: "Fair (650-699)" },
  { value: "D", label: "Poor (< 650)" },
]

const INCOME_BRACKETS = [
  { value: "$0-25k", label: "$0 - $25,000" },
  { value: "$25k-50k", label: "$25,000 - $50,000" },
  { value: "$50k-75k", label: "$50,000 - $75,000" },
  { value: "$75k-100k", label: "$75,000 - $100,000" },
  { value: "$100k-150k", label: "$100,000 - $150,000" },
  { value: "$150k+", label: "$150,000+" },
]

const DEBT_RATIO_BRACKETS = [
  { value: "0-20%", label: "0-20% (Excellent)" },
  { value: "20-35%", label: "20-35% (Good)" },
  { value: "35-50%", label: "35-50% (Fair)" },
  { value: "50%+", label: "50%+ (High)" },
]

const identityFormSchema = z.object({
  email: z.email("Please enter a valid email address"),
  creditTier: z.enum(["A", "B", "C", "D"], "Please select a credit tier"),
  incomeBracket: z.string().min(1, "Please select an income bracket"),
  debtRatioBracket: z.string().min(1, "Please select a debt ratio"),
})

type IdentityFormValues = z.infer<typeof identityFormSchema>

async function hashEmail(email: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(email.toLowerCase().trim())
  const hash = await crypto.subtle.digest("SHA-256", data)
  const hashArray = Array.from(new Uint8Array(hash))
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
  return `0x${hashHex}`
}

// Reusable form component for both registration and update
interface IdentityFormProps {
  vm: IdentityVM
  mode: "register" | "update"
  defaultValues?: Partial<IdentityFormValues>
  onCancel?: () => void
}

function IdentityForm({ vm, mode, defaultValues, onCancel }: IdentityFormProps) {
  const setFormData = useAtomSet(vm.formData$)
  const submitState = useAtomValue(vm.submitState$)

  const form = useForm<IdentityFormValues>({
    resolver: zodResolver(identityFormSchema),
    defaultValues: {
      email: "",
      creditTier: undefined,
      incomeBracket: "",
      debtRatioBracket: "",
      ...defaultValues,
    },
  })

  const isSubmitting = IdentitySubmitState.$match(submitState, {
    Submitting: () => true,
    Idle: () => false,
    Success: () => false,
    Error: () => false,
  })

  const onSubmit = async (values: IdentityFormValues) => {
    const emailHash = await hashEmail(values.email)
    setFormData({
      emailHash,
      creditTier: values.creditTier,
      incomeBracket: values.incomeBracket,
      debtRatioBracket: values.debtRatioBracket,
    })
    if (mode === "register") {
      vm.register()
    } else {
      vm.update()
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {IdentitySubmitState.$match(submitState, {
          Idle: () => null,
          Submitting: () => null,
          Success: () => (
            <Alert className="bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertTitle>Success!</AlertTitle>
              <AlertDescription>
                Your identity has been {mode === "register" ? "registered" : "updated"} successfully.
              </AlertDescription>
            </Alert>
          ),
          Error: ({ message }: { message: string }) => (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          ),
        })}

        {/* Email Field */}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                Email Address
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="your.email@example.com"
                  type="email"
                  disabled={isSubmitting}
                  className="h-11"
                  {...field}
                />
              </FormControl>
              <FormDescription className="flex items-center gap-1.5">
                <Shield className="h-3 w-3" />
                Your email will be hashed (SHA-256) before being stored on-chain
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Financial Information Grid */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Financial Information
          </h3>

          <div className="grid gap-6 sm:grid-cols-3">
            <FormField
              control={form.control}
              name="creditTier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    Credit Tier
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CREDIT_TIERS.map((tier) => (
                        <SelectItem key={tier.value} value={tier.value}>
                          <span className="font-medium">{tier.value}</span>
                          <span className="text-muted-foreground ml-2">{tier.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="incomeBracket"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    Income Bracket
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {INCOME_BRACKETS.map((bracket) => (
                        <SelectItem key={bracket.value} value={bracket.value}>
                          {bracket.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="debtRatioBracket"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <PieChart className="h-4 w-4 text-muted-foreground" />
                    Debt Ratio
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {DEBT_RATIO_BRACKETS.map((bracket) => (
                        <SelectItem key={bracket.value} value={bracket.value}>
                          {bracket.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
              className="flex-1 sm:flex-none"
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            disabled={isSubmitting}
            className={onCancel ? "flex-1" : "w-full sm:w-auto"}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting
              ? (mode === "register" ? "Registering..." : "Updating...")
              : (mode === "register" ? "Register Identity" : "Save Changes")
            }
          </Button>
        </div>
      </form>
    </Form>
  )
}

// Stat card for identity display
function StatCard({
  icon: Icon,
  label,
  value,
  badge
}: {
  icon: React.ElementType
  label: string
  value: string
  badge?: string
}) {
  return (
    <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
      <div className="p-2 rounded-md bg-background">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-muted-foreground">{label}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-lg font-semibold truncate">{value}</p>
          {badge && <Badge variant="secondary">{badge}</Badge>}
        </div>
      </div>
    </div>
  )
}

// Identity display component
function RegisteredIdentity({ identity, vm }: { identity: IdentityDisplay; vm: IdentityVM }) {
  const [isEditing, setIsEditing] = React.useState(false)

  const handleCancel = () => {
    setIsEditing(false)
    vm.resetForm()
  }

  if (isEditing) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Edit Identity</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Update your identity information on the blockchain
            </p>
          </div>
        </div>
        <IdentityForm
          vm={vm}
          mode="update"
          defaultValues={{
            creditTier: identity.creditTier as "A" | "B" | "C" | "D",
            incomeBracket: identity.incomeBracket,
            debtRatioBracket: identity.debtRatioBracket,
          }}
          onCancel={handleCancel}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Identity Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-full bg-primary/10">
            <UserCircle className="h-8 w-8 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold">Your Identity</h2>
              <Badge variant="default" className="bg-green-600">Verified</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Registered on the blockchain
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
          <Pencil className="h-4 w-4 mr-2" />
          Edit
        </Button>
      </div>

      {/* Identity Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          icon={CreditCard}
          label="Credit Tier"
          value={identity.creditTierLabel}
          badge={`Tier ${identity.creditTier}`}
        />
        <StatCard
          icon={DollarSign}
          label="Income Bracket"
          value={identity.incomeBracket}
        />
        <StatCard
          icon={PieChart}
          label="Debt Ratio"
          value={identity.debtRatioBracket}
        />
        <StatCard
          icon={Clock}
          label="Last Updated"
          value={identity.lastUpdated}
        />
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-3 p-4 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30">
        <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-blue-900 dark:text-blue-100">Your data is secure</p>
          <p className="text-blue-700 dark:text-blue-300 mt-0.5">
            Your email is stored as a SHA-256 hash. Only you control who can access your identity information through consent management.
          </p>
        </div>
      </div>
    </div>
  )
}

// Not registered state
function NotRegistered({ vm }: { vm: IdentityVM }) {
  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center py-8 border-b">
        <div className="inline-flex items-center justify-center p-4 rounded-full bg-primary/10 mb-4">
          <UserCircle className="h-12 w-12 text-primary" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">Register Your Identity</h2>
        <p className="text-muted-foreground mt-2 max-w-md mx-auto">
          Create your on-chain identity to participate in the decentralized credit system. Your data is encrypted and you control access.
        </p>
      </div>

      {/* Registration Form */}
      <IdentityForm vm={vm} mode="register" />
    </div>
  )
}

// Main content component
function IdentityContent({ vm }: { vm: IdentityVM }) {
  const state = useAtomValue(vm.state$)

  return IdentityState.$match(state, {
    NotRegistered: () => <NotRegistered vm={vm} />,
    Loading: () => (
      <div className="flex flex-col items-center justify-center py-16">
        <Spinner />
        <p className="text-sm text-muted-foreground mt-4">Loading your identity...</p>
      </div>
    ),
    Registered: ({ identity }: { identity: IdentityDisplay }) => (
      <RegisteredIdentity identity={identity} vm={vm} />
    ),
    Error: ({ message }: { message: string }) => (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error Loading Identity</AlertTitle>
        <AlertDescription>{message}</AlertDescription>
      </Alert>
    ),
  })
}

export default function IdentityPage() {
  const vmResult = useVM(IdentityVM, IdentityVMComposed.layer)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Identity Management</h1>
        <p className="text-muted-foreground mt-2">
          Register and manage your digital identity on the blockchain
        </p>
      </div>

      <div>
        {Result.match(vmResult, {
          onInitial: () => (
            <div className="flex flex-col items-center justify-center py-16">
              <Spinner />
              <p className="text-sm text-muted-foreground mt-4">Initializing...</p>
            </div>
          ),
          onSuccess: ({ value }: { value: IdentityVM }) => <IdentityContent vm={value} />,
          onFailure: ({ cause }: { cause: unknown }) => (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Failed to Initialize</AlertTitle>
              <AlertDescription>{String(cause)}</AlertDescription>
            </Alert>
          ),
        })}
      </div>
    </div>
  )
}
