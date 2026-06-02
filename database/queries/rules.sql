-- name: CreateAutomationRule :one
INSERT INTO automation_rules (
  name,
  slug,
  description,
  enabled,
  severity,
  condition_config,
  action_config,
  metadata
) VALUES (
  $1, $2, $3, $4, $5, $6, $7, $8
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
