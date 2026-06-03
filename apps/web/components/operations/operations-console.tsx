"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, PlusCircle, RefreshCcw } from "lucide-react";

import {
  ListFilterBar,
  SearchFilter,
  SelectFilter,
  uniqueFilterOptions,
} from "@/components/dashboard/list-filters";
import {
  DataNotice,
  DataPanel,
  EmptyState,
  formatDateTime,
  MetricCard,
  PageHeader,
  Row,
  RowList,
  SeverityBadge,
  StatusBadge,
} from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { usePersistentStringState } from "@/lib/persistent-state";
import {
  acknowledgeSystemAlertEntry,
  createAutomationRuleEntry,
  createSystemAlertEntry,
  createSystemEventEntry,
  evaluateAutomationRuleEntry,
  fetchAutomationRuleEvaluations,
  fetchAutomationRules,
  fetchSystemAlerts,
  fetchSystemEvents,
  queryKeys,
  resolveSystemAlertEntry,
} from "@/lib/queries";
import {
  type AutomationRule,
  type AutomationRuleCreateRequest,
  type AutomationRuleEvaluation,
  type AutomationRuleEvaluationRequest,
  type SystemAlert,
  type SystemAlertCreateRequest,
  type SystemAlertTransitionRequest,
  type SystemAlertStatus,
  type SystemEventCreateRequest,
  type SystemSeverity,
} from "@/lib/api";

const poll = 30_000;
const selectClass =
  "mt-2 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const severityOptions: SystemSeverity[] = [
  "info",
  "warning",
  "error",
  "critical",
];

