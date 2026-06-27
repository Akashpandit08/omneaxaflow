"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Search,
  Plus,
  ChevronRight,
  Settings,
  LogOut,
  User,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";

// Breadcrumb label map
const LABEL_MAP: Record<string, string> = {
  dashboard:  "Dashboard",
  projects:   "Projects",
  videos:     "Videos",
  avatars:    "Avatars",
  voices:     "Voices",
  billing:    "Billing",
  profile:    "Profile",
  new:        "New",
};

function useBreadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  return segments.map((seg, i) => ({
    label: LABEL_MAP[seg] ?? (seg.length > 12 ? `#${seg.slice(0, 6)}` : seg),
    href:  "/" + segments.slice(0, i + 1).join("/"),
    isLast: i === segments.length - 1,
  }));
}

export function TopBar() {
  const { user, logout } = useAuthStore();
  const breadcrumbs = useBreadcrumbs();
  const [profileOpen, setProfileOpen] = useState(false);

  const initials = user?.full_name
    ?.split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase() ?? "??";

  return (
    <header className="h-[var(--topbar-height,60px)] bg-surface-card/80 backdrop-blur border-b border-surface-border flex items-center px-5 gap-4 sticky top-0 z-20">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1.5 flex-1 min-w-0" aria-label="Breadcrumb">
        {breadcrumbs.map((crumb, i) => (
          <span key={crumb.href} className="flex items-center gap-1.5 text-sm">
            {i > 0 && <ChevronRight className="w-3 h-3 text-slate-600 flex-shrink-0" />}
            {crumb.isLast ? (
              <span className="font-medium text-white truncate">{crumb.label}</span>
            ) : (
              <Link
                href={crumb.href}
                className="text-slate-500 hover:text-slate-300 transition-colors truncate"
              >
                {crumb.label}
              </Link>
            )}
          </span>
        ))}
      </nav>

      {/* Right actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Quick create */}
        <Link
          href="/projects/new"
          className="btn-icon hidden sm:flex"
          title="New project"
          aria-label="New project"
        >
          <Plus className="w-4 h-4" />
        </Link>

        {/* Notifications */}
        <button
          className="btn-icon relative"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
          {/* Unread dot */}
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-accent-red border border-surface-card" />
        </button>

        {/* Profile dropdown */}
        <div className="relative">
          <button
            onClick={() => setProfileOpen((v) => !v)}
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-surface-elevated transition-colors"
            aria-haspopup="true"
            aria-expanded={profileOpen}
            aria-label="Profile menu"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-brand flex items-center justify-center text-white text-xs font-semibold">
              {initials}
            </div>
            <span className="text-sm font-medium text-slate-200 hidden md:block max-w-[120px] truncate">
              {user?.full_name}
            </span>
          </button>

          {profileOpen && (
            <>
              <div
                className="fixed inset-0 z-20"
                onClick={() => setProfileOpen(false)}
                aria-hidden
              />
              <div className="absolute right-0 top-full mt-2 z-30 w-52 bg-surface-card border border-surface-border rounded-xl shadow-modal overflow-hidden animate-slide-down">
                <div className="px-4 py-3 border-b border-surface-border">
                  <p className="text-sm font-medium text-white truncate">{user?.full_name}</p>
                  <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                </div>
                <div className="p-1">
                  <Link
                    href="/profile"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-surface-elevated hover:text-white transition-colors"
                  >
                    <User className="w-4 h-4 text-slate-500" />
                    Profile
                  </Link>
                  <Link
                    href="/billing"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-surface-elevated hover:text-white transition-colors"
                  >
                    <Settings className="w-4 h-4 text-slate-500" />
                    Billing & Plans
                  </Link>
                  <div className="my-1 border-t border-surface-border" />
                  <button
                    onClick={() => { logout(); setProfileOpen(false); }}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-900/20 hover:text-red-300 transition-colors w-full"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
