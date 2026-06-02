-- +goose Up
CREATE TABLE automation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  enabled boolean NOT NULL DEFAULT true,
  severity text NOT NULL DEFAULT 'warning',
  condition_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  action_config jsonb NOT NULL DEFAULT '{"actions":[]}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_evaluated_at timestamptz,
  last_matched_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT automation_rules_slug_key UNIQUE (slug),
  CONSTRAINT automation_rules_severity_check CHECK (severity IN ('info', 'warning', 'error', 'critical'))
);

CREATE TABLE automation_rule_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id uuid NOT NULL REFERENCES automation_rules(id) ON DELETE CASCADE,
  matched boolean NOT NULL DEFAULT false,
  mode text NOT NULL DEFAULT 'dry_run',
  evaluation_context jsonb NOT NULL DEFAULT '{}'::jsonb,
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  evaluated_by text,
  evaluated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT automation_rule_evaluations_mode_check CHECK (mode IN ('dry_run', 'committed'))
);

CREATE INDEX automation_rules_enabled_idx ON automation_rules(enabled, updated_at DESC);
CREATE INDEX automation_rule_evaluations_rule_idx ON automation_rule_evaluations(rule_id, evaluated_at DESC);

CREATE TRIGGER automation_rules_set_updated_at BEFORE UPDATE ON automation_rules FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- +goose Down
DROP TABLE IF EXISTS automation_rule_evaluations;
DROP TABLE IF EXISTS automation_rules;
