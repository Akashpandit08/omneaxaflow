import Link from "next/link";
import { Play, ArrowRight, Zap, Globe, Shield, CheckCircle, Star, Users, Film } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";

const FEATURES = [
  {
    icon:  <Zap    className="w-5 h-5 text-brand-400" />,
    title: "Instant Rendering",
    desc:  "Background workers render your video with FFmpeg while you keep working. Get results in under 3 minutes.",
    bg:    "bg-brand-600/10",
  },
  {
    icon:  <Globe  className="w-5 h-5 text-accent-cyan" />,
    title: "50+ AI Voices",
    desc:  "Natural TTS in 10+ languages powered by ElevenLabs and Google TTS. Preview before you commit.",
    bg:    "bg-cyan-600/10",
  },
  {
    icon:  <Shield className="w-5 h-5 text-accent-green" />,
    title: "Secure & Private",
    desc:  "JWT auth, S3 signed URLs, and role-based access. Your scripts and videos stay private.",
    bg:    "bg-green-600/10",
  },
  {
    icon:  <Film   className="w-5 h-5 text-accent-purple" />,
    title: "6 AI Avatars",
    desc:  "Professional male, female, and neutral presenters in multiple styles — from business to casual.",
    bg:    "bg-purple-600/10",
  },
  {
    icon:  <Users  className="w-5 h-5 text-accent-orange" />,
    title: "Team Workspaces",
    desc:  "Collaborate with your team on projects. Coming in Phase 2.",
    bg:    "bg-orange-600/10",
  },
  {
    icon:  <Star   className="w-5 h-5 text-yellow-400" />,
    title: "API Access",
    desc:  "Integrate video generation into your own products with our REST API. Enterprise plan.",
    bg:    "bg-yellow-600/10",
  },
];

const PLANS = [
  {
    name:       "Free",
    price:      "$0",
    period:     "",
    desc:       "Perfect for trying it out.",
    features:   ["3 videos / month", "60s max duration", "3 avatars", "Google TTS", "720p export"],
    cta:        "Get started free",
    href:       "/register",
    highlight:  false,
  },
  {
    name:       "Pro",
    price:      "$29",
    period:     "/mo",
    desc:       "For creators and small teams.",
    features:   ["50 videos / month", "5 min max duration", "All 6 avatars", "ElevenLabs voices", "1080p export", "Priority rendering"],
    cta:        "Start Pro trial",
    href:       "/register",
    highlight:  true,
  },
  {
    name:       "Enterprise",
    price:      "$99",
    period:     "/mo",
    desc:       "For agencies and large teams.",
    features:   ["500 videos / month", "10 min max duration", "Custom avatars", "API access", "4K export", "Dedicated support", "SLA"],
    cta:        "Contact sales",
    href:       "/register",
    highlight:  false,
  },
];

