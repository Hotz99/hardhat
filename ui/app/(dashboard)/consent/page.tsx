"use client"

import * as React from "react"
import { useVM } from "@/lib/VMRuntime"
import type { ConsentVM } from "@/lib/features/consent/ConsentVM"
import { ConsentVMLive } from "@/lib/features/consent/ConsentVMLive"
import { ConsentSubmitState } from "@/lib/features/consent/ConsentVM"
import type { ConsentItemVM } from "@/lib/features/consent/ConsentItemVM"
import { ConsentStatus } from "@/lib/features/consent/ConsentItemVM"
import { useAtomValue, useAtomSet } from "@effect-atom/atom-react"
import { Layer } from "effect"
import { AllServicesViem } from "@/lib/blockchain/layers"
import * as Loadable from "@/lib/Loadable"
import * as Result from "@effect-atom/atom/Result"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form"

// Compose ConsentVM layer with viem services - defined outside component as layers are stable
const ConsentVMComposed = {
  tag: ConsentVMLive.tag,
  layer: ConsentVMLive.layer.pipe(
    Layer.provide(AllServicesViem)
  )
}

export default function ConsentPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Consent Management</h1>
        <p className="text-muted-foreground">Grant and manage data sharing consents</p>
      </div>
      <ConsentContent />
    </div>
  )
}

function ConsentContent() {
  const vmResult = useVM(ConsentVMComposed.tag, ConsentVMComposed.layer)

  return Result.match(vmResult, {
    onInitial: () => (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-muted-foreground text-sm">Loading consent manager...</p>
        </div>
      </div>
    ),
    onFailure: ({ cause }) => (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-destructive text-sm font-medium">Failed to load consent manager</p>
          <p className="text-muted-foreground text-xs mt-1">{String(cause)}</p>
        </div>
      </div>
    ),
    onSuccess: ({ value }) => <ConsentView vm={value} />,
  })
}

function ConsentView({ vm }: { vm: ConsentVM }) {
  const consents = useAtomValue(vm.consents$)
  const activeCount = useAtomValue(vm.activeCount$)
  const expiredCount = useAtomValue(vm.expiredCount$)

  return (
    <>
      <StatsCards active={activeCount} expired={expiredCount} />
      <div className="grid gap-6 md:grid-cols-2">
        <GrantConsentForm vm={vm} />
        <ConsentList consents={consents} />
      </div>
    </>
  )
}

function StatsCards({ active, expired }: { active: number; expired: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Active Consents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{active}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Expired/Revoked
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{expired}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{active + expired}</div>
        </CardContent>
      </Card>
    </div>
  )
}

interface ConsentFormData {
  lenderAddress: string
  scopes: Record<string, boolean>
  durationDays: number
}

function GrantConsentForm({ vm }: { vm: ConsentVM }) {
  const formData = useAtomValue(vm.formData$)
  const setFormData = useAtomSet(vm.formData$)
  const isFormValid = useAtomValue(vm.isFormValid$)
  const submitState = useAtomValue(vm.submitState$)

  const form = useForm<ConsentFormData>({
    defaultValues: {
      lenderAddress: formData.lenderAddress,
      scopes: formData.scopes.reduce((acc, scope) => {
        acc[scope.key] = scope.selected
        return acc
      }, {} as Record<string, boolean>),
      durationDays: formData.durationDays,
    },
  })

  React.useEffect(() => {
    form.reset({
      lenderAddress: formData.lenderAddress,
      scopes: formData.scopes.reduce((acc, scope) => {
        acc[scope.key] = scope.selected
        return acc
      }, {} as Record<string, boolean>),
      durationDays: formData.durationDays,
    })
  }, [formData, form])

  const handleSubmit = form.handleSubmit(() => {
    vm.grantConsent()
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Grant New Consent</CardTitle>
        <CardDescription>
          Allow a lender to access specific data for a limited time
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="lenderAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lender Address</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="0x..."
                      {...field}
                      value={formData.lenderAddress}
                      onChange={(e) => {
                        field.onChange(e)
                        setFormData({
                          ...formData,
                          lenderAddress: e.target.value,
                        })
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <FormLabel>Data Scopes</FormLabel>
              {formData.scopes.map((scope) => (
                <div key={scope.key} className="flex items-center space-x-2">
                  <Checkbox
                    id={scope.key}
                    checked={scope.selected}
                    onCheckedChange={() => vm.toggleScope(scope.key)}
                  />
                  <label
                    htmlFor={scope.key}
                    className="text-sm font-normal cursor-pointer leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {scope.label}
                  </label>
                </div>
              ))}
            </div>

            <FormField
              control={form.control}
              name="durationDays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duration (days)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      max="365"
                      {...field}
                      value={formData.durationDays}
                      onChange={(e) => {
                        const value = parseInt(e.target.value, 10) || 30
                        field.onChange(value)
                        setFormData({
                          ...formData,
                          durationDays: value,
                        })
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {ConsentSubmitState.$match(submitState, {
              Idle: () => null,
              Submitting: () => (
                <div className="text-sm text-muted-foreground">Submitting...</div>
              ),
              Success: ({ consentId }) => (
                <div className="text-sm text-green-600">
                  Consent granted! ID: {consentId.slice(0, 8)}...
                </div>
              ),
              Error: ({ message }) => (
                <div className="text-sm text-destructive">Error: {message}</div>
              ),
            })}

            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={!isFormValid || ConsentSubmitState.$is("Submitting")(submitState)}
              >
                Grant Consent
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  vm.resetForm()
                  form.reset()
                }}
              >
                Reset
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

function ConsentList({ consents }: { consents: Loadable.Loadable<readonly ConsentItemVM[]> }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Consents</CardTitle>
        <CardDescription>
          Manage existing data access permissions
        </CardDescription>
      </CardHeader>
      <CardContent>
        {Loadable.match(consents, {
          onPending: () => (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ),
          onReady: (items) =>
            items.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No consents found. Grant your first consent above.
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item) => (
                  <ConsentItem key={item.key} item={item} />
                ))}
              </div>
            ),
        })}
      </CardContent>
    </Card>
  )
}

function ConsentItem({ item }: { item: ConsentItemVM }) {
  const status = useAtomValue(item.status$)
  const scopeLabels = useAtomValue(item.scopeLabels$)
  const expiresAt = useAtomValue(item.expiresAt$)
  const canRevoke = useAtomValue(item.canRevoke$)

  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b last:border-0">
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-sm font-medium">{item.lenderDisplay}</span>
          {ConsentStatus.$match(status, {
            Active: () => <Badge variant="default">Active</Badge>,
            Expired: () => <Badge variant="secondary">Expired</Badge>,
            Revoked: () => <Badge variant="destructive">Revoked</Badge>,
          })}
        </div>
        <div className="text-xs text-muted-foreground">
          Expires: {expiresAt}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {scopeLabels.map((label) => (
            <Badge key={label} variant="outline" className="text-xs">
              {label}
            </Badge>
          ))}
        </div>
      </div>
      {canRevoke && (
        <Button
          size="sm"
          variant="destructive"
          onClick={() => item.revoke()}
        >
          Revoke
        </Button>
      )}
    </div>
  )
}
