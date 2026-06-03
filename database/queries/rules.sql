-- name: CreateAutomationRule :one
INSERT INTO automation_rules (
  name,
  slug,
  description,
  enabled,
  severity,
  condition_config,
  action_config,
  metadata,
  trigger_mode,
  schedule_interval_seconds,
  scheduler_commit,
  cooldown_seconds,
  next_run_at
) VALUES (
  $1, $2, $3, $4, $5, $6, $7, $8,
  COALESCE($9, 'manual'),
  $10,
  COALESCE($11, false),
  COALESCE($12, 0),
  $13
)
RETURNING *;

-- name: ListAutomationRules :many
SELECT *
FROM automation_rules
ORDER BY enabled DESC, updated_at DESC, name;

-- name: GetAutomationRule :one
SELECT *
FROM automation_rules
WHERE id = $1;

-- name: ListDueScheduledAutomationRules :many
SELECT *
FROM automation_rules
WHERE enabled = true
  AND trigger_mode = 'scheduled'
  AND COALESCE(schedule_interval_seconds, 0) > 0
  AND (next_run_at IS NULL OR next_run_at <= now())
ORDER BY next_run_at NULLS FIRST, updated_at
LIMIT $1;

-- name: CreateAutomationRuleEvaluation :one
INSERT INTO automation_rule_evaluations (
  rule_id,
  matched,
  mode,
  evaluation_context,
  result,
  actions,
  evaluated_by
) VALUES (
  $1, $2, $3, $4, $5, $6, $7
)
RETURNING *;

-- name: ListAutomationRuleEvaluations :many
SELECT *
FROM automation_rule_evaluations
WHERE rule_id = $1
ORDER BY evaluated_at DESC
LIMIT $2;

-- name: UpdateAutomationRuleScheduleState :one
UPDATE automation_rules
SET last_scheduler_run_at = now(),
    next_run_at = CASE
      WHEN schedule_interval_seconds IS NULL THEN NULL
      ELSE now() + make_interval(secs => schedule_interval_seconds)
    END,
    scheduler_status = $2,
    scheduler_error = $3,
    updated_at = now()
WHERE id = $1
RETURNING *;