const TESTIMONIALS = [
  {
    quote: "We cut our video production time from 2 weeks to 30 minutes. Absolutely transformative.",
    name:  "Sarah K.",
    role:  "Head of Marketing, TechCorp",
    rating: 5,
  },
  {
    quote: "The avatar quality is impressive. Our training videos look totally professional now.",
    name:  "Marcus T.",
    role:  "L&D Manager, Retail Co.",
    rating: 5,
  },
  {
    quote: "ElevenLabs integration makes the voices sound incredibly natural. Clients can't tell it's AI.",
    name:  "Priya M.",
    role:  "Freelance Creator",
    rating: 5,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-surface">
      <Navbar />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-hero pt-20 pb-32">
        {/* Glow effect */}
        <div className="absolute inset-0 bg-gradient-glow pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-600/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto px-6 text-center relative">
          <div className="inline-flex items-center gap-2 bg-brand-600/10 border border-brand-600/20 text-brand-300 text-sm px-4 py-1.5 rounded-full mb-8">
            <Zap className="w-3.5 h-3.5" />
            AI-powered video generation
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight mb-6 tracking-tight">
            Turn scripts into{" "}
            <span className="text-gradient">professional videos</span>{" "}
            in minutes
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            AI avatars, lifelike voices, and instant FFmpeg rendering. No camera, no studio, no editing skills required.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="btn-primary btn-xl flex items-center gap-2 shadow-glow-brand hover:shadow-glow-brand px-8"
            >
              Start for free
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/login"
              className="btn-secondary btn-xl px-8"
            >
              Sign in
            </Link>
          </div>

          <p className="text-sm text-slate-600 mt-5">
            No credit card required • Free forever plan • Cancel anytime
          </p>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Everything you need to create videos at scale
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            A complete video generation studio in your browser. From script to finished video — automated.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <div key={f.title} className="card-hover group">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${f.bg}`}>
                {f.icon}
              </div>
              <h3 className="font-semibold text-white mb-2">{f.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="bg-surface-card border-y border-surface-border py-24">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-white mb-4">How it works</h2>
            <p className="text-slate-400">Three simple steps from idea to finished video.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Write your script", desc: "Type or paste your video script. Use our templates for a head start." },
              { step: "02", title: "Choose avatar & voice", desc: "Pick a professional AI presenter and a natural-sounding voice from our library." },
              { step: "03", title: "Render & download", desc: "Hit render. Our pipeline generates your video in minutes. Download in HD." },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="text-4xl font-bold text-brand-600/30 mb-4 font-mono">{s.step}</div>
                <h3 className="font-semibold text-white mb-2">{s.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="max-w-5xl mx-auto px-6 py-24">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-white mb-4">Loved by creators</h2>
          <p className="text-slate-400">Join thousands who already use AiVideo.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="card space-y-4">
              <div className="flex gap-0.5">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                ))}
              </div>
              <p className="text-slate-300 text-sm leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
              <div>
                <p className="font-medium text-white text-sm">{t.name}</p>
                <p className="text-slate-500 text-xs">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="bg-surface-card border-y border-surface-border py-24">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-white mb-4">Simple, transparent pricing</h2>
            <p className="text-slate-400">Start free. Scale when you&apos;re ready. Cancel any time.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 items-start">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl border p-6 flex flex-col gap-5 ${
                  plan.highlight
                    ? "bg-gradient-to-b from-brand-900/40 to-surface-card border-brand-600/50 shadow-glow-sm"
                    : "bg-surface border-surface-border"
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    Most popular
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-white text-lg">{plan.name}</h3>
                  <p className="text-slate-500 text-sm mt-0.5">{plan.desc}</p>
                </div>
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-bold text-white">{plan.price}</span>
                  {plan.period && <span className="text-slate-500 mb-1">{plan.period}</span>}
                </div>
                <ul className="space-y-2 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-slate-300">
                      <CheckCircle className="w-3.5 h-3.5 text-accent-green flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.href}
                  className={`text-center py-2.5 rounded-xl font-medium text-sm transition-all ${
                    plan.highlight
                      ? "btn-primary"
                      : "btn-secondary"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="max-w-3xl mx-auto px-6 py-24 text-center">
        <h2 className="text-4xl font-bold text-white mb-4">
          Ready to create your first video?
        </h2>
        <p className="text-slate-400 mb-8">
          Sign up in seconds. Your first 3 videos are free.
        </p>
        <Link
          href="/register"
          className="btn-primary btn-xl inline-flex items-center gap-2 shadow-glow-brand px-10"
        >
          Get started free
          <ArrowRight className="w-5 h-5" />
        </Link>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-surface-border py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-brand rounded-lg flex items-center justify-center">
              <Play className="w-3.5 h-3.5 text-white fill-white" />
            </div>
            <span className="font-bold text-white">AiVideo</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-slate-500">
            <Link href="/terms"   className="hover:text-white transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/docs"    className="hover:text-white transition-colors">Docs</Link>
            <Link href="/blog"    className="hover:text-white transition-colors">Blog</Link>
          </div>
          <p className="text-xs text-slate-600">
            © {new Date().getFullYear()} AiVideo. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
