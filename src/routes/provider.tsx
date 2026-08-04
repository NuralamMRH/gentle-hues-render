import { createFileRoute, Link } from "@tanstack/react-router";
import logoAsset from "@/assets/rancod-logo.png.asset.json";
import wordmarkAsset from "@/assets/rancod-wordmark.png.asset.json";
import { ArrowRight, Coins, Cpu, Gauge, ShieldCheck, Wallet } from "lucide-react";

export const Route = createFileRoute("/provider")({
  head: () => ({
    meta: [
      { title: "Become a provider — earn cash hosting your AI | rancod.ai" },
      {
        name: "description",
        content:
          "Host your local AI model on rancod.ai, offer your own token capacity and get paid real money from subscription and usage revenue.",
      },
      { property: "og:title", content: "Become a rancod.ai provider" },
      {
        property: "og:description",
        content: "Turn your GPU into income: serve tokens to rancod.ai users and earn a revenue share in real cash.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProviderPage,
});

const STEPS = [
  { icon: Cpu, title: "Connect your rig", body: "Point rancod.ai at any OpenAI-compatible endpoint running on your own hardware." },
  { icon: ShieldCheck, title: "Pass review", body: "We test latency, stability and safety. Your endpoint credentials stay encrypted at rest." },
  { icon: Gauge, title: "Offer your tokens", body: "Set your price per million tokens and the monthly token capacity you want to serve." },
  { icon: Wallet, title: "Get paid", body: "Every served token is metered and paid out from real subscription and usage revenue." },
];

function ProviderPage() {
  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={logoAsset.url} alt="" width={30} height={30} />
            <img src={wordmarkAsset.url} alt="rancod.ai" height={18} style={{ height: 18 }} />
          </Link>
          <div className="flex items-center gap-2">
            <Link
              to="/auth"
              search={{ mode: "signin" }}
              className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-[color:var(--brand-navy)] shadow-card"
            >
              Sign in
            </Link>
            <Link
              to="/auth"
              search={{ mode: "signup", role: "provider" }}
              className="rounded-xl bg-gradient-brand px-4 py-2 text-sm font-semibold text-primary-foreground shadow-brand"
            >
              Become a provider
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div aria-hidden className="surface-grid pointer-events-none absolute inset-0 opacity-50" />
        <div className="relative mx-auto max-w-4xl px-6 pt-20 pb-16 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 font-mono text-[11px] tracking-wider text-muted-foreground shadow-card">
            <Coins className="h-3.5 w-3.5 text-[color:var(--brand-violet)]" /> PROVIDER PROGRAM
          </span>
          <h1 className="mt-7 font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-[color:var(--brand-navy)] sm:text-6xl">
            Your GPU already runs.
            <br />
            <span className="text-gradient-brand">Let it earn.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Providers host their own AI models, publish them to the rancod.ai network and offer their own monthly token
            capacity. Users chat, code and build against your model — and you take a share of the real revenue.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link
              to="/auth"
              search={{ mode: "signup", role: "provider" }}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-brand px-6 py-3 text-sm font-semibold text-primary-foreground shadow-brand transition-transform hover:-translate-y-0.5"
            >
              Create a provider account <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/auth"
              search={{ mode: "signup", role: "user" }}
              className="inline-flex items-center rounded-xl border border-border bg-card px-6 py-3 text-sm font-semibold text-[color:var(--brand-navy)] shadow-card transition-colors hover:border-[color:var(--brand-violet)]/50"
            >
              Become a user instead
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <div key={s.title} className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-soft text-[color:var(--brand-violet)]">
                <s.icon className="h-5 w-5" />
              </span>
              <p className="mt-4 font-mono text-[11px] tracking-widest text-muted-foreground">STEP {i + 1}</p>
              <h2 className="mt-1 font-display text-lg font-bold text-[color:var(--brand-navy)]">{s.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-3xl border border-border bg-gradient-soft p-8 text-center shadow-card lg:p-12">
          <h2 className="font-display text-2xl font-bold text-[color:var(--brand-navy)] sm:text-3xl">
            Offer your own tokens, set your own price
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Each listing you publish carries its own price per million tokens and the monthly token volume you are
            willing to serve. Change them any time from your provider dashboard.
          </p>
          <Link
            to="/auth"
            search={{ mode: "signup", role: "provider" }}
            className="mt-7 inline-flex items-center gap-2 rounded-xl bg-gradient-brand px-6 py-3 text-sm font-semibold text-primary-foreground shadow-brand"
          >
            Start earning <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </main>
  );
}