export function OperationsConsole() {
  const queryClient = useQueryClient();
  const [selectedRuleId, setSelectedRuleId] = React.useState("");
  const [alertSearch, setAlertSearch] = usePersistentStringState(
    "operations.alerts.search",
    "",
  );
  const [alertSeverityFilter, setAlertSeverityFilter] =
    usePersistentStringState("operations.alerts.severity", "all");
  const [eventSearch, setEventSearch] = usePersistentStringState(
    "operations.events.search",
    "",
  );
  const [eventSeverityFilter, setEventSeverityFilter] =
    usePersistentStringState("operations.events.severity", "all");
  const activeAlerts = useQuery({
    queryKey: queryKeys.systemAlerts("active"),
    queryFn: () => fetchSystemAlerts("active"),
    refetchInterval: 15_000,
  });
  const events = useQuery({
    queryKey: queryKeys.systemEvents,
    queryFn: fetchSystemEvents,
    refetchInterval: poll,
  });
  const rules = useQuery({
    queryKey: queryKeys.automationRules,
    queryFn: fetchAutomationRules,
    refetchInterval: poll,
  });
  const activeRuleId = selectedRuleId || rules.data?.[0]?.id || "";
  const ruleEvaluations = useQuery({
    queryKey: activeRuleId
      ? queryKeys.automationRuleEvaluations(activeRuleId)
      : ["automation-rules", "none", "evaluations"],
    queryFn: () => fetchAutomationRuleEvaluations(activeRuleId),
    enabled: Boolean(activeRuleId),
    refetchInterval: poll,
  });

  const alertCount = activeAlerts.data?.length ?? 0;
  const eventCount = events.data?.length ?? 0;
  const ruleCount = rules.data?.length ?? 0;
  const criticalCount =
    events.data?.filter((event) => event.severity === "critical").length ?? 0;
  const alertSeverityOptions = React.useMemo(
    () =>
      uniqueFilterOptions(
        (activeAlerts.data ?? []).map((alert) => alert.severity),
        "All severities",
      ),
    [activeAlerts.data],
  );
  const eventSeverityOptions = React.useMemo(
    () =>
      uniqueFilterOptions(
        (events.data ?? []).map((event) => event.severity),
        "All severities",
      ),
    [events.data],
  );
  const filteredAlerts = React.useMemo(() => {
    const search = alertSearch.trim().toLowerCase();

    return (activeAlerts.data ?? []).filter((alert) => {
      const matchesSearch =
        search.length === 0 ||
        [alert.title, alert.message, alert.source, alert.status].some((value) =>
          value?.toLowerCase().includes(search),
        );
      const matchesSeverity =
        alertSeverityFilter === "all" || alert.severity === alertSeverityFilter;

      return matchesSearch && matchesSeverity;
    });
  }, [activeAlerts.data, alertSearch, alertSeverityFilter]);
  const filteredEvents = React.useMemo(() => {
    const search = eventSearch.trim().toLowerCase();

    return (events.data ?? []).filter((event) => {
      const matchesSearch =
        search.length === 0 ||
        [event.eventType, event.message, event.source].some((value) =>
          value?.toLowerCase().includes(search),
        );
      const matchesSeverity =
        eventSeverityFilter === "all" || event.severity === eventSeverityFilter;

      return matchesSearch && matchesSeverity;
    });
  }, [eventSearch, eventSeverityFilter, events.data]);

  const acknowledgeMutation = useMutation({
    mutationFn: (id: string) =>
      acknowledgeSystemAlertEntry(id, { changedBy: "web-operations" }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["system-alerts"] });
      await queryClient.invalidateQueries({ queryKey: queryKeys.systemEvents });
    },
  });

  const resolveMutation = useMutation({
    mutationFn: (id: string) =>
      resolveSystemAlertEntry(id, { changedBy: "web-operations" }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["system-alerts"] });
      await queryClient.invalidateQueries({ queryKey: queryKeys.systemEvents });
    },
  });

  const createAlertMutation = useMutation({
    mutationFn: (request: SystemAlertCreateRequest) =>
      createSystemAlertEntry(request),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["system-alerts"] });
      await queryClient.invalidateQueries({ queryKey: queryKeys.systemEvents });
    },
  });

  const createEventMutation = useMutation({
    mutationFn: (request: SystemEventCreateRequest) =>
      createSystemEventEntry(request),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.systemEvents });
    },
  });

  const createRuleMutation = useMutation({
    mutationFn: (request: AutomationRuleCreateRequest) =>
      createAutomationRuleEntry(request),
    onSuccess: async (rule) => {
      setSelectedRuleId(rule.id);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.automationRules,
      });
    },
  });

  const evaluateRuleMutation = useMutation({
    mutationFn: (input: {
      ruleId: string;
      request: AutomationRuleEvaluationRequest;
    }) => evaluateAutomationRuleEntry(input.ruleId, input.request),
    onSuccess: async (_evaluation, input) => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.automationRules,
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.automationRuleEvaluations(input.ruleId),
      });
      await queryClient.invalidateQueries({ queryKey: ["system-alerts"] });
      await queryClient.invalidateQueries({ queryKey: queryKeys.systemEvents });
    },
  });

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Operations"
        title="System Operations"
        description="Manual alerts, manual events and the active alert queue."
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() => void queryClient.invalidateQueries()}
        >
          <RefreshCcw className="h-4 w-4" aria-hidden="true" />
          Refresh
        </Button>
      </PageHeader>

      <section className="grid gap-3 md:grid-cols-4">
        <MetricCard
          title="Active alerts"
          value={alertCount}
          detail="Alerts requiring attention"
          icon={CheckCircle2}
          tone={alertCount > 0 ? "destructive" : "success"}
        />
        <MetricCard
          title="Events"
          value={eventCount}
          detail="Recent system events"
          icon={CheckCircle2}
        />
        <MetricCard
          title="Critical"
          value={criticalCount}
          detail="Critical event severity"
          icon={CheckCircle2}
          tone={criticalCount > 0 ? "warning" : "success"}
        />
        <MetricCard
          title="Rules"
          value={ruleCount}
          detail="Manual dry-run rules"
          icon={CheckCircle2}
          tone={ruleCount > 0 ? "success" : "secondary"}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <DataPanel title="Create alert" description="Manual alert injection.">
          <SystemAlertForm
            onSubmit={createAlertMutation.mutate}
            isPending={createAlertMutation.isPending}
            error={createAlertMutation.error}
          />
        </DataPanel>

        <DataPanel title="Create event" description="Manual event logging.">
          <SystemEventForm
            onSubmit={createEventMutation.mutate}
            isPending={createEventMutation.isPending}
            error={createEventMutation.error}
          />
        </DataPanel>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <DataPanel title="Create rule" description="Safe manual rule MVP.">
          <AutomationRuleForm
            onSubmit={createRuleMutation.mutate}
            isPending={createRuleMutation.isPending}
            error={createRuleMutation.error}
          />
        </DataPanel>

        <DataPanel title="Evaluate rule" description="Dry-run by default.">
          <AutomationRuleRunner
            rules={rules.data ?? []}
            evaluations={ruleEvaluations.data ?? []}
            selectedRuleId={activeRuleId}
            onSelectedRuleIdChange={setSelectedRuleId}
            onEvaluate={(ruleId, request) =>
              evaluateRuleMutation.mutate({ ruleId, request })
            }
            isLoading={rules.isLoading || ruleEvaluations.isLoading}
            isError={rules.isError || ruleEvaluations.isError}
            isPending={evaluateRuleMutation.isPending}
            error={evaluateRuleMutation.error}
          />
        </DataPanel>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1.1fr]">
        <DataPanel title="Active alerts" description="Current alert queue.">
          <ListFilterBar
            hasActiveFilters={
              alertSearch !== "" || alertSeverityFilter !== "all"
            }
            onReset={() => {
              setAlertSearch("");
              setAlertSeverityFilter("all");
            }}
            resultCount={filteredAlerts.length}
            totalCount={activeAlerts.data?.length ?? 0}
          >
            <SearchFilter
              label="Search alerts"
              placeholder="Search alerts"
              value={alertSearch}
              onValueChange={setAlertSearch}
            />
            <SelectFilter
              label="Filter alert severity"
              value={alertSeverityFilter}
              onValueChange={setAlertSeverityFilter}
              options={alertSeverityOptions}
            />
          </ListFilterBar>
          {activeAlerts.isLoading ? <DataNotice state="loading" /> : null}
          {activeAlerts.isError ? <DataNotice state="error" /> : null}
          {filteredAlerts.length > 0 ? (
            <RowList>
              {filteredAlerts.map((alert) => (
                <Row
                  key={alert.id}
                  title={alert.title}
                  detail={`${alert.source} - ${alert.message}`}
                  meta={<SeverityBadge value={alert.severity} />}
                >
                  <StatusBadge value={alert.status} />
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={acknowledgeMutation.isPending}
                    onClick={() => acknowledgeMutation.mutate(alert.id)}
                  >
                    Acknowledge
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={resolveMutation.isPending}
                    onClick={() => resolveMutation.mutate(alert.id)}
                  >
                    Resolve
                  </Button>
                </Row>
              ))}
            </RowList>
          ) : !activeAlerts.isLoading &&
            !activeAlerts.isError &&
            activeAlerts.data ? (
            <EmptyState
              title={
                activeAlerts.data.length > 0
                  ? "No matching alerts"
                  : "No active alerts"
              }
              detail="Manual alert creation appears above."
            />
          ) : null}
        </DataPanel>

        <DataPanel title="Recent events" description="Event stream.">
          <ListFilterBar
            hasActiveFilters={
              eventSearch !== "" || eventSeverityFilter !== "all"
            }
            onReset={() => {
              setEventSearch("");
              setEventSeverityFilter("all");
            }}
            resultCount={filteredEvents.length}
            totalCount={events.data?.length ?? 0}
          >
            <SearchFilter
              label="Search events"
              placeholder="Search events"
              value={eventSearch}
              onValueChange={setEventSearch}
            />
            <SelectFilter
              label="Filter event severity"
              value={eventSeverityFilter}
              onValueChange={setEventSeverityFilter}
              options={eventSeverityOptions}
            />
          </ListFilterBar>
          {events.isLoading ? <DataNotice state="loading" /> : null}
          {events.isError ? <DataNotice state="error" /> : null}
          {filteredEvents.length > 0 ? (
            <RowList>
              {filteredEvents.slice(0, 12).map((event) => (
                <Row
                  key={event.id}
                  title={event.eventType}
                  detail={`${event.source} - ${event.message}`}
                  meta={<SeverityBadge value={event.severity} />}
                >
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(event.occurredAt)}
                  </span>
                </Row>
              ))}
            </RowList>
          ) : !events.isLoading && !events.isError && events.data ? (
            <EmptyState
              title={
                events.data.length > 0
                  ? "No matching events"
                  : "No system events"
              }
              detail="Manual events appear above."
            />
          ) : null}
        </DataPanel>
      </section>
    </div>
  );
}

