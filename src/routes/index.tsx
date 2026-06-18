import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import logoAsset from "@/assets/rancod-logo.png.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "rancod.ai — Host your AI. Serve tokens. Get paid real money." },
      {
        name: "description",
        content:
          "An AI marketplace where local model hosts earn real cash from subscription and usage revenue. No crypto, no mining — just compute work turned into a paycheck.",
      },
      { property: "og:title", content: "rancod.ai — Compute → Cash" },
      {
        property: "og:description",
        content:
          "Host your AI model. Serve tokens. Get paid real money from rancod.ai's revenue pool.",
      },
    ],
  }),
  component: Landing,
});

const NAV = [
  { href: "#how", label: "How It Works" },
  { href: "#earn", label: "Earn Model" },
  { href: "#plans", label: "Plans" },
  { href: "#stack", label: "Tech Stack" },
  { href: "#roadmap", label: "Roadmap" },
];

function Logo({ size = 32 }: { size?: number }) {
  return (
    <img
      src={logoAsset.url}
      alt="rancod.ai logo"
      width={size}
      height={size}
      style={{ height: size, width: size }}
      className="object-contain"
    />
  );
}

function LogoWord() {
  return (
    <div className="flex items-center gap-2.5">
      <Logo size={32} />
      <span className="font-display text-[20px] font-extrabold tracking-tight">
        <span className="text-[color:var(--brand-navy)]">rancod</span>
        <span className="text-gradient-brand">.ai</span>
      </span>
    </div>
  );
}

