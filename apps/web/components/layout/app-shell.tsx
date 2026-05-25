"use client";

import {
  Activity,
  Bot,
  Cpu,
  Database,
  Gauge,
  ImagePlus,
  Leaf,
  Lightbulb,
  Map,
  Menu,
  Settings,
  Sprout,
  UploadCloud
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/plants", label: "Plants", icon: Sprout },
  { href: "/zones", label: "Zones", icon: Map },
  { href: "/devices", label: "Devices", icon: Cpu },
  { href: "/lighting", label: "Lighting", icon: Lightbulb },
  { href: "/ai-analysis", label: "AI", icon: Bot },
  { href: "/wiki", label: "Wiki", icon: Leaf },
  { href: "/firmware", label: "Firmware", icon: UploadCloud },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/system", label: "System", icon: Database }
];

export function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[rgba(16,22,19,0.92)] backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4">
          <button
            className="focus-ring grid h-10 w-10 place-items-center rounded-md border border-[var(--border)] bg-[var(--surface)] lg:hidden"
            onClick={() => setOpen((value) => !value)}
            title="Toggle navigation"
            type="button"
          >
            <Menu size={19} />
          </button>
          <Link className="flex min-w-0 items-center gap-2" href="/dashboard">
            <span className="grid h-9 w-9 place-items-center rounded-md bg-[var(--green)] text-[#0c130f]">
              <Leaf size={20} />
            </span>
            <span className="truncate text-lg font-semibold">GrowLab</span>
          </Link>
          <div className="ml-auto hidden items-center gap-2 rounded-md border border-[var(--border)] px-3 py-1 text-sm text-[var(--muted)] sm:flex">
            <Activity size={16} />
            LAN/VPN
          </div>
          <Link
            className="focus-ring ml-1 grid h-10 w-10 place-items-center rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--text)]"
            href="/plants"
            title="Upload image"
          >
            <ImagePlus size={18} />
          </Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl grid-cols-1 lg:grid-cols-[220px_1fr]">
        <aside className={`${open ? "block" : "hidden"} border-b border-[var(--border)] p-3 lg:block lg:border-b-0 lg:border-r lg:py-5`}>
          <nav className="grid gap-1">
            {navItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link
                  className={`focus-ring flex h-10 items-center gap-3 rounded-md px-3 text-sm ${
                    active
                      ? "bg-[var(--surface-2)] text-[var(--text)]"
                      : "text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--text)]"
                  }`}
                  href={item.href}
                  key={item.href}
                  onClick={() => setOpen(false)}
                >
                  <Icon size={17} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="min-w-0 px-4 py-5 lg:px-6">{children}</main>
      </div>
    </div>
  );
}
