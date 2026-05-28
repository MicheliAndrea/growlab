import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { Badge, type BadgeProps } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type BadgeVariant = NonNullable<BadgeProps["variant"]>;

export function PageHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? (
          <div className="text-xs font-medium uppercase tracking-normal text-muted-foreground">
            {eyebrow}
          </div>
        ) : null}
        <h1 className="mt-1 text-2xl font-semibold tracking-normal text-foreground">
          {title}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          {description}
        </p>
      </div>
      {children ? <div className="shrink-0">{children}</div> : null}
    </div>
  );
}

export function MetricCard({
  title,
  value,
  detail,
  icon: Icon,
  tone = "secondary",
}: {
  title: string;
  value: string | number;
  detail: string;
  icon: LucideIcon;
  tone?: BadgeVariant;
}) {
  const badgeLabel =
    tone === "success"
      ? "ok"
      : tone === "warning"
        ? "watch"
        : tone === "destructive"
          ? "alert"
          : "mvp";

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <div className="text-2xl font-semibold leading-none">{value}</div>
          <Badge variant={tone}>{badgeLabel}</Badge>
        </div>
        <p className="mt-2 truncate text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

export function DataPanel({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function EmptyState({
  title,
  detail,
}: {
  title: string;
  detail?: string;
}) {
  return (
    <div className="rounded-md border border-dashed border-border px-4 py-8 text-center">
      <div className="text-sm font-medium">{title}</div>
      {detail ? (
        <div className="mt-1 text-sm text-muted-foreground">{detail}</div>
      ) : null}
    </div>
  );
}

export function DataNotice({ state }: { state: "loading" | "error" }) {
  return (
    <div
      className={cn(
        "rounded-md border px-3 py-2 text-sm",
        state === "loading"
          ? "border-border bg-muted text-muted-foreground"
          : "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-100",
      )}
    >
      {state === "loading" ? "Loading live data" : "API data unavailable"}
    </div>
  );
}

export function StatusBadge({ value }: { value?: string | null }) {
  const variant = statusVariant(value);

  return <Badge variant={variant}>{value ?? "unknown"}</Badge>;
}

export function SeverityBadge({ value }: { value?: string | null }) {
  const variant = severityVariant(value);

  return <Badge variant={variant}>{value ?? "info"}</Badge>;
}

export function RowList({ children }: { children: ReactNode }) {
  return (
    <div className="divide-y divide-border rounded-md border border-border">
      {children}
    </div>
  );
}

export function Row({
  title,
  detail,
  meta,
  children,
}: {
  title: string;
  detail?: string | null;
  meta?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="grid gap-3 px-3 py-3 text-sm sm:grid-cols-[1fr_auto] sm:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <div className="truncate font-medium">{title}</div>
          {meta}
        </div>
        {detail ? (
          <div className="mt-1 truncate text-xs text-muted-foreground">
            {detail}
          </div>
        ) : null}
      </div>
      {children ? <div className="flex flex-wrap gap-2">{children}</div> : null}
    </div>
  );
}

export function formatDateTime(value?: string | null) {
  if (!value) {
    return "not set";
  }

  try {
    return new Intl.DateTimeFormat("en", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function statusVariant(value?: string | null): BadgeVariant {
  switch (value) {
    case "online":
    case "active":
    case "healthy":
    case "done":
    case "completed":
    case "resolved":
    case "stable":
      return "success";
    case "warning":
    case "acknowledged":
    case "pending":
    case "beta":
    case "todo":
    case "watch":
    case "stressed":
      return "warning";
    case "offline":
    case "critical":
    case "failed":
    case "error":
    case "cancelled":
    case "dead":
      return "destructive";
    default:
      return "secondary";
  }
}

function severityVariant(value?: string | null): BadgeVariant {
  switch (value) {
    case "critical":
    case "error":
      return "destructive";
    case "warning":
      return "warning";
    case "info":
    default:
      return "secondary";
  }
}