function Landing() {
  const [scrollPct, setScrollPct] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const pct = (h.scrollTop / (h.scrollHeight - h.clientHeight)) * 100;
      setScrollPct(pct);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* scroll progress */}
      <div className="fixed top-0 left-0 right-0 z-[300] h-[2px] bg-transparent">
        <div
          className="h-full bg-gradient-brand transition-[width] duration-100"
          style={{ width: `${scrollPct}%` }}
        />
      </div>

      {/* NAV */}
      <nav className="sticky top-0 z-[200] h-16 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-6 lg:px-10">
          <a href="#top" className="flex items-center">
            <LogoWord />
          </a>
          <ul className="hidden items-center gap-8 lg:flex">
            {NAV.map((n) => (
              <li key={n.href}>
                <a
                  href={n.href}
                  className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-[color:var(--brand-violet)]"
                >
                  {n.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="hidden items-center gap-3 lg:flex">
            <span className="font-mono text-[10px] font-semibold tracking-[0.15em] text-[color:var(--brand-violet)] border border-[color:var(--brand-violet)]/30 rounded px-2 py-1">
              BLUEPRINT v2
            </span>
            <a
              href="#earn"
              className="inline-flex items-center rounded-lg bg-gradient-brand px-4 py-2 text-[13px] font-semibold text-primary-foreground shadow-brand transition-transform hover:-translate-y-0.5"
            >
              Start Earning
            </a>
          </div>
          <button
            type="button"
            aria-label="Toggle menu"
            onClick={() => setMobileOpen((v) => !v)}
            className="flex h-10 w-10 flex-col items-center justify-center gap-1.5 rounded-md lg:hidden"
          >
            <span
              className={`h-0.5 w-5 bg-foreground transition-transform ${mobileOpen ? "translate-y-2 rotate-45" : ""}`}
            />
            <span
              className={`h-0.5 w-5 bg-foreground transition-opacity ${mobileOpen ? "opacity-0" : ""}`}
            />
            <span
              className={`h-0.5 w-5 bg-foreground transition-transform ${mobileOpen ? "-translate-y-2 -rotate-45" : ""}`}
            />
          </button>
        </div>
        {mobileOpen && (
          <div className="border-t border-border bg-background lg:hidden">
            <ul className="mx-auto flex max-w-7xl flex-col px-6 py-2">
              {NAV.map((n) => (
                <li key={n.href}>
                  <a
                    href={n.href}
                    onClick={() => setMobileOpen(false)}
                    className="block border-b border-border py-3 text-sm text-foreground"
                  >
                    {n.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </nav>

      <main id="top">
        {/* HERO */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="surface-grid pointer-events-none absolute inset-0 opacity-50"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -top-40 left-1/2 h-[700px] w-[700px] -translate-x-1/2 rounded-full opacity-60 blur-3xl"
            style={{
              background:
                "radial-gradient(circle, color-mix(in oklab, var(--brand-violet) 30%, transparent) 0%, transparent 65%)",
            }}
          />
          <div className="relative mx-auto max-w-5xl px-6 pt-20 pb-24 text-center lg:pt-28 lg:pb-32">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 shadow-card">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[color:var(--success)] opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[color:var(--success)]" />
              </span>
              <span className="font-mono text-[11px] font-medium tracking-wider text-muted-foreground">
                PROVIDER EARNING LIVE ·{" "}
                <span className="text-[color:var(--success)]">$0.0042</span> / 1K
                TOKENS
              </span>
            </div>

            <h1 className="mt-8 font-display text-5xl font-extrabold leading-[1.05] tracking-tight text-[color:var(--brand-navy)] sm:text-6xl lg:text-7xl">
              Host your AI.
              <br />
              <span className="text-gradient-brand">Serve tokens.</span>
              <br />
              Get paid real money.
            </h1>

            <p className="mx-auto mt-7 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              rancod.ai is an AI marketplace where providers host local AI models
              and earn real cash — funded directly from user subscriptions and
              token usage revenue. No crypto. No mining. Just compute work turned
              into a paycheck.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-2">
              {[
                { label: "Real Cash Payouts", on: true },
                { label: "Token-Based Earning", on: true },
                { label: "Subscription Revenue Split", on: true },
                { label: "Claude API" },
                { label: "OpenRouter" },
                { label: "Codex / OpenCode" },
                { label: "AI IDE" },
                { label: "No Crypto Required" },
              ].map((p) => (
                <span
                  key={p.label}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    p.on
                      ? "border-[color:var(--brand-violet)]/40 bg-[color:var(--brand-violet)]/8 text-[color:var(--brand-navy)]"
                      : "border-border bg-card text-muted-foreground"
                  }`}
                >
                  {p.label}
                </span>
              ))}
            </div>

            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <a
                href="#earn"
                className="inline-flex items-center justify-center rounded-xl bg-gradient-brand px-6 py-3 text-sm font-semibold text-primary-foreground shadow-brand transition-transform hover:-translate-y-0.5"
              >
                See How You Earn →
              </a>
              <a
                href="#stack"
                className="inline-flex items-center justify-center rounded-xl border border-border bg-card px-6 py-3 text-sm font-semibold text-[color:var(--brand-navy)] shadow-card transition-colors hover:border-[color:var(--brand-violet)]/50"
              >
                View Tech Stack
              </a>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <Section
          id="how"
          eyebrow="How It Works"
          title={
            <>
              Like Bitcoin Mining —<br />
              But You Mine with Your AI.
            </>
          }
          lead="In Bitcoin mining, you run hardware that does useful work for the network and get paid in return. On rancod.ai, you run your AI model that does useful work for users — and the platform pays you from its real revenue. Same principle. Actual dollars."
        >
          <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-soft p-8 shadow-card lg:p-12">
            <h3 className="font-display text-2xl font-bold sm:text-3xl">
              The <span className="text-gradient-brand">Compute → Cash</span>{" "}
              Pipeline
            </h3>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Every time a user sends a message, writes code, or generates an
              image on rancod.ai, it consumes tokens. That token usage generates
              platform revenue. A fixed percentage of that revenue flows directly
              back to the providers whose models served those tokens.
            </p>
            <div className="mt-6 rounded-2xl border border-border bg-card p-5 text-sm leading-relaxed text-muted-foreground">
              <strong className="text-[color:var(--brand-navy)]">
                The analogy:
              </strong>{" "}
              Think of it like a taxi network. rancod.ai is the app (Uber). You
              are the driver (your AI model is the car). Users pay the app for
              rides (token usage + subscriptions). The app takes its cut and pays
              you for every mile you drove. The more rides your model completes,
              the more you earn — in real money, paid to your bank or PayPal.
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  n: "01",
                  t: "User Pays rancod",
                  d: "Via subscription plan or pay-per-token credits",
                },
                {
                  n: "02",
                  t: "Revenue Pool Fills",
                  d: "70% allocated to Provider Reward Pool monthly",
                },
                {
                  n: "03",
                  t: "Your Model Serves",
                  d: "Token counter tracks every request your AI handles",
                },
                {
                  n: "04",
                  t: "You Get Paid",
                  d: "Your share = (your tokens ÷ total tokens) × pool",
                },
              ].map((s) => (
                <div
                  key={s.n}
                  className="rounded-xl border border-border bg-card p-5 shadow-card transition-transform hover:-translate-y-1"
                >
                  <div className="font-mono text-xs font-semibold tracking-widest text-[color:var(--brand-violet)]">
                    {s.n}
                  </div>
                  <div className="mt-2 font-display text-base font-bold text-[color:var(--brand-navy)]">
                    {s.t}
                  </div>
                  <div className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                    {s.d}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* EARN MODEL */}
        <Section
          id="earn"
          eyebrow="Earn Model — Full Details"
          title={
            <>
              Where the Money Comes From
              <br />
              &amp; How It Reaches You
            </>
          }
          lead="The platform collects revenue from two streams: subscription fees and pay-as-you-go token purchases. A Provider Reward Pool is funded from both — distributed monthly to all active providers based on their proportional token contribution."
        >
          <div className="grid gap-5 md:grid-cols-3">
            {[
              {
                icon: "💳",
                title: "Subscription Revenue",
                desc: "Monthly plan fees from Free, Pro, Team, and Enterprise users. The largest and most predictable revenue source.",
                pct: "60%",
                sub: "of sub revenue → Provider Pool",
              },
              {
                icon: "🪙",
                title: "Token Credit Purchases",
                desc: "Pay-as-you-go users buy token bundles. Every token they consume is metered and attributed to the serving provider in real time.",
                pct: "80%",
                sub: "of credit revenue → Provider Pool",
              },
              {
                icon: "🏢",
                title: "Enterprise API Fees",
                desc: "B2B customers access rancod via API keys. Providers who serve enterprise traffic earn a premium multiplier.",
                pct: "70%",
                sub: "of enterprise revenue → Provider Pool",
              },
            ].map((c) => (
              <div
                key={c.title}
                className="group rounded-2xl border border-border bg-card p-6 shadow-card transition-all hover:-translate-y-1 hover:border-[color:var(--brand-violet)]/50 hover:shadow-brand"
              >
                <div className="text-3xl">{c.icon}</div>
                <div className="mt-4 font-display text-lg font-bold text-[color:var(--brand-navy)]">
                  {c.title}
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {c.desc}
                </p>
                <div className="mt-6 font-display text-4xl font-extrabold text-gradient-brand">
                  {c.pct}
                </div>
                <div className="mt-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                  {c.sub}
                </div>
              </div>
            ))}
          </div>

          {/* Rate Table */}
          <div className="mt-10 overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="bg-gradient-soft text-[color:var(--brand-navy)]">
                  <th className="px-5 py-4 font-semibold">Earn Source</th>
                  <th className="px-5 py-4 font-semibold">How It's Calculated</th>
                  <th className="px-5 py-4 font-semibold">Rate / Estimate</th>
                  <th className="px-5 py-4 font-semibold">Payout</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Token Inference Reward", "Your tokens served ÷ total platform tokens × monthly pool", "~$0.002–$0.008 / 1K tokens", "Monthly"],
                  ["Quality Multiplier", "Based on user ratings, uptime %, and response latency score", "Up to 2.5× base rate", "Applied monthly"],
                  ["Exclusivity Bonus", "Rare or specialized models (code, vision, multilingual) get a scarcity premium", "+15–40% on base", "Monthly"],
                  ["Referral Earnings", "5% of earnings from every provider you refer, for 12 months", "Passive, uncapped", "Monthly"],
                  ["Uptime Streak Bonus", "Maintain 99%+ uptime for 30 days straight", "+$25 flat bonus", "Monthly"],
                  ["Featured Listing Fee", "rancod promotes your model in the marketplace homepage", "Revenue share on featured traffic", "Weekly"],
                ].map((row) => (
                  <tr key={row[0]} className="border-t border-border align-top">
                    <td className="px-5 py-4 font-semibold text-[color:var(--brand-navy)]">
                      {row[0]}
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">{row[1]}</td>
                    <td className="px-5 py-4 font-mono font-semibold text-[color:var(--success)]">
                      {row[2]}
                    </td>
                    <td className="px-5 py-4 font-mono text-[color:var(--brand-violet)]">
                      {row[3]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Withdraw */}
          <div className="mt-14">
            <Eyebrow>Withdraw Your Earnings</Eyebrow>
            <h3 className="mt-3 font-display text-2xl font-bold text-[color:var(--brand-navy)] sm:text-3xl">
              Get Paid Your Way
            </h3>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Minimum withdrawal: $10. No conversion required — pure USD (or your
              local currency) sent directly.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { i: "🏦", n: "Bank Transfer", d: "ACH / SEPA / SWIFT. 1–3 business days. No fee above $50." },
                { i: "💸", n: "PayPal", d: "Instant to PayPal balance. Available in 200+ countries." },
                { i: "🌍", n: "Wise", d: "Best for international providers. Real rate, low fees." },
                { i: "📱", n: "Mobile Money", d: "M-Pesa, GCash, bKash — for emerging markets." },
              ].map((w) => (
                <div
                  key={w.n}
                  className="rounded-xl border border-border bg-card p-5 shadow-card transition-all hover:-translate-y-1 hover:border-[color:var(--brand-violet)]/50"
                >
                  <div className="text-2xl">{w.i}</div>
                  <div className="mt-3 font-display font-bold text-[color:var(--brand-navy)]">
                    {w.n}
                  </div>
                  <div className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                    {w.d}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* PLANS */}
        <Section
          id="plans"
          eyebrow="User Subscriptions — The Revenue That Funds Provider Earnings"
          title="What Users Pay"
          lead="Every subscription dollar flows into the Provider Reward Pool. The more users subscribe, the larger the pool — and the more every provider earns."
        >
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                name: "Free", price: "$0", period: "forever",
                feats: ["50K tokens / month", "Community models only", "Basic chat interface", "1 active session"],
              },
              {
                name: "Pro", price: "$19", period: "per month", featured: true,
                feats: ["2M tokens / month", "All models + Claude, Codex, OpenRouter", "AI Code IDE (Monaco)", "Image generation", "API key management", "File context / RAG"],
              },
              {
                name: "Team", price: "$49", period: "per seat / month",
                feats: ["10M tokens / month", "Shared workspaces", "Usage analytics dashboard", "Priority model routing", "SSO / team admin"],
              },
              {
                name: "Enterprise", price: "Custom", period: "annual contract",
                feats: ["Unlimited tokens", "Dedicated model SLA", "On-prem deployment", "Private model hosting", "99.99% uptime SLA", "White-label option"],
              },
            ].map((t) => (
              <div
                key={t.name}
                className={`relative flex flex-col rounded-2xl border bg-card p-6 shadow-card transition-all hover:-translate-y-1 ${
                  t.featured
                    ? "border-[color:var(--brand-violet)] shadow-brand"
                    : "border-border hover:border-[color:var(--brand-violet)]/40"
                }`}
              >
                {t.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-brand px-3 py-1 font-mono text-[10px] font-bold tracking-widest text-primary-foreground">
                    MOST POPULAR
                  </div>
                )}
                <div className="font-mono text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {t.name}
                </div>
                <div className="mt-3 font-display text-4xl font-extrabold text-[color:var(--brand-navy)]">
                  {t.price}
                </div>
                <div className="text-xs text-muted-foreground">{t.period}</div>
                <ul className="mt-5 space-y-2.5 text-sm">
                  {t.feats.map((f) => (
                    <li key={f} className="flex gap-2 text-muted-foreground">
                      <span className="mt-0.5 text-[color:var(--brand-violet)]">✓</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>

        {/* ROLES */}
        <Section
          eyebrow="Platform Roles"
          title={
            <>
              Three Stakeholders,
              <br />
              One Network
            </>
          }
        >
          <div className="grid gap-5 lg:grid-cols-3">
            {[
              {
                tag: "AI Provider",
                title: "Local AI Hosts",
                desc: "Anyone with a capable GPU or server registers their model and earns real money from the tokens they serve.",
                feats: [
                  "Install rancod-agent (one terminal command)",
                  "Register any GGUF, ONNX, or HuggingFace model",
                  "Set your model name, description, and tags",
                  "View live earnings dashboard in real time",
                  "Withdraw monthly via bank, PayPal, or Wise",
                  "Boost earnings with quality score + uptime",
                ],
              },
              {
                tag: "End User",
                title: "Builders & Creators",
                desc: "Developers, researchers, designers, and everyday users accessing world-class AI tools in one workspace.",
                feats: [
                  "Multi-model chat with history and folders",
                  "AI Code IDE (Monaco + Claude Code / Codex)",
                  "Image generation canvas (SDXL / Flux)",
                  "OpenRouter / OpenCode / Anthropic API access",
                  "API Playground with personal key management",
                  "Voice input, file context, RAG support",
                ],
              },
              {
                tag: "Platform",
                title: "rancod.ai Operator",
                desc: "The platform orchestrates quality, routing, payments, and safety across the entire provider network.",
                feats: [
                  "Smart router: latency + quality + cost scoring",
                  "Content safety layer on every response",
                  "Monthly pool calculation and payout processing",
                  "Model sandboxing and abuse prevention",
                  "Commercial API cost arbitrage",
                  "Provider quality scoring and ranking",
                ],
              },
            ].map((r) => (
              <div
                key={r.tag}
                className="rounded-2xl border border-border bg-card p-6 shadow-card transition-all hover:-translate-y-1 hover:border-[color:var(--brand-violet)]/50 hover:shadow-brand"
              >
                <span className="inline-block rounded-full bg-gradient-soft px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-widest text-[color:var(--brand-violet)]">
                  {r.tag}
                </span>
                <h3 className="mt-4 font-display text-xl font-bold text-[color:var(--brand-navy)]">
                  {r.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {r.desc}
                </p>
                <ul className="mt-5 space-y-2 text-sm">
                  {r.feats.map((f) => (
                    <li key={f} className="flex gap-2 text-muted-foreground">
                      <span className="mt-0.5 text-[color:var(--brand-violet)]">›</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>

        {/* STACK */}
        <Section
          id="stack"
          eyebrow="Complete Tech Stack"
          title="Every Layer, Chosen Deliberately"
          lead="Cloud-native at the core, provider-agnostic by design. Built for performance, observability, and zero lock-in."
        >
          <div className="space-y-5">
            {STACK.map((block) => (
              <div
                key={block.name}
                className="rounded-2xl border border-border bg-card p-6 shadow-card"
              >
                <div className="font-mono text-xs font-semibold uppercase tracking-widest text-[color:var(--brand-violet)]">
                  {block.name}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {block.chips.map((c) => (
                    <span
                      key={c}
                      className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-[color:var(--brand-navy)] transition-colors hover:border-[color:var(--brand-violet)]/50"
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ background: block.dot }}
                      />
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* ROADMAP */}
        <Section
          id="roadmap"
          eyebrow="Build Roadmap"
          title="30-Week Plan"
          lead="Five focused phases — from the core platform through the payment infrastructure to marketplace scale."
        >
          <div className="space-y-4">
            {ROADMAP.map((p) => (
              <div
                key={p.num}
                className="grid gap-5 rounded-2xl border border-border bg-card p-6 shadow-card transition-all hover:border-[color:var(--brand-violet)]/50 hover:shadow-brand md:grid-cols-[220px_1fr]"
              >
                <div>
                  <div className="font-mono text-xs font-semibold tracking-widest text-[color:var(--brand-violet)]">
                    {p.num}
                  </div>
                  <div className="mt-2 font-display text-lg font-bold text-[color:var(--brand-navy)]">
                    {p.name}
                  </div>
                  <div className="mt-1 font-mono text-xs text-muted-foreground">
                    {p.wks}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {p.tasks.map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-[color:var(--brand-violet)]/50 hover:text-[color:var(--brand-navy)]"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* PLATFORM REVENUE */}
        <Section
          eyebrow="Platform Revenue"
          title="How rancod.ai Sustains Itself"
          lead="The platform keeps a portion of revenue to cover infrastructure, commercial API costs, and operations — the rest flows to providers."
        >
          <div className="grid gap-5 md:grid-cols-2">
            {[
              {
                t: "💰 Revenue Streams",
                items: [
                  "Subscription fees (Free → Enterprise plans)",
                  "Pay-as-you-go token credit packs ($5, $20, $100)",
                  "Enterprise API contracts (annual, volume-based)",
                  "Featured model placement fees from providers",
                  "White-label licensing for corporate AI portals",
                ],
              },
              {
                t: "📊 Revenue Split",
                items: [
                  <>
                    <strong className="text-[color:var(--success)]">65–80%</strong> → Provider Reward Pool (varies by revenue type)
                  </>,
                  <>
                    <strong className="text-[color:var(--brand-violet)]">10–15%</strong> → Commercial API costs (Claude, Codex, OpenRouter)
                  </>,
                  <>
                    <strong className="text-[color:var(--brand-navy)]">10–20%</strong> → Platform infrastructure, operations, team
                  </>,
                ],
              },
              {
                t: "📈 Provider Earning Example",
                items: [
                  "Platform earns $50,000 in a month from all revenue",
                  "$32,500 (65%) goes into the Provider Pool",
                  "Total tokens served across all providers: 8 billion",
                  "Your model served 400M tokens (5% of network)",
                  <strong className="text-[color:var(--success)]" key="x">
                    Your payout: $1,625 for the month
                  </strong>,
                ],
              },
              {
                t: "🚀 Growth Incentives",
                items: [
                  "Pool grows with user base — early providers benefit most",
                  "Top-rated providers get marketplace prominence",
                  "Referral program multiplies earnings without extra compute",
                  "Enterprise traffic pays premium rates → higher pool per token",
                ],
              },
            ].map((card, i) => (
              <div
                key={i}
                className="rounded-2xl border border-border bg-card p-6 shadow-card"
              >
                <h3 className="font-display text-lg font-bold text-[color:var(--brand-navy)]">
                  {card.t}
                </h3>
                <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
                  {card.items.map((item, j) => (
                    <li key={j} className="flex gap-2">
                      <span className="text-[color:var(--brand-violet)]">▹</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>

        {/* SECURITY */}
        <Section
          eyebrow="Security & Compliance"
          title="Built for Trust at Every Layer"
        >
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[
              { i: "🔐", t: "End-to-End Encryption", d: "All provider ↔ gateway traffic is TLS 1.3 + WireGuard. User data is never stored on provider machines." },
              { i: "🧱", t: "Sandboxed Model Execution", d: "Provider models run in isolated processes with CPU/memory caps and blocked outbound network access." },
              { i: "🛡️", t: "Content Safety", d: "Every model output is screened by Llama Guard + custom classifiers. Violating providers are auto-suspended." },
              { i: "🧾", t: "Financial Transparency", d: "Providers receive itemised monthly statements showing tokens served, multipliers, deductions, and final payout." },
              { i: "📋", t: "GDPR & Privacy", d: "User conversations optionally stored client-side only. Server logs purged at 30 days. EU hosting option available." },
              { i: "⚖️", t: "KYC / AML Compliance", d: "Providers earning above $600/year complete identity verification. Required for legal payout processing." },
            ].map((s) => (
              <div
                key={s.t}
                className="flex gap-4 rounded-2xl border border-border bg-card p-6 shadow-card transition-all hover:-translate-y-1 hover:border-[color:var(--brand-violet)]/50"
              >
                <div className="text-3xl">{s.i}</div>
                <div>
                  <div className="font-display font-bold text-[color:var(--brand-navy)]">
                    {s.t}
                  </div>
                  <div className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {s.d}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* CTA */}
        <section className="relative overflow-hidden">
          <div className="mx-auto max-w-6xl px-6 pb-24">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-brand p-10 text-center shadow-brand lg:p-16">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-30"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.3) 0, transparent 40%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.2) 0, transparent 40%)",
                }}
              />
              <div className="relative">
                <h2 className="font-display text-3xl font-extrabold text-primary-foreground sm:text-4xl lg:text-5xl">
                  Turn your GPU into a paycheck.
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-sm text-primary-foreground/80 sm:text-base">
                  Install the rancod-agent, register your model, and start earning
                  from real subscription revenue — paid out monthly in real money.
                </p>
                <div className="mt-7 flex flex-wrap justify-center gap-3">
                  <a
                    href="#earn"
                    className="inline-flex items-center justify-center rounded-xl bg-background px-6 py-3 text-sm font-semibold text-[color:var(--brand-navy)] shadow-card transition-transform hover:-translate-y-0.5"
                  >
                    Become a Provider
                  </a>
                  <a
                    href="#plans"
                    className="inline-flex items-center justify-center rounded-xl border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-primary-foreground backdrop-blur transition-colors hover:bg-white/20"
                  >
                    Explore Plans
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-border bg-surface">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-6 py-10 md:flex-row md:items-center lg:px-10">
          <div>
            <LogoWord />
            <p className="mt-2 text-xs text-muted-foreground">
              Host your AI. Serve tokens. Get paid real money.
            </p>
          </div>
          <div className="text-xs text-muted-foreground md:text-right">
            Blueprint v2.0 · June 2026
            <br />
            No crypto. No mining. Just real revenue sharing.
          </div>
        </div>
      </footer>
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--brand-violet)]">
      {children}
    </span>
  );
}

function Section({
  id,
  eyebrow,
  title,
  lead,
  children,
}: {
  id?: string;
  eyebrow: string;
  title: React.ReactNode;
  lead?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="border-t border-border/60 py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 className="mt-4 font-display text-3xl font-extrabold leading-tight text-[color:var(--brand-navy)] sm:text-4xl lg:text-5xl">
          {title}
        </h2>
        {lead && (
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground">
            {lead}
          </p>
        )}
        <div className="mt-10">{children}</div>
      </div>
    </section>
  );
}

const STACK = [
  {
    name: "Frontend — User Interface",
    dot: "var(--brand-violet)",
    chips: [
      "Next.js 15 (App Router)", "React 19 + TypeScript", "Tailwind CSS v4",
      "shadcn/ui", "Monaco Editor (AI IDE)", "Zustand (State)",
      "TanStack Query", "Framer Motion", "Socket.io Client", "Recharts",
    ],
  },
  {
    name: "Backend — API & Orchestration",
    dot: "var(--gold)",
    chips: [
      "Node.js + Fastify (API Gateway)", "Python FastAPI (ML services)",
      "GraphQL via Hasura", "Redis (cache + sessions)", "BullMQ (job queues)",
      "gRPC (agent ↔ gateway)", "Prisma ORM", "JWT + OAuth2",
      "Stripe (billing)", "PayPal / Wise Payout APIs",
    ],
  },
  {
    name: "Provider Agent — Local Daemon",
    dot: "var(--success)",
    chips: [
      "Rust (rancod-agent binary)", "Ollama SDK (model runner)",
      "llama.cpp bindings", "WireGuard VPN Tunnel",
      "CUDA / ROCm / Metal backends", "ONNX Runtime",
      "HuggingFace Transformers", "Token metering",
    ],
  },
  {
    name: "API Integrations",
    dot: "var(--brand-indigo)",
    chips: [
      "Anthropic Claude API", "Claude Code (agentic)", "OpenAI Codex / GPT-4o",
      "OpenCode (open-source)", "OpenRouter (aggregator)", "Stable Diffusion XL",
      "Flux.1 (image gen)", "Deepgram (STT)", "ElevenLabs (TTS)",
    ],
  },
  {
    name: "Payments & Financial Infrastructure",
    dot: "var(--success)",
    chips: [
      "Stripe (subscriptions + credits)", "PayPal Payouts API",
      "Wise Business API", "bKash / GCash / M-Pesa",
      "ClickHouse (token ledger)", "Internal Pool Engine",
    ],
  },
  {
    name: "Database & Storage",
    dot: "var(--gold)",
    chips: [
      "PostgreSQL via Neon", "Redis Cluster",
      "ClickHouse (analytics)", "Qdrant (vector / RAG)",
      "MinIO / S3 (files, model weights)",
    ],
  },
  {
    name: "Smart Routing & Quality Control",
    dot: "var(--brand-violet)",
    chips: [
      "LiteLLM (unified proxy)", "Custom Router (latency + quality + cost)",
      "LangFuse (prompt monitoring)", "Guardrails AI (safety)",
      "Llama Guard (content moderation)", "OpenLLMetry (observability)",
    ],
  },
  {
    name: "Infrastructure & DevOps",
    dot: "var(--brand-indigo)",
    chips: [
      "Kubernetes + Helm", "Docker / Podman", "Cloudflare (CDN + WAF + Tunnels)",
      "Prometheus + Grafana", "OpenTelemetry", "GitHub Actions CI/CD",
      "Terraform", "Fly.io / AWS EKS",
    ],
  },
];

const ROADMAP = [
  {
    num: "Phase 1", name: "Foundation", wks: "Weeks 1–6",
    tasks: ["Next.js + Fastify scaffold", "Auth (JWT + OAuth)", "Postgres schema", "rancod-agent v0.1 (Rust + Ollama)", "WireGuard tunnel", "Basic chat UI", "Claude API integration", "Token counter"],
  },
  {
    num: "Phase 2", name: "Marketplace & Routing", wks: "Weeks 7–13",
    tasks: ["Model registry + listing UI", "Smart router (latency + quality)", "OpenRouter + Codex + OpenCode", "API Playground", "Provider dashboard (live earnings)", "Quality scoring system", "Content safety layer"],
  },
  {
    num: "Phase 3", name: "Billing & Payouts", wks: "Weeks 14–20",
    tasks: ["Stripe subscriptions", "Token credit purchase flow", "ClickHouse token ledger", "Monthly Pool Engine", "PayPal Payouts API", "Wise Business API", "Provider wallet + withdraw UI", "Earnings history + invoices"],
  },
  {
    num: "Phase 4", name: "AI IDE & Design Tools", wks: "Weeks 21–26",
    tasks: ["Monaco AI Code Editor", "Claude Code agentic coding", "File upload + RAG context", "Image gen canvas (SDXL + Flux)", "Voice input (Deepgram)", "Multi-model compare view", "VS Code extension"],
  },
  {
    num: "Phase 5", name: "Scale & Enterprise", wks: "Weeks 27–30",
    tasks: ["Enterprise API tiers", "White-label offering", "Mobile app (React Native)", "Mobile money payouts", "Multi-region K8s deploy", "Financial audit & compliance", "Public beta launch"],
  },
];
