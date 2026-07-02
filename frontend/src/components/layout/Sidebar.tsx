"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderOpen,
  CreditCard,
  Play,
  LogOut,
  User,
  ChevronRight,
  Sparkles,
  Video,
  Mic,
  Code,
  Settings,
  Users,
  Palette,
  BarChart,
  ChevronDown,
  FileStack,
  ShieldCheck,
  ClipboardList,
  ServerIcon
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";

const NAV_GROUPS = [
  {
    label: "Workspace",
    items: [
      { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
      { href: "/projects", icon: FolderOpen, label: "Projects" },
      { href: "/videos", icon: Video, label: "Videos" },
      { href: "/templates", icon: FileStack, label: "Templates" },
      { href: "/analytics", icon: BarChart, label: "Analytics" },
      { href: "/audit", icon: ClipboardList, label: "Audit Logs" },
    ],
  },
  {
    label: "Studio",
    items: [
      { href: "/avatars", icon: User, label: "Avatars" },
      { href: "/voices", icon: Mic, label: "Voices" },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/billing", icon: CreditCard, label: "Billing", badge: "Pro" },
      { href: "/profile", icon: User, label: "Profile" },
    ],
  },
  {
    label: "Settings",
    items: [
      { href: "/settings/workspace", icon: Settings, label: "Workspace" },
      { href: "/settings/team", icon: Users, label: "Team" },
      { href: "/settings/branding", icon: Palette, label: "Branding" },
      { href: "/settings/security", icon: ShieldCheck, label: "Security" },
      { href: "/settings/api", icon: Code, label: "Developer API" },
      { href: "/settings/ai-providers", icon: ServerIcon, label: "AI Providers" },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { logout, user } = useAuthStore();
  const { currentWorkspace, workspaces } = useWorkspaceStore();

  const initials = user?.full_name
    ?.split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase() ?? "??";

  return (
    <aside
      className="w-[var(--sidebar-width,240px)] bg-surface-card border-r border-surface-border flex flex-col h-full shrink-0"
      aria-label="Main navigation"
    >
      {/* ── Workspace Switcher ── */}
      <div className="px-3 py-4 border-b border-surface-border">
        <button className="flex items-center justify-between w-full p-2 rounded-xl hover:bg-surface-elevated transition-colors group">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-brand rounded-lg flex items-center justify-center shadow-glow-sm">
              <span className="font-bold text-white text-sm">
                {currentWorkspace?.name.charAt(0).toUpperCase() || "W"}
              </span>
            </div>
            <div className="text-left">
              <span className="block font-semibold text-slate-200 text-sm leading-none mb-1 max-w-[120px] truncate">
                {currentWorkspace?.name || "Loading..."}
              </span>
              <span className="block text-[10px] text-slate-500 leading-none">Free Plan</span>
            </div>
          </div>
          <ChevronDown className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-colors" />
        </button>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-hide">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest px-3 mb-1.5">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map(({ href, icon: Icon, label, badge }) => {
                const isActive =
                  pathname === href ||
                  (href !== "/dashboard" && pathname.startsWith(href));
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150 group",
                      isActive
                        ? "bg-brand-600/15 text-brand-300 shadow-glow-sm"
                        : "text-slate-500 hover:text-slate-200 hover:bg-surface-elevated"
                    )}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <Icon
                      className={cn(
                        "w-4 h-4 flex-shrink-0 transition-colors",
                        isActive ? "text-brand-400" : "text-slate-600 group-hover:text-slate-400"
                      )}
                    />
                    <span className="flex-1">{label}</span>
                    {badge && (
                      <Badge variant="brand" className="text-[10px] py-0 px-1.5">
                        {badge}
                      </Badge>
                    )}
                    {isActive && (
                      <div className="w-1 h-1 rounded-full bg-brand-400" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Upgrade Banner ── */}
      <div className="px-3 mb-3">
        <div className="rounded-xl bg-gradient-to-br from-brand-900/60 to-purple-900/30 border border-brand-600/20 p-3">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-brand-400" />
            <span className="text-xs font-semibold text-brand-300">Upgrade to Pro</span>
          </div>
          <p className="text-[11px] text-slate-500 mb-2.5 leading-relaxed">
            Unlock 50 videos/mo, premium avatars & ElevenLabs voices.
          </p>
          <Link
            href="/billing"
            className="flex items-center justify-center gap-1.5 w-full bg-brand-600/30 hover:bg-brand-600/50 border border-brand-600/30 rounded-lg py-1.5 text-xs font-medium text-brand-300 transition-colors"
          >
            View plans
            <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* ── User ── */}
      <div className="px-3 pb-4 border-t border-surface-border pt-3">
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-surface-elevated transition-colors group">
          <div className="w-7 h-7 rounded-full bg-gradient-brand flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-200 truncate">{user?.full_name}</p>
            <p className="text-[10px] text-slate-600 truncate">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-900/20 transition-colors opacity-0 group-hover:opacity-100"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