function SystemAlertForm({
  onSubmit,
  isPending,
  error,
}: {
  onSubmit: (request: SystemAlertCreateRequest) => void;
  isPending: boolean;
  error: unknown;
}) {
  const [severity, setSeverity] = React.useState<SystemSeverity>("warning");
  const [source, setSource] = React.useState("web-operations");
  const [title, setTitle] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [metadata, setMetadata] = React.useState("{}");
  const [formError, setFormError] = React.useState<string | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedTitle = title.trim();
    const trimmedMessage = message.trim();
    if (!trimmedTitle || !trimmedMessage) {
      setFormError("Title and message are required.");
      return;
    }

    try {
      const request: SystemAlertCreateRequest = {
        severity,
        source: source.trim() || "web-operations",
        title: trimmedTitle,
        message: trimmedMessage,
        metadata: parseJsonObject(metadata, "metadata"),
      };

      setFormError(null);
      onSubmit(request);
      setTitle("");
      setMessage("");
      setMetadata("{}");
      setSeverity("warning");
      setSource("web-operations");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Invalid payload");
    }
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      {formError ? (
        <p className="text-xs text-red-600 dark:text-red-300">{formError}</p>
      ) : null}
      {error instanceof Error ? (
        <p className="text-xs text-red-600 dark:text-red-300">
          {error.message}
        </p>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Label htmlFor="alert-title">Title</Label>
          <Input
            id="alert-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="mt-2"
          />
        </div>
        <div>
          <Label htmlFor="alert-severity">Severity</Label>
          <select
            id="alert-severity"
            className={selectClass}
            value={severity}
            onChange={(event) =>
              setSeverity(event.target.value as SystemSeverity)
            }
          >
            {severityOptions.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <Label htmlFor="alert-source">Source</Label>
        <Input
          id="alert-source"
          value={source}
          onChange={(event) => setSource(event.target.value)}
          className="mt-2"
        />
      </div>

      <div>
        <Label htmlFor="alert-message">Message</Label>
        <Textarea
          id="alert-message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          className="mt-2 min-h-28"
        />
      </div>

      <div>
        <Label htmlFor="alert-metadata">Metadata</Label>
        <Textarea
          id="alert-metadata"
          value={metadata}
          onChange={(event) => setMetadata(event.target.value)}
          className="mt-2 min-h-24 font-mono text-xs"
        />
      </div>

      <Button disabled={isPending} type="submit">
        <PlusCircle className="h-4 w-4" aria-hidden="true" />
        Create alert
      </Button>
    </form>
  );
}

function SystemEventForm({
  onSubmit,
  isPending,
  error,
}: {
  onSubmit: (request: SystemEventCreateRequest) => void;
  isPending: boolean;
  error: unknown;
}) {
  const [eventType, setEventType] = React.useState("manual_note");
  const [severity, setSeverity] = React.useState<SystemSeverity>("info");
  const [source, setSource] = React.useState("web-operations");
  const [zoneId, setZoneId] = React.useState("");
  const [plantId, setPlantId] = React.useState("");
  const [deviceId, setDeviceId] = React.useState("");
  const [alertId, setAlertId] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [occurredAt, setOccurredAt] = React.useState("");
  const [metadata, setMetadata] = React.useState("{}");
  const [formError, setFormError] = React.useState<string | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedEventType = eventType.trim();
    const trimmedMessage = message.trim();
    if (!trimmedEventType || !trimmedMessage) {
      setFormError("Event type and message are required.");
      return;
    }

    try {
      const request: SystemEventCreateRequest = {
        eventType: trimmedEventType,
        severity,
        source: source.trim() || "web-operations",
        zoneId: zoneId.trim() || null,
        plantId: plantId.trim() || null,
        deviceId: deviceId.trim() || null,
        alertId: alertId.trim() || null,
        message: trimmedMessage,
        metadata: parseJsonObject(metadata, "metadata"),
        occurredAt: occurredAt ? new Date(occurredAt).toISOString() : null,
      };

      setFormError(null);
      onSubmit(request);
      setEventType("manual_note");
      setSeverity("info");
      setSource("web-operations");
      setZoneId("");
      setPlantId("");
      setDeviceId("");
      setAlertId("");
      setMessage("");
      setOccurredAt("");
      setMetadata("{}");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Invalid payload");
    }
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      {formError ? (
        <p className="text-xs text-red-600 dark:text-red-300">{formError}</p>
      ) : null}
      {error instanceof Error ? (
        <p className="text-xs text-red-600 dark:text-red-300">
          {error.message}
        </p>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Label htmlFor="event-type">Event type</Label>
          <Input
            id="event-type"
            value={eventType}
            onChange={(event) => setEventType(event.target.value)}
            className="mt-2"
          />
        </div>
        <div>
          <Label htmlFor="event-severity">Severity</Label>
          <select
            id="event-severity"
            className={selectClass}
            value={severity}
            onChange={(event) =>
              setSeverity(event.target.value as SystemSeverity)
            }
          >
            {severityOptions.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <Label htmlFor="event-source">Source</Label>
        <Input
          id="event-source"
          value={source}
          onChange={(event) => setSource(event.target.value)}
          className="mt-2"
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div>
          <Label htmlFor="event-zone">Zone ID</Label>
          <Input
            id="event-zone"
            value={zoneId}
            onChange={(event) => setZoneId(event.target.value)}
            className="mt-2"
          />
        </div>
        <div>
          <Label htmlFor="event-plant">Plant ID</Label>
          <Input
            id="event-plant"
            value={plantId}
            onChange={(event) => setPlantId(event.target.value)}
            className="mt-2"
          />
        </div>
        <div>
          <Label htmlFor="event-device">Device ID</Label>
          <Input
            id="event-device"
            value={deviceId}
            onChange={(event) => setDeviceId(event.target.value)}
            className="mt-2"
          />
        </div>
        <div>
          <Label htmlFor="event-alert">Alert ID</Label>
          <Input
            id="event-alert"
            value={alertId}
            onChange={(event) => setAlertId(event.target.value)}
            className="mt-2"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="event-message">Message</Label>
        <Textarea
          id="event-message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          className="mt-2 min-h-28"
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Label htmlFor="event-occurred-at">Occurred at</Label>
          <Input
            id="event-occurred-at"
            type="datetime-local"
            value={occurredAt}
            onChange={(event) => setOccurredAt(event.target.value)}
            className="mt-2"
          />
        </div>
        <div>
          <Label htmlFor="event-metadata">Metadata</Label>
          <Textarea
            id="event-metadata"
            value={metadata}
            onChange={(event) => setMetadata(event.target.value)}
            className="mt-2 min-h-28 font-mono text-xs"
          />
        </div>
      </div>

      <Button disabled={isPending} type="submit">
        <PlusCircle className="h-4 w-4" aria-hidden="true" />
        Create event
      </Button>
    </form>
  );
}

const defaultRuleCondition = JSON.stringify(
  {
    fact: "soilMoisture",
    operator: "lt",
    value: 35,
  },
  null,
  2,
);

const defaultRuleActions = JSON.stringify(
  {
    actions: [
      {
        type: "show_dashboard_suggestion",
        message: "Check substrate moisture manually.",
      },
      {
        type: "create_system_event",
        eventType: "rule_matched",
        severity: "warning",
        message: "Manual rule matched.",
      },
    ],
  },
  null,
  2,
);

const defaultEvaluationContext = JSON.stringify(
  {
    temperature: 24.5,
    humidity: 58,
    soilMoisture: 28,
    device: {
      status: "online",
    },
  },
  null,
  2,
);

function AutomationRuleForm({
  onSubmit,
  isPending,
  error,
}: {
  onSubmit: (request: AutomationRuleCreateRequest) => void;
  isPending: boolean;
  error: unknown;
}) {
  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [enabled, setEnabled] = React.useState(true);
  const [severity, setSeverity] = React.useState<SystemSeverity>("warning");
  const [conditionConfig, setConditionConfig] =
    React.useState(defaultRuleCondition);
  const [actionConfig, setActionConfig] = React.useState(defaultRuleActions);
  const [metadata, setMetadata] = React.useState("{}");
  const [formError, setFormError] = React.useState<string | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      setFormError("Name is required.");
      return;
    }

    try {
      const request: AutomationRuleCreateRequest = {
        name: trimmedName,
        slug: slug.trim() || undefined,
        description: description.trim() || null,
        enabled,
        severity,
        conditionConfig:
          parseJsonObject(conditionConfig, "condition config") ?? {},
        actionConfig: parseJsonObject(actionConfig, "action config") ?? {},
        metadata: parseJsonObject(metadata, "metadata") ?? {},
      };

      setFormError(null);
      onSubmit(request);
      setName("");
      setSlug("");
      setDescription("");
      setEnabled(true);
      setSeverity("warning");
      setConditionConfig(defaultRuleCondition);
      setActionConfig(defaultRuleActions);
      setMetadata("{}");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Invalid payload");
    }
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      {formError ? (
        <p className="text-xs text-red-600 dark:text-red-300">{formError}</p>
      ) : null}
      {error instanceof Error ? (
        <p className="text-xs text-red-600 dark:text-red-300">
          {error.message}
        </p>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Label htmlFor="rule-name">Name</Label>
          <Input
            id="rule-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-2"
          />
        </div>
        <div>
          <Label htmlFor="rule-slug">Slug</Label>
          <Input
            id="rule-slug"
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            className="mt-2"
          />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <Label htmlFor="rule-severity">Severity</Label>
          <select
            id="rule-severity"
            className={selectClass}
            value={severity}
            onChange={(event) =>
              setSeverity(event.target.value as SystemSeverity)
            }
          >
            {severityOptions.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
        <label className="flex h-9 items-center gap-2 text-sm">
          <input
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
            type="checkbox"
          />
          Enabled
        </label>
      </div>

      <div>
        <Label htmlFor="rule-description">Description</Label>
        <Textarea
          id="rule-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className="mt-2 min-h-20"
        />
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <div>
          <Label htmlFor="rule-condition">Condition config</Label>
          <Textarea
            id="rule-condition"
            value={conditionConfig}
            onChange={(event) => setConditionConfig(event.target.value)}
            className="mt-2 min-h-40 font-mono text-xs"
          />
        </div>
        <div>
          <Label htmlFor="rule-actions">Action config</Label>
          <Textarea
            id="rule-actions"
            value={actionConfig}
            onChange={(event) => setActionConfig(event.target.value)}
            className="mt-2 min-h-40 font-mono text-xs"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="rule-metadata">Metadata</Label>
        <Textarea
          id="rule-metadata"
          value={metadata}
          onChange={(event) => setMetadata(event.target.value)}
          className="mt-2 min-h-20 font-mono text-xs"
        />
      </div>

      <Button disabled={isPending} type="submit">
        <PlusCircle className="h-4 w-4" aria-hidden="true" />
        Create rule
      </Button>
    </form>
  );
}

function AutomationRuleRunner({
  rules,
  evaluations,
  selectedRuleId,
  onSelectedRuleIdChange,
  onEvaluate,
  isLoading,
  isError,
  isPending,
  error,
}: {
  rules: AutomationRule[];
  evaluations: AutomationRuleEvaluation[];
  selectedRuleId: string;
  onSelectedRuleIdChange: (id: string) => void;
  onEvaluate: (
    ruleId: string,
    request: AutomationRuleEvaluationRequest,
  ) => void;
  isLoading: boolean;
  isError: boolean;
  isPending: boolean;
  error: unknown;
}) {
  const [evaluationContext, setEvaluationContext] = React.useState(
    defaultEvaluationContext,
  );
  const [commit, setCommit] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const selectedRule = rules.find((rule) => rule.id === selectedRuleId);

  function handleEvaluate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedRuleId) {
      setFormError("Select a rule before evaluation.");
      return;
    }

    try {
      const request: AutomationRuleEvaluationRequest = {
        evaluationContext:
          parseJsonObject(evaluationContext, "evaluation context") ?? {},
        commit,
        evaluatedBy: "web-operations",
      };
      setFormError(null);
      onEvaluate(selectedRuleId, request);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Invalid payload");
    }
  }

  if (isLoading) {
    return <DataNotice state="loading" />;
  }

  if (isError) {
    return <DataNotice state="error" />;
  }

  if (rules.length === 0) {
    return (
      <EmptyState
        title="No rules"
        detail="Create the first rule before running evaluations."
      />
    );
  }

  return (
    <div className="grid gap-4">
      <form className="grid gap-4" onSubmit={handleEvaluate}>
        {formError ? (
          <p className="text-xs text-red-600 dark:text-red-300">{formError}</p>
        ) : null}
        {error instanceof Error ? (
          <p className="text-xs text-red-600 dark:text-red-300">
            {error.message}
          </p>
        ) : null}

        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <Label htmlFor="rule-select">Rule</Label>
            <select
              id="rule-select"
              className={selectClass}
              value={selectedRuleId}
              onChange={(event) => onSelectedRuleIdChange(event.target.value)}
            >
              {rules.map((rule) => (
                <option key={rule.id} value={rule.id}>
                  {rule.name}
                </option>
              ))}
            </select>
          </div>
          <label className="flex h-9 items-center gap-2 text-sm">
            <input
              checked={commit}
              onChange={(event) => setCommit(event.target.checked)}
              type="checkbox"
            />
            Commit safe actions
          </label>
        </div>

        <div className="grid gap-2 rounded-md border border-border bg-muted/30 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">
              {selectedRule?.name ?? "Rule"}
            </span>
            <SeverityBadge value={selectedRule?.severity} />
            <StatusBadge value={selectedRule?.enabled ? "active" : "offline"} />
          </div>
          <div className="truncate text-xs text-muted-foreground">
            {selectedRule?.description ?? selectedRule?.slug}
          </div>
        </div>

        <div>
          <Label htmlFor="rule-evaluation-context">Evaluation context</Label>
          <Textarea
            id="rule-evaluation-context"
            value={evaluationContext}
            onChange={(event) => setEvaluationContext(event.target.value)}
            className="mt-2 min-h-36 font-mono text-xs"
          />
        </div>

        <Button disabled={isPending} type="submit" variant="outline">
          <RefreshCcw className="h-4 w-4" aria-hidden="true" />
          Evaluate rule
        </Button>
      </form>

      <div className="grid gap-3">
        <div className="text-sm font-medium">Evaluation history</div>
        {evaluations.length > 0 ? (
          <RowList>
            {evaluations.slice(0, 6).map((evaluation) => (
              <EvaluationRow key={evaluation.id} evaluation={evaluation} />
            ))}
          </RowList>
        ) : (
          <EmptyState
            title="No evaluations"
            detail="Manual evaluation results will appear here."
          />
        )}
      </div>
    </div>
  );
}

function EvaluationRow({
  evaluation,
}: {
  evaluation: AutomationRuleEvaluation;
}) {
  return (
    <Row
      title={evaluation.matched ? "matched" : "not matched"}
      detail={`${evaluation.mode} - ${formatDateTime(evaluation.evaluatedAt)}`}
      meta={<StatusBadge value={evaluation.matched ? "active" : "clear"} />}
    >
      <div className="max-w-full truncate text-xs text-muted-foreground">
        {summary(evaluation.actions)}
      </div>
    </Row>
  );
}

function parseJsonObject(value: string, label: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const parsed = JSON.parse(trimmed) as unknown;
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${label} must be a JSON object.`);
  }

  return parsed as Record<string, unknown>;
}

function summary(value: unknown) {
  if (value == null) {
    return "not set";
  }
  try {
    const text = JSON.stringify(value);
    return text.length > 88 ? `${text.slice(0, 85)}...` : text;
  } catch {
    return "not set";
  }
}
