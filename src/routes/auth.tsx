import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { claimRole } from "@/lib/roles.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

const SearchSchema = z.object({
  mode: z.enum(["signin", "signup"]).optional(),
  role: z.enum(["user", "provider"]).optional(),
  plan: z.enum(["free", "pro", "max"]).optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) => SearchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Sign in or register — rancod.ai compute network" },
      {
        name: "description",
        content:
          "Create a rancod.ai account as a user or a provider: chat with community AI models, host your own and manage your token plan.",
      },
      { property: "og:title", content: "Sign in — rancod.ai" },
      { property: "og:description", content: "Access your rancod.ai dashboard, API keys and token usage." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup">(search.mode ?? "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const wantsProvider = search.role === "provider";

  useEffect(() => {
    async function afterSession() {
      if (wantsProvider) {
        try {
          await claimRole({ data: { role: "provider" } });
        } catch {
          /* role already held */
        }
      }
      navigate({ to: "/dashboard", replace: true });
    }
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) void afterSession();
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) void afterSession();
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate, wantsProvider]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (mode === "signup") {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { display_name: displayName || email.split("@")[0] },
        },
      });
      if (signUpError) setError(signUpError.message);
      else if (!data.session) setMessage("Check your inbox to confirm your email, then sign in.");
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) setError(signInError.message);
    }
    setLoading(false);
  }

  async function handleGoogle() {
    setError(null);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) setError(result.error.message);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-16">
      <Card className="w-full max-w-md border-border/70 shadow-lg">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="font-display text-2xl">
            {mode === "signin" ? "Welcome back" : wantsProvider ? "Create a provider account" : "Create your account"}
          </CardTitle>
          <CardDescription>
            {mode === "signin"
              ? "Sign in to manage your AI, keys and token usage."
              : wantsProvider
                ? "Host your AI, offer your own tokens and earn from real revenue."
                : "Chat with community models and subscribe to a token plan."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <Button type="button" variant="outline" className="w-full" onClick={handleGoogle}>
            Continue with Google
          </Button>

          <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="displayName">Display name</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Ada Lovelace"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            {message && <p className="text-sm text-muted-foreground">{message}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
              {mode === "signin" ? "Sign in" : wantsProvider ? "Create provider account" : "Create account"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            {mode === "signin" ? "New to rancod.ai?" : "Already have an account?"}{" "}
            <button
              type="button"
              className="font-medium text-primary underline-offset-4 hover:underline"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            >
              {mode === "signin" ? "Create an account" : "Sign in"}
            </button>
          </p>
          <p className="text-center text-xs text-muted-foreground">
            <Link to="/" className="hover:underline">
              Back to rancod.ai
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
