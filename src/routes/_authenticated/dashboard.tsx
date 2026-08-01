import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getMyAccount, getMyUsage } from "@/lib/account.functions";
import { getMyListings, submitListing, deleteMyListing } from "@/lib/listings.functions";
import { listApiKeys, createApiKey, revokeApiKey } from "@/lib/api-keys.functions";
import { listPlans, createCheckoutSession, createBillingPortalSession } from "@/lib/billing.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, KeyRound, LogOut, Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — rancod.ai provider console" },
      {
        name: "description",
        content: "Manage your hosted AI submissions, API keys, token usage and rancod.ai subscription plan.",
      },
      { property: "og:title", content: "rancod.ai dashboard" },
      { property: "og:description", content: "Your AI submissions, API keys, token usage and billing in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

const nf = new Intl.NumberFormat("en-US");

function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const account = useQuery({ queryKey: ["account"], queryFn: useServerFn(getMyAccount) });
  const usage = useQuery({ queryKey: ["usage"], queryFn: useServerFn(getMyUsage) });
  const listings = useQuery({ queryKey: ["listings"], queryFn: useServerFn(getMyListings) });
  const keys = useQuery({ queryKey: ["api-keys"], queryFn: useServerFn(listApiKeys) });
  const plans = useQuery({ queryKey: ["plans"], queryFn: useServerFn(listPlans) });

  const [freshKey, setFreshKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    tagline: "",
    endpoint_url: "",
    model_name: "",
    auth_header: "",
    price: "0",
  });

  const invalidate = (key: string) => queryClient.invalidateQueries({ queryKey: [key] });
  const fail = (e: unknown) => setError(e instanceof Error ? e.message : "Something went wrong");

  const createKeyFn = useServerFn(createApiKey);
  const revokeKeyFn = useServerFn(revokeApiKey);
  const submitFn = useServerFn(submitListing);
  const deleteFn = useServerFn(deleteMyListing);
  const checkoutFn = useServerFn(createCheckoutSession);
  const portalFn = useServerFn(createBillingPortalSession);

  const newKey = useMutation({
    mutationFn: () => createKeyFn({ data: { name: "Dashboard key" } }),
    onSuccess: (res) => {
      setFreshKey(res.key);
      invalidate("api-keys");
    },
    onError: fail,
  });

  const submit = useMutation({
    mutationFn: () =>
      submitFn({
        data: {
          name: form.name,
          tagline: form.tagline || undefined,
          endpoint_url: form.endpoint_url,
          model_name: form.model_name || undefined,
          auth_header: form.auth_header || undefined,
          price_per_million_tokens_cents: Math.round(Number(form.price || 0) * 100),
          is_public: true,
        },
      }),
    onSuccess: () => {
      setForm({ name: "", tagline: "", endpoint_url: "", model_name: "", auth_header: "", price: "0" });
      invalidate("listings");
    },
    onError: fail,
  });

  const upgrade = useMutation({
    mutationFn: (planCode: "pro" | "max") =>
      checkoutFn({ data: { planCode, origin: window.location.origin } }),
    onSuccess: (res) => {
      window.location.href = res.url;
    },
    onError: fail,
  });

  const portal = useMutation({
    mutationFn: () => portalFn({ data: { origin: window.location.origin } }),
    onSuccess: (res) => {
      window.location.href = res.url;
    },
    onError: fail,
  });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const plan = account.data?.subscription?.plan;
  const allowance = plan?.monthly_token_allowance ?? 0;
  const used = account.data?.usage?.[0]?.tokens_used ?? 0;
  const pct = allowance ? Math.min(100, (Number(used) / Number(allowance)) * 100) : 0;

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border/70">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link to="/" className="font-display text-lg font-semibold">
            rancod<span className="text-primary">.ai</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {account.data?.profile?.display_name ?? account.data?.profile?.email}
            </span>
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="mr-2 size-4" /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-8 px-6 py-10">
        {error && (
          <p className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        )}

        {/* plan + usage */}
        <section className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="font-display">Token usage this month</CardTitle>
              <CardDescription>
                {nf.format(Number(used))} of {nf.format(Number(allowance))} tokens on the{" "}
                {plan?.name ?? "Free"} plan
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress value={pct} />
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Requests</p>
                  <p className="font-display text-xl">{nf.format(account.data?.usage?.[0]?.requests ?? 0)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Spend</p>
                  <p className="font-display text-xl">
                    ${((Number(account.data?.usage?.[0]?.cost_cents ?? 0)) / 100).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <p className="font-display text-xl capitalize">
                    {account.data?.subscription?.status ?? "active"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-display">Plan</CardTitle>
              <CardDescription>Upgrade for more monthly tokens.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {(plans.data ?? []).map((p) => (
                <div key={p.code} className="flex items-center justify-between gap-2 rounded-lg border p-3">
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      ${(p.price_cents / 100).toFixed(0)}/mo · {nf.format(Number(p.monthly_token_allowance))} tokens
                    </p>
                  </div>
                  {p.code === (plan?.code ?? "free") ? (
                    <Badge variant="secondary">Current</Badge>
                  ) : p.code !== "free" ? (
                    <Button
                      size="sm"
                      onClick={() => upgrade.mutate(p.code as "pro" | "max")}
                      disabled={upgrade.isPending}
                    >
                      Upgrade
                    </Button>
                  ) : null}
                </div>
              ))}
              <Button variant="outline" size="sm" className="w-full" onClick={() => portal.mutate()}>
                Manage billing
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* API keys */}
        <section>
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="font-display">API keys</CardTitle>
                <CardDescription>Call any approved AI at POST /api/public/v1/chat</CardDescription>
              </div>
              <Button size="sm" onClick={() => newKey.mutate()} disabled={newKey.isPending}>
                <KeyRound className="mr-2 size-4" /> New key
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {freshKey && (
                <div className="flex items-center justify-between gap-3 rounded-md border border-primary/40 bg-primary/5 p-3">
                  <code className="truncate text-sm">{freshKey}</code>
                  <Button size="sm" variant="ghost" onClick={() => navigator.clipboard.writeText(freshKey)}>
                    <Copy className="size-4" />
                  </Button>
                </div>
              )}
              {(keys.data ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">No keys yet — create one to start calling the API.</p>
              )}
              {(keys.data ?? []).map((k) => (
                <div key={k.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                  <div>
                    <p className="font-medium">{k.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {k.key_prefix}··· {k.revoked_at ? "· revoked" : ""}
                    </p>
                  </div>
                  {!k.revoked_at && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => revokeKeyFn({ data: { id: k.id } }).then(() => invalidate("api-keys"))}
                    >
                      Revoke
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        {/* submissions */}
        <section className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="font-display">Submit your AI</CardTitle>
              <CardDescription>
                Expose your locally hosted model to the network. Submissions are reviewed before going live.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  setError(null);
                  submit.mutate();
                }}
              >
                <div className="space-y-2">
                  <Label htmlFor="ai-name">Name</Label>
                  <Input
                    id="ai-name"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Llama 3 70B — Frankfurt rig"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ai-tagline">Tagline</Label>
                  <Textarea
                    id="ai-tagline"
                    rows={2}
                    value={form.tagline}
                    onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                    placeholder="Low-latency inference on dual 4090s"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ai-endpoint">OpenAI-compatible endpoint URL</Label>
                  <Input
                    id="ai-endpoint"
                    type="url"
                    required
                    value={form.endpoint_url}
                    onChange={(e) => setForm({ ...form, endpoint_url: e.target.value })}
                    placeholder="https://my-rig.example.com/v1/chat/completions"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="ai-model">Model id</Label>
                    <Input
                      id="ai-model"
                      value={form.model_name}
                      onChange={(e) => setForm({ ...form, model_name: e.target.value })}
                      placeholder="llama3:70b"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ai-price">Price / 1M tokens (USD)</Label>
                    <Input
                      id="ai-price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ai-auth">Endpoint auth header (encrypted)</Label>
                  <Input
                    id="ai-auth"
                    value={form.auth_header}
                    onChange={(e) => setForm({ ...form, auth_header: e.target.value })}
                    placeholder="Bearer sk-local-..."
                  />
                </div>
                <Button type="submit" className="w-full" disabled={submit.isPending}>
                  <Plus className="mr-2 size-4" /> Submit for review
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-display">Your AI submissions</CardTitle>
              <CardDescription>Approved models are callable by their slug.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {(listings.data ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">Nothing submitted yet.</p>
              )}
              {(listings.data ?? []).map((l) => (
                <div key={l.id} className="flex items-start justify-between gap-3 rounded-md border p-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{l.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{l.slug}</p>
                    {l.review_notes && <p className="mt-1 text-xs text-destructive">{l.review_notes}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={l.status === "approved" ? "default" : "secondary"}>{l.status}</Badge>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteFn({ data: { id: l.id } }).then(() => invalidate("listings"))}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        {/* recent calls */}
        <section>
          <Card>
            <CardHeader>
              <CardTitle className="font-display">Recent API calls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(usage.data ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">No requests recorded yet.</p>
              )}
              {(usage.data ?? []).slice(0, 10).map((row) => (
                <div key={row.id} className="flex items-center justify-between border-b py-2 text-sm last:border-0">
                  <span className="truncate">{row.listing?.name ?? "Unknown model"}</span>
                  <span className="text-muted-foreground">
                    {nf.format(row.total_tokens)} tokens · {row.latency_ms ?? 0} ms
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
