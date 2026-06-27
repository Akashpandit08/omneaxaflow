"use client";

/**
 * Marketing / public Navbar — used on the landing page and auth pages.
 */

import { useState } from "react";
import Link from "next/link";
import { Menu, X, Play } from "lucide-react";
import { LinkButton } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { label: "Features",  href: "/#features" },
  { label: "Pricing",   href: "/#pricing" },
  { label: "Docs",      href: "/docs" },
  { label: "Blog",      href: "/blog" },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-surface-border/50 bg-surface/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 bg-gradient-brand rounded-lg flex items-center justify-center shadow-glow-sm group-hover:shadow-glow-brand transition-shadow">
              <Play className="w-4 h-4 text-white fill-white" />
            </div>
            <span className="font-bold text-white text-lg">AiVideo</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Primary navigation">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-surface-elevated transition-all"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link href="/login" className="text-sm text-slate-400 hover:text-white transition-colors px-3 py-2">
              Sign in
            </Link>
            <LinkButton href="/register" variant="primary" size="sm">
              Get started free
            </LinkButton>
          </div>

          {/* Mobile toggle */}
          <button
            className="btn-icon md:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-surface-border bg-surface-card animate-slide-down">
          <nav className="px-4 py-3 space-y-1" aria-label="Mobile navigation">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2.5 rounded-xl text-sm text-slate-300 hover:text-white hover:bg-surface-elevated transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-3 pb-1 border-t border-surface-border space-y-2">
              <Link
                href="/login"
                className="block px-3 py-2.5 rounded-xl text-sm text-slate-300 hover:text-white hover:bg-surface-elevated transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="flex items-center justify-center w-full btn-primary py-2.5 text-sm"
              >
                Get started free
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
