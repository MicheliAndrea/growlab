"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Boxes,
  Cpu,
  Droplets,
  Image,
  Leaf,
  Lightbulb,
  MonitorCog,
  Package,
  Settings,
  Sprout,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: MonitorCog },
  { label: "Plants", href: "/plants", icon: Sprout },
  { label: "Zones", href: "/zones", icon: Boxes },
  { label: "Devices", href: "/devices", icon: Cpu },
  { label: "Lighting", href: "/lighting", icon: Lightbulb },
  { label: "Irrigation", href: "/irrigation", icon: Droplets },
  { label: "Images", href: "/images", icon: Image },
  { label: "Firmware", href: "/firmware", icon: Package },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Leaf className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <div className="text-sm font-semibold leading-tight">GrowLab</div>
              <div className="text-xs text-muted-foreground">
                Local control plane
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="success">MVP</Badge>
            <Button
              className="hidden sm:inline-flex"
              variant="outline"
              size="sm"
            >
              <Activity className="h-4 w-4" aria-hidden="true" />
              Live
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="border-b border-border bg-background lg:hidden">
        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 py-2 sm:px-6">
          {navItems.map((item) => {
            const active =
              pathname === item.href ||
              (item.href === "/dashboard" && pathname === "/");
            return (
              <Link
                className={cn(
                  "inline-flex h-9 shrink-0 items-center gap-2 rounded-md px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                  active && "bg-muted text-foreground",
                )}
                href={item.href}
                key={item.href}
              >
                <item.icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[220px_1fr] lg:px-8">
        <aside className="hidden lg:block">
          <nav className="grid gap-1">
            {navItems.map((item) => {
              const active =
                pathname === item.href ||
                (item.href === "/dashboard" && pathname === "/");
              return (
                <Link
                  className={cn(
                    "flex h-9 items-center gap-2 rounded-md px-3 text-left text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                    active && "bg-muted text-foreground",
                  )}
                  href={item.href}
                  key={item.href}
                >
                  <item.icon className="h-4 w-4" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main>{children}</main>
      </div>
    </div>
  );
}
