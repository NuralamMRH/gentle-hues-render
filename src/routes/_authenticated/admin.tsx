import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  getAdminStats,
  listAllUsers,
  adminCreateUser,
  adminSetRole,
  adminSetPlan,
  adminDeleteUser,
} from "@/lib/admin.functions";
import { listSubmissionsForReview, reviewListing } from "@/lib/listings.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, Trash2, UserPlus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin panel — rancod.ai platform control" },
      {
        name: "description",
        content: "Manage rancod.ai accounts, roles, subscription plans and review provider AI submissions.",
      },
      { property: "og:title", content: "rancod.ai admin panel" },
      { property: "og:description", content: "Accounts, roles, plans and AI submission review for rancod.ai." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminPanel,
});

const nf = new Intl.NumberFormat("en-US");
const ROLES = ["admin", "moderator", "provider", "user"] as const;

function AdminPanel() {
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const fail = (e: unknown) => setError(e instanceof Error ? e.message : "Something went wrong");

  const stats = useQuery({ queryKey: ["admin-stats"], queryFn: useServerFn(getAdminStats), retry: false });
  const users = useQuery({ queryKey: ["admin-users"], queryFn: useServerFn(listAllUsers), retry: false });
  const subs = useQuery({ queryKey: ["admin-subs"], queryFn: useServerFn(listSubmissionsForReview), retry: false });

  const createFn = useServerFn(adminCreateUser);
  const roleFn = useServerFn(adminSetRole);
  const planFn = useServerFn(adminSetPlan);
  const deleteFn = useServerFn(adminDeleteUser);
  const reviewFn = useServerFn(reviewListing);

  const refreshUsers = () => {
    void qc.invalidateQueries({ queryKey: ["admin-users"] });
    void qc.invalidateQueries({ queryKey: ["admin-stats"] });
  };

  const [form, setForm] = useState({
    email: "",
    password: "",
    display_name: "",
    role: "user" as (typeof ROLES)[number],
    plan_code: "free" as "free" | "pro" | "max",
  });

  const createUser = useMutation({
    mutationFn: () => createFn({ data: form }),
    onSuccess: () => {
      setForm({ email: "", password: "", display_name: "", role: "user", plan_code: "free" });
      refreshUsers();
    },
    onError: fail,
  });

  const seedDemo = useMutation({
    mutationFn: async () => {
      const stamp = Date.now();
      await createFn({
        data: { email: `demo.user.${stamp}@rancod.com`, password: "demo123456", display_name: "Demo User", role: "user", plan_code: "pro" },
      });
      await createFn({
        data: {
          email: `demo.provider.${stamp}@rancod.com`,
          password: "demo123456",
          display_name: "Demo Provider",
          role: "provider",
          plan_code: "free",
        },
      });
    },
    onSuccess: refreshUsers,
    onError: fail,
  });

  if (stats.isError) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <Card className="max-w-md text-center">
          <CardHeader>
            <CardTitle className="font-display">Admins only</CardTitle>
            <CardDescription>This area is restricted to platform administrators.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/dashboard" className="text-sm font-semibold text-primary hover:underline">
              Back to dashboard
            </Link>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2 font-display text-lg font-semibold">
            <ShieldCheck className="size-5 text-primary" /> Admin panel
          </div>
          <Link to="/dashboard" className="text-sm text-muted-foreground hover:underline">
            Back to dashboard
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-8 px-6 py-10">
        {error && (
          <p className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        )}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { label: "Users", value: nf.format(stats.data?.users ?? 0) },
            { label: "AI listings", value: nf.format(stats.data?.listings ?? 0) },
            { label: "Pending review", value: nf.format(stats.data?.pending ?? 0) },
            { label: "Tokens served", value: nf.format(stats.data?.tokens ?? 0) },
            { label: "Usage value", value: `$${((stats.data?.revenueCents ?? 0) / 100).toFixed(2)}` },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-5">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">{s.label}</p>
                <p className="mt-2 font-display text-2xl font-bold">{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="font-display">Create a user</CardTitle>
              <CardDescription>Accounts are created confirmed and ready to sign in.</CardDescription>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  setError(null);
                  createUser.mutate();
                }}
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="nu-email">Email</Label>
                    <Input
                      id="nu-email"
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nu-pass">Password</Label>
                    <Input
                      id="nu-pass"
                      required
                      minLength={6}
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nu-name">Display name</Label>
                  <Input
                    id="nu-name"
                    value={form.display_name}
                    onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="nu-role">Role</Label>
                    <select
                      id="nu-role"
                      value={form.role}
                      onChange={(e) => setForm({ ...form, role: e.target.value as (typeof ROLES)[number] })}
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nu-plan">Plan</Label>
                    <select
                      id="nu-plan"
                      value={form.plan_code}
                      onChange={(e) => setForm({ ...form, plan_code: e.target.value as "free" | "pro" | "max" })}
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      {["free", "pro", "max"].map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button type="submit" disabled={createUser.isPending}>
                    <UserPlus className="mr-2 size-4" /> Create user
                  </Button>
                  <Button type="button" variant="outline" onClick={() => seedDemo.mutate()} disabled={seedDemo.isPending}>
                    Create demo users
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-display">AI submissions</CardTitle>
              <CardDescription>Approve or reject provider models.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {(subs.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">Nothing submitted yet.</p>}
              {(subs.data ?? []).map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{s.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{s.slug}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={s.status === "approved" ? "default" : "secondary"}>{s.status}</Badge>
                    <Button
                      size="sm"
                      onClick={() =>
                        reviewFn({ data: { id: s.id, status: "approved" } })
                          .then(() => qc.invalidateQueries({ queryKey: ["admin-subs"] }))
                          .catch(fail)
                      }
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        reviewFn({ data: { id: s.id, status: "rejected" } })
                          .then(() => qc.invalidateQueries({ queryKey: ["admin-subs"] }))
                          .catch(fail)
                      }
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        <section>
          <Card>
            <CardHeader>
              <CardTitle className="font-display">All users</CardTitle>
              <CardDescription>Roles, plans and lifetime token usage.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="text-left text-xs uppercase tracking-widest text-muted-foreground">
                  <tr>
                    <th className="pb-3">Account</th>
                    <th className="pb-3">Roles</th>
                    <th className="pb-3">Plan</th>
                    <th className="pb-3">Tokens</th>
                    <th className="pb-3" />
                  </tr>
                </thead>
                <tbody>
                  {(users.data ?? []).map((u) => (
                    <tr key={u.id} className="border-t">
                      <td className="py-3">
                        <p className="font-medium">{u.display_name ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-1">
                          {ROLES.map((r) => {
                            const has = u.roles.includes(r);
                            return (
                              <button
                                key={r}
                                type="button"
                                onClick={() =>
                                  roleFn({ data: { user_id: u.id, role: r, grant: !has } })
                                    .then(refreshUsers)
                                    .catch(fail)
                                }
                                className={`rounded-full border px-2 py-0.5 text-[11px] ${
                                  has ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
                                }`}
                              >
                                {r}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                      <td className="py-3">
                        <select
                          value={u.plan}
                          onChange={(e) =>
                            planFn({ data: { user_id: u.id, plan_code: e.target.value as "free" | "pro" | "max" } })
                              .then(refreshUsers)
                              .catch(fail)
                          }
                          className="rounded-md border border-input bg-background px-2 py-1 text-xs"
                        >
                          {["free", "pro", "max"].map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3">{nf.format(u.tokens)}</td>
                      <td className="py-3 text-right">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteFn({ data: { user_id: u.id } }).then(refreshUsers).catch(fail)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
