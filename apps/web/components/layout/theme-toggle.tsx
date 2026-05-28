"use client";

import { Laptop, Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

const modes = [
  { mode: "light" as const, label: "Light", icon: Sun },
  { mode: "dark" as const, label: "Dark", icon: Moon },
  { mode: "system" as const, label: "System", icon: Laptop },
];

export function ThemeToggle() {
  const { mode, setMode } = useTheme();

  return (
    <div
      className="inline-flex rounded-md border border-border bg-muted p-0.5"
      aria-label="Theme mode"
      role="group"
    >
      {modes.map((item) => (
        <Button
          aria-pressed={mode === item.mode}
          className={cn(
            "h-8 gap-1.5 px-2 text-xs",
            mode === item.mode
              ? "bg-card text-foreground shadow-sm hover:bg-card"
              : "text-muted-foreground hover:text-foreground",
          )}
          key={item.mode}
          onClick={() => setMode(item.mode)}
          size="sm"
          type="button"
          variant="ghost"
        >
          <item.icon className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">{item.label}</span>
        </Button>
      ))}
    </div>
  );
}
